// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { highlight } from "@/lib/highlight";
import { CATALOGUE_VERIFICATION, PLATFORM_DEFINITIONS, PLATFORMS } from "@/lib/platform-parity";
import { componentTotal, platformCount } from "@/lib/platform-support";
import { platformEvidence, STORY_COMPONENT, systemsInMotion } from "@/lib/systems-in-motion";
import { repoRoot } from "@/lib/token-evidence";
import { HeroSystemMap } from "./hero-system-map";

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

  it("follows a component every platform implements", () => {
    for (const p of story.platforms) expect(p.component.verification).not.toBeNull();
    expect(STORY_COMPONENT).toBe("switch");
  });
});

describe("systems in motion: no hard-coded truth", () => {
  const sources = [
    "components/systems/hero-system-map.tsx",
    "components/systems/implementation-explorer.tsx",
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
  const html = renderToStaticMarkup(<HeroSystemMap {...mapProps()} />);

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

  it("has no theme switch of its own: the header's toggle is the only one", () => {
    expect(html).not.toMatch(/aria-pressed=/);
    expect(html).not.toMatch(/Token value to show/);
  });
});

describe("systems in motion: reduced motion and transparency", () => {
  const css = read("app/globals.css");
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));

  it("stops every moving part of the map under reduced motion", () => {
    for (const cls of [".kx-trace", ".kx-map-stage", ".kx-swap"]) expect(reduced).toContain(cls);
    expect(reduced).toMatch(/\.kx-trace-pulse[^{]*\{[^}]*display:\s*none/);
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
