import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CapabilitiesPage from "../capabilities/page";
import UseCasePage, { generateStaticParams } from "./[domain]/page";
import { DOMAIN_PAGES, DOMAINS, WORKFLOWS, blockFacets, catalogueFacets } from "@/lib/business-discovery";
import { blocks } from "@/lib/blocks";
import { publicRoutes } from "@/lib/seo";
import { PLATFORM_DEFINITIONS } from "@/lib/platform-parity";
import { EVIDENCE_LEVEL_LABEL, implementedLine, workflowReadiness } from "@/lib/workflow-readiness";

/**
 * Navigation integrity of the Use Cases hub and the use-case pages, on the rendered markup: every internal link must
 * lead to a page that exists, a hash must name an anchor that page really renders, and a gallery filter must be one
 * the gallery offers (an unknown value is silently dropped, which would land the reader on an unfiltered page).
 * Browser behaviour (layout, keyboard, axe, Back/Forward) is checked in Chromium by `pnpm check:use-cases`
 * (scripts/use-cases-browser.mjs).
 */
const ROUTES = new Set(publicRoutes());
const BLOCK_SLUGS = new Set(blocks.filter((b) => (b.status as string) !== "draft").map((b) => b.slug));
const COMPONENT_DOMAINS = new Set(catalogueFacets().domains.map((d) => d.id));
const COMPONENT_CAPS = new Set(catalogueFacets().capabilities.map((d) => d.id));
const BLOCK_DOMAINS = new Set(blockFacets().domains.map((d) => d.id));

/** The ids a rendered page carries, keyed by its route, for checking hashes. */
const anchors = new Map<string, Set<string>>();
const idsOf = (el: HTMLElement) => new Set([...el.querySelectorAll("[id]")].map((n) => n.id));

async function renderUseCase(domain: string) {
  return render(await UseCasePage({ params: Promise.resolve({ domain }) }));
}

function collectAnchors() {
  if (anchors.size) return;
  const hub = render(<CapabilitiesPage />);
  anchors.set("/capabilities", idsOf(hub.container));
  hub.unmount();
}

function problems(container: HTMLElement): string[] {
  const out: string[] = [];
  for (const a of container.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href")!;
    if (/^https?:/.test(href)) continue;
    if (href.startsWith("#")) continue; // checked against the same page below
    const url = new URL(href, "https://kinetixui.com");
    const path = url.pathname;
    if (!ROUTES.has(path)) out.push(`${href}: no such page`);
    const hash = url.hash.slice(1);
    if (hash && path === "/blocks" && !BLOCK_SLUGS.has(hash)) out.push(`${href}: no such block`);
    if (hash && anchors.has(path) && !anchors.get(path)!.has(hash)) out.push(`${href}: no #${hash} on ${path}`);
    if (hash && path.startsWith("/use-cases/") && !WORKFLOWS.some((w) => w.id === hash && `/use-cases/${w.domain}` === path))
      out.push(`${href}: no workflow #${hash} on ${path}`);
    const domain = url.searchParams.get("domain");
    const capability = url.searchParams.get("capability");
    if (path === "/components" && domain && !COMPONENT_DOMAINS.has(domain)) out.push(`${href}: /components does not offer this domain`);
    if (path === "/components" && capability && !COMPONENT_CAPS.has(capability)) out.push(`${href}: /components does not offer this capability`);
    if (path === "/blocks" && domain && !BLOCK_DOMAINS.has(domain)) out.push(`${href}: /blocks does not offer this domain`);
  }
  for (const a of container.querySelectorAll('a[href^="#"]')) {
    const id = a.getAttribute("href")!.slice(1);
    if (!container.querySelector(`[id="${id}"]`)) out.push(`#${id}: no such anchor on this page`);
  }
  return out;
}

describe("link checker negative controls", () => {
  it("reports a missing page, block, hub anchor, workflow anchor and unoffered filter", () => {
    collectAnchors();
    const el = document.createElement("div");
    el.innerHTML = [
      '<a href="/use-cases/healthcare">x</a>',
      '<a href="/blocks#no-such-block">x</a>',
      '<a href="/capabilities#workflow-no-such">x</a>',
      '<a href="/use-cases/commerce#flight-booking">x</a>',
      '<a href="/components?domain=healthcare">x</a>',
      '<a href="#nowhere">x</a>',
    ].join("");
    expect(problems(el)).toEqual([
      "/use-cases/healthcare: no such page",
      "/blocks#no-such-block: no such block",
      "/capabilities#workflow-no-such: no #workflow-no-such on /capabilities",
      "/use-cases/commerce#flight-booking: no workflow #flight-booking on /use-cases/commerce",
      "/components?domain=healthcare: /components does not offer this domain",
      "#nowhere: no such anchor on this page",
    ]);
  });
});

