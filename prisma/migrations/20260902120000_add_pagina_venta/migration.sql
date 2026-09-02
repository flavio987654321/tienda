-- El contenido de la pagina de venta de un producto digital.
--
-- Un JSON de texto con las secciones, su orden, cuales estan encendidas y los
-- textos de cada una. La FORMA la declara `lib/pagina-venta`, no la base: lo que
-- entra pasa antes por `normalizarContenido`, que descarta lo que no esta en el
-- catalogo y recorta cada campo a su tope. La base guarda el resultado.
--
-- Por que TEXT y no jsonb: nunca se consulta por adentro. Se lee entero para
-- dibujar la pagina y se escribe entero al guardar. jsonb solo agregaria una
-- validacion de forma que no es la que nos importa -- la nuestra es el catalogo,
-- no "es json valido".
--
-- NULLABLE a proposito, y es lo que hace que esta migracion sea instantanea: los
-- 116 productos de tienda que ya existen quedan en NULL y no se reescribe ninguna
-- fila. NULL quiere decir "todavia no la tocaron", y se dibuja con los textos de
-- fabrica -- que es exactamente lo que se ve hoy.

ALTER TABLE "Product" ADD COLUMN "paginaVenta" TEXT;
