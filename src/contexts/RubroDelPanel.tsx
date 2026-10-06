"use client";
import { createContext, useContext } from "react";

/* El rubro de la tienda, ya conocido al dibujar el panel (06/10/26).

   El menú lateral esconde y muestra cosas según el rubro (autos no tiene
   Pedidos ni Cupones; tiene Consultas). Antes arrancaba en `null` y lo pedía a
   /api/pedidos después de montar: durante esa espera una concesionaria veía el
   menú de ropa y después cambiaba, en cada pantalla. El layout del servidor ya
   lee la tienda, así que lo pasa por acá y el primer dibujo ya es el correcto.
   /api/pedidos lo sigue confirmando, igual que antes. */
export type RubroDelPanel = { tipoTienda: string | null; configurado: boolean };

const Ctx = createContext<RubroDelPanel>({ tipoTienda: null, configurado: false });

export function RubroDelPanelProvider({ value, children }: { value: RubroDelPanel; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useRubroDelPanel = () => useContext(Ctx);
