/**
 * Chequeo del sistema de avisos del panel. Se corre a mano:
 *
 *   npx dotenv -e .env.local -- npx tsx src/lib/avisos-tienda.check.ts
 *
 * ── La historia ──────────────────────────────────────────────────────────────
 * Había dos sistemas avisando lo mismo sin hablarse: la barra de "7/8 pasos" del
 * inicio y los tres booleanos de /api/dashboard/warnings. Cada uno calculaba lo
 * suyo con su propio criterio, así que el mismo pendiente se contaba dos veces
 * —"conectá MercadoPago" salía en la barra y como triángulo en Pagos, a la vez—
 * y nada garantizaba que siguieran diciendo lo mismo con el tiempo.
 *
 * Al unificarlos apareció un segundo problema, más feo, y es el que vigila la
 * mayoría de los casos de acá abajo: la regla "mientras la barra esté, el
 * triángulo se calla" se comía a sí misma, porque lo que enciende un rojo es lo
 * mismo que deja los pasos incompletos. Despublicar la tienda apagaba el aviso
 * de "tu tienda está despublicada". Por eso existe `onboardingCompletedAt`.
 *
 * ── Qué se verifica ──────────────────────────────────────────────────────────
 * 1. Casos armados a mano: la regla del color, y que el silencio del onboarding
 *    valga solo para quien todavía no terminó de armar la tienda.
 * 2. Las tiendas reales de la base: qué avisos les saldrían hoy. No falla por
 *    esto — es para mirar que el resultado tenga sentido antes de publicar.
 */

import { PrismaClient } from "@prisma/client";
import {
  condicionesTienda,
  onboardingCompleto,
  pasosTerminados,
  avisosDeTienda,
  avisosDelMenu,
  avisosDeSeccion,
  type EstadoTienda,
} from "./avisos-tienda";

let fallos = 0;

function afirmar(condicion: boolean, descripcion: string) {
  if (condicion) {
    console.log(`  ok    ${descripcion}`);
  } else {
    console.log(`  FALLA ${descripcion}`);
    fallos++;
  }
}

/** Una tienda que ya terminó de armarse y no tiene nada roto. */
function tiendaSana(): EstadoTienda {
  return {
    storeId: "test",
    tipoTienda: "MODA",
    logo: "https://ejemplo/logo.png",
    descripcion: "Una tienda",
    isPublished: true,
    isVerified: true,
    mpConnectedAt: new Date(),
    storeConfig: JSON.stringify({
      template: "aurora",
      shippingMethods: [{ id: "retiro", enabled: true }],
      paymentInfo: { transferencia: { enabled: true, cbu: "0".repeat(22) } },
    }),
    cantidadProductos: 5,
    estadoSuscripcion: "ACTIVE",
    onboardingCompletedAt: new Date("2026-01-01"),
    productosSinFoto: 0,
    cuponesVencidos: 0,
    promosVencidas: 0,
    fbTokenExpiresAt: null,
    tienePoliticas: true,
  };
}

/** Una tienda recién creada, todavía armándose. */
function tiendaNueva(): EstadoTienda {
  return {
    ...tiendaSana(),
    logo: null,
    descripcion: null,
    isPublished: false,
    isVerified: false,
    mpConnectedAt: null,
    storeConfig: "{}",
    cantidadProductos: 0,
    estadoSuscripcion: "TRIAL",
    onboardingCompletedAt: null,
  };
}

console.log("\n── Una tienda sana ────────────────────────────────────────────");
{
  const sana = tiendaSana();
  afirmar(onboardingCompleto(sana), "ya pasó por el armado");
  afirmar(avisosDeTienda(sana).length === 0, "no tiene ningún aviso");
}

