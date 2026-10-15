import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUsuarioConSegundoPaso } from "@/lib/auth-session";
import { factoresDe, codigosLibres, quitarActivacionSinConfirmar } from "@/lib/seguridad-cuenta";
import { caminoSeguro } from "@/lib/alta-google";
import VerificarCliente from "./VerificarCliente";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verificá que sos vos", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string }> };

/**
 * El segundo paso al entrar, para tiendas, digitales y afiliados (el admin tiene
 * `/verificar-2fa`). Llega acá quien pasó la contraseña, el código por mail o
 * Google en una cuenta con la verificación en dos pasos. El middleware manda
 * acá cualquier pantalla de panel hasta que la pase. Ver `lib/seguridad-cuenta`.
 */
export default async function VerificarPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const destino = caminoSeguro(next) ?? "/panel";

  const sesion = await getUsuarioConSegundoPaso();
  if (!sesion) redirect(`/login?redirect=${encodeURIComponent(destino)}`);
  if (sesion.user.role === "ADMIN") redirect("/verificar-2fa");
  if (!sesion.faltaSegundoPaso) redirect(destino);

  /* Una activación que no pasó por nuestra confirmación con el mail se quita
     acá, que es justo donde queda trabada la dueña si alguien se la puso (ver
     `quitarActivacionSinConfirmar`). Quitarla cierra todas las sesiones: vuelve
     a entrar, ya sin doble paso. Si falla, se sigue con la pantalla normal. */
  const quitada = await quitarActivacionSinConfirmar(sesion.user).catch((e) => {
    console.error("[verificar] revisar activación sin confirmar:", e instanceof Error ? e.message : e);
    return false;
  });
  if (quitada) redirect(`/login?redirect=${encodeURIComponent(destino)}`);

  /* Los métodos se leen del lado del servidor con la clave de servicio: son los
     de verdad, recién leídos, y no los que el navegador tenga guardados. Si no
     se pueden leer se muestra igual la pantalla, con el código de la app y los
     de respaldo, que no dependen de saber cuáles hay. */
  const [factores, libres] = await Promise.all([
    factoresDe(sesion.user.id).catch(() => null),
    codigosLibres(sesion.user.id).catch(() => 1),
  ]);

  return (
    <VerificarCliente
      destino={destino}
      email={sesion.user.email}
      huellas={(factores ?? []).filter((f) => f.tipo === "huella").map((f) => ({ id: f.id, nombre: f.nombre }))}
      tieneApp={factores ? factores.some((f) => f.tipo === "app") : true}
      tieneCodigos={libres > 0}
    />
  );
}
