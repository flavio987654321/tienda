import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { CLAVES_DIGITALES, CAMPOS_DE_POLITICA, limpiarTextoLegal } from "@/lib/politicas-tienda";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  normalizarSlug, validarSlug, validarNombre, validarCheckoutName, validarEmail,
  validarContextoIA, logoValido,
  LARGO_NOMBRE, LARGO_CHECKOUT, LARGO_EMAIL, LARGO_IA_PRODUCTO, LARGO_IA_DESCRIPCION,
} from "@/lib/configuracion-digital";
import { estaLibre } from "@/lib/direccion-digital";
import { validarGaId, validarPixelId, validarClarityId, extraerClarityId } from "@/lib/tracking-ids";
import { mergeAnalytics, mergeTransferencia } from "@/lib/store-config";
import {
  validarTransferencia, soloDigitos,
  LARGO_TITULAR, LARGO_BANCO, LARGO_INSTRUCCIONES,
} from "@/lib/datos-bancarios";
import { TRANSFERENCIA_DIGITAL } from "@/lib/planLimits";
import type { TierDigital } from "@/lib/planes-digitales";
import { limpiarTexto } from "@/lib/texto-limpio";
import { espacioDigital } from "@/lib/espacio-digital";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Los textos se recortan y limpian del lado del SERVIDOR aunque la pantalla ya
   tenga `maxLength`: el `maxLength` es del navegador, y el navegador no es
   quien manda el pedido. Sin esto, una descripción de un millón de caracteres
   entra a la base y después viaja en cada pedido a la IA. */

