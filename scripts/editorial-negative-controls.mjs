/**
 * Negative controls for `check:editorial` (and for the Phase 2 pages under `check:seo`): prove each rule fails on
 * the defect it exists for.
 *
 * Some controls only make sense in one publication state of the guides cluster (a draft cannot be "published
 * without a date"). Each such control declares `state`; the script reads the registry and runs the controls that
 * apply, listing the rest as skipped. `scripts/simulate-guide-publication.mjs --controls` runs the published-state
 * controls against a simulated publication build, so both halves are exercised while the guides are drafts.
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

const { GUIDES } = await import(resolve("apps/web/src/lib/guides-data.ts"));
/** The cluster's state on this tree: "draft", "published", or "mixed" (which check:editorial already fails). */
export const STATE = GUIDES.every((g) => g.status === "published") ? "published" : GUIDES.every((g) => g.status === "draft") ? "draft" : "mixed";

const APP = resolve("apps/web/.next/server/app");
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
const built = (f) => join(APP, f);

const EDITORIAL = "scripts/check-editorial.mjs";
const GUIDES_DATA = resolve("apps/web/src/lib/guides-data.ts");
// unpublish one guide in the registry while the build still holds it published: the state a partial unpublish ships
const unpublish = (slug) => (s) =>
  s.replace(new RegExp(`(slug: "${slug}",[\\s\\S]*?)status: "published",\\n\\s*datePublished: "[^"]*",`), '$1status: "draft",');
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
    mutate: (s) => s.replace(/(<meta name="description" content="KinetixUI )(Popover)/, "$1`$2`"),
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
    name: "a guide marked draft is still indexable, in the sitemap and carrying article JSON-LD",
    state: "published",
    file: GUIDES_DATA,
    mutate: unpublish("evaluate-cross-platform-component-library"),
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
    state: "published",
    file: GUIDES_DATA,
    // /docs/platforms names the pillar in its Further reading line
    mutate: unpublish("cross-platform-design-systems"),
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
  {
    id: 15,
    name: "one guide unpublished while the published guides still link it",
    state: "published",
    file: GUIDES_DATA,
    mutate: unpublish("verify-design-system-parity"),
    gate: EDITORIAL,
    expect: "draft-linked",
  },
  /* ---------------------------------------------------------------- SEO Phase 3: the publication gate */
  {
    id: 16,
    name: "one supporting guide published alone (registry)",
    state: "draft",
    file: resolve("apps/web/src/lib/guides-data.ts"),
    mutate: (s) => s.replace(/(slug: "verify-design-system-parity",[\s\S]*?)status: "draft",/, '$1status: "published", datePublished: "2026-01-01",'),
    gate: EDITORIAL,
    expect: "cluster-partial",
  },
  {
    id: 17,
    name: "a published guide loses its datePublished (registry)",
    state: "published",
    file: resolve("apps/web/src/lib/guides-data.ts"),
    mutate: (s) => s.replace(/(slug: "generated-tokens-vs-generated-components",[\s\S]*?)\s*datePublished: "[^"]*",/, "$1"),
    gate: EDITORIAL,
    expect: "guide-date",
  },
  {
    id: 18,
    name: "a published guide still carries noindex",
    state: "published",
    file: built("guides/evaluate-cross-platform-component-library.html"),
    mutate: (s) => s.replace(/<meta name="robots"[^>]*>/g, "").replace("</head>", '<meta name="robots" content="noindex, nofollow"/></head>'),
    gate: EDITORIAL,
    expect: "draft-indexed",
  },
  {
    id: 19,
    name: "a published guide is omitted from the sitemap",
    state: "published",
    file: built("sitemap.xml.body"),
    mutate: (s) => s.replace(/<url>\s*<loc>https:\/\/kinetixui\.com\/guides\/verify-design-system-parity<\/loc>[\s\S]*?<\/url>/, ""),
    gate: EDITORIAL,
    expect: "sitemap-state",
  },
  {
    id: 20,
    name: "a draft guide carries article JSON-LD",
    state: "draft",
    file: built("guides/generated-tokens-vs-generated-components.html"),
    mutate: (s) => s.replace("</body>", '<script type="application/ld+json">{"@context":"https://schema.org","@type":"TechArticle","headline":"x"}</script></body>'),
    gate: EDITORIAL,
    expect: "draft-indexed",
  },
  {
    id: 21,
    name: "FurtherReading exposes a draft guide",
    state: "draft",
    file: built("docs/tokens.html"),
    mutate: (s) => s.replace("</main>", '<p data-further-reading="true">Further reading: <a href="/guides/generated-tokens-vs-generated-components">Generated tokens vs generated components</a>.</p></main>'),
    gate: EDITORIAL,
    expect: "further-reading",
  },
  {
    id: 22,
    name: "FurtherReading drops a published guide",
    state: "published",
    file: built("docs/tokens.html"),
    mutate: (s) => s.replace(/<p[^>]*data-further-reading[^>]*>[\s\S]*?<\/p>/, ""),
    gate: EDITORIAL,
    expect: "further-reading",
  },
  {
    id: 23,
    name: "the pillar types a stale component count instead of rendering it",
    file: resolve("apps/web/src/app/guides/cross-platform-design-systems/page.mdx"),
    mutate: (s) => s.replace("<ComponentTotalInline /> catalogue entries", "98 catalogue entries"),
    gate: EDITORIAL,
    expect: "count-hardcoded",
  },
  {
    id: 24,
    name: "a guide's search description types a component count",
    file: resolve("apps/web/src/lib/guides-data.ts"),
    mutate: (s) => s.replace("A checklist for teams choosing", "A 98 components checklist for teams choosing"),
    gate: EDITORIAL,
    expect: "count-hardcoded",
  },
  {
    id: 25,
    name: "a guide's CTA points to the wrong destination",
    file: built("guides/verify-design-system-parity.html"),
    mutate: (s) => s.replace(/<a([^>]*?)href="\/docs\/platforms#[^"]*"([^>]*data-guide-cta)/, '<a$1href="/docs/installation"$2').replace(/<a([^>]*data-guide-cta[^>]*?)href="\/docs\/platforms#[^"]*"/, '<a$1href="/docs/installation"'),
    gate: EDITORIAL,
    expect: "guide-cta",
  },
  {
    id: 26,
    name: "the pillar loses its link to the proof (/docs/platforms)",
    file: built("guides/cross-platform-design-systems.html"),
    mutate: (s) => {
      const i = s.indexOf("data-guide-related");
      return s.slice(0, i).replace(/<a(?![^>]*data-guide-cta)([^>]*?)href="\/docs\/platforms"/g, '<a$1href="/docs/rtl"') + s.slice(i);
    },
    gate: EDITORIAL,
    expect: "pillar-proof",
  },
  {
    id: 27,
    name: "two guides claim the same primary intent in the registry",
    file: resolve("apps/web/src/lib/guides-data.ts"),
    mutate: (s) => s.replace('primaryIntent: "design system parity verification"', 'primaryIntent: "cross-platform design system architecture"'),
    gate: EDITORIAL,
    expect: "guide-intent",
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

// `--state <draft|published>` asserts the state the caller expects (the publication simulation passes it), so a
// registry rewrite that silently failed cannot run the wrong half of the controls and report green
const expected = process.argv.includes("--state") ? process.argv[process.argv.indexOf("--state") + 1] : null;
if (expected && expected !== STATE) {
  console.error(`editorial negative controls: expected the ${expected} state, the registry is ${STATE}`);
  process.exit(2);
}
const applicable = CONTROLS.filter((c) => !c.state || c.state === STATE);
const skipped = CONTROLS.filter((c) => !applicable.includes(c));
console.log(`guides cluster state: ${STATE}; running ${applicable.length} controls, skipping ${skipped.length} that need the other state`);

const results = [];
for (const c of applicable) {
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
for (const c of skipped) console.log(`- EC-${String(c.id).padStart(2, "0")} ${c.name} → skipped (needs the ${c.state} state)`);
const green = after.every((a) => a.code === 0);
console.log(`gates after all controls: ${green ? "green" : "RED"}`);
if (results.some((r) => !r.ok) || !green) process.exit(1);
