// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../../../../components.manifest.json";
import { componentName } from "../components/foundations-tables";
import { PLATFORMS, countOnPlatform } from "./platform-parity";
import { componentTotal, gaps, nonPorts, platformCount } from "./platform-support";

/**
 * Platform coverage has one source of truth: components.manifest.json. These tests exist because prose
 * ("90 composables", "bar seven non-ports", "all four platforms are at parity") kept being typed by hand and
 * then drifting as components were added. They do two things: check that the derived numbers agree with the
 * manifest, and fail if a hand-typed count comes back.
 */

const root = join(process.cwd(), "../..");
const components = manifest.components as Record<string, { platforms: string[] }>;
const slugs = Object.keys(components);
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("derived platform numbers", () => {
  it.each(["React", "SwiftUI", "Compose", "Flutter"])("%s count equals the manifest", (platform) => {
    const expected = slugs.filter((s) => components[s]!.platforms.includes(platform)).length;
    expect(platformCount(platform)).toBe(expected);
  });

  it("agrees with the generated platform-parity data the gallery and CLI read", () => {
    for (const p of PLATFORMS) expect(countOnPlatform(slugs, p)).toBe(platformCount(p));
  });

  it("uses the manifest total, which includes components with no page of their own (avatar-group)", () => {
    expect(componentTotal).toBe(slugs.length);
  });
});

describe("standing non-ports", () => {
  it("are exactly the components on no native platform", () => {
    expect(nonPorts.length).toBeGreaterThan(0);
    for (const slug of nonPorts) {
      for (const native of ["SwiftUI", "Compose", "Flutter"]) expect(components[slug]!.platforms).not.toContain(native);
    }
    // ...and nothing else is: every other component is on at least one native platform
    for (const slug of slugs.filter((s) => !nonPorts.includes(s))) {
      expect(components[slug]!.platforms.some((p) => p !== "React")).toBe(true);
    }
  });

  it("are a subset of the gaps table, which also carries partial gaps like chart on Compose", () => {
    const gapSlugs = gaps.map((g) => g.slug);
    for (const slug of nonPorts) expect(gapSlugs).toContain(slug);
  });

  const expected = () => nonPorts.map(componentName).sort();

  it("match the rows of the table on /docs/contributing", () => {
    const section = read("apps/web/src/app/docs/contributing/page.mdx").split("### The standing non-ports")[1]!.split("\n## ")[0]!;
    const listed = [...section.matchAll(/^\| `([A-Za-z]+)` \|/gm)].map((m) => m[1]!).sort();
    expect(listed).toEqual(expected());
  });

  it.each(["swiftui", "flutter"])("match the 'Not ported' list on /docs/%s", (page) => {
    const section = read(`apps/web/src/app/docs/${page}/page.mdx`).split("## Not ported (deliberate)")[1]!.split("\n## ")[0]!;
    const listed = [...section.matchAll(/^- \*\*`([A-Za-z]+)`\*\*/gm)].map((m) => m[1]!).sort();
    expect(listed).toEqual(expected());
  });
});

/** Every file whose prose could state a coverage count. */
function proseFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string, keep: (name: string) => boolean, skip: (rel: string) => boolean) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const rel = relative(root, full).split(sep).join("/");
      if (skip(rel)) continue;
      if (statSync(full).isDirectory()) walk(full, keep, skip);
      else if (keep(name)) out.push(rel);
    }
  };
  // docs pages and site UI. The per-component pages and release history are generated / dated records.
  walk(
    join(root, "apps/web/src/app"),
    (n) => /\.(mdx|tsx)$/.test(n),
    (rel) => rel.startsWith("apps/web/src/app/docs/components/") || rel.endsWith("docs/changelog/page.tsx"),
  );
  walk(join(root, "apps/web/src/components"), (n) => n.endsWith(".tsx") && !n.includes(".test."), () => false);
  out.push("README.md", "packages/ui-compose/README.md", "packages/ui-swiftui/README.md", "packages/ui-flutter/README.md");
  return out;
}

const NUMBER_WORDS = "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|sixty-nine|seventy";

describe("no hand-typed coverage counts", () => {
  const files = proseFiles();

  it("scans a meaningful set of files", () => {
    expect(files.length).toBeGreaterThan(30);
    for (const f of ["apps/web/src/app/docs/compose/page.mdx", "apps/web/src/app/docs/contributing/page.mdx", "README.md"]) {
      expect(files).toContain(f);
    }
  });

  const patterns: [string, RegExp][] = [
    // "90 Kinetix* composables", "All 89", "97 components", "72 React components"
    ["a number followed by components/composables/views/widgets", /\b\d{2,3}\b(?: `?Kinetix\*`?| React| native| [A-Za-z]+)? (?:components?|composables|views|widgets)\b/],
    ["'All <n>'", /\bAll \d{2,3}\b/],
    ["a count of non-ports", new RegExp(`\\b(?:${NUMBER_WORDS}) (?:standing |deliberate )?non-ports?\\b`, "i")],
    ["'bar <n> deliberate non-ports'", new RegExp(`\\bbar (?:${NUMBER_WORDS})\\b`, "i")],
    ["'<n> of <m>' components/files", /\b\d{2,3} of \d{2,3}\b[^.]{0,40}(?:components|files)/],
    ["an approximate '~<n> components'", /~\d{2,3}\b[^.]{0,20}(?:components|widgets|views)/],
    // "All four platforms are at parity" is not literally true: Compose has no Chart and several ports are scoped down
    ["a blanket parity claim", /\b(?:are|is) at parity\b/i],
  ];

  // Match against whitespace-collapsed text so a claim wrapped across lines ("[seven standing\nnon-ports]") is still seen.
  const flat = (f: string) => read(f).replace(/\s+/g, " ");

  it.each(patterns)("finds no %s", (_name, re) => {
    const hits = files.flatMap((f) => {
      const text = flat(f);
      const m = re.exec(text);
      return m ? [`${f}: …${text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30)}…`] : [];
    });
    expect(hits).toEqual([]);
  });
});
