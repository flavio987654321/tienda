# Newsletter — de bloque decorativo a canal real

## De dónde salió

El bloque de suscripción de Boho Terra y el del footer de Fashion Noir eran
**decoración**. El `<input>` no tenía `value`, ni `onChange`, ni `type="email"`;
el botón no tenía `onClick`; y los dos vivían dentro de un `<div>`, no de un
`<form>`. Del lado del servidor no había endpoint ni tabla.

Para el visitante era indistinguible de uno que funcionaba: escribía el mail,
apretaba **Suscribirse**, no pasaba nada —ni un cartel, ni se limpiaba el
campo— y se iba creyendo que se había suscripto.

---

## Cómo funciona ahora

### El visitante se suscribe

1. Escribe el mail y aprieta. El botón se bloquea (ref, no estado: el estado de
   React no llega a frenar el segundo click de un doble click).
2. `POST /api/newsletter` → rate limit por IP (3 cada 10 min, **con respaldo en
   memoria** por si Redis no contesta), honeypot que le contesta 201 falso al
   bot, y validación de formato.
3. Se guarda **sin confirmar** y sale un mail de confirmación.
4. En pantalla: *"Te mandamos un mail para confirmar"*.

La respuesta es **siempre la misma**, se haya anotado o ya estuviera. Si
contestara distinto, el formulario sería un buscador para averiguar si una
dirección está en la lista.

### El dueño manda una campaña

Misma pantalla de notificaciones. El mensaje sale por **dos canales**:

- **Push** a los seguidores registrados (`StoreFollow`), como siempre.
- **Mail** a los suscriptores **confirmados**.

El historial guarda los dos números por separado (`sentCount` / `sentEmail`). El
límite de **3 por semana cuenta campañas, no envíos**: mandar por las dos vías
gasta una sola.

### El modal de audiencia

Clic en el número → dos pestañas. Por mail (dirección, fecha, y
**confirmado / sin confirmar / se dio de baja**) y por push (nombre y desde
cuándo). El dueño puede sacar a alguien de la lista de mail.

El mail del **seguidor** no se manda al front: el push sale del lado del
servidor y el dueño no lo necesita.

---

## Las tres decisiones que sostienen todo esto

### 1. Doble opt-in

Cualquiera puede escribir el mail de otro en un formulario público. Si eso
contara como alta buena, a esa persona le llegaría publicidad de una tienda que
no conoce, y su único botón a mano es **spam**.

### 1-bis. Captcha en el alta

El honeypot y el límite de 3 por IP frenan al bot solitario. No ven el ataque que
de verdad duele acá: cargar **miles de direcciones reales ajenas** para que a
cada persona le llegue un mail de confirmación desde nuestro dominio sin haberlo
pedido. Con muchas IPs, el límite por IP no se entera — y el resultado son miles
de denuncias de spam contra el dominio que comparten todas las tiendas.

La diferencia con una reseña falsa: la reseña la borra el dueño, un mail que ya
salió no se puede deshacer.

Turnstile con `action: "newsletter"`. El action viaja dentro del token y el
endpoint exige ese nombre, así un token resuelto en el formulario de contacto no
sirve para dar de alta suscriptores. La verificación va **después** de validar el
correo: el token es de un solo uso y un error de tipeo no puede gastarlo.

Es fail-open (si Cloudflare no contesta, deja pasar). El piso sigue siendo el
rate limit, el honeypot y el doble opt-in.

### 2. Baja fácil, y por POST

Link en el pie de cada mail + cabeceras `List-Unsubscribe` /
`List-Unsubscribe-Post` (el "Cancelar suscripción" que Gmail muestra arriba, al
lado del remitente). Ese botón es el que **compite con el de spam**.

**Ni la baja ni la confirmación pasan por GET.** Gmail y los antivirus abren los
links de los mails por su cuenta para revisarlos: con un GET que ejecuta, esos
robots darían de baja a gente que no quiso irse y confirmarían altas que nadie
pidió. Por eso el link abre una página con un botón, y el botón hace POST.

Son **dos URLs distintas** y hay que no confundirlas:

| Para | URL | Método |
|---|---|---|
| Una persona (pie del mail) | `/newsletter/baja?t=` | página + botón |
| Gmail (cabecera) | `/api/newsletter/baja?t=` | POST de un clic |

El endpoint tiene además un `GET` que **sólo redirige** a la página, para los
clientes que muestran la cabecera como link común.

