import VerificacionesAdmin from "./VerificacionesAdmin";

export const dynamic = "force-dynamic";

export default function VerificacionesPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Verificaciones</h1>
        <p className="text-gray-400 text-sm">Revisá y aprobá las solicitudes de identidad de los vendedores.</p>
      </div>
      <VerificacionesAdmin />
    </div>
  );
}
