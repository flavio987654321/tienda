/* ══════════════════════════════════════════════════════════════════════════
   LO QUE DE `storeConfig` PUEDE SALIR AL NAVEGADOR (05/10/26)
   ══════════════════════════════════════════════════════════════════════════

   `storeConfig` es un JSON con el diseño de la tienda, pero no sólo eso: la
   pantalla de Pagos guarda ahí adentro los datos bancarios de la dueña
   (titular, CBU/CVU, alias, banco, CUIL). Ese JSON salía ENTERO por
   `/api/public/<slug>` y en el HTML de la tienda, aun con la transferencia
   apagada o la tienda en "Próximamente": cualquiera podía leer el CUIL.

   La tienda pública no los usa: las preguntas frecuentes sólo necesitan saber
   SI hay transferencia o efectivo. Los datos van en el mail del pedido, que se
   arma en el servidor (`api/checkout`) leyendo la base, no esto.

   Por eso se recorta acá, en un solo lugar, y lo usan los dos caminos por los
   que el JSON llega al navegador. El editor no se ve afectado: guarda con
   `mergeDesignConfig`, que conserva el `paymentInfo` del servidor. */

type Medio = { enabled?: unknown };

/** Recibe el `storeConfig` ya parseado y devuelve una copia sin datos privados. */
export function configPublica<T extends Record<string, unknown>>(cfg: T): T {
  const pi = cfg.paymentInfo as { transferencia?: Medio; efectivo?: Medio } | undefined;
  if (!pi || typeof pi !== "object") return cfg;
  return {
    ...cfg,
    paymentInfo: {
      transferencia: { enabled: Boolean(pi.transferencia?.enabled) },
      efectivo: { enabled: Boolean(pi.efectivo?.enabled) },
    },
  };
}

/** Lo mismo, para el `storeConfig` todavía en texto (como sale de la base). */
export function configPublicaTexto(json: string | null | undefined): string | null | undefined {
  if (!json) return json;
  try {
    return JSON.stringify(configPublica(JSON.parse(json)));
  } catch {
    // Un JSON roto no se manda: podría tener cualquier cosa adentro.
    return "{}";
  }
}
