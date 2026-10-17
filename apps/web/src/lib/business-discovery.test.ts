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
  blockFacets,
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

describe("block business metadata (BD-W2a)", () => {
  const unclassified = new Set(
    (capabilities.discovery as unknown as { unclassifiedBlocks: { block: string }[] }).unclassifiedBlocks.map((u) => u.block),
  );

  it("gives every published block a capability, or a written reason in unclassifiedBlocks — never both, never neither", () => {
    for (const b of blocks) {
      const cited = BLOCK_DISCOVERY[b.slug]!.capabilities.length > 0;
      expect(cited !== unclassified.has(b.slug), b.slug).toBe(true);
    }
  });

  it("does not let a generic block inherit a workflow through a domain-neutral row", () => {
    // FormSection is a stage of checkout and flight booking; a profile form is neither
    expect(BLOCK_DISCOVERY["profile-form"]!.workflows).toEqual([]);
    expect(BLOCK_DISCOVERY["profile-form"]!.domains).toEqual([]);
    expect(BLOCK_DISCOVERY["alert-stack"]!.domains).toEqual([]);
  });

  // Negative controls: each mutation of the canonical data must make the real generator fail.
  type Data = typeof capabilities & { discovery: { unclassifiedBlocks: { block: string; reason: string }[] } };
  const mutate = (fn: (d: Data) => void) => {
    const d = structuredClone(capabilities) as Data;
    fn(d);
    return buildDiscovery(d, componentManifest.components, blocksManifest.blocks).errors.join("\n");
  };
  const rowNamed = (d: Data, name: string) =>
    d.families.flatMap((f) => f.capabilities as { name: string; evidence: string[]; status: string }[]).find((r) => r.name === name)!;

  it("passes on the committed data", () => {
    expect(mutate(() => {})).toBe("");
  });
  it("fails a published block that is neither cited nor listed", () => {
    expect(mutate((d) => (d.discovery.unclassifiedBlocks = d.discovery.unclassifiedBlocks.filter((u) => u.block !== "cta-banner")))).toMatch(
      /cta-banner: no shipping row cites block:cta-banner/,
    );
  });
  it("fails a block that is both cited and listed as unclassified", () => {
    expect(mutate((d) => d.discovery.unclassifiedBlocks.push({ block: "receipt", reason: "x" }))).toMatch(/"receipt" is cited by a shipping row/);
  });
  it("fails an unknown block, a duplicate and a missing reason in unclassifiedBlocks", () => {
    expect(mutate((d) => d.discovery.unclassifiedBlocks.push({ block: "no-such-block", reason: "x" }))).toMatch(/"no-such-block" is not a block/);
    expect(mutate((d) => d.discovery.unclassifiedBlocks.push({ ...d.discovery.unclassifiedBlocks[0]! }))).toMatch(/duplicate block/);
    expect(mutate((d) => (d.discovery.unclassifiedBlocks[0]!.reason = " "))).toMatch(/a reason is required/);
  });
  it("fails a workflow with no shipping stage, and a workflow naming an unknown domain or row", () => {
    expect(
      mutate((d) => d.discovery.workflows.push({ id: "goal-setting", title: "Goal setting", domain: "healthcare", summary: "s", stages: [{ title: "Vitals", uses: ["VitalSign"] }] })),
    ).toMatch(/goal-setting: no stage uses an existing or partial row/);
    expect(mutate((d) => (d.discovery.workflows[0]!.domain = "real-estate"))).toMatch(/domain "real-estate" does not exist/);
    expect(mutate((d) => d.discovery.workflows[0]!.stages[0]!.uses.push("NotARow"))).toMatch(/"NotARow" is not a capability row/);
  });
  it("fails an unknown family in a capability group and a duplicate domain id", () => {
    expect(mutate((d) => d.discovery.capabilities[0]!.families.push("ZZ"))).toMatch(/family "ZZ" does not exist/);
    expect(mutate((d) => d.discovery.domains.push({ ...d.discovery.domains[0]! }))).toMatch(/duplicate id "commerce"/);
  });
  it("ignores a block: reference on a planned row when deriving (gen-business-roadmap rejects the row itself)", () => {
    const d = structuredClone(capabilities) as Data;
    const row = rowNamed(d, "Checkout");
    expect(row.status).toBe("planned");
    row.evidence.push("block:cta-banner");
    const { index } = buildDiscovery(d, componentManifest.components, blocksManifest.blocks);
    expect((index as { blocks: Record<string, { capabilities: string[] }> }).blocks["cta-banner"]!.capabilities).toEqual([]);
  });
});

describe("block facets", () => {
  const facets = blockFacets();
  it("offers only options some block carries, and links a workflow only to a domain page that exists", () => {
    for (const key of ["capabilities", "domains", "workflows"] as const)
      for (const o of facets[key]) expect(Object.values(facets.bySlug).some((b) => b[key].includes(o.id)), o.id).toBe(true);
    expect(facets.workflows.find((w) => w.id === "checkout")!.href).toBe("/use-cases/commerce#checkout");
    expect(facets.capabilities.map((c) => c.id)).toContain("application-foundations");
  });
  it("lets a search for the job find the block", () => {
    expect(facets.bySlug["order-summary"]!.terms).toContain("checkout");
  });
});
