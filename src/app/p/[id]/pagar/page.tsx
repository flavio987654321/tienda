import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { normalizarContenido, variablesDePagina, buscarEstilo, diasDeGarantia } from "@/lib/pagina-venta";
import { CLASES_FUENTES } from "@/lib/fuentes-venta";
import { loQueFalta } from "@/lib/productos-digitales";
import { totalDeLaCompra, type ItemDeCompra } from "@/lib/compra-digital";
import { DIAS_DEL_PERMISO, MAX_DESCARGAS } from "@/lib/entrega-digital";
import CheckoutClient from "./CheckoutClient";
import VisitaDigital from "../VisitaDigital";

/**
 * La pantalla de pago de un producto digital.
 *
 * ── Por qué no se puede configurar ──────────────────────────────────────────
 *
 * Los colores, la letra y la forma salen de `variablesDePagina`, la MISMA
 * función que dibuja la página de venta. No hay editor de checkout y no lo va a
 * haber: cada cosa configurable en la pantalla donde entra la plata es una forma
 * de romperla, y un checkout que se puede configurar aparte de su propia página
 * es un checkout que en algún momento va a contradecirla.
 *
 * ── Por qué los números se calculan acá y no en el navegador ────────────────
 *
 * Porque son los MISMOS que va a cobrar la ruta de compra: sale de
 * `totalDeLaCompra`, en `lib/compra-digital`. Con la cuenta escrita en la
 * pantalla, alcanza con tocar una para que diga un número y se cobre otro — y de
 * ese error se entera el comprador, con el resumen de la tarjeta en la mano.
 */

export const metadata: Metadata = {
  title: "Finalizar compra",
  /* Una pantalla de pago no se indexa: no aporta nada en un buscador y aparecer
     ahí sólo consigue que alguien entre por el medio del embudo, sin haber leído
     lo que está por comprar. */
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string }> };

