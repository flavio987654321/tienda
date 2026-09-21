import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { normalizarContenido } from "@/lib/pagina-venta";
import PaginaDeVenta, { type ProductoParaPagina } from "@/components/digitales/PaginaDeVenta";
import PaginaEnVivo from "./PaginaEnVivo";
import VisitaDigital from "./VisitaDigital";
import { StoreTrackingScripts } from "@/components/store/StoreTrackingScripts";
import { medicionDelProducto, MONEDA_DIGITAL } from "@/lib/medicion-digital";
import { CLASES_FUENTES } from "@/lib/fuentes-venta";
import { leerEstadoDeLanding, leerInventario } from "@/lib/landing-estado";
import { armarLanding } from "@/lib/landing-propia";
import LandingPropia from "@/components/digitales/LandingPropia";
import { isSubscriptionActive } from "@/lib/subscription";
import { bienvenidaDeLaVisita, tokenDeBienvenidaDeLaCookie, type BienvenidaDeLaVisita } from "@/lib/bienvenida-servidor";
import { BIENVENIDA_DE_FABRICA, leerBienvenida } from "@/lib/bienvenida";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * La página de venta de un producto digital.
 *
 * ⚠️ **Esta dirección es provisoria.** La definitiva es un subdominio por
 * producto (Fase 5 bis) — `mi-guia.tiendaapps.com.ar` —, que es lo que permite
 * hacerle publicidad separada a cada producto. `/p/<id>` existe para poder VER
 * la página mientras eso no está, y se va cuando llegue.
 *
 * Vive fuera de `/digitales` a propósito: ese layout trae la barra lateral del
 * panel, el tema claro/oscuro y la guarda de rol. Quien compra no tiene cuenta.
 *
 * El contenido sale de `paginaVenta`, y se vuelve a normalizar al leerlo: si la
 * columna quedó vieja porque el catálogo cambió, lo que se dibuja tiene la forma
 * de HOY. `null` —nunca la editaron— da los textos de fábrica, así que no existe
 * el estado "producto sin página".
 */

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * El producto y su gente, **si se puede mostrar**.
 *
 * Un producto sin publicar lo ve sólo su dueña. Sin esa vuelta, cualquiera que
 * pruebe ids lee borradores ajenos —con su precio y su descripción— antes de que
 * la persona decida publicarlos.
 */
async function loQueSeMuestra(id: string) {
  const fila = await prisma.product.findFirst({
    where: { id, deletedAt: null, rolDigital: "PRINCIPAL" },
    select: {
      id: true, name: true, description: true, price: true, comparePrice: true,
      images: true, isActive: true, paginaVenta: true, medicion: true, landingPropia: true, bienvenida: true,
      store: {
        select: {
          id: true, ownerId: true, name: true, whatsappNumber: true, storeConfig: true,
          /* Para la landing propia: es de los planes pagos, como la oferta de
             salida. Si el plan vence, la dirección vuelve sola a la página de
             secciones y no se pierde nada de lo subido. */
          owner: { select: { subscription: { select: { tier: true, status: true, trialEndsAt: true, currentPeriodEnd: true, gracePeriodEndsAt: true } } } },
        },
      },
      hijos: {
        where: { deletedAt: null, rolDigital: "BONO", isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, description: true, price: true, comparePrice: true, images: true },
      },
    },
  });
  if (!fila) return null;

  if (!fila.isActive) {
    const user = await getCurrentUser();
    if (!user || user.id !== fila.store.ownerId) return null;
  }
  /* El año sale de acá y no de adentro del dibujo: un componente que se pregunta
     la fecha mientras dibuja no da siempre lo mismo, y con caché el copyright se
     congela en el año en que se generó la página. */
  return { ...fila, anio: new Date().getFullYear() };
}