/**
 * Guardar la configuración del negocio de una cuenta digital.
 *
 * Es un PATCH **parcial**: sólo se escribe lo que vino. Cada sección de la
 * pantalla se guarda sola, y un POST del objeto entero haría que guardar el
 * contexto de la IA reescribiera el nombre y el logo con lo que la pantalla tuviera
 * cargado — que puede estar viejo si la persona dejó la pestaña abierta.
 *
 * Los frenos, en orden:
 *
 *   1. Sesión y **rol DIGITAL**.
 *   2. Tope de intentos.
 *   3. Cada campo con la MISMA función que usa la pantalla.
 *   4. **La dirección, contra las demás cuentas.** Es única en toda la tabla:
 *      sin comprobarlo antes sale un error de base que nadie sabe leer, y hay
 *      una carrera —dos personas pidiendo la misma a la vez— que se atrapa
 *      igual por el código de Prisma.
 */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }

  try {
    if (!(await checkRateLimit(`digital-config:${user.id}`, 40, 60 * 60 * 1000))) {
      return NextResponse.json({ error: "Demasiados cambios seguidos. Esperá un momento." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /digitales/configuracion");
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const {
    nombre, slug, logo, checkoutName, supportEmail, iaProducto, iaDescripcion,
    gaId, pixelId, clarityId, transferencia, politicas,
  } = body as Record<string, unknown>;

  /* Nada que escribir. Sin esto, un pedido vacío devolvería ok y crearía el
     espacio de la cuenta de gorra. */
  const vino = [
    nombre, slug, logo, checkoutName, supportEmail, iaProducto, iaDescripcion,
    gaId, pixelId, clarityId, transferencia, politicas,
  ];
  if (vino.every((v) => v === undefined)) {
    return NextResponse.json({ error: "No mandaste nada para guardar" }, { status: 400 });
  }

  if (nombre !== undefined) {
    const problema = validarNombre(nombre);
    if (problema) return NextResponse.json({ error: problema }, { status: 400 });
  }

  if (checkoutName !== undefined && checkoutName !== null) {
    const problema = validarCheckoutName(checkoutName);
    if (problema) return NextResponse.json({ error: problema }, { status: 400 });
  }

  /* El mail de soporte va adentro del mail de entrega: es la única forma que
     tiene de reclamar alguien que pagó y no recibió el archivo. Si acá entra
     cualquier cosa, esa persona se queda sin puerta. */
  if (supportEmail !== undefined && supportEmail !== null) {
    const problema = validarEmail(supportEmail);
    if (problema) return NextResponse.json({ error: problema }, { status: 400 });
  }

  if (iaProducto !== undefined || iaDescripcion !== undefined) {
    const problema = validarContextoIA({ producto: iaProducto, descripcion: iaDescripcion });
    if (problema) return NextResponse.json({ error: problema }, { status: 400 });
  }

  /* ⚠️ Los IDs de medición terminan interpolados LITERALMENTE adentro de un
     `<script>` de una página pública. La validación es la misma que aplica el
     componente que los inyecta —importada, no copiada— porque si acá entrara
     algo que allá no, quedaría guardado esperando el día que alguien afloje el
     otro lado. */
  if (gaId !== undefined) {
    const problema = validarGaId(gaId);
    if (problema) return NextResponse.json({ error: problema }, { status: 400 });
  }
  if (pixelId !== undefined) {
    const problema = validarPixelId(pixelId);
    if (problema) return NextResponse.json({ error: problema }, { status: 400 });
  }
  if (clarityId !== undefined) {
    const problema = validarClarityId(clarityId);
    if (problema) return NextResponse.json({ error: problema }, { status: 400 });
  }

  /* ⚠️ TRANSFERENCIA — EL CANDADO DEL PLAN
   *
   * Free no puede prenderla, y el chequeo va acá adentro y no sólo en la
   * pantalla: la pantalla dibuja un botón apagado, y un botón apagado es una
   * cortesía, no un permiso. Este pedido se puede armar a mano.
   *
   * Y no es una función recortada para empujar a pagar. Free no cobra abono: lo
   * único que deja es el 8% que se retiene solo adentro del cobro de Mercado
   * Pago. En una transferencia no pasa un peso por la plataforma, así que no hay
   * de dónde retener. Un Free con transferencia prendida no paga nada por nada.
   *
   * El plan se lee de la BASE y no de lo que diga el navegador. */
  let transferenciaLimpia: Record<string, unknown> | undefined;
  if (transferencia !== undefined) {
    if (!transferencia || typeof transferencia !== "object") {
      return NextResponse.json({ error: "Datos de transferencia inválidos" }, { status: 400 });
    }
    const t = transferencia as Record<string, unknown>;

    const problema = validarTransferencia(t);
    if (problema) return NextResponse.json({ error: problema }, { status: 400 });

    if (t.enabled) {
      const sub = await prisma.subscription.findUnique({
        where: { userId: user.id },
        select: { tier: true },
      });
      const tier = (sub?.tier ?? "FREE") as TierDigital;
      if (!TRANSFERENCIA_DIGITAL[tier]) {
        return NextResponse.json(
          { error: "El plan Free cobra sólo con Mercado Pago. Pasá a Starter o Pro para cobrar por transferencia." },
          { status: 409 }
        );
      }
    }

    transferenciaLimpia = {
      enabled: Boolean(t.enabled),
      titular: limpiarTexto(t.titular, LARGO_TITULAR) ?? "",
      // Se guarda sólo con números aunque se haya escrito con espacios o guiones.
      cbu: typeof t.cbu === "string" ? soloDigitos(t.cbu).slice(0, 22) : "",
      alias: limpiarTexto(t.alias, 20) ?? "",
      banco: limpiarTexto(t.banco, LARGO_BANCO) ?? "",
      instrucciones: limpiarTexto(t.instrucciones, LARGO_INSTRUCCIONES) ?? "",
    };
  }

  let slugNuevo: string | null = null;
  if (slug !== undefined) {
    const problema = validarSlug(slug);
    if (problema) return NextResponse.json({ error: problema }, { status: 400 });
    slugNuevo = normalizarSlug(slug as string);
  }

  const espacio = await espacioDigital(user.id);
  if ("error" in espacio) return NextResponse.json({ error: espacio.error }, { status: 409 });

  /* La dirección se comprueba contra TODAS las tiendas —no sólo las digitales—
     y también contra los productos digitales, que viven en el mismo
     `<nombre>.tiendaapps.com`. Se excluye la propia: volver a guardar la que ya
     tenías no puede fallar.

     ⚠️ Miraba sólo `Store` y por eso se rompía en silencio: son dos tablas con
     dos índices únicos distintos, así que la base aceptaba el mismo nombre en
     las dos y el middleware desempataba a favor de la tienda. Cambiar acá la
     dirección del espacio le sacaba el subdominio a un producto que ya lo tenía
     —incluso a un producto propio—. Ver `lib/direccion-digital`. */
  if (slugNuevo && !(await estaLibre(slugNuevo, undefined, espacio.storeId))) {
    return NextResponse.json({ error: "Esa dirección ya está usada. Probá con otra." }, { status: 409 });
  }

  /* Los IDs de medición viven adentro de `storeConfig`, que es un JSON con TODO
     lo demás: el diseño, los cobros, los envíos. Así que hay que leerlo y
     mezclar en vez de escribir el objeto entero — desde acá no conocemos el
     resto y lo borraríamos sin enterarnos. Sólo se lee si hace falta. */
  let configNueva: string | undefined;
  if (gaId !== undefined || pixelId !== undefined || clarityId !== undefined || transferenciaLimpia) {
    const actual = await prisma.store.findUnique({
      where: { id: espacio.storeId },
      select: { storeConfig: true },
    });
    configNueva = actual?.storeConfig ?? "{}";
    if (gaId !== undefined || pixelId !== undefined || clarityId !== undefined) {
      configNueva = mergeAnalytics(configNueva, {
        ...(gaId !== undefined ? { googleAnalyticsId: String(gaId) } : {}),
        ...(pixelId !== undefined ? { facebookPixelId: String(pixelId) } : {}),
        /* Se guarda el ID SOLO, aunque hayan pegado el script entero: Clarity no
           te muestra el ID pelado en ningún lado cómodo, así que lo sacamos
           nosotros en vez de pedirle a alguien que lo busque a mano. */
        ...(clarityId !== undefined ? { clarityProjectId: extraerClarityId(String(clarityId)) } : {}),
      });
    }
    /* Se encadena sobre el resultado anterior y no sobre `actual`: si vinieran
       las dos cosas en el mismo pedido, mezclar cada una por su lado y quedarse
       con la última tiraría la otra. */
    if (transferenciaLimpia) {
      configNueva = mergeTransferencia(configNueva, transferenciaLimpia);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     LAS POLÍTICAS DE QUIEN VENDE
     ══════════════════════════════════════════════════════════════════════

     ⚠️ Hasta el 03/09/26 esto no existía, y el agujero no era que faltara: el
     pie de cada página de venta linkeaba a `/terminos` y `/privacidad`, o sea a
     LOS DOCUMENTOS DE LA PLATAFORMA. Quien compraba un ebook leía nuestros
     términos creyendo que eran los de quien se lo vendía — y eso contradice de
     frente lo que esos mismos términos dicen ("TiendaApps no es parte de esa
     relación de consumo"). En tiendas nunca pasó: cada dueña escribe las suyas.

     Son TRES y no las cuatro de tiendas: no hay envíos que declarar. Ver
     `CLAVES_DIGITALES`.

     Las columnas son las mismas de `Store` y el limpiador es el mismo
     (`limpiarTextoLegal`, que corta a 6000 y normaliza los saltos de Windows):
     una sola regla para los dos ecosistemas, en vez de una copia que se
     desincroniza. */
  const politicasLimpias: Record<string, string | boolean> = {};
  if (politicas !== undefined) {
    if (typeof politicas !== "object" || politicas === null || Array.isArray(politicas)) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    const p = politicas as Record<string, unknown>;
    for (const clave of CLAVES_DIGITALES) {
      const campo = CAMPOS_DE_POLITICA[clave];
      if (p[clave] !== undefined) politicasLimpias[campo.texto] = limpiarTextoLegal(p[clave]);
      /* La bandera se compara contra `true` exacto. Llega del navegador, y
         `"false"` es verdadero en JavaScript: sin esto, apagar una política
         desde un cliente mal escrito la dejaba prendida. */
      const visible = p[`${clave}Visible`];
      if (visible !== undefined) politicasLimpias[campo.activa] = visible === true;
    }
    if (Object.keys(politicasLimpias).length === 0) {
      return NextResponse.json({ error: "No mandaste ninguna política" }, { status: 400 });
    }
  }

  try {
    await prisma.store.update({
      where: { id: espacio.storeId },
      data: {
        ...politicasLimpias,
        /* La fecha que la página pública muestra como "última actualización".
           Se toca sólo si de verdad vino una política: sin esta condición,
           guardar el nombre de la marca haría figurar que los términos
           cambiaron ese día, y eso es una afirmación sobre un documento legal. */
        ...(Object.keys(politicasLimpias).length > 0 ? { policiesUpdatedAt: new Date() } : {}),
        // `undefined` en Prisma es "no lo toques": sólo se escribe lo que vino.
        ...(typeof nombre === "string" ? { name: limpiarTexto(nombre, LARGO_NOMBRE) ?? "" } : {}),
        ...(slugNuevo ? { slug: slugNuevo } : {}),
        /* `null` saca el logo; una dirección ajena se ignora en silencio en vez
           de guardarse. Ver `logoValido`. */
        ...(logo === null ? { logo: null } : logoValido(logo) ? { logo: logo as string } : {}),
        /* Los cuatro guardan `null` cuando llegan vacíos, en vez de una cadena
           vacía. No es lo mismo: `null` es "no lo definió" y lo entiende el
           resto del sistema —el checkout cae al nombre de la marca, la IA sabe
           que todavía no tiene nicho—; una cadena vacía es un valor puesto, y
           pasa cualquier chequeo de "¿está cargado?" sin decir nada. */
        ...(checkoutName !== undefined
          ? { checkoutName: limpiarTexto(checkoutName, LARGO_CHECKOUT) }
          : {}),
        ...(supportEmail !== undefined
          ? {
              // En minúsculas: los correos no distinguen mayúsculas y guardarlo
              // como se escribió deja dos filas distintas para la misma persona.
              supportEmail: limpiarTexto(
                typeof supportEmail === "string" ? supportEmail.toLowerCase() : supportEmail,
                LARGO_EMAIL
              ),
            }
          : {}),
        ...(iaProducto !== undefined
          ? { iaProducto: limpiarTexto(iaProducto, LARGO_IA_PRODUCTO) }
          : {}),
        ...(iaDescripcion !== undefined
          ? { iaDescripcion: limpiarTexto(iaDescripcion, LARGO_IA_DESCRIPCION) }
          : {}),
        ...(configNueva !== undefined ? { storeConfig: configNueva } : {}),
      },
    });
  } catch (e) {
    /* La carrera: dos cuentas pidiendo la misma dirección en el mismo instante
       pasan las dos el chequeo de arriba y una de las dos choca acá. Prisma lo
       marca con P2002 (índice único). Sin este catch, la segunda persona ve un
       error de base sin explicación. */
    if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Esa dirección ya está usada. Probá con otra." }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true, slug: slugNuevo ?? undefined });
}
