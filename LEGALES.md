# Las políticas legales de cada tienda

Cómo debería funcionar esto, qué estaba roto, y qué protege a quién.

---

## 1. Qué son

Cuatro documentos que escribe el dueño de cada tienda, en **Panel → Pagos →
Políticas y términos legales** (en tiendas de autos la sección se llama
**Legal**, porque no hay cobros que configurar).

| Clave | Nombre normal | Nombre en tiendas de autos |
|---|---|---|
| `devoluciones` | Política de devoluciones y cambios | Condiciones de la operación |
| `envios` | Política de envíos | Cómo se coordina la entrega |
| `terminos` | Términos y condiciones | Términos y condiciones |
| `privacidad` | Política de privacidad | Política de privacidad |

Los nombres cambian en autos porque esa tienda **no envía ni acepta
devoluciones**: la operación se cierra en persona. Llamarlas "Política de
envíos" le prometía al comprador algo que no existe.

## 2. Dónde se ven

Un documento se publica cuando cumple **las dos** condiciones: tiene texto **y**
su interruptor está en Visible. Con eso aparece en tres lugares:

- **La página legal de la tienda** — `/tienda/<slug>/politicas`
- **El pie de página** de la tienda, del catálogo y de la ficha de producto
- **El mail de confirmación** de cada compra (recortado a 300 caracteres, con el
  documento completo a un click)

La decisión de qué se publica vive en **una sola función**,
`documentosPublicados()` en [`src/lib/politicas-tienda.ts`](src/lib/politicas-tienda.ts).
Los tres lugares la usan. Antes cada uno tenía su copia de la regla y eso
produjo los dos bugs de abajo.

## 3. Los bugs que había

### El interruptor "Visible / Oculta" no hacía nada

Las banderas `policyTermsActive` y compañía se respetaban **solo en el mail**.
La página pública miraba nada más si había texto. O sea: el dueño apagaba
"Términos y condiciones", el panel le decía **Oculta**, y el documento seguía
visible para cualquiera que entrara al link.

### El pie listaba las tres políticas siempre

Tuviera o no tuviera la tienda algo cargado. Una tienda recién abierta mostraba
tres links que llevaban a *"esta tienda todavía no publicó sus políticas"*.

### No existía la política de privacidad

