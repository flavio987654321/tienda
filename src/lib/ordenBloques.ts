/* ══════════════════════════════════════════════════════════════════════════
   EL ORDEN DE LOS BLOQUES DE LA PORTADA
   ══════════════════════════════════════════════════════════════════════════

   Cada template tiene su orden de fábrica (`defaultOrder`, la lista de ids de
   sus bloques) y la dueña puede reordenarlos: lo que eligió se guarda en
   `sectionOrder`. Cuando el template suma un bloque NUEVO, su id no está en
   lo guardado.

   Antes el bloque nuevo iba al FINAL de todo: "Comprá el look" y "Preguntas
   frecuentes" aparecían abajo de Contacto, pegados al pie, en toda tienda que
   alguna vez hubiera movido un bloque (auditoría del 04/10/26). Ahora entra
   donde lo puso el template: justo después del bloque que lo precede en el
   orden de fábrica (o al principio, si es el primero).

   Lo usan la tienda (`SectionBlock`) y el editor al mover un bloque: tienen que
   dar el mismo orden, o la flecha de "subir" movería un bloque distinto del que
   se ve. Los ids guardados que el template ya no tiene se descartan. */
export function ordenEfectivo(guardado: string[], deFabrica: string[]): string[] {
  const orden = guardado.filter(id => deFabrica.includes(id));
  deFabrica.forEach((id, i) => {
    if (orden.includes(id)) return;
    // El vecino de arriba más cercano que ya esté puesto.
    let j = i - 1;
    while (j >= 0 && !orden.includes(deFabrica[j])) j--;
    const lugar = j < 0 ? 0 : orden.indexOf(deFabrica[j]) + 1;
    orden.splice(lugar, 0, id);
  });
  return orden;
}
