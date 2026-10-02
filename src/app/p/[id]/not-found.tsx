import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Este producto no está disponible",
  robots: { index: false, follow: false },
};

/**
 * Un producto que no existe, se borró o todavía no se publicó.
 *
 * ⚠️ Sin este archivo salía el 404 de Next, EN INGLÉS ("This page could not
 * be found"), justo a quien llegó con ganas de comprar desde un anuncio o un
 * link de WhatsApp. Visto en producción el 03/10/26.
 *
 * No dice cuál de las tres es: decir "existe pero no está publicado" sería
 * contarle a cualquiera que pruebe direcciones qué hay en el panel de otro.
 *
 * Sin colores de la página de venta: no hay producto del que sacarlos.
 */
export default function ProductoNoEncontrado() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 [color-scheme:light]">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="mb-3 text-4xl" aria-hidden>📦</p>
        <h1 className="text-xl font-black text-gray-900">Este producto no está disponible</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          Puede que el link esté mal copiado, o que quien lo vende lo haya sacado de la venta.
          Si ya lo compraste, tu archivo sigue en el mail que te llegó.
        </p>
      </div>
    </main>
  );
}
