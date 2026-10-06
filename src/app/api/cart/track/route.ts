import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStoreType } from "@/lib/storeTypes";
import { createNotification } from "@/lib/notifications";
import { despues } from "@/lib/despues";
import { visitaLegitima } from "@/lib/visita-legitima";

/**
 * Cuántos carritos se le aceptan a una misma IP por hora.
 *
 * Antes eran 20 por MINUTO y sin filtro de bots ni de origen, que para lo que
 * escribe este endpoint era mucho: cada carrito nuevo le manda una campanita a
 * la dueña y entra en el monto de "carritos abandonados". Mil doscientos por
 * hora desde una sola IP no es un comprador indeciso.
 *
 * Una persona real dispara varios mientras completa el formulario —el cliente
 * lo llama cada vez que toca algo— así que el número no puede ser chico. 40 deja
 * lugar de sobra para eso y para una familia o una oficina saliendo por la misma
 * IP.
 */
const MAX_CARRITOS_POR_IP = 40;

/** Un carrito de más de 100 renglones no es un carrito. */
const MAX_ITEMS = 100;

/** Nombre y teléfono se guardan y se muestran; no hay motivo para aceptar más. */
const MAX_TEXTO = 120;

type TrackItem = {
  productId: string;
  variantId?: string | null;
  name: string;
  image?: string | null;
  price: number;
  qty: number;
  size?: string;
  color?: string;
};

type TrackBody = {
  storeId: string;
  email: string;
  name?: string;
  phone?: string;
  items: TrackItem[];
  total: number;
};

/**
 * El monto del carrito, con techo puesto por los precios REALES de la tienda.
 *
 * El total venía del navegador y se guardaba tal cual. O sea que cualquiera con
 * la consola abierta podía anotar un carrito abandonado de $999.999.999, y eso
 * no es un número feo y nada más: alimenta el "monto sin recuperar" de Métricas,
 * ordena la lista de "Para revisar" del resumen —que se ordena por plata en
 * juego, así que el carrito forjado se llevaba el primer puesto— y le manda a la
 * dueña una campanita diciendo que alguien dejó esa fortuna sin comprar.
 *
 * Se recorren los productos de ESA tienda y se arma el máximo plausible: precio
 * más caro entre el del producto y el de sus variantes, por la cantidad. Después
 * el total del cliente se recorta contra ese techo.
 *
 * Se recorta en vez de reemplazar a propósito: el precio final de verdad puede
 * ser MENOR por promociones, escalones o mayorista, y esas reglas viven en el
 * checkout. Recalcular acá sería una sexta copia de esa cuenta, y el día que se
 * desincronice el carrito abandonado diría un número que la tienda nunca cobró.
 * El techo no necesita estar sincronizado para servir: sólo tiene que ser un
 * techo.
 */
/* ── Las líneas del carrito, armadas con la BASE (05/10/26) ───────────────
   Antes `items` se guardaba tal cual llegaba: nombre, imagen y precio los
   ponía quien hacía el POST, y después salían en el mail de recordatorio y en
   el panel de la dueña (una imagen de cualquier servidor se cargaba en su
   panel). Ahora de lo que manda el navegador sólo cuenta QUÉ producto, qué
   variante y cuántos; el nombre, la foto y el precio son los de la tienda, y
   un producto que no es de esta tienda no entra. */
async function itemsDeVerdad(storeId: string, crudos: TrackItem[]): Promise<TrackItem[]> {
  const ids = [...new Set(crudos.map((i) => String(i?.productId ?? "")).filter(Boolean))].slice(0, MAX_ITEMS);
  if (ids.length === 0) return [];
  const productos = await prisma.product.findMany({
    where: { id: { in: ids }, storeId, deletedAt: null },
    select: { id: true, name: true, price: true, images: true, variants: { select: { id: true, price: true } } },
  });
  const porId = new Map(productos.map((p) => [p.id, p]));
  const primeraFoto = (raw: string | null) => {
    try {
      const f = (JSON.parse(raw || "[]") as (string | { url?: string })[])[0];
      const url = typeof f === "string" ? f : f?.url;
      return typeof url === "string" && /^https:\/\//.test(url) ? url : null;
    } catch { return null; }
  };
  const corto = (v: unknown) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 40) : undefined);
  const salida: TrackItem[] = [];
  for (const it of crudos) {
    const p = porId.get(String(it?.productId ?? ""));
    if (!p) continue;
    const variante = it?.variantId ? p.variants.find((v) => v.id === it.variantId) : undefined;
    if (it?.variantId && !variante) continue;
    const qty = Math.floor(Number(it?.qty));
    if (!Number.isFinite(qty) || qty <= 0) continue;
    salida.push({
      productId: p.id,
      variantId: variante?.id ?? null,
      name: p.name,
      image: primeraFoto(p.images),
      price: variante?.price != null && variante.price > 0 ? variante.price : p.price,
      qty: Math.min(qty, 99),
      size: corto(it.size),
      color: corto(it.color),
    });
  }
  return salida;
}

