"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, LogOut, ArrowRight, UserCheck } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { useSesion } from "@/components/AuthProvider";
import { nombreDeCuenta } from "@/lib/panel-de-rol";

/**
 * Lo que ve alguien que llega a Ingresar o a Registrarse **con la sesión ya
 * abierta**.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * Porque hasta el 16/09/26 las dos pantallas no se enteraban. Ninguna de las dos
 * miraba si había alguien adentro, y el middleware tampoco las toca. Quien ya
 * estaba logueado veía el formulario de registro completo, lo llenaba, y se
 * creaba una segunda cuenta mientras **la sesión vieja seguía viva**:
 * `handleSubmit` nunca cerraba nada. Terminaba en `/login?registered=...`
 * logueado como la cuenta anterior, con el nav arriba saludándolo por el nombre
 * de la otra.
 *
 * ── Por qué no es un redirect al panel ──────────────────────────────────────
 *
 * Porque abrir una segunda cuenta es un camino LEGÍTIMO acá, y bastante común:
 * la regla del proyecto es que una cuenta es un solo producto, así que a quien
 * tiene una tienda y quiere vender productos digitales le decimos, en los
 * Términos y en las preguntas frecuentes, que se registre con otro correo. Un
 * redirect duro al panel le cerraría la puerta a lo único que le dijimos que
 * hiciera.
 *
 * Entonces no se le prohíbe: se le nombra en qué cuenta está y se le pide que la
 * cierre primero. Es un paso más, y es el paso que hace que el resultado no
 * sorprenda a nadie.
 */
export function SesionYaAbierta({ modo }: { modo: "registro" | "login" }) {
  const { user, nombreMostrado, panelHref, panelLabel, signOut } = useSesion();
  const [saliendo, setSaliendo] = useState(false);

  /* Al salir se vuelve a ESTA misma pantalla, no a la home: la persona vino a
     registrarse o a entrar con otra cuenta, y cerrar sesión es el paso previo,
     no el final. Devolverla a la portada la obligaría a buscar de nuevo por
     dónde entraba. */
  const volverA = modo === "registro" ? "/registro" : "/login";

  async function salir() {
    setSaliendo(true);
    try {
      await signOut(volverA);
    } catch {
      /* Si el cierre falla, que el botón vuelva a estar disponible en vez de
         quedar girando para siempre. */
      setSaliendo(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-8">
          <AppLogo />
        </div>

        <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto mb-5">
          <UserCheck className="h-7 w-7 text-teal-600" />
        </div>

        <h1 className="text-2xl font-black text-gray-950 mb-2">
          Ya tenés la sesión abierta
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Entraste como{" "}
          <strong className="text-gray-900">{nombreMostrado ?? "tu cuenta"}</strong>
          {user ? <>, una cuenta {nombreDeCuenta(user.role)}</> : null}.
          {modo === "registro" ? (
            <>
              {" "}Para crear otra cuenta tenés que cerrar esta primero: cada cuenta es
              un solo producto y no se pueden mezclar.
            </>
          ) : (
            <> Si querés entrar con otra, cerrá ésta primero.</>
          )}
        </p>

        <div className="space-y-3">
          <Link
            href={panelHref}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold bg-orange-600 hover:bg-orange-500 text-white transition-all"
          >
            Ir a {panelLabel.toLowerCase()} <ArrowRight className="h-4 w-4" />
          </Link>

          <button
            type="button"
            onClick={salir}
            disabled={saliendo}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-60"
          >
            {saliendo ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Cerrando sesión…</>
            ) : (
              <><LogOut className="h-4 w-4" /> Cerrar sesión y {modo === "registro" ? "crear otra cuenta" : "entrar con otra"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