console.log("\n── Todavía armándose: la barra habla, los avisos se callan ────");
{
  const nueva = tiendaNueva();
  const avisos = avisosDeTienda(nueva);
  afirmar(!onboardingCompleto(nueva), "onboarding sin terminar");
  afirmar(!pasosTerminados(condicionesTienda(nueva)), "y los ocho pasos tampoco están");
  afirmar(
    avisos.every((a) => a.id === "cuenta-sin-verificar"),
    "no salen avisos de tienda: la barra ya los está diciendo"
  );
  afirmar(
    avisosDelMenu(avisos).length === 0,
    "y el menú lateral queda limpio de triángulos"
  );
}

console.log("\n── El caso que antes no andaba: se rompió DESPUÉS del armado ──");
{
  // Esta es la razón de ser de `onboardingCompletedAt`. Antes de tenerlo, la
  // condición que encendía el rojo dejaba los pasos incompletos y lo apagaba:
  // tres de los cuatro rojos no se mostraban nunca.
  const despublicada = { ...tiendaSana(), isPublished: false };
  const avisos = avisosDeTienda(despublicada);
  const ids = avisos.map((a) => a.id);
  afirmar(!pasosTerminados(condicionesTienda(despublicada)), "los pasos ya no están todos");
  afirmar(onboardingCompleto(despublicada), "pero la tienda YA pasó por el armado");
  afirmar(ids.includes("tienda-despublicada"), "→ sale el rojo de tienda despublicada");
  afirmar(
    avisosDelMenu(avisos).some((a) => a.id === "tienda-despublicada"),
    "y llega al menú lateral"
  );
}

{
  const sinCobro = tiendaSana();
  sinCobro.mpConnectedAt = null;
  sinCobro.storeConfig = JSON.stringify({
    template: "aurora",
    shippingMethods: [{ id: "retiro", enabled: true }],
    paymentInfo: {},
  });
  const avisos = avisosDeTienda(sinCobro);
  afirmar(condicionesTienda(sinCobro).noPuedeCobrar, "sin MercadoPago ni datos de cobro: no puede cobrar");
  afirmar(avisos.some((a) => a.id === "sin-medio-de-cobro"), "→ sale el rojo de sin medio de cobro");
}

{
  const sinEnvios = tiendaSana();
  sinEnvios.storeConfig = JSON.stringify({
    template: "aurora",
    paymentInfo: { transferencia: { enabled: true, cbu: "0".repeat(22) } },
  });
  const avisos = avisosDeTienda(sinEnvios);
  afirmar(avisos.some((a) => a.id === "sin-envios"), "sin métodos de envío: sale el rojo");
}

console.log("\n── Rojo y amarillo: dónde va cada uno ─────────────────────────");
{
  const vencida = { ...tiendaSana(), estadoSuscripcion: "EXPIRED" };
  const menu = avisosDelMenu(avisosDeTienda(vencida));
  afirmar(menu.some((a) => a.id === "suscripcion-caida"), "suscripción vencida llega al menú");
  afirmar(menu.every((a) => a.nivel === "rojo"), "al menú SOLO llegan rojos");
}

{
  const sinVerificar = { ...tiendaSana(), isVerified: false };
  const avisos = avisosDeTienda(sinVerificar);
  afirmar(avisos.some((a) => a.id === "cuenta-sin-verificar"), "cuenta sin verificar genera aviso");
  afirmar(
    !avisosDelMenu(avisos).some((a) => a.id === "cuenta-sin-verificar"),
    "pero al ser amarillo NO llega al menú lateral"
  );
  afirmar(
    avisosDeSeccion(avisos, "/dashboard/ajustes").some((a) => a.id === "cuenta-sin-verificar"),
    "y sí aparece adentro de su sección"
  );
}

{
  // Rojos primero, para que el cartel de arriba de la sección no entierre lo grave.
  const rota = { ...tiendaSana(), isPublished: false, isVerified: false };
  rota.storeConfig = JSON.stringify({ template: "aurora", paymentInfo: {} });
  const todos = avisosDeTienda(rota);
  const enPagos = avisosDeSeccion(todos, "/dashboard/pagos");
  afirmar(enPagos.length > 0 && enPagos[0].nivel === "rojo", "dentro de una sección, los rojos van primero");
  afirmar(todos.every((a) => a.titulo.length > 0 && a.detalle.length > 0), "todos los avisos traen texto, no son íconos mudos");
}

