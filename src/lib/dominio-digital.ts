import { prisma } from "@/lib/prisma";
import { syncTurnstileHostname } from "@/lib/turnstile";
import {
  normalizarDominio, validarDominio, esDominioPelado, dominioDeLaPlataforma,
  DIAS_DE_DOMINIO_EN_FREE, DIAS_DE_AVISO_DEL_DOMINIO,
} from "@/lib/configuracion-digital";

/**
 * El dominio propio de un producto digital: `mecanicafacil.com`.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ES LA MITAD DE ARRIBA DE LA DIRECCIÓN. LA DE ABAJO NO SE APAGA NUNCA.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `mecanica.tiendaapps.com` viene con los tres planes y sigue funcionando aunque
 * se conecte un dominio encima. **El dominio se suma, no reemplaza.** Eso no es
 * un detalle de diseño: es lo que hace que mejorar de plan no rompa los links ya
 * repartidos ni los anuncios corriendo.
 *
 * ── Por qué cuelga del producto y no de la cuenta ──────────────────────────
 *
 * Porque `Store.customDomain` es `@unique`: uno por cuenta. Pro vende cinco
 * productos y el caso que justifica la fase entera es venderlos en cinco nichos
 * distintos — mecánica y tortas no comparten dominio. Ver la Fase 5 bis.
 *
 * ── Las tres cosas que hay que tocar para conectar uno ─────────────────────
 *
 *   1. **Nuestra base**, para saber a qué producto lleva.
 *   2. **Vercel**, para que el certificado se emita y el dominio entre al
 *      proyecto. Sin esto el navegador muestra un error de seguridad.
 *   3. **Turnstile**, para que el captcha ande en ese hostname. Sin esto los
 *      formularios de esa página quedan con el botón apagado para siempre, sin
 *      ningún aviso — ya pasó del lado de tiendas y por eso existe ese archivo.
 *
 * ⚠️ Y para DESCONECTAR hay que deshacer las tres. Vercel se olvidaba del lado
 * de tiendas: el dominio quedaba pegado al proyecto para siempre. Con el plan
 * gratuito de Vercel eso importa —hay un techo de 50 dominios por proyecto— y
 * más todavía porque acá cada cuenta Pro puede traer hasta cinco.
 */

/* ── Los valores de DNS ─────────────────────────────────────────────────────
 *
 * ⚠️ Son un RESPALDO, no la fuente. Vercel le da a cada proyecto su propio CNAME
 * —del tipo `d1d4fc829fe7bc7c.vercel-dns-017.com`— y la pantalla muestra el que
 * conteste su API. Estos se usan sólo si la API no está configurada o no
 * contesta, que en la práctica es el desarrollo local. Los dos genéricos siguen
 * funcionando; el propio del proyecto es el que Vercel recomienda. */
export const A_DE_RESPALDO = "76.76.21.21";
export const CNAME_DE_RESPALDO = "cname.vercel-dns.com";

export type Instruccion = { tipo: "A" | "CNAME"; nombre: string; valor: string };

/**
 * Qué tiene que cargar la persona en su proveedor de dominios.
 *
 * El dominio pelado va con una A —un CNAME en la raíz lo prohíbe el DNS— y
 * cualquier subdominio, `www` incluido, va con un CNAME.
 */
export function instruccionesDNS(
  dominio: string,
  deVercel?: { a?: string | null; cname?: string | null },
): Instruccion {
  const d = normalizarDominio(dominio);
  if (esDominioPelado(d)) {
    return { tipo: "A", nombre: "@", valor: deVercel?.a || A_DE_RESPALDO };
  }
  /* El nombre del registro es sólo la parte de adelante: para `www.mitienda.com`
     el proveedor pide "www", no el dominio entero. Cargarlo entero es el error
     más común y deja el registro apuntando a `www.mitienda.com.mitienda.com`. */
  const nombre = d.split(".")[0];
  return { tipo: "CNAME", nombre, valor: deVercel?.cname || CNAME_DE_RESPALDO };
}

/* ── Vercel ─────────────────────────────────────────────────────────────── */

function vercel() {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return null;
  const teamId = process.env.VERCEL_TEAM_ID;
  return {
    token, projectId,
    qs: teamId ? `?teamId=${teamId}` : "",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  };
}

export type AltaEnVercel =
  | { ok: true; yaEstaba: boolean }
  | { ok: false; motivo: string };

