"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { claveDeBienvenida, elTokenMasViejo, venceEnDelTokenDeBienvenida } from "@/lib/bienvenida";
import { cuentaRegresiva } from "@/lib/oferta-salida";
import { useAhora } from "@/lib/reloj-compartido";

/**
 * A qué camino se ata la cookie: SÓLO al de este producto.
 *
 * En el dominio de la plataforma todos los productos viven bajo el mismo
 * host (`www.tiendaapps.com/p/<id>`). Con `Path=/`, quien recorre muchos
 * productos —o un bot que recorre cientos— acumula una cookie por cada uno
 * hasta pasar el límite de cabecera del navegador (~4 KB) y el sitio
 * entero le contesta "Request Header Too Large", panel incluido. Y viajaría
 * a todas las rutas `/api/*` sin motivo. Con `Path=/p/<id>` cada cookie va
 * sólo a su página y a su pago. En un subdominio o dominio propio la página
 * es la raíz y el host ya es de un solo producto: ahí es `/`.
 */
export function caminoDeLaCookie(): string {
  try { return location.pathname.match(/^\/p\/[A-Za-z0-9_-]{1,64}/)?.[0] ?? "/"; } catch { return "/"; }
}

/**
 * Guardar el token en el navegador, y decir si hay que pedir la página de
 * nuevo. Lo comparten la barra y el checkout.
 *
 * Se queda con el que vence ANTES de los que hay a mano (la cookie, el
 * localStorage y el que trajo la página) y lo guarda en los dos lados: así
 * recargar, cerrar o volver no reinicia nada. No verifica firmas —el
 * navegador no puede—: un token inventado sólo puede acortarle el plazo a
 * quien lo inventa; alargarlo no, porque al cobrar la ruta lo firma de
 * nuevo y no coincide. Ver `lib/bienvenida`.
 *
 * `pedirDeNuevo` es true sólo si el elegido NO es el de la página Y la
 * cookie quedó escrita de verdad (se lee después de escribirla). Dos
 * bucles que esto evita:
 *
 *   - Cookies bloqueadas: el servidor nunca vería el token viejo, daría
 *     otro nuevo, otro desajuste, y otra vez la página. Se sigue con el
 *     plazo que dibujó el servidor, que es lo más que se puede hacer.
 *   - Un token guardado con buena forma pero firma inválida (el secreto se
 *     rotó, o alguien lo tocó): el navegador lo elige por ser más viejo, el
 *     servidor lo rechaza y firma otro, y así para siempre. Si la cookie
 *     que el servidor YA VIO es la que elegiríamos y aun así dibujó con
 *     otra, es que la nuestra no vale: manda el servidor, y lo guardado se
 *     reemplaza por lo suyo.
 */
export function guardarTokenDeBienvenida(productId: string, tokenDeLaPagina: string): { token: string; pedirDeNuevo: boolean } {
  const clave = claveDeBienvenida(productId);
  const leerCookie = () => { try { return document.cookie.match(new RegExp(`(?:^|; )${clave}=([^;]*)`))?.[1] ?? null; } catch { return null; } };
  const guardar = (t: string) => {
    try { document.cookie = `${clave}=${t}; Max-Age=2592000; Path=${caminoDeLaCookie()}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`; } catch { /* sin cookies se sigue con lo que hay */ }
    try { window.localStorage.setItem(clave, t); } catch { /* ídem */ }
  };
  const enLaCookie = leerCookie();
  let deLocal: string | null = null;
  try { deLocal = window.localStorage.getItem(clave); } catch { /* ídem */ }
  const elegido = elTokenMasViejo([enLaCookie, deLocal, tokenDeLaPagina]) ?? tokenDeLaPagina;
  if (elegido !== tokenDeLaPagina && enLaCookie === elegido) {
    guardar(tokenDeLaPagina);
    return { token: tokenDeLaPagina, pedirDeNuevo: false };
  }
  guardar(elegido);
  return { token: elegido, pedirDeNuevo: elegido !== tokenDeLaPagina && leerCookie() === elegido };
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
