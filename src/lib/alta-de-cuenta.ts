import { prisma } from "@/lib/prisma";
import { validarTelefono } from "@/lib/telefono";
import { CURRENT_TERMS_VERSION } from "@/lib/legal";
import { altaDigitalFree, altaDigitalFreeSinPrueba, altaDigitalConPrueba } from "@/lib/subscription";
import { TIERS_DIGITALES, type TierDigital } from "@/lib/planes-digitales";
import { estaLibre } from "@/lib/direccion-digital";
import { DIGITALES_ABIERTO } from "@/lib/planLimits";

/**
 * Lo que comparten las dos puertas de alta: el formulario con mail y
 * contraseña (`/api/auth/registro`) y la de Google (`/api/auth/registro/google`).
 *
 * Vive acá para que las dos validen lo MISMO. Si la de Google tuviera su propia
 * copia, el día que se cambie una regla —un plan nuevo, un tope de caracteres—
 * una de las dos quedaría dejando pasar lo que la otra rechaza.
 */

export type TipoDeCuenta = "OWNER" | "SELLER" | "BUYER" | "DIGITAL";

export type DatosDeAlta = {
  name: string;
  phone: string | null;
  type: TipoDeCuenta;
  tierDigital: TierDigital;
  billing: "MONTHLY" | "ANNUAL";
  tier: "BASIC" | "PREMIUM";
  storeName: string | null;
};

/* El tipo de cuenta sale de una tabla y no de una cadena de ternarios.

   El ternario que había en el registro terminaba en `: "OWNER"`, o sea que
   CUALQUIER valor desconocido creaba una cuenta de tienda. Al sumar el cuarto
   tipo, pedir una cuenta digital creaba una cuenta DE TIENDA —con su tienda
   vacía y su prueba de 7 días corriendo— y sin ningún error.

   El `hasOwnProperty` es porque `accountType` llega del navegador, y sin él un
   valor como "constructor" devuelve algo heredado del prototipo.

   Sin `accountType` sigue siendo OWNER, que es como se comportaba antes. */
const TIPOS_DE_CUENTA: Record<string, TipoDeCuenta> = {
  owner: "OWNER",
  seller: "SELLER",
  buyer: "BUYER",
  digital: "DIGITAL",
};

/** Valida todo lo del alta que no es el mail, la contraseña ni el captcha. */
export function validarDatosDeAlta(
  body: Record<string, unknown>,
): { ok: true; datos: DatosDeAlta } | { ok: false; error: string } {
  const { name, phone, accountType, billing, tier, digitalTier, storeName, termsAccepted, ageConfirmed } = body;

  if (!termsAccepted || !ageConfirmed) {
    return { ok: false, error: "Debés aceptar los términos y condiciones y confirmar tu edad para continuar." };
  }
  if (typeof name !== "string" || !name.trim()) {
    return { ok: false, error: "Todos los campos son requeridos" };
  }
  if (name.trim().length > 100) {
    return { ok: false, error: "El nombre no puede superar 100 caracteres" };
  }

  let telefono: string | null = null;
  if (phone !== undefined && phone !== null) {
    if (typeof phone !== "string") return { ok: false, error: "Teléfono inválido" };
    /* La regla vive en `lib/telefono`, que usa también la ruta que lo EDITA
       después: el número que no se podía cargar al crear la cuenta se guardaba
       igual entrando por `/api/perfil`. */
    const problemaTelefono = validarTelefono(phone);
    if (problemaTelefono) return { ok: false, error: problemaTelefono };
    telefono = phone.trim();
  }

  let type: TipoDeCuenta = "OWNER";
  if (accountType !== undefined && accountType !== null) {
    if (typeof accountType !== "string" || !Object.prototype.hasOwnProperty.call(TIPOS_DE_CUENTA, accountType)) {
      return { ok: false, error: "Tipo de cuenta inválido" };
    }
    type = TIPOS_DE_CUENTA[accountType];
  }
  if (type === "DIGITAL" && !DIGITALES_ABIERTO) {
    return { ok: false, error: "Las cuentas de Productos Digitales todavía no están disponibles." };
  }

  /* El plan digital, contra la lista real. Con `find` sobre un array y no sobre
     un objeto: no hay prototipo del que heredar. Lo que no esté se rechaza, y
     sin plan elegido es FREE — nunca uno pago. Y aun si esto se aflojara, el
     alta paga sale de `altaDigitalConPrueba`, que devuelve TRIAL y jamás ACTIVE. */
  let tierDigital: TierDigital = "FREE";
  if (type === "DIGITAL" && digitalTier !== undefined && digitalTier !== null) {
    const elegido = TIERS_DIGITALES.find((t) => t === digitalTier);
    if (!elegido) return { ok: false, error: "Plan inválido" };
    tierDigital = elegido;
  }

  let tienda: string | null = null;
  if (type === "OWNER") {
    if (typeof storeName !== "string" || !storeName.trim()) {
      return { ok: false, error: "El nombre de la tienda es requerido" };
    }
    if (storeName.trim().length > 80) {
      return { ok: false, error: "El nombre de la tienda no puede superar 80 caracteres" };
    }
    tienda = storeName.trim();
  }

  return {
    ok: true,
    datos: {
      name: name.trim(),
      phone: telefono,
      type,
      tierDigital,
      billing: billing === "ANNUAL" ? "ANNUAL" : "MONTHLY",
      tier: tier === "PREMIUM" ? "PREMIUM" : "BASIC",
      storeName: tienda,
    },
  };
}

