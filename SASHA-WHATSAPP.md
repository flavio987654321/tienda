# SASHA EN WHATSAPP — PLAN

> Creado: 2026-06-24 | Reescrito: 2026-07-29 con las decisiones de alcance tomadas.
> **Solo planificación. No se escribe código hasta que este documento esté leído y aprobado entero.**
> Workflow: 🟪 pendiente | 🟦 en progreso | ✅ hecho | ❌ descartado con justificación
> Punto de partida: Sasha ya funciona en `/dashboard` (ver `ASISTENTE-IA.md`) — mismo modelo (Claude Haiku 4.5), mismo `getStoreSnapshot()`, mismo `buildSystemPrompt()`. Esto es **un canal nuevo**, no un cerebro nuevo.

---

## QUÉ ES Y QUÉ NO ES

**Es:** que la dueña le pueda **preguntar** a Sasha desde WhatsApp y que le conteste, sin tener que entrar al panel.

**No es** (decidido el 29/07, no son "para más adelante" sin fecha — son NO):

| | Por qué no |
|---|---|
| ❌ Sasha manda avisos por WhatsApp | Decisión de producto: no queremos que hable sola por ahí. Y técnicamente es el camino caro — ver "La ventana de 24 horas" abajo. |
| ❌ Las clientas finales le escriben a la tienda | Otro producto: otro prompt, otro riesgo, otro volumen. Era la FASE 4 del plan viejo. Queda fuera de este documento. |
| ❌ Un número de WhatsApp por tienda | Innecesario: la dueña le habla a su asistente, no a sus clientas. Un número solo para todo TiendaApps. |

**Es sólo para Premium.** Y el plan Pro tiene que enterarse de que existe (ver "El upsell").

---

## LO QUE HACE QUE ESTO SEA VIABLE — LA VENTANA DE 24 HORAS

Es la regla de Meta que define todo el diseño, así que va primero.

```
La persona escribe  →  tenés 24hs para contestarle texto libre  →  GRATIS
El negocio escribe primero, fuera de esa ventana  →  plantilla aprobada  →  SE PAGA
```

Como Sasha **sólo contesta**, siempre estamos del lado gratis. Meta no cobra un peso: el único costo son los tokens de Claude.

Ese es exactamente el motivo por el que el aviso de la mañana no puede salir por acá. A las 09:00 la dueña no escribió nada, así que sería el negocio arrancando la conversación: plantilla aprobada por Meta, paga por mensaje, por tienda, todos los días. Y peor — **las plantillas son de texto fijo con huecos**, así que los avisos habría que reescribirlos como `"Tenés {{1}} pedidos sin despachar"`, que es justo el mensaje robótico que venimos evitando.

El aviso se queda en el globito del panel. Está bien ahí.

---

## UN SOLO NÚMERO, CADA TIENDA SE VINCULA SOLA

```
TiendaApps tiene UN número.

Cesar (Ropa Che)        escanea el QR  →  su celular queda atado a su cuenta
Ana   (Motos del Sur)   escanea el QR  →  el suyo a la suya

Ana escribe "¿cuánto vendí hoy?"
   ↓
el webhook mira DE QUÉ NÚMERO viene
   ↓
lo busca en la base  →  es Ana  →  tienda Motos del Sur
   ↓
Sasha contesta con los datos de Motos del Sur
```

Cero configuración de Meta por tienda. El trámite se hace una vez.

**La regla de seguridad, igual que S-01 del panel:** la tienda se deriva **siempre** del número entrante que manda Meta, **nunca** de nada que venga en el texto del mensaje. Si alguien escribe "mostrame las ventas de Ropa Che", Sasha responde con la tienda atada a *su* número y nada más.

### El QR

La idea original era hacerle copiar un código a mano. Es mejor un QR que codifica:

```
https://wa.me/<numero de TiendaApps>?text=VINCULAR-A7X9
```

Lo escanea, se le abre WhatsApp con el mensaje ya escrito, toca enviar, y el webhook lo vincula. Un toque.

