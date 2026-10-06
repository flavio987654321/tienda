import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendPushToUser } from "@/lib/push";
import { monedaDe, monedaDeTienda, type Moneda } from "@/lib/monedaVehiculo";
import { coincide, demanda, normalizar, DIAS_VIGENCIA, type VehiculoParaBuscar } from "@/lib/busquedas";

/* La parte de "Avisame si entra" que toca la base (06/10/26). Ver `lib/busquedas`. */

const NO_SON_UNIDADES = ["repuestos", "accesorios"];

type ProductoCrudo = { id: string; name: string; price: number; category: string; attributes: string; images: string };

function atributos(crudo: string): { key: string; value: string }[] {
  try {
    const l = JSON.parse(crudo);
    return Array.isArray(l) ? l.filter((a) => a && typeof a.key === "string").map((a) => ({ key: a.key, value: String(a.value ?? "") })) : [];
  } catch { return []; }
}

export function vehiculoDeProducto(p: Pick<ProductoCrudo, "name" | "price" | "category" | "attributes">, principal: Moneda = "ARS"): VehiculoParaBuscar {
  const attrs = atributos(p.attributes);
  const valor = (k: string) => attrs.find((a) => normalizar(a.key) === normalizar(k))?.value.trim() || null;
  const anio = Number((valor("Año") ?? "").replace(/\D/g, "").slice(0, 4));
  return {
    categoria: p.category, marca: valor("Marca"), modelo: valor("Modelo"), nombre: p.name, anio: anio >= 1900 ? anio : null, precio: p.price,
    enOtraMoneda: monedaDe(p, principal) !== principal,
  };
}

/** La moneda principal de la tienda: en la que están los "hasta cuánto" de las búsquedas. */
async function principalDe(storeId: string): Promise<Moneda> {
  const s = await prisma.store.findUnique({ where: { id: storeId }, select: { storeConfig: true } });
  return monedaDeTienda(s?.storeConfig);
}

/** Los vehículos que se pueden ofrecer hoy: activos, no vendidos, no repuestos. */
async function vehiculosALaVenta(storeId: string) {
  return prisma.product.findMany({
    where: { storeId, isActive: true, deletedAt: null, NOT: { category: { in: NO_SON_UNIDADES } }, OR: [{ vehicleStatus: null }, { vehicleStatus: { not: "SOLD" } }] },
    select: { id: true, name: true, price: true, category: true, attributes: true, images: true, vehicleStatus: true },
    take: 500,
  });
}

/**
 * Cruza las búsquedas activas de una tienda con lo que tiene a la venta y le
 * avisa a la dueña por lo NUEVO (cada vehículo, una sola vez por búsqueda: lo
 * ya avisado queda en `notificadoIds`). Además cierra las vencidas.
 *
 * Se llama al guardar un vehículo (en segundo plano) y desde el cron diario,
 * que levanta lo que entró por otros caminos (importación, publicación
 * programada). Devuelve cuántas coincidencias nuevas hubo.
 */