/**
 * Suma el dominio al proyecto de Vercel.
 *
 * ⚠️ Esto NO es fail-soft, al revés que el captcha. Si Vercel no lo acepta, el
 * dominio no va a levantar nunca y guardarlo igual en nuestra base deja a la
 * persona esperando frente a un cartel que dice "configurá tu DNS" mientras el
 * problema está de este lado. Es mejor decir que no se pudo.
 */
export async function agregarDominioAVercel(dominio: string): Promise<AltaEnVercel> {
  const v = vercel();
  if (!v) {
    /* ⚠️ En DESARROLLO se deja pasar: acá no hay proyecto de Vercel al que
       sumarlo y bloquear haría imposible probar la pantalla.

       En producción NO. Si falta la variable —o se venció el token— dejar pasar
       guarda dominios que no van a levantar nunca, y lo único que quedaba era
       este `warn` que no lee nadie: la persona se queda mirando un cartel que
       dice "configurá tu DNS" mientras el problema está de este lado. Y encima
       el dominio queda tomado para su dueño legítimo. */
    if (process.env.NODE_ENV === "production") {
      console.error(`[dominio-digital] VERCEL_TOKEN / VERCEL_PROJECT_ID sin configurar en producción — "${dominio}" NO se conectó`);
      return { ok: false, motivo: "No pudimos conectar el dominio en este momento. Escribinos y lo vemos." };
    }
    console.warn(`[dominio-digital] VERCEL_TOKEN / VERCEL_PROJECT_ID sin configurar — "${dominio}" no se sumó al proyecto`);
    return { ok: true, yaEstaba: false };
  }

  try {
    const res = await fetch(`https://api.vercel.com/v10/projects/${v.projectId}/domains${v.qs}`, {
      method: "POST",
      headers: v.headers,
      body: JSON.stringify({ name: dominio }),
      signal: AbortSignal.timeout(15_000),
    });
    const data = await res.json().catch(() => null) as { error?: { code?: string; message?: string } } | null;

    if (res.ok) return { ok: true, yaEstaba: false };

    const code = data?.error?.code ?? "";

    /* Ya estaba en NUESTRO proyecto. Pasa al reintentar después de un corte, o
       si quedó colgado de un alta anterior que falló más adelante. No es un
       error: es exactamente el estado que queríamos. */
    if (code === "domain_already_in_use_by_this_project") {
      return { ok: true, yaEstaba: true };
    }
    if (code === "domain_already_in_use" || res.status === 409) {
      return { ok: false, motivo: "Ese dominio ya está conectado a otro proyecto. Sacalo de ahí primero." };
    }
    if (res.status === 402 || res.status === 403) {
      console.error("[dominio-digital] Vercel rechazó el alta", data);
      return { ok: false, motivo: "No pudimos conectar el dominio en este momento. Escribinos y lo vemos." };
    }

    console.error("[dominio-digital] Vercel: alta fallida", { dominio, status: res.status, data });
    return {
      ok: false,
      motivo: res.status === 400
        ? "Vercel no aceptó ese dominio. Revisá que esté bien escrito."
        : "No pudimos conectar el dominio. Probá de nuevo.",
    };
  } catch (e) {
    console.error("[dominio-digital] Vercel no contestó al dar de alta", { dominio, e });
    return { ok: false, motivo: "No pudimos conectar el dominio en este momento. Probá de nuevo en un rato." };
  }
}

/**
 * Saca el dominio del proyecto de Vercel.
 *
 * Fail-soft al revés que el alta: si esto falla, lo peor que pasa es que quede
 * un dominio de más colgado del proyecto. La persona ya lo desconectó de su
 * producto y no tiene por qué enterarse de nuestro inventario.
 */
