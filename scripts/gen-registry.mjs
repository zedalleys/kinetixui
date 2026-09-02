/**
 * Generate registry/registry.json + registry/kinetixui/ui/*.tsx from the
 * @kinetixui/ui source. Import paths are rewritten to the shadcn consumer
 * convention (@/lib/utils, @/components/ui/<name>).
 *
 *   node scripts/gen-registry.mjs   (then: pnpm build:registry)
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = `${ROOT}/packages/ui/src/components`;
const OUT = `${ROOT}/registry/kinetixui/ui`;
mkdirSync(OUT, { recursive: true });

/** design-source-native components keep their bespoke docs blurb */
const NATIVE = new Set(["button", "input", "textarea"]);
const NODE = {
  button: "54863:351", input: "54855:13836", textarea: "54855:13857",
  select: "54855:13882", checkbox: "54863:483", "radio-group": "54863:536",
  switch: "54855:13984", badge: "54855:13995", tag: "54855:14021",
  modal: "54857:1322",
};

const items = [
  {
    name: "tokens",
    type: "registry:style",
    title: "KinetixUI token contract",
    description: "Semantic CSS variable contract (light + dark, HSL channels) plus primitive ramps.",
    files: [{ path: "registry/kinetixui/globals.css", type: "registry:file", target: "app/globals.css" }],
  },
];

const files = readdirSync(SRC).filter((f) => f.endsWith(".tsx")).sort();

for (const file of files) {
  const name = file.replace(/\.tsx$/, "");
  let code = readFileSync(`${SRC}/${file}`, "utf8");

  code = code
    .replace(/from "\.\.\/lib\/utils"/g, 'from "@/lib/utils"')
    .replace(/from "\.\/([a-z-]+)"/g, 'from "@/components/ui/$1"');

  writeFileSync(`${OUT}/${file}`, code);

  const deps = new Set();
  const depRe =
    /from "(@radix-ui\/[^"]+|@hookform\/resolvers|@tanstack\/react-table|lucide-react|sonner|class-variance-authority|clsx|tailwind-merge|cmdk|vaul|recharts|embla-carousel-react|input-otp|react-day-picker|react-hook-form|react-resizable-panels|date-fns|zod)"/g;
  for (const m of code.matchAll(depRe)) deps.add(m[1]);
  const registryDeps = new Set(["tokens"]);
  for (const m of code.matchAll(/from "@\/components\/ui\/([a-z-]+)"/g)) registryDeps.add(m[1]);

  const filesArr = [{ path: `registry/kinetixui/ui/${file}`, type: "registry:ui", target: `components/ui/${file}` }];
  if (code.includes('@/lib/utils')) {
    filesArr.push({ path: "registry/kinetixui/lib/utils.ts", type: "registry:lib", target: "lib/utils.ts" });
  }

  items.push({
    name,
    type: "registry:ui",
    title: name.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join(" "),
    description: NODE[name]
      ? `Generated 1:1 from the KinetixUI design source, node ${NODE[name]}.`
      : `Ported onto the KinetixUI token contract.`,
    dependencies: [...deps].sort(),
    registryDependencies: [...registryDeps],
    files: filesArr,
  });
}

const manifest = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "kinetixui",
  homepage: "https://kinetixui.com",
  items,
};
writeFileSync(`${ROOT}/registry/registry.json`, JSON.stringify(manifest, null, 2) + "\n");
console.log(`registry.json — ${items.length} items; ${files.length} component files mirrored`);
