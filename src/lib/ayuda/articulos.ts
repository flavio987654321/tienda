import type { Articulo } from "./tipos";

/* Los artículos, como datos.
 *
 * No son un `page.tsx` cada uno por dos razones. Una: el índice, el buscador,
 * el filtro por rubro y el sitemap salen todos de esta lista, y si cada
 * artículo fuera una página habría que acordarse de sumarlo a los cuatro
 * lugares a mano. Dos: el asistente del panel puede leer esto mismo, así que
 * lo que dice la ayuda y lo que contesta el asistente salen de una sola fuente
 * en vez de dos que se van separando con el tiempo.
 *
 * Regla al escribir: cada dato de este archivo tiene que ser verificable en el
 * código. Si un artículo dice "60 caracteres", ese 60 está en una constante del
 * repo. La ayuda que se escribe de memoria envejece sin que nadie se entere, y
 * el que descubre que la ayuda miente no la vuelve a abrir. */

export const ARTICULOS: Articulo[] = [
  // ───────────────────────────────────────────────────────────────── arrancar
  {
    slug: "publicar-la-tienda",
    titulo: "Publicar tu tienda",
    resumen:
      "Qué te pide TiendaApps antes de dejarte publicar, y qué cambia el día que le das a publicar.",
    grupo: "arrancar",
    clase: "mecanica",
    rol: "dueno",
    pantalla: { label: "Diseño", href: "/dashboard/configuracion" },
    actualizado: "2026-08-11",
    relacionados: ["que-significan-los-avisos-del-panel", "que-muestra-google-de-tus-productos"],
    cuerpo: [
      {
        t: "p",
        texto:
          "Mientras tu tienda no esté publicada, la ves solamente vos. El link funciona para vos porque tenés la sesión iniciada, pero un cliente que lo abre ve un cartel de **Próximamente**, y Google no la indexa.",
      },
      { t: "h", texto: "Los tres requisitos" },
      {
        t: "p",
        texto: "El botón de publicar no se destraba hasta que tengas las tres cosas:",
      },
      {
        t: "lista",
        items: [
          "**Un diseño elegido.** Cualquiera sirve y lo podés cambiar después, incluso con la tienda ya publicada.",
          "**Al menos un producto.** Uno alcanza. No hace falta el catálogo entero para arrancar.",
          "**Un método de cobro.** Mercado Pago, transferencia o efectivo. Con uno solo ya se destraba.",
        ],
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Si tocás publicar y no pasa nada, es que te falta alguno de los tres. El cartel te dice cuál — no es un error de la plataforma.",
      },
      { t: "ruta", label: "Publicar mi tienda", href: "/dashboard/configuracion" },
      { t: "h", texto: "Qué cambia cuando publicás" },
      {
        t: "lista",
        items: [
          "Tu tienda aparece en la página pública de tiendas de TiendaApps.",
          "Entra en el sitemap que lee Google, junto con cada uno de tus productos.",
          "El link deja de mostrar Próximamente y pasa a mostrar tu catálogo.",
        ],
      },
      {
        t: "p",
        texto:
          "Podés despublicarla cuando quieras desde el mismo lugar. No se borra nada: los productos, los pedidos y la configuración quedan igual.",
      },
    ],
  },

  {
    slug: "que-significan-los-avisos-del-panel",
    titulo: "Qué significan los avisos del panel",
    resumen:
      "Los números de colores y los triángulos del menú no son adornos: cada color quiere decir algo distinto.",
    grupo: "arrancar",
    clase: "mecanica",
    rol: "dueno",
    actualizado: "2026-08-11",
    relacionados: ["publicar-la-tienda"],
    cuerpo: [
      {
        t: "p",
        texto:
          "En el menú de la izquierda aparecen dos tipos de aviso: números de colores y triángulos. Quieren decir cosas distintas y conviene saber cuál es urgente.",
      },
      { t: "h", texto: "Los números de colores" },
      {
        t: "p",
        texto:
          "El número es cuántas cosas hay esperando en esa pantalla. El color te dice qué tan urgente es:",
      },
      {
        t: "tabla",
        cols: ["Color", "Qué significa"],
        filas: [
          [
            "Rojo",
            "Alguien espera que le contestes. Sale en Afiliados (solicitudes para vender lo tuyo) y en Consultas.",
          ],
          [
            "Naranja",
            "Alerta de stock. Sale en Productos cuando tenés artículos por debajo del mínimo que fijaste.",
          ],
          [
            "Amarillo",
            "Entró algo nuevo. Sale en Pedidos y en Carritos abandonados. No es urgente, pero no lo dejes para el lunes.",
          ],
        ],
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Cuando el número pasa de 9 el menú muestra **9+**. El total exacto lo ves entrando a la pantalla.",
      },
      { t: "h", texto: "El triángulo ámbar" },
      {
        t: "p",
        texto:
          "El triángulo no cuenta nada: te avisa que hay algo sin configurar. Hoy sale en dos lugares:",
      },
      {
        t: "tabla",
        cols: ["Dónde", "Qué te está pidiendo"],
        filas: [
          ["Pagos", "No tenés Mercado Pago conectado."],
          ["Configuración", "Tu tienda no tiene logo cargado."],
        ],
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Si tu tienda es de **vehículos**, el triángulo de Pagos no te va a aparecer nunca: ese rubro no cobra online, arregla la operación por fuera.",
      },
      { t: "ruta", label: "Ir a Pagos", href: "/dashboard/pagos" },
    ],
  },

  // ──────────────────────────────────────────────────────────────── encontrar
  {
    slug: "que-muestra-google-de-tus-productos",
    titulo: "Qué muestra Google de tus productos",
    resumen:
      "Cinco cosas de tu panel deciden cómo se ve tu producto en Google y en WhatsApp. Ninguna es obvia.",
    grupo: "encontrar",
    clase: "criterio",
    rol: "dueno",
    pantalla: { label: "Productos", href: "/dashboard/productos" },
    actualizado: "2026-08-11",
    relacionados: ["como-cargar-un-producto", "las-fotos-de-tus-productos"],
    cuerpo: [
      {
        t: "p",
        texto:
          "No hay trucos de SEO acá. Hay cinco campos de tu panel que deciden qué texto y qué imagen muestra Google —y qué se ve cuando alguien pega tu link en WhatsApp—. Estos cinco.",
      },

      { t: "h", texto: "1. El título SEO, si lo dejás vacío, se arma solo" },
      {
        t: "p",
        texto:
          "Si no escribís nada, el título que ve Google es **Nombre del producto — Nombre de tu tienda**. Funciona, pero es lo mismo que van a tener todos.",
      },
      {
        t: "p",
        texto:
          "El campo tiene un contador que se pone ámbar a los **60 caracteres**. No es un límite: podés pasarte. Es el punto donde Google empieza a cortar el título con puntos suspensivos, así que lo importante va antes de ese número.",
      },

      { t: "h", texto: "2. La descripción SEO vacía se saca de tu descripción" },
      {
        t: "p",
        texto:
          "Si no la escribís, se toman los primeros **160 caracteres** de la descripción del producto. Ahí está la trampa: si tu descripción arranca con *\"¡Hola! Bienvenidos a mi tienda 💕 Envíos a todo el país\"*, **eso** es lo que Google muestra debajo del título, en vez de decir qué estás vendiendo.",
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Los saludos y los datos de envío van al final de la descripción, no al principio. Los primeros 160 caracteres son los que trabajan.",
      },

      { t: "h", texto: "3. La primera foto es la que se ve en WhatsApp" },
      {
        t: "p",
        texto:
          "Cuando alguien comparte el link de un producto por WhatsApp, Instagram o Facebook, la imagen de la vista previa es **la primera foto del producto**. No es la mejor, ni la de portada: es literalmente la primera del orden que cargaste.",
      },
      {
        t: "p",
        texto:
          "Reordenar las fotos cambia lo que ve el que recibe el link. Es el cambio más barato que podés hacer y casi nadie lo hace.",
      },

      { t: "h", texto: "4. Las reseñas aprobadas salen como estrellas en Google" },
      {
        t: "p",
        texto:
          "Las reseñas que aprobás no se quedan en tu ficha: se le declaran a Google y pueden aparecer como estrellas en el resultado de búsqueda, con el promedio y la cantidad.",
      },
      {
        t: "p",
        texto:
          "Moderar reseñas entonces no es solo prolijidad. Una reseña aprobada es una estrella más en Google; una que dejás sin revisar no cuenta para nada.",
      },
      { t: "ruta", label: "Revisar reseñas pendientes", href: "/dashboard/resenas" },

      { t: "h", texto: "5. Sin publicar, nada de esto existe" },
      {
        t: "p",
        texto:
          "Una tienda sin publicar no entra al sitemap, y sin sitemap Google no visita tus fichas. Podés tener los cinco campos perfectos: si la tienda está despublicada, no los va a ver nadie.",
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Google no es inmediato. Entre que publicás y que aparecés en los resultados pueden pasar de días a semanas. No es que algo esté mal configurado.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────── vender
  {
    slug: "como-armar-una-promocion",
    titulo: "Cómo armar una promoción",
    resumen:
      "Los cinco tipos de promoción que podés armar, qué hace cada uno y dónde se aplica.",
    grupo: "vender",
    clase: "mecanica",
    rol: "dueno",
    pantalla: { label: "Promociones", href: "/dashboard/promociones" },
    checkout: "cart",
    actualizado: "2026-08-11",
    relacionados: ["que-promocion-conviene"],
    cuerpo: [
      {
        t: "p",
        texto:
          "Una promoción se arma en dos decisiones: **qué** descuento hacés y **dónde** se aplica. Son pasos separados y se eligen por separado.",
      },
      { t: "h", texto: "Los cinco tipos" },
      {
        t: "tabla",
        cols: ["Tipo", "Qué hace"],
        filas: [
          [
            "Porcentaje de descuento",
            "Un porcentaje menos en el precio. El cliente ve el precio original tachado y el nuevo debajo. Se aplica solo con entrar a tu tienda: no tiene que escribir ningún cupón.",
          ],
          [
            "Monto fijo de descuento",
            "Se resta la misma plata a cada producto, cueste lo que cueste. En uno de $30.000 son $5.000 menos, y en uno de $8.000 también.",
          ],
          [
            "Llevá N, pagá M",
            "Comprando varios del MISMO producto, uno va sin cargo. En un 3×2, llevando 3 unidades iguales, paga 2.",
          ],
          [
            "Combo: llevá N mezclando",
            "Como el 3×2 pero sin obligar a llevar el mismo producto: el cliente combina lo que quiera de lo que elijas y el más barato de cada 3 le sale gratis.",
          ],
          [
            "Envío gratis",
            "Si la compra supera el monto que pongas, el envío se bonifica en el checkout. Por debajo, paga envío normal.",
          ],
        ],
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "**Llevá N pagá M** y **Combo** se parecen y no son lo mismo. El primero exige que sean unidades del mismo producto. El segundo deja mezclar productos distintos.",
      },
      { t: "h", texto: "Dónde se aplica" },
      {
        t: "p",
        texto:
          "En el paso siguiente elegís el alcance: toda la tienda, algunas categorías, o productos sueltos. Es independiente del tipo — un porcentaje puede ser de toda la tienda o de tres productos, igual que un envío gratis.",
      },
      { t: "ruta", label: "Armar una promoción", href: "/dashboard/promociones" },
      {
        t: "p",
        texto:
          "Las promociones no necesitan cupón: se aplican solas al entrar. Si querés que el cliente tenga que escribir un código, eso es un **cupón**, que es otra pantalla.",
      },
    ],
  },

  {
    slug: "que-promocion-conviene",
    titulo: "Qué promoción te conviene",
    resumen:
      "Envío gratis, 20% off o 3×2 no dan el mismo resultado. Cuál usar según lo que quieras lograr.",
    grupo: "vender",
    clase: "criterio",
    rol: "dueno",
    checkout: "cart",
    actualizado: "2026-08-11",
    relacionados: ["como-armar-una-promocion"],
    cuerpo: [
      {
        t: "p",
        texto:
          "Armar la promoción es fácil. Elegir cuál es la decisión que mueve la aguja. Depende de qué querés que pase, y son cosas distintas.",
      },
      { t: "ruta", label: "Ver mis promociones", href: "/dashboard/promociones" },

      { t: "h", texto: "Si querés que compren más por vez" },
      {
        t: "p",
        texto:
          "**Envío gratis desde un monto** y **Combo: llevá N mezclando** son los dos que suben el ticket promedio, porque los dos le dan al cliente una razón para agregar una cosa más antes de pagar.",
      },
      {
        t: "p",
        texto:
          "El monto del envío gratis se pone un poco arriba de lo que la gente gasta normalmente. Si tu compra promedio es $40.000, ponerlo en $50.000 hace que sumen algo; ponerlo en $100.000 no lo va a alcanzar nadie y ponerlo en $30.000 se lo regalás a quien ya iba a comprar igual.",
      },

      { t: "h", texto: "Si querés liquidar stock" },
      {
        t: "p",
        texto:
          "**Monto fijo** pega distinto que porcentaje, y esa diferencia se usa. $5.000 de descuento sobre algo de $8.000 es un 62% y se ve enorme; el mismo monto sobre algo de $30.000 es un 17% y casi no se nota.",
      },
      {
        t: "p",
        texto:
          "O sea: monto fijo para vaciar lo barato, porcentaje para mover lo caro.",
      },

      { t: "h", texto: "Si querés que la tienda parezca activa" },
      {
        t: "p",
        texto:
          "**Porcentaje sobre una categoría** es el más visible: el precio tachado se ve en el listado, no solo adentro de la ficha. Una tienda con precios tachados se lee como una tienda que está pasando algo.",
      },

      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Una promoción permanente deja de ser una promoción. Si el 20% off está hace cuatro meses, el cliente ya lo lee como el precio normal y no apura nada. Ponele fecha de fin.",
      },

      { t: "h", texto: "Lo que no conviene" },
      {
        t: "lista",
        items: [
          "**Descuento sobre todo, siempre.** Te come el margen del que iba a comprar igual, sin traer a nadie nuevo.",
          "**Varias promociones a la vez sobre lo mismo.** El cliente no entiende qué precio paga y la desconfianza cuesta más que el descuento.",
          "**Envío gratis sin mínimo.** Si vendés cosas chicas, el envío se come toda la ganancia de la venta.",
        ],
      },
    ],
  },

  {
    slug: "cupones",
    titulo: "Cupones: cómo funcionan",
    resumen:
      "Un cupón es un código que el cliente escribe. Cuándo se agota, cuándo vence, y por qué a veces no vence nunca.",
    grupo: "vender",
    clase: "mecanica",
    rol: "dueno",
    pantalla: { label: "Cupones", href: "/dashboard/cupones" },
    checkout: "cart",
    actualizado: "2026-08-12",
    relacionados: ["cupon-o-promocion", "como-armar-una-promocion"],
    cuerpo: [
      {
        t: "p",
        texto:
          "Un cupón es un código que el cliente tiene que **escribir en el checkout**. Esa es toda la diferencia con una promoción, que se aplica sola.",
      },
      { t: "h", texto: "Los límites que le podés poner" },
      {
        t: "tabla",
        cols: ["Campo", "Qué hace"],
        filas: [
          ["Compra mínima", "Debajo de ese monto el código no se acepta. En cero, se acepta siempre."],
          [
            "Usos máximos",
            "Cuántas veces se puede usar en total, entre todos los clientes. Si lo dejás vacío es ilimitado.",
          ],
          [
            "Vencimiento",
            "La fecha en la que deja de funcionar. Si lo dejás vacío, el cupón **no vence nunca**.",
          ],
        ],
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Ese último es el que sorprende. Un cupón sin fecha de vencimiento queda vivo para siempre: el 30% de una promo de invierno lo puede seguir usando alguien en marzo del año que viene. Si el descuento es de una campaña, ponele fecha.",
      },
      { t: "h", texto: "Por qué un cupón deja de andar" },
      {
        t: "p",
        texto: "Si un cliente te dice que el código no le toma, es por una de estas cuatro:",
      },
      {
        t: "lista",
        items: [
          "**Vencido** — se le pasó la fecha.",
          "**Agotado** — llegó al tope de usos máximos.",
          "**Desactivado** — lo apagaste desde el panel.",
          "**No llega al mínimo** — la compra está por debajo de la compra mínima que pediste.",
        ],
      },
      {
        t: "p",
        texto:
          "En el listado del panel cada cupón muestra en qué grupo cayó, así que no hace falta adivinar cuál de las cuatro es.",
      },
      { t: "h", texto: "Un cupón vencido no se borra solo" },
      {
        t: "p",
        texto:
          "Deja de funcionar, pero **se queda en la lista para siempre**, con la etiqueta «Vencido» — para eso está la pestaña Vencidos. Si querés sacarlo de ahí, lo borrás vos con el tacho.",
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Un vencido **no te ocupa lugar** del tope de tu plan: el contador del panel ya lo descuenta. Borrarlo ordena la lista, no libera nada. El que sí ocupa lugar es el que está vigente aunque no lo use nadie.",
      },
      { t: "ruta", label: "Ver mis cupones", href: "/dashboard/cupones" },
    ],
  },

  {
    slug: "cupon-o-promocion",
    titulo: "¿Cupón o promoción?",
    resumen:
      "Las dos descuentan, pero no sirven para lo mismo. Cuál usar según a quién le querés hacer el precio.",
    grupo: "vender",
    clase: "criterio",
    rol: "dueno",
    checkout: "cart",
    actualizado: "2026-08-11",
    relacionados: ["cupones", "que-promocion-conviene"],
    cuerpo: [
      {
        t: "p",
        texto:
          "La diferencia técnica es chica: la **promoción** se aplica sola al entrar a tu tienda, el **cupón** hay que escribirlo. La diferencia práctica es enorme.",
      },
      {
        t: "tabla",
        cols: ["", "A quién le llega"],
        filas: [
          ["Promoción", "A todo el que entra. No hace falta que sepa nada."],
          ["Cupón", "Solamente al que tiene el código. Vos elegís a quién se lo das."],
        ],
      },

      { t: "h", texto: "Usá promoción cuando querés que se vea" },
      {
        t: "p",
        texto:
          "El precio tachado en el listado es lo que convierte a un curioso en comprador. Si el descuento es tu argumento de venta, tiene que estar a la vista, no escondido detrás de un código que nadie tiene.",
      },

      { t: "h", texto: "Usá cupón cuando el descuento es para alguien" },
      {
        t: "p",
        texto: "El cupón sirve justamente porque **no** es para todos:",
      },
      {
        t: "lista",
        items: [
          "Para los de tu lista de mails o tus seguidores, como premio por estar ahí.",
          "Para arreglar un problema — un pedido que llegó tarde, algo que salió mal.",
          "Para medir de dónde viene la gente: un código distinto por canal y después mirás cuál se usó.",
        ],
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Un cupón que termina publicado en la portada de tu tienda dejó de ser un cupón: es una promoción con un paso extra que hace que la mitad abandone. Si querés que lo use todo el mundo, hacelo promoción.",
      },

      { t: "h", texto: "Las dos juntas" },
      {
        t: "p",
        texto:
          "Se pueden usar a la vez, pero pensalo antes: entre el precio tachado y el código, el cliente puede terminar sin entender cuánto está pagando. La desconfianza cuesta más caro que el descuento.",
      },
    ],
  },

  {
    slug: "moderar-resenas",
    titulo: "Reseñas: cuáles se publican solas y cuáles no",
    resumen:
      "Las de producto salen publicadas, las de tu tienda esperan que las apruebes. Y las aprobadas van a Google.",
    grupo: "vender",
    clase: "mecanica",
    rol: "dueno",
    pantalla: { label: "Reseñas", href: "/dashboard/resenas" },
    checkout: "cart",
    actualizado: "2026-08-11",
    relacionados: ["que-muestra-google-de-tus-productos"],
    cuerpo: [
      {
        t: "p",
        texto:
          "No todas las reseñas se comportan igual, y la diferencia no es arbitraria: depende de a qué apuntan.",
      },
      {
        t: "tabla",
        cols: ["Tipo", "Qué pasa cuando entra"],
        filas: [
          [
            "De un producto",
            "Se publica sola. Está atada a algo concreto y le sirve a quien está por comprar ese producto.",
          ],
          [
            "De tu tienda",
            "Queda pendiente hasta que la aprobes. Va derecho a la portada y no apunta a ninguna compra, así que es lo más fácil de spamear que hay.",
          ],
        ],
      },
      { t: "h", texto: "El sello de compra verificada" },
      {
        t: "p",
        texto: "Una reseña puede llevar un sello verde, y hay dos formas de que lo tenga:",
      },
      {
        t: "lista",
        items: [
          "**Compra verificada** — el sistema la cruzó con un pedido real de tu tienda. Sale sola.",
          "**Verificada por vos** — se la pusiste a mano, porque sabés que esa persona compró aunque el pedido no esté en el sistema.",
        ],
      },
      {
        t: "p",
        texto:
          "El sello lo ve el comprador. Entre dos tiendas con cinco estrellas, gana la que las tiene verificadas.",
      },
      { t: "h", texto: "Qué podés hacer con cada una" },
      {
        t: "lista",
        items: [
          "**Aprobar** o **rechazar** las que están pendientes.",
          "**Eliminar** cualquiera, incluso una ya publicada.",
          "**Marcar o desmarcar** el sello de verificada.",
        ],
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Las reseñas aprobadas se le declaran a Google y pueden salir como **estrellas** en el resultado de búsqueda. Una que dejás pendiente no cuenta para nada — moderar no es solo prolijidad.",
      },
      { t: "ruta", label: "Revisar mis reseñas", href: "/dashboard/resenas" },
      {
        t: "p",
        texto:
          "Una recomendación: no borres las malas por ser malas. Una tienda con puro cinco estrellas se lee como comprada. Una reseña de tres bien contestada vende más que diez de cinco.",
      },
    ],
  },

  {
    slug: "carritos-abandonados",
    titulo: "Carritos abandonados",
    resumen:
      "Quién entra a esa lista, cuándo sale el mail automático y qué pasa si tocás el botón de recordar.",
    grupo: "vender",
    clase: "mecanica",
    rol: "dueno",
    pantalla: { label: "Carritos abandonados", href: "/dashboard/carritos-abandonados" },
    checkout: "cart",
    actualizado: "2026-08-11",
    relacionados: ["que-promocion-conviene", "publicar-la-tienda"],
    cuerpo: [
      {
        t: "p",
        texto:
          "Un carrito abandonado es alguien que llegó bastante lejos: cargó lo que quería y **dejó su email** en el checkout, pero nunca terminó de comprar. No es un curioso — es la persona más cerca de comprarte que vas a tener.",
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Se guarda uno por email. Si la misma persona vuelve y arma otro carrito, se actualiza el que ya estaba en vez de sumar uno nuevo.",
      },

      { t: "h", texto: "El mail automático" },
      {
        t: "p",
        texto:
          "Sale solo, una vez por día, y le llega a los carritos que quedaron quietos **entre 1 hora y 7 días**. Antes de la hora no, para no escribirle a alguien que todavía está comprando; después de la semana tampoco, porque ya no se acuerda.",
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Es **un solo** recordatorio automático por carrito. No hay una cadena de tres mails insistiendo.",
      },
      {
        t: "p",
        texto:
          "Y solo sale si tu tienda está publicada y abierta. Con la tienda cerrada no se manda: el link llevaría a un cartel de cerrado y el checkout rechazaría la compra igual. El carrito queda guardado y el mail sale en la próxima corrida, cuando vuelvas a abrir.",
      },

      { t: "h", texto: "El botón de recordar" },
      {
        t: "p",
        texto:
          "Además del automático, podés mandarle vos el recordatorio desde la lista. El mail lleva los productos que había dejado y un link que le devuelve el carrito armado.",
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Hay un tope de **un recordatorio manual cada 24 horas** por persona. Si tocás de nuevo antes, te lo va a rechazar. No es un error: es lo que evita que alguien reciba cinco mails tuyos en una tarde.",
      },
      { t: "ruta", label: "Ver carritos abandonados", href: "/dashboard/carritos-abandonados" },

      { t: "h", texto: "Cuánto duran" },
      {
        t: "p",
        texto:
          "Un carrito que nunca se recuperó se borra a los **45 días**. Si querés hacer algo con esa gente, es antes de eso.",
      },
      {
        t: "p",
        texto:
          "Lo que más recupera no es insistir: es entender por qué se fueron. Si muchos abandonan en el mismo punto, casi siempre es el costo del envío apareciendo al final. Un envío gratis desde cierto monto arregla más carritos que cualquier mail.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────── cobrar
  {
    slug: "los-estados-de-un-pedido",
    titulo: "Los estados de un pedido",
    resumen:
      "Qué significa cada estado, cuál cuenta como venta de verdad y qué pasa cuando cancelás.",
    grupo: "cobrar",
    clase: "mecanica",
    rol: "dueno",
    pantalla: { label: "Pedidos", href: "/dashboard/pedidos" },
    checkout: "cart",
    actualizado: "2026-08-11",
    relacionados: ["que-significan-los-avisos-del-panel"],
    cuerpo: [
      {
        t: "p",
        texto: "Un pedido pasa por cinco estados y vos los vas moviendo a mano:",
      },
      {
        t: "tabla",
        cols: ["Estado", "Qué significa"],
        filas: [
          [
            "Pendiente",
            "La persona armó el pedido pero todavía no lo confirmó nadie. Puede no llegar nunca.",
          ],
          [
            "En preparación",
            "Lo diste por bueno y lo estás armando. Acá arranca la venta de verdad.",
          ],
          ["Enviado", "Salió. Podés cargarle el código de seguimiento y el cliente lo ve."],
          ["Entregado", "Llegó. Cierra el ciclo."],
          ["Cancelado", "No va más, sea por vos o por el cliente."],
        ],
      },

      { t: "h", texto: "Cómo se mueve de uno a otro" },
      {
        t: "p",
        texto: "Cada pedido trae el botón del paso que le toca:",
      },
      {
        t: "pasos",
        items: [
          "**Confirmar pago recibido** o **Pasar a preparación** — de Pendiente a En preparación.",
          "**Marcar enviado** — y ahí le cargás el código de seguimiento.",
          "**Marcar entregado** — cierra el pedido.",
        ],
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Si tenés varios pedidos en el mismo estado, se pueden mover **de a varios** en vez de uno por uno.",
      },

      { t: "h", texto: "Cuál cuenta como venta" },
      {
        t: "p",
        texto:
          "Solo **En preparación, Enviado y Entregado**. Un pedido pendiente no suma a tus estadísticas, y está bien que así sea: contar plata que puede no llegar nunca infla los números y te hace tomar decisiones sobre algo que no existe.",
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Por eso el número de Pedidos en el menú es **amarillo** y no rojo: te avisa que entró algo, no que se vendió algo. Se vende cuando lo confirmás.",
      },

      { t: "h", texto: "Qué pasa cuando cancelás" },
      {
        t: "p",
        texto:
          "Si el pedido ya había salido de Pendiente y lo trajo un afiliado, al cancelarlo **se le revierte la comisión**. Es automático. Tiene sentido —esa venta no ocurrió— pero conviene saberlo antes de cancelar en lote.",
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Cada cambio de estado queda registrado con quién lo hizo y cuándo. Si después no coincide algo, el historial del pedido lo cuenta.",
      },
      { t: "ruta", label: "Ver mis pedidos", href: "/dashboard/pedidos" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────── cuenta
  {
    slug: "verificar-tu-cuenta",
    titulo: "Verificar tu identidad",
    resumen:
      "Qué documentos te pide, cuánto tarda y qué cambia en tu tienda cuando queda aprobada.",
    grupo: "cuenta",
    clase: "mecanica",
    rol: "dueno",
    pantalla: { label: "Perfil", href: "/dashboard/perfil" },
    actualizado: "2026-08-11",
    relacionados: ["publicar-la-tienda"],
    cuerpo: [
      {
        t: "p",
        texto:
          "Verificar es probar que sos quien decís. No es obligatorio para vender, pero cambia cómo te ve el que está por comprarte sin conocerte.",
      },

      { t: "h", texto: "Qué te pide" },
      {
        t: "lista",
        items: [
          "**DNI de frente** y **DNI de dorso**.",
          "**Una selfie**, para cruzarla con el documento.",
          "**CUIT o CUIL** — este es opcional, pero leé abajo antes de saltearlo.",
        ],
      },
      {
        t: "p",
        texto: "El equipo los revisa en **hasta 48 horas**. Mientras tanto queda en revisión.",
      },
      { t: "ruta", label: "Verificar mi identidad", href: "/dashboard/perfil" },

      { t: "h", texto: "Qué cambia cuando te aprueban" },
      {
        t: "lista",
        items: [
          "**El tilde azul** al lado del nombre de tu tienda.",
          "**Podés mostrar tu nombre y tu ciudad** al público. Son dos interruptores que recién se destraban con la verificación aprobada — antes están apagados y no se pueden tocar.",
          "**Tu CUIT aparece en la información legal** de tu tienda, que es lo que pide el artículo 4 de la Ley de Defensa del Consumidor.",
        ],
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Por eso conviene cargar el CUIT aunque sea opcional: sin él, la página legal de tu tienda queda sin el dato que la ley pide que esté.",
      },

      { t: "h", texto: "Qué NO pasa" },
      {
        t: "p",
        texto:
          "Verificar no publica nada tuyo por sí solo. Tu email **nunca** se muestra al público, verificado o no. El nombre y la ciudad se muestran únicamente si vos prendés esos interruptores.",
      },
      {
        t: "p",
        texto:
          "Y no hace falta para vender: podés publicar, cobrar y despachar sin estar verificado. Lo que te da es que un desconocido te crea más rápido.",
      },
    ],
  },

  {
    slug: "medios-de-cobro",
    titulo: "Cómo cobrar",
    resumen:
      "Mercado Pago, transferencia y efectivo. Cuál conviene y por qué a veces parece activado y no cuenta.",
    grupo: "cobrar",
    clase: "mecanica",
    rol: "dueno",
    pantalla: { label: "Pagos", href: "/dashboard/pagos" },
    checkout: "cart",
    actualizado: "2026-08-11",
    relacionados: ["publicar-la-tienda", "los-estados-de-un-pedido"],
    cuerpo: [
      {
        t: "p",
        texto:
          "Tenés tres formas de cobrar y podés usar las que quieras a la vez. Con **una sola** ya podés publicar la tienda.",
      },
      {
        t: "tabla",
        cols: ["Método", "Cómo funciona"],
        filas: [
          [
            "Mercado Pago",
            "Cobro online, con tarjeta. La plata va a tu cuenta de MP. Hay que conectar la cuenta una vez.",
          ],
          [
            "Transferencia",
            "Le mostrás tu CBU o alias al cliente y él transfiere. Vos confirmás el pedido cuando ves la plata.",
          ],
          [
            "Efectivo",
            "Se paga al recibir o al retirar. No hay nada que configurar más que activarlo.",
          ],
        ],
      },

      {
        t: "aviso",
        tono: "ojo",
        texto:
          "**La trampa de la transferencia:** activar el interruptor no alcanza. Si no cargás el CBU **o** el alias, el método no cuenta como configurado y la tienda te va a seguir diciendo que te falta un método de cobro, aunque lo veas prendido.",
      },

      { t: "h", texto: "Cuál conviene" },
      {
        t: "p",
        texto:
          "Mercado Pago cobra comisión, pero cobra solo y al instante. Transferencia no te cobra nada, pero alguien tiene que mirar si entró la plata antes de confirmar cada pedido — y ese alguien sos vos, todos los días.",
      },
      {
        t: "p",
        texto:
          "Lo más práctico es tener los dos: MP para el que quiere pagar con tarjeta y no esperar, transferencia para el que prefiere evitar el recargo.",
      },
      { t: "ruta", label: "Configurar mis cobros", href: "/dashboard/pagos" },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Con transferencia y efectivo el pedido entra como **pendiente** y lo confirmás vos cuando cobrás. Recién ahí cuenta como venta.",
      },
    ],
  },

  {
    slug: "consultas",
    titulo: "Las consultas de tus vehículos",
    resumen:
      "Qué es una consulta, en qué estados vive y cómo se convierte en una venta con comisión.",
    grupo: "cobrar",
    clase: "mecanica",
    rol: "dueno",
    pantalla: { label: "Consultas", href: "/dashboard/consultas" },
    checkout: "inquiry",
    actualizado: "2026-08-11",
    relacionados: ["que-significan-los-avisos-del-panel"],
    cuerpo: [
      {
        t: "p",
        texto:
          "En tu rubro no hay carrito ni checkout: la operación se cierra por fuera. Por eso tu panel no tiene Pedidos — tiene **Consultas**.",
      },
      {
        t: "p",
        texto:
          "Una consulta se crea cuando alguien toca *Consultar por WhatsApp* en una de tus publicaciones. Queda registrada con el vehículo, el precio y los datos que dejó.",
      },

      { t: "h", texto: "Los tres estados" },
      {
        t: "tabla",
        cols: ["Estado", "Qué significa"],
        filas: [
          ["Pendiente", "Consultó y todavía no sabés en qué terminó. Recién entró."],
          ["Confirmada", "La operación se cerró. Acá es donde se genera la comisión del afiliado."],
          ["Rechazada", "No se concretó. Cerrás el caso sin que genere comisión."],
        ],
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Marcar el estado no es burocracia: si la trajo un afiliado, la comisión se le acredita **al confirmar**. Una consulta que se cerró bien y quedó en pendiente es plata que esa persona no cobró.",
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Por eso el número de Consultas en el menú es **rojo** y no amarillo: alguien está esperando que le contestes.",
      },
      { t: "ruta", label: "Ver mis consultas", href: "/dashboard/consultas" },
    ],
  },

  // ─────────────────────────────────────────────────────────── encontrar (2)
  {
    slug: "las-fotos-de-tus-productos",
    titulo: "Las fotos: cuál va primera y por qué importa",
    resumen:
      "El orden de las fotos decide qué se ve en WhatsApp. Y qué foto vende no es la más linda.",
    grupo: "encontrar",
    clase: "criterio",
    rol: "dueno",
    actualizado: "2026-08-11",
    relacionados: ["que-muestra-google-de-tus-productos"],
    cuerpo: [
      {
        t: "p",
        texto:
          "La foto es lo único que el cliente puede tocar de tu producto. Y en tu panel hay una decisión sobre las fotos que casi nadie toma a propósito: **cuál va primera**.",
      },

      { t: "h", texto: "La primera foto trabaja doble" },
      {
        t: "p",
        texto:
          "Es la que se ve en el listado de tu tienda **y** la que aparece en la vista previa cuando alguien comparte el link por WhatsApp, Instagram o Facebook. No es la mejor del lote: es literalmente la primera del orden en que las cargaste.",
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Si tu primera foto es un detalle de la costura o una etiqueta, eso es lo que ve el que recibe el link — sin contexto y sin saber qué le mandaron.",
      },

      { t: "h", texto: "Qué foto va primera" },
      {
        t: "p",
        texto:
          "La que se entiende en un cuadradito de dos centímetros, mirada de reojo. O sea: **el producto entero, centrado, sobre un fondo que no compita.** Los detalles, las texturas y las fotos de uso van después, que ahí sí las miran con atención.",
      },

      { t: "h", texto: "Lo que hace la diferencia y no cuesta plata" },
      {
        t: "lista",
        items: [
          "**Luz de día, cerca de una ventana.** Le gana a cualquier filtro y a casi cualquier aro de luz.",
          "**Fondo parejo.** Una pared lisa, una sábana blanca. Lo que aparece atrás distrae aunque no lo notes.",
          "**El mismo encuadre en todos los productos.** Un catálogo donde cada foto está tomada distinto se ve improvisado, aunque cada foto por separado esté buena.",
          "**Algo que dé escala.** Una mano, una moneda. La pregunta que más frena una compra es *¿de qué tamaño es?*",
        ],
      },
      {
        t: "p",
        texto:
          "Si solo vas a arreglar una cosa, que sea la consistencia. Diez fotos parecidas y correctas venden más que dos excelentes y ocho desprolijas.",
      },
    ],
  },

  // ────────────────────────────────────────────────────────────── vender (2)
  {
    slug: "afiliados",
    titulo: "Que otros vendan lo tuyo",
    resumen:
      "Cómo funcionan los afiliados, cuánto se llevan y qué pasa cuando aprobás una solicitud.",
    grupo: "vender",
    clase: "mecanica",
    rol: "dueno",
    pantalla: { label: "Afiliados", href: "/dashboard/vendedoras" },
    actualizado: "2026-08-11",
    relacionados: ["los-estados-de-un-pedido"],
    cuerpo: [
      {
        t: "p",
        texto:
          "Un afiliado es alguien que promociona tus productos con un link propio. Si por ese link entra una venta, se lleva una comisión. No te cuesta nada hasta que vende.",
      },

      { t: "h", texto: "Cómo entra alguien a tu equipo" },
      {
        t: "pasos",
        items: [
          "La persona te manda una solicitud desde su panel de afiliado.",
          "A vos te aparece pendiente, con el número **rojo** en el menú — está esperando que le contestes.",
          "La aprobás y ahí recién se le generan sus links de venta.",
        ],
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Tenés un **cupo** de afiliados según tu plan. Cuando lo llenás no podés aprobar más hasta hacer lugar pausando a alguien. Conviene aprobar a quien realmente va a vender, no a todo el que pide.",
      },

      { t: "h", texto: "La comisión" },
      {
        t: "p",
        texto:
          "Arranca en **10%** y la definís vos por tienda. Se calcula sobre la venta y se acredita cuando el pedido pasa a **En preparación**.",
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Si después cancelás un pedido que ya había salido de Pendiente, la comisión se revierte sola. Esa venta no ocurrió.",
      },
      { t: "ruta", label: "Ver mis afiliados", href: "/dashboard/vendedoras" },
      {
        t: "p",
        texto:
          "El porcentaje que le pusiste a una venta queda congelado en ese pedido. Si mañana cambiás la comisión general, las ventas viejas siguen valiendo lo que valían.",
      },
    ],
  },

  {
    slug: "notificaciones",
    titulo: "Avisarle a tus clientes",
    resumen:
      "Dos canales que salen juntos: la notificación al celular y el mail. Quién recibe cada uno.",
    grupo: "vender",
    clase: "mecanica",
    rol: "dueno",
    pantalla: { label: "Notificaciones", href: "/dashboard/notificaciones" },
    actualizado: "2026-08-11",
    relacionados: ["carritos-abandonados"],
    cuerpo: [
      {
        t: "p",
        texto:
          "Desde acá le escribís a la gente que eligió seguir tu tienda. Un mensaje sale por **dos canales a la vez**, y no le llega a la misma gente por los dos.",
      },
      {
        t: "tabla",
        cols: ["Canal", "Quién lo recibe"],
        filas: [
          [
            "Notificación al celular",
            "El que aceptó recibir avisos desde tu tienda. Aparece como notificación del teléfono, sin abrir nada.",
          ],
          [
            "Mail",
            "El que se suscribió **y confirmó** desde su casilla. Sin confirmar no recibe.",
          ],
        ],
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Después de enviar vas a ver dos números, uno por canal. Están separados a propósito: si fueran uno solo, que un canal falle quedaría tapado por el otro.",
      },
      { t: "ruta", label: "Enviar una notificación", href: "/dashboard/notificaciones" },
      {
        t: "p",
        texto:
          "Sobre el contenido: la notificación al celular entra en un renglón y medio, así que lo que importa va al principio. Y mandá poco — de la lista de la que uno se borra es de la que escribe todas las semanas sin tener nada para decir.",
      },
    ],
  },

  {
    slug: "tu-plan",
    titulo: "Tu plan: prueba, activo y vencido",
    resumen:
      "En qué estado está tu suscripción, qué pasa cuando se vence y por qué no se renueva sola.",
    grupo: "cuenta",
    clase: "mecanica",
    rol: "dueno",
    pantalla: { label: "Mi plan", href: "/dashboard/mi-plan" },
    actualizado: "2026-08-11",
    relacionados: ["verificar-tu-cuenta"],
    cuerpo: [
      {
        t: "p",
        texto: "Tu suscripción pasa por estos estados:",
      },
      {
        t: "tabla",
        cols: ["Estado", "Qué significa"],
        filas: [
          [
            "Período de prueba",
            "El tiempo gratis del principio. Tenés todo funcionando y la pantalla te muestra los días que quedan.",
          ],
          ["Activa", "Está paga y al día."],
          [
            "Período de gracia",
            "Se venció pero todavía tenés unos días antes de que se corte, y también te los cuenta. Es el momento de renovar.",
          ],
          ["Vencida", "Se acabó la gracia."],
        ],
      },

      {
        t: "aviso",
        tono: "ojo",
        texto:
          "**No se renueva sola.** No hay débito automático: cuando termina el período, la renovación la hacés vos desde Mi plan. Si esperás que se cobre solo, tu tienda se te va a vencer.",
      },
      {
        t: "p",
        texto:
          "Te llegan avisos por mail antes de que se venza y cuando entrás en gracia, así que no depende de que te acuerdes de mirar. Pero el pago es siempre una acción tuya: el botón dice **Renovar ahora**, o **Reactivar suscripción** si ya se te venció.",
      },
      { t: "ruta", label: "Ver mi plan", href: "/dashboard/mi-plan" },

      { t: "h", texto: "Mensual o anual" },
      {
        t: "p",
        texto:
          "Podés pagar mes a mes o de una por el año. El anual sale más barato por mes; el mensual te deja salir antes. Si recién arrancás, mensual — cuando ya sabés que la tienda te funciona, el anual conviene.",
      },

      { t: "h", texto: "Si querés dejar de pagar" },
      {
        t: "p",
        texto:
          "Hoy no hay un botón de cancelar suscripción. Lo que corta el cobro es **cerrar la tienda**, y lo hace en el acto. Es una decisión más grande que pausar un pago, así que leelo bien antes.",
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Si solo querés que la tienda deje de verse un tiempo, **despublicarla** alcanza y no toca tu plan ni tus datos.",
      },
    ],
  },

  {
    slug: "envios",
    titulo: "Cómo entregar",
    resumen:
      "Las formas de entrega que ve el cliente al pagar: retiro, precio fijo, a coordinar o cotización automática.",
    grupo: "cobrar",
    clase: "mecanica",
    rol: "dueno",
    pantalla: { label: "Pagos", href: "/dashboard/pagos" },
    checkout: "cart",
    actualizado: "2026-08-12",
    relacionados: ["medios-de-cobro", "que-promocion-conviene"],
    cuerpo: [
      {
        t: "p",
        texto:
          "Las formas de entrega se configuran en **Pagos**, junto con los medios de cobro. Son las opciones que le aparecen al cliente cuando elige cómo recibir su compra.",
      },
      {
        t: "p",
        texto: "Venís con tres armadas y podés prender, apagar o renombrar las que quieras:",
      },
      {
        t: "lista",
        items: [
          "**Retiro en local / acordar** — sin cargo, la persona pasa a buscarlo.",
          "**Envío estándar** — el de tu zona.",
          "**Envío nacional** — al resto del país.",
        ],
      },

      { t: "h", texto: "Precio fijo o a coordinar" },
      {
        t: "p",
        texto: "Cada opción de envío se cobra de una de dos maneras:",
      },
      {
        t: "tabla",
        cols: ["Modo", "Qué ve el cliente"],
        filas: [
          ["Precio fijo", "El monto exacto, sumado al total antes de pagar."],
          [
            "A coordinar",
            "Las palabras *A coordinar* en vez de un precio. El costo lo arreglás vos después, por WhatsApp u otro medio.",
          ],
        ],
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "*A coordinar* es cómodo para vos y es una fricción para el que compra: no sabe cuánto va a terminar pagando, y esa es una de las razones más comunes por las que alguien abandona el carrito. Si podés poner un número, ponelo.",
      },

      { t: "h", texto: "Cotización automática" },
      {
        t: "p",
        texto:
          "Además podés activar que el envío se cotice solo, según el **código postal** del comprador y el **peso** del pedido. Calcula contra Correo Argentino, OCA y Andreani.",
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Viene apagada y no se puede prender hasta que completes tu **dirección de origen**. Sin saber desde dónde sale el paquete no hay forma de cotizarlo.",
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Hoy la cotización automática es solo **a domicilio**. Envío a sucursal todavía no está.",
      },
      { t: "ruta", label: "Configurar mis envíos", href: "/dashboard/pagos" },

      { t: "h", texto: "El envío gratis de una promoción" },
      {
        t: "p",
        texto:
          "Es aparte de todo esto. La promoción de envío gratis bonifica el costo en el checkout cuando la compra pasa cierto monto — no toca tus formas de entrega, se aplica arriba.",
      },
      {
        t: "p",
        texto:
          "Y lo que el envío *habría* costado queda guardado, así que tus estadísticas no cuentan como ganancia la plata que regalaste.",
      },
    ],
  },

  {
    slug: "como-cargar-un-producto",
    titulo: "Cómo cargar un producto",
    resumen:
      "Los campos que importan, la diferencia entre variantes y atributos, y cómo dejarlo programado.",
    grupo: "arrancar",
    clase: "mecanica",
    rol: "dueno",
    pantalla: { label: "Productos", href: "/dashboard/productos" },
    actualizado: "2026-08-12",
    relacionados: ["que-muestra-google-de-tus-productos", "las-fotos-de-tus-productos"],
    cuerpo: [
      {
        t: "p",
        texto:
          "El formulario es largo, pero para publicar alcanza con **nombre, precio y una foto**. Todo lo demás se puede completar después, con el producto ya en la calle.",
      },

      { t: "h", texto: "Los tres campos de precio" },
      {
        t: "tabla",
        cols: ["Campo", "Qué hace"],
        filas: [
          ["Precio", "Lo que paga el cliente. Es el único obligatorio."],
          [
            "Precio anterior",
            "Solo si está en oferta. Sale **tachado** al lado del precio nuevo y el porcentaje de descuento se calcula solo.",
          ],
          [
            "Costo",
            "Lo que te salió a vos. **Nunca se le muestra a nadie**: sirve para que el panel te calcule el margen.",
          ],
        ],
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "En tiendas de vehículos el campo Costo se reemplaza por **Gastos del vehículo**, que suma varios conceptos en vez de un número suelto.",
      },

      { t: "h", texto: "Variantes y atributos NO son lo mismo" },
      {
        t: "p",
        texto: "Es la confusión más común del formulario, y la diferencia es una sola:",
      },
      {
        t: "tabla",
        cols: ["", "Tiene stock propio"],
        filas: [
          [
            "Variantes",
            "**Sí.** Una fila por combinación —talle M negro, talle L negro— y cada fila lleva su stock, su precio y su código.",
          ],
          [
            "Atributos",
            "**No.** Son datos descriptivos: Material → Algodón, Género → Unisex. Informan, no se venden por separado.",
          ],
        ],
      },
      {
        t: "p",
        texto:
          "Regla para decidir: si se te puede **agotar por separado**, es una variante. Si no, es un atributo.",
      },

      { t: "h", texto: "El aviso de stock bajo" },
      {
        t: "p",
        texto:
          "Podés fijarle a cada producto —o a cada variante— un mínimo. Cuando el stock cae debajo de ese número, aparece el punto **naranja** en Productos, en el menú del panel. Sin mínimo cargado, ese aviso no salta nunca.",
      },

      { t: "h", texto: "Dejarlo programado" },
      {
        t: "p",
        texto:
          "No hace falta que estés despierto a la medianoche del lanzamiento: podés cargarlo hoy con fecha y hora futuras y se publica solo. Hasta ese momento no lo ve nadie más que vos.",
      },
      { t: "ruta", label: "Cargar un producto", href: "/dashboard/productos/nuevo" },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Los campos de **título y descripción para Google** están al final del formulario. No son obligatorios y vacíos se arman solos — pero conviene saber con qué, porque a veces sale cualquier cosa.",
      },
    ],
  },

  {
    slug: "elegir-y-editar-el-diseno",
    titulo: "Elegir y editar el diseño",
    resumen:
      "Los tres momentos de la pantalla de Diseño, y qué se puede cambiar sin romper nada.",
    grupo: "arrancar",
    clase: "mecanica",
    rol: "dueno",
    pantalla: { label: "Diseño", href: "/dashboard/configuracion" },
    actualizado: "2026-08-12",
    relacionados: ["publicar-la-tienda", "las-fotos-de-tus-productos"],
    cuerpo: [
      {
        t: "p",
        texto:
          "La pantalla de Diseño tiene tres momentos, y entender en cuál estás resuelve casi todas las dudas:",
      },
      {
        t: "pasos",
        items: [
          "**La galería** — todos los diseños disponibles. Acá elegís cuál mirar.",
          "**La vista previa** — el diseño aplicado a *tu* tienda, con tus productos de verdad. Todavía no cambiaste nada: si te vas, tu tienda queda como estaba.",
          "**El editor** — recién cuando tocás *Usar este diseño*. Acá sí estás modificando lo que ve el público.",
        ],
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Mirar un diseño **no** lo aplica. Podés recorrer todos los que quieras con la tienda publicada y no le cambia nada a nadie hasta que entres al editor y guardes.",
      },

      { t: "h", texto: "Cambiar de diseño no borra tu trabajo" },
      {
        t: "p",
        texto:
          "Los productos, los pedidos, los cupones y la configuración no dependen del diseño. Cambiás la vidriera, no lo que hay adentro. Podés probar otro y volver.",
      },

      { t: "h", texto: "La guía de esta pantalla" },
      {
        t: "p",
        texto:
          "Diseño es la única pantalla del panel que trae su propia guía en vivo, porque tiene dos: una para la vista previa y otra para el editor. Están en el **?** de arriba, y te van señalando los controles sobre la pantalla real.",
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Al lado del **?** está el ícono de **libro**, que abre este centro de ayuda. Son dos cosas distintas: el `?` explica *esta* pantalla, el libro explica el resto.",
      },
      { t: "ruta", label: "Ir a Diseño", href: "/dashboard/configuracion" },
    ],
  },

  {
    slug: "configuracion-de-la-tienda",
    titulo: "La configuración de tu tienda",
    resumen:
      "Tu dirección web, el dominio propio, el flyer de bienvenida y la tienda como app.",
    grupo: "arrancar",
    clase: "mecanica",
    rol: "dueno",
    pantalla: { label: "Configuración", href: "/dashboard/ajustes" },
    actualizado: "2026-08-12",
    relacionados: ["publicar-la-tienda", "notificaciones"],
    cuerpo: [
      {
        t: "p",
        texto:
          "Acá vive lo que no entra en ninguna otra pantalla: cómo se llega a tu tienda y qué pasa cuando alguien entra.",
      },

      { t: "h", texto: "Tu subdominio" },
      {
        t: "p",
        texto:
          "Es la dirección con la que arrancás y no cuesta nada. Es la que compartís por WhatsApp y la que Google indexa.",
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Pensalo antes de fijarlo: esa dirección va a quedar en los mensajes que ya mandaste, en los links que otros compartieron y en lo que Google ya guardó. Cambiarla después significa que todo eso deja de funcionar.",
      },

      { t: "h", texto: "Dominio personalizado" },
      {
        t: "p",
        texto:
          "Si comprás tu propio dominio, se conecta desde acá. Es lo que hace que la tienda deje de parecer prestada.",
      },
      {
        t: "p",
        texto:
          "No es instantáneo: después de conectarlo, internet tarda un rato en enterarse. Si al toque no anda, casi nunca está mal configurado — está tardando.",
      },

      { t: "h", texto: "Flyer de publicidad" },
      {
        t: "p",
        texto:
          "Una imagen que aparece al entrar a tu tienda. Sirve para anunciar algo puntual: una promo que arranca, un cambio de horario, una fecha especial.",
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Un flyer que queda puesto tres meses deja de anunciar y pasa a ser un cartel que hay que cerrar para poder comprar. Si ya no dice nada nuevo, sacalo.",
      },

      { t: "h", texto: "Tu tienda como app" },
      {
        t: "p",
        texto:
          "Tus clientes pueden instalarla en el celular y les queda con ícono propio, como cualquier app, sin pasar por ninguna tienda de aplicaciones. Es una función del plan Premium.",
      },
      { t: "ruta", label: "Ir a Configuración", href: "/dashboard/ajustes" },
    ],
  },

  {
    slug: "leer-tus-estadisticas",
    titulo: "Leer tus estadísticas",
    resumen:
      "Qué mide cada número, cuál mirar primero y por qué tus propias visitas no aparecen.",
    grupo: "cuenta",
    clase: "criterio",
    rol: "dueno",
    pantalla: { label: "Estadísticas", href: "/dashboard/metricas" },
    actualizado: "2026-08-12",
    relacionados: ["los-estados-de-un-pedido", "carritos-abandonados"],
    cuerpo: [
      {
        t: "p",
        texto:
          "La pantalla tira muchos números y no todos sirven para lo mismo. Estos son los que valen y en qué orden mirarlos.",
      },

      { t: "h", texto: "Los tres de arriba" },
      {
        t: "tabla",
        cols: ["Número", "Qué te dice"],
        filas: [
          [
            "Ingresos confirmados",
            "La plata de los pedidos que salieron de Pendiente. Los pendientes no entran: pueden no llegar nunca.",
          ],
          ["Pedidos", "Cuántas ventas, no cuánta plata. Sirve para ver si el problema es volumen o es precio."],
          [
            "Conversión",
            "De cada 100 que entraron, cuántos compraron. Es el más honesto de los tres.",
          ],
        ],
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "**Tus propias visitas no se cuentan.** Entrar veinte veces por día a mirar tu tienda no te ensucia la conversión.",
      },

      { t: "h", texto: "Margen y rentabilidad" },
      {
        t: "p",
        texto:
          "Si cargaste el **Costo** de tus productos, aparecen el margen promedio y la ganancia real del período. Sin ese dato, la pantalla te puede decir cuánto facturaste pero no cuánto ganaste — y son cosas muy distintas.",
      },
      {
        t: "p",
        texto:
          "**Rentabilidad por producto** es el cuadro que más cambia decisiones: casi siempre hay algo que vende mucho y deja poco, y algo que vende poco y deja mucho. Eso no se ve mirando solo los más vendidos.",
      },

      { t: "h", texto: "Comparar contra algo" },
      {
        t: "p",
        texto:
          "Un número solo no dice nada: $400.000 puede ser un mes excelente o uno malo. Por eso podés comparar el período con **el anterior** o con **el año pasado**.",
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Contra el año pasado suele ser más justo que contra el mes anterior, porque casi todos los rubros tienen temporada. Diciembre siempre le gana a noviembre, y eso no significa que estés mejorando.",
      },

      { t: "h", texto: "Clientes nuevos y repetidos" },
      {
        t: "p",
        texto:
          "La pantalla separa a los que **compraron por primera vez** de los que **ya te habían comprado**. Si casi todos son nuevos, estás gastando en atraer gente que no vuelve; si casi ninguno lo es, vendés bien pero no estás creciendo.",
      },
      { t: "ruta", label: "Ver mis estadísticas", href: "/dashboard/metricas" },
    ],
  },

  /* ═══════════════════════════════════════════════════════════════════════
     AFILIADOS

     Hasta acá todo estaba escrito para el dueño de una tienda. El afiliado
     entraba a la ayuda y encontraba veintidós artículos sobre pantallas que
     no tiene — incluido el que se llama "Afiliados", que también le habla al
     dueño: explica cómo aprobar y cómo pagar comisiones, no cómo vender.

     Estos siete son del otro lado del mostrador. Misma regla que arriba: cada
     número sale de una constante del repo, no de la memoria.
     ═══════════════════════════════════════════════════════════════════════ */

  {
    slug: "postularte-a-una-tienda",
    titulo: "Postularte a una tienda",
    resumen:
      "Cómo pedir permiso para vender los productos de una tienda, qué mira quien te aprueba y qué pasa si te dicen que no.",
    grupo: "arrancar",
    clase: "mecanica",
    rol: "afiliado",
    pantalla: { label: "Tiendas", href: "/afiliados/tiendas" },
    actualizado: "2026-08-13",
    relacionados: ["tu-link-de-afiliado", "tu-cuenta-de-afiliado"],
    cuerpo: [
      {
        t: "p",
        texto:
          "Como afiliado no vendés productos tuyos: vendés los de una tienda que ya existe, con un link propio, y cobrás una comisión por cada venta que entre por ese link. Para eso primero tenés que estar adentro de esa tienda.",
      },
      { t: "h", texto: "Elegir a dónde postularte" },
      {
        t: "p",
        texto:
          "En **Tiendas** aparecen las que tienen el programa de afiliados prendido. Las que no lo tienen no figuran: no es que te rechazaron, es que esa tienda todavía no abrió el programa.",
      },
      {
        t: "p",
        texto:
          "De cada una ves el **porcentaje de comisión** antes de postularte. Ese número lo pone el dueño y puede cambiarlo después, pero nunca de forma retroactiva: una venta ya hecha conserva el porcentaje que estaba vigente cuando se hizo.",
      },
      { t: "ruta", label: "Ver tiendas con programa abierto", href: "/afiliados/tiendas" },
      { t: "h", texto: "Qué te va a pedir la postulación" },
      {
        t: "lista",
        items: [
          "**Una presentación.** Quién sos y por qué querés vender eso.",
          "**Tu experiencia**, si tenés. No es obligatoria.",
          "**Tus redes**, como link o como @usuario. Es lo que más mira el dueño: quiere ver si tenés dónde mostrar los productos.",
          "**Un CV**, opcional, si tenés uno para adjuntar.",
        ],
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Todo eso es opcional salvo aceptar los términos. Pero una postulación vacía compite contra otras que sí contaron algo, y del otro lado hay una persona eligiendo.",
      },
      { t: "h", texto: "Y después" },
      {
        t: "pasos",
        items: [
          "Tu solicitud queda en **Pendiente**. El dueño la ve con un aviso rojo en su panel.",
          "Cuando decide, te llega un mail y una notificación en la campanita.",
          "Si te aprueban, tu link se genera en el momento y ya podés empezar.",
        ],
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Un dueño con plan Tienda Pro puede tener hasta 6 afiliados activos a la vez. Si esa tienda está llena, tu solicitud puede quedar esperando aunque le gustes — no es por vos.",
      },
      {
        t: "p",
        texto:
          "Te podés postular a varias tiendas al mismo tiempo, y conviene: cada una tiene su propio saldo y sus propias comisiones. Si una se cierra o te pausan, seguís vendiendo en las otras.",
      },
    ],
  },

  {
    slug: "tu-link-de-afiliado",
    titulo: "Tu link de afiliado",
    resumen:
      "Qué es exactamente el link, dónde sacarlo, y la condición que tiene que cumplirse para que una venta cuente como tuya.",
    grupo: "encontrar",
    clase: "mecanica",
    rol: "afiliado",
    pantalla: { label: "Mi panel", href: "/afiliados" },
    actualizado: "2026-08-13",
    relacionados: ["cuando-cobras-una-comision", "vender-mas-como-afiliado"],
    cuerpo: [
      {
        t: "p",
        texto:
          "Tu link es la tienda de siempre con una marca tuya al final. Se ve así:",
      },
      {
        t: "p",
        texto: "`tiendaapps.com/tienda/nombre-de-la-tienda?ref=tu-código`",
      },
      {
        t: "p",
        texto:
          "Esa parte de `?ref=` es todo el sistema: es lo que le dice a la tienda que quien está mirando llegó por vos. Sin eso, la venta entra igual pero como si hubiera venido sola.",
      },
      { t: "h", texto: "Lo más importante de todo" },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "La marca viaja en el link, no en la persona. Si alguien abre tu link, se va, y al otro día entra a la tienda escribiendo la dirección a mano, esa compra **no** cuenta como tuya. Por eso conviene que compartas el link cada vez, y no que le digas a la gente el nombre de la tienda.",
      },
      {
        t: "p",
        texto:
          "Mientras la persona se quede navegando dentro de la tienda que abriste vos, la marca la acompaña: puede mirar productos, abrir fichas y comprar, y todo eso sigue siendo tuyo.",
      },
      { t: "h", texto: "Tu catálogo propio" },
      {
        t: "p",
        texto:
          "Además del link tenés una página tuya, con tu nombre y tu foto arriba y los productos de la tienda abajo. Todo lo que se toca ahí ya sale marcado con tu código, así que es más difícil equivocarse que compartiendo links sueltos.",
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Los precios y las fotos salen siempre de la tienda, en vivo. Vos no los podés cambiar — y eso te protege: nunca vas a estar mostrando un precio que ya no existe.",
      },
      { t: "ruta", label: "Ver mi link y mi catálogo", href: "/afiliados" },
      { t: "h", texto: "Para pegar en otros lados" },
      {
        t: "p",
        texto:
          "En **Plantillas** hay textos ya escritos para WhatsApp, para la bio de Instagram y para mail, con tu link puesto. Son para copiar y pegar, o para arrancar y cambiarles lo que quieras.",
      },
      { t: "ruta", label: "Ver plantillas", href: "/afiliados/plantillas" },
    ],
  },

  {
    slug: "cuando-cobras-una-comision",
    titulo: "Cuándo cobrás una comisión",
    resumen:
      "En qué momento exacto la plata pasa a ser tuya, con qué porcentaje se calcula y los tres casos en los que una venta no genera comisión.",
    grupo: "cobrar",
    clase: "mecanica",
    rol: "afiliado",
    pantalla: { label: "Mis pedidos", href: "/afiliados/pedidos" },
    actualizado: "2026-08-13",
    relacionados: ["pedir-un-retiro", "tu-link-de-afiliado"],
    cuerpo: [
      {
        t: "p",
        texto:
          "Una venta por tu link no te paga en el momento en que entra. Te paga cuando el pedido queda confirmado.",
      },
      { t: "h", texto: "El momento exacto" },
      {
        t: "tabla",
        cols: ["Estado del pedido", "Tu comisión"],
        filas: [
          ["Pendiente", "Todavía nada. Es un pedido armado que nadie pagó ni confirmó."],
          ["Confirmado", "Se acredita en tu saldo, entera y de una vez."],
          ["Enviado / Entregado", "Ya estaba acreditada desde que se confirmó. No se suma de nuevo."],
        ],
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Cuando el pago entra por Mercado Pago, la confirmación es automática y la comisión aparece sola. Con transferencia o efectivo la confirma el dueño a mano, así que ahí puede tardar lo que tarde esa persona.",
      },
      { t: "ruta", label: "Ver mis pedidos", href: "/afiliados/pedidos" },
      { t: "h", texto: "Con qué porcentaje se calcula" },
      {
        t: "p",
        texto:
          "Con el que estaba vigente **el día de la compra**, no con el de hoy. El porcentaje queda guardado en el pedido en el momento en que se hace. Si mañana el dueño lo baja, tus ventas viejas conservan el de antes.",
      },
      {
        t: "p",
        texto:
          "Se calcula sobre el precio de los productos menos los descuentos, sin el envío. El envío nunca entra en la cuenta.",
      },
      { t: "h", texto: "Los tres casos en que no cobrás" },
      {
        t: "lista",
        items: [
          "**El pedido quedó en Pendiente.** Nunca se confirmó, así que no hay venta.",
          "**Compraste vos.** Si el mail del comprador es el mismo que el tuyo, el sistema no genera comisión. Es a propósito.",
          "**La compra no entró por tu link.** Aunque vos hayas recomendado esa tienda.",
        ],
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Si el comprador desconoce el pago en su tarjeta y Mercado Pago le da la razón, esa comisión se revierte. Es plata que la tienda tampoco cobró.",
      },
    ],
  },

  {
    slug: "pedir-un-retiro",
    titulo: "Pedir un retiro",
    resumen:
      "Cuánto necesitás juntar, qué datos hay que cargar, cuánto tarda y por qué a veces el botón está bloqueado.",
    grupo: "cobrar",
    clase: "mecanica",
    rol: "afiliado",
    pantalla: { label: "Mi billetera", href: "/afiliados/billetera" },
    actualizado: "2026-08-13",
    relacionados: ["cuando-cobras-una-comision"],
    cuerpo: [
      {
        t: "p",
        texto:
          "Tus comisiones se juntan en tu billetera. Ahí quedan hasta que vos pidas retirarlas: no se transfieren solas ni tienen fecha de vencimiento.",
      },
      { t: "h", texto: "Lo que hace falta" },
      {
        t: "lista",
        items: [
          "**$100 de saldo como mínimo** para poder pedir el retiro.",
          "**Tu CBU, CVU o alias** cargado en la billetera. Sin eso el botón no se destraba.",
        ],
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Si vendés en varias tiendas, el saldo se suma. Pedís un monto y el sistema lo arma solo, empezando por la tienda donde más tenés.",
      },
      { t: "ruta", label: "Ir a mi billetera", href: "/afiliados/billetera" },
      { t: "h", texto: "Cuánto tarda" },
      {
        t: "p",
        texto:
          "Entre **1 y 3 días hábiles**. Apenas lo pedís, el monto sale de tu saldo disponible y queda como *en proceso* — no desapareció, está reservado para esa transferencia.",
      },
      { t: "h", texto: "Por qué el botón puede estar bloqueado" },
      {
        t: "tabla",
        cols: ["Qué ves", "Por qué"],
        filas: [
          [
            "Falta cargar tu CBU o alias",
            "No hay a dónde mandar la plata. Se carga en la misma pantalla.",
          ],
          [
            "Bloqueado 72 horas",
            "Cambiaste tus datos bancarios recién. La espera es a propósito: si alguien entrara a tu cuenta, no podría cambiar el CBU y retirar en el mismo rato.",
          ],
          [
            "Ya tenés un retiro pendiente",
            "Se procesa de a uno por tienda. Cuando ese se acredita, podés pedir el siguiente.",
          ],
        ],
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Revisá el CBU antes de guardarlo. La transferencia sale a los datos que estaban cargados en el momento del pedido, y una vez enviada a una cuenta equivocada no hay forma de traerla de vuelta desde el panel.",
      },
    ],
  },

  {
    slug: "premios-y-niveles",
    titulo: "Premios y niveles",
    resumen:
      "Cada mes tu nivel se calcula solo según lo que generaste, y de Plata para arriba se convierte en cupones de descuento.",
    grupo: "vender",
    clase: "mecanica",
    rol: "afiliado",
    pantalla: { label: "Mis premios", href: "/afiliados/premios" },
    actualizado: "2026-08-13",
    relacionados: ["vender-mas-como-afiliado", "cuando-cobras-una-comision"],
    cuerpo: [
      {
        t: "p",
        texto:
          "Además de tus comisiones, cada mes cerrado te da un nivel. De **Plata** para arriba, ese nivel se convierte en cupones de descuento para comprar en tiendas de TiendaApps.",
      },
      {
        t: "tabla",
        cols: ["Nivel", "Tu cupón"],
        filas: [
          ["Bronce", "Sin cupón. Es el punto de partida."],
          ["Plata", "15% de descuento"],
          ["Oro", "20% de descuento"],
          ["Diamante", "25% de descuento"],
        ],
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Tres meses seguidos en Diamante suman un cupón extra de **40%**, aparte del que te toca por el mes.",
      },
      { t: "h", texto: "Cuánto hay que generar" },
      {
        t: "p",
        texto:
          "Depende del tipo de tienda, y no es un capricho: en una tienda de ropa una comisión son unos pesos y en una de autos son muchos, así que el mismo número dejaría a la mitad de la gente sin poder llegar nunca. El sistema mira cuánto deja en promedio cada venta tuya y ajusta la vara solo.",
      },
      {
        t: "tabla",
        cols: ["Tipo de tienda", "Para llegar a Plata / Oro / Diamante"],
        filas: [
          ["Común (ropa, accesorios, consumo)", "$15.000 / $50.000 / $150.000 en el mes"],
          ["Mayorista", "$75.000 / $250.000 / $750.000"],
          ["Alto valor (autos, inmuebles)", "$500.000 / $1.500.000 / $5.000.000"],
        ],
      },
      { t: "h", texto: "Dos cosas para tener en cuenta" },
      {
        t: "lista",
        items: [
          "**Los cupones vencen.** Tenés alrededor de un mes para usarlos desde que se generan.",
          "**No todas las tiendas los aceptan.** Cada dueño decide si acepta cupones de premio en su tienda. En tu pantalla de premios ves dónde se pueden usar.",
        ],
      },
      { t: "ruta", label: "Ver mis premios", href: "/afiliados/premios" },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "El nivel se calcula solo con las comisiones del mes cerrado, y solo si tu cuenta estaba activa. Un mes con la afiliación pausada no genera nivel.",
      },
    ],
  },

  {
    slug: "vender-mas-como-afiliado",
    titulo: "Qué hace que un afiliado venda",
    resumen:
      "La diferencia entre los que venden y los que no casi nunca es cuánta gente los sigue. Es otra cosa, y se puede copiar.",
    grupo: "vender",
    clase: "criterio",
    rol: "afiliado",
    actualizado: "2026-08-13",
    relacionados: ["tu-link-de-afiliado", "premios-y-niveles"],
    cuerpo: [
      {
        t: "p",
        texto:
          "Este artículo no tiene botones. Es lo que conviene hacer, no dónde hacer clic.",
      },
      { t: "h", texto: "El link se comparte, no se dicta" },
      {
        t: "p",
        texto:
          "Es el error que más plata cuesta y el más fácil de arreglar. Decirle a alguien «entrá a tal tienda» te deja afuera de esa venta: sin tu link, la compra no es tuya. El link tiene que estar pegado, no dicho.",
      },
      { t: "h", texto: "Un producto le gana a un catálogo" },
      {
        t: "p",
        texto:
          "Mandar «mirá todo lo que tienen» obliga al otro a elegir, y elegir cansa. Mandar un producto puntual con el precio y una razón —«esto es lo que más se está llevando», «esto te queda bien»— convierte muchísimo más.",
      },
      {
        t: "p",
        texto:
          "Tu página de catálogo sirve para la bio y para el estado, donde el link es uno solo. Para hablarle a una persona, andá al producto.",
      },
      { t: "h", texto: "Mirá qué se está mirando" },
      {
        t: "p",
        texto:
          "Tu panel te muestra cuántos clics recibió tu link y cuántos terminaron en venta. Esos dos números juntos dicen más que cualquiera de los dos solo:",
      },
      {
        t: "tabla",
        cols: ["Lo que ves", "Qué está pasando"],
        filas: [
          [
            "Pocos clics, buena conversión",
            "Sabés vender, te falta alcance. El problema está antes del link.",
          ],
          [
            "Muchos clics, poca conversión",
            "Llevás gente que no estaba buscando eso. El problema es a quién le hablás, no cuánto.",
          ],
        ],
      },
      { t: "ruta", label: "Ver mis estadísticas", href: "/afiliados/estadisticas" },
      { t: "h", texto: "Vendé donde ya te conocen" },
      {
        t: "p",
        texto:
          "Los primeros pedidos casi nunca vienen de desconocidos: vienen de gente que ya te tiene confianza. Empezar por ahí no es hacer trampa, es el orden natural — y esas ventas son las que te dan el historial que después mira el resto.",
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Si la tienda tiene una meta del mes, en tu panel ves cuánto falta. Esas metas suman un bonus arriba de tu comisión normal, así que un mes con meta cerca vale más que uno sin ella.",
      },
      { t: "h", texto: "Nunca prometas lo que no controlás" },
      {
        t: "p",
        texto:
          "Los precios, el stock y los envíos son de la tienda, no tuyos. Prometer una entrega o un descuento que no está publicado te va a explotar a vos, que sos la cara que la persona conoce.",
      },
    ],
  },

  {
    slug: "tu-cuenta-de-afiliado",
    titulo: "Tu cuenta de afiliado",
    resumen:
      "Qué cuesta, por qué no podés usarla también como dueño de tienda, y qué pasa con tu plata si te pausan o si la tienda cierra.",
    grupo: "cuenta",
    clase: "mecanica",
    rol: "afiliado",
    // Sin `pantalla`: no habla de una pantalla sino de cómo funciona la cuenta.
    // El `?` de /afiliados abre el artículo del link, que es lo que se busca
    // estando parado ahí.
    actualizado: "2026-08-13",
    relacionados: ["postularte-a-una-tienda", "pedir-un-retiro"],
    cuerpo: [
      { t: "h", texto: "Es gratis, y no hay letra chica" },
      {
        t: "p",
        texto:
          "La cuenta de afiliado no tiene suscripción, ni prueba que se vence, ni costo por venta. Lo que cobra la plataforma lo paga la tienda con su plan. Vos cobrás tu comisión y listo.",
      },
      { t: "h", texto: "Una cuenta es una sola cosa" },
      {
        t: "p",
        texto:
          "Cuando te registrás elegís qué vas a ser: afiliado, dueño de tienda o cliente. Esa elección no se cambia después, y tampoco podés usar la misma cuenta para dos cosas.",
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "No es una limitación técnica, es a propósito: los tres paneles muestran cosas distintas y cobran distinto. Si además querés tener tu propia tienda, se hace con otra cuenta y otro mail.",
      },
      { t: "h", texto: "Si te pausan o te dan de baja" },
      {
        t: "p",
        texto:
          "El dueño de una tienda puede pausarte o darte de baja cuando quiera. En los dos casos tu link de esa tienda deja de funcionar.",
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Tu plata no se toca. El saldo que ya tenías acreditado sigue siendo tuyo y lo podés retirar igual — pausar o dar de baja no cancela ninguna comisión ya generada.",
      },
      {
        t: "p",
        texto:
          "La diferencia entre las dos es que de una pausa se vuelve: el dueño te reactiva y seguís donde estabas. La baja es más definitiva y no te vas a poder postular de nuevo a esa tienda salvo que te vuelvan a dar acceso.",
      },
      { t: "h", texto: "Si la tienda cierra" },
      {
        t: "p",
        texto:
          "Te llega un mail avisando. Tu link queda pausado, pero tu saldo sigue disponible para retirar. Y si esa tienda vuelve a abrir, recuperás tu lugar automáticamente: no tenés que postularte otra vez.",
      },
      { t: "h", texto: "Tus datos bancarios" },
      {
        t: "p",
        texto:
          "El CBU y el CUIL se guardan cifrados y no los ve el dueño de la tienda. La transferencia la hace TiendaApps, no la tienda — el dueño nunca ve a dónde va tu plata.",
      },
      { t: "ruta", label: "Ver los términos del programa", href: "/afiliados/terminos" },
    ],
  },

  {
    slug: "material-para-publicar",
    titulo: "Plantillas y kit de contenido",
    resumen:
      "Dos pantallas que te dan lo que hay que publicar ya hecho: los textos por un lado, las imágenes por el otro.",
    grupo: "encontrar",
    clase: "mecanica",
    rol: "afiliado",
    pantalla: { label: "Plantillas", href: "/afiliados/plantillas" },
    actualizado: "2026-08-13",
    relacionados: ["tu-link-de-afiliado", "vender-mas-como-afiliado"],
    cuerpo: [
      {
        t: "p",
        texto:
          "Lo que más frena a alguien que arranca no es no tener a quién venderle: es no saber **qué escribir**. Estas dos pantallas resuelven eso — una te da el texto, la otra la imagen.",
      },
      { t: "h", texto: "Plantillas: qué escribir" },
      {
        t: "p",
        texto:
          "Son 10 mensajes ya redactados, **con tu link adentro**, para copiar y pegar. Están separados por dónde los vas a mandar, porque un texto de WhatsApp no funciona en un caption de Instagram:",
      },
      {
        t: "tabla",
        cols: ["Canal", "Qué hay"],
        filas: [
          ["WhatsApp", "Presentar la tienda, un producto puntual, una oferta y un catálogo formal."],
          ["Instagram", "Caption de feed, texto de historia y caption de oferta con hashtags."],
          ["Telegram", "Un mensaje pensado para grupos."],
          ["General", "Bio de perfil y un mail para mandarle a tus contactos."],
        ],
      },
      {
        t: "p",
        texto:
          "Cada uno viene además en un tono: **casual**, **profesional** o **urgente**. El mismo producto no se anuncia igual a una amiga que a una lista de clientes.",
      },
      { t: "h", texto: "No todos mandan lo mismo" },
      {
        t: "p",
        texto:
          "Cada mensaje está escrito en tres versiones distintas, y a vos te toca una. Otra persona que venda la misma tienda tiene otra: si las dos le escriben al mismo contacto, no le llega el mismo texto calcado dos veces.",
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "La tuya no cambia sola. Si encontraste una que te funciona, va a seguir siendo esa. Para probar las otras está el botón **Otra versión**, abajo a la izquierda del mensaje.",
      },
      { t: "h", texto: "Los dos campos de arriba" },
      {
        t: "p",
        texto:
          "Arriba de todo hay dos casilleros opcionales, **Producto** y **Precio**. Si los completás, los mensajes que hablan de un producto puntual se rellenan solos con ese nombre y ese precio.",
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Si los dejás vacíos las plantillas igual funcionan: en vez del producto dicen algo general. Pero un mensaje con nombre y precio convierte bastante más que uno que dice «mirá todo lo que tienen».",
      },
      { t: "ruta", label: "Ver las plantillas", href: "/afiliados/plantillas" },
      { t: "h", texto: "Kit: qué mostrar" },
      {
        t: "p",
        texto:
          "El kit es lo mismo pero del lado visual. Elegís un producto de la tienda y te da sus fotos **con tu marca de agua** —para descargar y subir— más un texto listo y hashtags sugeridos para ese producto.",
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Las plantillas y el kit son un punto de partida, no un guion. El que copia y pega igual que otros diez suena a folleto; dos frases tuyas arriba cambian el resultado.",
      },
      { t: "ruta", label: "Ver el kit de contenido", href: "/afiliados/kit" },
    ],
  },

  {
    slug: "metas-y-ranking",
    titulo: "Metas y ranking",
    resumen:
      "Las dos pantallas que te muestran contra qué estás compitiendo: un objetivo que paga extra y tu posición entre los demás.",
    grupo: "vender",
    clase: "mecanica",
    rol: "afiliado",
    pantalla: { label: "Mis metas", href: "/afiliados/metas" },
    actualizado: "2026-08-13",
    relacionados: ["vender-mas-como-afiliado", "cuando-cobras-una-comision"],
    cuerpo: [
      { t: "h", texto: "Metas: plata extra por llegar" },
      {
        t: "p",
        texto:
          "Una tienda puede fijar un **objetivo de comisiones para el mes**. Si lo alcanzás, cobrás un porcentaje extra arriba de tu comisión normal.",
      },
      {
        t: "p",
        texto:
          "El objetivo y el extra los pone el dueño de cada tienda: el extra va de **0,5% a 20%**. En tu pantalla ves cuánto llevás, cuánto falta y qué porcentaje está en juego.",
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Las metas son por mes y por tienda, no acumuladas. Si vendés en tres tiendas, cada una puede tener la suya — o ninguna. Cuando ninguna tiene meta activa, la pantalla te lo dice.",
      },
      { t: "ruta", label: "Ver mis metas", href: "/afiliados/metas" },
      { t: "h", texto: "Ranking: dónde estás parado" },
      {
        t: "p",
        texto:
          "El ranking ordena a los afiliados de una tienda por **comisiones generadas en el mes**. Se reinicia cada mes, así que un mes flojo no te arrastra para siempre.",
      },
      {
        t: "aviso",
        tono: "ojo",
        texto:
          "Estar abajo no significa nada por sí solo: hay gente que arrancó hace más tiempo o que vende en un rubro de tickets más altos. El número que te conviene mirar es el tuyo del mes pasado, no el de arriba.",
      },
      { t: "ruta", label: "Ver el ranking", href: "/afiliados/ranking" },
    ],
  },
];
