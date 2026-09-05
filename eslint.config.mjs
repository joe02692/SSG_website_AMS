import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Files downloaded out of a Claude chat. Duplicates of real source files,
    // so linting them reports the same problems twice — and type-checking them
    // fails as soon as the real file's shape changes. Also in .gitignore and
    // tsconfig.json's exclude.
    "Claude outputs/**",
  ]),
]);

export default eslintConfig;
