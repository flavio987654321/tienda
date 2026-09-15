import { notFound } from "next/navigation";
import {
  AlertTriangle, Ban, CheckCircle2, Clock, Download, FileText, Mail, Monitor,
  RotateCcw, ShieldCheck, User as Persona, MessageCircle,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { comisionCongelada } from "@/lib/compra-digital";
import { DIAS_DEL_PERMISO } from "@/lib/entrega-digital";
import { mensajeParaElComprador, enlaceDeMail, enlaceDeWhatsApp } from "@/lib/ventas-digitales";
import BotonVolver from "../../BotonVolver";
import BotonCopiar from "../BotonCopiar";
import BotonReenviar from "../BotonReenviar";

/**
 * El detalle de UNA venta.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ES LA CARPETA QUE SE ABRE CUANDO ALGUIEN RECLAMA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── Por qué la lista no alcanzaba ───────────────────────────────────────────
 *
 * La lista contesta "cuánto vendí". Esta pantalla contesta otra cosa, y es la
 * que se necesita el único día que se necesita: **qué pasó exactamente con esta
 * venta**. Hasta acá el sistema guardaba la prueba del art. 1116 —la casilla con
 * fecha, IP y el texto que esa persona leyó— y el registro de cada descarga, y
 * **nadie los podía ver**. Una prueba que no se puede mostrar no es una prueba.
 *
 * Contra un contracargo de Mercado Pago no se gana con la ley: se gana pegando
 * en el formulario de la disputa que el 3 de septiembre a las 14:02, desde tal
 * IP, esa persona aceptó una frase que decía que no iba a poder devolverlo, y
 * que a las 14:03 bajó el archivo. Eso es esta pantalla.
 *
 * ── Por qué no hay paginación acá ───────────────────────────────────────────
 *
 * Porque una venta tiene un techo natural: sus líneas son las que se compraron y
 * las descargas están topeadas en 5 por permiso. El único listado que podría
 * crecer es el de registros, y va con `take`. No es la lista de ventas, que sí
 * crece sin límite y por eso pagina en el servidor.
 *
 * ── Lo que NO muestra, a propósito ──────────────────────────────────────────
 *
 * El enlace de descarga. Quien vende no necesita el token para ayudar a quien
 * compró: para eso está "Reenviar el mail", que va al correo de la venta. Un
 * token a la vista en el panel es un archivo que se puede repartir por fuera del
 * tope, y encima con la cara de quien vendió.
 */

export const dynamic = "force-dynamic";

/* Los ids que puede haber en la dirección: cuid (lo que genera Prisma) o uuid.
   Cualquier otra cosa ni siquiera llega a la base — es el mismo filtro que usa
   la ruta de reenviar. */
const ID_RE = /^(c[a-z0-9]{20,30}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/* Cuántas descargas se listan por permiso. El tope real es 5, así que 25 no se
   alcanza nunca hoy; está por si mañana el tope sube y para que una fila rara no
   dibuje una pantalla de mil renglones. */
const TOPE_REGISTROS = 25;

/* Y cuántos mails de entrega. El botón de reenviar permite 3 por día, así que
   una venta vieja y muy reclamada puede juntar bastantes filas. */
const TOPE_ENVIOS = 20;

const AR_TZ = "America/Argentina/Buenos_Aires";
/* Con la zona escrita a mano, igual que en la lista: el servidor corre en UTC y
   sin esto una venta de las 22:30 se muestra con la fecha del día siguiente.
   Acá pesa el doble, porque estas fechas son la prueba. */
const reloj = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", timeZone: AR_TZ,
});
const conSegundos = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: AR_TZ,
});
const calendario = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit", month: "2-digit", year: "numeric", timeZone: AR_TZ,
});

const plata = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

/**
 * Del `User-Agent` a algo que se entienda.
 *
 * La cadena cruda es ilegible y a la vez es el dato: en un reclamo sirve poder
 * decir "las cinco descargas salieron del mismo navegador". Así que se muestran
 * las dos cosas — el resumen a la vista, la cadena entera abajo — y cuando no se
 * reconoce nada **no se inventa**: se muestra el crudo recortado. Escribir
 * "Chrome" donde no se sabe sería fabricar prueba.
 *
 * El orden importa: Edge y Opera también dicen "Chrome" en su cadena, y Chrome
 * dice "Safari". Preguntando al revés todo termina siendo Chrome.
 */