export function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * ¿El nombre de tienda está tomado? Devuelve el error para mostrar, o null.
 *
 * ⚠️ `estaLibre` y no `store.findUnique`: `algo.tiendaapps.com` puede ser una
 * tienda o un producto digital, en dos tablas distintas, y el middleware
 * desempata a favor de la tienda. Preguntando sólo por `Store`, una tienda nueva
 * se llevaba puesta la dirección de un producto. Ver `lib/direccion-digital`.
 */
export async function nombreDeTiendaTomado(storeName: string): Promise<string | null> {
  const baseSlug = toSlug(storeName) || "tienda";
  const [slugLibre, nameExists] = await Promise.all([
    estaLibre(baseSlug),
    prisma.store.findFirst({ where: { name: { equals: storeName, mode: "insensitive" } }, select: { id: true } }),
  ]);
  if (!slugLibre || nameExists) return "Ya existe una tienda con un nombre muy similar. Elegí un nombre diferente.";
  return null;
}

/**
 * ⚠️ Pregunta por LAS DOS tablas, con `estaLibre`. Un nombre ocupado por un
 * producto digital está ocupado igual: devolver uno tomado no da un error — le
 * saca la dirección al que la tenía.
 */
async function uniqueStoreSlug(storeName: string): Promise<string> {
  const base = toSlug(storeName) || "tienda";
  if (await estaLibre(base)) return base;
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}-${i}`;
    if (await estaLibre(candidate)) return candidate;
  }
  // Fallback con timestamp si los 99 slots están ocupados (prácticamente imposible)
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Los campos del perfil nuevo: rol, términos, teléfono, y la tienda o la
 * suscripción que le tocan. Sirve tanto para `user.create` como para el
 * `update` que completa una cuenta de Google.
 */
export async function perfilDeAlta(
  datos: DatosDeAlta,
  ip: string,
  /* Este mail ya usó la prueba de este producto en una cuenta que eliminó
     (ver `lib/prueba-repetida`): la tienda nace con la prueba vencida —para
     usarla, elige un plan— y la cuenta digital nace en Free con la prueba
     gastada. */
  { sinPrueba = false }: { sinPrueba?: boolean } = {},
) {
  const now = Date.now();
  const trialEndsAt = new Date(sinPrueba ? now : now + 7 * 24 * 60 * 60 * 1000);
  return {
    name: datos.name,
    role: datos.type,
    termsAcceptedAt: new Date(),
    termsVersion: CURRENT_TERMS_VERSION,
    termsAcceptedIp: ip,
    // Acaba de aceptar la versión vigente: no tiene por qué recibir el mail de
    // "actualizamos los términos" de esa misma versión.
    termsNotifiedVersion: CURRENT_TERMS_VERSION,
    ...(datos.phone ? { phone: datos.phone } : {}),
    ...(datos.type === "OWNER" && datos.storeName
      ? { store: { create: { name: datos.storeName, slug: await uniqueStoreSlug(datos.storeName) } } }
      : {}),
    /* Quién arranca con suscripción y cuál.
       - OWNER   → su prueba de 7 días, que al vencer le cierra la tienda.
       - DIGITAL → Free, sin tarjeta y sin vencimiento; o la prueba de Starter
                   o Pro si eligió uno. Ver `altaDigitalFree`.
       - SELLER  → el plan de afiliados es gratuito y no crea Subscription.
       - BUYER   → tampoco. */
    ...(datos.type === "OWNER"
      ? {
          subscription: {
            create: {
              role: "OWNER" as const,
              plan: datos.billing,
              status: "TRIAL" as const,
              trialEndsAt,
              tier: datos.tier,
            },
          },
        }
      : datos.type === "DIGITAL"
      ? {
          subscription: {
            create: sinPrueba
              ? { ...altaDigitalFreeSinPrueba() }
              : datos.tierDigital === "FREE"
                ? { ...altaDigitalFree() }
                : { ...altaDigitalConPrueba(datos.tierDigital, datos.billing) },
          },
        }
      : {}),
  };
}