export async function quitarDominioDeVercel(dominio: string): Promise<boolean> {
  const v = vercel();
  if (!v) return false;
  try {
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${v.projectId}/domains/${encodeURIComponent(dominio)}${v.qs}`,
      { method: "DELETE", headers: v.headers, signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok && res.status !== 404) {
      console.error("[dominio-digital] Vercel: baja fallida", { dominio, status: res.status });
      return false;
    }
    return true;
  } catch (e) {
    console.error("[dominio-digital] Vercel no contestó al dar de baja", { dominio, e });
    return false;
  }
}

export type EstadoDelDominio = {
  /** Ya apunta acá y el certificado está emitido. */
  andando: boolean;
  /** Lo que hay que cargar en el proveedor del dominio. */
  instruccion: Instruccion;
  /** Un TXT que Vercel pide cuando el dominio está en otra cuenta de Vercel. */
  verificacion: { tipo: string; nombre: string; valor: string } | null;
  /** `false` cuando no pudimos preguntarle a Vercel: no es lo mismo que "mal". */
  pudimosMirar: boolean;
};

/**
 * ¿Ya apunta acá?
 *
 * ⚠️ Se le pregunta a Vercel y no se resuelve el DNS por nuestra cuenta. El DNS
 * puede estar perfecto y el dominio igual no andar —falta el certificado, falta
 * la verificación de propiedad—, y decirle "listo" a alguien cuya página todavía
 * no abre es peor que no decir nada.
 */
export async function estadoDelDominio(dominio: string): Promise<EstadoDelDominio> {
  const d = normalizarDominio(dominio);
  const v = vercel();
  if (!v) {
    return { andando: false, instruccion: instruccionesDNS(d), verificacion: null, pudimosMirar: false };
  }

  try {
    const [rProyecto, rConfig] = await Promise.all([
      fetch(`https://api.vercel.com/v9/projects/${v.projectId}/domains/${encodeURIComponent(d)}${v.qs}`,
        { headers: v.headers, signal: AbortSignal.timeout(10_000) }),
      fetch(`https://api.vercel.com/v6/domains/${encodeURIComponent(d)}/config${v.qs}`,
        { headers: v.headers, signal: AbortSignal.timeout(10_000) }),
    ]);

    const proyecto = rProyecto.ok
      ? await rProyecto.json().catch(() => null) as {
          verified?: boolean;
          verification?: { type?: string; domain?: string; value?: string }[];
        } | null
      : null;
    const config = rConfig.ok
      ? await rConfig.json().catch(() => null) as {
          misconfigured?: boolean;
          recommendedIPv4?: { value?: string[] }[];
          recommendedCNAME?: { value?: string }[];
        } | null
      : null;

    const a = config?.recommendedIPv4?.[0]?.value?.[0] ?? null;
    const cname = config?.recommendedCNAME?.[0]?.value ?? null;

    const pendiente = proyecto?.verification?.[0];

    return {
      /* Las dos cosas: verificado del lado de Vercel Y el DNS bien puesto. Con
         una sola, la página no abre. */
      andando: proyecto?.verified === true && config?.misconfigured === false,
      instruccion: instruccionesDNS(d, { a, cname }),
      verificacion: pendiente?.type && pendiente.domain && pendiente.value
        ? { tipo: pendiente.type.toUpperCase(), nombre: pendiente.domain, valor: pendiente.value }
        : null,
      pudimosMirar: rProyecto.ok || rConfig.ok,
    };
  } catch (e) {
    console.error("[dominio-digital] no se pudo mirar el estado", { dominio: d, e });
    return { andando: false, instruccion: instruccionesDNS(d), verificacion: null, pudimosMirar: false };
  }
}

/* ── El captcha ─────────────────────────────────────────────────────────── */

/**
 * ¿Queda alguien más usando ese apex?
 *
 * Turnstile registra el dominio pelado y con eso cubre todos sus subdominios, así
 * que sacarlo cuando todavía hay otro colgando le apaga los formularios a un
 * tercero. Mira **las dos tablas**: una tienda y un producto pueden compartir el
 * apex sin saberlo.
 */
async function apexSigueEnUso(dominio: string, exceptoProducto: string): Promise<boolean> {
  const apex = normalizarDominio(dominio).replace(/^www\./, "");
  const [tienda, producto] = await Promise.all([
    prisma.store.findFirst({ where: bajoElApex("customDomain", apex), select: { id: true } }),
    prisma.product.findFirst({
      where: { ...bajoElApex("dominioPropio", apex), id: { not: exceptoProducto }, deletedAt: null },
      select: { id: true },
    }),
  ]);
  return Boolean(tienda || producto);
}

/**
 * "Es ese dominio, o cuelga de él."
 *
 * ⚠️ Con `endsWith: "mitienda.com"` a secas, **`evilmitienda.com` también entra**
 * —termina igual, sin el punto—. Del lado del captcha eso sólo deja un hostname
 * de más habilitado; del lado de la reserva rechazaría un dominio legítimo de
 * otra persona diciéndole que ya está en uso. El punto es lo que separa un
 * subdominio de un nombre que apenas se le parece.
 */
function bajoElApex(campo: "customDomain" | "dominioPropio", apex: string) {
  return { OR: [{ [campo]: apex }, { [campo]: { endsWith: `.${apex}` } }] };
}

