import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { leerIndice, leerCapitulos, leerPromesa } from "@/lib/ebook-ia";
import { leerOpciones, COMO_SE_LLAMA } from "@/lib/ebook-opciones";
import { sePuedeEditarElTexto } from "@/lib/ebook-texto";
import { normalizarContenido, buscarPaleta } from "@/lib/pagina-venta";
import { PALETAS } from "@/lib/pagina-venta";
import BotonVolver from "../../../BotonVolver";
import EditorDeEbook from "./EditorClient";
import { ID_DEL_EJEMPLO, PRODUCTO_DE_EJEMPLO } from "../../ejemploDeTarjeta";
import { CAPITULOS_DE_EJEMPLO } from "../../ejemploDeEbook";

export const dynamic = "force-dynamic";

/**
 * El editor del texto del ebook.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ES UNA PANTALLA, NO UNA VENTANITA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Nació adentro del modal del ebook y ahí estaba mal: un modal de 576 px de
 * ancho es para decidir una cosa —"¿lo escribo?", "¿lo rehago?"—, no para
 * sentarse a corregir diez capítulos de novecientas palabras. Se corrige el
 * trabajo de una tarde en una ventana que se cierra con un clic al costado.
 *
 * Así que vive donde vive el otro editor largo del panel, el de la página de
 * venta: **una dirección propia colgada del producto**, con su "volver", con la
 * barra lateral al lado y con todo el ancho de la pantalla. Ver
 * `productos/[id]/pagina/page.tsx`, que es el mismo molde.
 *
 * ── Los datos se leen ACÁ, del lado del servidor ───────────────────────────
 *
 * No hay un `fetch` al abrir. El texto de un ebook son decenas de miles de
 * caracteres: pedirlo desde el navegador es una pantalla en blanco con un
 * reloj girando, cuando la página ya se está armando en el servidor y puede
 * traerlo en el mismo viaje.
 *
 * ── Las tres puertas cerradas, y por qué cada una ──────────────────────────
 *
 * 1. **El dueño va adentro del `where`.** Acá adentro está el texto completo
 *    del ebook, que ES el producto que esa persona vende.
 * 2. **Un recetario no entra**: sus recetas son campos —cantidad, tiempo, pasos
 *    numerados—, no párrafos, y este editor dibuja párrafos.
 * 3. **Sin nada escrito no hay nada que corregir.** Ahí lo que se edita es el
 *    temario, que es otra pantalla y está antes.
 *
 * Las tres se explican en vez de tirar un 404: a esta dirección se puede llegar
 * de un enlace viejo o del historial, y "no encontrado" no le dice a nadie qué
 * hacer.
 */

type Props = { params: Promise<{ id: string }> };

export default async function EditorDeEbookPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;

  const { id } = await params;

  /* ── El ejemplo ───────────────────────────────────────────────────────────
     Entra por ACÁ y no por una dirección aparte, y eso es todo el punto: los
     pasos que se prueban son los de verdad —tarjeta, "Editar el contenido",
     editor— y no una imitación que puede quedar vieja.

     ⚠️ Detrás de `NODE_ENV`, así que en producción esta rama no existe y el id
     cae en la consulta de abajo, que no lo va a encontrar. Y no lee nada: el
     ebook está escrito en `ejemploDeEbook`. Ver `ejemploDeTarjeta`. */
  if (process.env.NODE_ENV === "development" && id === ID_DEL_EJEMPLO) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <BotonVolver href="/digitales/productos">Volver a productos</BotonVolver>
        <p className="mb-4 max-w-2xl rounded-xl bg-amber-50 panel-oscuro:bg-amber-500/10 px-3.5 py-2.5 text-[12px] leading-relaxed text-amber-900 panel-oscuro:text-amber-200">
          <strong>Ejemplo, sólo en desarrollo.</strong> El ebook está inventado en el
          código: no toca la base, no gasta cupo y guardar no manda nada a ningún lado.
        </p>
        <EditorDeEbook
          productoId={ID_DEL_EJEMPLO}
          producto={PRODUCTO_DE_EJEMPLO.name}
          titulo={PRODUCTO_DE_EJEMPLO.ebook?.titulo ?? ""}
          promesa="Cómo pasar de tener algo para enseñar a la primera venta cobrada, sin público y sin publicidad."
          autor="Tu tienda"
          capitulos={CAPITULOS_DE_EJEMPLO}
          total={CAPITULOS_DE_EJEMPLO.length}
          paleta={PALETAS[0]}
          modo="claro"
          /* ⚠️ Lo único que cambia respecto de un ebook de verdad: no guarda.
             Sin esto, el ejemplo le pegaría a la ruta con un id que no existe y
             la respuesta sería un 404 que no explica nada. */
          deMentira
        />
      </div>
    );
  }

  /* El dueño adentro del `where`, igual que en la ruta que guarda. */
  const fila = await prisma.product.findFirst({
    where: { id, deletedAt: null, store: { ownerId: user.id } },
    select: {
      id: true,
      name: true,
      /* Para la vista previa: la tapa sale con LOS COLORES DE LA PERSONA, los
         mismos que va a usar el armado. Se leen igual que en `/armar`. */
      paginaVenta: true,
      store: { select: { name: true } },
      ebookIA: { select: { estado: true, titulo: true, indice: true, capitulos: true } },
    },
  });
  if (!fila) notFound();

  /* Sin ebook empezado esta pantalla no tiene de qué hablar. Es la única de las
     cuatro que sí es un "no existe": nunca hubo nada acá. */
  if (!fila.ebookIA) notFound();

  const opciones = leerOpciones(fila.ebookIA.indice);
  const esRecetario = opciones.formato === "recetario";
  const capitulos = esRecetario ? [] : leerCapitulos(fila.ebookIA.capitulos);
  const puede =
    !esRecetario && sePuedeEditarElTexto(fila.ebookIA.estado) && capitulos.length > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <BotonVolver href="/digitales/productos">Volver a productos</BotonVolver>

      {puede ? (
        <EditorDeEbook
          productoId={fila.id}
          producto={fila.name}
          titulo={fila.ebookIA.titulo}
          /* La promesa de la tapa, la que escribió el modelo para vender. Vacía
             en los ebooks guardados antes del 07/09/26. Ver `leerPromesa`. */
          promesa={leerPromesa(fila.ebookIA.indice)}
          /* Quién lo vende: el ebook es de esa persona, no nuestro. */
          autor={fila.store?.name ?? ""}
          capitulos={capitulos}
          total={leerIndice(fila.ebookIA.indice).length}
          /* ⚠️ La misma cuenta que hace `/armar`: manda lo que eligió para el
             ebook y, si no eligió nada, la paleta de su página de venta. Si
             fueran distintas, la previa mostraría una tapa y el archivo saldría
             con otra. */
          paleta={buscarPaleta(
            opciones.paleta || normalizarContenido(fila.paginaVenta).paleta,
          )}
          modo={opciones.tema}
        />
      ) : (
        <div className="max-w-2xl rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 p-5">
          <p className="font-black text-gray-900 panel-oscuro:text-gray-100">
            Este {COMO_SE_LLAMA[opciones.formato].obra.toLowerCase()} no se corrige acá
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
            {esRecetario
              ? "Un recetario no son párrafos: cada receta son campos —los ingredientes con su cantidad, los pasos numerados, el tiempo—, y esta pantalla corrige párrafos. Su editor todavía no está hecho."
              : "Todavía no hay nada escrito. Lo que se puede corregir antes de escribir es el temario, y eso se hace desde la ventana del ebook, en la tarjeta del producto."}
          </p>
        </div>
      )}
    </div>
  );
}
