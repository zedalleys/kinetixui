// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { highlight } from "@/lib/highlight";
import { CATALOGUE_VERIFICATION, PLATFORM_DEFINITIONS, PLATFORMS } from "@/lib/platform-parity";
import { componentTotal, platformCount } from "@/lib/platform-support";
import { platformEvidence, STORY_COMPONENT, systemsInMotion } from "@/lib/systems-in-motion";
import { breakable } from "./breakable";
import { repoRoot } from "@/lib/token-evidence";
import { ExplorerPanel, toRuns } from "./explorer-panel";
import { HeroSystemMap } from "./hero-system-map";
import { ImplementationExplorer } from "./implementation-explorer";

/**
 * The homepage's system visuals (hero map, token pipeline, implementation explorer, evidence columns) draw
 * every label from the repository. These tests hold them to that: the data comes from the manifest and real
 * source, Angular is never shown as stable, decorative traces carry no meaning and take no focus, reduced
 * motion stops every moving part, and the copy never says components are generated.
 */

const root = repoRoot();
const web = join(root, "apps/web/src");
const read = (p: string) => readFileSync(join(web, p), "utf8");
const story = systemsInMotion();

const mapProps = () => ({
  token: story.token,
  outputs: story.outputs,
  platforms: story.platforms.map((p) => ({
    platform: p.platform,
    label: p.label,
    short: p.short,
    maturity: p.maturity,
    entries: p.entries,
    total: p.total,
    distribution: p.distribution,
    output: p.output,
    reads: p.component.reads,
    href: p.href,
  })),
});

describe("systems in motion: data", () => {
  it("covers exactly the manifest's platforms, in manifest order", () => {
    expect(story.platforms.map((p) => p.platform)).toEqual([...PLATFORMS]);
  });

  it("takes every count and maturity from the manifest", () => {
    for (const p of story.platforms) {
      const def = PLATFORM_DEFINITIONS[p.platform];
      expect(p.maturity).toBe(def.maturity);
      expect(p.catalogComplete).toBe(def.catalogComplete);
      expect(p.entries).toBe(platformCount(p.platform));
      expect(p.total).toBe(componentTotal);
      expect(p.published).toBe(def.distribution.published);
    }
  });

  it("never shows Angular as stable while the manifest says preview", () => {
    const angular = story.platforms.find((p) => p.platform === "Angular")!;
    expect(PLATFORM_DEFINITIONS.Angular.maturity).not.toBe("stable");
    expect(angular.maturity).toBe(PLATFORM_DEFINITIONS.Angular.maturity);
    expect(platformEvidence().find((p) => p.platform === "Angular")!.maturity).toBe(PLATFORM_DEFINITIONS.Angular.maturity);
  });

  it("names a reads line that really is that line of that file, inside the platform's own package", () => {
    for (const p of story.platforms) {
      const { file, line, code } = p.component.reads;
      expect(file.startsWith(PLATFORM_DEFINITIONS[p.platform].dir + "/")).toBe(true);
      const lines = readFileSync(join(root, file), "utf8").split("\n");
      expect(lines[line - 1]!.trim()).toBe(code);
      for (const f of p.component.files) {
        const all = readFileSync(join(root, f.file), "utf8").split("\n");
        expect(f.text).toBe(all.slice(f.firstLine - 1, f.lastLine).join("\n"));
        expect(f.readsToken.length).toBeGreaterThanOrEqual(0);
      }
      expect(p.component.files.some((f) => f.readsToken.length > 0)).toBe(true);
    }
  });

  it("only quotes generated declarations that exist in the generated file it names, per theme", () => {
    for (const o of story.outputs) {
      for (const theme of ["light", "dark"] as const) {
        expect(readFileSync(join(root, o.files[theme]), "utf8"), `${o.id} ${theme}`).toContain(o.declaration[theme]);
      }
      expect(o.platforms.length).toBeGreaterThan(0);
    }
  });

  it("reports evidence as fractions of each platform's own entries, never above them", () => {
    for (const p of platformEvidence()) {
      expect(p.floor).toBe(CATALOGUE_VERIFICATION[p.platform]);
      for (const e of p.evidence) {
        expect(e.of).toBe(platformCount(p.platform));
        expect(e.count).toBeLessThanOrEqual(e.of);
      }
    }
  });

  it("shows a window around the token line, not the file: at most seven lines per excerpt, with real line numbers", () => {
    for (const p of story.platforms) {
      for (const f of p.component.files) {
        expect(f.lastLine - f.firstLine + 1, `${p.platform} ${f.file}`).toBeLessThanOrEqual(7);
        expect(f.text.split("\n")).toHaveLength(f.lastLine - f.firstLine + 1);
      }
      const hit = p.component.files.find((f) => f.readsToken.length > 0)!;
      expect(p.component.reads.line).toBeGreaterThanOrEqual(hit.firstLine);
      expect(p.component.reads.line).toBeLessThanOrEqual(hit.lastLine);
    }
  });

  it("orders the outputs by the platforms they feed, each feeding neighbours, so the map never crosses", () => {
    const order = story.outputs.flatMap((o) => o.platforms);
    expect(order).toEqual([...PLATFORMS]);
    expect(story.outputs.length).toBeLessThan(PLATFORMS.length);
  });

  it("follows a component every platform implements", () => {
    for (const p of story.platforms) expect(p.component.verification).not.toBeNull();
    expect(STORY_COMPONENT).toBe("switch");
  });
});

