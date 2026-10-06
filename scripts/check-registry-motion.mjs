/**
 * check-registry-motion.mjs — the reduced-motion floor a registry item can actually carry.
 *
 *   pnpm check:registry-motion        (after `pnpm build:registry`)
 *
 * ── The question, and the answer the architecture allows ───────────────────
 *
 * `@kinetixui/ui` protects reduced-motion readers with a global base rule in its Tailwind preset: every
 * animation and transition collapses to 0.01ms. The registry does not deliver that rule. Tracing
 * source → registry → consumer shows what arrives:
 *
 *   delivered        the component source, `lib/utils.ts`, and (via the `tokens` item) a stylesheet that
 *                    defines every `--duration-*` / `--easing-*` variable.
 *   NOT delivered    the preset: no 0.01ms floor, no `tailwindcss-animate` (so no `animate-in`/`-out`), no
 *                    `accordion-*`, `collapsible-*`, `marquee`, `typing-dot` or `caret-blink` keyframes, and
 *                    no `duration-fast` / `ease-standard` utilities. A registry item declares npm packages
 *                    and files; it has no field for a Tailwind plugin or config.
 *
 * So a registry consumer who has not also adopted the preset gets, for those utilities, NO animation (an
 * unknown class is ignored) rather than a reduced one, and Tailwind's own default timings where a
 * `transition-*` utility names no token duration. What the registry therefore CANNOT promise is "reduced
 * motion removes transitions". The one promise a delivered file can keep by itself, because it is
 * ordinary Tailwind core, is this:
 *
 *   MINIMUM CONTRACT   every continuous loop in a delivered file states its own reduced form
 *                      (`motion-reduce:animate-none`), so the loops the registry ships stop for a
 *                      reduced-motion reader whether or not the preset is present.
 *
 * and the precondition that makes the token utilities resolve at all:
 *
 *   TOKENS RESOLVE     the delivered stylesheet defines every duration and easing token.
 *
 * ── Why it reads the served payloads ──────────────────────────────────────
 *
 * Same boundary as `check-registry-deps`: `apps/web/public/r/*.json` is what the CLI downloads, with each
 * file's full text, so what is checked is what a consumer receives and not a re-derivation from sources.
 *
 * The inventory it prints (which items lean on the preset for their motion) is information, not a
 * failure: it is what /docs/installation points a reader at.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = process.argv.find((a) => a.startsWith("--root="))?.slice(7) ?? ROOT;
const SERVED = join(root, "apps/web/public/r");

const motion = JSON.parse(readFileSync(join(root, "tokens/primitives/motion.json"), "utf8"));

/** Core Tailwind and preset loops. Each must carry its own reduced form. */
const LOOP = /\banimate-(spin|pulse|ping|bounce|marquee|typing-dot|caret-blink)\b/;
/** Utilities that exist only because the preset (or its plugin) defines them. */
const PRESET_ONLY = /\b(?:animate-(?:in|out|accordion-(?:down|up)|collapsible-(?:down|up)|marquee|typing-dot|caret-blink)|duration-(?:instant|fast|base|slow|slower)|ease-(?:standard|enter|exit|emphasized))\b/;

const errors = [];
const leansOnPreset = new Map();
let delivered = 0;
let loops = 0;

for (const file of readdirSync(SERVED).filter((f) => f.endsWith(".json") && f !== "registry.json")) {
  const item = JSON.parse(readFileSync(join(SERVED, file), "utf8"));
  for (const f of item.files ?? []) {
    if (!f.content) continue;
    if (f.path.endsWith(".tsx")) {
      delivered++;
      for (const literal of f.content.match(/"[^"\n]*"/g) ?? []) {
        if (LOOP.test(literal)) {
          loops++;
          if (!literal.includes("motion-reduce:animate-none")) {
            errors.push(`${item.name}: a loop with no stated reduced form — ${literal.slice(0, 90)}\n      Without the preset's floor nothing else stops it.`);
          }
        }
        if (PRESET_ONLY.test(literal)) leansOnPreset.set(item.name, true);
      }
    }
    if (item.name === "tokens" && f.path.endsWith("globals.css")) {
      for (const [group, prefix] of [["duration", "duration"], ["easing", "easing"]]) {
        for (const name of Object.keys(motion[group] ?? {}).filter((k) => !k.startsWith("$"))) {
          if (!f.content.includes(`--${prefix}-${name}:`)) errors.push(`tokens: the delivered stylesheet does not define --${prefix}-${name}`);
        }
      }
    }
  }
}

if (delivered === 0) errors.push(`no registry payloads found in ${SERVED} — run \`pnpm build:registry\` first.`);
if (loops === 0 && delivered > 0) errors.push("no looping utility found in any delivered file — the check is not looking at anything.");

if (errors.length) {
  console.error(`check:registry-motion — ${errors.length} problem(s)\n` + errors.map((e) => "  ✗ " + e).join("\n"));
  process.exit(1);
}
console.log(
  `check:registry-motion ok — ${loops} delivered loop(s) across ${delivered} components each state their own reduced form; the delivered stylesheet defines every motion token.\n` +
    `  ${leansOnPreset.size} item(s) lean on the @kinetixui/ui preset for their motion utilities and the global 0.01ms floor, which the registry does not deliver:\n` +
    `  ${[...leansOnPreset.keys()].sort().join(", ")}`,
);
