import { imagenValida } from "@/lib/productos-digitales";

/* ══════════════════════════════════════════════════════════════════════════
   LA CONFIGURACIÓN DE UNA CUENTA DIGITAL
   ══════════════════════════════════════════════════════════════════════════

   Acá va lo del NEGOCIO. Lo de la persona —nombre, teléfono, contraseña— ya vive
   en Mi cuenta, y mezclarlos deja a cualquiera buscando su dirección de venta
   adentro de sus datos personales.

   Son cuatro cosas y las cuatro se ven de afuera:

     1. Con qué cobra (Mercado Pago).
     2. Con qué nombre y logo la ve el comprador.
     3. En qué dirección viven sus páginas de venta.
     4. A qué WhatsApp escribe el comprador si algo sale mal.

   Este archivo es puro —no toca la base ni la red— para que lo pueda importar la
   pantalla y decir qué está mal al lado del campo, con las MISMAS reglas que
   aplica el servidor. */

export const LARGO_NOMBRE = 60;
/**
 * El dominio de la plataforma, sin `www` y sin protocolo: `tiendaapps.com`.
 *
 * ⚠️ Vive acá y no en `direccion-digital` por un motivo de empaquetado: aquel
 * archivo importa Prisma, así que una PANTALLA que lo importe se lleva Prisma
 * al navegador. Esto lo necesitan las pantallas para dibujar la dirección, y es
 * una función pura que sólo lee una variable de entorno.
 */
export function dominioDeLaPlataforma(): string {
  const crudo = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.tiendaapps.com";
  try {
    return new URL(crudo).hostname.replace(/^www\./, "");
  } catch {
    return "tiendaapps.com";
  }
}

export const SLUG_MINIMO = 3;
export const SLUG_MAXIMO = 40;

/**
 * Las palabras que un slug no puede ser.
 *
 * Dos motivos distintos y los dos importan:
 *
 *   - **Choque técnico.** El middleware mapea subdominio → tienda. Un slug
 *     "www" o "api" se convierte en un subdominio que ya significa otra cosa.
 *   - **Suplantación.** "soporte", "pagos" o "tiendaapps" en la dirección hacen
 *     que una página de un tercero parezca nuestra. Es la mitad del trabajo de
 *     un engaño ya hecha, y encima con nuestro dominio dándole respaldo.
 *
 * La lista es corta a propósito: prohibir de más le saca nombres legítimos a
 * gente que no hizo nada.
 */
export const SLUGS_RESERVADOS = [
  "api", "www", "app", "cdn", "mail", "admin", "root", "static", "assets",
  "dashboard", "digitales", "afiliados", "mi-cuenta", "tienda", "tiendas",
  "login", "registro", "logout", "checkout", "pago", "pagos", "carrito",
  "ayuda", "soporte", "precios", "blog", "legal", "terminos", "privacidad",
  "tiendaapps", "null", "undefined", "test",
] as const;

/**
 * El slug tal como se va a guardar.
 *
 * Se normaliza y NO se rechaza lo que se puede arreglar solo: alguien que
 * escribe "Mis Guías" quiso decir "mis-guias", y retarlo por una mayúscula es
 * pedirle que adivine un formato que nunca le explicamos. Lo que no se puede
 * arreglar solo —queda vacío, es reservado, es muy corto— sí se rechaza.
 */
export function normalizarSlug(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    // Los acentos primero: "guías" tiene que terminar en "guias" y no en "gu-as".
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAXIMO)
    // El recorte puede dejar un guion colgando al final.
    .replace(/-+$/, "");
}

