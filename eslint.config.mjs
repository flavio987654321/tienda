import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Los route handlers de la API (app/api/**) NO son componentes React: son
    // funciones de servidor (GET/POST/…). El JSX que aparece en algunos —ej.
    // ImageResponse de next/og para generar imágenes OG— no es un render de
    // componente, así que las reglas del React Compiler dan falsos positivos ahí.
    files: ["src/app/api/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/error-boundaries": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
  {
    /* Una variable o un parámetro que arranca con guión bajo está diciendo "sé que
       esto no se usa, lo dejo a propósito". Es la convención de siempre y el lint no
       la conocía, así que marcaba justamente los casos donde el autor ya había
       avisado — ej. `_answers` en `legal-generator.ts`, que existe para cumplir una
       firma compartida. Un warning que aparece cuando hiciste lo correcto le enseña
       a la gente a ignorar los warnings.
       Sin `_` adelante sigue avisando, que es lo que queremos.

       La prueba de que la convención ya existía: al activar esto quedaron SOBRANDO
       cinco `eslint-disable` de esta misma regla —en `auth-session.ts`,
       `sentry.scrub.ts`, `api/ajustes/dominio`, `api/store/preview` y el
       `resetOverride` de configuración—, todos arriba de un `_algo`. O sea que el
       repo venía escribiendo el guión bajo y pagando un comentario cada vez para
       que lo dejaran en paz. La regla no se inventó acá: se la puso al día. */
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    /* Borradores, no código de la app: nada de ahí se importa ni entra al build, y
       `.borradores/LEEME.md` avisa que NADA de esa carpeta fue verificado —
       incluido "al menos un error de sintaxis conocido" en `whatsapp.check.ts`.
       Ese error de parseo era 1 de los 27 errores del proyecto, y no se arregla a
       propósito: tocarlo daría a entender que el borrador ya está bueno, cuando lo
       que hay que hacer es leer `SASHA-WHATSAPP.md` y escribirlo de nuevo. Lo que sí
       hay que evitar es un error permanente en el lint, porque enseña a no mirarlo. */
    ".borradores/**",
  ]),
]);

export default eslintConfig;
