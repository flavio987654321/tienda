import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendArrepentimientoEmails } from "@/lib/email";
import {
  errorDeLosDatos,
  numeroDeConstancia,
  MAX_EMAIL,
  MAX_MOTIVO,
  MAX_NOMBRE,
  MAX_REFERENCIA,
  MAX_TELEFONO,
} from "@/lib/arrepentimiento";

/**
 * Toma una solicitud de arrepentimiento y devuelve su constancia.
 *
 * Sin sesión, a propósito: la Resolución 424/2020 pide que el botón se pueda usar
 * **sin registrarse**. Quien compró como invitado tiene el mismo derecho que
 * quien tiene cuenta, y obligarlo a crear una para ejercerlo sería trabárselo.
 *
 * Por eso mismo esto es una puerta abierta a internet, y va protegida como tal:
 * tope por IP y captcha. Ver el orden más abajo, que importa.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  /* 5 por hora por IP. Es holgado para una persona —lo normal es una— y corta
     al que quiera usar esto para mandarle mails a una tienda toda la tarde. */
  if (!(await checkRateLimit(`arrepentimiento:${ip}`, 5, 60 * 60_000))) {
    return NextResponse.json(
      { error: "Ya enviaste varias solicitudes. Si necesitás ayuda, escribile directamente a la tienda." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  /* Honeypot: un campo escondido que una persona no ve y un bot llena solo.
     Se le contesta que salió bien —con un número que no existe— para que no
     aprenda cuál es el campo que lo delata. Es lo que frena al bot ANTES del
     captcha, y este formulario es el más goloso de los tres que hay públicos:
     cada envío manda DOS mails. */
  if (body.website) {
    /* Queda registrado, y acá esa línea de log importa más que en los otros
       formularios: si algún día un gestor de contraseñas le completa el campo
       trampa a una persona de verdad —hay gestores que rellenan un campo
       llamado "website"— su solicitud se descarta sin que ella se entere, y lo
       que se descarta es el ejercicio de un derecho con un plazo corriendo.
       Con esto, al menos queda el rastro para recuperarla. */
    console.warn(
      "[arrepentimiento] descartada por el campo trampa:",
      String(body.email ?? "").slice(0, 200)
    );
    return NextResponse.json({ ok: true, numero: numeroDeConstancia() });
  }

  /* Cada campo se corta a su tope ANTES de mirarlo. El corte no reemplaza a la
     validación —`errorDeLosDatos` sigue abajo— pero garantiza que nada de largo
     desconocido llegue a una consulta, a un mail o a un log, aunque mañana
     alguien mueva una validación de lugar. */
  const nombre = String(body.nombre ?? "").trim().slice(0, MAX_NOMBRE);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, MAX_EMAIL);
  const telefono = String(body.telefono ?? "").trim().slice(0, MAX_TELEFONO);
  const referencia = String(body.referencia ?? "").trim().slice(0, MAX_REFERENCIA);
  const motivo = String(body.motivo ?? "").trim().slice(0, MAX_MOTIVO);
  /* El slug va a una consulta y a un log. A la consulta entra parametrizado, así
     que por ahí no se cuela nada; el tope es para que no llegue un texto enorme
     ni con saltos de línea, que en un log sirven para escribir renglones falsos
     y ensuciar lo que uno mira cuando algo pasa. */
  const slug = String(body.slug ?? "").trim().replace(/[^a-z0-9-]/gi, "").slice(0, 120);

  const problema = errorDeLosDatos({ nombre, email, telefono, referencia, motivo });
  if (problema) return NextResponse.json({ error: problema }, { status: 400 });

  /* El captcha va AL FINAL, después de validar los campos. El token es de un
     solo uso: si se gastara antes y los campos estuvieran mal, la persona
     tendría que resolver el captcha de nuevo para corregir una letra. Es el
     mismo orden que /api/contacto, y por el mismo motivo. */
  if (!(await verifyTurnstile(body.turnstileToken, ip, "arrepentimiento"))) {
    return NextResponse.json(
      { error: "No pudimos verificar que sos una persona. Probá de nuevo." },
      { status: 400 }
    );
  }

  /* Contra quién es. Sin slug, la solicitud es contra TiendaApps: la plataforma
     también vende —las suscripciones— y también necesita el botón. */
  let tienda: { id: string; name: string; ownerEmail: string } | null = null;
  if (slug) {
    const encontrada = await prisma.store.findFirst({
      where: { slug, isActive: true },
      select: { id: true, name: true, owner: { select: { email: true } } },
    });
    /* Si el slug no existe NO se falla: se toma igual, como si fuera contra la
       plataforma. Del otro lado hay alguien ejerciendo un derecho con un plazo
       corriendo; perder su solicitud porque la dirección estaba mal escrita
       sería cargarle a esa persona un error nuestro. Alguien la va a leer. */
    if (encontrada) {
      tienda = { id: encontrada.id, name: encontrada.name, ownerEmail: encontrada.owner.email };
    } else {
      console.error("[arrepentimiento] slug sin tienda:", slug);
    }
  }

  /* El número es único en la base. Con 32 caracteres posibles y 8 lugares las
     chances de repetirlo son ínfimas, pero "ínfimas" no es "ninguna" y el que
     pierde es quien se queda sin constancia. Tres intentos y listo. */
  let creado: { numero: string; createdAt: Date } | null = null;
  for (let intento = 0; intento < 3 && !creado; intento++) {
    try {
      creado = await prisma.arrepentimiento.create({
        data: {
          numero: numeroDeConstancia(),
          storeId: tienda?.id ?? null,
          nombre,
          email,
          telefono: telefono || null,
          referencia,
          motivo: motivo || null,
        },
        select: { numero: true, createdAt: true },
      });
    } catch (err) {
      const esChoqueDeNumero =
        typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
      if (!esChoqueDeNumero) {
        console.error("[arrepentimiento] no se pudo guardar:", err);
        return NextResponse.json(
          { error: "No pudimos registrar tu solicitud. Probá de nuevo en un momento." },
          { status: 500 }
        );
      }
    }
  }

  if (!creado) {
    console.error("[arrepentimiento] tres choques de número seguidos");
    return NextResponse.json(
      { error: "No pudimos registrar tu solicitud. Probá de nuevo en un momento." },
      { status: 500 }
    );
  }

  /* El mail va DESPUÉS de guardar y su falla NO tira la solicitud abajo.
     La constancia ya existe en la base con su número y su fecha, que es lo que
     vale si mañana hay un reclamo. Si además el correo no sale, eso es un
     problema nuestro — no puede convertirse en un "no se registró" en la cara de
     quien está ejerciendo un derecho con un plazo corriendo. */
  try {
    await sendArrepentimientoEmails({
      numero: creado.numero,
      fecha: creado.createdAt,
      nombre,
      email,
      telefono,
      referencia,
      motivo,
      tienda: tienda ? { nombre: tienda.name, email: tienda.ownerEmail } : null,
    });
  } catch (err) {
    console.error("[arrepentimiento] la solicitud quedó guardada pero el mail no salió:", creado.numero, err);
  }

  return NextResponse.json({ ok: true, numero: creado.numero });
}
