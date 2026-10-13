import { describe, expect, it } from "vitest";
import blocksManifest from "../../../../blocks.manifest.json";
import componentManifest from "../../../../components.manifest.json";
import capabilities from "../../../../docs/business-capabilities.json";
import { buildDiscovery } from "../../../../scripts/business-discovery.mjs";
import {
  BLOCK_DISCOVERY,
  BUSINESS_NEEDS,
  CAPABILITIES,
  COMPONENT_DISCOVERY,
  DISCOVERY_ROUTES,
  DOMAINS,
  ROWS,
  UNCLASSIFIED,
  WORKFLOWS,
  businessContextFor,
  catalogueFacets,
  ships,
} from "./business-discovery";
import { blocks } from "./blocks";
import { publicRoutes } from "./seo";
import { componentDocs } from "./site";

const SLUGS = new Set(componentDocs.map((c) => c.href.split("/").pop()!));
const BLOCKS = new Set(blocks.map((b) => b.slug));

describe("business discovery index", () => {
  it("covers exactly the catalogue and the blocks, so a new component or block cannot be left out", () => {
    expect(new Set(Object.keys(COMPONENT_DISCOVERY))).toEqual(SLUGS);
    expect(new Set(Object.keys(BLOCK_DISCOVERY))).toEqual(BLOCKS);
  });

  it("only ever links real components and blocks, and only from rows that ship", () => {
    for (const row of Object.values(ROWS)) {
      for (const s of row.components) expect(SLUGS.has(s), `${row.name} → ${s}`).toBe(true);
      for (const b of row.blocks) expect(BLOCKS.has(b), `${row.name} → ${b}`).toBe(true);
      if (!ships(row)) expect([...row.components, ...row.blocks, ...row.iot], `${row.name} is planned`).toEqual([]);
    }
    for (const group of [...CAPABILITIES, ...DOMAINS])
      for (const s of group.components) expect(SLUGS.has(s), `${group.id} → ${s}`).toBe(true);
  });

  it("never carries a Pro-candidate row onto the website", () => {
    const rows = (capabilities.families as { capabilities: { name: string; tier: string }[] }[]).flatMap((f) => f.capabilities);
    const pro = rows.filter((r) => r.tier === "pro");
    expect(pro.length).toBeGreaterThan(0);
    for (const r of pro) expect(ROWS[r.name], r.name).toBeUndefined();
    expect(JSON.stringify(COMPONENT_DISCOVERY)).not.toMatch(/pro-candidate/);
  });

  it("offers a business need only when something in it ships", () => {
    const ids = BUSINESS_NEEDS.map((d) => d.id);
    expect(ids).toEqual(expect.arrayContaining(["commerce", "travel-booking", "finance", "iot"]));
    // planned end to end today: listing them would be a list of promises
    expect(ids).not.toContain("healthcare");
    expect(ids).not.toContain("logistics");
  });

  it("puts every discovery page in the sitemap's route list", () => {
    const routes = new Set(publicRoutes());
    expect(DISCOVERY_ROUTES).toContain("/capabilities");
    for (const r of DISCOVERY_ROUTES) expect(routes.has(r), r).toBe(true);
  });

  it("references only workflows and domains that exist", () => {
    const wf = new Set(WORKFLOWS.map((w) => w.id));
    const dom = new Set(DOMAINS.map((d) => d.id));
    for (const [slug, e] of Object.entries(COMPONENT_DISCOVERY)) {
      for (const w of e.workflows) expect(wf.has(w), `${slug} → ${w}`).toBe(true);
      for (const d of e.domains) expect(dom.has(d), `${slug} → ${d}`).toBe(true);
    }
    for (const w of WORKFLOWS) for (const s of w.stages) for (const r of s.rows) expect(ROWS[r], `${w.id} → ${r}`).toBeDefined();
  });
});

