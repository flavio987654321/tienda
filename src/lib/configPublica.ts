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

/** ¿Es el número de muestra (`WHATSAPP_DE_EJEMPLO`), escrito como sea? */
export function esWhatsappDeEjemplo(numero: unknown): boolean {
  return typeof numero === "string" && numero.replace(/\D/g, "") === "5491100000000";
}

/** Recibe el `storeConfig` ya parseado y devuelve una copia sin datos privados. */
export function configPublica<T extends Record<string, unknown>>(entrada: T): T {
  /* El WhatsApp de MUESTRA no sale prendido (06/10/26). El editor graba el
     config entero, así que hay tiendas con `+54 9 11 0000-0000` guardado y
     activo: su botón abría un chat con nadie. Se apaga acá, que es por donde
     pasan las dos salidas públicas, y así vale para todos los templates. */
  const wa = entrada.whatsapp as { enabled?: unknown; number?: unknown } | undefined;
  const cfg: T = wa && typeof wa === "object" && esWhatsappDeEjemplo(wa.number)
    ? { ...entrada, whatsapp: { ...wa, enabled: false, number: "" } }
    : entrada;
  const pi = cfg.paymentInfo as { transferencia?: Medio; efectivo?: Medio } | undefined;
  if (!pi || typeof pi !== "object") return cfg;
  /* Sólo las claves que existen: `mediosHabilitados` trata una tienda sin
     ninguna como "nunca configuró Pagos" y le ofrece los dos. Inventarlas
     apagadas dejaba al carrito sin medios mientras el servidor sí aceptaba. */
  const publica: { transferencia?: Medio; efectivo?: Medio } = {};
  if (pi.transferencia != null) publica.transferencia = { enabled: Boolean(pi.transferencia.enabled) };
  if (pi.efectivo != null) publica.efectivo = { enabled: Boolean(pi.efectivo.enabled) };
  return { ...cfg, paymentInfo: publica };
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
