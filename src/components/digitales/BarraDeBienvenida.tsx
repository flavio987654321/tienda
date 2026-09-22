"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { claveDeBienvenida, elTokenMasViejo, venceEnDelTokenDeBienvenida } from "@/lib/bienvenida";
import { cuentaRegresiva } from "@/lib/oferta-salida";
import { useAhora } from "@/lib/reloj-compartido";
import { guardarPlazo } from "@/lib/plazo-en-el-navegador";


/**
 * Guardar el token del precio de bienvenida en el navegador, y decir si hay
 * que pedir la página de nuevo. Lo usan la barra y el checkout.
 *
 * La cocina está en `lib/plazo-en-el-navegador`, compartida con la oferta
 * del upsell: es la parte que hace que recargar no reinicie el reloj, y
 * copiarla una vez por oferta es garantizar que la próxima salga mintiendo.
 * Acá queda sólo QUÉ oferta es —su clave y su lector de tokens—, que es lo
 * que impide que el plazo de una valga como el de la otra.
 */
export function guardarTokenDeBienvenida(productId: string, tokenDeLaPagina: string): { token: string; pedirDeNuevo: boolean } {
  return guardarPlazo(claveDeBienvenida(productId), tokenDeLaPagina, elTokenMasViejo);
}

/**
 * La barra del precio de bienvenida: "Precio de bienvenida reservado por
 * 14:59", pegada arriba, contando de verdad.
 *
 * ── Qué hace, y qué no ──────────────────────────────────────────────────────
 *
 * El servidor ya decidió el plazo de esta persona (`bienvenidaDeLaVisita`)
 * y dibujó la página con el precio de bienvenida. Acá:
 *
 *   1. Se guarda el token (`guardarTokenDeBienvenida`). Si el navegador
 *      tenía uno más viejo, la página está dibujada con un plazo que no es
 *      el suyo: se le pide al servidor que la vuelva a dibujar
 *      (`router.refresh`), ya con la cookie puesta.
 *   2. Se cuenta hacia atrás, con el reloj compartido.
 *   3. Al llegar a cero, otra vez `router.refresh`: con la cookie vencida, la
 *      página sale con el precio normal y sin barra. No se cambia ningún
 *      precio desde acá: los números los pone siempre el servidor.
 *
 * Sin estado propio a propósito: el plazo sale del token, la hora del reloj
 * compartido, y lo que hay que hacer se deriva de los dos.
 *
 * `demo` es la previa del editor: se ve quieta, marcada "Ejemplo", y no
 * guarda nada en el navegador de la dueña.
 */
export default function BarraDeBienvenida({ productId, token, texto, demo }: {
  productId: string; token: string; texto: string; demo?: boolean;
}) {
  const router = useRouter();
  const venceEn = demo ? null : venceEnDelTokenDeBienvenida(token) ?? 0;
  const ahora = useAhora(venceEn);
  const vencida = venceEn !== null && ahora > 0 && ahora >= venceEn;

  useEffect(() => {
    if (demo) return;
    if (guardarTokenDeBienvenida(productId, token).pedirDeNuevo) router.refresh();
  }, [demo, productId, token, router]);

  useEffect(() => {
    if (vencida) router.refresh();
  }, [vencida, router]);

  /* Hasta que monta no dibuja la cuenta: el servidor y el navegador no
     pintan dos números distintos. Vencida, tampoco: ya se pidió la página
     nueva. */
  const cuenta = venceEn === null ? "14:59" : ahora === 0 || vencida ? null : cuentaRegresiva(venceEn, ahora);

  return (
    <div className="sticky top-0 z-40 bg-[color:var(--pv-acento)] px-5 py-2.5 text-center text-sm font-semibold text-[color:var(--pv-sobre)]">
      {texto} <span className="inline-block min-w-[3.5ch] tabular-nums">{cuenta ?? ""}</span>
      {demo && (
        <span className="ml-2 inline-block rounded bg-orange-500 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-white">
          Ejemplo
        </span>
      )}
    </div>
  );
}
