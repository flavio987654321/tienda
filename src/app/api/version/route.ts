import { NextResponse } from "next/server";

// Nunca cachear: el sentido de esta ruta es decir qué build está sirviendo el
// servidor AHORA. Una respuesta cacheada seguiría diciendo la versión vieja y
// el aviso de actualizar no aparecería nunca.
export const dynamic = "force-dynamic";

// GET /api/version — build que está online en este momento.
//
// La usa PWAManager para preguntar cada tanto "¿salió algo nuevo?". Hace falta
// una pregunta al servidor porque una PWA instalada corre en standalone: no
// tiene barra de direcciones ni botón de recargar, así que si el usuario la
// deja abierta no hay forma de que se entere sola de que hay una versión nueva.
export async function GET() {
  return NextResponse.json(
    { buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev" },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