console.log("\n── Los amarillos ──────────────────────────────────────────────");
{
  const conFaltantes = {
    ...tiendaSana(),
    productosSinFoto: 3,
    cuponesVencidos: 1,
    promosVencidas: 2,
    tienePoliticas: false,
  };
  const avisos = avisosDeTienda(conFaltantes);
  const ids = avisos.map((a) => a.id);

  afirmar(ids.includes("productos-sin-foto"), "productos sin foto genera aviso");
  afirmar(ids.includes("cupones-vencidos"), "cupones vencidos activos genera aviso");
  afirmar(ids.includes("promos-vencidas"), "promociones vencidas activas genera aviso");
  afirmar(ids.includes("sin-politicas"), "sin políticas genera aviso");

  afirmar(
    avisos.filter((a) => ["productos-sin-foto", "cupones-vencidos", "promos-vencidas", "sin-politicas"].includes(a.id))
      .every((a) => a.nivel === "amarillo"),
    "los cuatro son amarillos"
  );
  afirmar(avisosDelMenu(avisos).length === 0, "y ninguno llega al menú lateral");

  // El plural tiene que salir bien: "1 cupón" y "3 productos" en el mismo panel
  // es lo que hace que un aviso se lea escrito por una persona.
  const productos = avisos.find((a) => a.id === "productos-sin-foto")!;
  const cupones = avisos.find((a) => a.id === "cupones-vencidos")!;
  afirmar(productos.titulo.includes("3 productos"), "el plural sale bien con varios");
  afirmar(cupones.titulo.includes("un cupón") && !cupones.titulo.includes("1 cupones"), "y el singular con uno solo");
}

{
  // Cada aviso tiene que caer en la sección donde se resuelve.
  const conFaltantes = { ...tiendaSana(), productosSinFoto: 1, cuponesVencidos: 1, promosVencidas: 1, tienePoliticas: false };
  const avisos = avisosDeTienda(conFaltantes);
  const seccionDe = (id: string) => avisos.find((a) => a.id === id)?.seccion;
  afirmar(seccionDe("productos-sin-foto") === "/dashboard/productos", "sin foto → Productos");
  afirmar(seccionDe("cupones-vencidos") === "/dashboard/cupones", "cupones vencidos → Cupones");
  afirmar(seccionDe("promos-vencidas") === "/dashboard/promociones", "promos vencidas → Promociones");
  afirmar(seccionDe("sin-politicas") === "/dashboard/pagos", "sin políticas → Pagos");
  afirmar(
    avisos.every((a) => a.href.startsWith("/dashboard")),
    "y todos llevan a algún lado del panel"
  );
}

{
  // Meta: se avisa desde 7 días antes, y cambia el texto una vez vencido.
  const enCincoDias = { ...tiendaSana(), fbTokenExpiresAt: new Date(Date.now() + 5 * 86_400_000) };
  const enTreinta = { ...tiendaSana(), fbTokenExpiresAt: new Date(Date.now() + 30 * 86_400_000) };
  const yaVencido = { ...tiendaSana(), fbTokenExpiresAt: new Date(Date.now() - 86_400_000) };

  afirmar(
    avisosDeTienda(enCincoDias).some((a) => a.id === "token-meta-por-vencer"),
    "Meta a 5 días: avisa"
  );
  afirmar(
    !avisosDeTienda(enTreinta).some((a) => a.id === "token-meta-por-vencer"),
    "Meta a 30 días: todavía no molesta"
  );
  const vencido = avisosDeTienda(yaVencido).find((a) => a.id === "token-meta-por-vencer");
  afirmar(!!vencido && vencido.titulo.includes("venció"), "Meta ya vencido: lo dice en pasado");
}

