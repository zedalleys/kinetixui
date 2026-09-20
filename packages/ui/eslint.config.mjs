import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const config = tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "src/stories/**"] }, // stories are generated (scripts/gen-stories.mjs)
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      // the two rules that catch real bugs (conditional hooks, stale effect dependencies)
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // `interface FooProps extends React.HTMLAttributes<…> {}` is this library's props pattern, and turning it
      // into a type alias would change the published .d.ts (interfaces can be merged and augmented)
      "@typescript-eslint/no-empty-object-type": ["error", { allowInterfaces: "with-single-extends" }],
    },
  },
);

export default config;