describe("systems in motion: no hard-coded truth", () => {
  const sources = [
    "components/systems/hero-system-map.tsx",
    "components/systems/implementation-explorer.tsx",
    "components/systems/explorer-tabs.tsx",
    "components/systems/evidence-columns.tsx",
    "components/systems/token-pipeline.tsx",
    "components/systems/component-spotlight.tsx",
  ];

  it("hard-codes no catalogue count, fraction or percentage", () => {
    for (const s of sources) {
      const text = read(s).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(text, s).not.toMatch(/["'`>]\s*\d+\s*(\/|of)\s*\d+/);
      expect(text, s).not.toMatch(/\b\d{2,3}\s*%/);
      expect(text, s).not.toMatch(/["'`]\s*(97|98|90|76)\b/);
    }
  });

  it("names no platform the manifest does not have", () => {
    const html = renderToStaticMarkup(<HeroSystemMap {...mapProps()} />);
    const tabs = [...html.matchAll(/role="tab"[^>]*data-platform="([^"]+)"/g)].map((m) => m[1]);
    if (tabs.length) expect(tabs).toEqual([...PLATFORMS]);
    for (const name of ["Vue", "Svelte", "React Native", "Xamarin", ".NET MAUI"]) expect(html).not.toContain(name);
  });

  it("claims nothing live, passing or all-green", () => {
    const page = read("app/page.tsx");
    for (const s of [page, ...sources.map(read)]) {
      expect(s).not.toMatch(/all (five|5) platforms passing/i);
      expect(s).not.toMatch(/>\s*live\s*</i);
      expect(s).not.toMatch(/\b100% (parity|coverage)\b/i);
    }
  });

  it("never says the components are generated", () => {
    const page = read("app/page.tsx");
    const html = renderToStaticMarkup(<HeroSystemMap {...mapProps()} />);
    for (const s of [page, html]) {
      expect(s).not.toMatch(/components (are|get|were) generated/i);
      expect(s).not.toMatch(/generated components/i);
      expect(s).not.toMatch(/generates? (the |every |all )?components/i);
    }
    expect(html).toMatch(/Tokens generated/);
    expect(html).toMatch(/components written per platform/);
  });
});

describe("systems in motion: hero map semantics", () => {
  // `<wbr>` break opportunities inside paths are layout, not text
  const html = renderToStaticMarkup(<HeroSystemMap {...mapProps()} />).replace(/<wbr\/?>/g, "");

  it("keeps every trace and output chip decorative and unfocusable", () => {
    for (const m of html.matchAll(/<svg\b[^>]*>/g)) expect(m[0]).toMatch(/aria-hidden="true"/);
    expect(html).toMatch(/kx-map-outputs[^"]*"[^>]*|aria-hidden="true"[^>]*kx-map-outputs/);
    // nothing inside an aria-hidden subtree may take focus
    const hidden = [...html.matchAll(/<(\w+)[^>]*aria-hidden="true"[^>]*>/g)].map((m) => m[0]);
    for (const h of hidden) expect(h).not.toMatch(/tabindex="0"|<a |<button /);
  });

  it("carries its meaning in text, not in the trace", () => {
    for (const p of story.platforms) expect(html).toContain(p.short);
    // the open panel (the first platform) names the file and line its implementation reads the token on
    const first = story.platforms[0]!.component.reads;
    expect(html).toContain(`${first.file}:${first.line}`);
    expect(html).toContain(story.token.path);
    expect(html).toMatch(/<figcaption[^>]*class="sr-only"/);
  });

  it("exposes one tablist, one tab per platform, and states maturity in text", () => {
    expect(html.match(/role="tablist"/g)).toHaveLength(1);
    expect(html.match(/role="tab"/g)).toHaveLength(PLATFORMS.length);
    const at = html.indexOf('data-platform="Angular"');
    const angularTab = html.slice(at, html.indexOf("</button>", at));
    expect(angularTab.replace(/<[^>]+>/g, " ")).toContain(PLATFORM_DEFINITIONS.Angular.maturity);
  });

  it("puts every platform node in the keyboard order: real buttons, one roving tab stop", () => {
    const tabs = [...html.matchAll(/<(\w+)([^>]*role="tab"[^>]*)>/g)];
    expect(tabs).toHaveLength(PLATFORMS.length);
    for (const [, tag, attrs] of tabs) {
      expect(tag).toBe("button");
      expect(attrs).not.toMatch(/disabled/);
    }
    // Radix sets the roving tab stop on the client; nothing here may take a platform out of the tab order
    const src = read("components/systems/hero-system-map.tsx");
    const trigger = src.slice(src.indexOf("<Tabs.Trigger"), src.indexOf("</Tabs.Trigger>"));
    expect(trigger).not.toMatch(/tabIndex|disabled|aria-hidden/);
  });

  it("keeps the generated-output layer in the markup at every width: one structure, nothing hidden by breakpoint", () => {
    const outputs = /<div aria-hidden="true" class="([^"]*kx-map-outputs[^"]*)"/.exec(html);
    expect(outputs, "output layer").not.toBeNull();
    expect(outputs![1]).not.toMatch(/(^|\s)hidden(\s|$)/);
    expect(html.match(/data-output="/g)).toHaveLength(story.outputs.length);
    expect(html).toMatch(/Tokens generated/);
  });

  it("draws every hand-written branch dashed, at every width", () => {
    const src = read("components/systems/hero-system-map.tsx");
    const written = src.slice(src.indexOf("geometry.written.map((w) => ("), src.indexOf("{pulse > 0"));
    expect(written).toMatch(/data-kind="written"/);
    expect(written).not.toMatch(/data-kind=\{/);
  });

  it("follows the page's direction live, and turns the platform list vertical when it stacks", () => {
    for (const f of ["components/systems/hero-system-map.tsx", "components/systems/explorer-tabs.tsx"]) {
      const src = read(f);
      expect(src, f).toMatch(/useDocumentDirection\(\)/);
      expect(src, f).toMatch(/<Tabs(?:\.Root)?[\s\S]*?dir=\{dir\}/);
    }
    expect(read("components/systems/hero-system-map.tsx")).toMatch(/orientation=\{columns \? "horizontal" : "vertical"\}/);
  });

  it("sets quoted source on the type scale, never the 0.85em inline-code size (10.2px inside 12px text)", () => {
    for (const m of html.matchAll(/<code class="([^"]*)"/g)) expect(m[1]).toMatch(/\bkx-source\b.*\btext-body-sm\b/);
  });

  it("has no theme switch of its own: the header's toggle is the only one", () => {
    expect(html).not.toMatch(/aria-pressed=/);
    expect(html).not.toMatch(/Token value to show/);
  });
});

describe("systems in motion: reduced motion and transparency", () => {
  const css = read("app/globals.css");
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));

  it("stops every moving part of the map under reduced motion", () => {
    // the selectors of the rule that switches animation off, not just any mention later in the block
    const off = /([^{}]*)\{\s*animation:\s*none !important;\s*\}/.exec(reduced);
    expect(off, "a reduced-motion rule that stops animation").not.toBeNull();
    const selectors = off![1].split(",").map((x) => x.trim());
    for (const cls of [".kx-trace", ".kx-map-stage", ".kx-swap"]) expect(selectors).toContain(cls);
    expect(reduced).toMatch(/\.kx-trace-pulse[^{]*\{[^}]*display:\s*none/);
  });

  it("tours the platforms only with a remembered pause control, and never under reduced motion (WCAG 2.2.2)", () => {
    const src = read("components/systems/hero-system-map.tsx");
    expect(src).toMatch(/usePersistedPause\("kx-hero-tour"\)/);
    expect(src).toMatch(/prefers-reduced-motion: reduce/);
    expect(src).toMatch(/data-hero-tour=""[\s\S]*aria-pressed=/);
    expect(src).toMatch(/const touring = !reduced && !paused && !stopped/);
  });

  it("never loops a trace (WCAG 2.2.2)", () => {
    const traceRules = css.match(/\.kx-trace[^{]*\{[^}]*\}/g) ?? [];
    for (const r of traceRules) expect(r).not.toMatch(/infinite/);
  });

  it("gives glass an opaque fallback when blur is unsupported or transparency is reduced", () => {
    expect(css).toMatch(/@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)/);
    expect(css).toMatch(/prefers-reduced-transparency: reduce/);
  });

  it("derives new colours from tokens instead of hard-coding them", () => {
    const rules = css.match(/\.kx-(chapter|glow|glass|trace|map-stage|swap|code-line|tok)[^{]*\{[^}]*\}/g) ?? [];
    expect(rules.length).toBeGreaterThan(5);
    for (const r of rules) {
      expect(r).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(r).not.toMatch(/rgba?\(\s*\d/);
    }
  });
});

describe("systems in motion: weight and restraint", () => {
  it("renders the static visuals on the server: only the interactive shells are client components", () => {
    for (const f of ["implementation-explorer.tsx", "component-spotlight.tsx", "evidence-columns.tsx", "token-pipeline.tsx", "platform-marks.tsx"]) {
      expect(read(`components/systems/${f}`), f).not.toMatch(/^"use client"/);
    }
  });

  it("has exactly the intended client components: the two tab controllers, the trace layer and the defer mount", () => {
    const dir = join(web, "components/systems");
    const client = readdirSync(dir)
      .filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"))
      .filter((f) => /^\s*["']use client["']/.test(readFileSync(join(dir, f), "utf8")))
      .sort();
    expect(client).toEqual(["explorer-tabs.tsx", "hero-system-map.tsx", "mount-near.tsx", "trace-layer.tsx"]);
  });

  it("sends the explorer's first panel as markup and the other four as data, never as five rendered panels", () => {
    const explorer = story.platforms.map((p) => ({
      platform: p.platform,
      label: p.label,
      maturity: p.maturity,
      distribution: p.distribution,
      files: p.component.files,
      verification: p.component.verification,
      evidence: p.component.evidence,
    }));
    const html = renderToStaticMarkup(<ImplementationExplorer component="Switch" componentHref="/docs/components/switch" platforms={explorer} />);
    expect(html.match(/<pre\b/g)).toHaveLength(story.platforms[0]!.component.files.length);
    expect(html.match(/role="tab"/g)).toHaveLength(story.platforms.length);
    for (const p of story.platforms.slice(1)) {
      for (const f of p.component.files) expect(html, `${p.label} excerpt rendered before its tab is chosen`).not.toContain(f.file);
    }
  });

  it("renders an excerpt with one element per line, real line numbers and the token line marked", () => {
    const p = story.platforms[0]!;
    const f = p.component.files[0]!;
    const data = {
      label: p.label,
      maturity: p.maturity,
      distribution: p.distribution,
      verification: p.component.verification,
      evidence: "",
      files: [{ file: f.file, firstLine: f.firstLine, lastLine: f.lastLine, lines: toRuns(f.lines), reads: f.readsToken }],
    };
    const html = renderToStaticMarkup(<ExplorerPanel component="Switch" data={data} />);
    expect(html.match(/class="kx-ln"/g)).toHaveLength(f.lastLine - f.firstLine + 1);
    expect(html).toContain(`counter-reset:kx-line ${f.firstLine - 1}`);
    expect(html.match(/data-reads=""/g)).toHaveLength(f.readsToken.length);
    expect(html).toContain(`lines ${f.firstLine}–${f.lastLine}`);
  });

  it("compacts highlighted lines into runs without losing a character", () => {
    for (const p of story.platforms) {
      for (const f of p.component.files) {
        const text = toRuns(f.lines).map((line) => line.map((r) => (typeof r === "string" ? r : r[1])).join(""));
        expect(text.join("\n")).toBe(f.text);
      }
    }
  });

  it("keeps glass for the hero's layered surfaces only; flat information cards are opaque", () => {
    for (const f of ["evidence-columns.tsx", "token-pipeline.tsx", "implementation-explorer.tsx", "component-spotlight.tsx"]) {
      expect(read(`components/systems/${f}`), f).not.toMatch(/kx-glass/);
    }
    expect(read("components/systems/hero-system-map.tsx").match(/kx-glass/g)).toHaveLength(2);
  });

  it("never lets the headline hyphenate, and sizes it so its longest word fits its column", () => {
    const css = read("app/globals.css");
    const rules = css.match(/\.kx-hero-title\s*\{[^}]*\}/g) ?? [];
    expect(rules.length).toBeGreaterThan(1);
    expect(rules[0]).toMatch(/hyphens:\s*manual/);
    for (const r of rules) expect(r).toMatch(/font-size:\s*min\([^;]*cqi\)/);
    const page = read("app/page.tsx");
    const h1 = page.slice(page.indexOf("<h1"), page.indexOf(">", page.indexOf("<h1")));
    expect(h1).toMatch(/kx-hero-title/);
    expect(h1).not.toMatch(/hyphens-auto/);
  });

  it("breaks code references at their joints and camelCase words, never mid-word", () => {
    const html = renderToStaticMarkup(<>{breakable("KinetixColorScheme.action")}</>);
    expect(html).toBe("Kinetix<wbr/>Color<wbr/>Scheme<wbr/>.action");
  });
});

describe("highlight", () => {
  it("round-trips: tokens concatenate back to the source, line for line", () => {
    for (const p of story.platforms) {
      for (const f of p.component.files) {
        const lines = highlight(f.text, f.language);
        expect(lines.map((l) => l.map(([, t]) => t).join("")).join("\n")).toBe(f.text);
      }
    }
  });

  it("keeps block-comment state across lines", () => {
    const lines = highlight("/*\n const x = 1;\n*/\nconst y = 2;", "ts");
    expect(lines[1]!.every(([k]) => k === "comment")).toBe(true);
    expect(lines[3]!.some(([k, t]) => k === "keyword" && t === "const")).toBe(true);
  });
});

void React;
