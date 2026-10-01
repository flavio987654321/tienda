import { avisosConNumeros } from "@/lib/avisos-admin-servidor";
import AvisosAdmin from "./AvisosAdmin";

export const dynamic = "force-dynamic";

export default async function AdminAvisosPage() {
  /* Las fechas viajan como texto: un `Date` no cruza al componente de cliente. */
  const avisos = JSON.parse(JSON.stringify(await avisosConNumeros()));
  return <AvisosAdmin inicial={avisos} />;
}
