import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BOILERPLATE, COMPONENT_EDITORIAL, editorialWordCount } from "./component-editorial";
import { componentDescription, componentMetadata, componentName } from "./seo";
import { componentDocs } from "./site";

const SLUGS = componentDocs.map((i) => i.href.split("/").pop()!);
const PAGE_DIR = join(__dirname, "../app/docs/components");
const page = (slug: string) => readFileSync(join(PAGE_DIR, slug, "page.mdx"), "utf8");
const entries = Object.entries(COMPONENT_EDITORIAL);

const allText = (slug: string) => {
  const e = COMPONENT_EDITORIAL[slug]!;
  return [e.summary, ...e.useWhen, ...(e.instead ?? []).map((a) => a.when), e.accessibility ?? ""];
};

describe("component editorial copy", () => {
  /*
   * The set is bounded at both ends on purpose. The ceiling stops it growing into all 109 pages, which is
   * more hand-written copy than anyone will keep true; the floor stops a batch being quietly undone. They
   * are equal because coverage moves in approved batches, not by drift: raising the ceiling is an owner
   * decision, and the batch that fills it raises the floor in the same change. 20 -> 30 was approved on
   * 2026-10-24 and delivered as the ten selection and waiting-state entries.
   */
  it("covers exactly the approved number of pages, not all of them", () => {
    expect(entries.length).toBeGreaterThanOrEqual(30);
    expect(entries.length).toBeLessThanOrEqual(30);
  });

  it("keeps every entry between 80 and 180 words", () => {
    for (const [slug, e] of entries) {
      const words = editorialWordCount(e);
      expect(words, `${slug}: ${words} words`).toBeGreaterThanOrEqual(80);
      expect(words, `${slug}: ${words} words`).toBeLessThanOrEqual(180);
    }
  });

  it("uses no stock phrases or unsupported claims", () => {
    for (const [slug] of entries)
      for (const line of allText(slug))
        for (const re of BOILERPLATE) expect(re.test(line), `${slug}: "${line}" matches ${re}`).toBe(false);
  });

  it("opens with the component's own name and stays plain text", () => {
    for (const [slug, e] of entries) {
      expect(e.summary.startsWith(componentName(slug)), `${slug}: "${e.summary}"`).toBe(true);
      for (const line of allText(slug)) expect(line, slug).not.toMatch(/[`<>*_[\]]/);
    }
  });

  it("offers alternatives that are real, distinct component pages", () => {
    for (const [slug, e] of entries) {
      expect(SLUGS, slug).toContain(slug);
      expect(e.useWhen.length, slug).toBeGreaterThanOrEqual(2);
      const alts = (e.instead ?? []).map((a) => a.slug);
      expect(new Set(alts).size, slug).toBe(alts.length);
      for (const a of alts) {
        expect(SLUGS, `${slug} → ${a}`).toContain(a);
        expect(a).not.toBe(slug);
      }
    }
  });

  it("is rendered by exactly the pages that have an entry, and those pages take their description from it", () => {
    for (const slug of SLUGS) {
      const src = page(slug);
      const has = slug in COMPONENT_EDITORIAL;
      expect(src.includes(`<ComponentIntro slug="${slug}" />`), `${slug} intro`).toBe(has);
      expect(src.includes(`<ComponentGuide slug="${slug}" />`), `${slug} guide`).toBe(has);
      if (has) {
        expect(src, slug).toContain(`componentMetadata("${slug}")`);
        expect(componentMetadata(slug).description).toBe(componentDescription(slug, COMPONENT_EDITORIAL[slug]!.summary));
      }
    }
  });

  it("refuses a summary argument that would compete with the editorial one", () => {
    expect(() => componentMetadata("dialog", "A window overlaid on the page.")).toThrow(/editorial/);
    expect(() => componentMetadata("button")).toThrow(/no summary/);
  });
});
