// a01 — package consistency.
//
//   node marketing/content/drafts/a01/verify-package.mjs
//
// Checks the channel files agree with each other and with the campaign rules: one title everywhere,
// no fabricated DEV URL, the denominator phrased precisely, Angular always marked preview, and every
// recommended link using a campaign tag the acquisition parser actually keeps.
//
// It also re-derives every CURRENT-STATE number from components.manifest.json and the generated
// registries, so a package that has gone stale fails here rather than on DEV. No coverage figure is
// hard-coded below: the expected values are read from the repository on each run, which is why a
// future count change fails this package only when the copy stops matching the repository — not
// merely because a number moved.
//
// Two kinds of number live in this package, and two different scripts own them:
//
//   HISTORICAL  frozen evidence, tied to a commit (SwiftUI 91 → 90, the 300 snippets, 164/182/175).
//               Owned by verify-evidence.mjs, which pins each one to a git ref. Never re-derived.
//   CURRENT     volatile facts about main as it is right now. Owned by this file, always re-derived.
//
// A number that moves therefore breaks exactly one of the two, never both. The stale-figure sweep at
// the end strips the historical sentences before scanning, so correcting today's copy can never be
// achieved by quietly editing the before/after the article rests on.
import { readFileSync } from "node:fs";
const dir = new URL("./", import.meta.url);
const root = new URL("../../../../", dir);
const TITLE = "Your cross-platform design system may be lying about parity";
const files = ["article.md", "devto.md", "linkedin.md", "x-thread.md", "visual-brief.md", "measurement.md", "publish-checklist.md"];
const read = (f) => readFileSync(new URL(f, dir), "utf8");

let bad = 0;
const t = (ok, m) => {
  console.log((ok ? "ok   " : "FAIL ") + m);
  if (!ok) bad++;
};

const art = read("article.md");
const dev = read("devto.md");
const li = read("linkedin.md");
const xt = read("x-thread.md");
const backlog = JSON.parse(readFileSync(new URL("../../backlog.json", dir), "utf8"));
const bl = backlog.items.find((i) => i.id === "a01");

t(art.includes("# " + TITLE), "article H1 = final title");
t(dev.includes("title: " + TITLE), "devto front matter title matches");
t(bl.title === TITLE, "backlog title matches");
t(!dev.includes("canonical_url:"), "devto has NO canonical_url set");
t(dev.includes("published: false"), "devto published: false");
t(bl.status === "drafted", "backlog status still 'drafted'");
t(bl.publishWindow === null, "no publish window set");

for (const f of files) {
  // The checklist names the banned phrases in order to forbid them, so scanning it for
  // those phrases always trips. Its job is to quote them.
  if (f === "publish-checklist.md") continue;
  const s = read(f);
  if (/all four platforms\b/.test(s)) t(false, `${f}: bare "all four platforms"`);
  if (/\ball platforms\b/i.test(s) && /\b9[0-9] ?\/ ?98\b/.test(s)) t(false, `${f}: "all platforms" near the coverage figure`);
  if (/revolutionary|game.chang/i.test(s)) t(false, `${f}: superlative language`);
  const ng = [...s.matchAll(/Angular/g)];
  if (ng.length && !/Angular[\s\S]{0,120}preview/i.test(s)) t(false, `${f}: Angular without "preview" nearby`);
}
t(true, "claim hygiene sweep (denominator, superlatives, Angular maturity)");

t(li.includes("<DEV_ARTICLE_URL>") && xt.includes("<DEV_ARTICLE_URL>"), "placeholders present in both social files");
t(!/https?:\/\/dev\.to\/\S+/i.test(li + xt + art), "no fabricated dev.to URL anywhere");
t(/utm_campaign=kx_parity_proof/.test(read("measurement.md")), "campaign tag uses the kx_ prefix the regex requires");
// Only recommended links matter. measurement.md quotes the bad tag deliberately, as the warning.
const recommended = read("measurement.md").split("\n").filter((l) => l.startsWith("| ") && l.includes("utm_campaign="));
t(recommended.length >= 3, "link table has the three channel rows");
t(recommended.every((l) => l.includes("utm_campaign=kx_parity_proof")), "every recommended link uses the kx_ campaign tag");
t(!recommended.some((l) => /utm_medium=article/.test(l)), "no recommended link uses the rejected medium");

// ── current state, re-derived from the repository ───────────────────────────────────────────────
const manifest = JSON.parse(readFileSync(new URL("components.manifest.json", root), "utf8"));
const defs = manifest.platformDefinitions;
const comps = Object.entries(manifest.components);
const CATALOGUE = Object.keys(defs).filter((p) => defs[p].catalogComplete);
const impl = Object.fromEntries(
  Object.keys(defs).map((p) => [p, comps.filter(([, v]) => (v.platforms || []).includes(p)).length]),
);
const onAll = comps.filter(([, v]) => CATALOGUE.every((p) => (v.platforms || []).includes(p))).length;
const exceptions = comps.length - onAll;