/** La portada. Un JSON roto no puede tumbar la página entera. */
function primeraImagen(images: string): string | null {
  try {
    const lista = JSON.parse(images);
    return Array.isArray(lista) && typeof lista[0] === "string" ? lista[0] : null;
  } catch {
    return null;
  }
}

const paraPagina = (f: {
  id: string; name: string; description: string | null;
  price: number; comparePrice: number | null; images: string;
}): ProductoParaPagina => ({
  id: f.id,
  name: f.name,
  description: f.description,
  price: f.price,
  comparePrice: f.comparePrice,
  imagen: primeraImagen(f.images),
});

/**
 * Lo que se ve FUERA de la página: el renglón de Google y la tarjeta que
 * aparece al pegar el link en WhatsApp, en Instagram o en un anuncio.
 *
 * ⚠️ En este rubro la tarjeta pesa MÁS que Google. La venta arranca casi
 * siempre en un link compartido o en un anuncio, no en una búsqueda: si al
 * pegarlo no aparece la foto del ebook, se comparte un renglón azul pelado.
 *
 * Los dos textos se pueden escribir en el editor, y vacíos caen en el nombre y
 * la descripción del producto — que es lo que se usaba hasta ahora.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const fila = await loQueSeMuestra(id);
  if (!fila) return { title: "Producto no encontrado" };

  const seo = normalizarContenido(fila.paginaVenta).seo;
  const comoTexto = (k: string) => (typeof seo[k] === "string" ? (seo[k] as string) : "");
  const titulo = comoTexto("titulo") || fila.name;
  const descripcion = comoTexto("descripcion") || fila.description || undefined;
  const imagen = primeraImagen(fila.images);

  return {
    title: titulo,
    description: descripcion,
    /* Un borrador no se indexa aunque su dueña lo esté mirando. */
    robots: fila.isActive ? undefined : { index: false, follow: false },
    openGraph: {
      title: titulo,
      description: descripcion,
      type: "website",
      /* La foto del producto. Sin esto WhatsApp muestra un renglón sin imagen,
         que en un chat pasa desapercibido al lado de cualquier otro link. */
      images: imagen ? [imagen] : undefined,
    },
    twitter: {
      card: imagen ? "summary_large_image" : "summary",
      title: titulo,
      description: descripcion,
      images: imagen ? [imagen] : undefined,
    },
  };
}