describe("relationships derived for a component", () => {
  it("places PriceBreakdown in the workflows and domains that use it, with what is planned on top of it", () => {
    const ctx = businessContextFor("price-breakdown")!;
    expect(ctx.layer).toBe("Enterprise");
    expect(ctx.capabilities.map((c) => c.id)).toEqual(["transactions"]);
    expect(ctx.domains.map((d) => d.id).sort()).toEqual(["commerce", "finance", "travel-booking"]);
    expect(ctx.workflows.map((w) => w.id).sort()).toEqual(["checkout", "flight-booking", "money-transfer"]);
    expect(ctx.buildsToward).not.toContain("Receipt");
    expect(ROWS.Receipt.status).toBe("existing");
    expect(ROWS.Receipt.blocks).toEqual(["receipt"]);
    expect(BLOCK_DISCOVERY.receipt.workflows).toContain("checkout");
    // a domain with a page links to the workflow on it; one without stays plain text
    expect(ctx.workflows.find((w) => w.id === "checkout")!.href).toBe("/use-cases/commerce#checkout");
    expect(ctx.workflows.find((w) => w.id === "money-transfer")!.href).toBeUndefined();
  });

  it("says nothing for a component with no classification and no business context", () => {
    expect(businessContextFor("accordion")).toBeNull();
  });

  it("classifies a component by the roadmap row that is it, and only that row", () => {
    expect(COMPONENT_DISCOVERY["data-grid"]!.layer).toBe("L2");
    expect(COMPONENT_DISCOVERY["data-grid"]!.target).toBe("web-first-enterprise");
    // an explicit L1 row is kept as L1
    expect(COMPONENT_DISCOVERY["calendar"]!.layer).toBe("L1");
    expect(COMPONENT_DISCOVERY["calendar"]!.target).toBe("cross-platform-core");
    // cited by partial L2 rows (CartQuantity, PercentageInput) but not one of them: unclassified, not L1
    expect(COMPONENT_DISCOVERY["number-input"]!.layer).toBe(UNCLASSIFIED);
    expect(COMPONENT_DISCOVERY["number-input"]!.target).toBe(UNCLASSIFIED);
    expect(COMPONENT_DISCOVERY["number-input"]!.capabilities.length).toBeGreaterThan(0);
  });

  it("never turns a missing classification into Core / L1 (regression)", () => {
    // a manifest component no roadmap row names, run through the real generator
    const manifest = { ...componentManifest.components, "zz-unmatched-widget": {} } as Record<string, unknown>;
    const { index, errors } = buildDiscovery(capabilities, manifest, blocksManifest.blocks);
    expect(errors).toEqual([]);
    const entry = (index as { components: Record<string, { layer: string; target: string }> }).components["zz-unmatched-widget"]!;
    expect(entry.layer).toBe("unclassified");
    expect(entry.target).toBe("unclassified");
    expect(entry.layer).not.toBe("L1");
    expect(entry.target).not.toBe("cross-platform-core");
    // and the site neither labels it Core nor says anything about its layer
    for (const [slug, e] of Object.entries(COMPONENT_DISCOVERY).filter(([, e]) => e.layer === UNCLASSIFIED)) {
      expect(businessContextFor(slug)?.layer, slug).toBeUndefined();
      expect(businessContextFor(slug)?.target, slug).toBeUndefined();
      expect(e.target, slug).toBe(UNCLASSIFIED);
    }
  });
});

describe("catalogue facets", () => {
  const facets = catalogueFacets();

  it("offers no option that would filter the catalogue to nothing", () => {
    for (const o of facets.capabilities)
      expect(Object.values(facets.bySlug).some((b) => b.capabilities.includes(o.id)), o.id).toBe(true);
    for (const o of facets.domains) expect(Object.values(facets.bySlug).some((b) => b.domains.includes(o.id)), o.id).toBe(true);
    expect(facets.domains.map((d) => d.id)).not.toContain("healthcare");
  });

  it("does not offer unclassified as a layer filter", () => {
    expect(facets.layers.map((l) => l.id)).not.toContain(UNCLASSIFIED);
    expect(facets.layers.map((l) => l.id)).toEqual(["L1", "L2"]);
  });

  it("lets a search for the job find the part", () => {
    expect(facets.bySlug["price-breakdown"]!.terms).toContain("checkout");
    expect(facets.bySlug["pass-card"]!.terms).toContain("flight booking");
  });
});
