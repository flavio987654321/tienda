import { Lightbulb } from "lucide-react";

/**
 * El recuadro de consejo de Marketing y Productos: el mismo foquito y el
 * mismo amarillo que los consejos de Estadísticas, para que se lea como la
 * misma voz en todo el panel.
 *
 * Es UNO por pantalla, con la razón adentro de la frase. Sin números que
 * no se puedan defender: ver `lib/plantillas-marketing`.
 */
export default function ConsejoDeUso({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-2xl bg-amber-50/70 panel-oscuro:bg-amber-500/10 border border-amber-100 panel-oscuro:border-amber-500/20 px-3.5 py-3 ${className}`}>
      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
      <div className="min-w-0 text-[12.5px] leading-relaxed text-amber-950 panel-oscuro:text-amber-100/90">{children}</div>
    </div>
  );
}
