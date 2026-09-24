/**
 * check-token-contract.mjs — the token table shown on /docs/theming and /docs/colors
 * (apps/web/src/lib/token-contract.ts) must match the real tokens.
 *
 *   node scripts/check-token-contract.mjs
 *
 * That table is hand-written, and it had silently drifted (destructive and warning still showed
 * the Figma values that were replaced for contrast). This resolves every row's token from
 * tokens/semantic/color.{light,dark}.json and fails on any mismatch or unknown token.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => JSON.parse(readFileSync(`${root}/${p}`, "utf8"));
const val = (n) => n?.["$value"] ?? null;

const prim = read("tokens/primitives/color.json").color;
const flat = {};
for (const fam of Object.keys(prim)) for (const step of Object.keys(prim[fam] ?? {})) {
  const v = val(prim[fam][step]);
  if (typeof v === "string" && v.startsWith("#")) flat[`${fam}.${step}`] = v;
}

function resolverFor(mode) {
  const sem = read(`tokens/semantic/color.${mode}.json`).color;
  const local = {};
  for (const k of Object.keys(sem.semantic ?? {})) local[k] = val(sem.semantic[k]);
  const resolve = (ref, depth = 0) => {
    if (typeof ref !== "string" || depth > 6) return null;
    if (ref.startsWith("#")) return ref.toLowerCase();
    let m = ref.match(/^\{color\.semantic\.([\w-]+)\}$/);
    if (m) return resolve(local[m[1]] ?? null, depth + 1);
    m = ref.match(/^\{color\.([\w-]+)\.([\w-]+)\}$/);
    if (m) return flat[`${m[1]}.${m[2]}`]?.toLowerCase() ?? null;
    m = ref.match(/^\{color\.([\w-]+)\}$/);
    if (m) return resolve(val(sem[m[1]]) ?? local[m[1]] ?? null, depth + 1);
    return null;
  };
  return (token) => resolve(val(sem[token]) ?? local[token]);
}
const light = resolverFor("light");
const dark = resolverFor("dark");

const src = readFileSync(`${root}/apps/web/src/lib/token-contract.ts`, "utf8");
const rows = [...src.matchAll(/\{\s*token:\s*"([\w-]+)",\s*light:\s*"(#[0-9a-fA-F]{6})",\s*dark:\s*"(#[0-9a-fA-F]{6})"/g)];
if (rows.length < 10) {
  console.error("check:token-contract — could not parse TOKEN_CONTRACT (found " + rows.length + " rows)");
  process.exit(2);
}

const errors = [];
for (const [, token, l, d] of rows) {
  const realL = light(token);
  const realD = dark(token);
  if (!realL) errors.push(`${token}: not a token in color.light.json`);
  else if (realL !== l.toLowerCase()) errors.push(`${token} (light): table says ${l}, token is ${realL}`);
  if (!realD) errors.push(`${token}: not a token in color.dark.json`);
  else if (realD !== d.toLowerCase()) errors.push(`${token} (dark): table says ${d}, token is ${realD}`);
}
if (errors.length) {
  console.error(errors.map((e) => `  ✗ ${e}`).join("\n"));
  console.error(`\ncheck:token-contract failed (${errors.length}) — update apps/web/src/lib/token-contract.ts.`);
  process.exit(1);
}
console.log(`check:token-contract ok — ${rows.length} rows match the tokens.`);
