import { Lightbulb } from "lucide-react";

/**
 * UN CONSEJO: lo que va en el costado vacío de cada paso del recibimiento.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * QUÉ ES, Y SOBRE TODO QUÉ NO ES
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Las cuatro pantallas del recibimiento tienen una tarjeta en el medio y dos
 * costados vacíos. Esto los llena con **una** cosa útil por paso: lo que alguien
 * que nunca vendió un producto digital no sabe todavía, dicho en el momento en
 * que le sirve.
 *
 * ⚠️ NO SON DATOS INVENTADOS. Ni un porcentaje, ni un "el 80% de los
 * compradores…", ni una estadística de ningún lado. Todo lo que se afirma acá
 * tiene que poder defenderse solo, con la razón adentro de la misma frase. Un
 * número inventado en la pantalla de bienvenida es la forma más rápida de que
 * alguien deje de creerle al resto del panel.
 *
 * ⚠️ Y ES UNO POR PASO, no una lista. Tres consejos al lado de un botón compiten
 * con el botón y no se lee ninguno. Si mañana hay un consejo mejor para un
 * momento, se REEMPLAZA el que está; no se agrega abajo.
 *
 * ── Por qué la tabla vive acá y no en cada pantalla ────────────────────────
 *
 * Porque los escriben dos archivos —`Recibimiento` los pasos 1 y 2, `Cierre` el
 * 3 y el 4— y son un solo recorrido. Escritos por separado, el tono cambia a
 * mitad de camino y se lee como si fueran dos productos distintos. Es el mismo
 * motivo por el que `NOMBRE_CORTO` y `BarraDePasos` están afuera.
 */

export type MomentoDelConsejo = "producto" | "pagina" | "estilo" | "listo";

export const CONSEJOS: Record<MomentoDelConsejo, { titulo: string; texto: string }> = {
  producto: {
    titulo: "Cuanto más específico, mejor vende",
    texto:
      "«Recetas de hamburguesas para vender desde casa» funciona mejor que «recetas de cocina». No es que llegue a menos gente: llega a la que estaba buscando exactamente eso, y esa es la que paga.",
  },
  pagina: {
    titulo: "Tu página se va a leer en un teléfono",
    texto:
      "Casi todo el que abra tu link lo va a hacer desde el celular y haciendo otra cosa. Por eso los títulos cortos y los párrafos de tres renglones no son un gusto: es lo que se lee parado en un colectivo.",
  },
  estilo: {
    titulo: "El color no vende, pero el desorden frena",
    texto:
      "Nadie compra por la paleta. Lo que sí pasa es que una página que parece hecha a las apuradas hace dudar justo antes de poner la tarjeta. Elegí la que te deje cómodo mostrándosela a alguien.",
  },
  listo: {
    titulo: "Antes de pagar publicidad, mandale el link a una persona",
    texto:
      "A alguien que no sepa de qué se trata lo tuyo. Si no te puede decir qué se lleva y cuánto sale, el problema está en la página y no en el anuncio. Es la prueba más barata que existe.",
  },
};

export default function Consejo({
  momento,
  className = "",
}: {
  momento: MomentoDelConsejo;
  className?: string;
}) {
  const { titulo, texto } = CONSEJOS[momento];

  return (
    /* Sin fondo blanco y sin borde duro: es lo secundario de la pantalla. Una
       tarjeta igual a la del paso pelearía con ella por la atención, que es
       exactamente lo contrario de lo que esto viene a hacer. */
    <aside className={`rounded-2xl bg-white/60 p-4 ring-1 ring-gray-200/70 panel-oscuro:bg-gray-900/50 panel-oscuro:ring-gray-800 ${className}`}>
      <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest text-orange-600">
        <Lightbulb className="h-3.5 w-3.5" />
        Un consejo
      </p>
      <p className="mt-2 text-[13px] font-bold leading-snug text-gray-900 panel-oscuro:text-gray-100">
        {titulo}
      </p>
      <p className="mt-1.5 text-pretty text-[12.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
        {texto}
      </p>
    </aside>
  );
}
