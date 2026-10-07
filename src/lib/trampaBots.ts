/**
 * La trampa para bots de los formularios públicos de autos (08/10/26):
 * consulta, tasación y búsqueda.
 *
 * Un campo que una persona no ve ni puede tocar (fuera de pantalla, sin foco
 * con Tab, oculto para lectores de pantalla). Los robots que llenan
 * formularios completan todos los campos que encuentran; si este llega con
 * algo, el servidor contesta "listo" como si nada y no guarda, no avisa a la
 * concesionaria y no manda correo. Contestar error le enseñaría al bot que lo
 * detectaron.
 *
 * No reemplaza a los topes por IP y por tienda de cada ruta: un bot que le
 * pega directo a la API se los come igual. Esto frena a los que usan el
 * formulario, que son la mayoría y los más baratos.
 */
export const CAMPO_TRAMPA = "hp_extra";

export function cayoEnLaTrampa(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const v = (body as Record<string, unknown>)[CAMPO_TRAMPA];
  return typeof v === "string" && v.trim() !== "";
}
