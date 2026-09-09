import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  eslint.configs.recommended,
  tseslint.configs.recommended,
  globalIgnores([".next", "next-env.d.ts", "next.config.mjs"]),
  [{ rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off"
  }}]
]);