import { describe, expect, it } from "vitest";
import { searchProjection } from "./search-projection";
import { blocks } from "./blocks";
import { CAPABILITIES, DOMAINS, WORKFLOWS } from "./business-discovery";
import { publicRoutes } from "./seo";
import { allDocsLinks, componentDocs, mainNav } from "./site";

const ROUTES = new Set(publicRoutes());
const p = searchProjection();

describe("search projection (/search-index.json)", () => {
  it("lists exactly the published blocks, each at its anchor on /blocks", () => {
    const published = blocks.filter((b) => (b.status as string) !== "draft");
    expect(p.blocks.map((e) => e.id)).toEqual(published.map((b) => `block:${b.slug}`));
    for (const e of p.blocks) expect(e.href).toMatch(/^\/blocks#[a-z0-9-]+$/);
  });

  it("offers a use case only where a page exists, and every destination is a real route", () => {
    for (const e of [...p.blocks, ...p.useCases]) expect(ROUTES.has(e.href.split("#")[0]!), e.href).toBe(true);
    const domainEntries = p.useCases.filter((e) => e.type === "use-case" && e.id !== "use-case:hub");
    expect(domainEntries.map((e) => e.id.slice("use-case:".length)).sort()).toEqual(DOMAINS.filter((d) => d.page).map((d) => d.id).sort());
    for (const d of DOMAINS.filter((x) => !x.page)) expect(p.useCases.some((e) => e.href.startsWith(`/use-cases/${d.id}`)), d.id).toBe(false);
  });

  it("links a workflow only to its section on a published page, and a capability only to a section the hub renders", () => {
    const workflows = p.useCases.filter((e) => e.type === "workflow");
    expect(workflows.map((e) => e.href).sort()).toEqual(
      WORKFLOWS.filter((w) => DOMAINS.find((d) => d.id === w.domain)!.page)
        .map((w) => `/use-cases/${w.domain}#${w.id}`)
        .sort(),
    );
    // money-transfer and device-pairing belong to domains with no page: not offered
    expect(workflows.map((e) => e.id)).not.toContain("workflow:device-pairing");
    const caps = p.useCases.filter((e) => e.type === "capability");
    expect(caps.map((e) => e.href).sort()).toEqual(
      CAPABILITIES.filter((c) => c.counts.existing + c.counts.partial > 0)
        .map((c) => `/capabilities#${c.id}`)
        .sort(),
    );
  });

  it("never repeats a destination the menu already has", () => {
    // (the menu's own Links and docs groups already share /docs; that pre-dates this projection and is left alone)
    const existing = new Set([...mainNav.map((i) => i.href), ...allDocsLinks.map((i) => i.href)]);
    const added = [...p.blocks.map((e) => e.href), ...p.useCases.map((e) => e.href)];
    expect(added.filter((h) => existing.has(h))).toEqual([]);
    expect(new Set(added).size).toBe(added.length);
  });

  it("has unique ids", () => {
    const ids = [...p.blocks, ...p.useCases].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives components their business context, but only from rows that ship", () => {
    expect(Object.keys(p.componentKeywords).sort()).toEqual(componentDocs.map((c) => c.href).sort());
    expect(p.componentKeywords["/docs/components/price-breakdown"]).toEqual(expect.arrayContaining(["checkout", "transactions & money"]));
    // Checkout (the planned row) never makes a component findable as "checkout" through dependsOn alone
    expect(p.componentKeywords["/docs/components/stepper"]!.join(" ")).not.toMatch(/checkout/);
  });

  it("stays small: it is fetched on the first open of the menu", () => {
    expect(JSON.stringify(p).length).toBeLessThan(40_000);
  });
});

/**
 * The projection's contract as one validator, so the negative controls below can prove each rule is enforced: a
 * destination must be a built route (and for a block, a published one), a use-case page must be one the discovery data
 * publishes, and ids and URLs must be unique.
 */
function problems(proj: typeof p): string[] {
  const out: string[] = [];
  const published = new Set(blocks.filter((b) => (b.status as string) !== "draft").map((b) => b.slug));
  const pages = new Set(DOMAINS.filter((d) => d.page).map((d) => `/use-cases/${d.id}`));
  const all = [...proj.blocks, ...proj.useCases];
  for (const e of all) {
    let url: URL;
    try {
      url = new URL(e.href, "https://kinetixui.com");
    } catch {
      out.push(`${e.id}: unparsable href`);
      continue;
    }
    if (!e.href.startsWith("/") || url.origin !== "https://kinetixui.com") out.push(`${e.id}: not a site path`);
    if (!ROUTES.has(url.pathname)) out.push(`${e.id}: ${url.pathname} is not a route`);
    if (url.pathname.startsWith("/use-cases/") && !pages.has(url.pathname)) out.push(`${e.id}: ${url.pathname} is not a published use case`);
    if (e.type === "block" && !published.has(url.hash.slice(1))) out.push(`${e.id}: not a published block`);
  }
  const ids = all.map((e) => e.id);
  if (new Set(ids).size !== ids.length) out.push("duplicate id");
  const hrefs = all.map((e) => e.href);
  if (new Set(hrefs).size !== hrefs.length) out.push("duplicate href");
  return out;
}

describe("search projection contract and its negative controls", () => {
  const entry = (over: Partial<(typeof p.useCases)[number]>) => ({ ...p.useCases[0]!, ...over });

  it("holds for the committed data", () => {
    expect(problems(p)).toEqual([]);
  });
  it("catches an unpublished use-case route entering the index", () => {
    expect(problems({ ...p, useCases: [...p.useCases, entry({ id: "use-case:healthcare", href: "/use-cases/healthcare" })] }).join()).toMatch(
      /use-case:healthcare: \/use-cases\/healthcare is not a route/,
    );
  });
  it("catches a draft block", () => {
    const draft = { ...p.blocks[0]!, id: "block:unfinished", href: "/blocks#unfinished" };
    expect(problems({ ...p, blocks: [...p.blocks, draft] }).join()).toMatch(/block:unfinished: not a published block/);
  });
  it("catches an invalid destination URL", () => {
    expect(problems({ ...p, useCases: [...p.useCases, entry({ id: "use-case:x", href: "/use-case/commerce" })] }).join()).toMatch(/is not a route/);
    expect(problems({ ...p, useCases: [...p.useCases, entry({ id: "use-case:y", href: "https://example.com/" })] }).join()).toMatch(/not a site path/);
  });
  it("catches a duplicate", () => {
    expect(problems({ ...p, blocks: [...p.blocks, p.blocks[0]!] })).toEqual(expect.arrayContaining(["duplicate id", "duplicate href"]));
  });
});