describe("Use Cases hub (/capabilities)", () => {
  it("has one h1 and section headings in order", () => {
    render(<CapabilitiesPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Explore by business domain",
      "Workflows",
      "Capabilities",
      "From a use case to your code",
    ]);
  });

  it("leads only to pages, anchors and filters that exist", () => {
    collectAnchors();
    const { container } = render(<CapabilitiesPage />);
    expect(problems(container)).toEqual([]);
  });

  it("gives every domain with something shipping a card, and links a page only where one exists", () => {
    render(<CapabilitiesPage />);
    for (const d of DOMAINS.filter((x) => x.counts.existing + x.counts.partial > 0)) {
      const card = document.getElementById(`domain-${d.id}`)!;
      expect(card, d.id).not.toBeNull();
      const toPage = within(card).queryAllByRole("link").filter((a) => a.getAttribute("href") === `/use-cases/${d.id}`);
      expect(toPage.length > 0, d.id).toBe(d.page);
    }
    // planned-only domains are named, never given a card
    expect(document.getElementById("domain-healthcare")).toBeNull();
    expect(screen.getByText(/On the roadmap with nothing shipped yet: Healthcare/)).toBeInTheDocument();
  });

  it("sends IoT to the IoT module and says no block or catalogue component exists for it", () => {
    render(<CapabilitiesPage />);
    const card = document.getElementById("domain-iot")!;
    expect(within(card).getByRole("link", { name: /Open the IoT module/ })).toHaveAttribute("href", "/iot");
    expect(card.textContent).toMatch(/No catalogue component or block cites this domain yet/);
    const wf = document.getElementById("workflow-device-pairing")!;
    expect(within(wf).queryByText(/^Blocks:/)).toBeNull();
    expect(wf.textContent).toMatch(/there is no catalogue component or block for this workflow/);
  });

  it("shows every workflow with its stages in order and their status in words", () => {
    render(<CapabilitiesPage />);
    for (const w of WORKFLOWS) {
      const card = document.getElementById(`workflow-${w.id}`)!;
      const stages = within(card).getAllByRole("listitem").filter((li) => li.parentElement?.tagName === "OL");
      expect(stages.map((li) => li.textContent)).toEqual(
        w.stages.map((s, i) => `${String(i + 1).padStart(2, "0")}${s.title}${{ existing: "Available", partial: "Partial", planned: "Planned" }[s.status]}`),
      );
    }
  });

  it("links Checkout to Price Breakdown and the Order summary block", () => {
    render(<CapabilitiesPage />);
    const card = document.getElementById("workflow-checkout")!;
    expect(within(card).getByRole("link", { name: "Price Breakdown" })).toHaveAttribute("href", "/docs/components/price-breakdown");
    expect(within(card).getByRole("link", { name: "Order summary" })).toHaveAttribute("href", "/blocks#order-summary");
  });

  it("ends with next steps that lead to pages that exist, tagged with existing CTA targets", () => {
    render(<CapabilitiesPage />);
    const section = screen.getByRole("heading", { level: 2, name: "From a use case to your code" }).closest("section")!;
    const links = within(section).getAllByRole("link");
    expect(links.map((a) => [a.getAttribute("href"), a.getAttribute("data-analytics-cta")])).toEqual([
      ["/blocks", null],
      ["/components", "browse_components"],
      ["/docs/platforms", "platform_coverage"],
      ["/docs/installation", "installation"],
    ]);
    for (const a of links) expect(ROUTES.has(a.getAttribute("href")!)).toBe(true);
  });

  it("makes no per-platform claim the source files alone would support (verification levels come with BD-W3b2b)", () => {
    const { container } = render(<CapabilitiesPage />);
    expect(container.textContent).not.toMatch(/\b(React|Angular|SwiftUI|Compose|Flutter) \d+ of \d+/);
  });
});