Y no es un documento opcional: las dos páginas legales de la plataforma le
tiran la responsabilidad al dueño por escrito —
[`/terminos` §5 bis](src/app/terminos/page.tsx) (*"sos el único responsable de
informarlo a tus compradores en tu política de privacidad"*) y
[`/privacidad` §4](src/app/privacidad/page.tsx) (*"El dueño de la tienda es el
único responsable de informarte sobre su uso en su propia política de
privacidad"*). Le exigíamos un documento que el panel no le daba forma de
escribir.

### Los números del asistente no tenían techo

Los dos campos numéricos se clampeaban solo por abajo, y el `max` de un input
no frena a quien tipea. Se podía generar *"te damos un total de 100000009 días
corridos"* o *"un cargo administrativo del 5000%"* — escrito y publicado como la
política legal de la tienda. Ahora el tope lo aplica `acotarDiasExtra` /
`acotarPorcentaje`, las mismas funciones que usa el generador.

### Tres rutas escribían los mismos campos con tres reglas

`/api/pagos` cortaba en 2000 caracteres, `/api/configuracion` no cortaba nada, y
`/api/ajustes/politicas` tampoco **y no la llamaba nadie**. Esa última se borró;
las otras dos usan ahora `limpiarTextoLegal()`, con el tope en un solo lugar.

## 4. El asistente

Cuatro preguntas (envío a todo el país, demora, días extra de devolución, % por
cancelar) y arma los cuatro documentos combinando cláusulas fijas de la ley
argentina con lo que el dueño responda. **No usa IA**: el contenido legal nunca
queda a criterio de un modelo, solo se completan variables en un texto ya
redactado ([`src/lib/legal-generator.ts`](src/lib/legal-generator.ts)).

**La de privacidad no se pregunta.** Sale de lo que la tienda ya tiene
configurado. Preguntarle al dueño "¿usás Pixel?" es pedirle que se acuerde de
algo que el sistema sabe con certeza — y si se equivoca, la política declara un
tracker que no existe o, peor, calla uno que sí está corriendo.

Los hechos que lee, en `HechosPrivacidad`:

| Hecho | De dónde sale | Qué agrega al texto |
|---|---|---|
| `usaAnalytics` / `usaPixel` | `storeConfig.analytics` | Declara el tracker y avisa que se puede bloquear |
| `usaMercadoPago` | `mpAccessToken` | Aclara que la tarjeta la ve MP, no la tienda |
| `usaAfiliados` | `affiliatesEnabled` | Aclara que la afiliada no accede a los datos |
| `juegoConEmail` | ruleta activa **y** `emailRequired` | Declara que se pide el email para jugar |
| `tieneNewsletter` | `TEMPLATES_CON_NEWSLETTER` | Doble opt-in y cómo darse de baja |
| `tienePushDeSeguidores` | suscripción Premium viva | Que se guarda quién sigue la tienda |
| `esAutos` | `tipoTienda` | Cambia todo a "consulta", sin checkout |

Los tres del medio —ruleta, novedades, push— son la misma categoría que el
carrito abandonado: **la tienda se queda con el contacto de alguien que no le
compró nada.** Es justo lo que la ley pide informar y lo que más se olvida,
porque no se siente como juntar datos; se siente como una ruleta, un formulario
y una campanita.

Ninguno aplica a Auto Motor / Auto Drive: esas tiendas no tienen ruleta
(`GAMIFICATION_EXCLUDED_TEMPLATES`) ni formulario de novedades. El generador
además los ignora cuando `esAutos` es true, para que no dependa de que quien
arme los hechos se acuerde de la regla.

### Qué apps NO obligan a tocar la política

Catálogo de Meta, Google Shopping y Catálogo en WhatsApp mandan **los productos
de la tienda** —nombre, precio, foto—, no datos del visitante. Los links a
Instagram y demás redes tampoco recolectan nada. La regla es esa: si del
comprador no viaja nada, no hay nada que declarar.

Si la tienda tiene Analytics o Pixel prendido y todavía no escribió la política
de privacidad, el panel se lo avisa en esa misma sección.

## 5. Qué protege a quién

La página legal pública nunca queda vacía, ni en una tienda recién abierta:

- **Al comprador** — los derechos de la Ley 24.240 (arrepentimiento a 10 días,
  garantía de 6/3 meses, información clara, reclamo gratuito ante Defensa del
  Consumidor) se listan siempre, los haya escrito el dueño o no, porque rigen
  igual.
- **Al dueño** — sus datos de vendedor (art. 4 de la misma ley: responsable,
  localidad, CUIT si está verificado, contacto) salen publicados, que es lo que
  la ley le exige mostrar.
- **A TiendaApps** — un bloque al pie deja escrito quién responde por qué: los
  productos, precios, entrega y políticas son de la tienda; la plataforma provee
  la tecnología. Sin eso, un comprador con un problema de entrega le reclama a
  TiendaApps.

Además se guarda **`policiesUpdatedAt`**, que se toca solo cuando cambia el
texto de alguna política —no cuando se guarda un CBU en la misma pantalla— y se
muestra como "Última actualización". Ante un reclamo, importa poder sostener qué
decía la política y desde cuándo.

## 6. Lo que se arregló de paso

`/api/public/[slug]` devuelve la fila entera de `Store` con `include` y le saca
unos campos con destructuring, o sea que **el default es público**: toda columna
nueva sale al navegador de cualquier visitante salvo que alguien se acuerde de
agregarla a la lista. No se acordaron: la lista tenía los tokens de Mercado Pago
—lo que existía cuando se escribió— y cuando llegaron Meta y Google Analytics,
sus tokens quedaron saliendo.

Verificado contra la base real: había un `fbAccessToken`, un `gaRefreshToken` y
dos `tcOwnerAcceptedIp` viajando en respuestas públicas. **Los dos tokens salen
cifrados** (`encryptToken`), así que no servían para tomar la cuenta de nadie; la
IP no, esa es el domicilio de conexión del dueño en limpio.

[`campos-publicos.check.ts`](src/lib/campos-publicos.check.ts) recorre el schema
y falla si aparece una columna nueva que parezca credencial o dato personal y no
esté siendo excluida.

## 7. Los chequeos

Se corren a mano, sin base de datos:

```
npx tsx src/lib/politicas-tienda.check.ts
npx tsx src/lib/legal-generator.check.ts
npx tsx src/lib/campos-publicos.check.ts
```

El último bloque de `politicas-tienda.check.ts` recorre las 16 combinaciones
posibles de políticas cargadas y verifica que la tienda, el pie y el mail digan
exactamente lo mismo. Eran tres copias de la regla y una sola funcionaba.

## 8. Lo que quedaba pendiente, y ya no

- ~~**`/tienda/<slug>/vehiculos` no tiene pie con links legales.**~~ **Cerrado el
  11/08/2026.** Tiene su pie, con los títulos en versión autos ("Condiciones de
  la operación", "Cómo se coordina la entrega") y el botón de reportar tienda,
  igual que el resto de las pantallas públicas.
- ~~**Las columnas del pie de Urban Pulse** son texto editable, no links.~~
  **Cerrado.** Ahora son `<a href>` reales: hasta 5 categorías de la tienda,
  seguimiento de pedido, nosotros/contacto y WhatsApp.
- ~~**`/api/public/[slug]` sigue con lista de exclusión.**~~ **Cerrado el
  11/08/2026.** Pasó a lista blanca (`CAMPOS_PUBLICOS` + `select` de Prisma), así
  que agregar una columna a `Store` ya no la publica. De paso dejaron de salir
  diez campos que nadie leía y no tenían por qué ser públicos, entre ellos
  `commissionRate` —el porcentaje que la tienda le paga a sus afiliadas— y
  `ownerId`.

### Lo que sigue abierto

- **No hay ninguna tienda de autos en la base**, así que ese camino legal está
  cubierto solo por los chequeos, nunca por un navegador. Cuando exista la
  primera, mirar `/politicas` y el pie de `/vehiculos` de verdad.
