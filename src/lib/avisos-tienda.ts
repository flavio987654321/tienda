import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getSubscriptionStatus } from "@/lib/subscription";
import { getStoreType } from "@/lib/storeTypes";

/* ── El único lugar donde se decide qué le falta a una tienda ─────────────────
   Antes esto vivía en dos lados que no se hablaban: la barra de "7/8 pasos"
   (dashboard/page.tsx) y los tres booleanos de /api/dashboard/warnings. Cada uno
   calculaba lo suyo leyendo la base por su cuenta, con su propio criterio, así
   que el mismo pendiente se contaba dos veces: "conectá MercadoPago" salía en la
   barra Y como triángulo en Pagos, al mismo tiempo. Y nada obligaba a que
   siguieran de acuerdo — dos copias de una regla se separan solas.

   Ahora las condiciones se calculan una vez, acá, y de ellas salen tanto los
   pasos como los avisos. */

export type NivelAviso = "rojo" | "amarillo";

export type Aviso = {
  /** Estable en el tiempo: con esto se silencian los amarillos. */
  id: string;
  nivel: NivelAviso;
  /** href del item del menú al que pertenece — así el menú sabe dónde pintarlo. */
  seccion: string;
  /** Qué pasa, en una línea. */
  titulo: string;
  /** Por qué importa. */
  detalle: string;
  /** Dónde se arregla. */
  href: string;
};

export type EstadoTienda = {
  storeId: string;
  tipoTienda: string | null;
  logo: string | null;
  descripcion: string | null;
  isPublished: boolean;
  isVerified: boolean;
  mpConnectedAt: Date | null;
  storeConfig: string | null;
  cantidadProductos: number;
  estadoSuscripcion: string | null;
  /** Cuándo terminó de configurarse por primera vez. Null = nunca todavía. */
  onboardingCompletedAt: Date | null;
  /** Productos publicados sin una sola foto. */
  productosSinFoto: number;
  /** Cupones y promos que siguen encendidos pero ya vencieron. */
  cuponesVencidos: number;
  promosVencidas: number;
  /** Vencimiento del token de Meta. Null = no hay Meta conectado, o se desconoce. */
  fbTokenExpiresAt: Date | null;
  tienePoliticas: boolean;
  /**
   * Productos publicados a los que les falta el archivo que se vende.
   *
   * Hoy la ruta que guarda un producto NO deja publicar sin archivo en este
   * rubro. Esto igual hace falta, porque hay una puerta que no pasa por ahí:
   * cambiar el rubro de una tienda que ya tenía productos cargados. Ahí quedan
   * publicados, se pueden comprar, y no hay nada que entregar.
   *
   * Sólo se cuenta en los rubros que entregan un archivo — ver el porqué del
   * viaje aparte en `cargarEstadoTienda`.
   */
  productosDigitalesSinArchivo: number;
  /** Compras entregadas cuyo comprador nunca bajó el archivo, con el link todavía vivo. */
  compradoresSinDescargar: number;
};

