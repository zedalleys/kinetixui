/**
 * Write a small, flat manifest of every registry item's name/title/
 * description/type to apps/web/public/r/registry.json — the file the CLI's
 * `kinetixui list` and `kinetixui add --all` fetch to discover what's
 * installable, since `shadcn build` only emits per-item files
 * (apps/web/public/r/<name>.json), never an index of all of them.
 *
 *   node scripts/gen-registry-index.mjs   (run after `shadcn build`, as
 *   part of `pnpm build:registry`)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(`${ROOT}/registry/registry.json`, "utf8"));

const items = registry.items.map(({ name, type, title, description }) => ({ name, type, title, description }));

writeFileSync(
  `${ROOT}/apps/web/public/r/registry.json`,
  JSON.stringify({ name: registry.name, homepage: registry.homepage, items }, null, 2) + "\n",
);
console.log(`registry-index — ${items.length} item(s) listed in apps/web/public/r/registry.json`);
