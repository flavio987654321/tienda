import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizarContenido, variablesDePagina, buscarEstilo } from "@/lib/pagina-venta";
import { CLASES_FUENTES } from "@/lib/fuentes-venta";
import { loQueFalta } from "@/lib/productos-digitales";
import { totalDeLaCompra, type ItemDeCompra } from "@/lib/compra-digital";
import { DIAS_DEL_PERMISO, MAX_DESCARGAS } from "@/lib/entrega-digital";
import CheckoutClient from "./CheckoutClient";

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
    /* Las mismas condiciones que la ruta que cobra. Si la pantalla mostrara
       productos que la ruta después rechaza, alguien llenaría el mail y se
       comería un error recién al apretar Pagar. */
    where: { id, deletedAt: null, rolDigital: "PRINCIPAL", isActive: true },
    select: {
      id: true, name: true, price: true, comparePrice: true, archivoPath: true,
      rolDigital: true, paginaVenta: true, images: true,
      store: {
        select: {
          isPublished: true, mpAccessToken: true,
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

  /* Sin archivo o sin precio no hay nada que cobrar. Se mira acá igual que en la
     ruta: entre publicar y comprar pueden pasar días. */
  if (loQueFalta({
    rolDigital: fila.rolDigital, archivoPath: fila.archivoPath,
    price: fila.price, name: fila.name,
  })) notFound();

  const pagina = normalizarContenido(fila.paginaVenta);
  const estilo = buscarEstilo(pagina.estilo);

  const principal: ItemDeCompra = {
    id: fila.id, name: fila.name, price: fila.price, rolDigital: fila.rolDigital,
  };
  const bonos = fila.hijos.filter((h) => h.rolDigital === "BONO");
  const upsells = fila.hijos.filter((h) => h.rolDigital === "UPSELL" && h.price > 0);

  /* Los días de garantía que promete SU página, no un número escrito acá: la
     pantalla de pago no puede prometer algo distinto de la que trajo a la
     persona. Si esa sección está apagada, no se muestra el sello. */
  const seccionGarantia = pagina.secciones.find((s) => s.clave === "garantia" && s.visible);
  const diasDeGarantia =
    seccionGarantia && typeof seccionGarantia.campos.dias === "number"
      ? seccionGarantia.campos.dias
      : null;

  return (
    <div className={CLASES_FUENTES}>
      <div
        style={variablesDePagina(pagina) as React.CSSProperties}
        className="min-h-screen overflow-x-clip [overflow-wrap:anywhere] bg-[color:var(--pv-fondo)] text-[color:var(--pv-tinta)] antialiased"
      >
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
          diasDeGarantia={diasDeGarantia}
          diasDelEnlace={DIAS_DEL_PERMISO}
          maxDescargas={MAX_DESCARGAS}
          vendedor={fila.store.owner.name}
          /* Sin Mercado Pago conectado la pantalla no ofrece pagar: es preferible
             decirlo antes que dejar escribir el mail para fallar al final. */
          puedeCobrar={Boolean(fila.store.mpAccessToken)}
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
