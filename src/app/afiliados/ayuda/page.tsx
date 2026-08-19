import type { Metadata } from "next";
import PanelAyuda from "@/components/panel/PanelAyuda";
import { getCurrentUser } from "@/lib/auth-session";

/* La ayuda del afiliado, adentro del `scope` de su app.
   El porqué —la fuga que se veía tocando "Centro de ayuda" en el teléfono— está
   en el comentario largo de `PanelAyuda`. */
export const metadata: Metadata = {
  title: "Centro de ayuda",
  /* Esta es la copia para la app; la que Google tiene que indexar es `/ayuda`.
     Sin esto habría dos direcciones con el mismo texto compitiendo entre ellas. */
  robots: { index: false, follow: false },
};

/**
 * La guarda va acá ADEMÁS de en el layout, y no es de más.
 *
 * El `return` temprano del layout esconde esta pantalla, pero NO evita que se
 * ejecute. Comprobado pidiendo la ruta sin sesión: el índice entero se arma y
 * viaja en el payload de React —la respuesta pasa de 30 KB a 65—, aunque no se
 * dibuje. El resto del panel no tiene ese problema porque cada página se guarda
 * sola (`/dashboard/pedidos` arranca con `getCurrentUser`), y estas cuatro eran
 * la excepción.
 *
 * Lo que se dibuja son artículos del repo, así que no se estaba filtrando nada
 * privado. Pero el trabajo se hacía igual para cualquiera que pidiera la
 * dirección, y una pantalla del panel que se renderiza sin sesión es de la clase
 * de cosas que un día tiene datos adentro.
 *
 * Es `return null` y NO `redirect("/login")`, que es lo que hace el resto del
 * panel: `/login` está fuera del scope del manifiesto, así que redirigir desde
 * acá volvería a abrir la fuga que este archivo vino a cerrar. Sin nada que
 * dibujar manda el layout, que ya sabe mostrar el login adentro de la app.
 */
export default async function AyudaDelAfiliado({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SELLER") return null;

  const { q } = await searchParams;
  return (
    <PanelAyuda base="/afiliados/ayuda" rol="afiliado" volverA="/afiliados" consulta={q ?? ""} />
  );
}