/**
 * ¿Ese dominio está libre? Mira **las dos** tablas.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ ESTO TIENE QUE PREGUNTARLO **TODO** EL QUE CONECTE UN DOMINIO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Un dominio propio puede ser de una tienda (`Store.customDomain`) o de un
 * producto digital (`Product.dominioPropio`), y son **dos tablas con dos
 * índices únicos distintos**: la base acepta el mismo dominio en las dos sin
 * quejarse. Quien desempata es el middleware, y le da prioridad a la tienda.
 *
 * Encontrado el 05/09/26: el lado de tiendas preguntaba sólo por `Store`, así
 * que alguien podía escribir el dominio de un producto ajeno y **quedarse con
 * la dirección**. Ni siquiera necesitaba el certificado — ya estaba emitido, a
 * nombre de la víctima. Es la página contra la que está pautando.
 *
 * ── Por qué compara el texto tal cual, sin normalizar ──────────────────────
 *
 * Porque lo que decide a dónde va una visita es el `host` de la petición,
 * comparado letra por letra contra lo guardado. Normalizar acá y guardar otra
 * cosa allá haría que este chequeo mire una dirección distinta de la que
 * después va a resolver. Cada lado normaliza como guarda; acá se compara lo
 * que se va a escribir.
 */
export async function dominioLibre(dominio: string, exceptoProducto?: string): Promise<boolean> {
  const [tienda, producto] = await Promise.all([
    prisma.store.findFirst({ where: { customDomain: dominio }, select: { id: true } }),
    /* Sin filtrar por borrado: si un producto borrado todavía lo tiene anotado
       —porque falló el soltarlo—, el índice único lo va a rechazar igual. Decir
       "está en uso" es la verdad; dejarlo pasar es un error más adelante que
       nadie sabe leer. */
    prisma.product.findFirst({
      where: { dominioPropio: dominio, ...(exceptoProducto ? { id: { not: exceptoProducto } } : {}) },
      select: { id: true },
    }),
  ]);
  return !tienda && !producto;
}

/* ── Conectar y desconectar ─────────────────────────────────────────────── */

export type ResultadoDominio =
  | { ok: true; dominio: string }
  | { ok: false; motivo: string };

/**
 * Conectar un dominio a un producto.
 *
 * ⚠️ EL ORDEN IMPORTA Y NO ES CASUAL:
 *
 *   1. Se **reserva en nuestra base**, detrás del candado del nombre. Primero
 *      porque es lo único que puede fallar por carrera: dos personas pidiendo el
 *      mismo dominio a la vez.
 *   2. Se suma a **Vercel**. Si Vercel dice que no, se **deshace la reserva**:
 *      un dominio anotado que nunca va a levantar es peor que ninguno, porque
 *      además lo deja tomado para el que sí es su dueño.
 *   3. Se suma al **captcha**. Esto sí es fail-soft: si Cloudflare no contesta,
 *      el dominio anda igual y lo único que queda flojo es el captcha de esa
 *      página. Bloquear acá sería tirar abajo un alta que ya está buena.
 */
