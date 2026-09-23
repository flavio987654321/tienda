"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { textoQueAcepto } from "@/lib/consentimiento-digital";
import { origenAnotado } from "@/lib/visitas-digitales";
import { celularArgentino } from "@/lib/ventas-digitales";
import { descuentoDe, normalizarCodigo, textoDelDescuento, type TipoDeCupon } from "@/lib/cupones-digitales";
import { venceEnDelToken, cuentaRegresiva } from "@/lib/oferta-salida";
import { venceEnDelTokenDeBienvenida } from "@/lib/bienvenida";
import { precioDelUpsell, venceEnDelTokenDeUpsell, elTokenDeUpsellMasViejo, claveDeOfertaUpsell, type OfertaDeUpsellEnPantalla } from "@/lib/oferta-upsell";
import { guardarPlazo } from "@/lib/plazo-en-el-navegador";
import { useAhora } from "@/lib/reloj-compartido";
import CartelDeSalida from "@/components/digitales/CartelDeSalida";
import { guardarTokenDeBienvenida } from "@/components/digitales/BarraDeBienvenida";
import { Loader2, Lock, ShieldCheck, Package, Check, AlertTriangle, Ticket, Clock } from "lucide-react";

/**
 * El formulario de pago.
 *
 * ── Un solo campo obligatorio ───────────────────────────────────────────────
 *
 * El mail, y sólo porque es a donde va el archivo. La competencia pide cuatro
 * —mail, nombre, apellido y teléfono— y los cuatro obligatorios; para entregar
 * un PDF hace falta uno. Cada campo de más entre el botón y el pago es gente que
 * se va, y ninguno de los otros tres entrega nada.
 *
 * Los otros dos están y son OPCIONALES, cada uno con el para qué al lado:
 *
 *   - Nombre y apellido: para saludar en el mail, y para que quien vende sepa
 *     quién le compró. Entero en un solo campo; donde hace falta partido —la
 *     lista para Meta Ads— se parte solo.
 *   - Celular: para que puedan escribirle por WhatsApp si hay un problema con
 *     la compra, y —si la persona lo deja— para recuperar el carrito por ahí.
 *     Se guarda en la ORDEN, no en la cuenta de quien compra: es el teléfono
 *     de ESTA compra. Ver el comentario en `schema.prisma` y la política.
 *
 * Que el para qué esté al lado del campo no es cortesía: la ley 25.326 pide
 * que el dato se pida para un fin declarado.
 *
 * ── Los números NO se calculan acá ──────────────────────────────────────────
 *
 * Bueno: casi. Acá se suma para MOSTRAR, y el servidor vuelve a sumar para
 * COBRAR, con la misma función. Si los dos números no coincidieran, manda el del
 * servidor — pero no pueden no coincidir, porque los precios de esta pantalla
 * los puso el servidor y lo único que viaja de vuelta son identificadores.
 */

/**
 * La oferta de salida, ya decidida por el servidor: qué se ofrece y el
 * token con la hora en que se mostró (ver `lib/oferta-salida`).
 */
export type OfertaEnElCheckout = {
  titulo: string; texto: string; boton: string; token: string;
} & (
  | { tipo: "DESCUENTO"; codigo: string; porcentaje: number; nombre: string; imagen: string | null }
  | { tipo: "PRODUCTO"; producto: { nombre: string; precio: number; descripcion: string | null; imagen: string | null; href: string } }
);

/**
 * El precio de bienvenida de ESTA visita, ya decidido por el servidor
 * (`bienvenidaDeLaVisita`): el cupón que aplica solo y el plazo firmado.
 * Null = no hay (apagado, sin plan, o esta persona ya lo tuvo y venció).
 */
export type BienvenidaEnElCheckout = { productId: string; codigo: string; porcentaje: number; token: string; texto: string };

type Bono = { id: string; nombre: string; vale: number };
type Upsell = {
  id: string; nombre: string; descripcion: string | null;
  /**
   * `precio` es lo que sale con la oferta puesta y `regular` el precio de
   * lista, o null si no tiene. Y esos dos son TODO lo que hace falta para
   * saber si entra en la oferta del reloj: `regular !== null` ya significa
   * "tiene a qué precio volver". Una tercera bandera diciendo lo mismo es
   * un dato de más que algún día va a decir otra cosa.
   */
  precio: number; regular: number | null; imagen: string | null;
};

type Props = {
  productoId: string;
  nombre: string;
  imagen: string | null;
  precio: number;
  regular: number;
  bonos: Bono[];
  upsells: Upsell[];
  totalBase: number;
  diasDeGarantia: number | null;
  diasDelEnlace: number;
  maxDescargas: number;
  vendedor: string | null;
  puedeCobrar: boolean;
  /**
   * Qué le falta, cuando la mira su dueña antes de poder vender.
   *
   * `null` para todo el mundo salvo ella: si el producto no se puede vender,
   * quien no es la dueña ni llega hasta acá.
   */
  avisoDePrevia: string | null;
  botonRedondo: string;
  tarjeta: string;
  /** Null = sin oferta de salida (apagada, sin plan, o no se puede vender). */
  oferta: OfertaEnElCheckout | null;
  /** Null = sin precio de bienvenida para esta visita. Ver `lib/bienvenida`. */
  bienvenida: BienvenidaEnElCheckout | null;
  /** Null = sin oferta del upsell para esta visita. Ver `lib/oferta-upsell`. */
  ofertaUpsell: OfertaDeUpsellEnPantalla | null;
};