// Demo examples, counted the way the article counts them: keys that carry native code at all, and
// the subset whose native code is extracted from a file a compiler builds.
// Both registries are read as text rather than imported: they are TypeScript, and the generated one
// carries trailing commas that JSON.parse rejects. Each top-level key is a demo, each nested
// swift/kotlin/dart key a native snippet — enough structure to count without a parser.
const blocksOf = (src) => {
  const body = src.slice(src.indexOf("= {"));
  const out = {};
  for (const m of body.matchAll(/^ {2}"([a-z0-9-]+)": \{([\s\S]*?)^ {2}\},$/gm)) {
    out[m[1]] = [...m[2].matchAll(/^ {4}"?([a-z]+)"?:/gm)].map((x) => x[1]);
  }
  return out;
};
const generated = blocksOf(readFileSync(new URL("apps/web/src/registry/usage-examples.generated.ts", root), "utf8"));
const handWritten = blocksOf(readFileSync(new URL("apps/web/src/registry/platform-code.ts", root), "utf8"));
const NATIVE = ["swift", "kotlin", "dart"];
const compiledKeys = Object.keys(generated).filter((k) => generated[k].some((p) => NATIVE.includes(p)));
const demoTotal = new Set([...Object.keys(handWritten), ...compiledKeys]).size;
t(Object.keys(handWritten).length > 50, `platform-code.ts parsed (${Object.keys(handWritten).length} hand-written demo keys)`);
t(Object.keys(generated).length > 10, `usage-examples.generated.ts parsed (${Object.keys(generated).length} generated demo keys)`);

// These files are hard-wrapped at 80 columns, so "Flutter 90" is routinely split across a newline.
// Every copy match below runs against a whitespace-collapsed copy; matching the raw text would pass
// or fail on where the wrap happened to fall, which is not a fact about the claim.
const flat = (s) => s.replace(/\s+/g, " ");

// "Ours, today" is the single paragraph in the article allowed to carry live figures.
const start = art.indexOf("Ours, today:");
const today = start < 0 ? "" : flat(art.slice(start, art.indexOf("Those are generated", start)));
t(today.length > 0, "article has an 'ours, today' paragraph to check");
t(today.includes(`${comps.length} components`), `today: ${comps.length} components`);
for (const [key, label] of [["React", "React"], ["SwiftUI", "SwiftUI"], ["Compose", "Jetpack Compose"], ["Flutter", "Flutter"], ["Angular", "Angular"]]) {
  t(today.includes(`${label} ${impl[key]}`), `today: ${label} ${impl[key]}`);
}
t(today.includes(`${onAll} of ${comps.length}`), `today: ${onAll} of ${comps.length} on the catalogue platforms`);
t(today.includes(`${exceptions} documented exceptions`), `today: ${exceptions} documented exceptions`);
t(/Angular[^.]*preview/.test(today), "today: Angular marked preview");
t(defs.Angular.catalogComplete === false, "Angular still outside the catalogue denominator");
t(!/\ball five\b/i.test(today), "today: no 'all five' framing on a four-platform denominator");

// The migration line, in each of the three places it is written.
const WORD = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][compiledKeys.length];
const migration = `${WORD[0].toUpperCase()}${WORD.slice(1)} of a hundred`;
t(Boolean(WORD), `migration: ${compiledKeys.length} compiled-source demo keys has a word form`);
for (const [name, body] of [["article.md", art], ["linkedin.md", li], ["x-thread.md", xt]]) {
  t(flat(body).includes(migration), `${name}: migration line reads "${migration}…"`);
}
t(demoTotal >= 100 && demoTotal < 110, `migration: ${demoTotal} demo keys total — "a hundred-odd" still fair`);

// Stale current-state figures. Historical sentences are removed first: they are the before/after the
// piece rests on, each pinned to a commit in verify-evidence.mjs, and must survive this sweep intact.
const HISTORICAL = [
  /SwiftUI 91 → 90/g,
  /Compose\s*\n?90 → 89/g,
  /Flutter 91 → 90/g,
  /full coverage 90 → 89/g,
  /platforms:\s*\n?90 → 89/g,
  /On all four catalogue-complete platforms: 90 → 89/g,
  /91\/90\/91 → 90\/89\/90/g,
  /91 · 90 · 91/g,
  /Coverage after: SwiftUI \*\*90\*\*, Compose \*\*89\*\*, Flutter \*\*90\*\*, all-four \*\*89\*\*/g,
  /Coverage before the correction[^\n]*/gi,
  /took it 90 → 89/g,
  /90 → 89/g,
];
const STALE = ["Angular 11", "Compose 89", "89 of 98", "89/98", "9 documented exceptions", "Three of a hundred"];
for (const f of files.concat("sources.md")) {
  let body = read(f);
  for (const h of HISTORICAL) body = body.replace(h, "");
  for (const stale of STALE) {
    if (body.includes(stale)) t(false, `${f}: stale current-state figure "${stale}" outside a historical sentence`);
  }
}
t(true, "no stale current-state figures (historical before/after left intact)");

const words = art.split(/\s+/).filter(Boolean).length;
console.log(
  `\ntruth now: ${comps.length} components ${JSON.stringify(impl)} ` +
    `onAll(${CATALOGUE.length})=${onAll} exceptions=${exceptions} compiledDemos=${compiledKeys.length}/${demoTotal}`,
);
console.log(`article words: ${words} (was 1864, ${(((words - 1864) / 1864) * 100).toFixed(1)}%)`);
console.log(bad ? `\n${bad} PROBLEM(S)` : "\nall consistency checks passed");
process.exit(bad ? 1 : 0);