export const cargarEstadoTienda = cache(async (ownerId: string): Promise<EstadoTienda | null> => {
  /* ── Las cinco consultas en UN solo viaje ──────────────────────────────────
     Esto estaba en dos tandas: primero la tienda, y después los tres contadores,
     que necesitaban el `store.id` que devolvía la primera. Parece inofensivo
     —son cinco consultas o son cinco igual— pero lo que se paga no es la
     consulta, es el VIAJE: medido contra la base de producción, una consulta
     suelta tarda 853ms y las tres del segundo grupo, en paralelo, 862ms. O sea
     que la cuenta es 850ms por tanda, no por consulta.

     Los contadores se cuelgan de `store: { ownerId }` en vez de `storeId`. Es un
     join más para Postgres —`Store.ownerId` es único— y a cambio ninguna
     depende de la anterior: entran las cinco en el mismo `Promise.all` y el
     tiempo total pasa de dos viajes a uno. */
  const ahora = new Date();
  const [store, sub, productosSinFoto, cuponesVencidos, promosVencidas] = await Promise.all([
    prisma.store.findUnique({
      where: { ownerId },
      select: {
        id: true,
        tipoTienda: true,
        logo: true,
        description: true,
        isPublished: true,
        isVerified: true,
        mpConnectedAt: true,
        storeConfig: true,
        onboardingCompletedAt: true,
        fbTokenExpiresAt: true,
        policyReturns: true,
        policyShipping: true,
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
    }),
    prisma.subscription.findUnique({
      where: { userId: ownerId },
      select: { status: true, trialEndsAt: true, currentPeriodEnd: true, gracePeriodEndsAt: true },
    }),
    /* "Vencido" acá quiere decir vencido Y todavía encendido: un cupón apagado a
       mano no es un problema, es una decisión. Lo que confunde es el que figura
       activo en la lista y ya no le sirve a nadie. */
    prisma.product.count({
      where: {
        store: { ownerId },
        deletedAt: null,
        isActive: true,
        // `images` es un JSON en texto: sin fotos queda "[]" (o vacío en filas viejas).
        OR: [{ images: "[]" }, { images: "" }],
      },
    }),
    prisma.coupon.count({
      where: { store: { ownerId }, isActive: true, expiresAt: { lt: ahora } },
    }),
    prisma.storePromotion.count({
      where: { store: { ownerId }, isActive: true, archivedAt: null, endsAt: { lt: ahora } },
    }),
  ]);

  if (!store) return null;

  /* ── El viaje de más, y por qué se paga sólo acá ────────────────────────────
     Estas dos cuentas son de un rubro solo. Meterlas arriba costaría dos
     consultas a TODA tienda —incluida cada tienda de ropa, que nunca las va a
     mirar— y arriba no se puede saltear: el `tipoTienda` viene justamente de
     la consulta que está adentro de ese mismo `Promise.all`.

     Así que se hace un segundo viaje, y sólo para las tiendas que entregan por
     descarga, que son una minoría. Las dos van juntas en un `Promise.all`, así
     el viaje es uno y no dos. */
  const entregaPorDescarga = getStoreType(store.tipoTienda ?? "ROPA").requiereArchivo === true;
  let productosDigitalesSinArchivo = 0;
  let compradoresSinDescargar = 0;
  if (entregaPorDescarga) {
    [productosDigitalesSinArchivo, compradoresSinDescargar] = await Promise.all([
      prisma.product.count({
        where: { storeId: store.id, deletedAt: null, isActive: true, archivoPath: null },
      }),
      /* Sólo los que TODAVÍA pueden bajarlo. Un permiso vencido y sin usar
         también es un problema, pero ya no tiene arreglo desde acá: reenviar el
         mail manda el mismo link, que sigue vencido. Un aviso que no se puede
         resolver es ruido. */
      prisma.digitalDownload.count({
        where: {
          descargas: 0,
          expiresAt: { gt: ahora },
          orderItem: { order: { storeId: store.id } },
        },
      }),
    ]);
  }

  return {
    storeId: store.id,
    tipoTienda: store.tipoTienda,
    logo: store.logo,
    descripcion: store.description,
    isPublished: store.isPublished,
    isVerified: store.isVerified,
    mpConnectedAt: store.mpConnectedAt,
    storeConfig: store.storeConfig,
    cantidadProductos: store._count.products,
    // El plan de afiliados no crea Subscription: sin fila no hay nada vencido.
    estadoSuscripcion: sub ? getSubscriptionStatus(sub) : null,
    onboardingCompletedAt: store.onboardingCompletedAt,
    productosSinFoto,
    cuponesVencidos,
    promosVencidas,
    fbTokenExpiresAt: store.fbTokenExpiresAt,
    // Alcanza con una de las dos para no estar "sin políticas". Las otras dos
    // (términos y privacidad) las genera la plataforma, éstas las escribe quien
    // vende y son las que el comprador busca antes de comprar.
    tienePoliticas: !!(store.policyReturns?.trim() || store.policyShipping?.trim()),
    productosDigitalesSinArchivo,
    compradoresSinDescargar,
  };
});

/**
 * Marca la tienda como "ya terminó de configurarse", si corresponde.
 *
 * Se llama al leer los avisos: la primera vez que estén los ocho pasos queda la
 * fecha, y de ahí en más la barra desaparece para siempre y los triángulos pasan
 * a ser los que avisan. `updateMany` con `onboardingCompletedAt: null` en el
 * where hace de candado: dos pestañas a la vez no la pisan dos veces, y una
 * tienda ya marcada no se vuelve a tocar aunque después se despublique.
 *
 * Devuelve el estado listo para usar, sin necesidad de releer la base.
 */
export async function marcarOnboardingSiCorresponde(estado: EstadoTienda): Promise<EstadoTienda> {
  if (estado.onboardingCompletedAt) return estado;
  if (!pasosTerminados(condicionesTienda(estado))) return estado;

  const ahora = new Date();
  await prisma.store
    .updateMany({
      where: { id: estado.storeId, onboardingCompletedAt: null },
      data: { onboardingCompletedAt: ahora },
    })
    .catch((err) => console.error("[avisos] no se pudo marcar el onboarding", estado.storeId, err));

  return { ...estado, onboardingCompletedAt: ahora };
}

export type CondicionesTienda = {
  esAutos: boolean;
  tieneLogo: boolean;
  tienePlantilla: boolean;
  tieneProductos: boolean;
  tieneMercadoPago: boolean;
  tieneDatosDeCobro: boolean;
  tieneEnvios: boolean;
  tieneDescripcion: boolean;
  estaPublicada: boolean;
  estaVerificada: boolean;
  /** Sin NINGUNA forma de cobrar: ni MercadoPago, ni transferencia, ni efectivo. */
  noPuedeCobrar: boolean;
  /**
   * El rubro entrega un archivo que se descarga: no hay nada que despachar.
   *
   * Sale de la bandera del rubro y no de comparar contra un nombre, igual que
   * el resto: el día que haya un segundo rubro sin envío, esto lo acompaña solo.
   */
  entregaPorDescarga: boolean;
  suscripcionCaida: boolean;
};

/* Lo único que `condicionesTienda` mira. Pedir el `EstadoTienda` entero obligaba
   a quien solo quiere los pasos del onboarding —la pantalla de inicio— a inventar
   contadores que no usa: cinco campos de relleno con el único fin de conformar al
   compilador, que es justo como se cuela un dato mentiroso. */
export type DatosDeConfiguracion = Pick<
  EstadoTienda,
  "tipoTienda" | "logo" | "descripcion" | "isPublished" | "isVerified" | "mpConnectedAt" | "storeConfig" | "cantidadProductos" | "estadoSuscripcion"
>;

export function condicionesTienda(estado: DatosDeConfiguracion): CondicionesTienda {
  const esAutos = estado.tipoTienda === "AUTOS";
  const entregaPorDescarga = getStoreType(estado.tipoTienda ?? "ROPA").requiereArchivo === true;

  let tienePlantilla = false;
  let tieneEnvios = false;
  let tieneDatosDeCobro = false;
  try {
    const cfg = JSON.parse(estado.storeConfig || "{}");
    tienePlantilla = !!cfg.template;
    tieneEnvios = Array.isArray(cfg.shippingMethods);
    const pi = cfg.paymentInfo;
    tieneDatosDeCobro = !!(
      (pi?.transferencia?.enabled && (pi.transferencia.cbu?.length > 0 || pi.transferencia.alias?.length > 0)) ||
      pi?.efectivo?.enabled
    );
  } catch { /* storeConfig roto: se trata como vacío, igual que antes */ }

  const tieneMercadoPago = !!estado.mpConnectedAt;

  return {
    esAutos,
    tieneLogo: !!estado.logo,
    tienePlantilla,
    tieneProductos: estado.cantidadProductos > 0,
    tieneMercadoPago,
    tieneDatosDeCobro,
    tieneEnvios,
    tieneDescripcion: !!estado.descripcion?.trim(),
    estaPublicada: estado.isPublished,
    estaVerificada: estado.isVerified,
    // Las tiendas de autos no cobran por la plataforma: se contacta y se arregla
    // aparte, así que no tener medio de cobro no les rompe nada.
    noPuedeCobrar: !esAutos && !tieneMercadoPago && !tieneDatosDeCobro,
    entregaPorDescarga,
    suscripcionCaida: estado.estadoSuscripcion === "GRACE" || estado.estadoSuscripcion === "EXPIRED",
  };
}

/**
 * ¿Están los ocho pasos hechos EN ESTE MOMENTO?
 *
 * Ojo: esto NO es "ya terminó el onboarding". Es una foto del ahora, y por eso
 * sola no sirve para decidir si callar los avisos — ver `onboardingCompleto`.
 */
export function pasosTerminados(c: CondicionesTienda): boolean {
  const basicos = c.tieneLogo && c.tienePlantilla && c.tieneProductos && c.tieneDescripcion && c.estaPublicada;
  if (c.esAutos) return basicos;
  /* Sin el paso de envíos cuando no hay nada que despachar. Esto no es un
     detalle cosmético: era un paso IMPOSIBLE de tildar, y mientras quede uno
     sin tildar el onboarding nunca se marca terminado. Y mientras no se marque,
     `avisosDeTienda` corta antes de los amarillos: una tienda de descargas no
     iba a ver JAMÁS ninguno de ellos, ni la barra de pasos se le iba a ir de la
     pantalla. Un solo paso de más apagaba media pantalla. */
  const cobro = c.tieneMercadoPago && c.tieneDatosDeCobro;
  if (c.entregaPorDescarga) return basicos && cobro;
  return basicos && cobro && c.tieneEnvios;
}

/**
 * ¿Ya pasó por el armado de la tienda alguna vez?
 *
 * Mientras esto sea `false`, la barra de pasos está en pantalla y los avisos de
 * tienda se callan: no tiene sentido gritarle "no podés cobrar" a alguien que
 * todavía está completando el paso de cobro y ya lo tiene ahí escrito.
 *
 * ── Por qué mira una fecha guardada y no las condiciones ─────────────────────
 * Porque si mirara las condiciones, la regla se comería a sí misma. Lo que
 * enciende un rojo es exactamente lo que deja los pasos incompletos:
 * despublicar la tienda apagaba el aviso de "tu tienda está despublicada".
 * Tres de los cuatro rojos no se mostraban nunca.
 *
 * La fecha se pone una vez, cuando `pasosTerminados` da true por primera vez, y
 * no se borra. A partir de ahí "despublicada" ya no significa "todavía no la
 * publicó" sino "la publicó y se le cayó", que es justo lo que hay que avisar.
 */
export function onboardingCompleto(estado: EstadoTienda): boolean {
  return estado.onboardingCompletedAt !== null;
}

/**
 * Los avisos de la tienda.
 *
 * ── Qué es rojo y qué es amarillo ────────────────────────────────────────────
 * Una sola pregunta, que se responde sola: **¿esto impide vender ahora mismo?**
 * Sí es rojo. No, pero se vende peor, es amarillo.
 *
 * Con ese criterio quedan cuatro rojos y nada más, y eso es a propósito: si hay
 * diez rojos no hay ninguno. "Producto sin foto" duele, pero se vende igual —
 * es amarillo.
 *
 * ── Dónde se ve cada uno ─────────────────────────────────────────────────────
 * El rojo va en el menú lateral Y adentro de la sección. El amarillo SOLO
 * adentro. El menú está siempre a la vista: cuatro triangulitos amarillos fijos
 * se vuelven empapelado en una semana, y el día que aparezca uno rojo tampoco se
 * va a ver. El amarillo igual aparece al entrar a la sección, que es cuando se
 * puede hacer algo al respecto.
 * Quien decide eso es el que dibuja (ver DashboardLayout); acá salen todos.
 */
export function avisosDeTienda(estado: EstadoTienda): Aviso[] {
  const c = condicionesTienda(estado);
  const avisos: Aviso[] = [];

  /* La verificación NO es un paso del onboarding: es de la cuenta, no del armado
     de la tienda. Por eso va antes del corte de abajo y se muestra siempre.
     Vive pegada al nombre en la tarjeta de perfil, no colgada de un item del
     menú, así que es la única excepción a "el amarillo no va en el menú": ahí no
     compite con la navegación, acompaña al sello de verificado que ya está. */
  if (!c.estaVerificada) {
    avisos.push({
      id: "cuenta-sin-verificar",
      nivel: "amarillo",
      seccion: "/dashboard/ajustes",
      titulo: "Cuenta sin verificar",
      detalle: "Las tiendas verificadas muestran un sello que da confianza a quien te compra.",
      href: "/dashboard/ajustes",
    });
  }

  // De acá para abajo, todo lo que la barra de pasos ya está diciendo mientras
  // la tienda se arma por primera vez.
  if (!onboardingCompleto(estado)) return avisos;

  if (c.suscripcionCaida) {
    avisos.push({
      id: "suscripcion-caida",
      nivel: "rojo",
      seccion: "/dashboard/mi-plan",
      titulo: "Tu suscripción venció",
      detalle: "Si no la renovás se te bloquea el panel y tu tienda deja de estar visible.",
      href: "/dashboard/mi-plan",
    });
  }

  if (!c.estaPublicada) {
    avisos.push({
      id: "tienda-despublicada",
      nivel: "rojo",
      seccion: "/dashboard",
      titulo: "Tu tienda está despublicada",
      detalle: "Nadie puede entrar a comprarte hasta que la vuelvas a publicar.",
      href: "/dashboard",
    });
  }

  if (c.noPuedeCobrar) {
    avisos.push({
      id: "sin-medio-de-cobro",
      nivel: "rojo",
      seccion: "/dashboard/pagos",
      titulo: "No tenés ningún medio de cobro",
      detalle: "Ni MercadoPago, ni transferencia, ni efectivo: nadie puede pagarte.",
      href: "/dashboard/pagos",
    });
  }

  /* El rojo de envíos no va donde no hay envío: en un rubro que entrega por
     descarga el checkout se termina igual —lo saltea a propósito— así que este
     aviso sería un rojo permanente por algo que no está roto. Y un rojo que no
     se puede apagar deja de leerse, incluidos los que sí importan. */
  if (!c.esAutos && !c.entregaPorDescarga && !c.tieneEnvios) {
    avisos.push({
      id: "sin-envios",
      nivel: "rojo",
      seccion: "/dashboard/pagos",
      titulo: "No configuraste cómo entregás",
      detalle: "Sin al menos un método de envío o retiro, el checkout no se puede terminar.",
      href: "/dashboard/pagos",
    });
  }

  /* Rojo de verdad: el producto está publicado, se puede comprar, y no hay nada
     que entregar. La compradora paga y espera un mail que no puede llegar.
     Es el único rojo que no se enciende por algo que falta configurar sino por
     algo que ya se puede vender mal. */
  if (c.entregaPorDescarga && estado.productosDigitalesSinArchivo > 0) {
    const uno = estado.productosDigitalesSinArchivo === 1;
    avisos.push({
      id: "productos-sin-archivo",
      nivel: "rojo",
      seccion: "/dashboard/descargas",
      titulo: uno
        ? "Tenés un producto publicado sin archivo"
        : `Tenés ${estado.productosDigitalesSinArchivo} productos publicados sin archivo`,
      detalle: uno
        ? "Se puede comprar y no hay nada que entregar: quien lo pague va a esperar un mail que no llega."
        : "Se pueden comprar y no hay nada que entregar: quien los pague va a esperar un mail que no llega.",
      href: "/dashboard/productos",
    });
  }

  /* ── Amarillos ──────────────────────────────────────────────────────────────
     Se vende igual, pero se vende peor. No van al menú lateral: aparecen al
     entrar a la sección, que es donde se pueden resolver. */

  if (c.entregaPorDescarga && estado.compradoresSinDescargar > 0) {
    const uno = estado.compradoresSinDescargar === 1;
    avisos.push({
      id: "compras-sin-descargar",
      nivel: "amarillo",
      seccion: "/dashboard/descargas",
      titulo: uno ? "Hay una compra sin descargar" : `Hay ${estado.compradoresSinDescargar} compras sin descargar`,
      detalle: uno
        ? "Pagó y nunca bajó el archivo. Puede que el mail le haya caído en spam: desde acá se lo reenviás."
        : "Pagaron y nunca bajaron el archivo. Puede que el mail les haya caído en spam: desde acá se los reenviás.",
      href: "/dashboard/descargas",
    });
  }

  if (estado.productosSinFoto > 0) {
    const uno = estado.productosSinFoto === 1;
    avisos.push({
      id: "productos-sin-foto",
      nivel: "amarillo",
      seccion: "/dashboard/productos",
      titulo: uno ? "Tenés un producto sin foto" : `Tenés ${estado.productosSinFoto} productos sin foto`,
      detalle: uno
        ? "Está publicado y se ve vacío. Una foto es lo primero que mira quien compra."
        : "Están publicados y se ven vacíos. La foto es lo primero que mira quien compra.",
      href: "/dashboard/productos",
    });
  }

  if (!estado.tienePoliticas) {
    avisos.push({
      id: "sin-politicas",
      nivel: "amarillo",
      seccion: "/dashboard/pagos",
      titulo: "No escribiste tus políticas",
      detalle: "Cómo se devuelve y cómo se envía: es lo que la gente busca antes de decidirse.",
      href: "/dashboard/pagos",
    });
  }

  if (!c.tieneDescripcion) {
    avisos.push({
      id: "sin-descripcion",
      nivel: "amarillo",
      seccion: "/dashboard/ajustes",
      titulo: "Tu tienda no tiene descripción",
      detalle: "Es lo que se lee de tu tienda en el listado público y en Google.",
      href: "/dashboard/ajustes",
    });
  }

  if (!c.tieneLogo) {
    avisos.push({
      id: "sin-logo",
      nivel: "amarillo",
      seccion: "/dashboard/ajustes",
      titulo: "Tu tienda no tiene logo",
      detalle: "Aparece en el encabezado de la tienda y en los emails a tus clientes.",
      href: "/dashboard/ajustes",
    });
  }

  if (estado.cuponesVencidos > 0) {
    const uno = estado.cuponesVencidos === 1;
    avisos.push({
      id: "cupones-vencidos",
      nivel: "amarillo",
      seccion: "/dashboard/cupones",
      titulo: uno ? "Tenés un cupón vencido activo" : `Tenés ${estado.cuponesVencidos} cupones vencidos activos`,
      detalle: "Figuran encendidos en tu lista pero ya no se pueden usar. Conviene apagarlos.",
      href: "/dashboard/cupones",
    });
  }

  if (estado.promosVencidas > 0) {
    const una = estado.promosVencidas === 1;
    avisos.push({
      id: "promos-vencidas",
      nivel: "amarillo",
      seccion: "/dashboard/promociones",
      titulo: una ? "Tenés una promoción vencida activa" : `Tenés ${estado.promosVencidas} promociones vencidas activas`,
      detalle: "Ya no aplican en el carrito, pero siguen figurando encendidas.",
      href: "/dashboard/promociones",
    });
  }

  /* Meta. El token de larga duración dura unos 60 días y NO se renueva solo.
     Se avisa desde 7 días antes, porque una vez vencido el catálogo deja de
     sincronizar sin que nada en pantalla lo diga (ver la migración
     20260813210000_add_fb_token_expires_at). */
  if (estado.fbTokenExpiresAt) {
    const diasQueFaltan = Math.floor((estado.fbTokenExpiresAt.getTime() - Date.now()) / 86_400_000);
    if (diasQueFaltan <= 7) {
      avisos.push({
        id: "token-meta-por-vencer",
        nivel: "amarillo",
        seccion: "/dashboard/aplicaciones",
        titulo: diasQueFaltan < 0 ? "Tu conexión con Meta venció" : "Tu conexión con Meta está por vencer",
        detalle: diasQueFaltan < 0
          ? "Tu catálogo dejó de sincronizar con Instagram y Facebook. Volvé a conectarla."
          : `Quedan ${diasQueFaltan} día${diasQueFaltan === 1 ? "" : "s"}. Después, el catálogo deja de sincronizar.`,
        href: "/dashboard/aplicaciones",
      });
    }
  }

  return avisos;
}

/**
 * Atajo para las pantallas del panel: los avisos de UNA sección, listos para
 * pasarle a `<AvisosDeSeccion />`. Deja el enchufe en dos líneas para que
 * agregarlo a una pantalla nueva no sea una excusa para no hacerlo.
 */
export async function avisosParaSeccion(ownerId: string, seccion: string): Promise<Aviso[]> {
  return avisosDeSeccion(await todosLosAvisos(ownerId), seccion);
}

/**
 * La lista completa, para quien la necesita entera: el menú lateral.
 *
 * Va aparte de `avisosParaSeccion` para que una pantalla pueda pedir las dos
 * cosas —lo suyo para el cartel, y el total para pasárselo al menú— sin pagar
 * dos veces: `cargarEstadoTienda` está envuelta en `cache()` de React, así que
 * dentro de un mismo render las dos llamadas comparten una sola consulta.
 */
export async function todosLosAvisos(ownerId: string): Promise<Aviso[]> {
  const inicial = await cargarEstadoTienda(ownerId);
  if (!inicial) return [];
  const estado = await marcarOnboardingSiCorresponde(inicial);
  return avisosDeTienda(estado);
}

/** Solo los que van al menú lateral. Ver el comentario de `avisosDeTienda`. */
export function avisosDelMenu(avisos: Aviso[]): Aviso[] {
  return avisos.filter((a) => a.nivel === "rojo");
}

/** Los de una sección concreta, para pintarlos adentro. Rojos primero. */
export function avisosDeSeccion(avisos: Aviso[], seccion: string): Aviso[] {
  return avisos
    .filter((a) => a.seccion === seccion)
    .sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === "rojo" ? -1 : 1));
}
