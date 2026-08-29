"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Check, Mail } from "lucide-react";

export type FilaDescarga = {
  id: string;
  producto: string;
  comprador: string;
  email: string;
  compradoEl: string;
  descargas: number;
  maxDescargas: number;
  ultimaDescarga: string | null;
  venceEl: string;
  vencido: boolean;
};

/** En qué anda el botón de reenviar de CADA fila. Sin el id, apretar uno ponía
 *  a girar a todos: el estado tiene que ser de la fila, no de la tabla. */
type EstadoEnvio = { id: string; estado: "enviando" | "enviado" | "error"; mensaje?: string };

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });

export default function DescargasTable({
  filas,
  pagina,
  totalPaginas,
  diasDeVigencia,
  maxDescargas,
}: {
  filas: FilaDescarga[];
  pagina: number;
  totalPaginas: number;
  diasDeVigencia: number;
  maxDescargas: number;
}) {
  const [envio, setEnvio] = useState<EstadoEnvio | null>(null);

  async function reenviar(id: string) {
    setEnvio({ id, estado: "enviando" });
    try {
      const r = await fetch("/api/dashboard/descargas/reenviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setEnvio({ id, estado: "error", mensaje: data?.error ?? "No se pudo reenviar" });
        return;
      }
      setEnvio({ id, estado: "enviado" });
    } catch {
      setEnvio({ id, estado: "error", mensaje: "No se pudo conectar. Revisá tu internet." });
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* La tabla scrollea sola en el ancho: en un teléfono no entran seis
          columnas, y sin esto el que se estira es el panel entero. */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left font-medium px-4 py-3 whitespace-nowrap">Producto</th>
              <th className="text-left font-medium px-4 py-3 whitespace-nowrap">Comprador</th>
              <th className="text-left font-medium px-4 py-3 whitespace-nowrap">Compró</th>
              <th className="text-left font-medium px-4 py-3 whitespace-nowrap">Descargas</th>
              <th className="text-left font-medium px-4 py-3 whitespace-nowrap">Vence</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filas.map((f) => {
              const suEnvio = envio?.id === f.id ? envio : null;
              const nunca = f.descargas === 0;
              return (
                <tr key={f.id} className="align-top">
                  <td className="px-4 py-3 text-gray-900 font-medium max-w-[220px]">{f.producto}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-900">{f.comprador || "—"}</p>
                    <p className="text-xs text-gray-400 break-all">{f.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fecha(f.compradoEl)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {/* "Nunca" en ámbar, no en gris: es el único dato de esta
                        tabla sobre el que hay algo para hacer. */}
                    {nunca ? (
                      <span className="text-amber-700 font-medium">Nunca la bajó</span>
                    ) : (
                      <span className="text-gray-900">
                        {f.descargas} de {f.maxDescargas}
                      </span>
                    )}
                    {f.ultimaDescarga && (
                      <p className="text-xs text-gray-400">última: {fecha(f.ultimaDescarga)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {f.vencido ? (
                      <span className="text-gray-400">Vencido</span>
                    ) : (
                      <span className="text-gray-500">{fecha(f.venceEl)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {/* Reenviar un link vencido no sirve: manda el mismo token,
                        que sigue vencido. El botón se apaga y lo dice, en vez de
                        dejar mandar un mail que no soluciona nada. */}
                    {f.vencido ? (
                      <span className="text-xs text-gray-400">Ya no se puede reenviar</span>
                    ) : suEnvio?.estado === "enviado" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                        <Check className="h-3.5 w-3.5" />
                        Mail enviado
                      </span>
                    ) : (
                      <div className="inline-flex flex-col items-end gap-1">
                        <button
                          onClick={() => reenviar(f.id)}
                          disabled={suEnvio?.estado === "enviando"}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {suEnvio?.estado === "enviando" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Mail className="h-3.5 w-3.5" />
                          )}
                          Reenviar link
                        </button>
                        {suEnvio?.estado === "error" && (
                          <span className="text-xs text-red-600">{suEnvio.mensaje}</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100">
        Reenviar manda el <strong>mismo</strong> link, con lo que le quede de sus {maxDescargas}{" "}
        descargas y su vencimiento original — no arranca de nuevo. El link dura {diasDeVigencia}{" "}
        días desde la compra.
      </p>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <Paginar href={`?page=${pagina - 1}`} activo={pagina > 1}>
            Anterior
          </Paginar>
          <span className="text-xs text-gray-400">
            Página {pagina} de {totalPaginas}
          </span>
          <Paginar href={`?page=${pagina + 1}`} activo={pagina < totalPaginas}>
            Siguiente
          </Paginar>
        </div>
      )}
    </div>
  );
}

function Paginar({
  href,
  activo,
  children,
}: {
  href: string;
  activo: boolean;
  children: React.ReactNode;
}) {
  if (!activo) return <span className="text-xs text-gray-300">{children}</span>;
  return (
    <Link href={href} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
      {children}
    </Link>
  );
}
