/**
 * Negative controls for `check:editorial` (and for the Phase 2 pages under `check:seo`): prove each rule fails on
 * the defect it exists for.
 *
 * Each control breaks ONE thing — in the built output the gates read (apps/web/.next) or in a source file the
 * gate reads directly — runs the gate, expects it to fail with the named rule, then restores the file
 * byte-for-byte and verifies its SHA-256 before moving on. A control the gate does not catch fails this script.
 *
 *   pnpm --filter @kinetixui/web build && node scripts/editorial-negative-controls.mjs
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const APP = resolve("apps/web/.next/server/app");
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
const built = (f) => join(APP, f);

const EDITORIAL = "scripts/check-editorial.mjs";
const SEO = "scripts/check-seo.mjs";

export const CONTROLS = [
  {
    id: 1,
    name: "duplicate primary intent owner in the search-intent map",
    file: resolve("marketing/seo/SEARCH-INTENT-MAP.md"),
    mutate: (s) => s.replace("| `/docs/rtl` | **RTL design system**", "| `/docs/rtl` | **accessible component library**"),
    gate: EDITORIAL,
    expect: "intent-duplicate",
  },
  {
    id: 2,
    name: "component intro replaced with generic boilerplate",
    file: built("docs/components/dialog.html"),
    mutate: (s) =>
      s.replace(/(<p data-component-intro="true"[^>]*>)[^<]*(<\/p>)/, "$1A flexible and accessible component for modern applications.$2"),
    gate: EDITORIAL,
    expect: "intro-boilerplate",
  },
  {
    id: 3,
    name: "component intro emptied",
    file: built("docs/components/select.html"),
    mutate: (s) => s.replace(/(<p data-component-intro="true"[^>]*>)[^<]*(<\/p>)/, "$1$2"),
    gate: EDITORIAL,
    expect: "intro-empty",
  },
  {
    id: 4,
    name: "component guide loses its links to sibling components",
    file: built("docs/components/tabs.html"),
    mutate: (s) => s.replace(/<section data-component-guide="true"[\s\S]*?<\/section>/, (sec) => sec.replaceAll('href="/docs/components/', 'href="/components#')),
    gate: EDITORIAL,
    expect: "guide-links",
  },
  {
    id: 5,
    name: "Markdown/code formatting in a Phase 2 page's description",
    file: built("docs/components/popover.html"),
    mutate: (s) => s.replace(/(<meta name="description" content="KinetixUI Popover: )/, "$1`Popover` "),
    gate: SEO,
    expect: "desc-markup",
  },
  {
    id: 6,
    name: "platform page hard-codes a stale component count",
    file: resolve("apps/web/src/app/docs/angular/page.mdx"),
    mutate: (s) => s.replace("<PlatformCountInline platform=\"Angular\" /> of the <ComponentTotalInline />", "71 of the 98"),
    gate: EDITORIAL,
    expect: "count-hardcoded",
  },
  {
    id: 7,
    name: "near-identical titles on two non-component pages",
    file: built("docs/rtl.html"),
    mutate: (s) => s.replace(/<title>[^<]*<\/title>/, "<title>Accessibility: keyboard, focus, contrast and evidence — KinetixUI</title>"),
    gate: EDITORIAL,
    expect: "near-duplicate",
  },
  {
    id: 8,
    name: "draft guide accidentally indexed (robots meta flipped)",
    file: built("guides/verify-design-system-parity.html"),
    mutate: (s) => s.replace(/<meta name="robots" content="noindex, nofollow"\/>/, '<meta name="robots" content="index, follow"/>'),
    gate: EDITORIAL,
    expect: "draft-indexed",
  },
  {
    id: 9,
    name: "guide loses its primary CTA",
    file: built("guides/generated-tokens-vs-generated-components.html"),
    mutate: (s) => s.replace("data-guide-cta", "data-guide-cta-removed"),
    gate: EDITORIAL,
    expect: "guide-cta",
  },
  {
    id: 10,
    name: "guide loses its internal product links",
    file: built("guides/evaluate-cross-platform-component-library.html"),
    mutate: (s) => s.replace(/href="\/(docs|components|blocks)([^"]*)"/g, 'href="https://example.com/$1$2"'),
    gate: EDITORIAL,
    expect: "guide-product-links",
  },
  {
    id: 11,
    name: "supporting guide fails to link back to the pillar",
    file: resolve("apps/web/src/app/guides/verify-design-system-parity/page.mdx"),
    // a source mutation, checked against the built HTML would need a rebuild; the unit test guards the source
    mutate: (s) => s.replace("](/guides/cross-platform-design-systems)", "](/docs/platforms)"),
    gate: "apps/web/src/lib/guides.test.ts",
    expect: "guides.test",
  },
  {
    id: 12,
    name: "supporting guide's body link to the pillar removed from the built page",
    file: built("guides/generated-tokens-vs-generated-components.html"),
    mutate: (s) => {
      const [body, rest] = [s.slice(0, s.indexOf("data-guide-related")), s.slice(s.indexOf("data-guide-related"))];
      const meta = body.match(/<p data-guide-meta[\s\S]*?<\/p>/)?.[0] ?? "";
      const stripped = body.replace(meta, "@@META@@").replaceAll('href="/guides/cross-platform-design-systems"', 'href="/docs/platforms"').replace("@@META@@", meta);
      return stripped + rest;
    },
    gate: EDITORIAL,
    expect: "guide-pillar",
  },
  {
    id: 13,
    name: "an indexable docs page links a draft guide",
    file: built("docs/platforms.html"),
    mutate: (s) => s.replace("</main>", '<a href="/guides/cross-platform-design-systems">Guide</a></main>'),
    gate: EDITORIAL,
    expect: "draft-linked",
  },
  {
    id: 14,
    name: "guide claims an intent the map gives elsewhere (duplicate intent owner)",
    file: resolve("marketing/seo/SEARCH-INTENT-MAP.md"),
    mutate: (s) => s.replace("**design system parity verification**", "**cross-platform design system architecture**"),
    gate: EDITORIAL,
    expect: "intent-duplicate",
  },
];

function runGate(script) {
  if (script.endsWith(".test.ts")) {
    try {
      return { code: 0, out: execFileSync("npx", ["vitest", "run", script.replace("apps/web/", "")], { cwd: resolve("apps/web"), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
    } catch (e) {
      return { code: 1, out: `[guides.test] ${String(e.stdout)}` };
    }
  }
  try {
    return { code: 0, out: execFileSync("node", [script, "--all"], { encoding: "utf8" }) };
  } catch (e) {
    return { code: e.status, out: String(e.stdout) };
  }
}

for (const g of [EDITORIAL, SEO, "apps/web/src/lib/guides.test.ts"]) {
  const base = runGate(g);
  if (base.code !== 0) {
    console.error(`editorial negative controls: ${g} is not green on the unmodified tree — fix that first.\n${base.out}`);
    process.exit(2);
  }
}

const results = [];
for (const c of CONTROLS) {
  const original = readFileSync(c.file);
  const before = sha(c.file);
  const mutated = c.mutate(original.toString("utf8"));
  if (mutated === original.toString("utf8")) {
    results.push({ ...c, ok: false, why: "mutation did not apply (pattern not found)" });
    continue;
  }
  writeFileSync(c.file, mutated);
  const { code, out } = runGate(c.gate);
  writeFileSync(c.file, original);
  const restored = sha(c.file) === before;
  const caught = code === 1 && out.includes(`[${c.expect}]`);
  results.push({ ...c, ok: caught && restored, caught, restored, hash: before.slice(0, 12) });
}

const after = [EDITORIAL, SEO, "apps/web/src/lib/guides.test.ts"].map(runGate);
for (const r of results) {
  console.log(
    `${r.ok ? "✓" : "✗"} EC-${String(r.id).padStart(2, "0")} ${r.name} → ${r.caught ? `caught by ${r.expect}` : r.why ?? "NOT CAUGHT"}; restored ${r.restored ? `sha256 ${r.hash}… matches` : "MISMATCH"}`,
  );
}
const green = after.every((a) => a.code === 0);
console.log(`gates after all controls: ${green ? "green" : "RED"}`);
if (results.some((r) => !r.ok) || !green) process.exit(1);