export default async function PantallaDePago({ params }: Props) {
  const { id } = await params;

  const fila = await prisma.product.findFirst({
    /* ⚠️ Sin `isActive` en el `where`, a propósito: se busca igual y se decide
       más abajo quién puede verlo. Ver `quiénPuedeVerla`. */
    where: { id, deletedAt: null, rolDigital: "PRINCIPAL" },
    select: {
      id: true, name: true, price: true, comparePrice: true, archivoPath: true,
      rolDigital: true, paginaVenta: true, images: true, isActive: true,
      store: {
        select: {
          isPublished: true, mpAccessToken: true, ownerId: true,
          owner: { select: { role: true, name: true } },
        },
      },
      hijos: {
        where: { deletedAt: null, isActive: true },
        orderBy: { createdAt: "asc" },
        select: {
          id: true, name: true, description: true, price: true, comparePrice: true,
          rolDigital: true, padreId: true, images: true,
        },
      },
    },
  });

  /* La tienda de una cuenta digital nace y se queda despublicada: es el motor,
     nadie la ve. Una publicada es la tienda de alguien de verdad, y sus
     productos se venden por su propia puerta. Ver `espacioDigital`. */
  if (!fila || fila.store.isPublished || fila.store.owner.role !== "DIGITAL") notFound();

  /* ══════════════════════════════════════════════════════════════════════════
     QUIÉN PUEDE VERLA
     ══════════════════════════════════════════════════════════════════════════

     Antes esto era un `notFound()` seco: sin publicar o sin archivo, 404 para
     todo el mundo — incluida la dueña del producto, que sólo quería mirar cómo
     le quedó su propio checkout. Se topaba con un 404 pelado que no explica
     nada. Encontrado a mano el 03/09/26, y era una función a medias: la página
     de venta SÍ se le muestra a su dueña sin publicar, y el checkout no.

     Ahora sigue el mismo criterio que `/p/[id]`: si todavía no se puede vender,
     la ve la dueña y nadie más, marcada como previa y con el botón apagado.
     Ver el checkout no puede depender de publicar el producto. */
  /* ⚠️ Mercado Pago va ADENTRO de `loQueFalta` desde el 08/09/26, y por eso acá
     ya no se mira aparte: era la misma regla escrita en dos lados, con dos
     textos distintos. El orden no cambió —el cobro es la última de las cuatro—
     así que a la dueña se le sigue nombrando primero lo más grave. */
  const falta = loQueFalta({
    rolDigital: fila.rolDigital, archivoPath: fila.archivoPath,
    price: fila.price, name: fila.name,
    cobroConectado: !!fila.store.mpAccessToken,
  });
  const seLePuedeVender = fila.isActive && !falta;

  let avisoDePrevia: string | null = null;
  if (!seLePuedeVender) {
    const user = await getCurrentUser();
    /* Quien no es la dueña ve exactamente lo mismo que antes. */
    if (!user || user.id !== fila.store.ownerId) notFound();

    /* Y a ella se le dice QUÉ falta, en orden de qué tiene que resolver primero.
       Un 404 la dejaba adivinando entre tres cosas distintas. */
    avisoDePrevia =
      falta ?? "Este producto todavía no está publicado, así que sólo lo ves vos.";
  }

  const pagina = normalizarContenido(fila.paginaVenta);
  const estilo = buscarEstilo(pagina.estilo);

  const principal: ItemDeCompra = {
    id: fila.id, name: fila.name, price: fila.price, rolDigital: fila.rolDigital,
  };
  const bonos = fila.hijos.filter((h) => h.rolDigital === "BONO");
  const upsells = fila.hijos.filter((h) => h.rolDigital === "UPSELL" && h.price > 0);

  /* Los días de garantía que promete SU página, no un número escrito acá: la
     pantalla de pago no puede prometer algo distinto de la que trajo a la
     persona. Si esa sección está apagada, no se muestra el sello.

     ⚠️ Sale de la función compartida y no de una cuenta hecha acá: el mismo
     número lo lee el texto que se acepta antes de pagar y la ruta que lo guarda
     como prueba. Copiado en tres lados, el sello promete 30 días y la prueba
     guardada dice que no hay devolución. Ver `consentimiento-digital`. */
  const dias = diasDeGarantia(pagina);

  return (
    <div className={CLASES_FUENTES}>
      <div
        style={variablesDePagina(pagina) as React.CSSProperties}
        className="min-h-screen overflow-x-clip [overflow-wrap:anywhere] bg-[color:var(--pv-fondo)] text-[color:var(--pv-tinta)] antialiased"
      >
        {/* El segundo escalón del embudo: abrió el checkout. Con la previa de la
            dueña apagado; el servidor la descartaría igual. */}
        <VisitaDigital paso="pagar" productoId={fila.id} apagado={!seLePuedeVender} />
        <CheckoutClient
          productoId={fila.id}
          nombre={fila.name}
          imagen={primeraImagen(fila.images)}
          precio={fila.price}
          regular={fila.comparePrice && fila.comparePrice > fila.price ? fila.comparePrice : fila.price}
          bonos={bonos.map((b) => ({
            id: b.id, nombre: b.name,
            vale: b.comparePrice && b.comparePrice > 0 ? b.comparePrice : 0,
          }))}
          upsells={upsells.map((u) => ({
            id: u.id, nombre: u.name,
            descripcion: u.description,
            precio: u.price,
            regular: u.comparePrice && u.comparePrice > u.price ? u.comparePrice : null,
            imagen: primeraImagen(u.images),
          }))}
          /* El total de arranque, calculado por la misma función que cobra. */
          totalBase={totalDeLaCompra(principal, [])}
          diasDeGarantia={dias}
          diasDelEnlace={DIAS_DEL_PERMISO}
          maxDescargas={MAX_DESCARGAS}
          vendedor={fila.store.owner.name}
          /* Sin Mercado Pago conectado la pantalla no ofrece pagar: es preferible
             decirlo antes que dejar escribir el mail para fallar al final. */
          puedeCobrar={seLePuedeVender}
          avisoDePrevia={avisoDePrevia}
          botonRedondo={estilo.boton}
          tarjeta={estilo.tarjeta}
        />
      </div>
    </div>
  );
}

/** La portada. Un JSON roto no puede tumbar la pantalla de pago. */
function primeraImagen(images: string): string | null {
  try {
    const lista = JSON.parse(images);
    return Array.isArray(lista) && typeof lista[0] === "string" ? lista[0] : null;
  } catch {
    return null;
  }
}
