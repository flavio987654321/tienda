import Link from "next/link";
import { ArrowRight, AlertTriangle, Info } from "lucide-react";
import type { Bloque } from "@/lib/ayuda";

/* Negrita y cursiva dentro de un párrafo.
 *
 * Los artículos se escriben en TypeScript, así que el texto podría llevar JSX
 * directamente — pero entonces cada párrafo sería markup y el archivo dejaría
 * de leerse como texto. Con esto el contenido sigue siendo strings: se puede
 * corregir una frase sin tocar una etiqueta.
 *
 * Sale todo por JSX, o sea escapado. No hay `dangerouslySetInnerHTML` en
 * ninguna parte de la ayuda. */
const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;

function inline(texto: string) {
  return texto
    .split(INLINE)
    .filter(Boolean)
    .map((frag, i) => {
      if (frag.startsWith("**") && frag.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-gray-950">
            {frag.slice(2, -2)}
          </strong>
        );
      }
      if (frag.startsWith("*") && frag.endsWith("*")) {
        return <em key={i}>{frag.slice(1, -1)}</em>;
      }
      return <span key={i}>{frag}</span>;
    });
}

const PARRAFO = "text-[15px] leading-7 text-gray-600";

function Bloque({ b }: { b: Bloque }) {
  switch (b.t) {
    case "p":
      return <p className={PARRAFO}>{inline(b.texto)}</p>;

    /* La línea de arriba es lo que separa un tema del siguiente. Sin ella los
       subtítulos flotaban entre párrafos y el artículo se leía como un bloque
       continuo: no se veía dónde terminaba una pregunta y empezaba otra. */
    case "h":
      return (
        <h2 className="mt-4 border-t border-gray-200 pt-8 text-lg font-bold tracking-tight text-gray-950 text-balance">
          {inline(b.texto)}
        </h2>
      );

    case "lista":
      return (
        <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-orange-300">
          {b.items.map((item, i) => (
            <li key={i} className={PARRAFO}>
              {inline(item)}
            </li>
          ))}
        </ul>
      );

    case "pasos":
      return (
        <ol className="flex flex-col gap-3">
          {b.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-50 text-xs font-semibold tabular-nums text-orange-700">
                {i + 1}
              </span>
              <span className={PARRAFO}>{inline(item)}</span>
            </li>
          ))}
        </ol>
      );

    case "aviso": {
      const esOjo = b.tono === "ojo";
      const Icono = esOjo ? AlertTriangle : Info;
      return (
        <div
          className={`flex gap-3 rounded-xl border p-4 ${
            esOjo ? "border-amber-200 bg-amber-50/60" : "border-gray-200 bg-gray-50"
          }`}
        >
          <Icono
            className={`mt-0.5 h-4 w-4 shrink-0 ${esOjo ? "text-amber-600" : "text-gray-400"}`}
            aria-hidden="true"
          />
          <p className={`text-sm leading-6 ${esOjo ? "text-amber-950" : "text-gray-600"}`}>
            {inline(b.texto)}
          </p>
        </div>
      );
    }

    /* La tabla scrollea adentro de su propio contenedor. Sin esto, en 360 el
       cuerpo entero de la página se va de costado por culpa de una sola tabla. */
    case "tabla":
      return (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[30rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200">
                {b.cols.map((col) => (
                  <th
                    key={col}
                    scope="col"
                    className="pb-2 pr-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.filas.map(([izq, der], i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <th
                    scope="row"
                    className="w-40 py-3 pr-6 align-top text-sm font-semibold text-gray-950"
                  >
                    {inline(izq)}
                  </th>
                  <td className="py-3 align-top text-sm leading-6 text-gray-600">{inline(der)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "ruta":
      return (
        <Link
          href={b.href}
          className="group inline-flex items-center gap-2 self-start rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-700 transition-colors hover:border-orange-300 hover:bg-orange-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
        >
          {b.label}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      );
  }
}

export default function Cuerpo({ bloques }: { bloques: Bloque[] }) {
  return (
    <div className="flex max-w-[72ch] flex-col gap-5">
      {bloques.map((b, i) => (
        <Bloque key={i} b={b} />
      ))}
    </div>
  );
}
