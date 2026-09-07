import { prisma } from "@/lib/prisma";
import { primerosPasos, terminado, type FotoDeLaCuenta, type Paso } from "@/lib/primeros-pasos";

/**
 * EL RECIBIMIENTO: los cinco pasos, antes de que exista el panel.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * HASTA QUE NO ESTÁN LOS CINCO, EL PANEL NO EXISTE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * No es una lista de tareas adentro del panel: **es la pantalla entera**. Sin
 * barra lateral, sin Configuración, sin Mi cuenta, sin números. Una cuenta
 * recién creada no tiene nada que mirar en un panel —tres ceros y una lista
 * vacía— y sí tiene una cosa que hacer: armar lo que va a vender.
 *
 * El panel aparece **cuando los cinco pasos están hechos**, y aparece con el
 * producto, el archivo, la página, el cobro y la publicación ya resueltos.
 *
 * ── Por qué se decide acá y no en cada pantalla ────────────────────────────
 *
 * Porque lo pregunta el layout, una sola vez, y con eso alcanza para las nueve
 * pantallas del panel. Puesto en cada una, alcanzaría con agregar la décima y
 * olvidarse para que una cuenta a medio armar entre por esa puerta.
 *
 * ── Y por qué no hay ninguna bandera de "ya terminó el recibimiento" ───────
 *
 * Por lo mismo que los pasos no la tienen: una bandera guardada se
 * desincroniza. Alguien borra su único producto y la bandera sigue diciendo
 * "listo", con la cuenta vacía y el panel mostrando ceros. Acá se pregunta por
 * el dato real, así que si algo se cae, el recibimiento vuelve — que es
 * exactamente lo que hay que ver. Ver `lib/primeros-pasos`.
 */

export type EstadoDelRecibimiento = {
  pasos: Paso[];
  /** `true` cuando ya se puede entrar al panel. */
  listo: boolean;
  /** El producto principal sobre el que corre el recibimiento, si ya existe. */
  productoId: string | null;
  /** Su nombre, para poder nombrarlo en los pasos que vienen después. */
  productoNombre: string | null;
};

/**
 * En qué paso está esta cuenta.
 *
 * ⚠️ Son DOS consultas y no más, porque esto corre en el layout: una por cada
 * pantalla del panel que se abra, para siempre. Todo lo que se agregue acá se
 * paga en cada visita de cada persona.
 *
 * El producto es el PRINCIPAL más viejo, que es el que la persona armó primero
 * y el que tiene en la cabeza cuando la pantalla le dice "subí el archivo".
 */
export async function estadoDelRecibimiento(userId: string): Promise<EstadoDelRecibimiento> {
  const tienda = await prisma.store.findUnique({
    where: { ownerId: userId },
    select: {
      /* Sólo si hay token, no el token. Un `select` de más acá lo arrastra a un
         componente de servidor que después se lo pasa a uno de cliente, y la
         llave de cobro termina escrita adentro del HTML. */
      mpAccessToken: true,
      products: {
        where: { deletedAt: null, rolDigital: "PRINCIPAL" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          id: true, name: true, archivoPath: true, paginaVenta: true, isActive: true,
        },
      },
    },
  });

  const principal = tienda?.products[0] ?? null;

  const foto: FotoDeLaCuenta = {
    principalId: principal?.id ?? null,
    tieneArchivo: Boolean(principal?.archivoPath),
    paginaArmada: principal?.paginaVenta != null,
    cobroConectado: tienda?.mpAccessToken != null,
    publicado: principal?.isActive === true,
  };

  const pasos = primerosPasos(foto);

  return {
    pasos,
    listo: terminado(pasos),
    productoId: principal?.id ?? null,
    productoNombre: principal?.name ?? null,
  };
}
