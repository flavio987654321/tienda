import Link from "next/link";
import { ShoppingCart, Clock, Lock, ArrowRight, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { carritosDeLaCuenta, haceCuanto, MADURACION_MS } from "@/lib/carritos-digitales";
import type { TierDigital } from "@/lib/planes-digitales";
import BotonVolver from "../BotonVolver";
import CarritosClient from "./CarritosClient";

/**
 * Los carritos abandonados.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ES LA PANTALLA QUE MUESTRA PLATA QUE EXISTE Y NO SE COBRÓ
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Y por eso se ve en los TRES planes, aunque el mail automático sea de Pro. Está
 * decidido en el documento y sale de un comentario del propio código de topes:
 * *"se limita lo que la dueña crea, no lo que le pasa"*. Los carritos los generan
 * sus clientes: ponerles tope sería cobrarle por tener tráfico, y encima
 * escondiéndole la función que sirve para recuperar esas ventas.
 *
 * Ver la lista es ver lo que te pasó. El mail automático es trabajo del sistema
 * —cron, envío y plata nuestra— y eso sí se cobra.
 *
 * ⚠️ Y es el mejor argumento de venta que tenemos, sin mentirle a nadie: alguien
 * en Free entra, ve "$51.000 sin cobrar" y el botón de recuperar apagado. Es
 * plata suya de verdad. Por eso el bloque de Pro va ABAJO de la lista y no
 * arriba: primero lo que es suyo, después lo que le podemos vender.
 */

export const dynamic = "force-dynamic";

const plata = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export default async function CarritosPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;

  const [store, sub] = await Promise.all([
    prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true, name: true } }),
    prisma.subscription.findUnique({ where: { userId: user.id }, select: { tier: true } }),
  ]);

  const esPro = ((sub?.tier ?? "FREE") as TierDigital) === "PRO";
  const ahora = new Date();
  const foto = store
    ? await carritosDeLaCuenta(store.id, ahora)
    : { carritos: [], sinCobrar: 0, enCamino: 0 };

  const cuantos = foto.carritos.length;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8">
      <BotonVolver />

      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 panel-oscuro:text-gray-100">
          Carritos abandonados
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
          Gente que llegó hasta la pantalla de pago y no terminó de pagar. Ya te dejaron su correo,
          así que les podés escribir.
        </p>
      </div>

      {cuantos === 0 ? (
        /* ⚠️ El vacío NO se dibuja como un error ni como una tarea pendiente:
           acá cero es la buena noticia. Un cartel triste sobre un número que
           está bien enseña a leer mal la pantalla. */
        <div className="rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 panel-oscuro:bg-emerald-500/15">
            <ShoppingCart className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-[15px] font-bold text-gray-900 panel-oscuro:text-gray-100">
            No hay ninguno
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
            Nadie dejó una compra por la mitad. Cuando pase, va a aparecer acá con el correo de esa
            persona.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-amber-200 panel-oscuro:border-amber-500/25 bg-amber-50 panel-oscuro:bg-amber-500/10 p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700 panel-oscuro:text-amber-400">
              Sin cobrar
            </p>
            <p className="mt-1 text-3xl font-black tabular-nums text-amber-900 panel-oscuro:text-amber-300">
              {plata(foto.sinCobrar)}
            </p>
            <p className="mt-0.5 text-[12.5px] text-amber-800 panel-oscuro:text-amber-300/80">
              en {cuantos} {cuantos === 1 ? "compra que quedó por la mitad" : "compras que quedaron por la mitad"}
            </p>
          </div>

          <div className="mt-4">
            <CarritosClient
              carritos={foto.carritos.map((c) => ({
                ordenId: c.ordenId,
                email: c.email,
                nombre: c.nombre,
                productos: c.productos,
                total: c.total,
                /* ⚠️ El "hace cuánto" se calcula ACÁ, en el servidor. Hecho en el
                   navegador da distinto —el servidor corre en UTC— y React avisa
                   que el texto no coincide; peor, una compra de las 22:30 puede
                   figurar con la fecha del día siguiente. */
                cuando: haceCuanto(c.cuando, ahora),
                recordado: c.recordadoEl !== null,
              }))}
              tienda={store?.name ?? ""}
            />
          </div>
        </>
      )}

      {/* Las compras que TODAVÍA se pueden pagar solas. Van aparte y con su
          motivo: si estuvieran mezcladas con los abandonos, quien mira creería
          que perdió una venta que se está por cobrar. */}
      {foto.enCamino > 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 px-4 py-3 text-[12.5px] leading-relaxed text-gray-600 panel-oscuro:text-gray-400">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <span>
            Hay {foto.enCamino === 1 ? "1 compra" : `${foto.enCamino} compras`} con el pago en
            camino —efectivo o en revisión—. <strong>No están acá porque todavía se pueden pagar
            solas</strong>, y escribirle a alguien que tiene el cupón en la mano es de más.
          </span>
        </p>
      )}

      {/* ── El mail automático ────────────────────────────────────────────────
          ⚠️ Va ABAJO de la lista. Primero lo que es suyo —su plata, sus
          correos—, y recién después lo que le podemos vender. Al revés es
          cobrarle la entrada para que vea lo que ya le pertenece. */}
      <div
        className={`mt-6 rounded-2xl border p-5 ${
          esPro
            ? "border-emerald-200 panel-oscuro:border-emerald-500/25 bg-emerald-50 panel-oscuro:bg-emerald-500/10"
            : "border-dashed border-gray-300 panel-oscuro:border-gray-700"
        }`}
      >
        <p className="flex items-center gap-2 text-[13px] font-bold text-gray-800 panel-oscuro:text-gray-200">
          {esPro
            ? <Sparkles className="h-4 w-4 text-emerald-600" />
            : <Lock className="h-3.5 w-3.5 text-gray-400" />}
          El recordatorio automático
        </p>

        {esPro ? (
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-emerald-900 panel-oscuro:text-emerald-300/90">
            Está prendido. Una vez por día le escribimos a quien dejó una compra por la mitad, con
            el link para terminarla. <strong>A cada persona una sola vez</strong>: insistirle a
            alguien que no quiso comprar es correo no deseado, y el que queda mal es tu negocio.
          </p>
        ) : (
          <>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
              Con el plan Pro le escribimos solos a cada persona que dejó la compra por la mitad,
              con el link para terminarla. Vos no hacés nada.
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
              Mientras tanto la lista es tuya igual, y los correos también: podés escribirles a
              mano desde acá.
            </p>
            <Link
              href="/digitales/mi-cuenta"
              className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-orange-600 hover:text-orange-500"
            >
              Ver el plan Pro <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </>
        )}
      </div>

      <p className="mt-4 text-[11.5px] leading-relaxed text-gray-400 panel-oscuro:text-gray-500">
        Una compra aparece acá recién {MADURACION_MS / 60000} minutos después de empezada: antes de
        eso, la persona puede estar pagando en ese mismo momento.
      </p>
    </div>
  );
}