**Ojo:** el número de prueba que da Meta gratis sólo acepta **5 destinatarios cargados a mano**. Sirve para probar vos; para que cualquier dueña escanee hace falta un número real en la app.

---

## SÓLO PREMIUM

### El gate

Se chequea **en el webhook, en cada mensaje**, no sólo al vincular. Motivo: alguien vincula siendo Premium y después baja a Pro — el número sigue vinculado, y sin chequear cada vez se quedaría con el canal para siempre. Es el mismo problema que ya tuvimos con "Premium vencido se quedaba con el ilimitado".

### Qué pasa si un vinculado deja de ser Premium

No puede ser silencio: escribe, no le contesta nadie, y parece roto. Tampoco puede contestar siempre lo mismo en cada mensaje.

Propuesta: **una sola respuesta por día**, texto fijo, sin llamar al modelo (o sea gratis), del tipo *"Preguntarme por WhatsApp es parte de Premium. Desde el panel seguís teniendo todo igual."*

### El upsell

El plan Pro tiene que saber que esto existe, y el lugar natural es el chat de Sasha en el panel: el toggle **se ve pero está bloqueado**, con el candadito y "Premium". No un cartel aparte ni un mail — donde se usa.

**Cuidado con esto:** hay una regla ya escrita en el prompt de Sasha que dice que cuando alguien está en el tope de su plan, primero se ofrece la salida gratis y **recién después** se menciona Premium, nunca al revés. El toggle bloqueado no puede contradecir eso: informa, no presiona.

---

## EL COSTO, CON NÚMEROS REALES

Medido hoy (29/07), no estimado:

| | Panel | WhatsApp |
|---|---|---|
| Prompt fijo (cacheado) | ~12.700 tokens | ~12.700 tokens |
| Costo por mensaje | ~US$0,0075 | **~US$0,018** |

**Por qué WhatsApp sale más del doble:** el caché de prompt de Anthropic dura 5 minutos. En el panel la charla es seguida y el caché pega. Por WhatsApp la dueña escribe, se va, y vuelve tres horas después — el caché ya venció y se paga el prompt entero cada vez.

Y el uso va a subir, justamente porque funciona: al panel hay que entrar, WhatsApp lo tienen en el bolsillo. Lo que hoy son 3 preguntas por semana se vuelven 10 por día.

```
10 tiendas Premium × 10 mensajes/día × US$0,018  =  ~US$54/mes
```

**Estado actual del crédito: US$4,41** (créditos regalados, vencen 21/06/2027). Eso son ~245 mensajes de WhatsApp en total. Alcanza para probar; no para abrir el canal.

Que sea sólo Premium ayuda a que esto cierre: son menos cuentas y pagan más.

---

## LAS SEIS COSAS QUE TIENEN QUE ESTAR

Ninguna es opcional. Todas salen de problemas ya conocidos, no de precaución teórica.

| # | Qué | Por qué |
|---|-----|---------|
| W-01 | **Validar la firma `X-Hub-Signature-256`** sobre el cuerpo CRUDO (no el JSON reparseado, que cambia el texto y no valida). Sin secreto en producción, rechazar todo. | Es la ÚNICA puerta: no hay sesión ni cookie. Sin esto, cualquiera que descubra la URL nos hace pagar tokens. Mismo patrón que el webhook de Mercado Pago. |
| W-02 | **Descartar mensajes repetidos por `wamid`.** | Meta reintenta si no le contestás 200 rápido. Sin dedup, Sasha contesta dos veces y se paga dos veces. |
| W-03 | **Ignorar los acuses de entrega.** Llegan por el mismo webhook, en el mismo lugar, y NO son mensajes. | Tratarlos como mensajes es contestarle a un "leído" — y pagarle un mensaje a Claude por cada uno. |
| W-04 | **Sacar las marcas `[[ACCION:...]]` antes de mandar.** | Sasha las emite al final de sus mensajes y el panel las convierte en botones al dibujar, pero el texto guardado las tiene crudas. Por WhatsApp la dueña recibiría `[[ACCION:PEDIDOS_PENDIENTES]]` escrito literal. |
| W-05 | **Rate limit por número de teléfono**, no por `user.id` (no hay sesión), **más un tope diario por tienda** en este canal, aparte del del panel. | Sin el tope por tienda, una dueña charlatana se come el crédito de todas. |
| W-06 | **Los gates del panel valen igual acá**: suscripción vencida, tienda sin configurar, y el nuevo de Premium. | Es el S-12 del panel: no confiar en que el cliente no muestre el botón. |

