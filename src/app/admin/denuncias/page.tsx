import DenunciasAdmin from "./DenunciasAdmin";

export const dynamic = "force-dynamic";

export default function DenunciasPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Denuncias</h1>
        <p className="text-gray-400 text-sm">Revisá los reportes enviados por clientes sobre tiendas de la plataforma.</p>
      </div>
      <DenunciasAdmin />
    </div>
  );
}