export async function conectarDominio(
  productoId: string,
  pedido: string,
): Promise<ResultadoDominio> {
  const problema = validarDominio(pedido);
  if (problema) return { ok: false, motivo: problema };

  const dominio = normalizarDominio(pedido);

  /* Lo que tenía antes, para poder soltarlo si el alta sale bien. */
  const antes = await prisma.product.findUnique({
    where: { id: productoId },
    select: { dominioPropio: true, store: { select: { ownerId: true } } },
  });
  if (!antes) return { ok: false, motivo: "Ese producto no existe" };

  /* Ya lo tiene puesto: no hay nada que hacer, y rehacer el alta en Vercel por
     un botón apretado dos veces gasta cuota de su API para nada. */
  if (antes.dominioPropio === dominio) return { ok: true, dominio };

  /* ── 1. La reserva ─────────────────────────────────────────────────────── */
  let reservado: ResultadoDominio;
  try {
    reservado = await prisma.$transaction(async (tx) => {
      /* El candado va sobre el DOMINIO. Dos personas peleando por el mismo se
         hacen una después de la otra; dos que piden distinto no se estorban. */
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"dom:" + dominio}))`;

      const [tienda, otro] = await Promise.all([
        tx.store.findFirst({ where: { customDomain: dominio }, select: { id: true } }),
        tx.product.findFirst({
          where: { dominioPropio: dominio, id: { not: productoId } },
          select: { id: true },
        }),
      ]);
      if (tienda || otro) {
        return { ok: false as const, motivo: "Ese dominio ya está conectado en otra cuenta. Si es tuyo, escribinos." };
      }

      /* ⚠️ Y el apex tampoco puede ser de otro. Si alguien conectó
         `mitienda.com`, un tercero no puede tomar `blog.mitienda.com`: Vercel no
         se lo va a dejar levantar igual —el DNS es del dueño— pero acá quedaría
         anotado y bloqueado para el que sí lo controla. Del MISMO dueño sí se
         permite: `mecanica.com` y `tortas.mecanica.com` en dos productos es
         exactamente el caso que Pro compra. */
      const apex = dominio.replace(/^www\./, "");
      const [tiendaApex, productoApex] = await Promise.all([
        tx.store.findFirst({
          where: { ...bajoElApex("customDomain", apex), NOT: { ownerId: antes.store.ownerId } },
          select: { id: true },
        }),
        tx.product.findFirst({
          where: {
            ...bajoElApex("dominioPropio", apex),
            id: { not: productoId },
            deletedAt: null,
            NOT: { store: { ownerId: antes.store.ownerId } },
          },
          select: { id: true },
        }),
      ]);
      if (tiendaApex || productoApex) {
        return { ok: false as const, motivo: "Ese dominio ya está conectado en otra cuenta. Si es tuyo, escribinos." };
      }

      await tx.product.update({ where: { id: productoId }, data: { dominioPropio: dominio } });
      return { ok: true as const, dominio };
    });
  } catch (e) {
    if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002") {
      return { ok: false, motivo: "Ese dominio ya está conectado en otra cuenta. Si es tuyo, escribinos." };
    }
    console.error("[dominio-digital] no se pudo reservar", { productoId, dominio, e });
    return { ok: false, motivo: "No pudimos conectar el dominio. Probá de nuevo." };
  }
  if (!reservado.ok) return reservado;

  /* ── 2. Vercel ─────────────────────────────────────────────────────────── */
  const enVercel = await agregarDominioAVercel(dominio);
  if (!enVercel.ok) {
    /* Se deshace la reserva. Un dominio anotado que no va a levantar deja a la
       persona esperando y encima se lo bloquea a su dueño legítimo. */
    await prisma.product
      .update({ where: { id: productoId }, data: { dominioPropio: antes.dominioPropio } })
      .catch((e) => console.error("[dominio-digital] no se pudo deshacer la reserva", { productoId, e }));
    return { ok: false, motivo: enVercel.motivo };
  }

  /* ── 3. El captcha ─────────────────────────────────────────────────────── */
  await syncTurnstileHostname(dominio, "add");

  /* Y el que tenía antes se suelta: en Vercel para no dejarlo ocupando lugar, y
     en el captcha sólo si no queda nadie más colgando de ese apex. */
  if (antes.dominioPropio) {
    await quitarDominioDeVercel(antes.dominioPropio);
    if (!(await apexSigueEnUso(antes.dominioPropio, productoId))) {
      await syncTurnstileHostname(antes.dominioPropio, "remove");
    }
  }

  return { ok: true, dominio };
}

/** Soltar el dominio: de la base, de Vercel y del captcha. */
export async function desconectarDominio(productoId: string): Promise<boolean> {
  const antes = await prisma.product.findUnique({
    where: { id: productoId },
    select: { dominioPropio: true },
  });
  if (!antes?.dominioPropio) return true;

  await prisma.product.update({ where: { id: productoId }, data: { dominioPropio: null } });

  await quitarDominioDeVercel(antes.dominioPropio);
  if (!(await apexSigueEnUso(antes.dominioPropio, productoId))) {
    await syncTurnstileHostname(antes.dominioPropio, "remove");
  }
  return true;
}

/* ══════════════════════════════════════════════════════════════════════════
   EL DOMINIO CUANDO YA NO HAY PRO
   ══════════════════════════════════════════════════════════════════════════

   Una sola regla para todos los casos, decidida el 14/09/26:

     El dominio se conecta con Pro y VIVE mientras haya Pro. Sin Pro no se
     rompe: REDIRIGE a la dirección de tiendaapps, que nunca se apaga. Se
     suelta de Vercel sólo cuando ya no va a volver.

   Qué pasa en cada caso:

   - **Borra el producto** → se suelta en el acto (`desconectarDominio`, arriba).
   - **Cae a Free** → el dominio queda anotado y redirige (`aDondeRedirige`).
     Los anuncios y los links siguen llegando a la página; lo que pierde es la
     marca propia en la barra, que es exactamente lo que pagaba Pro. Si vuelve
     a Pro, anda solo: no hay que tocar DNS ni esperar certificado.
   - **Lleva DIAS_DE_DOMINIO_EN_FREE en Free** → el cron lo suelta y avisa por
     mail, con un aviso DIAS_DE_AVISO_DEL_DOMINIO antes. Es lo que libera el
     techo de 50 de Vercel sin sacárselo a nadie que lo esté usando.
   - **Da de baja la cuenta** → se sueltan todos los suyos (`soltarLosDominiosDe`).

   Y en la pantalla del dominio se dice todo esto ANTES de conectarlo. */

/* Las dos constantes viven en `configuracion-digital` —sin Prisma— porque la
   pantalla del dominio las dice, y se reexportan desde acá. */
export { DIAS_DE_DOMINIO_EN_FREE, DIAS_DE_AVISO_DEL_DOMINIO };

/**
 * A dónde manda un dominio propio cuando la cuenta no tiene Pro, o `null` si
 * tiene Pro y el dominio contesta él mismo.
 *
 * Pura: la usan la ruta pública (que le contesta al middleware) y la pantalla.
 * Se mira el `tier` y nada más: una Pro en gracia sigue siendo Pro —los días de
 * colchón son con el plan andando—, y una vencida la baja el cron ese mismo
 * día. `slugDigital` puede faltar en un producto muy viejo; ahí se manda a la
 * página por su id, que también anda siempre.
 */
export function aDondeRedirige(
  p: { id: string; slugDigital: string | null },
  tier: string | null | undefined,
): string | null {
  if (tier === "PRO") return null;
  return p.slugDigital
    ? `https://${p.slugDigital}.${dominioDeLaPlataforma()}`
    : `${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.tiendaapps.com"}/p/${p.id}`;
}