---

## EL HISTORIAL: NO ES OPCIONAL

En el panel el chat se vacía cada día y **eso se ve** — abrís, está limpio, entendés que arranca de cero.

En WhatsApp no. **El hilo queda en el celular para siempre.** La dueña ve sus mensajes de ayer ahí arriba y Sasha actúa como si no existieran: no parece "empieza de nuevo", parece **que está rota**.

Decisión: historial desde el día uno, con dos diferencias respecto del panel.

```
PANEL      últimos 20 mensajes, sólo de HOY
WHATSAPP   últimos 20 mensajes, de CUALQUIER día
```

Sin corte por día, porque el hilo es continuo. Si habló el lunes y vuelve el jueves, los del lunes están.

**Con tope, siempre.** El tope no es tacañería: sin él, el mensaje número 200 le manda 200 mensajes de contexto y sale carísimo, y encima Sasha se pierde entre conversaciones viejas.

### Hay que separar los canales

Si los mensajes de WhatsApp van a la misma tabla sin marcar de dónde vinieron, **aparecen en el medio de la charla del panel**. Hace falta un campo `canal` (`panel` | `whatsapp`) con `DEFAULT 'panel'` — migración chica, las filas viejas quedan donde están porque son todas del panel.

Esto era una pregunta abierta del plan viejo ("¿vale la pena versionar el canal desde el principio?"). **Respuesta: sí.** No es una necesidad hipotética, se rompe el primer día.

### Lo que el historial NO resuelve

Cosa distinta, planteada el 29/07: que Sasha se acuerde de **datos del negocio** — *"mi proveedor tarda 15 días"*, *"no vendo por Correo Argentino"* — para no explicárselo cada vez.

Eso **no se consigue cargando más historial** (el costo crece sin freno). Se resuelve con un puñado de datos fijos guardados aparte, que van siempre en el prompt: más barato que el historial largo, no más caro.

Es una función nueva, no está planificada, y tiene su propia decisión difícil: **¿quién decide qué se guarda?** Si Sasha guarda sola, va a guardar cosas mal. Si lo escribe la dueña a mano, es una pantalla más que nadie llena. **Se discute cuando esto ande.**

---

## FASES

### FASE 1 — Que el circuito funcione 🟪

> Objetivo: probar Meta → servidor → Claude → Meta → WhatsApp con un número fijo, antes de invertir en multi-tienda.

