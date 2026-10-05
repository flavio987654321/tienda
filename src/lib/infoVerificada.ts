/* ══════════════════════════════════════════════════════════════════════════
   LOS DATOS DE LA DUEÑA EN EL SELLO DE "VERIFICADA" (05/10/26)
   ══════════════════════════════════════════════════════════════════════════

   El sello puede mostrar nombre, ciudad, teléfono y "miembro desde", cada uno
   con su interruptor. Pero el dato viajaba SIEMPRE al navegador —en el HTML de
   la tienda y de cada ficha— y el interruptor sólo decidía si se dibujaba:
   el teléfono personal del perfil quedaba en "ver código fuente" de cualquier
   tienda, verificada o no.

   Ahora el dato sale sólo si la tienda está verificada Y la dueña eligió
   mostrarlo. Si no, va `null`: los componentes ya miraban "mostrar && dato",
   así que en pantalla no cambia nada. Lo usan la portada y la ficha. */

type Tienda = {
  isVerified?: boolean | null;
  verifiedShowName?: boolean | null;
  verifiedShowCity?: boolean | null;
  verifiedShowPhone?: boolean | null;
  verifiedShowSince?: boolean | null;
  owner?: { name?: string | null; city?: string | null; phone?: string | null } | null;
};

export function infoVerificadaPublica(store: Tienda | null | undefined, memberSince: string | null) {
  const verificada = !!store?.isVerified;
  const mostrar = (bandera: boolean | null | undefined) => verificada && !!bandera;
  const showName = mostrar(store?.verifiedShowName);
  const showCity = mostrar(store?.verifiedShowCity);
  const showPhone = mostrar(store?.verifiedShowPhone);
  const showSince = mostrar(store?.verifiedShowSince);
  return {
    showName, name: showName ? store?.owner?.name ?? null : null,
    showCity, city: showCity ? store?.owner?.city ?? null : null,
    showPhone, phone: showPhone ? store?.owner?.phone ?? null : null,
    showSince, memberSince: showSince ? memberSince : null,
  };
}
