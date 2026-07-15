import CierresAdmin from "./CierresAdmin";

export const dynamic = "force-dynamic";

export default function CierresPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Cierres</h1>
        <p className="text-gray-400 text-sm">Por qué cerraron su tienda. Es la única forma de enterarte de qué se está rompiendo antes de que se vayan más.</p>
      </div>
      <CierresAdmin />
    </div>
  );
}