export default async function PaginaDeVentaPublica({ params, searchParams }: Props) {
  const { id } = await params;
  const fila = await loQueSeMuestra(id);
  if (!fila) notFound();

  /* ── ¿Su propio diseño? ────────────────────────────────────────────────
     Si subió una landing y la prendió, la dirección la muestra a ella en vez
     de la página de secciones. Lo de alrededor no cambia: la visita se
     cuenta igual, el píxel dispara igual y el botón de comprar lleva al
     MISMO pago. Ver `lib/landing-propia`. */
  /* `?landing=previa`: la dueña mirando su landing antes de prenderla, desde
     el panel. Sólo ella, y con los huecos de foto marcados para que se vea
     cuáles faltan. No cuenta visita ni dispara píxel (el bloque de abajo mira
     `previa`). */
  const quiereLaPrevia = (await searchParams).landing === "previa";
  const previaDeLanding = quiereLaPrevia && (await getCurrentUser())?.id === fila.store.ownerId;
  /* `?previa=1` es lo que carga el editor adentro de su iframe. Sólo cambia dos
     cosas: la página escucha el borrador que le manda el editor, y el botón de
     comprar queda apagado para no arrancar un pago desde el panel.
     No abre ninguna puerta: es la misma página y los mismos datos. */
  const previa = (await searchParams).previa === "1";

  /* ── El precio de bienvenida de ESTA visita ──────────────────────────────
     Viva, vencida o nada, según la cookie y lo configurado. En las previas
     del panel no se firma nada ni se guarda nada: se muestra quieto y
     marcado "Ejemplo", esté configurado o no, para que se vea dónde va. */
  const bienvenida = previa || previaDeLanding ? null : await bienvenidaDeLaVisita(fila, [await tokenDeBienvenidaDeLaCookie(fila.id)]);
  const viva = bienvenida?.estado === "viva" ? bienvenida : null;
  const landing = await laLanding(fila, previaDeLanding, bienvenida);

  const datos = {
    pagina: normalizarContenido(fila.paginaVenta),
    /* Mientras corre el reloj, el precio es el de bienvenida y el normal es
       el que se tacha: la página entera —sello, ahorro, barra— sigue sola. */
    producto: viva ? { ...paraPagina(fila), price: viva.precio, comparePrice: viva.precioNormal } : paraPagina(fila),
    bonos: fila.hijos.map(paraPagina),
    vendedor: { nombre: fila.store.name, contacto: fila.store.whatsappNumber },
    anio: fila.anio,
    bienvenida: viva
      ? { productId: fila.id, token: viva.token, venceEn: viva.venceEn, texto: viva.texto }
      : previa ? { productId: fila.id, token: "", venceEn: 0, texto: leerTextoDeBienvenida(fila.bienvenida), demo: true } : undefined,
  };
  /* ⚠️ Las dos letras se declaran acá y no adentro del dibujante, y van las
     DOS aunque se use una. El dibujante lo comparten la página pública y la
     previa del editor —y la previa cambia de letra sin recargar—, así que las
     dos variables tienen que existir de antemano. No cuesta nada: van sin
     preload, o sea que se baja sólo la que se dibuja. */
  if (previa) {
    return (
      <div className={CLASES_FUENTES}>
        <PaginaEnVivo {...datos} esPrevia />
      </div>
    );
  }

  return (
    <div className={CLASES_FUENTES}>
      {/* La visita se cuenta acá y no en la previa: la previa es la dueña
          mirándose. Un borrador tampoco cuenta —lo ve sólo ella—, y el servidor
          lo descarta igual; `apagado` sólo ahorra el ping. */}
      <VisitaDigital paso="pagina" productoId={fila.id} apagado={!fila.isActive || previaDeLanding} />
      {/* El píxel de Meta, GA y Clarity de ESTE producto, o el de la cuenta:
          PageView y ViewContent. Sólo en la página publicada: un borrador lo
          ve ella sola y medirlo es medirse. Ver `lib/medicion-digital`. */}
      {fila.isActive && !previaDeLanding && (() => {
        const m = medicionDelProducto(fila.medicion, fila.store.storeConfig);
        return (
          <StoreTrackingScripts
            facebookPixelId={m.pixelId}
            googleAnalyticsId={m.gaId}
            clarityProjectId={m.clarityId}
            viewContent={{ contentId: fila.id, value: fila.price, currency: MONEDA_DIGITAL }}
          />
        );
      })()}
      {landing ? <LandingPropia html={landing.html} fuentes={landing.fuentes} /> : <PaginaDeVenta {...datos} />}
    </div>
  );
}

/**
 * La landing propia lista para dibujar, o null si no corresponde: no la
 * prendió, no subió nada, la versión elegida ya no está, o el plan venció.
 *
 * El precio, el nombre y el botón salen de acá —del producto— y no de lo que
 * el archivo tenga escrito: si mañana cambia el precio en Productos, la
 * landing cambia sola. Es la diferencia con pegar el mismo HTML en Shopify,
 * donde el número vive a mano adentro de un `<script>`.
 */
