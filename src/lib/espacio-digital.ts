import { prisma } from "@/lib/prisma";
import { estaLibre } from "@/lib/direccion-digital";

/* ══════════════════════════════════════════════════════════════════════════
   EL ESPACIO DE LA CUENTA
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * La `Store` de una cuenta digital, creada la primera vez que hace falta.
 *
 * ── Por qué una cuenta digital tiene una tienda ──────────────────────────────
 * Porque `Product`, `Order`, `OrderItem` y `DigitalDownload` ya existen, ya se
 * auditaron y ya mueven plata de verdad, y todos cuelgan de una tienda. La
 * alternativa era una tabla nueva por cada uno de esos —o sea, **rehacer el
 * camino del dinero**, que es la parte más riesgosa del proyecto y la única que
 * ya está probada.
 *
 * Así que la tienda es el motor. **Nunca se le llama "tienda" en pantalla ni se
 * le muestra a nadie**: nace despublicada y la persona no tiene forma de
 * publicarla. Lo que se publica son sus productos, uno por uno.
 *
 * ── Por qué se crea recién acá y no en el registro ───────────────────────────
 * Para no dejar una tienda vacía colgando por cada cuenta que se crea y nunca
 * carga nada. Se crea con el primer producto, que es cuando empieza a hacer
 * falta.
 *
 * ── El candado ───────────────────────────────────────────────────────────────
 * `Store.ownerId` es único, así que quien ya tiene una tienda de verdad NO puede
 * pasar por acá. Se corta antes: una cuenta es una sola cosa. Si alguna vez pasa
 * —una cuenta vieja con tienda a la que le cambiaron el rol a mano— se devuelve
 * un error en vez de escribir sobre la tienda de alguien.
 */
export async function espacioDigital(userId: string): Promise<{ storeId: string } | { error: string }> {
  const existente = await prisma.store.findUnique({
    where: { ownerId: userId },
    select: { id: true, isPublished: true },
  });

  if (existente) {
    /* Una tienda publicada no es el espacio de una cuenta digital: es la tienda
       de alguien. No se toca y no se usa. */
    if (existente.isPublished) {
      return { error: "Tu cuenta ya tiene una tienda. Para vender productos digitales registrate con otro correo." };
    }
    return { storeId: existente.id };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user) return { error: "No encontramos tu cuenta." };

  return { storeId: (await prisma.store.create({
    data: {
      ownerId: userId,
      name: user.name?.trim() || "Mis productos digitales",
      slug: await slugLibre(user.email),
      // Nace apagada y se queda apagada: lo que se publica son los productos.
      isPublished: false,
    },
    select: { id: true },
  })).id };
}

/**
 * Un slug que no choque con **ninguna dirección**, ni de tienda ni de producto.
 *
 * Arranca de la parte de adelante del correo porque es más fácil de reconocer
 * que un identificador al azar el día que haya que mirar la base a mano.
 *
 * ⚠️ El comentario que estaba acá decía "nadie lo ve, la dirección pública de un
 * producto digital es otra cosa, y va en su propia fase". **Esa fase llegó** —la
 * 5 bis— y con ella el slug del espacio dejó de ser invisible: `Store.slug` y
 * `Product.slugDigital` viven los dos en `<nombre>.tiendaapps.com`, y el
 * middleware desempata a favor de la tienda. O sea que un espacio nuevo que
 * cayera sobre el nombre de un producto ya publicado le apagaba la dirección.
 *
 * Mirando sólo `Store` no daba error: daba un espacio con un nombre que ya era
 * de otro. Por eso ahora pregunta `estaLibre`, igual que los otros cinco
 * lugares que escriben una dirección. Ver `lib/direccion-digital`.
 */
async function slugLibre(email: string): Promise<string> {
  const base =
    email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "digital";

  for (let intento = 0; intento < 20; intento++) {
    // El primero va sin sufijo; a partir del segundo se le cuelga uno al azar.
    const candidato = intento === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 7)}`;
    if (await estaLibre(candidato)) return candidato;
  }
  /* Veinte intentos fallidos con sufijo al azar no pasa nunca; si pasara, es
     preferible un slug feo a un error de base sin explicación. */
  return `digital-${Date.now().toString(36)}`;
}
