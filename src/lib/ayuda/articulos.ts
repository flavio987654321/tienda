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
    pantalla: { label: "Cupones", href: "/dashboard/cupones" },
    checkout: "cart",
    actualizado: "2026-08-11",
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
          ["Confirmado", "Lo diste por bueno. Acá arranca la venta de verdad."],
          ["Enviado", "Salió. Podés cargarle el código de seguimiento y el cliente lo ve."],
          ["Entregado", "Llegó. Cierra el ciclo."],
          ["Cancelado", "No va más, sea por vos o por el cliente."],
        ],
      },

      { t: "h", texto: "Cuál cuenta como venta" },
      {
        t: "p",
        texto:
          "Solo **Confirmado, Enviado y Entregado**. Un pedido pendiente no suma a tus estadísticas, y está bien que así sea: contar plata que puede no llegar nunca infla los números y te hace tomar decisiones sobre algo que no existe.",
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
          "Si el pedido ya estaba confirmado y lo trajo un afiliado, al cancelarlo **se le revierte la comisión**. Es automático. Tiene sentido —esa venta no ocurrió— pero conviene saberlo antes de cancelar en lote.",
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
          "Arranca en **10%** y la definís vos por tienda. Se calcula sobre la venta y se acredita cuando el pedido queda confirmado.",
      },
      {
        t: "aviso",
        tono: "dato",
        texto:
          "Si después cancelás un pedido que ya estaba confirmado, la comisión se revierte sola. Esa venta no ocurrió.",
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
          ["En prueba", "El período gratis del principio. Tenés todo funcionando."],
          ["Activo", "Está pago y al día."],
          ["En gracia", "Se venció pero todavía tenés unos días antes de que se corte. Es el momento de renovar."],
          ["Vencido", "Se acabó la gracia."],
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
          "Te llegan avisos por mail antes de que se venza y cuando entrás en gracia, así que no depende de que te acuerdes de mirar. Pero el pago es siempre una acción tuya.",
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
];