async function totalDeVerdad(
  storeId: string,
  items: TrackItem[],
  totalDelCliente: number
): Promise<number> {
  if (!Number.isFinite(totalDelCliente) || totalDelCliente < 0) return 0;

  const ids = [...new Set(items.map((i) => String(i?.productId ?? "")).filter(Boolean))].slice(0, MAX_ITEMS);
  if (ids.length === 0) return 0;

  const productos = await prisma.product.findMany({
    where: { id: { in: ids }, storeId },
    select: { id: true, price: true, variants: { select: { price: true } } },
  });
  const precioTope = new Map(
    productos.map((p) => [
      p.id,
      Math.max(p.price, ...p.variants.map((v) => v.price ?? 0), 0),
    ])
  );

  let techo = 0;
  for (const it of items) {
    const precio = precioTope.get(String(it?.productId ?? ""));
    // Un producto que no es de esta tienda —o que no existe— no suma nada. Eso
    // solo ya corta el carrito armado a mano con IDs inventados.
    if (precio === undefined) continue;
    const qty = Number(it?.qty);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    techo += precio * Math.min(qty, 1000);
  }

  return Math.min(totalDelCliente, techo);
}

// Snapshot de un carrito con email capturado durante el checkout que todavía
// no se completó en una compra — usado luego para el recordatorio de
// recuperación. No bloquea ni devuelve datos sensibles: el storefront lo
// llama en fire-and-forget y no necesita leer la respuesta.
export async function POST(req: NextRequest) {
  // Origen propio y tope por IP. Este endpoint sólo tenía el tope.
  //
  // Sin el filtro de User-Agent a propósito: acá del otro lado hay alguien que
  // escribió un email válido en un checkout, y si se lo confunde con un bot no
  // se pierde una métrica, se pierde la venta —no se guarda el carrito y nunca
  // sale el recordatorio—. Ver el comentario largo en `lib/visita-legitima`.
  if (!(await visitaLegitima(req, "cart-track", MAX_CARRITOS_POR_IP, { filtrarBots: false }))) {
    return NextResponse.json({ ok: true, guardado: false });
  }

  // Sin el `catch` un cuerpo mal formado tiraba un 500 sin manejar. Es un
  // endpoint público: recibir basura es lo normal, no una excepción.
  const body = (await req.json().catch(() => null)) as TrackBody | null;
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  const storeId = String(body.storeId ?? "");
  const email = String(body.email ?? "").toLowerCase().trim();
  const crudos = (Array.isArray(body.items) ? body.items : []).slice(0, MAX_ITEMS);

  if (!storeId || email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || crudos.length === 0) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // La tienda tiene que estar viva. Sin esto se podían anotar carritos contra
  // una tienda dada de baja o sin publicar.
  const store = await prisma.store.findFirst({
    where: { id: storeId, isActive: true },
    select: { id: true, ownerId: true, tipoTienda: true },
  });
  if (!store) return NextResponse.json({ ok: false }, { status: 404 });
  // Un rubro de consulta (autos) no tiene carrito: no hay nada que recuperar, y
  // el mail de "te olvidaste algo" no tendría a dónde volver (06/10/26).
  if (getStoreType(store.tipoTienda).checkoutMode === "inquiry") return NextResponse.json({ ok: false }, { status: 409 });

  const items = await itemsDeVerdad(store.id, crudos);
  if (items.length === 0) return NextResponse.json({ ok: false }, { status: 400 });
  const total = await totalDeVerdad(store.id, items, Number(body.total));

  const data = {
    customerName: typeof body.name === "string" ? body.name.trim().slice(0, MAX_TEXTO) || null : null,
    customerPhone: typeof body.phone === "string" ? body.phone.trim().slice(0, MAX_TEXTO) || null : null,
    items: JSON.stringify(items),
    total,
    lastActivityAt: new Date(),
    reminderSentAt: null,
    recoveredAt: null,
  };

  // Se pregunta si ya existía ANTES del upsert, porque después no hay forma de
  // saber si creó o actualizó. Es el dato que decide si se avisa: mientras la
  // persona sigue en el checkout, cada vez que toca algo se vuelve a llamar acá
  // y el carrito se actualiza. Avisando en cada actualización, un solo visitante
  // indeciso llenaría la campanita de avisos del mismo carrito.
  const yaExistia = await prisma.abandonedCart.findUnique({
    where: { storeId_customerEmail: { storeId, customerEmail: email } },
    select: { id: true },
  });

  await prisma.abandonedCart.upsert({
    where: { storeId_customerEmail: { storeId, customerEmail: email } },
    create: { storeId, customerEmail: email, ...data },
    update: data,
  });

  // El puntito del menú solo se recalcula al navegar entre pantallas del panel,
  // así que si la dueña está parada en una no se entera de nada hasta que se
  // mueve. La campanita sí avisa. Y era una inconsistencia: llegaba aviso por una
  // reseña y no por alguien que dejó su email con el carrito lleno, que vale
  // bastante más.
  //
  // Con `despues`, que es mejor que las dos formas que tuvo antes: suelto se
  // perdía —el síntoma que se vio probando esto, el aviso llegó tarde sin que
  // nadie tocara nada— y con `await` le cobraba el insert al visitante del
  // storefront, que no tiene nada que ver. Ver `lib/despues`.
  if (!yaExistia) {
    const quien = data.customerName || email;
    const cuanto = Math.round(data.total).toLocaleString("es-AR");
    despues(() => createNotification({
      userId: store.ownerId,
      type: "ABANDONED_CART",
      title: "Carrito abandonado",
      body: `${quien} dejó su contacto con $${cuanto} en el carrito y no terminó la compra.`,
      link: "/dashboard/carritos-abandonados",
    }), "carrito abandonado: campanita al dueño");
  }

  return NextResponse.json({ ok: true });
}
