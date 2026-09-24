import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

// eslint-config-next still ships eslintrc-style configs, so FlatCompat bridges
// them into flat config. Drop it once the package exports a flat entry point.
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: [".next/**", "next-env.d.ts", "node_modules/**", "public/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;