/** `null` si el slug sirve; el problema en castellano si no. */
export function validarSlug(valor: unknown): string | null {
  if (typeof valor !== "string") return "La dirección no es válida";

  const s = normalizarSlug(valor);

  if (s.length === 0) {
    return "La dirección tiene que tener al menos una letra o un número";
  }
  if (s.length < SLUG_MINIMO) {
    return `La dirección tiene que tener al menos ${SLUG_MINIMO} caracteres`;
  }
  if ((SLUGS_RESERVADOS as readonly string[]).includes(s)) {
    return "Esa dirección está reservada. Probá con otra.";
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════════════════
   EL NOMBRE EN EL CHECKOUT
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Es más corto que el de la marca a propósito.
 *
 * Este nombre lo ve el comprador mientras paga y en la página de descarga, y es
 * lo que le va a servir para reconocer el cobro. Un nombre de marca largo o
 * gracioso ahí adentro no ayuda: en ese momento la pregunta es "¿esto es lo que
 * compré?", y la respuesta tiene que entrar de un vistazo.
 */
export const LARGO_CHECKOUT = 40;

/* ══════════════════════════════════════════════════════════════════════════
   EL MAIL DE SOPORTE
   ══════════════════════════════════════════════════════════════════════════ */

/** El tope de la norma para una dirección de correo entera. */
export const LARGO_EMAIL = 254;

/**
 * Una dirección de correo que se pueda usar de verdad.
 *
 * La comprobación es a propósito **floja**: algo antes de la arroba, algo
 * después, un punto en el dominio y ningún espacio. Las expresiones regulares
 * "completas" para correo son famosas por rechazar direcciones válidas —con
 * signo de más, con guiones, con dominios nuevos— y acá rechazar de más tiene
 * un costo concreto: es el único lugar donde alguien que pagó y no recibió el
 * archivo puede reclamar. Vale más aceptar una rara que bloquear una buena.
 *
 * El vacío se considera válido: es opcional. Quien lo necesite obligatorio lo
 * exige antes de llamar acá.
 */
export function validarEmail(valor: unknown): string | null {
  if (typeof valor !== "string") return "El correo no es válido";
  const e = valor.trim();
  if (e.length === 0) return null;
  if (e.length > LARGO_EMAIL) return `El correo no puede pasar de ${LARGO_EMAIL} caracteres`;
  if (/\s/.test(e)) return "El correo no puede tener espacios";
  if (!/^[^@]+@[^@]+\.[^@.]+$/.test(e)) return "Escribí un correo completo, con arroba y punto";
  return null;
}

/* ══════════════════════════════════════════════════════════════════════════
   EL CONTEXTO DE LA IA
   ══════════════════════════════════════════════════════════════════════════

   El NICHO de la cuenta. Es lo que la IA usa como referencia para todo lo que
   genera —el ebook, los bonos, los upsells y los textos de venta— así que una
   palabra de más o de menos acá cambia todo lo que salga después.

   Los dos topes son cortos a propósito. No es por la base: es porque este texto
   entra en cada pedido a la IA, y un contexto largo se paga en cada generación
   y encima diluye lo importante. Dos frases que dicen qué se vende funcionan
   mejor que dos párrafos. */

export const LARGO_IA_PRODUCTO = 120;
export const LARGO_IA_DESCRIPCION = 500;

/** `null` si el contexto sirve; el problema en castellano si no. */
export function validarContextoIA(c: { producto?: unknown; descripcion?: unknown }): string | null {
  if (c.producto !== undefined && c.producto !== null) {
    if (typeof c.producto !== "string") return "El producto principal no es válido";
    const p = c.producto.trim();
    /* Se permite vacío —es "todavía no lo definí"— pero no una sola letra: eso
       no es un nicho, es un dedo apoyado en el teclado, y la IA generaría un
       ebook entero a partir de eso. */
    if (p.length > 0 && p.length < 3) return "Contá un poco más qué vendés: con una letra la IA no puede trabajar";
    if (p.length > LARGO_IA_PRODUCTO) return `El producto principal no puede pasar de ${LARGO_IA_PRODUCTO} caracteres`;
  }

  if (c.descripcion !== undefined && c.descripcion !== null) {
    if (typeof c.descripcion !== "string") return "La descripción no es válida";
    if (c.descripcion.length > LARGO_IA_DESCRIPCION) {
      return `La descripción no puede pasar de ${LARGO_IA_DESCRIPCION} caracteres`;
    }
  }

  return null;
}

/** `null` si el nombre sirve; el problema en castellano si no. */
export function validarNombre(valor: unknown): string | null {
  if (typeof valor !== "string") return "El nombre no es válido";
  const n = valor.trim();
  if (n.length < 2) return "El nombre tiene que tener al menos 2 letras";
  if (n.length > LARGO_NOMBRE) return `El nombre no puede pasar de ${LARGO_NOMBRE} caracteres`;
  return null;
}

/**
 * El nombre del checkout. Opcional: vacío quiere decir "usá el de la marca".
 *
 * Por eso NO se le exige un mínimo de dos letras como al de la marca — borrarlo
 * es una respuesta legítima y significa volver al de siempre, no dejar el
 * checkout sin nombre.
 */
export function validarCheckoutName(valor: unknown): string | null {
  if (typeof valor !== "string") return "El nombre del checkout no es válido";
  const n = valor.trim();
  if (n.length === 0) return null;
  if (n.length > LARGO_CHECKOUT) {
    return `El nombre del checkout no puede pasar de ${LARGO_CHECKOUT} caracteres`;
  }
  return null;
}

/**
 * El logo, con la misma lista blanca que la portada de un producto.
 *
 * Se importa en vez de copiarse: dos listas blancas se desincronizan de a una, y
 * el agujero que dejan es el mismo en los dos casos —una dirección ajena adentro
 * de una página nuestra es un rastreador de un tercero mirando quién entra.
 */
export const logoValido = imagenValida;

/* ══════════════════════════════════════════════════════════════════════════
   EL DOMINIO PROPIO DEL PRODUCTO
   ══════════════════════════════════════════════════════════════════════════

   `mecanicafacil.com` apuntando a un producto. Viene con Pro y es la mitad de
   arriba de la dirección: la de abajo —`mecanica.tiendaapps.com`— la tienen los
   tres planes y no se apaga nunca. El dominio se SUMA, no reemplaza.

   ⚠️ Esto está acá y no en `dominio-digital` por el mismo motivo que
   `dominioDeLaPlataforma`: aquel archivo importa Prisma, y la pantalla que
   valida mientras se escribe se lo llevaría entero al navegador. Acá adentro no
   hay nada más que texto.                                                    */

export const LARGO_DOMINIO = 253;

/**
 * Cuántos días en Free aguanta un dominio propio anotado antes de soltarse, y
 * cuántos días antes se avisa. La regla entera está en `dominio-digital`:
 * sin Pro el dominio redirige, no se rompe; se suelta recién a los 90 días
 * para liberar el techo de Vercel (50 dominios por proyecto). Decidido el
 * 14/09/26. Están acá porque la pantalla del dominio los dice.
 */
export const DIAS_DE_DOMINIO_EN_FREE = 90;
export const DIAS_DE_AVISO_DEL_DOMINIO = 7;

/**
 * Sufijos donde el "apex" tiene tres etiquetas y no dos: `mitienda.com.ar`.
 *
 * ⚠️ Esta lista NO decide nada de seguridad — sólo elige QUÉ INSTRUCCIÓN de DNS
 * se le muestra a la persona (una A para el dominio pelado, un CNAME para un
 * subdominio). Si acá se erra, se muestra el cartel equivocado y el dominio no
 * levanta hasta corregirlo; no se abre ninguna puerta.
 *
 * Es corta a propósito: la lista completa de sufijos públicos son miles de
 * líneas que habría que mantener al día, y este ecosistema vende en Argentina.
 * Cuando Vercel contesta, mandan sus valores y esto ni se usa.
 */
export const SUFIJOS_COMPUESTOS = [
  "com.ar", "net.ar", "org.ar", "gob.ar", "edu.ar", "tur.ar", "int.ar",
  "com.br", "com.uy", "com.py", "com.bo", "com.pe", "com.co", "com.ve",
  "com.mx", "com.cl", "co.uk", "org.uk", "com.es", "com.au",
] as const;

/** Los que no son dominios de nadie: no tiene sentido dejarlos escribir. */
const TLD_QUE_NO_SALEN_A_INTERNET = [
  "local", "localhost", "test", "invalid", "example", "internal", "lan",
  "home", "arpa", "onion",
];

/**
 * El dominio tal como se va a guardar: sin protocolo, sin barra, sin puerto.
 *
 * Se normaliza y no se rechaza lo que se puede arreglar solo. La gente copia y
 * pega `https://www.mitienda.com/` de la barra del navegador — retarla por eso
 * es pedirle que entienda una diferencia que nunca le explicamos.
 *
 * ⚠️ El `www.` NO se saca. Para el DNS, `mitienda.com` y `www.mitienda.com` son
 * dos direcciones distintas y se configuran distinto (una A contra un CNAME).
 * Sacarlo por nuestra cuenta le daría instrucciones para una dirección que no es
 * la que escribió.
 */
export function normalizarDominio(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")   // el protocolo, sea cual sea
    .replace(/^[^/@]*@/, "")                   // un "user@" pegado de un mail
    .split("/")[0]                              // todo lo que venga después de la barra
    .split("?")[0]
    .split("#")[0]
    .replace(/:\d+$/, "")                      // el puerto
    .replace(/\.+$/, "")                       // el punto final del FQDN
    .slice(0, LARGO_DOMINIO);
}

/** `null` si el dominio sirve; el problema en castellano si no. */
export function validarDominio(valor: unknown, dominioNuestro = dominioDeLaPlataforma()): string | null {
  if (typeof valor !== "string") return "El dominio no es válido";

  /* ⚠️ El largo se mide sobre lo ESCRITO, no sobre lo normalizado. El
     normalizador recorta a 253, así que medirlo después nunca da largo: un texto
     de 400 caracteres entraría recortado y se conectaría un dominio que la
     persona no escribió. */
  if (valor.trim().length > LARGO_DOMINIO) return "Ese dominio es demasiado largo";

  const d = normalizarDominio(valor);

  if (d.length === 0) return "Escribí el dominio que querés conectar";

  /* Un asterisco es un comodín: `*.loquesea.com` toma TODOS los subdominios de
     una vez. Además Vercel lo obliga a pasar por sus nameservers, que es un
     trámite muy distinto del que explica la pantalla. */
  if (d.includes("*")) return "No se pueden conectar dominios con asterisco";

  if (!/^[a-z0-9.-]+$/.test(d)) {
    return "El dominio sólo puede tener letras sin acento, números, puntos y guiones";
  }
  if (!d.includes(".")) return "Falta la terminación del dominio, por ejemplo .com o .com.ar";

  const etiquetas = d.split(".");
  for (const e of etiquetas) {
    if (e.length === 0) return "El dominio tiene dos puntos seguidos";
    if (e.length > 63) return "Una de las partes del dominio es demasiado larga";
    if (e.startsWith("-") || e.endsWith("-")) return "Ninguna parte del dominio puede empezar ni terminar con guion";
  }

  /* Una IP no es un dominio: no se le puede emitir certificado ni verificar. */
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(d)) return "Eso es una dirección IP, no un dominio";

  const tld = etiquetas[etiquetas.length - 1];
  if (tld.length < 2) return "La terminación del dominio es demasiado corta";
  if (!/^[a-z]{2,}$/.test(tld) && !tld.startsWith("xn--")) {
    return "La terminación del dominio no es válida";
  }
  if (TLD_QUE_NO_SALEN_A_INTERNET.includes(tld)) {
    return "Ese dominio no existe en internet. Tiene que ser uno que hayas comprado.";
  }

  /* ⚠️ El nuestro no. Sería dejar que alguien se apropie de un pedazo de la
     plataforma, y encima con nuestro certificado dándole respaldo. */
  if (d === dominioNuestro || d.endsWith(`.${dominioNuestro}`)) {
    return "Esa dirección ya la tenés: es la de arriba, y viene con todos los planes. Acá va un dominio tuyo.";
  }

  return null;
}

/** ¿Es el dominio pelado (`mitienda.com`) o un subdominio (`www.mitienda.com`)? */
export function esDominioPelado(dominio: string): boolean {
  const etiquetas = normalizarDominio(dominio).split(".");
  const dosUltimas = etiquetas.slice(-2).join(".");
  const necesarias = (SUFIJOS_COMPUESTOS as readonly string[]).includes(dosUltimas) ? 3 : 2;
  return etiquetas.length === necesarias;
}
