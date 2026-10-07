# TEMPLATES DE AUTOS — plan vivo (06/10/26)

Pedido del dueño: **modernizar los dos templates de autos ("son de lo peor") y crear
templates nuevos**, cada uno con su lenguaje, que banquen todo tipo de vehículo, con
bloques pensados para lo que se agregó en octubre (ficha técnica y PDF, consulta,
tasación, "Avisame si entra", reservado, moneda por vehículo), y que sean claros.

Decisiones (06/10/26):
- **Cuatro templates nuevos** (eligió los cuatro estilos): Futurista (tipo Aurora),
  Showroom premium, Ruta / pesado, Moto / deportivo.
- **Tipos nuevos de vehículo:** camiones, utilitarios y furgones, maquinaria agrícola,
  cuatriciclos y UTV — además de autos, camionetas y motos.
- **Orden:** base común → rehacer Auto Motor y Auto Drive → los cuatro nuevos, de a uno,
  mostrándoselo al dueño antes de seguir con el próximo.

Reglas que valen para todos (de la memoria):
- Se comparte la **lógica**, nunca el layout: cada template se tiene que ver distinto.
  Ningún bloque se recicla de otro template ("me la baja muchísimo").
- Todo se revisa en 360, 768 y 1280. Auditoría antes de cada commit. Commits locales:
  **no se deploya sin que el dueño lo pida**.

---

## Fase 0 — Tipos de vehículo nuevos

- [x] ~~Categorías: `camiones`, `utilitarios`, `maquinaria`, `cuatriciclos` (con subcategorías).~~
- [x] ~~Campos según el tipo: horas de uso en agro; sin puertas en motos, agro y cuatris;
      carrocería con las opciones de cada tipo.~~ (`ExtraField.ocultar` en `extraFieldsByCategory`;
      lo oculto no se guarda ni aparece como "otro atributo".)
- [x] ~~Ficha técnica propia de camión, utilitario, agro y cuatri (equipamiento, motor,
      medidas) en el formulario, la tienda y el PDF.~~ Horas de uso en la ventana y el PDF.
- [x] ~~Todo lo que hoy dice "autos, motos, camionetas" a mano pasa a una sola lista
      (`esVehiculo`): validación del formulario, búsquedas guardadas, tasación, ficha.~~
      (`CATEGORIAS_VEHICULO` y `NOMBRE_TIPO` en `lib/fichaVehiculo`.)
- [x] ~~Datos de muestra del editor con un vehículo de cada tipo.~~ Antes tenían categorías
      inventadas ("Sedanes", "Pickups"): la ficha y la tasación no aparecían en la previa.

## Fase 1 — Base común (el grupo 5 de AUDITORIA-AUTOS-OCT26.md)

- [x] ~~Filtros de verdad: tipo, marca (sin distinguir mayúsculas), año, km/horas, precio
      (en su moneda), combustible, transmisión. "Menor km" no pone primero los sin dato.~~
      (`lib/filtroVehiculos`, con su chequeo. El filtro viaja en la dirección: los templates
      linkean a `/vehiculos?tipo=camiones`. Los "filtros rápidos" de Auto Drive ahora son
      los tipos que la tienda tiene, con su cantidad.)
- [x] ~~Textos fijos editables o fuera ("100% verificados", "15+ años", "entrega en todo el país").~~
      Lo que se cuenta sale de los datos (vehículos, marcas); lo que es del negocio (años,
      satisfacción) se ve sólo si el dueño lo escribió; los textos de fábrica hablan de lo que
      la tienda hace (ficha, tasación, "Avisame si entra", WhatsApp).
- [x] ~~Links del menú sólo a secciones que existen.~~ (También las ocultas sólo en el celular.)
- [x] ~~Favoritos sin sacar a /login de golpe (y nada en la previa del editor).~~
      (`hooks/useFavoritosVehiculos`: sin sesión, en el navegador con un aviso; al entrar pasan a la cuenta.)
- [x] ~~`/vehiculos`: encabezado a 360, marcas desconocidas, error de carga ≠ "sin resultados",
      no abre para tiendas que no son de autos.~~
- [x] ~~Escape: cierra el buscador; con la foto ampliada cierra sólo la foto.~~ (Y los favoritos.)
- [x] ~~Accesibilidad: botones de ícono con nombre, tarjetas con teclado, zonas táctiles,
      nada de botón dentro de botón.~~ (La tarjeta: el nombre es el botón y se estira sobre
      toda la tarjeta; el corazón queda aparte, de 40 px.)
- [x] ~~La vista previa del formulario de un vehículo dice "Agregar al carrito": va "Consultar".~~

## Fase 2 — Rehacer Auto Motor y Auto Drive

- [x] ~~Auto Motor (oscuro premium).~~ Rehecho el 06/10/26, con bloques propios en
      `templates/motor/`: buscador en la portada, "Explorá por tipo", recién ingresados
      (tarjeta propia), vehículo en foco con ficha en PDF y WhatsApp, "Tasá tu usado" +
      "Avisame si entra" en la portada (ventana compartida `auto/VentanaAuto`), números
      reales, "Cómo comprar" en pasos. Los campos editables de antes conservan su nombre.
      **Falta que el dueño lo vea y diga.**
- [ ] Auto Drive (claro marketplace).
- [ ] En los dos: bloques para tasación, "Avisame si entra", ficha / PDF, reservado,
      financiación, y la portada con "Tasá tu usado" y "Avisame si entra".

## Fase 3 — Templates nuevos (de a uno, mostrándolo antes del siguiente)

- [ ] Futurista (tipo Aurora).
- [ ] Showroom premium.
- [ ] Ruta / pesado.
- [ ] Moto / deportivo.
