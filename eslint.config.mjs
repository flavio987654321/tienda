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
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
