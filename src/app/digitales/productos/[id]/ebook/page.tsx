import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { leerIndice, leerCapitulos } from "@/lib/ebook-ia";
import { leerOpciones, COMO_SE_LLAMA } from "@/lib/ebook-opciones";
import { sePuedeEditarElTexto } from "@/lib/ebook-texto";
import BotonVolver from "../../../BotonVolver";
import EditorDeEbook from "./EditorClient";

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

  /* El dueño adentro del `where`, igual que en la ruta que guarda. */
  const fila = await prisma.product.findFirst({
    where: { id, deletedAt: null, store: { ownerId: user.id } },
    select: {
      id: true,
      name: true,
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
          capitulos={capitulos}
          total={leerIndice(fila.ebookIA.indice).length}
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