const plata = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export default function CheckoutClient(p: Props) {
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [error, setError] = useState("");
  /* Arranca APAGADA, siempre. Una casilla de consentimiento que viene marcada
     de fábrica no es consentimiento: es un cartel. */
  const [acepto, setAcepto] = useState(false);
  const [yendo, setYendo] = useState(false);
  /* El cupón: lo que se escribe, y lo que el servidor dijo que vale. El
     precio de abajo se calcula con `descuentoDe`, la misma función que va a
     usar la ruta al cobrar: la pantalla no puede prometer un número distinto. */
  const [codigo, setCodigo] = useState("");
  const [cupon, setCupon] = useState<{ codigo: string; tipo: TipoDeCupon; valor: number; texto: string } | null>(null);
  const [cuponError, setCuponError] = useState("");
  const [cuponMirando, setCuponMirando] = useState(false);
  /* ── La oferta de salida ──────────────────────────────────────────────
     `tokenDeOferta` es la hora en que ESTA persona la vio, firmada. Se
     guarda en el navegador la primera vez: recargar no reinicia el plazo. Al
     pagar viaja con el cupón para que el servidor lo haga cumplir. */
  const [cartel, setCartel] = useState<{ venceEn: number } | null>(null);
  const [tokenDeOferta, setTokenDeOferta] = useState<string | null>(null);
  const [ofertaError, setOfertaError] = useState("");
  const ofertaMostrada = useRef(false);
  /* ── El precio de bienvenida ──────────────────────────────────────────
     El token que trajo la página es el plazo de ESTA persona, firmado por el
     servidor; el cupón BIENVENIDA-… no vale sin él. Se pone solo al entrar
     y deja de valer solo al vencer: la persona no escribe nada.

     ⚠️ Y se pone SIN preguntarle a `/api/digitales/cupon`. Esa ruta tiene un
     tope por IP contra quien adivina códigos (30 por hora), y acá cientos de
     celulares comparten IP: un checkout que la llamara en cada carga se
     comería el tope y le diría "venció" a gente con el reloj corriendo. El
     servidor ya decidió que está viva y ya mandó el porcentaje del cupón
     (`bienvenidaDeLaVisita`); con eso alcanza para mostrar. Cobrar lo decide
     `/comprar`, como siempre, y si dice que no, lo dice (`cuponRechazado`).

     Sin estado propio salvo `rechazada`: el plazo sale del token, la hora
     del reloj compartido, y "vive o no" se deriva de los dos. Así no hay
     `setState` en efectos. */
  const router = useRouter();
  const [bienvenidaRechazada, setBienvenidaRechazada] = useState(false);
  const bienvenida = p.bienvenida;
  /* `null` sin oferta: así el reloj no late y esta pantalla no se redibuja
     cada segundo para quien no tiene precio de bienvenida. */
  const bienvenidaVenceEn = bienvenida ? venceEnDelTokenDeBienvenida(bienvenida.token) ?? 0 : null;
  const ahora = useAhora(bienvenidaVenceEn);
  const bienvenidaVencida = bienvenidaVenceEn !== null && ahora > 0 && ahora >= bienvenidaVenceEn;
  const bienvenidaViva = !!bienvenida && p.puedeCobrar && !bienvenidaVencida && !bienvenidaRechazada;
  /* Lo que se cobra: el cupón que la persona puso, o si no puso ninguno, el
     de bienvenida mientras viva. Es lo que suma `cuenta` y lo que viaja al
     pagar. Escribir otro cupón lo reemplaza, como cualquier cupón. */
  const cuponVigente = useMemo(() => cupon ?? (bienvenidaViva && bienvenida
    ? { codigo: bienvenida.codigo, tipo: "PORCENTAJE" as const, valor: bienvenida.porcentaje, texto: textoDelDescuento({ tipo: "PORCENTAJE", valor: bienvenida.porcentaje }) }
    : null), [cupon, bienvenida, bienvenidaViva]);
  const esElDeBienvenida = !!bienvenida && cuponVigente?.codigo === bienvenida.codigo;
  /* ── La oferta del upsell ─────────────────────────────────────────────
     El reloj de la caja "Sumá a tu compra". El plazo lo firmó el servidor;
     acá se guarda —cookie y localStorage— y se usa el más viejo que haya a
     mano: recargar, o volver desde Mercado Pago, no lo reinicia.

     ⚠️ Al llegar a cero NO se pide la página de nuevo, al revés que la barra
     de bienvenida. La pantalla ya tiene los dos precios y los cambia con
     `precioDelUpsell`, la misma función con la que la ruta cobra. Un
     `router.refresh()` acá sería redibujar el formulario donde la persona
     está escribiendo su correo. */
  const ofertaUpsell = p.ofertaUpsell;
  /* El token sale de las props, no de un estado: el servidor ya eligió, y
     si el navegador tenía uno más viejo el efecto de abajo pide la página
     de nuevo en vez de corregirlo acá. Un estado propio sería una segunda
     verdad sobre el mismo plazo. */
  const tokenDeUpsell = ofertaUpsell?.estado === "viva" ? ofertaUpsell.token : null;
  /* El servidor dijo que el plazo ya no vale al intentar pagar. Late lo
     mismo que `bienvenidaRechazada`: se acomodan los precios y se cobra lo
     que corresponde, sin cobrar de más a escondidas. */
  const [upsellRechazado, setUpsellRechazado] = useState(false);
  const upsellVenceEn = tokenDeUpsell ? venceEnDelTokenDeUpsell(tokenDeUpsell) : null;
  const ahoraUpsell = useAhora(upsellVenceEn);
  const hayOfertaDeUpsell = ofertaUpsell !== null;
  const upsellVivo =
    ofertaUpsell?.estado === "viva" && !upsellRechazado && upsellVenceEn !== null &&
    /* `ahoraUpsell === 0` es el servidor dibujando: ahí manda lo que el
       servidor ya decidió, y no se dibuja un reloj vencido por un segundo. */
    (ahoraUpsell === 0 || ahoraUpsell < upsellVenceEn);

  /**
   * Lo que sale este upsell AHORA. Sin oferta configurada, su precio de
   * siempre; con el reloj corriendo, el de oferta; vencido, el de lista.
   * La cuenta la hace `precioDelUpsell`, la misma función que la ruta.
   */
  const precioAhora = (u: Upsell) =>
    precioDelUpsell({ price: u.precio, comparePrice: u.regular }, !hayOfertaDeUpsell || upsellVivo);
  /* ⚠️ El freno del doble click. `useState` no alcanza: dos clics seguidos leen
     el mismo `false` antes de que React vuelva a dibujar, y salen los dos. Con
     un `ref` el segundo ve el `true` en el mismo instante. Es el mismo patrón
     que el panel usa para publicar y borrar. */
  const enVuelo = useRef(false);

  const cuenta = useMemo(() => {
    const sumaUpsells = p.upsells
      .filter((u) => elegidos.includes(u.id))
      .reduce((s, u) => s + precioDelUpsell({ price: u.precio, comparePrice: u.regular }, !hayOfertaDeUpsell || upsellVivo), 0);
    const valorBonos = p.bonos.reduce((s, b) => s + b.vale, 0);
    const regularUpsells = p.upsells
      .filter((u) => elegidos.includes(u.id))
      .reduce((s, u) => s + (u.regular ?? u.precio), 0);

    const sinCupon = p.totalBase + sumaUpsells;
    const descuento = cuponVigente ? descuentoDe(cuponVigente, sinCupon) : 0;
    const pagas = sinCupon - descuento;
    const valorTotal = p.regular + valorBonos + regularUpsells;
    return { sinCupon, descuento, pagas, valorTotal, ahorro: valorTotal > pagas ? valorTotal - pagas : 0 };
  }, [elegidos, p, cuponVigente, hayOfertaDeUpsell, upsellVivo]);

  /**
   * Verifica un cupón contra el servidor y lo deja puesto. `plazos` son los
   * tokens firmados: el cupón SALIDA-… no vale sin el de la oferta de
   * salida, ni el BIENVENIDA-… sin el del precio de bienvenida.
   * Devuelve el error, o null si quedó aplicado.
   */
  async function verificarCupon(c: string, plazos: { oferta?: string | null; bienvenida?: string | null }): Promise<string | null> {
    try {
      const r = await fetch("/api/digitales/cupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productoId: p.productoId, codigo: c, ...(plazos.oferta ? { oferta: plazos.oferta } : {}), ...(plazos.bienvenida ? { bienvenida: plazos.bienvenida } : {}) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) return d.error ?? "Ese cupón no existe.";
      setCupon({ codigo: d.codigo, tipo: d.tipo, valor: d.valor, texto: d.texto });
      setCodigo(d.codigo);
      return null;
    } catch {
      return "No pudimos verificar el cupón. Probá de nuevo.";
    }
  }

  async function aplicarCupon() {
    const c = normalizarCodigo(codigo);
    if (!c || cuponMirando) return;
    setCuponMirando(true);
    setCuponError("");
    const problema = await verificarCupon(c, {});
    if (problema) { setCupon(null); setCuponError(problema); }
    setCuponMirando(false);
  }

  /* ── El precio de bienvenida: el token se guarda ───────────────────────
     Al montar se guarda (`guardarTokenDeBienvenida`). Si el navegador tenía
     uno más viejo y la cookie quedó puesta, esta pantalla está dibujada con
     un plazo que no es el suyo: se le pide al servidor que la vuelva a
     dibujar (vencido incluido: sale sin descuento). Nunca en la previa de
     la dueña. Ver `lib/bienvenida`. */
  useEffect(() => {
    if (!bienvenida || !p.puedeCobrar) return;
    if (guardarTokenDeBienvenida(bienvenida.productId, bienvenida.token).pedirDeNuevo) router.refresh();
  }, [bienvenida, p.puedeCobrar, router]);

  /* ── El plazo del upsell, guardado ────────────────────────────────────
     Se elige el que vence ANTES entre la cookie, el localStorage y el que
     trajo la página, y se guarda en los dos lados. Así abrir el pago por
     segunda vez sigue el reloj de la primera en vez de regalar otros diez
     minutos — que es exactamente lo que hace el reloj de la competencia.

     No hace falta pedir la página de nuevo como en bienvenida: acá el
     precio lo decide la pantalla con los dos números que ya tiene, y el
     servidor lo vuelve a verificar al cobrar. */
  useEffect(() => {
    if (ofertaUpsell?.estado !== "viva" || !p.puedeCobrar) return;
    const { pedirDeNuevo } = guardarPlazo(
      claveDeOfertaUpsell(ofertaUpsell.productoId),
      ofertaUpsell.token,
      elTokenDeUpsellMasViejo,
    );
    /* Si el navegador tenía uno más viejo, esta pantalla está dibujada con
       un plazo que no es el suyo: se le pide al servidor que la vuelva a
       dibujar, ya con la cookie puesta. Igual que la barra de bienvenida, y
       por el mismo motivo: el precio lo decide el servidor, no la pantalla.
       `router.refresh` no borra lo que la persona escribió. */
    if (pedirDeNuevo) router.refresh();
  }, [ofertaUpsell, p.puedeCobrar, router]);

  /* ── Cuándo aparece el cartel ─────────────────────────────────────────
     En computadora, cuando el mouse sale por arriba (va a cerrar la pestaña
     o a la barra). En el celular, al apretar atrás: se deja una entrada en
     el historial para que "atrás" primero muestre el cartel y recién el
     segundo "atrás" se vaya. Una sola vez por persona y producto: el
     navegador se acuerda. Nunca mientras está pagando ni en la previa de la
     dueña. Si ya tenía un cupón puesto y acepta, el de la oferta lo
     reemplaza: el resumen del precio lo muestra. */
  const oferta = p.oferta;
  useEffect(() => {
    if (!oferta || !p.puedeCobrar) return;
    const claveVista = `pv_salida_vista_${p.productoId}`;
    const claveToken = `pv_salida_token_${p.productoId}`;
    try { if (window.localStorage.getItem(claveVista)) return; } catch { /* sin almacenamiento se muestra igual */ }

    const mostrar = () => {
      if (ofertaMostrada.current || enVuelo.current) return;
      ofertaMostrada.current = true;
      /* El token más viejo que siga vivo: el guardado si lo hay, si no el de
         esta carga. Así recargar no reinicia el plazo, y el reloj sigue de
         donde iba. */
      let token = oferta.token;
      try {
        const guardado = window.localStorage.getItem(claveToken);
        const venceGuardado = guardado ? venceEnDelToken(guardado) : null;
        if (guardado && venceGuardado && venceGuardado > Date.now()) token = guardado;
        window.localStorage.setItem(claveToken, token);
        window.localStorage.setItem(claveVista, "1");
      } catch { /* ídem */ }
      setTokenDeOferta(token);
      setCartel({ venceEn: venceEnDelToken(token) ?? Date.now() });
    };

    const alSalir = (e: MouseEvent) => { if (e.clientY <= 0) mostrar(); };
    /* Si el cartel ya salió (por el mouse), la entrada extra del historial
       sigue ahí: este "atrás" la consume y hay que irse de verdad. */
    const alVolver = () => { if (ofertaMostrada.current) window.history.back(); else mostrar(); };
    document.documentElement.addEventListener("mouseleave", alSalir);
    window.history.pushState({ salida: true }, "", window.location.href);
    window.addEventListener("popstate", alVolver);
    return () => {
      document.documentElement.removeEventListener("mouseleave", alSalir);
      window.removeEventListener("popstate", alVolver);
    };
  }, [oferta, p.productoId, p.puedeCobrar]);

  /* Cerrar el cartel: si se abrió por "atrás", ya se consumió la entrada
     extra del historial; si se abrió por el mouse, sigue ahí y da igual. */
  function cerrarCartel() { setCartel(null); }

  async function aceptarOferta() {
    if (!oferta || oferta.tipo !== "DESCUENTO" || cuponMirando) return;
    setCuponMirando(true);
    setOfertaError("");
    const problema = await verificarCupon(oferta.codigo, { oferta: tokenDeOferta });
    if (problema) setOfertaError(problema);
    else setCartel(null);
    setCuponMirando(false);
  }

  const mailValido = /^[^@\s]+@[^@\s]+\.[^@.\s]+$/.test(email.trim());

  async function pagar() {
    if (enVuelo.current) return;
    if (!mailValido) {
      setError("Escribí un correo válido: es a donde te mandamos el archivo.");
      return;
    }
    /* El botón ya está apagado sin la casilla; esto es por si alguien lo
       prende desde la consola. La ruta lo mira una tercera vez. */
    if (!acepto) {
      setError("Marcá la casilla para poder seguir.");
      return;
    }
    enVuelo.current = true;
    setYendo(true);
    setError("");
    try {
      const r = await fetch("/api/digitales/comprar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productoId: p.productoId,
          email: email.trim(),
          nombre: nombre.trim() || undefined,
          /* Opcional, y sólo si parece un celular argentino: un número a
             medio escribir no sirve ni para WhatsApp ni para Meta. */
          telefono: celularArgentino(telefono) ?? undefined,
          /* Sólo identificadores. Ningún precio viaja desde acá. */
          upsells: elegidos,
          /* El CÓDIGO del cupón, nunca el monto: cuánto vale lo decide el servidor. */
          cupon: cuponVigente?.codigo,
          /* El plazo firmado, para que el servidor lo haga cumplir con el
             cupón de la oferta de salida. Con otro cupón no hace nada. */
          oferta: tokenDeOferta ?? undefined,
          /* Y el del precio de bienvenida, para el cupón BIENVENIDA-…. */
          bienvenida: esElDeBienvenida && bienvenidaViva ? bienvenida.token : undefined,
          /* El plazo de la oferta del upsell. Sin él —o vencido— el servidor
             cobra el precio de lista, así que no mandarlo no abarata nada. */
          upsell: tokenDeUpsell ?? undefined,
          /* "Esta pantalla YA está mostrando el precio de después." Con esto
             el servidor cobra ese precio en vez de cortar: cortar tiene
             sentido una vez, para que nadie pague más de lo que vio, y
             ninguna para trabar la compra. Sin esto el segundo intento
             chocaba contra el mismo corte para siempre. */
          upsellVencido: hayOfertaDeUpsell && !upsellVivo ? true : undefined,
          /* Viaja el HECHO de haber aceptado, no el texto: el texto lo pone el
             servidor. Una prueba que la escribe el navegador no prueba nada. */
          acepto: true,
          /* De dónde vino, tal como lo anotó la página de venta al entrar. Crudo:
             la etiqueta la pone el servidor. Es sólo para Estadísticas; sin esto
             la compra sale igual. */
          origen: origenAnotado(p.productoId),
        }),
      });
      const datos = await r.json().catch(() => ({}));
      if (!r.ok || !datos.initPoint) {
        setError(datos.error ?? "No pudimos abrir el pago. Probá de nuevo.");
        /* El servidor no aceptó el cupón (venció entre ponerlo y pagar, lo
           apagaron, o el plazo de bienvenida se terminó en el camino): se saca,
           así el segundo intento sale con el precio que corresponde en vez de
           volver a chocar con lo mismo. */
        if (datos.cuponRechazado) {
          setCupon(null);
          setCodigo("");
          if (esElDeBienvenida) setBienvenidaRechazada(true);
        }
        /* La oferta del upsell se terminó entre el clic y el pago. NO se
           cobra el precio de lista sin avisar: se acomodan los números en
           pantalla y la persona decide de nuevo, viendo lo que va a pagar.
           Cobrar más de lo que decía el botón es lo único que no se puede
           hacer acá. */
        if (datos.upsellVencido) setUpsellRechazado(true);
        enVuelo.current = false;
        setYendo(false);
        return;
      }
      /* `replace` y no `href`: si la persona vuelve atrás desde Mercado Pago,
         que caiga en la página de venta y no en un checkout a medio llenar. */
      window.location.replace(datos.initPoint);
    } catch {
      setError("No pudimos conectarnos. Fijate la conexión y probá de nuevo.");
      enVuelo.current = false;
      setYendo(false);
    }
  }

  const campo =
    "w-full rounded-lg border-2 border-[color:var(--pv-linea)] bg-[color:var(--pv-tarjeta)] " +
    "px-4 py-3.5 text-base text-[color:var(--pv-tinta)] outline-none transition " +
    "placeholder:text-[color:var(--pv-tenue)] placeholder:opacity-60 " +
    "focus:border-[color:var(--pv-acento)]";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Qué se está comprando, siempre a la vista. Nadie tiene que acordarse. */}
      <div className="mb-7 flex items-center justify-between gap-4 border-b border-[color:var(--pv-linea)] pb-4">
        <p className="min-w-0 text-sm font-bold text-[color:var(--pv-tinta)]">{p.nombre}</p>
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[color:var(--pv-tenue)]">
          <Lock className="h-3.5 w-3.5" /> Pago seguro
        </span>
      </div>

      {/* ⚠️ Este cartel lo ve SÓLO la dueña del producto: si todavía no se puede
          vender, quien no es ella ni llega a esta pantalla. Por eso está escrito
          para ella —dice qué le falta y dónde arreglarlo— y no para un comprador.
          Antes acá había un 404 pelado que no explicaba nada. */}
      {p.avisoDePrevia && (
        <div className={`mb-6 bg-[color:var(--pv-fuerte)] p-4 ${p.tarjeta}`}>
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--pv-tenue)]">
            Así lo van a ver — sólo lo ves vos
          </p>
          <div className="flex gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--pv-tinta)]" />
            <p className="text-sm text-[color:var(--pv-tinta)]">
              {p.avisoDePrevia}{" "}
              <span className="opacity-75">El botón de pagar está apagado hasta que se resuelva.</span>
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        {/* ── Los datos ────────────────────────────────────────────────── */}
        <div>
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--pv-tenue)]">
            Adónde te lo mandamos
          </p>

          <label className="block">
            <span className="sr-only">Tu correo</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={120}
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
              placeholder="vos@ejemplo.com"
              disabled={!p.puedeCobrar}
              className={campo}
            />
          </label>
          <p className="mt-2 text-[13px] text-[color:var(--pv-tenue)]">
            Ahí te llega el archivo apenas se acredita el pago. Revisá que esté bien escrito.
          </p>

          <div className="mt-5 border-t border-[color:var(--pv-linea)] pt-4">
            <p className="mb-2 text-[10.5px] font-extrabold uppercase tracking-widest text-[color:var(--pv-tenue)] opacity-75">
              Opcional
            </p>
            {/* ⚠️ NOMBRE Y APELLIDO EN UN SOLO CAMPO, y sigue siendo opcional.
                Un campo aparte para el apellido no agrega nada: donde hace
                falta partido —la lista para Meta Ads— se parte solo (primera
                palabra el nombre, el resto el apellido), y donde se saluda se
                usa el de pila. Lo que sí cambia es lo que se PIDE: con
                "Tu nombre" y "para saludarte por tu nombre" la gente escribe
                "Ana" y el apellido nunca llega. `autoComplete="name"` —y no
                "given-name"— para que el navegador ofrezca el nombre entero. */}
            <label className="block">
              <span className="sr-only">Nombre y apellido</span>
              <input
                type="text"
                autoComplete="name"
                maxLength={80}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre y apellido"
                disabled={!p.puedeCobrar}
                className={`${campo} border py-2.5 text-sm`}
              />
            </label>
            <p className="mt-1.5 text-[12px] text-[color:var(--pv-tenue)]">Para saludarte en el mail y que quien vende sepa quién le compró.</p>

            {/* ⚠️ EL CELULAR, OPCIONAL Y CON EL PARA QUÉ A LA VISTA. Dos cosas
                que no son estética:

                1. Opcional de verdad. Un teléfono obligatorio en un checkout
                   de impulso es gente que se va, y uno escrito de apuro no
                   sirve para nada. El que lo deja, lo deja bien.
                2. Dice PARA QUÉ, al lado del campo y no escondido en un link.
                   Es lo que pide la ley 25.326: el dato se pide para un fin
                   declarado, y ese fin es ESTA compra — no una lista de
                   difusión. Lo mismo está escrito en la política y en la
                   pantalla de Carritos, para quien vende. */}
            <label className="mt-3 block">
              <span className="sr-only">Celular</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={30}
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Celular (11 5555-5555)"
                disabled={!p.puedeCobrar}
                className={`${campo} border py-2.5 text-sm`}
              />
            </label>
            {/* ⚠️ Si escribió algo que no parece un celular, HAY QUE DECÍRSELO.
                El número se descarta —así se guarda uno que sirva o ninguno—
                pero descartarlo en silencio es peor que no pedirlo: la persona
                se va creyendo que dejó un teléfono, y del otro lado el botón
                de WhatsApp nunca aparece. Es un aviso, no un freno: el campo
                es opcional y el botón de pagar sigue prendido. */}
            <p className="mt-1.5 text-[12px] text-[color:var(--pv-tenue)]">
              {telefono.trim() && !celularArgentino(telefono)
                ? "Revisá el número: con código de área y sin el 0 ni el 15 (por ejemplo, 11 5555-5555). Así como está no lo vamos a guardar."
                : "Por si hay algún problema con tu compra, para que puedan escribirte por WhatsApp. No se usa para nada más."}
            </p>
          </div>

          {/* ── La casilla del art. 1116 ──────────────────────────────────
              Es la única defensa contra "compré, bajé el PDF y pedí la plata de
              vuelta". Ver `lib/consentimiento-digital`.

              Va ARRIBA del botón y sin achicar: una prueba legal escondida en
              letra de 9 px o atrás de un link es una prueba que un juez de
              consumo descarta. Y el texto que se guarda lo elige el servidor,
              no esta pantalla. */}
          <label className="mt-5 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={acepto}
              onChange={(e) => { setAcepto(e.target.checked); if (error) setError(""); }}
              disabled={!p.puedeCobrar}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[color:var(--pv-acento)]"
            />
            <span className="text-[12.5px] leading-relaxed text-[color:var(--pv-tenue)]">
              {textoQueAcepto(false, p.diasDeGarantia)}
            </span>
          </label>

          {error && (
            <p role="alert" className="mt-4 bg-[color:var(--pv-fuerte)] px-3 py-2 text-sm font-medium text-[color:var(--pv-tinta)]">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={pagar}
            /* Se apaga sin la casilla, y además `pagar` lo vuelve a mirar: un
               `disabled` se saca desde la consola en dos segundos. */
            disabled={yendo || !p.puedeCobrar || !acepto}
            className={`mt-5 flex w-full items-center justify-center gap-2 bg-[color:var(--pv-acento)] px-6 py-4 text-lg font-bold text-[color:var(--pv-sobre)] transition hover:brightness-110 disabled:opacity-50 ${p.botonRedondo}`}
          >
            {yendo ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {yendo ? "Abriendo el pago…" : `Pagar ${plata(cuenta.pagas)}`}
          </button>

          <ul className="mt-4 grid gap-2">
            <Sello icono={<Lock className="h-3.5 w-3.5" />}>
              Pagás con Mercado Pago. Tus datos de tarjeta no pasan por acá.
            </Sello>
            {p.diasDeGarantia !== null && (
              <Sello icono={<ShieldCheck className="h-3.5 w-3.5" />}>
                {p.diasDeGarantia} días para pedir la devolución.
              </Sello>
            )}
            <Sello icono={<Package className="h-3.5 w-3.5" />}>
              El enlace de descarga te dura {p.diasDelEnlace} días, para {p.maxDescargas} descargas.
            </Sello>
          </ul>
        </div>

        {/* ── Lo que te llevás ─────────────────────────────────────────── */}
        <div className={`bg-[color:var(--pv-suave)] p-5 ${p.tarjeta}`}>
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--pv-tenue)]">
            Lo que te llevás
          </p>

          <Renglon nombre={p.nombre} valor={plata(p.regular)} imagen={p.imagen} />
          {p.bonos.map((b) => (
            <Renglon
              key={b.id}
              nombre={b.nombre}
              valor={
                <>
                  {b.vale > 0 && <s className="mr-2 font-normal opacity-55">{plata(b.vale)}</s>}
                  <span className="text-[color:var(--pv-ok)]">GRATIS</span>
                </>
              }
            />
          ))}
          {p.upsells.filter((u) => elegidos.includes(u.id)).map((u) => (
            <Renglon key={u.id} nombre={u.nombre} valor={plata(u.regular ?? u.precio)} imagen={u.imagen} />
          ))}

          {/* ── La caja del upsell ───────────────────────────────────────
              El upsell antes de pagar y con un click: es la mejor ubicación
              que tiene, y es lo único que se copió de la competencia.

              ⚠️ UN SOLO RELOJ PARA TODA LA CAJA, y un solo título. Un
              producto puede tener hasta tres upsells, y los tres empiezan a
              contar cuando la persona abre el pago: tres relojes marcarían
              el mismo número tres veces, y tres veces "Sumá a tu compra" es
              ruido. Ver `lib/oferta-upsell`.

              Y el reloj es de verdad: al llegar a cero el precio sube al de
              lista, acá y al cobrar. El de la competencia reinicia con F5 y
              al terminar no cambia nada. */}
          {p.upsells.length > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                {/* `shrink-0`: es hijo de un flex en fila y no tiene por qué
                    achicarse para hacerle lugar al reloj. Si no entran los
                    dos, el `flex-wrap` los pone uno abajo del otro. */}
                <p className="shrink-0 text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--pv-acento)]">
                  Sumá a tu compra
                </p>
                {/* `ahoraUpsell > 0` es "ya está en el navegador": en el
                    servidor no hay reloj que leer, y dibujar uno ahí haría
                    que el primer segundo no coincida con lo hidratado. */}
                {upsellVivo && upsellVenceEn !== null && ahoraUpsell > 0 && ofertaUpsell?.estado === "viva" && (
                  <p role="status" className="inline-flex min-w-0 items-center gap-1.5 text-[11.5px] font-bold text-[color:var(--pv-acento)]">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0">{ofertaUpsell.texto}</span>
                    <span className="shrink-0 tabular-nums">{cuentaRegresiva(upsellVenceEn, ahoraUpsell) ?? "0:00"}</span>
                  </p>
                )}
              </div>

              {/* Se dice, no se esconde: la persona vio un precio y ahora ve
                  otro. Sin esta línea parece un error nuestro. Es la misma
                  regla que la del precio de bienvenida vencido. */}
              {hayOfertaDeUpsell && !upsellVivo && (
                <p role="status" className="mb-2 text-[12px] text-[color:var(--pv-tenue)]">
                  La oferta se terminó: queda el precio de siempre.
                </p>
              )}

              {p.upsells.map((u) => {
                const puesto = elegidos.includes(u.id);
                const sale = precioAhora(u);
                return (
                  <div key={u.id} className={`mt-2.5 border-2 border-dashed border-[color:var(--pv-acento)] p-3.5 ${p.tarjeta} ${puesto ? "bg-[color:var(--pv-fuerte)] border-solid" : "bg-[color:var(--pv-tarjeta)]"}`}>
                    {/* La tapa al lado del nombre, como en el cartel de salida.
                        `min-w-0 flex-1` en la columna del texto: sin eso el
                        nombre estira la fila y la tapa empuja el precio afuera
                        de la tarjeta en un celular. */}
                    <div className="flex items-start gap-3">
                      {u.imagen && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.imagen} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[color:var(--pv-tinta)]">{u.nombre}</p>
                        {u.descripcion && (
                          <p className="mt-1 text-[12.5px] text-[color:var(--pv-tenue)]">{u.descripcion}</p>
                        )}
                        {/* El tachado sale sólo si de verdad se está pagando menos.
                            Con la oferta vencida, `sale` YA ES el precio de lista:
                            tacharlo al lado de sí mismo sería un descuento inventado. */}
                        <p className="mt-2 text-sm font-bold text-[color:var(--pv-tinta)]">
                          {u.regular !== null && sale < u.regular && (
                            <s className="mr-2 font-normal opacity-55">{plata(u.regular)}</s>
                          )}
                          {plata(sale)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setElegidos((v) => puesto ? v.filter((x) => x !== u.id) : [...v, u.id])}
                      aria-pressed={puesto}
                      className={`mt-2.5 flex w-full items-center justify-center gap-1.5 border-2 border-[color:var(--pv-acento)] px-3 py-2 text-[13px] font-bold transition ${p.botonRedondo} ${
                        puesto
                          ? "bg-[color:var(--pv-acento)] text-[color:var(--pv-sobre)]"
                          : "text-[color:var(--pv-acento)] hover:bg-[color:var(--pv-acento)] hover:text-[color:var(--pv-sobre)]"
                      }`}
                    >
                      {puesto ? <><Check className="h-3.5 w-3.5" /> Agregado — sacar</> : "+ Agregar a tu compra"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── El cupón ─────────────────────────────────────────────────
              Chico y abajo del detalle: quien tiene uno lo busca; quien no,
              no tiene que ver un campo vacío que le sugiera salir a buscarlo. */}
          <div className="mt-4">
            {/* El precio de bienvenida puesto: con su reloj, y sin "sacar" —no
                es un código que alguien escribió, es el precio de esta visita—.
                Escribir otro cupón lo reemplaza, como cualquier cupón. */}
            {/* ⚠️ `flex-wrap` + `min-w-0` + `shrink-0`, y no es estética: un
                código de cupón es una palabra sola de hasta 20 letras que la
                escribe quien vende. Sin esto, el renglón se estira al ancho de
                esa palabra y a 360px se pasa de la tarjeta, arrastrando el
                reloj o el "sacar" fuera de la pantalla. El corte de palabra
                global no alcanza: un hijo de un flex en fila no achica por
                debajo de su contenido si no se le dice. */}
            {cuponVigente && esElDeBienvenida ? (
              <p className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[13px] text-[color:var(--pv-ok)]">
                <span className="inline-flex min-w-0 items-center gap-1.5 font-bold"><Ticket className="h-3.5 w-3.5 shrink-0" /> <span className="min-w-0">Precio de bienvenida · {cuponVigente.texto}</span></span>
                <span className="shrink-0 tabular-nums text-[12px] font-bold">{ahora > 0 && bienvenidaVenceEn !== null ? cuentaRegresiva(bienvenidaVenceEn, ahora) ?? "0:00" : ""}</span>
              </p>
            ) : cuponVigente ? (
              <p className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[13px] text-[color:var(--pv-ok)]">
                <span className="inline-flex min-w-0 items-center gap-1.5 font-bold"><Ticket className="h-3.5 w-3.5 shrink-0" /> <span className="min-w-0">Cupón {cuponVigente.codigo} · {cuponVigente.texto}</span></span>
                <button type="button" onClick={() => { setCupon(null); setCodigo(""); }} className="shrink-0 text-[12px] underline underline-offset-2 text-[color:var(--pv-tenue)]">sacar</button>
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  aria-label="Código de cupón"
                  value={codigo}
                  onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setCuponError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); aplicarCupon(); } }}
                  maxLength={20}
                  placeholder="¿Tenés un cupón?"
                  autoComplete="off"
                  className={`min-w-0 flex-1 border-2 border-[color:var(--pv-linea)] bg-[color:var(--pv-tarjeta)] px-3 py-2 text-[13px] uppercase text-[color:var(--pv-tinta)] outline-none focus:border-[color:var(--pv-acento)] ${p.botonRedondo}`}
                />
                <button
                  type="button"
                  onClick={aplicarCupon}
                  disabled={cuponMirando || !codigo.trim()}
                  className={`shrink-0 border-2 border-[color:var(--pv-acento)] px-3 py-2 text-[13px] font-bold text-[color:var(--pv-acento)] transition hover:bg-[color:var(--pv-acento)] hover:text-[color:var(--pv-sobre)] disabled:opacity-40 ${p.botonRedondo}`}
                >
                  {cuponMirando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                </button>
              </div>
            )}
            {cuponError && <p role="alert" className="mt-2 bg-[color:var(--pv-fuerte)] px-3 py-2 text-[12.5px] font-medium text-[color:var(--pv-tinta)]">{cuponError}</p>}
            {/* Se dice, no se esconde: la persona vio un precio en la página y
                acá ve otro. Sin esta línea parece un error nuestro. */}
            {bienvenida && !bienvenidaViva && p.puedeCobrar && (
              <p role="status" className="mt-2 text-[12.5px] text-[color:var(--pv-tenue)]">El precio de bienvenida venció: se cobra el precio normal.</p>
            )}
          </div>

          <div className="mt-4 border-t-2 border-[color:var(--pv-linea)] pt-3">
            {cuenta.descuento > 0 && (
              <p className="flex justify-between text-sm text-[color:var(--pv-tenue)]">
                <span>{esElDeBienvenida ? "Precio de bienvenida" : `Cupón ${cuponVigente?.codigo}`}</span>
                <span className="tabular-nums">−{plata(cuenta.descuento)}</span>
              </p>
            )}
            {cuenta.valorTotal > cuenta.pagas && (
              <p className="flex justify-between text-sm text-[color:var(--pv-tenue)]">
                <span>Valor total</span>
                <s className="tabular-nums">{plata(cuenta.valorTotal)}</s>
              </p>
            )}
            <p className="flex justify-between pt-1 text-xl font-extrabold text-[color:var(--pv-tinta)]">
              <span>Pagás</span>
              <span className="tabular-nums">{plata(cuenta.pagas)}</span>
            </p>
            {cuenta.ahorro > 0 && (
              <p className="flex justify-between pt-1 text-sm font-extrabold text-[color:var(--pv-ok)]">
                <span>Ahorrás</span>
                <span className="tabular-nums">{plata(cuenta.ahorro)}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="mt-8 border-t border-[color:var(--pv-linea)] pt-4 text-center text-[11.5px] text-[color:var(--pv-tenue)]">
        <a href="/terminos" className="underline underline-offset-2">Términos</a>
        {" · "}
        <a href="/privacidad" className="underline underline-offset-2">Privacidad</a>
        {p.vendedor ? ` · Vende ${p.vendedor} a través de TiendaApps` : " · A través de TiendaApps"}
      </p>

      {/* ── La oferta de salida ──────────────────────────────────────────
          Un solo cartel, el mismo componente que la vista previa del panel.
          Con descuento: aplica el cupón y cierra. Con producto más barato:
          el botón es un link a su pago. */}
      {cartel && oferta && (
        <div role="dialog" aria-modal="true" aria-label={oferta.titulo} className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/55 p-4 sm:items-center">
          <CartelDeSalida
            c={{
              titulo: oferta.titulo, texto: oferta.texto, boton: oferta.boton, venceEn: cartel.venceEn,
              imagen: oferta.tipo === "DESCUENTO" ? oferta.imagen : oferta.producto.imagen,
              oferta: oferta.tipo === "DESCUENTO"
                ? { tipo: "DESCUENTO", nombre: oferta.nombre, antes: cuenta.sinCupon, despues: cuenta.sinCupon - descuentoDe({ tipo: "PORCENTAJE", valor: oferta.porcentaje }, cuenta.sinCupon), porcentaje: oferta.porcentaje }
                : { tipo: "PRODUCTO", nombre: oferta.producto.nombre, precio: oferta.producto.precio, descripcion: oferta.producto.descripcion },
            }}
            tarjeta={p.tarjeta}
            botonRedondo={p.botonRedondo}
            onAceptar={aceptarOferta}
            onCerrar={cerrarCartel}
            yendo={cuponMirando}
            error={ofertaError}
            href={oferta.tipo === "PRODUCTO" ? oferta.producto.href : undefined}
          />
        </div>
      )}
    </div>
  );
}

function Sello({ icono, children }: { icono: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[12.5px] text-[color:var(--pv-tenue)]">
      <span className="mt-0.5 shrink-0 opacity-80">{icono}</span>
      {children}
    </li>
  );
}

/**
 * Un renglón de "Lo que te llevás".
 *
 * `imagen` es la tapa, y va sólo donde hay una: el producto y los upsells
 * que se agregaron. Los bonos quedan como texto a propósito —son el
 * "y además"—, y una fila de miniaturas todas iguales le saca peso a lo
 * que de verdad se está comprando.
 *
 * ⚠️ `alt=""` a propósito: la tapa no dice nada que el nombre de al lado no
 * diga ya. Repetirlo hace que un lector de pantalla lea dos veces lo mismo.
 */
function Renglon({ nombre, valor, imagen }: { nombre: string; valor: React.ReactNode; imagen?: string | null }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-b border-[color:var(--pv-linea)] py-2.5 text-[13.5px] last:border-b-0">
      <span className="flex min-w-0 items-center gap-2.5">
        {imagen && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagen} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
        )}
        <span className="min-w-0 text-[color:var(--pv-tinta)]">{nombre}</span>
      </span>
      <span className="whitespace-nowrap font-semibold tabular-nums text-[color:var(--pv-tinta)]">{valor}</span>
    </div>
  );
}
