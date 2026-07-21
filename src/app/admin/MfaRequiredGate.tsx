import { ShieldAlert } from "lucide-react";
import SeguridadClient from "./seguridad/SeguridadClient";

/**
 * Lo que ve un ADMIN que todavía no configuró el segundo factor.
 *
 * Muestra la activación acá mismo en vez de redirigir a /admin/seguridad: esa
 * página vive DENTRO de /admin, así que pasa por este mismo layout y un redirect
 * se mandaría a sí mismo en loop. Renderizando el formulario en el lugar del
 * panel, el admin no puede quedar trabado ni dar vueltas — tiene la única acción
 * que le queda por hacer delante suyo.
 */
export default function MfaRequiredGate() {
  return (
    <div className="min-h-screen bg-gray-950 px-6 py-14">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20">
            <ShieldAlert className="h-6 w-6 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-white">Activá la verificación en dos pasos</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-400">
            El panel de administración maneja las cuentas, los cobros y los datos de todas las
            tiendas. Para entrar hace falta tener el segundo factor configurado.
          </p>
          <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-gray-600">
            Es de una sola vez: después te va a pedir el código de tu app cada vez que entres.
          </p>
        </div>

        <SeguridadClient />
      </div>
    </div>
  );
}
