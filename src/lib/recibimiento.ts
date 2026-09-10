import { prisma } from "@/lib/prisma";
import { buscarEstilo, buscarPaleta, buscarTipografia } from "@/lib/pagina-venta";
import {
  primerosPasos, pasosDeLaPuerta, terminado, PASOS_DE_ADENTRO,
  type FotoDeLaCuenta, type Paso,
} from "@/lib/primeros-pasos";

/**
 * EL RECIBIMIENTO: armar la cuenta, antes de que exista el panel.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * HASTA QUE NO ESTÁ ARMADA, EL PANEL NO EXISTE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * No es una lista de tareas adentro del panel: **es la pantalla entera**. Sin
 * barra lateral, sin Configuración, sin Mi cuenta, sin números. Una cuenta
 * recién creada no tiene nada que mirar en un panel —tres ceros y una lista
 * vacía— y sí tiene una cosa que hacer: armar lo que va a vender.
 *
 * El panel aparece **cuando están los pasos de la puerta**, que hoy son dos: el
 * producto y la página. Cuáles son no lo decide este archivo — lo decide
 * `pasosDeLaPuerta`, y acá se usa lo que devuelva.
 *
 * ── Los otros tres quedan adentro, y es a propósito ────────────────────────
 *
 * Publicar NO abre la puerta. Pedirlo para entrar obliga a poner la página a la
 * vista antes de haberla visto: quien recién armó su producto todavía no miró
 * cómo le quedó ni acomodó nada, así que lo primero que verían los compradores
 * es la versión que la dueña no revisó.
 *
 * El archivo y el cobro tampoco, y por el mismo motivo entre los dos: **la
 * pantalla donde se resuelven está adentro del panel**. Pedirlos en la puerta
 * escondía justo el lugar donde se arreglan — el botón que escribe el ebook, y
 * Configuración → Pagos. Ver `PASOS_DE_ADENTRO`.
 *
 * Se entra en borrador, se mira, se acomoda, y se publica cuando está conforme.
 * El paso no se pierde: la lista del panel lo sigue pidiendo. Ver
 * `pasosDeLaPuerta` en `lib/primeros-pasos`.
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
  /**
   * SÓLO los pasos de la puerta: los cuatro que hay que terminar para entrar.
   *
   * Publicar no viene en esta lista, y por eso la pantalla puede decir "Paso 2
   * de 4" sin mentir. Si viniera, mostraría un quinto círculo que nunca se
   * puede tildar desde ahí —al tildarse ya estarías del otro lado de la puerta—
   * y contaría un total que no es el que hay que hacer.
   */
  pasos: Paso[];
  /** `true` cuando ya se puede entrar al panel. */
  listo: boolean;
  /**
   * Si el producto principal ya está publicado.
   *
   * No hace falta para la puerta —publicar no la abre— y se devuelve por una
   * sola razón: es lo que separa "recién terminó de armar la cuenta" de "hace
   * meses que vende". Sin esto, el día que salió la pantalla de "Todo listo"
   * se la habría comido en la cara toda cuenta que ya venía usando el panel.
   * Ver `Cierre`.
   */
  publicado: boolean;
  /**
   * Los pasos DE ADENTRO que todavía faltan: el archivo, publicar, o los dos.
   *
   * Existe para que la pantalla de "Todo listo" no mienta. Desde que el archivo
   * salió de la puerta se puede llegar ahí sin PDF, y un cartel que dice "ya
   * podés cobrar" a alguien que no tiene nada que entregar es exactamente la
   * promesa que este ecosistema no puede hacer.
   */
  pendientesAdentro: Paso[];
  /** El producto principal sobre el que corre el recibimiento, si ya existe. */
  productoId: string | null;
  /** Su nombre, para poder nombrarlo en los pasos que vienen después. */
  productoNombre: string | null;
  /**
   * Cómo se ve hoy su página: el estilo, la paleta y la letra.
   *
   * ⚠️ Son TRES CLAVES CORTAS y no la página entera, y es a propósito. Esto
   * corre en el layout, así que lo que salga de acá viaja adentro del HTML de
   * cada pantalla del panel que alguien abra. Una página normalizada pesa
   * varios kilobytes y se usaría en una sola pantalla, vista una sola vez.
   *
   * Alcanza con esto porque la pantalla del cierre no reescribe la página: le
   * manda al servidor sólo lo que cambió, y el servidor lo pega sobre lo que
   * hay. Ver el `PATCH` de `productos/[id]/pagina`.
   */
  aspecto: { estilo: string; paleta: string; tipografia: string };
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
      /* ⚠️ ESTO TRAE LA LLAVE DE COBRO ENTERA, no un "sí o no".
         Acá decía *"Sólo si hay token, no el token"*, y era falso: Prisma no
         tiene forma de pedir "¿existe?" de una columna suelta, así que
         `mpAccessToken: true` devuelve el texto del token. Se cambió el
         comentario y no la consulta porque la consulta está bien —traerlo es la
         única forma de saber si está—, pero la frase de antes daba por puesta
         una protección que no había.

         LA PROTECCIÓN DE VERDAD es la forma que devuelve esta función: sólo
         booleanos, ids y pasos. `tienda` muere acá adentro y nunca sale.

         ⚠️ Por eso, al agregarle un campo a `EstadoDelRecibimiento`, mirá que
         no arrastre `tienda` ni nada derivado del token. Lo que salga de acá se
         lo pasa el layout a componentes de CLIENTE, y ahí termina escrito
         adentro del HTML que se manda al navegador. */
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

  /* Los cinco se arman igual —el texto y el orden son los mismos que lee el
     panel— y recién acá se separan los de la puerta de los de adentro. */
  const todos = primerosPasos(foto);
  const pasos = pasosDeLaPuerta(todos);

  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️ ACÁ NO SE LLAMA A `normalizarContenido`, Y NO ES UN DESCUIDO
     ══════════════════════════════════════════════════════════════════════════

     Era lo primero que escribí, porque devuelve las tres claves ya validadas en
     una línea. Pero esa función **rearma la página entera**: recorre el catálogo
     de secciones, normaliza cada campo de cada una y las reordena. Y esto corre
     en el layout, o sea UNA VEZ POR CADA PANTALLA DEL PANEL QUE ALGUIEN ABRA,
     para siempre — el aviso está tres párrafos más arriba.

     Pagar el rearmado completo de la página en cada visita, para tres palabras
     que mira una sola pantalla vista una sola vez, es exactamente lo que ese
     aviso pide no hacer.

     Así que se lee el JSON y se validan las tres claves con las mismas funciones
     que usa `normalizarContenido` para ellas. El resultado es idéntico —una
     clave inventada cae en la de fábrica— y no se toca ninguna sección.

     El `catch` vacío es a propósito: una página guardada a medias no puede
     tumbar el panel entero. Sin nada legible, las tres caen en las de fábrica,
     que es lo correcto para preseleccionar. */
  let guardado: Record<string, unknown> | null = null;
  try {
    const leido = principal?.paginaVenta ? JSON.parse(principal.paginaVenta) : null;
    if (leido && typeof leido === "object" && !Array.isArray(leido)) guardado = leido;
  } catch {
    /* Ver arriba. */
  }

  return {
    pasos,
    listo: terminado(pasos),
    publicado: foto.publicado,
    pendientesAdentro: todos.filter((p) => !p.hecho && PASOS_DE_ADENTRO.includes(p.clave)),
    productoId: principal?.id ?? null,
    productoNombre: principal?.name ?? null,
    aspecto: {
      estilo: buscarEstilo(guardado?.estilo).clave,
      paleta: buscarPaleta(guardado?.paleta).clave,
      tipografia: buscarTipografia(guardado?.tipografia).clave,
    },
  };
}