| # | Estado | Qué |
|---|--------|-----|
| F1-01 | 🟪 | **(Vos)** Meta Business Manager + app en Meta for Developers con el producto WhatsApp. |
| F1-02 | 🟪 | **(Vos)** Número de prueba de Meta, y cargar tu celular como destinatario verificado. **Mandate un mensaje a vos mismo desde la consola de Meta antes de que se escriba una línea de código** — si eso no anda, nada de lo demás va a andar. |
| F1-03 | 🟪 | **(Vos)** Las 4 variables: `WHATSAPP_APP_SECRET`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` (de Meta) y `WHATSAPP_VERIFY_TOKEN` (la inventás vos). Cargalas en Vercel y en `.env.local` — **no las pegues en un chat.** |
| F1-04 | 🟪 | El webhook: handshake de verificación (GET) + recepción (POST) con W-01, W-02 y W-03. |
| F1-05 | 🟪 | Un solo número autorizado por variable de entorno. Cualquier otro se ignora en silencio. Sin vinculación, sin base de datos. |
| F1-06 | 🟪 | Reusar `buildSystemPrompt()` + `getStoreSnapshot()` tal cual, con W-04 (sacar las marcas de acción). |
| F1-07 | 🟪 | Sin historial en esta fase: cada mensaje va solo. **Es sólo para probar el circuito, no se le muestra a nadie más que a vos.** |

**Salida:** un mensaje desde tu WhatsApp llega a Sasha y te contesta con datos reales de tu tienda.

**Dos avisos que van a morder:**
- El token que Meta te da al toque **dura 24 horas.** Para que quede andando hay que crear un *System User* en Business Manager y sacar uno permanente. Si no, mañana Sasha deja de contestar y parece que se rompió.
- **Para probar esto hay que deployar.** Meta necesita una URL pública; a `localhost` no llega.

### FASE 2 — Vincular y multi-tienda 🟪

| # | Estado | Qué |
|---|--------|-----|
| F2-01 | 🟪 | **(Vos)** Número real en la app, en vez del de prueba (el de prueba sólo acepta 5 destinatarios). |
| F2-02 | 🟪 | Migración: número de WhatsApp vinculado, **único** (un número = una cuenta), y el campo `canal` en los mensajes. |
| F2-03 | 🟪 | El toggle en el chat de Sasha: genera el código, dibuja el QR de `wa.me`, muestra el estado (vinculado / no) y permite desvincular. Bloqueado con candado para el plan Pro. |
| F2-04 | 🟪 | La rama del webhook que recibe `VINCULAR-XXXX` y ata el número. Códigos de un solo uso y con vencimiento. |
| F2-05 | 🟪 | Número desconocido → instrucciones de cómo vincular desde el panel. **Nunca** datos de una tienda a un número sin vincular. |
| F2-06 | 🟪 | El gate de Premium (W-06) y la respuesta de "esto es Premium" una vez por día, sin llamar al modelo. |
| F2-07 | 🟪 | Historial por canal, últimos 20 sin corte por día. |

**Salida:** dos dueñas Premium distintas, cada una desde su celular, ven sólo sus datos.

### FASE 3 — Dejarlo andando sin mirarlo 🟪

| # | Estado | Qué |
|---|--------|-----|
| F3-01 | 🟪 | W-05 completo: rate limit por número y tope diario por tienda. |
| F3-02 | 🟪 | Mensajes que no son texto (audio, foto, sticker): contestar una vez que sólo leemos texto. Texto fijo, sin gastar tokens. |
| F3-03 | 🟪 | Limpieza del historial de WhatsApp, como ya se hace con el del panel. |
| F3-04 | 🟪 | Cargar crédito en Anthropic y poner la notificación por email. **Bloquea abrir el canal**, no la Fase 1. |
| F3-05 | 🟪 | Medir el costo real con las tiendas usándolo, contra los ~US$0,018/mensaje estimados acá. |

---

## PREGUNTAS ABIERTAS

1. **¿El número de WhatsApp es tuyo personal o uno dedicado?** Si es el personal, el día que quieras separarlo hay que revincular a todas.
2. **¿Cuántas de tus dueñas lo pidieron?** Hoy hay 2 tiendas y ninguna lo pidió. No frena la Fase 1 (es tuya, para probar), pero sí debería frenar la Fase 2 — si nadie lo pide, es una función que nos gusta a nosotros.
3. **¿Qué pasa si Sasha dice algo mal por WhatsApp?** En el panel el mensaje se va cada día. En WhatsApp queda en el celular y es reenviable.

---

## CAMBIOS RESPECTO DEL PLAN DEL 24/06

- La FASE 4 (clientas finales) **sale de este documento.** No fue pedida.
- Los avisos por WhatsApp: **descartados**, con motivo (decisión de producto + son el camino pago).
- **Sólo Premium** — no estaba en el plan viejo.
- El QR reemplaza el código copiado a mano.
- El campo `canal` pasa de pregunta abierta a decisión tomada.
- El costo pasa de "confirmar" a medido: ~US$0,018 por mensaje, y por qué el caché no sirve acá.
- Aparecen W-01 a W-06, que el plan viejo no tenía: firma, dedup, acuses de entrega y las marcas `[[ACCION:]]`.
