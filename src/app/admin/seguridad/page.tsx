import SeguridadClient from "./SeguridadClient";

export const dynamic = "force-dynamic";

// Gateada por el layout de /admin (role ADMIN + AAL). Si el admin ya tiene 2FA,
// para llegar acá tuvo que pasar el segundo factor, así que desactivarlo desde
// esta pantalla es una acción ya elevada (aal2), como pide Supabase.
export default function AdminSeguridadPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Seguridad</h1>
        <p className="text-gray-400 text-sm">Verificación en dos pasos de tu cuenta de administrador.</p>
      </div>
      <SeguridadClient />
    </div>
  );
}
