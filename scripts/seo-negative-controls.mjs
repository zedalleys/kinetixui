/**
 * Negative controls for `check:seo`: prove the instrument fails on each defect it exists for.
 *
 * Each control breaks ONE thing in the built output the gate reads (apps/web/.next), runs the gate, expects it
 * to fail with the named rule, then restores the file byte-for-byte and verifies its SHA-256 matches the
 * original before moving on. Nothing in the source tree is touched, and a control that the gate does not
 * catch fails this script.
 *
 *   pnpm --filter @kinetixui/web build && node scripts/seo-negative-controls.mjs
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const APP = resolve("apps/web/.next/server/app");
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");

const CONTROLS = [
  {
    id: 1,
    name: "remove the canonical from a component page",
    file: "docs/components/button.html",
    mutate: (s) => s.replace(/<link rel="canonical"[^>]*\/>/, ""),
    expect: "canonical-missing",
  },
  {
    id: 2,
    name: "add ?platform=React to a canonical",
    file: "docs/components/dialog.html",
    mutate: (s) =>
      s.replace(
        '<link rel="canonical" href="https://kinetixui.com/docs/components/dialog"/>',
        '<link rel="canonical" href="https://kinetixui.com/docs/components/dialog?platform=React"/>',
      ),
    expect: "canonical-query",
  },
  {
    id: 3,
    name: "duplicate a title",
    file: "docs/swiftui.html",
    mutate: (s) => s.replace(/<title>[^<]*<\/title>/, "<title>Flutter component library and design tokens — KinetixUI</title>"),
    expect: "title-duplicate",
  },
  {
    id: 4,
    name: "add a second <h1>",
    file: "docs/tokens.html",
    mutate: (s) => s.replace("</main>", "<h1>Design tokens</h1></main>"),
    expect: "h1-count",
  },
  {
    id: 5,
    name: "put a filter URL into the sitemap",
    file: "sitemap.xml.body",
    mutate: (s) => s.replace("</urlset>", "<url>\n<loc>https://kinetixui.com/components?filter=Overlays</loc>\n</url>\n</urlset>"),
    expect: "sitemap-bad-url",
  },
  {
    id: 6,
    name: "break an internal link",
    file: "docs/installation.html",
    mutate: (s) => s.replace('href="/docs/platforms"', 'href="/docs/platform-coverage"'),
    expect: "link-broken",
  },
  {
    id: 7,
    name: "invalid JSON-LD",
    file: "docs/components/select.html",
    mutate: (s) => s.replace('{"@context":"https://schema.org","@type":"BreadcrumbList"', '{"@context":"https://schema.org","@type":"BreadcrumbList",,'),
    expect: "jsonld-invalid",
  },
  {
    id: 8,
    name: "remove a component page from the sitemap",
    file: "sitemap.xml.body",
    mutate: (s) => s.replace(/<url>\s*<loc>https:\/\/kinetixui\.com\/docs\/components\/tabs<\/loc>\s*<\/url>\s*/, ""),
    expect: "sitemap-omits",
  },
  {
    id: 9,
    name: "add noindex to /components",
    file: "components.html",
    mutate: (s) => s.replace('<meta name="robots" content="index, follow"/>', '<meta name="robots" content="noindex, follow"/>'),
    // a noindex page drops out of the indexable set, so the gate sees it from both sides
    expect: "noindex-important",
  },
  {
    id: 10,
    name: "use a nonexistent OG image",
    file: "docs/rtl.html",
    mutate: (s) => s.replace('<meta property="og:image" content="https://kinetixui.com/opengraph-image"/>', '<meta property="og:image" content="https://kinetixui.com/og/rtl.png"/>'),
    expect: "og-image",
  },
  {
    id: 11,
    name: "breadcrumb JSON-LD disagrees with the visible trail",
    file: "docs/components/tabs.html",
    mutate: (s) => s.replace('"name":"Components","item":"https://kinetixui.com/components"', '"name":"Library","item":"https://kinetixui.com/components"'),
    expect: "breadcrumb-mismatch",
  },
  {
    id: 12,
    name: "component title without a platform",
    file: "docs/components/badge.html",
    mutate: (s) => s.replace(/<title>[^<]*<\/title>/, "<title>Badge — KinetixUI</title>"),
    expect: "component-title",
  },
  {
    id: 13,
    name: "orphan a page (drop the only link to the Building Operations demo)",
    file: "iot.html",
    mutate: (s) => s.replaceAll('href="/demos/building-operations', 'href="/iot#environments'),
    expect: "orphan",
  },
  {
    id: 14,
    name: "drop the Related components links from a component page",
    file: "docs/components/slider.html",
    mutate: (s) => s.replace(/data-related-components="true"/, 'data-related-components-removed="true"'),
    expect: "component-related",
  },
  {
    id: 15,
    name: "canonical on a look-alike host (the origin as a prefix of another host)",
    file: "docs/rtl.html",
    mutate: (s) => s.replace('href="https://kinetixui.com/docs/rtl"/>', 'href="https://kinetixui.com.evil.example/docs/rtl"/>'),
    expect: "canonical-host",
  },
];

function runGate() {
  try {
    return { code: 0, out: execFileSync("node", ["scripts/check-seo.mjs", "--all"], { encoding: "utf8" }) };
  } catch (e) {
    return { code: e.status, out: String(e.stdout) };
  }
}

const baseline = runGate();
if (baseline.code !== 0) {
  console.error("seo negative controls: the gate is not green on the unmodified build — fix that first.\n" + baseline.out);
  process.exit(2);
}

const results = [];
for (const c of CONTROLS) {
  const file = join(APP, c.file);
  const original = readFileSync(file);
  const before = sha(file);
  const mutated = c.mutate(original.toString("utf8"));
  if (mutated === original.toString("utf8")) {
    results.push({ ...c, ok: false, why: "mutation did not apply (pattern not found)" });
    continue;
  }
  writeFileSync(file, mutated);
  const { code, out } = runGate();
  writeFileSync(file, original);
  const restored = sha(file) === before;
  const caught = code === 1 && out.includes(`[${c.expect}]`);
  results.push({ ...c, ok: caught && restored, caught, restored, hash: before.slice(0, 12) });
}

const after = runGate();
for (const r of results) {
  console.log(
    `${r.ok ? "✓" : "✗"} NC-${String(r.id).padStart(2, "0")} ${r.name} → ${r.caught ? `caught by ${r.expect}` : r.why ?? "NOT CAUGHT"}; restored ${r.restored ? `sha256 ${r.hash}… matches` : "MISMATCH"}`,
  );
}
console.log(`gate after all controls: ${after.code === 0 ? "green" : "RED"}`);
if (results.some((r) => !r.ok) || after.code !== 0) process.exit(1);
