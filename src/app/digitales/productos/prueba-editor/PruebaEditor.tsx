"use client";

import { useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import EbookTexto from "../EbookTexto";
import type { CapituloEscrito } from "@/lib/ebook-ia";

/**
 * El editor del texto, con un ebook inventado, para mirarlo.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ ESTO NO TOCA LA BASE, Y ESE ES TODO EL PUNTO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * La otra forma de ver el editor era meter un ebook falso en la base — que es
 * **la de producción**, donde todo lo que se escribe es de alguien de verdad y
 * queda ahí hasta que uno se acuerde de borrarlo. Ya nos pasó con un upsell de
 * demostración que sigue anotado como pendiente.
 *
 * Así que el ebook está acá adentro, escrito a mano, y guardar no manda nada a
 * ningún lado: dice qué habría guardado y listo. Se puede abrir mil veces, en
 * los tres anchos, sin gastar una generación ni ensuciar nada.
 *
 * Vive detrás de `NODE_ENV` en la página de al lado: no viaja al build.
 *
 * ⚠️ La caja de afuera imita la de `productos/[id]/ebook` —el ancho, el título
 * arriba, la tarjeta blanca— para que lo que se ve acá sea lo que se va a ver
 * ahí. Si aquella cambia de forma, ésta queda vieja: es para mirar, no es la
 * pantalla de verdad.
 */

/* Un ebook creíble: capítulos de largo distinto, párrafos largos de los que se
   van a renglón nuevo, viñetas, un subtítulo en el medio y un recuadro. Es lo
   que hace falta para saber si la pantalla aguanta un ebook de verdad y no uno
   de tres palabras. */
const EBOOK_DE_PRUEBA: CapituloEscrito[] = [
  {
    titulo: "Qué vendés en realidad, y por qué no es el archivo",
    bloques: [
      { tipo: "parrafo", texto: "Cuando alguien te compra un PDF no está pagando por un PDF. Está pagando por dejar de perder tiempo en algo que vos ya resolviste. Esa diferencia parece un juego de palabras hasta que te sentás a escribir la página de venta: si creés que vendés un archivo, vas a hablar de cuántas páginas tiene y en qué formato viene, que es exactamente lo que a nadie le importa." },
      { tipo: "parrafo", texto: "Probá esto: escribí en un renglón qué va a poder hacer tu comprador el martes que viene que hoy no puede hacer. Si no te sale, todavía no tenés el producto, tenés el archivo." },
      { tipo: "subtitulo", texto: "Las tres preguntas antes de escribir una línea" },
      { tipo: "vineta", texto: "¿Qué problema concreto resuelve, dicho como lo diría quien lo tiene?" },
      { tipo: "vineta", texto: "¿Cuánto tarda en resolverlo con esto, y cuánto tardaba antes?" },
      { tipo: "vineta", texto: "¿Qué se lleva puesto: una plantilla, un método, una lista?" },
      { tipo: "aviso", texto: "Si tu respuesta a las tres es la misma frase, tenés un solo producto. Si son tres respuestas distintas, tenés tres, y conviene separarlos." },
      { tipo: "parrafo", texto: "Esto no es un ejercicio de marketing: es lo que después va a leer quien decide si te compra o cierra la pestaña, y va a decidirlo en menos de diez segundos." },
    ],
  },
  {
    titulo: "El precio no se calcula, se prueba",
    bloques: [
      { tipo: "parrafo", texto: "La cuenta de \"cuánto me costó hacerlo\" no sirve para nada acá: hacerlo te costó una vez y lo vas a vender mil. Lo único que importa es cuánto vale para quien lo compra, y eso no lo sabés hasta que alguien lo paga." },
      { tipo: "parrafo", texto: "Empezá por un número que te dé un poco de vergüenza pedir. Casi siempre está bien. Si vendés tres seguidos sin que nadie pregunte nada, está barato." },
      { tipo: "vineta", texto: "Menos de $5.000: se compra sin pensar, pero también se abandona sin pensar." },
      { tipo: "vineta", texto: "Entre $5.000 y $20.000: la mayoría de los productos digitales que funcionan." },
      { tipo: "vineta", texto: "Más que eso: necesitás una página de venta que trabaje, no un botón." },
      { tipo: "aviso", texto: "No arranques con descuento. El precio con el que salís es el que la gente recuerda, y bajarlo después es fácil; subirlo, no." },
    ],
  },
  {
    titulo: "Escribir la página de venta sin dar vueltas",
    bloques: [
      { tipo: "parrafo", texto: "Una página de venta tiene un solo trabajo: que quien llegó por curiosidad entienda en el primer pantallazo si esto es para él. Todo lo demás —la historia, los testimonios, la garantía— sirve para el que ya dijo que sí y busca una excusa para confirmarlo." },
      { tipo: "subtitulo", texto: "El orden que funciona" },
      { tipo: "parrafo", texto: "Arriba, qué es y para quién. Abajo, qué se lleva. Más abajo, quién sos vos. Al final, el precio y el botón. Ese orden no es un gusto: es el orden en que la cabeza de quien lee hace las preguntas." },
      { tipo: "vineta", texto: "Nada de \"bienvenido a mi página\"." },
      { tipo: "vineta", texto: "Nada de explicar qué es un ebook." },
      { tipo: "vineta", texto: "El botón, repetido tres veces: arriba, en el medio y al final." },
    ],
  },
  {
    titulo: "Los primeros diez compradores",
    bloques: [
      { tipo: "parrafo", texto: "Los primeros diez no llegan de la publicidad. Llegan de gente que ya te conoce, y ése es el trabajo más incómodo y el más rentable: escribirle de a uno a quince personas que sabés que tienen ese problema." },
      { tipo: "parrafo", texto: "No les vendas. Contales qué hiciste y preguntales si les sirve. La mitad te va a decir que no, y de esa mitad vas a sacar las tres frases que te faltaban para la página de venta." },
      { tipo: "aviso", texto: "Guardá lo que te contestan, tal cual, con sus palabras. Eso es el texto de tu página; no hay nada que puedas inventar que funcione mejor." },
      { tipo: "parrafo", texto: "Recién con esos diez tenés algo que vale la pena mostrarle a desconocidos, porque ya sabés qué preguntan antes de comprar." },
    ],
  },
  {
    titulo: "El bono que hace que digan que sí",
    bloques: [
      { tipo: "parrafo", texto: "Un bono no es un regalo: es lo que saca la última duda. Si el producto principal enseña a hacer algo, el bono es lo que ahorra el trabajo de hacerlo: la plantilla, la lista, el archivo ya armado." },
      { tipo: "vineta", texto: "Tiene que complementar, no repetir." },
      { tipo: "vineta", texto: "Tiene que ser chico: si es más grande que el principal, algo está al revés." },
      { tipo: "vineta", texto: "Tiene que poder explicarse en un renglón." },
      { tipo: "parrafo", texto: "Y va nombrado en la página, con su propio título, como si tuviera precio. Un bono que aparece como \"y además material extra\" no convence a nadie de nada." },
    ],
  },
  {
    titulo: "Qué hacer la semana después de la primera venta",
    bloques: [
      { tipo: "parrafo", texto: "La primera venta demuestra una sola cosa: que el problema existe y que alguien paga por resolverlo. No demuestra que el precio esté bien ni que la página funcione, porque una venta no es una muestra." },
      { tipo: "subtitulo", texto: "Lo que sí conviene hacer" },
      { tipo: "vineta", texto: "Escribirle a quien compró a los tres días y preguntarle si lo usó." },
      { tipo: "vineta", texto: "Anotar qué le costó entender, y arreglar eso en el producto." },
      { tipo: "vineta", texto: "Recién ahí, pensar en el segundo producto." },
      { tipo: "aviso", texto: "El error clásico es sacar el segundo producto antes de haber arreglado el primero. Duplica el trabajo y no duplica nada más." },
      { tipo: "parrafo", texto: "El negocio no es el producto: es el circuito que lleva a alguien de no conocerte a comprarte. El producto es una pieza, y casi nunca es la que está rota." },
    ],
  },
];

export default function PruebaEditor() {
  const [capitulos, setCapitulos] = useState(EBOOK_DE_PRUEBA);
  const [sinGuardar, setSinGuardar] = useState(false);
  const [guardado, setGuardado] = useState<string | null>(null);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <p className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 panel-oscuro:text-gray-400">
        <ArrowLeft className="h-4 w-4" />
        Volver a productos
      </p>

      <div className="max-w-3xl">
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 panel-oscuro:text-gray-500">
            Producto de prueba
          </p>
          <h1 className="mt-0.5 flex items-center gap-2 text-xl font-black text-gray-900 panel-oscuro:text-gray-100">
            <Pencil className="h-4 w-4 text-orange-500" />
            Editar el contenido
          </h1>
        </div>

        <p className="mb-4 rounded-xl bg-amber-50 panel-oscuro:bg-amber-500/10 px-3.5 py-2.5 text-[12px] leading-relaxed text-amber-900 panel-oscuro:text-amber-200">
          <strong>Esto es una prueba, sólo en desarrollo.</strong> El ebook está inventado
          acá adentro: no toca la base, no gasta cupo y guardar no manda nada.
          {sinGuardar ? " Hay cambios sin guardar." : ""}
        </p>

        {guardado && (
          <p className="mb-4 rounded-xl bg-emerald-50 panel-oscuro:bg-emerald-500/10 px-3.5 py-2.5 text-[12px] leading-relaxed text-emerald-900 panel-oscuro:text-emerald-300">
            {guardado}
          </p>
        )}

        <div className="rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 p-4 sm:p-5">
          <EbookTexto
            inicial={{
              titulo: "Vendé tu conocimiento: de la idea al primer cobro",
              capitulos,
              total: capitulos.length,
            }}
            guardando={false}
            error={null}
            onCambio={setSinGuardar}
            onGuardar={(nuevos) => {
              setCapitulos(nuevos);
              const pedazos = nuevos.reduce((n, c) => n + c.bloques.length, 0);
              setGuardado(
                `Se habría guardado: ${nuevos.length} capítulos, ${pedazos} pedazos. Y después se rehacía el PDF.`,
              );
            }}
            onVolver={() => setGuardado("Acá volvería a la lista de productos.")}
          />
        </div>
      </div>
    </div>
  );
}