export async function revisarBusquedas(storeId: string, ahora = new Date()): Promise<number> {
  await prisma.busquedaGuardada.updateMany({
    where: { storeId, status: "ACTIVA", createdAt: { lt: new Date(ahora.getTime() - DIAS_VIGENCIA * 86_400_000) } },
    data: { status: "CERRADA" },
  });
  const busquedas = await prisma.busquedaGuardada.findMany({ where: { storeId, status: "ACTIVA" }, take: 2000 });
  if (!busquedas.length) return 0;
  const [productos, principal] = await Promise.all([vehiculosALaVenta(storeId), principalDe(storeId)]);
  const vehiculos = productos.map((p) => ({ p, v: vehiculoDeProducto(p, principal) }));

  const nuevas: { nombre: string; vehiculo: string }[] = [];
  for (const b of busquedas) {
    const ids = vehiculos.filter(({ p, v }) => !b.notificadoIds.includes(p.id) && coincide(b, v)).map(({ p }) => p.id);
    if (!ids.length) continue;
    await prisma.busquedaGuardada.update({ where: { id: b.id }, data: { notificadoIds: { push: ids } } });
    for (const id of ids) nuevas.push({ nombre: b.nombre, vehiculo: vehiculos.find((x) => x.p.id === id)!.p.name });
  }
  if (!nuevas.length) return 0;

  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { ownerId: true } });
  if (!store) return nuevas.length;
  const personas = new Set(nuevas.map((n) => n.nombre)).size;
  const aviso = nuevas.length === 1
    ? { title: "Entró lo que alguien buscaba", body: `${nuevas[0].nombre.split(/\s+/)[0]} buscaba algo como el ${nuevas[0].vehiculo}. Avisale por WhatsApp desde Búsquedas.` }
    : { title: "Entró lo que buscaban", body: `Hay ${nuevas.length} coincidencias nuevas para ${personas} ${personas === 1 ? "persona" : "personas"} que dejaron su búsqueda. Avisales desde Búsquedas.` };
  await createNotification({ userId: store.ownerId, type: "BUSQUEDA_COINCIDE", ...aviso, link: "/dashboard/busquedas" });
  await sendPushToUser(store.ownerId, { ...aviso, url: "/dashboard/busquedas" }).catch(() => {});
  return nuevas.length;
}

/** Para el cron: todas las tiendas de autos con búsquedas activas. */
export async function revisarTodasLasBusquedas(ahora = new Date()) {
  const tiendas = await prisma.busquedaGuardada.groupBy({ by: ["storeId"], where: { status: "ACTIVA", store: { tipoTienda: "AUTOS", isActive: true } } });
  let coincidencias = 0;
  for (const t of tiendas) coincidencias += await revisarBusquedas(t.storeId, ahora).catch((e) => { console.error("[busquedas] tienda", t.storeId, e); return 0; });
  return { tiendas: tiendas.length, coincidencias };
}

const primeraFoto = (raw: string) => {
  try {
    const f = (JSON.parse(raw || "[]") as (string | { url?: string })[])[0];
    const url = typeof f === "string" ? f : f?.url;
    return typeof url === "string" ? url : null;
  } catch { return null; }
};

/** Lo que pide la pantalla Búsquedas: cada búsqueda con lo que hoy coincide, y la demanda. */
export async function busquedasDelPanel(storeId: string) {
  const [busquedas, productos, principal] = await Promise.all([
    prisma.busquedaGuardada.findMany({ where: { storeId }, orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 300 }),
    vehiculosALaVenta(storeId),
    principalDe(storeId),
  ]);
  const vehiculos = productos.map((p) => ({ p, v: vehiculoDeProducto(p, principal) }));
  const filas = busquedas.map((b) => ({
    id: b.id, nombre: b.nombre, telefono: b.telefono, categoria: b.categoria, marca: b.marca, modelo: b.modelo,
    anioDesde: b.anioDesde, precioHasta: b.precioHasta, comentario: b.comentario, status: b.status,
    createdAt: b.createdAt.toISOString(),
    coincidencias: b.status === "ACTIVA"
      ? vehiculos.filter(({ v }) => coincide(b, v)).map(({ p, v }) => ({
          id: p.id, nombre: p.name, precio: p.price, moneda: monedaDe(p, principal), imagen: primeraFoto(p.images), anio: v.anio, reservado: p.vehicleStatus === "RESERVED",
          avisado: b.avisadoIds.includes(p.id),
        }))
      : [],
  }));
  const activas = busquedas.filter((b) => b.status === "ACTIVA");
  const pedidos = demanda(activas).map((d) => {
    const enStock = vehiculos.filter(({ v }) => coincide({ categoria: null, marca: d.marca, modelo: d.modelo, anioDesde: null, precioHasta: null }, v)).length;
    return { ...d, enStock };
  });
  return { busquedas: filas, demanda: pedidos };
}

export type BusquedaDelPanel = Awaited<ReturnType<typeof busquedasDelPanel>>["busquedas"][number];
