import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { buscarVideos } from "@/lib/videos-pexels";
import BotonVolver from "../../BotonVolver";
import ReelsClient from "./ReelsClient";

/**
 * Contenido para reels.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * QUÉ RESUELVE, QUE NO ES "TENER VIDEOS"
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Quien vende un producto digital tiene que mostrarlo en algún lado, y no tiene
 * con qué filmar un taller mecánico ni una panadería. Termina buscando en
 * Google, bajando algo de dudosa procedencia y subiéndolo a un reel — con el
 * riesgo de que le bajen la publicación por derechos.
 *
 * Esto le da material que **se puede usar legalmente**, del mismo banco del que
 * ya sacamos las fotos de los ebooks y con la misma clave. No cuesta nada nuevo.
 *
 * ── ⚠️ Por qué la búsqueda viene llena ─────────────────────────────────────
 *
 * Un buscador vacío es una pregunta: "¿qué escribo?". Y es la peor pregunta
 * acá, porque la respuesta obvia —el título del producto— es justo la que trae
 * basura: está medido en `videos-pexels`, y antes en `ebook-ia` con las fotos,
 * donde buscar por título trajo una guitarra acústica para "Primeros pasos para
 * arrancar esta semana".
 *
 * Así que se entra con la búsqueda ya hecha sobre el producto que hay cargado.
 * Se puede cambiar, pero la primera pantalla ya muestra material del rubro.
 */

export const dynamic = "force-dynamic";

export default async function ReelsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;

  /* El producto principal más nuevo: es de lo que la persona está hablando
     ahora. `rolDigital` decide, no "tiene archivo" — un producto recién creado
     todavía no lo tiene y es igual de válido para buscarle material. */
  const producto = await prisma.product.findFirst({
    where: {
      deletedAt: null,
      rolDigital: "PRINCIPAL",
      store: { ownerId: user.id },
    },
    orderBy: { createdAt: "desc" },
    select: { name: true },
  });

  /* ⚠️ Se recorta a lo que el banco entiende. Una búsqueda de doce palabras
     trae cualquier cosa; ver el encabezado de `videos-pexels`. Quedan las
     primeras cuatro, que es donde vive el sustantivo del rubro, y se corta en
     el guion largo que suele separar el título de la bajada. */
  const nombre = (producto?.name ?? "").split(/[—–:|]/)[0].trim();
  const busqueda = nombre.split(/\s+/).slice(0, 4).join(" ");

  /* ⚠️ La primera búsqueda se hace ACÁ, en el servidor, y no al apretar un
     botón. La pantalla que abre vacía con la búsqueda ya escrita adentro le
     pide a la persona que apriete Buscar para ver lo que nosotros ya sabemos
     que quiere ver. Y no cuesta un pedido más: el guardarropas de 24 horas hace
     que dos personas del mismo rubro compartan la respuesta. */
  const primera = busqueda
    ? await buscarVideos(busqueda, { vertical: true })
    : { videos: [], total: 0, sinCupo: false, sinClave: false };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
      <BotonVolver />

      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 panel-oscuro:text-gray-100">
          Contenido para reels
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
          Videos que podés usar gratis en tus reels, publicaciones y anuncios. Se bajan a tu
          teléfono o a tu compu y los subís donde quieras.
        </p>
      </div>

      <ReelsClient
        busquedaInicial={busqueda}
        deQueProducto={producto?.name ?? ""}
        videosIniciales={primera.videos}
        totalInicial={primera.total}
        sinClave={primera.sinClave}
        sinCupo={primera.sinCupo}
      />
    </div>
  );
}
