/**
 * check-contrast.mjs — WCAG contrast audit of the semantic token contract.
 *
 *   node scripts/check-contrast.mjs
 *
 * Resolves every semantic color (light + dark) to its primitive hex and checks
 * the foreground/surface pairs components actually render:
 *   - text pairs must clear 4.5:1 (AA) — 3:1 is flagged as large-text-only
 *   - non-text "cue" pairs (hover fill, border, focus ring, …) must clear
 *     SC 1.4.11 (3:1)
 * Exits non-zero if any pair fails and isn't in its KNOWN_* tracked-exceptions
 * set (see ACCESSIBILITY-AUDIT.md §A3 for why the current non-text exceptions
 * are acceptable as designed, not oversights).
 *
 * The resolver understands three ref shapes:
 *   {color.<family>.<step>}     -> tokens/primitives/color.json
 *   {color.semantic.<name>}     -> the nested `semantic` block of the per-mode
 *                                  semantic file (light carries raw hexes there;
 *                                  dark has no semantic block)
 *   {color.<other-semantic>}    -> one more hop through the same semantic file
 * ...and follows up to 5 hops so an indirected ref still lands on a hex.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => JSON.parse(readFileSync(`${root}/${p}`, "utf8"));
const val = (node) => node?.["$value"] ?? node?.value ?? null;

const prim = read("tokens/primitives/color.json").color;
const flat = {};
for (const fam of Object.keys(prim)) {
  for (const step of Object.keys(prim[fam] ?? {})) {
    const v = val(prim[fam][step]);
    if (typeof v === "string" && v.startsWith("#")) flat[`${fam}.${step}`] = v;
  }
}

const lum = (hex) => {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Real foreground/surface pairs components render as body text — must clear AA.
// `fg` is drawn as text on `bg`; every entry maps to a class combo that ships
// in packages/ui (bg-*/text-* pairs, or a solid variant + its -foreground).
const TEXT_PAIRS = [
  ["foreground", "background"],
  ["muted-foreground", "background"],
  ["muted-foreground", "muted"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["destructive-foreground", "destructive"], // Button variant="Destructive"
  ["destructive", "background"], // Alert/Field: text-destructive on the page
  ["success-foreground", "success"],
  ["success", "background"], // Field/Inform success text
  ["warning-foreground", "warning"], // Tag warning: text-warning on bg-warning-foreground
  ["warning", "background"], // Alert/Field/Inform/Rating: text-warning on the page
  ["info", "background"], // Alert/Field/Inform: text-info on the page
  ["accent-foreground", "accent"],
  ["card-foreground", "card"],
  // the grouped section a Card sits on (surface model, TOKENS.md) carries section headings and helper text
  ["foreground", "surface-grouped"],
  ["muted-foreground", "surface-grouped"],
  ["popover-foreground", "popover"],
  ["sidebar-foreground", "sidebar"],
  ["sidebar-primary-foreground", "sidebar-primary"],
  ["sidebar-accent-foreground", "sidebar-accent"],
  ["primary", "background"],
  // role tokens (default to primary / ring, but can be themed on their own — so they get their own rows)
  ["action-foreground", "action"],
  ["link", "background"], // Link button / inline links
  ["brand-foreground", "brand"],
  ["brand", "background"], // brand used as text or an icon on the page
];
// Text on a fill that is drawn at partial opacity (`bg-primary/85`, `bg-info/10`). The fill
// is blended over `surface` first, so these catch what a solid-colour check can't — e.g. a
// pressed state that dims the fill toward the page until its text drops below AA.
//   [text, fill, fillAlpha, surface, where]
const ALPHA_TEXT_PAIRS = [
  ["action-foreground", "action", 0.9, "background", "Button Primary hover"],
  ["action-foreground", "action", 0.85, "background", "Button Primary pressed"],
  ["secondary", "secondary-foreground", 1, "background", "Button Secondary hover"],
  ["secondary", "secondary-foreground", 1, "background", "Button Secondary pressed"],
  ["on-info-container", "info", 0.1, "background", "Banner/Inform information"],
  // Native Banner/Inform draw the same text on the same tint (`onInfoContainer`); a banner inside a
  // muted panel is the tighter case — `info` itself is 3.90:1 there.
  ["on-info-container", "info", 0.1, "muted", "Banner/Inform information on a muted surface"],
  // IoT device, group and activity cards tint their surface to carry state. `--muted-foreground`
  // is tuned against `--background` and `--muted` and has no margin left on a 10% tint (4.43:1 on
  // primary, 4.33:1 on destructive), which is how three contrast violations reached main unseen.
  // `--semantic-muted-on-container` is the value those surfaces use; these rows keep it honest
  // statically, so the class of bug no longer depends on a browser pass running.
  ["muted-on-container", "primary", 0.1, "background", "IoT DeviceControlCard active"],
  ["muted-on-container", "primary", 0.05, "background", "IoT DeviceGroupCard active"],
  ["muted-on-container", "primary", 0.1, "muted", "IoT group row selected on a muted page"],
  ["muted-on-container", "destructive", 0.1, "background", "IoT ActivityTimeline failed block"],
  ["muted-on-container", "destructive", 0.05, "background", "IoT DeviceGroupCard attention"],
  ["muted-on-container", "destructive", 0.1, "muted", "IoT failed block on a muted page"],
];
const NON_TEXT_PAIRS = [
  ["accent", "background"], // hover fill on transparent controls
  ["border", "background"],
  ["ring", "background"], // focus ring
  ["focus", "background"], // focus indicator role token (defaults to ring)
  ["input", "background"],
  ["tertiary", "background"], // Switch off-track (bg-tertiary) — boundary only, no text
  ["sidebar-border", "sidebar"],
  ["sidebar-ring", "sidebar"],
];

/**
 * Text pairs that currently sit below AA in ONE theme and are tracked as
 * known issues (see ACCESSIBILITY-AUDIT.md) rather than hard-failing the
 * build — they need a design call on the token value, not a one-liner.
 * A NEW sub-AA pair (anything not on this list) still fails CI.
 *   key: `${fg}/${bg}@${mode}`
 */
const KNOWN_SUBAA = new Set([
  // (empty) — light --warning was darkened to amber.800 (6.1:1); nothing tracked.
]);

/**
 * Non-text pairs that sit below 3:1 by design, not oversight — each is
 * intentionally subtle and, per ACCESSIBILITY-AUDIT.md §A3, is never the
 * only cue a component relies on (the hover/selected/focus state also draws
 * a `--ring` inset outline, or — for `tertiary` — the Switch pairs its track
 * with a moving thumb + `aria-checked`). A NEW sub-3:1 pair not on this list
 * still fails CI; retheming one of these on purpose means updating this set
 * deliberately, not silently.
 *   key: `${fg}/${bg}@${mode}`
 */
const KNOWN_SUB3 = new Set([
  "accent/background@light",
  "accent/background@dark",
  "border/background@light",
  "border/background@dark",
  "input/background@light",
  "input/background@dark",
  "tertiary/background@light",
  "tertiary/background@dark",
  "sidebar-border/sidebar@light",
  "sidebar-border/sidebar@dark",
]);

let failures = 0;

for (const mode of ["light", "dark"]) {
  const sem = read(`tokens/semantic/color.${mode}.json`).color;

  // Flatten the per-mode `semantic` sub-block (light: raw hexes; dark: absent).
  const semLocal = {};
  for (const k of Object.keys(sem.semantic ?? {})) {
    const v = val(sem.semantic[k]);
    if (typeof v === "string") semLocal[k] = v;
  }

  const resolve = (ref, depth = 0) => {
    if (typeof ref !== "string" || depth > 5) return null;
    if (ref.startsWith("#")) return ref;
    let m = ref.match(/^\{color\.semantic\.([\w-]+)\}$/);
    if (m) return resolve(semLocal[m[1]] ?? null, depth + 1);
    m = ref.match(/^\{color\.([\w-]+)\.([\w-]+)\}$/);
    if (m) return flat[`${m[1]}.${m[2]}`] ?? null;
    m = ref.match(/^\{color\.([\w-]+)\}$/);
    if (m) return resolve(val(sem[m[1]]) ?? null, depth + 1);
    return null;
  };

  const S = {};
  for (const k of Object.keys(sem)) {
    if (k === "semantic") continue;
    const hex = resolve(val(sem[k]));
    if (hex) S[k] = hex;
  }
  // Roles that only exist in the nested `semantic` block (e.g. on-info-container).
  for (const k of Object.keys(semLocal)) {
    const hex = resolve(semLocal[k]);
    if (hex && !S[k]) S[k] = hex;
  }

  console.log(`\n=== ${mode.toUpperCase()} — text (AA = 4.5:1) ===`);
  for (const [fg, bg] of TEXT_PAIRS) {
    if (!S[fg] || !S[bg]) {
      console.log(`  ${`${fg} / ${bg}`.padEnd(44)} —      (token not defined in ${mode})`);
      continue;
    }
    const r = ratio(S[fg], S[bg]);
    const known = KNOWN_SUBAA.has(`${fg}/${bg}@${mode}`);
    let tag;
    if (r >= 4.5) tag = "AA";
    else if (known) tag = `${r >= 3 ? "AA-large only" : "sub-3:1"} — KNOWN, tracked in audit`;
    else {
      tag = r >= 3 ? "AA-large only ** FAIL for body text **" : "** FAIL **";
      failures += 1;
    }
    console.log(`  ${`${fg} / ${bg}`.padEnd(44)} ${r.toFixed(2)}:1  ${tag}`);
  }

  console.log(`--- ${mode} — text on partially-transparent fills ---`);
  for (const [fg, fill, alpha, surface, where] of ALPHA_TEXT_PAIRS) {
    if (!S[fg] || !S[fill] || !S[surface]) {
      console.log(`  ${`${fg} / ${fill}@${alpha}`.padEnd(44)} —      (token not defined in ${mode})`);
      failures += 1;
      continue;
    }
    const bl = (i) => Math.round(parseInt(S[fill].slice(1 + 2 * i, 3 + 2 * i), 16) * alpha + parseInt(S[surface].slice(1 + 2 * i, 3 + 2 * i), 16) * (1 - alpha));
    const blended = `#${[0, 1, 2].map((i) => bl(i).toString(16).padStart(2, "0")).join("")}`;
    const r = ratio(S[fg], blended);
    if (r < 4.5) failures += 1;
    console.log(`  ${`${fg} / ${fill}@${alpha}`.padEnd(44)} ${r.toFixed(2)}:1  ${r >= 4.5 ? "AA" : "** FAIL **"}  (${where})`);
  }

  console.log(`--- ${mode} — explicit action states match the web's derivation ---`);
  for (const [name, alpha] of [["action-hover", 0.9], ["action-pressed", 0.85]]) {
    if (!S[name] || !S.action || !S.background) {
      console.log(`  ${name.padEnd(44)} —      (token not defined in ${mode})`);
      failures += 1;
      continue;
    }
    const ch = (h, i) => parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
    const derived = [0, 1, 2].map((i) => Math.round(ch(S.action, i) * alpha + ch(S.background, i) * (1 - alpha)));
    const drift = Math.max(...[0, 1, 2].map((i) => Math.abs(derived[i] - ch(S[name], i))));
    const ok = drift <= 2; // 8-bit rounding
    if (!ok) failures += 1;
    console.log(`  ${name.padEnd(44)} ${S[name]}  derived #${derived.map((v) => v.toString(16).padStart(2, "0")).join("")}  ${ok ? "ok" : "** DRIFT — regenerate the explicit value **"}`);
  }

  // The baked focus-ring composites (--shadow-focus*): the crisp 1px edge is the
  // indicator, so its colour must clear 3:1 against the page. Light rings live in
  // shadow.json; the dark build pass overrides them from shadow.dark.json.
  const shadows = read(mode === "dark" ? "tokens/semantic/shadow.dark.json" : "tokens/semantic/shadow.json").shadow;
  console.log(`--- ${mode} — focus-ring composites (SC 1.4.11 = 3:1) ---`);
  for (const name of Object.keys(shadows).filter((k) => k.startsWith("focus"))) {
    const edge = val(shadows[name])?.[0]?.color?.slice(0, 7);
    if (!edge || !S.background) {
      console.log(`  ${`shadow-${name}`.padEnd(44)} —      (not defined in ${mode})`);
      failures += 1;
      continue;
    }
    const r = ratio(edge, S.background);
    if (r < 3) failures += 1;
    console.log(`  ${`shadow-${name} / background`.padEnd(44)} ${r.toFixed(2)}:1  ${r >= 3 ? "ok" : "** FAIL **"}`);
  }

  // Every focus ring is emitted on the web as a live `hsl(var(--role) / a)` reference (LIVE_SHADOW_ROLES in
  // style-dictionary/hooks.mjs): `--shadow-focus` follows `focus`, and the status rings follow `destructive`,
  // `success` and `warning`, so a theme that moves a role moves its ring. The source hex is what native
  // shadows read, so it has to BE the role's value — otherwise the web default and the native default would
  // quietly disagree. And the generated stylesheet has to actually carry the reference: a baked hex there is
  // how a custom theme ended up with an azure ring (or an invisible one on a blue background).
  console.log(`--- ${mode} — focus rings follow their role ---`);
  const extras = readFileSync(`${root}/packages/tokens/dist/web/${mode === "dark" ? "extras.dark.css" : "extras.css"}`, "utf8");
  for (const [ring, role] of [["focus", "focus"], ["focus-destructive", "destructive"], ["focus-success", "success"], ["focus-warning", "warning"]]) {
    const edge = val(shadows[ring])?.[0]?.color?.slice(0, 7)?.toLowerCase();
    const sameAsRole = edge && S[role] && edge === S[role].toLowerCase();
    if (!sameAsRole) failures += 1;
    console.log(`  ${`shadow.${ring} edge == color.${role}`.padEnd(44)} ${edge} vs ${S[role]}  ${sameAsRole ? "ok" : "** FAIL — the source ring is not the role **"}`);
    const emitted = extras.match(new RegExp(`--shadow-${ring}:\\s*([^;]+);`))?.[1] ?? "";
    const live = new RegExp(`^0 0 0 1px hsl\\(var\\(--${role}\\)\\), 0 0 0 4px hsl\\(var\\(--${role}\\) / [\\d.]+\\)$`).test(emitted.trim());
    if (!live) failures += 1;
    console.log(`  ${`generated --shadow-${ring} reads var(--${role})`.padEnd(44)} ${live ? "ok" : `** FAIL — got "${emitted}"; run pnpm build:tokens **`}`);
  }

  console.log(`--- ${mode} — non-text cues (SC 1.4.11 = 3:1) ---`);
  for (const [fg, bg] of NON_TEXT_PAIRS) {
    if (!S[fg] || !S[bg]) continue;
    const r = ratio(S[fg], S[bg]);
    const known = KNOWN_SUB3.has(`${fg}/${bg}@${mode}`);
    let tag;
    if (r >= 3) tag = "ok";
    else if (known) tag = "sub-3:1 — KNOWN, tracked (see ACCESSIBILITY-AUDIT.md §A3)";
    else {
      tag = "** FAIL ** — pair with a ring/border, or track it deliberately if by design";
      failures += 1;
    }
    console.log(`  ${`${fg} / ${bg}`.padEnd(44)} ${r.toFixed(2)}:1  ${tag}`);
  }
}

console.log(
  `\n${failures === 0 ? "PASS" : `FAIL (${failures})`} — text pairs meet WCAG AA and non-text` +
    ` cue pairs meet SC 1.4.11` +
    (failures === 0 ? "." : "; see above."),
);
process.exit(failures === 0 ? 0 : 1);
