import type { Metadata } from "next";
import RecuperacionCliente from "./RecuperacionCliente";

export const metadata: Metadata = { title: "Seguridad de tu cuenta", robots: { index: false } };

type Props = { searchParams: Promise<{ confirmar?: string; cancelar?: string }> };

/**
 * Donde llevan los botones del mail de "Perdí mi celular". Abrir la página no
 * hace nada: hay que tocar el botón. Los filtros de los correos abren solos los
 * links que llegan, y con sólo abrir no puede arrancar ni frenarse una espera.
 */
export default async function RecuperacionPage({ searchParams }: Props) {
  const { confirmar, cancelar } = await searchParams;
  const accion = cancelar ? "cancelar" : confirmar ? "confirmar" : null;
  return <RecuperacionCliente accion={accion} token={cancelar ?? confirmar ?? ""} />;
}
