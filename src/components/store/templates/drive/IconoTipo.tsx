/**
 * El dibujito de cada tipo de vehículo para Auto Drive (07/10/26): de línea,
 * del color del texto. Uno por categoría (lib/fichaVehiculo → CATEGORIAS_VEHICULO);
 * lo que no se reconoce va con el del auto.
 */
const RUEDA = (cx: number, cy: number, r: number) => <circle cx={cx} cy={cy} r={r} />;

const DIBUJOS: Record<string, React.ReactNode> = {
  autos: <><path d="M4 17v-4.5l6.5-1.5 4.5-5h15l6 5 7 1.5V17" />{RUEDA(13, 17.5, 3.5)}{RUEDA(35, 17.5, 3.5)}<path d="M16.5 17.5h15" /></>,
  camionetas: <><path d="M3 17v-6h18l2-6h10l4 6h8v6" /><path d="M21 11h16" />{RUEDA(12, 17.5, 3.5)}{RUEDA(36, 17.5, 3.5)}<path d="M15.5 17.5h17" /></>,
  motos: <>{RUEDA(10, 16, 5)}{RUEDA(38, 16, 5)}<path d="M10 16l8-8h9l11 8" /><path d="M18 8l6 8h6" /><path d="M27 8l4-4h4" /></>,
  camiones: <><rect x="2" y="3" width="28" height="13" rx="1" /><path d="M30 16V7h8l6 5v4" />{RUEDA(10, 18, 3)}{RUEDA(37, 18, 3)}<path d="M13 18h21" /></>,
  utilitarios: <><path d="M3 17V5h29l8 5 5 2v5" /><path d="M32 5v6h12" />{RUEDA(12, 17.5, 3.5)}{RUEDA(36, 17.5, 3.5)}<path d="M15.5 17.5h17" /></>,
  maquinaria: <>{RUEDA(14, 14, 7)}{RUEDA(38, 17, 4)}<path d="M14 7V2h10l2 8h14v5" /><path d="M21 14h13" /></>,
  cuatriciclos: <>{RUEDA(11, 16, 5)}{RUEDA(37, 16, 5)}<path d="M5 11h13l4-4h6l2 4h13" /><path d="M16 16h16" /></>,
};

export function IconoTipo({ tipo, ancho = 48 }: { tipo: string; ancho?: number }) {
  return (
    <svg width={ancho} height={(ancho * 24) / 48} viewBox="0 0 48 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {DIBUJOS[tipo] ?? DIBUJOS.autos}
    </svg>
  );
}