### 3. Subdominio separado para marketing

Todas las tiendas comparten un dominio de envío. Para Gmail hay **un solo
remitente**: si una tienda se gana denuncias, la reputación que baja es la de
todas — y con ella caen las confirmaciones de pedido, los avisos de pago y el
código de ingreso.

Gmail puntúa en buena medida **por subdominio**. Entonces:

- **Transaccional** → `noreply@tiendaapps.com` (`RESEND_FROM`)
- **Marketing** → `RESEND_FROM_MARKETING`, p. ej. `novedades@envios.tiendaapps.com`

Una tienda que abusa quema el canal de marketing y deja el otro intacto.

> **Sin `RESEND_FROM_MARKETING` definida, todo sale por el dominio de siempre.**
> Funciona igual, sin la protección.

#### El subdominio cuesta plata — qué hacer mientras tanto

El plan gratuito de Resend permite **un solo dominio**, y un subdominio cuenta
como otro. Separar `envios.tiendaapps.com` requiere el plan Pro (US$20/mes).

**Mientras tanto, media protección gratis:** otra casilla del MISMO dominio.

```
RESEND_FROM_MARKETING=Novedades <novedades@tiendaapps.com>
```

Resend deja mandar desde cualquier dirección de un dominio verificado, así que
esto anda sin agregar nada.

Qué da y qué no, sin vueltas: la reputación que mira Gmail es sobre todo **del
dominio**, así que esto **no** protege las confirmaciones de pedido. Lo que sí
da es que el que se harta puede **bloquear `novedades@` sin bloquear los mails
de sus pedidos** — con una sola dirección, bloquearte es bloquearte para todo.
Y se puede filtrar y medir por separado.

**Cuándo pasar a Pro:** el motivo real no va a ser el subdominio sino el **tope
diario de envíos** del plan gratuito. Con una tienda de 300 suscriptores, una
sola campaña se come la cuota del día. Ahí los US$20 resuelven las dos cosas
juntas.

---

## El cursor: por qué reintentar no duplica

En plan gratuito de Vercel la función se corta a los pocos segundos. Con una
lista grande, el dueño ve un error **aunque medio envío haya salido bien** — y
si reintenta, esos mails salen dos veces. El daño real no es la demora, es el
duplicado.

La campaña guarda `emailStatus`, `sentEmail` y **`emailCursor`**: el id del
último al que se le mandó.

- El recorrido es **siempre** por `(createdAt, id)` ascendente. Sin un orden
  total y estable, "seguir desde el último" no significa nada. `createdAt` solo
  no alcanza: dos altas del mismo milisegundo empatan, y el `id` desempata.
- El cursor se guarda **después** de cada tanda. Si la función se muere en el
  medio, lo peor que pasa es que se repita esa tanda (8 mails). Guardándolo
  antes, un corte dejaría a esa gente sin recibir nada y sin forma de saberlo.
- `enviarCampanaPorMail` para sola a los **8 segundos**, deja la campaña en
  `ENVIANDO` y responde bien. En el historial aparece **"Continuar envío por
  mail"**.

Ese botón es hoy lo que mañana hace un cron: `POST /api/newsletter/continuar`.
Cuando el proyecto pase a un plan con crons frecuentes, el cron llama a ese
mismo endpoint y el botón se vuelve opcional. **Por eso el reintento vive en una
ruta y no adentro del envío**: lo único que cambia es quién lo dispara.

---

## Dónde está cada cosa

| Archivo | Qué hace |
|---|---|
| `prisma/schema.prisma` | `NewsletterSubscriber` + `emailStatus`/`sentEmail`/`emailCursor` en `PushCampaign` |
| `prisma/migrations/20260731220000_add_newsletter/` | La migración, aditiva y con defaults |
| `src/lib/newsletter.ts` | Normalizar dirección, token, y el envío con cursor |
| `src/lib/email.ts` | `MARKETING_FROM_ADDRESS`, mail de confirmación y de campaña |
| `src/app/api/newsletter/` | alta · `confirmar` · `baja` · `continuar` · `suscriptores` |
| `src/app/newsletter/` | Las páginas de confirmar y de baja |
| `src/components/store/templates/shared/NewsletterForm.tsx` | El formulario |
| `src/app/dashboard/notificaciones/` | Conteo desglosado y modal de audiencia |

En los templates: **Boho Terra** y **Fashion Noir** ya tenían el bloque (se
cableó el que estaba). **Chic Paris** y **Urban Pulse** no lo tenían — el bloque
es **nuevo** y es la parte que más conviene mirar.

