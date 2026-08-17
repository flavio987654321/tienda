<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# `npm run dev` usa webpack a propósito

No lo cambies de vuelta a Turbopack sin volver a medir.

Turbopack tiene una fuga de memoria en la recompilación: cada vez que se guarda
un archivo retiene el grafo de módulos viejo y no lo suelta nunca. Medido en este
proyecto, 12 guardados seguidos subieron de 1455 MB a 1529 MB **sin bajar ni una
vez** — crecimiento monótono. En una sesión larga de edición llega al techo que
Node se asigna (~16 GB en una máquina de 32 GB) y el proceso se muere solo con
`FATAL ERROR: Ineffective mark-compacts near heap limit`. Pasó tres veces en una
tarde.

Con webpack, la misma prueba sube y baja y termina por debajo de donde arrancó
(1900 → 1716 MB): el recolector libera. Arranca usando más memoria y compila más
lento, y se aceptó ese costo a cambio de que no se caiga.

Queda `npm run dev:turbo` para cuando quieras la velocidad de Turbopack en una
sesión corta, o para volver a medir si sale una versión de Next que lo arregle.

Esto es solo desarrollo local. `build` y `start` no están tocados: producción
compila igual que siempre.