async function laLanding(fila: {
  id: string; name: string; price: number; comparePrice: number | null; landingPropia: string | null; bienvenida: string | null;
  store: { owner: { subscription: { tier: string; status: string; trialEndsAt: Date; currentPeriodEnd: Date | null; gracePeriodEndsAt: Date | null } | null } };
}, previa: boolean, bienvenida: BienvenidaDeLaVisita): Promise<{ html: string; fuentes: string[] } | null> {
  const estado = leerEstadoDeLanding(fila.landingPropia);
  if ((!estado.activa && !previa) || !estado.versionId) return null;
  const sub = fila.store.owner.subscription;
  if (!sub || sub.tier === "FREE" || !isSubscriptionActive(sub)) return null;

  const version = await laVersion(estado.versionId, fila.id);
  if (!version) return null;

  const viva = bienvenida?.estado === "viva" ? bienvenida : null;
  const html = armarLanding(version.html, {
    nombre: fila.name,
    /* Mientras corre el reloj: el precio de bienvenida, y el normal tachado.
       Lo que dice cada uno al vencer va aparte (`despues`). */
    precio: viva ? viva.precio : fila.price,
    precioAnterior: viva ? viva.precioNormal : fila.comparePrice,
    /* ⚠️ El MISMO link que pone la página de secciones (`PaginaDeVenta`), y
       por el mismo motivo: en el dominio de la plataforma
       —`tiendaapps.com/p/<id>`, que es donde vive la previa del panel y la
       dirección de quien todavía no tiene dominio propio— un `/pagar` pelado
       es la raíz del sitio y ahí no hay nada. Era 404: el botón que cobra,
       muerto. */
    hrefComprar: `/p/${fila.id}/pagar`,
    fotos: estado.fotos,
    enlaces: estado.enlaces,
    /* Los otros bloques vivos (opiniones, aviso de ventas) llegan en el paso
       siguiente. Hasta entonces sus huecos se sacan, que es lo que hace
       `armarLanding` sin HTML: mejor nada que un cuadro vacío. */
    bloques: {},
    bienvenida: viva
      ? { productId: fila.id, token: viva.token, venceEn: viva.venceEn, texto: viva.texto, despues: { precio: fila.price, precioAnterior: fila.comparePrice } }
      : previa ? { productId: fila.id, token: "", venceEn: 0, texto: leerTextoDeBienvenida(fila.bienvenida), despues: { precio: fila.price, precioAnterior: fila.comparePrice }, demo: true } : undefined,
    /* En la previa, un hueco sin foto se marca en vez de desaparecer: es la
       forma de ver qué falta subir. */
    mostrarHuecos: previa,
  });
  return { html, fuentes: version.fuentes };
}

/**
 * La versión guardada, con memoria.
 *
 * Una fila de `LandingDigital` no cambia NUNCA: subir otra vez crea una fila
 * nueva y cambia cuál está elegida. Por eso se puede guardar en la memoria
 * del proceso sin fecha de vencimiento ni forma de quedar desactualizada.
 *
 * Importa porque esta página es `force-dynamic`: sin esto, cada visita a una
 * landing prendida se trae hasta 500 KB de HTML de la base. Mil visitas son
 * medio giga de tráfico por una página que es siempre igual — y el tráfico
 * es lo que se paga en Supabase, no el depósito.
 */
const VERSIONES_EN_MEMORIA = 8;
const guardadas = new Map<string, { html: string; fuentes: string[] }>();

async function laVersion(versionId: string, productId: string) {
  const guardada = guardadas.get(versionId);
  if (guardada) return guardada;

  const fila = await prisma.landingDigital.findFirst({
    where: { id: versionId, productId },
    select: { html: true, inventario: true },
  });
  if (!fila) return null;

  const valor = { html: fila.html, fuentes: leerInventario(fila.inventario).fuentes };
  /* La más vieja se va: no es un cache que haya que acertar, es no pedir dos
     veces seguidas lo mismo. */
  if (guardadas.size >= VERSIONES_EN_MEMORIA) {
    const primera = guardadas.keys().next().value;
    if (primera) guardadas.delete(primera);
  }
  guardadas.set(versionId, valor);
  return valor;
}

/** Para la previa: el texto de la barra si lo configuró, o el de fábrica. */
function leerTextoDeBienvenida(raw: string | null): string {
  return leerBienvenida(raw).texto || BIENVENIDA_DE_FABRICA.texto;
}