Lógica compartida, aspecto de cada uno: el `NewsletterForm` recibe los estilos
por `theme`, igual que `ContactForm`.

---

---

## Auditoría del panel de notificaciones

Salió al revisar el circuito completo. Todo esto es del sistema de campañas, que
ya existía antes del newsletter.

### El límite de 3 por semana no limitaba nada

El cupo se contaba sobre las filas de `PushCampaign`. Borrar una del historial
**devolvía el cupo**: mandabas 3, borrabas, mandabas 3 más — nueve mensajes en
una semana con el panel diciendo *"te quedan 3 disponibles"*.

Ahora el borrado es **blando** (`deletedAt`). La fila sigue contando aunque
desaparezca de la vista. Lo que el dueño deshace es su registro, no el envío: un
push entregado no vuelve del celular y un mail mandado no se recupera.

> El `where` del conteo semanal **no** filtra `deletedAt`, y es a propósito. El
> historial del panel y el banner de la tienda **sí**.

Ese cambio abría un agujero nuevo que también quedó tapado: sin filtrar en
`/api/push/campaigns/[slug]`, una campaña borrada seguía apareciendo en el
banner de novedades de la tienda — o sea que borrarla para que el cliente no la
viera era exactamente lo que fallaba.

### Doble click en "Sí, enviar"

El botón no tenía candado. `setShowConfirm(false)` cierra el modal recién en el
render siguiente, así que dos clicks rápidos entraban los dos: **dos campañas**,
dos veces el cupo y dos mails idénticos a cada suscriptor. `sending` no servía
por lo mismo — es estado. Ahora hay un ref, como en el formulario de reseñas.

### Lo demás

- **Borrar fallaba en silencio.** El `if (res.ok)` no tenía `else`: la fila se
  quedaba y no pasaba nada en pantalla.
- **"Eliminar (40)" sin confirmación**, con "Seleccionar todo" al lado.
- **Los chips de "Tipo de anuncio" borraban lo escrito.** Parecen un filtro pero
  sobreescriben el formulario, y con `bodyTemplate` vacío en los tres, cambiar
  de tipo era siempre *borrar el mensaje*.
- **El push sin configurar informaba 0** sin decir que faltaban las claves VAPID.
- **El historial se cortaba en 200** sin avisar (a 3 por semana, ~15 meses).
- El modal de confirmar no cerraba con Escape ni tocando afuera.

### Emojis, y el bug que traían

`"🎉".length` es **2**, no 1. Eso rompía dos cosas: el contador mentía (tres
emojis marcaban 6) y `.slice()` cortaba **a la mitad de un emoji**, que llega al
celular como un rombito con un signo de pregunta.

`src/lib/texto.ts` cuenta y recorta por caracteres visibles con
`Intl.Segmenter`. Lo usan el panel y el endpoint — el tope del servidor tiene que
recortar igual que el del navegador, porque el POST se puede mandar a mano.

### El mail de campaña era el mismo para todas las tiendas

Blanco y negro, sin un solo color de la marca. Ahora lleva franja superior con el
acento de la tienda, el logo a 52px y el botón en ese color, con la tinta
elegida por contraste (`tintaSobre`) — un acento amarillo con letras blancas no
se lee, y en un mail no se arregla después de mandarlo.

---

## Falta hacer

- [ ] **Webhook de rebotes** (`email.bounced` / `email.complained` de Resend) →
      apagar ese suscriptor solo. Hoy una dirección muerta se reintentaría en
      cada campaña, y eso es de lo que más rápido hunde la reputación. Los
      campos `bajaEn` / `bajaMotivo` ya están para eso.
- [ ] **Fusible por tienda**: con los datos del webhook, calcular el % de quejas
      y cortarle el envío a la que se pase. Que la plataforma se defienda
      sacando a la que hace lío, en vez de que paguen todas.
- [ ] **Cron de drenado** cuando haya plan Pro. El endpoint ya existe.
- [ ] Probar el circuito entero a 360 / 768 / 1280.

## Pasos manuales antes de que ande

1. **Correr la migración** contra la base.
2. **`npx prisma generate`** con el dev server cortado (con `next dev` andando,
   Windows no deja reemplazar el motor y la copia del schema queda vieja).
3. **Verificar el subdominio de marketing en Resend** y definir
   `RESEND_FROM_MARKETING`.
