/**
 * Write a small, flat manifest of every registry item's name/title/
 * description/type to apps/web/public/r/registry.json — the file the CLI's
 * `kinetixui list`, `kinetixui add --all` and `kinetixui parity` fetch to
 * discover what's installable, since `shadcn build` only emits per-item
 * files (apps/web/public/r/<name>.json), never an index of all of them.
 *
 * Also embeds `platforms`/`status` on each `registry:ui` item, straight
 * from platform-parity.json / component-status.json (generated from
 * components.manifest.json; the same data
 * apps/web/src/lib/{platform-parity,component-status}.ts read) — so the
 * CLI can show platform/maturity info without a second source of truth.
 *
 *   node scripts/gen-registry-index.mjs   (run after `shadcn build`, as
 *   part of `pnpm build:registry`)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(`${ROOT}/registry/registry.json`, "utf8"));
const parity = JSON.parse(readFileSync(`${ROOT}/platform-parity.json`, "utf8"));
const status = JSON.parse(readFileSync(`${ROOT}/component-status.json`, "utf8"));

const platformsFor = (slug) => parity.exceptions[slug] ?? parity.platforms;
const statusFor = (slug) => (status.status[slug] === "stable" ? undefined : status.status[slug]); // "stable" is omitted from the output (the CLI treats absent as stable)

const items = registry.items.map(({ name, type, title, description }) => {
  const item = { name, type, title, description };
  if (type === "registry:ui") {
    item.platforms = platformsFor(name);
    const s = statusFor(name);
    if (s) item.status = s;
  }
  return item;
});

writeFileSync(
  `${ROOT}/apps/web/public/r/registry.json`,
  JSON.stringify({ name: registry.name, homepage: registry.homepage, items }, null, 2) + "\n",
);
console.log(`registry-index — ${items.length} item(s) listed in apps/web/public/r/registry.json`);