describe("use-case pages (/use-cases/<domain>)", () => {
  it("are generated for exactly the domains with a page", () => {
    expect(generateStaticParams().map((p) => p.domain)).toEqual(DOMAIN_PAGES.map((d) => d.id));
  });

  it.each(DOMAIN_PAGES.map((d) => d.id))("%s leads only to pages, anchors and filters that exist", async (id) => {
    collectAnchors();
    const { container } = await renderUseCase(id);
    expect(problems(container)).toEqual([]);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it.each(DOMAIN_PAGES.map((d) => d.id))("%s has a breadcrumb back to the hub, and JSON-LD that matches it", async (id) => {
    const { container } = await renderUseCase(id);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(nav).getByRole("link", { name: "Use cases" })).toHaveAttribute("href", "/capabilities");
    const current = nav.querySelector("[aria-current=page]")!;
    expect(current.textContent).toBe(DOMAINS.find((d) => d.id === id)!.title);
    const ld = [...container.querySelectorAll('script[type="application/ld+json"]')]
      .map((s) => JSON.parse(s.textContent!))
      .find((j) => j["@type"] === "BreadcrumbList");
    expect(ld.itemListElement.map((e: { name: string; item?: string }) => [e.name, e.item ?? null])).toEqual([
      ["Use cases", "https://kinetixui.com/capabilities"],
      [current.textContent, null],
    ]);
  });

  it.each(DOMAIN_PAGES.map((d) => d.id))("%s prints each workflow's platform readiness as computed, in words", async (id) => {
    const { container } = await renderUseCase(id);
    for (const w of WORKFLOWS.filter((x) => x.domain === id)) {
      const table = container.querySelector(`[data-workflow-readiness="${w.id}"]`)!;
      expect(table, w.id).not.toBeNull();
      for (const r of workflowReadiness(w)) {
        const row = table.querySelector(`tr[data-platform="${r.platform}"]`)!;
        const cells = [...row.querySelectorAll("th, td")].map((c) => c.textContent);
        expect(cells[0]).toBe(PLATFORM_DEFINITIONS[r.platform].label);
        expect(cells[1]).toBe(implementedLine(r));
        const word = (l: typeof r.weakestComponent) => (l ? EVIDENCE_LEVEL_LABEL[l] : "No components");
        const hasBlocks = r.parts.some((p) => p.kind === "block");
        expect(cells.slice(2, hasBlocks ? 4 : 3)).toEqual(hasBlocks ? [word(r.weakestComponent), word(r.weakestBlock)] : [word(r.weakestComponent)]);
        // independent of the computation: a component missing on this platform must show as the component floor
        const missing = r.parts.some((p) => p.kind === "component" && p.level === "not-implemented");
        if (missing) expect(cells[2], `${w.id} ${r.platform}`).toBe(EVIDENCE_LEVEL_LABEL["not-implemented"]);
        // no workflow with a partial or planned stage may be offered as buildable, on any platform
        if (w.coverage.existing < w.stages.length) expect(cells.at(-1), `${w.id} ${r.platform}`).not.toBe("Can be built");
        for (const [i, part] of r.parts.entries()) {
          const cell = table.querySelector(`tr[data-part="${part.kind}:${part.slug}"] td[data-platform="${r.platform}"]`)!;
          expect(cell.textContent, `${part.slug} ${r.platform} (${i})`).toBe(EVIDENCE_LEVEL_LABEL[part.level]);
        }
      }
    }
  });

  it.each(DOMAIN_PAGES.map((d) => d.id))("%s ends with next steps to destinations that exist, tagged with existing CTA targets", async (id) => {
    await renderUseCase(id);
    const section = screen.getByRole("heading", { level: 2, name: /to your code$/ }).closest("section")!;
    const links = within(section).getAllByRole("link");
    expect(links.map((a) => [new URL(a.getAttribute("href")!, "https://x").pathname, a.getAttribute("data-analytics-cta"), a.getAttribute("data-analytics-source")])).toEqual([
      ["/blocks", null, null],
      ["/components", "browse_components", "use_case_page"],
      ["/docs/platforms", "platform_coverage", "use_case_page"],
      ["/docs/installation", "installation", "use_case_page"],
    ]);
  });

  it("refuses a domain with no page", async () => {
    await expect(UseCasePage({ params: Promise.resolve({ domain: "iot" }) })).rejects.toThrow();
  });
});
