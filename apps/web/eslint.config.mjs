import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const require = createRequire(import.meta.url);

// eslint-config-next 15 ships the legacy config format; FlatCompat adapts it to ESLint 9's flat config.
// Its plugins (react-hooks, jsx-a11y, @next/next, …) are dependencies of eslint-config-next, which pnpm
// does not expose to this package — so resolve them from the config package rather than hoisting them.
const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
  resolvePluginsRelativeTo: dirname(require.resolve("eslint-config-next/package.json")),
});

const config = [
  { ignores: [".next/**", ".vercel/**", "node_modules/**", "public/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;