function navegadorLegible(ua: string | null): { corto: string; crudo: string | null } {
  if (!ua) return { corto: "no quedó registrado", crudo: null };
  const s = ua.toLowerCase();
  const cual =
    s.includes("edg/") ? "Edge"
    : s.includes("opr/") || s.includes("opera") ? "Opera"
    : s.includes("firefox") ? "Firefox"
    : s.includes("chrome") || s.includes("crios") ? "Chrome"
    : s.includes("safari") ? "Safari"
    : null;
  const donde =
    s.includes("iphone") || s.includes("ipad") ? "iPhone o iPad"
    : s.includes("android") ? "Android"
    : s.includes("windows") ? "Windows"
    : s.includes("mac os") || s.includes("macintosh") ? "Mac"
    : s.includes("linux") ? "Linux"
    : null;
  if (!cual && !donde) return { corto: ua.slice(0, 60), crudo: ua };
  return { corto: [cual, donde].filter(Boolean).join(" en "), crudo: ua };
}

export default async function DetalleDeVentaPage({
  params,
}: {
  params: Promise<{ orden: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;

  const { orden: ordenId } = await params;
  if (!ID_RE.test(ordenId)) notFound();

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!store) notFound();

  /* ⚠️ El `storeId` va en el `where`, no en un `if` después de leer. Es la única
     línea que separa esta pantalla de "poné el id de la venta de otro y mirale
     el correo del comprador". Buscando con los dos, una venta ajena no existe:
     no hay nada que filtrar mal más abajo. */
  const orden = await prisma.order.findFirst({
    where: { id: ordenId, storeId: store.id },
    select: {
      id: true,
      status: true,
      total: true,
      createdAt: true,
      lockedCommissionRate: true,
      cuponCodigo: true,
      descuento: true,
      digitalConsentAt: true,
      digitalConsentIp: true,
      digitalConsentTexto: true,
      buyer: { select: { email: true, name: true, phone: true } },
      payment: { select: { provider: true, externalId: true, status: true } },
      statusLogs: {
        orderBy: { changedAt: "desc" },
        take: 10,
        select: { id: true, toStatus: true, changedBy: true, changedAt: true },
      },
      /* Los mails de entrega, con su tope. El botón permite 3 por día, así que
         una venta vieja y muy reclamada puede juntar unas cuantas filas. */
      enviosDigitales: {
        orderBy: { createdAt: "desc" },
        take: TOPE_ENVIOS,
        select: { id: true, motivo: true, estado: true, para: true, createdAt: true },
      },
      items: {
        select: {
          id: true,
          quantity: true,
          price: true,
          lineTotal: true,
          product: { select: { name: true, rolDigital: true, archivoPath: true } },
          descargas: {
            select: {
              id: true,
              descargas: true,
              maxDescargas: true,
              ultimaDescarga: true,
              expiresAt: true,
              _count: { select: { registros: true } },
              registros: {
                orderBy: { createdAt: "desc" },
                take: TOPE_REGISTROS,
                select: { id: true, ip: true, agente: true, createdAt: true },
              },
            },
          },
        },
      },
    },
  });

  if (!orden) notFound();

  const ahora = new Date();
  const cobrada = orden.status === "CONFIRMED";
  const comision = cobrada ? comisionCongelada(orden.total, orden.lockedCommissionRate) : 0;
  const porcentaje = typeof orden.lockedCommissionRate === "number" ? orden.lockedCommissionRate : null;

  /* Una venta cancelada puede serlo por dos motivos muy distintos: nadie la pagó
     nunca, o se pagó y después volvió. Lo segundo es lo que importa, y no está
     en `status` —que dice CANCELLED en los dos casos— sino en el pago y en el
     registro que dejó el webhook. Ver `api/digitales/cobro`. */
  const devuelta = orden.payment?.status === "REFUNDED";
  const contracargo = orden.statusLogs.some((l) => l.changedBy === "digital_contracargo");

  /* ⚠️ "Nunca salió" exige que HAYA filas. Sin ninguna, la venta es anterior al
     registro (03/09/26) y lo único cierto es que no sabemos: afirmar que el mail
     no salió sería inventar un problema en una venta que anduvo bien. */
  const huboFallo = orden.enviosDigitales.some((e) => e.estado === "FALLO");
  const nuncaSalio = orden.enviosDigitales.length > 0
    && !orden.enviosDigitales.some((e) => e.estado === "ENVIADO");

  const chip = cobrada
    ? { Icon: CheckCircle2, texto: "Cobrada", clase: "bg-green-50 panel-oscuro:bg-green-500/10 text-green-700 panel-oscuro:text-green-300" }
    : orden.status === "PENDING"
      ? { Icon: Clock, texto: "Sin pagar", clase: "bg-amber-50 panel-oscuro:bg-amber-500/10 text-amber-700 panel-oscuro:text-amber-300" }
      : devuelta
        ? { Icon: RotateCcw, texto: contracargo ? "Contracargo" : "Devuelta", clase: "bg-red-50 panel-oscuro:bg-red-500/10 text-red-700 panel-oscuro:text-red-300" }
        : { Icon: Ban, texto: "Cancelada", clase: "bg-gray-100 panel-oscuro:bg-gray-800 text-gray-500 panel-oscuro:text-gray-400" };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8">
      <BotonVolver href="/digitales/ventas">Volver a las ventas</BotonVolver>

      {/* ⚠️ ARRIBA DE TODO, y sólo cuando de verdad pasó: alguien pagó y no
          recibió nada. Es lo único de esta pantalla que no puede esperar a que
          se scrollee, porque cada hora que pasa es una hora en la que esa
          persona cree que la estafaron. */}
      {cobrada && nuncaSalio && (
        <p
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-xl border border-red-300 panel-oscuro:border-red-500/40 bg-red-50 panel-oscuro:bg-red-500/10 px-4 py-3 text-[13px] font-semibold text-red-900 panel-oscuro:text-red-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            El mail de entrega de esta venta nunca salió. Quien compró pagó y todavía no tiene su
            archivo — reenviáselo desde el botón de más abajo.
          </span>
        </p>
      )}

      {/* ── Encabezado: estado, fecha e importes ───────────────────────── */}
      <div className="rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${chip.clase}`}>
              <chip.Icon className="h-3 w-3" /> {chip.texto}
            </span>
            <h1 className="mt-2 text-xl font-black text-gray-900 panel-oscuro:text-gray-100">
              Venta del {reloj.format(orden.createdAt)}
            </h1>
            <p className="mt-0.5 text-[12px] text-gray-500 panel-oscuro:text-gray-400">
              hora de Argentina
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-2xl font-black text-gray-900 panel-oscuro:text-gray-100">{plata(orden.total)}</p>
            {/* Con cupón, el total ya viene descontado: esto es la explicación. */}
            {orden.cuponCodigo && orden.descuento > 0 && (
              <p className="mt-0.5 text-[12px] text-gray-500 panel-oscuro:text-gray-400">
                cupón <span className="font-mono font-bold text-gray-700 panel-oscuro:text-gray-300">{orden.cuponCodigo}</span> · −{plata(orden.descuento)}
              </p>
            )}
            {cobrada && comision > 0 && (
              <p className="mt-0.5 text-[12px] text-gray-500 panel-oscuro:text-gray-400">
                te quedó <span className="font-bold text-orange-600">{plata(orden.total - comision)}</span>
              </p>
            )}
          </div>
        </div>

        {cobrada && comision > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 panel-oscuro:border-gray-800 pt-4 text-center">
            <Cifra titulo="Se cobró" valor={plata(orden.total)} />
            <Cifra
              titulo="Comisión"
              /* El menos va pegado con un espacio duro: con uno normal, a 360 px
                 el renglón puede cortar justo ahí y dejar un "−" solo arriba del
                 importe, que se lee como otra cosa. */
              valor={`− ${plata(comision)}`}
              /* El porcentaje se dice, y sale de la orden. Sin esto, alguien que
                 pasó de Free a Pro ve un descuento que no coincide con el plan
                 que tiene hoy y piensa que le cobramos de más. Ver
                 `lockedCommissionRate`. */
              pie={porcentaje ? `${porcentaje}% de tu plan de ese día` : undefined}
            />
            <Cifra titulo="Te quedó" valor={plata(orden.total - comision)} fuerte />
          </div>
        )}

        {devuelta && (
          /* La promesa escrita antes de cobrar el primer peso, dicha justo donde
             se vuelve real. Ver la sección de devoluciones del plan. */
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-gray-50 panel-oscuro:bg-gray-800/50 px-3.5 py-2.5 text-[12.5px] text-gray-700 panel-oscuro:text-gray-300">
            <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {contracargo
                ? "Esta venta terminó en un contracargo: la tarjeta le devolvió la plata a quien compró."
                : "Esta venta se devolvió."}{" "}
              <strong className="font-bold">Nuestra comisión se devuelve entera</strong> — de una venta que se
              deshizo no nos quedamos con nada. Y le cortamos las descargas que le quedaban.
            </span>
          </p>
        )}
      </div>

      {/* ── Quién compró ───────────────────────────────────────────────── */}
      <Bloque titulo="Quién compró" Icon={Persona}>
        <Fila etiqueta="Correo">
          {/* `break-all`: hay direcciones larguísimas sin un espacio, y a 360 px
              son las que empujan la tarjeta fuera de la pantalla. */}
          <span className="break-all font-semibold text-gray-900 panel-oscuro:text-gray-100">
            {orden.buyer.email || "sin correo"}
          </span>
        </Fila>
        {orden.buyer.name && <Fila etiqueta="Nombre">{orden.buyer.name}</Fila>}
        {orden.buyer.phone && <Fila etiqueta="Teléfono">{orden.buyer.phone}</Fila>}
        {/* Escribirle, con el mensaje ya escrito: distinto si bajó el archivo o
            no. Sólo en una cobrada: a quien no pagó no hay nada que preguntarle.
            Abre su correo con el borrador; no manda nada solo. */}
        {cobrada && orden.buyer.email && (() => {
          const principal = orden.items.find((i) => i.product.rolDigital === "PRINCIPAL") ?? orden.items[0];
          const sinBajar = orden.items.some((i) => i.descargas[0] && i.descargas[0].descargas === 0);
          const mensaje = mensajeParaElComprador({ nombre: orden.buyer.name, producto: principal?.product.name ?? "tu compra", sinBajar });
          const wa = enlaceDeWhatsApp(orden.buyer.phone, mensaje);
          const clase = "inline-flex items-center gap-1.5 rounded-lg border border-gray-200 panel-oscuro:border-gray-700 px-3 py-1.5 text-[12.5px] font-semibold text-gray-600 panel-oscuro:text-gray-300 transition-colors hover:border-orange-300 hover:text-orange-600";
          return (
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={enlaceDeMail(orden.buyer.email, mensaje)} className={clase}><Mail className="h-3.5 w-3.5" /> Escribirle</a>
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={clase}><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>}
            </div>
          );
        })()}
      </Bloque>

      {/* ── Qué se llevó, y si lo bajó ─────────────────────────────────── */}
      <Bloque titulo="Qué se llevó" Icon={FileText}>
        <div className="space-y-4">
          {orden.items.map((i) => {
            /* `descargas` llega como lista porque así lo declara el esquema,
               pero `orderItemId` es único: viene uno o ninguno. */
            const permiso = i.descargas[0];
            const vencido = permiso ? permiso.expiresAt <= ahora : false;
            const agotado = permiso ? permiso.descargas >= permiso.maxDescargas : false;
            return (
              <div key={i.id} className="rounded-xl border border-gray-100 panel-oscuro:border-gray-800 p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <p className="min-w-0 flex-1 text-[13.5px] font-semibold text-gray-900 panel-oscuro:text-gray-100">
                    {i.product.name}
                    {i.product.rolDigital === "BONO" && <Etiqueta>bono</Etiqueta>}
                    {i.product.rolDigital === "UPSELL" && <Etiqueta>upsell</Etiqueta>}
                  </p>
                  <p className="shrink-0 text-[13px] text-gray-500 panel-oscuro:text-gray-400">
                    {plata(i.lineTotal ?? i.price * i.quantity)}
                  </p>
                </div>

                {!permiso ? (
                  <p className="mt-2 text-[12px] text-gray-500 panel-oscuro:text-gray-400">
                    {/* No se dice "0 de 5" donde no hay permiso: sería afirmar
                        que hay un archivo esperando. Las dos razones posibles se
                        nombran, porque lo que hay que hacer es distinto. */}
                    {i.product.archivoPath
                      ? "Todavía no se generó el permiso de descarga — pasa mientras la venta no está cobrada."
                      : "Este ítem no tiene archivo para bajar."}
                  </p>
                ) : (
                  <>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-gray-600 panel-oscuro:text-gray-300">
                      <span className="inline-flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {permiso.descargas} de {permiso.maxDescargas} descargas
                      </span>
                      <span className={vencido ? "text-gray-400" : ""}>
                        {vencido
                          ? `el enlace venció el ${calendario.format(permiso.expiresAt)}`
                          : `el enlace vence el ${calendario.format(permiso.expiresAt)}`}
                      </span>
                    </div>

                    {permiso.descargas === 0 && !vencido && (
                      <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 panel-oscuro:bg-amber-500/10 px-3 py-2 text-[12px] text-amber-900 panel-oscuro:text-amber-200">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          Nunca lo bajó. Suele ser el mail que se fue a spam: reenviáselo desde el botón de
                          abajo.
                        </span>
                      </p>
                    )}

                    {agotado && (
                      <p className="mt-2 text-[12px] text-gray-500 panel-oscuro:text-gray-400">
                        Usó las {permiso.maxDescargas} descargas. Reenviar el mail no suma más:
                        el tope está para que el enlace no se reparta.
                      </p>
                    )}

                    {/* ── El registro, una fila por descarga ───────────── */}
                    {permiso.registros.length > 0 && (
                      <div className="mt-3 border-t border-gray-100 panel-oscuro:border-gray-800 pt-3">
                        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-500 panel-oscuro:text-gray-400">
                          Cada descarga
                        </p>
                        <ul className="space-y-2">
                          {permiso.registros.map((r) => {
                            const nav = navegadorLegible(r.agente);
                            return (
                              <li key={r.id} className="text-[12px] text-gray-600 panel-oscuro:text-gray-300">
                                <span className="font-semibold text-gray-900 panel-oscuro:text-gray-100">
                                  {conSegundos.format(r.createdAt)}
                                </span>
                                <span className="mx-1.5 text-gray-300">·</span>
                                <span className="inline-flex items-center gap-1">
                                  <Monitor className="h-3 w-3" />
                                  {nav.corto}
                                </span>
                                {r.ip && (
                                  <>
                                    <span className="mx-1.5 text-gray-300">·</span>
                                    <span className="break-all">IP {r.ip}</span>
                                  </>
                                )}
                                {nav.crudo && (
                                  /* La cadena entera, plegada. Sirve para pegarla
                                     en un reclamo, y no puede ocupar la pantalla
                                     de quien sólo quiere ver si lo bajó. */
                                  <details className="mt-0.5">
                                    <summary className="cursor-pointer text-[11px] text-gray-400 hover:text-orange-600">
                                      ver el navegador completo
                                    </summary>
                                    <p className="mt-1 break-all rounded bg-gray-50 panel-oscuro:bg-gray-800 p-2 font-mono text-[10.5px] text-gray-500 panel-oscuro:text-gray-400">
                                      {nav.crudo}
                                    </p>
                                  </details>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                        {permiso._count.registros > permiso.registros.length && (
                          <p className="mt-2 text-[11px] text-gray-400">
                            Se muestran las últimas {permiso.registros.length} de {permiso._count.registros}.
                          </p>
                        )}
                      </div>
                    )}

                    {permiso.descargas > 0 && permiso.registros.length === 0 && (
                      /* Pasa con las ventas anteriores al 03/09/26, que es cuando
                         empezó a anotarse. Se dice, en vez de dibujar un hueco que
                         parece un error. */
                      <p className="mt-3 border-t border-gray-100 panel-oscuro:border-gray-800 pt-3 text-[12px] text-gray-500 panel-oscuro:text-gray-400">
                        Esta venta es anterior al registro de descargas, así que sabemos que lo bajó
                        {permiso.ultimaDescarga ? ` (la última vez el ${calendario.format(permiso.ultimaDescarga)})` : ""},
                        pero no desde dónde.
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {cobrada && (
          <div className="mt-4 border-t border-gray-100 panel-oscuro:border-gray-800 pt-4">
            <BotonReenviar ordenId={orden.id} refrescar />
            <p className="mt-2 text-[11.5px] text-gray-500 panel-oscuro:text-gray-400">
              Va al correo de esta venta. Si el enlace ya venció, se lo renovamos por {DIAS_DEL_PERMISO} días
              más; las descargas usadas no vuelven.
            </p>
          </div>
        )}
      </Bloque>

      {/* ── Los mails que salieron, y los que no ───────────────────────── */}
      <Bloque titulo="Los mails de entrega" Icon={Mail}>
        {orden.enviosDigitales.length === 0 ? (
          <p className="text-[12.5px] text-gray-500 panel-oscuro:text-gray-400">
            {cobrada
              /* Con la venta cobrada y sin filas, lo único cierto es que es
                 anterior al registro. Decir "no se mandó" sería afirmar algo que
                 no sabemos. */
              ? "Esta venta es anterior al registro de envíos (3 de septiembre de 2026), así que no sabemos"
                + " qué pasó con su mail. Si quien compró dice que no le llegó, reenviáselo desde arriba."
              : "Todavía no salió ningún mail: la entrega se manda cuando el pago se acredita."}
          </p>
        ) : (
          <ul className="space-y-2">
            {orden.enviosDigitales.map((e) => {
              const salio = e.estado === "ENVIADO";
              return (
                <li key={e.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[12px]">
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                    salio
                      ? "bg-green-50 panel-oscuro:bg-green-500/10 text-green-700 panel-oscuro:text-green-300"
                      : "bg-red-50 panel-oscuro:bg-red-500/10 text-red-700 panel-oscuro:text-red-300"
                  }`}>
                    {salio ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                    {salio ? "Salió" : "No salió"}
                  </span>
                  <span className="font-semibold text-gray-900 panel-oscuro:text-gray-100">
                    {conSegundos.format(e.createdAt)}
                  </span>
                  <span className="text-gray-500 panel-oscuro:text-gray-400">
                    {e.motivo === "REENVIO" ? "reenviado a mano" : "entrega automática"}
                  </span>
                  {e.para && <span className="break-all text-gray-400">→ {e.para}</span>}
                </li>
              );
            })}
          </ul>
        )}

        {/* ⚠️ El motivo técnico del fallo NO se muestra. Quien vende no puede
            hacer nada con "domain not verified" y puede traer datos de nuestra
            cuenta de Resend; queda guardado en la fila, que es donde sirve. Lo
            que sí se dice es qué hacer. */}
        {huboFallo && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 panel-oscuro:bg-red-500/10 border border-red-200 panel-oscuro:border-red-500/25 px-3.5 py-2.5 text-[12.5px] text-red-900 panel-oscuro:text-red-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {nuncaSalio
                ? "Ninguno de los mails de esta venta llegó a salir. Quien compró pagó y no tiene nada:"
                  + " reenviáselo desde arriba, y si vuelve a fallar avisanos."
                : "Alguno de los intentos falló, pero después salió al menos uno. Si quien compró igual"
                  + " dice que no le llegó, suele estar en spam."}
            </span>
          </p>
        )}
      </Bloque>

      {/* ── La prueba del art. 1116 ────────────────────────────────────── */}
      <Bloque titulo="Qué aceptó antes de pagar" Icon={ShieldCheck}>
        {orden.digitalConsentAt && orden.digitalConsentTexto ? (
          <>
            <p className="text-[12.5px] text-gray-600 panel-oscuro:text-gray-300">
              Marcó la casilla el{" "}
              <strong className="font-bold text-gray-900 panel-oscuro:text-gray-100">
                {conSegundos.format(orden.digitalConsentAt)}
              </strong>
              {orden.digitalConsentIp && <> desde la IP <strong className="font-bold">{orden.digitalConsentIp}</strong></>}.
            </p>
            {/* El texto EXACTO que esa persona leyó, guardado con la venta. Si
                mañana se cambia la redacción, ésta sigue mostrando la de su día:
                por eso se guarda el texto entero y no un `true`. */}
            <blockquote className="mt-3 rounded-xl border-l-4 border-orange-400 bg-orange-50/60 panel-oscuro:bg-orange-500/10 px-4 py-3 text-[12.5px] italic leading-relaxed text-gray-700 panel-oscuro:text-gray-300">
              {orden.digitalConsentTexto}
            </blockquote>
            <p className="mt-3 text-[11.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
              Esto es lo que se muestra si alguien reclama una devolución de un archivo que ya bajó: la
              fecha, desde dónde, y la frase que tenía delante cuando apretó pagar. Junto con el registro
              de descargas de arriba, es lo que se pega en una disputa de Mercado Pago.
            </p>
          </>
        ) : (
          <p className="text-[12.5px] text-gray-500 panel-oscuro:text-gray-400">
            Esta venta no tiene guardada la aceptación. Pasa con las compras anteriores al 3 de septiembre
            de 2026, que es cuando se agregó la casilla. De acá en adelante queda en todas.
          </p>
        )}
      </Bloque>

      {/* ── Los números que se piden en un reclamo ─────────────────────── */}
      <Bloque titulo="Para un reclamo" Icon={FileText}>
        <Identificador etiqueta="Número de la venta" valor={orden.id} que="el número de la venta" />
        {orden.payment?.externalId ? (
          <Identificador
            etiqueta={`Número del pago en ${orden.payment.provider === "mercadopago" ? "Mercado Pago" : orden.payment.provider}`}
            valor={orden.payment.externalId}
            que="el número del pago"
          />
        ) : (
          <p className="mt-2 text-[12px] text-gray-500 panel-oscuro:text-gray-400">
            Todavía no hay número de pago: aparece cuando el cobro se acredita.
          </p>
        )}

        {orden.statusLogs.length > 0 && (
          <div className="mt-4 border-t border-gray-100 panel-oscuro:border-gray-800 pt-3">
            <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-500 panel-oscuro:text-gray-400">
              Qué le fue pasando
            </p>
            <ul className="space-y-1">
              {orden.statusLogs.map((l) => (
                <li key={l.id} className="text-[12px] text-gray-600 panel-oscuro:text-gray-300">
                  <span className="text-gray-400">{reloj.format(l.changedAt)}</span>
                  <span className="mx-1.5 text-gray-300">·</span>
                  {motivoLegible(l.changedBy, l.toStatus)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Bloque>
    </div>
  );
}

/**
 * De la marca que deja el webhook a una frase.
 *
 * `changedBy` lo escribe el código, no una persona, así que las tres que
 * conocemos se traducen y **cualquier otra se muestra tal cual**: inventar una
 * frase para una marca que no se conoce es tapar información en la única
 * pantalla donde importa que esté completa.
 */
function motivoLegible(quien: string, aEstado: string): string {
  if (quien === "digital_devolucion") return "Se devolvió la plata, y le cortamos las descargas.";
  if (quien === "digital_contracargo") return "Contracargo de la tarjeta, y le cortamos las descargas.";
  if (quien === "digital_cobro") return "Se acreditó el pago y salió el mail con el archivo.";
  return `Pasó a ${aEstado} (${quien}).`;
}

function Bloque({ titulo, Icon, children }: {
  titulo: string;
  Icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-4 sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-black uppercase tracking-wider text-gray-500 panel-oscuro:text-gray-400">
        <Icon className="h-3.5 w-3.5" />
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px] text-gray-700 panel-oscuro:text-gray-300">
      <span className="text-[11.5px] text-gray-500 panel-oscuro:text-gray-400">{etiqueta}:</span>
      <span className="min-w-0">{children}</span>
    </p>
  );
}

function Cifra({ titulo, valor, pie, fuerte }: {
  titulo: string; valor: string; pie?: string; fuerte?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 panel-oscuro:text-gray-400">{titulo}</p>
      {/* `break-words`: un importe de siete cifras a 360 px se sale de su celda y
          empuja la grilla entera. */}
      <p className={`mt-0.5 break-words text-[15px] font-black leading-tight ${
        fuerte ? "text-orange-600" : "text-gray-900 panel-oscuro:text-gray-100"
      }`}>
        {valor}
      </p>
      {pie && <p className="mt-0.5 text-[10.5px] leading-tight text-gray-400">{pie}</p>}
    </div>
  );
}

function Identificador({ etiqueta, valor, que }: { etiqueta: string; valor: string; que: string }) {
  return (
    <div className="mt-2 first:mt-0">
      <p className="text-[11.5px] text-gray-500 panel-oscuro:text-gray-400">{etiqueta}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {/* El valor a la vista y no sólo en el botón: si el portapapeles falla
            —pasa fuera de HTTPS— tiene que poder copiarse a mano. */}
        <code className="min-w-0 break-all rounded bg-gray-50 panel-oscuro:bg-gray-800 px-2 py-1 font-mono text-[11.5px] text-gray-700 panel-oscuro:text-gray-300">
          {valor}
        </code>
        <BotonCopiar valor={valor} que={que} />
      </div>
    </div>
  );
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1.5 rounded bg-gray-100 panel-oscuro:bg-gray-800 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-gray-500 panel-oscuro:text-gray-400">
      {children}
    </span>
  );
}