{
  const sinMeta = { ...tiendaSana(), fbTokenExpiresAt: null };
  afirmar(
    !avisosDeTienda(sinMeta).some((a) => a.id === "token-meta-por-vencer"),
    "sin Meta conectado no se inventa un aviso"
  );
}

console.log("\n── Casos borde ────────────────────────────────────────────────");
{
  const autos = { ...tiendaSana(), tipoTienda: "AUTOS", mpConnectedAt: null };
  autos.storeConfig = JSON.stringify({ template: "autodrive", paymentInfo: {} });
  const c = condicionesTienda(autos);
  afirmar(!c.noPuedeCobrar, "una tienda de AUTOS sin medio de cobro no queda marcada");
  afirmar(pasosTerminados(c), "y sus pasos no exigen cobro ni envíos");
  afirmar(
    !avisosDeTienda(autos).some((a) => a.id === "sin-envios" || a.id === "sin-medio-de-cobro"),
    "ni le salen esos rojos"
  );
}

{
  const roto = { ...tiendaSana(), storeConfig: "{ esto no es json" };
  const c = condicionesTienda(roto);
  afirmar(!c.tienePlantilla && !c.tieneEnvios, "storeConfig ilegible se trata como vacío, sin explotar");
}

{
  const sinConfig = { ...tiendaSana(), storeConfig: null };
  afirmar(avisosDeTienda(sinConfig).length > 0, "storeConfig en null tampoco rompe");
}

async function contraLaBaseReal() {
  console.log("\n── Tiendas reales de la base ──────────────────────────────────");

  const prisma = new PrismaClient();
  try {
    const tiendas = await prisma.store.findMany({
      select: {
        slug: true, ownerId: true, tipoTienda: true, logo: true, description: true,
        isPublished: true, isVerified: true, mpConnectedAt: true, storeConfig: true,
        onboardingCompletedAt: true, fbTokenExpiresAt: true,
        policyReturns: true, policyShipping: true,
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
    });

    for (const t of tiendas) {
      const sub = await prisma.subscription.findUnique({
        where: { userId: t.ownerId },
        select: { status: true },
      });
      const estado: EstadoTienda = {
        storeId: t.slug,
        tipoTienda: t.tipoTienda,
        logo: t.logo,
        descripcion: t.description,
        isPublished: t.isPublished,
        isVerified: t.isVerified,
        mpConnectedAt: t.mpConnectedAt,
        storeConfig: t.storeConfig,
        cantidadProductos: t._count.products,
        estadoSuscripcion: sub?.status ?? null,
        onboardingCompletedAt: t.onboardingCompletedAt,
        productosSinFoto: 0,
        cuponesVencidos: 0,
        promosVencidas: 0,
        fbTokenExpiresAt: t.fbTokenExpiresAt,
        tienePoliticas: !!(t.policyReturns?.trim() || t.policyShipping?.trim()),
      };
      const avisos = avisosDeTienda(estado);
      const rojos = avisos.filter((a) => a.nivel === "rojo").length;
      const amarillos = avisos.filter((a) => a.nivel === "amarillo").length;
      console.log(
        `  ${t.slug.padEnd(18)} armada=${onboardingCompleto(estado) ? "si" : "no"} ` +
        `pasos=${pasosTerminados(condicionesTienda(estado)) ? "8/8" : "-  "} ` +
        `rojos=${rojos} amarillos=${amarillos}  ${avisos.map((a) => a.id).join(", ") || "—"}`
      );
    }
  } catch (e) {
    console.log("  (no se pudo leer la base: " + (e as Error).message.split("\n")[0] + ")");
  } finally {
    await prisma.$disconnect();
  }
}

contraLaBaseReal().finally(() => {
  console.log(fallos === 0 ? "\nTODO OK\n" : `\n${fallos} FALLA(S)\n`);
  process.exit(fallos === 0 ? 0 : 1);
});