/**
 * Los dominios de una cuenta que hay que soltar por llevar mucho en Free, o
 * avisar que se van a soltar. Pura, para probarla: recibe la fecha de la caída
 * y el reloj, y dice en qué momento está.
 *
 *   - `"nada"`: todavía falta, o nunca cayó (`freeDesde` en null: nació Free y
 *     no puede tener dominios, o cayó antes de que existiera la columna).
 *   - `"avisar"`: faltan DIAS_DE_AVISO_DEL_DOMINIO o menos.
 *   - `"soltar"`: ya pasaron los DIAS_DE_DOMINIO_EN_FREE.
 */
export function momentoDelDominio(freeDesde: Date | null, now: Date): "nada" | "avisar" | "soltar" {
  if (!freeDesde) return "nada";
  const dias = (now.getTime() - freeDesde.getTime()) / 86400000;
  if (dias >= DIAS_DE_DOMINIO_EN_FREE) return "soltar";
  if (dias >= DIAS_DE_DOMINIO_EN_FREE - DIAS_DE_AVISO_DEL_DOMINIO) return "avisar";
  return "nada";
}

/** La fecha en que se suelta, para decirla en el aviso. */
export function fechaDeSoltar(freeDesde: Date): Date {
  return new Date(freeDesde.getTime() + DIAS_DE_DOMINIO_EN_FREE * 86400000);
}

/**
 * Suelta todos los dominios propios de una tienda: base, Vercel y captcha, de a
 * uno. Devuelve los que soltó, para el mail. Si uno falla sigue con el resto:
 * un dominio que quedó colgado en Vercel se arregla después y no tiene por qué
 * dejar colgados a los otros cuatro.
 */
export async function soltarLosDominiosDe(storeId: string): Promise<{ productoId: string; dominio: string; name: string }[]> {
  const conDominio = await prisma.product.findMany({
    where: { storeId, dominioPropio: { not: null } },
    select: { id: true, name: true, dominioPropio: true },
  });
  const soltados: { productoId: string; dominio: string; name: string }[] = [];
  for (const p of conDominio) {
    if (!p.dominioPropio) continue;
    try {
      await desconectarDominio(p.id);
      soltados.push({ productoId: p.id, dominio: p.dominioPropio, name: p.name });
    } catch (e) {
      console.error("[dominio-digital] no se pudo soltar el dominio", { productoId: p.id, dominio: p.dominioPropio, e });
    }
  }
  return soltados;
}
