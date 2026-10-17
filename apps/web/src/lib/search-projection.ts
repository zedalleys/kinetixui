/**
 * The slim search projection the command menu (⌘K) loads: blocks, use cases and the business context of each
 * component, and nothing else. Server-side only — it imports the discovery index — and served as a static file by
 * `app/search-index.json/route.ts`, which the menu fetches the first time it is reached for. No page's JavaScript
 * carries it, and the ~90 KB discovery index never reaches the browser. It is a projection of existing data, not a
 * second index: every field is read from blocks.manifest.json (via lib/blocks.ts) or discovery-index.json.
 *
 * Every entry is a destination that exists:
 *   - a block only when it is published (`draft` blocks are not on /blocks, so they are not here either), at its
 *     `/blocks#<slug>` anchor (the gallery's `id` per block);
 *   - a use case only for a domain with a page (`page: true`, the same rule that generates the /use-cases routes),
 *     the hub, a workflow only as its section on such a page, and a capability group only when something in it
 *     ships (the hub renders a section for exactly those);
 *   - a component's business terms come from the shipping rows that cite it (their names, capability, domain and
 *     workflow), so a planned capability never makes a component findable as if it shipped.
 */
import { blocks } from "./blocks";
import { blockComponents } from "./block-components";
import {
  CAPABILITIES,
  DOMAIN_PAGES,
  ROWS,
  WORKFLOWS,
  blockFacets,
  catalogueFacets,
  domainById,
  domainHref,
  ships,
} from "./business-discovery";
import { COMPONENT_CATEGORY, componentDocs } from "./site";

export type SearchEntryType = "block" | "use-case" | "workflow" | "capability";

export type SearchEntry = {
  /** stable and unique across the projection: `<type>:<slug>` */
  id: string;
  type: SearchEntryType;
  title: string;
  /** one short line under the title: the block's description, the domain's or workflow's summary */
  description: string;
  /** what kind of destination it is, in words: "Commerce block", "Workflow · Commerce" */
  context: string;
  href: string;
  /** extra words that may match (category, business context, components used). Never shown. */
  keywords: string[];
};

export type SearchProjection = {
  blocks: SearchEntry[];
  useCases: SearchEntry[];
  /** component page href → extra words (category, capability, domain, workflow, the shipping rows that cite it) */
  componentKeywords: Record<string, string[]>;
};

const HUB = "/capabilities";
const split = (terms: string) => terms.split(" · ").filter(Boolean);
/** "BoardingPass" → "boarding pass", "JSONViewer" → "json viewer" */
const words = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .trim();

export function searchProjection(): SearchProjection {
  const blockTerms = blockFacets().bySlug;
  const used = blockComponents();
  const componentTerms = catalogueFacets().bySlug;
  const pages = new Set(DOMAIN_PAGES.map((d) => d.id));

  const blockEntries: SearchEntry[] = blocks
    .filter((b) => (b.status as string) !== "draft")
    .map((b) => ({
      id: `block:${b.slug}`,
      type: "block",
      title: b.title,
      description: b.description,
      context: `${b.category} block`,
      href: `/blocks#${b.slug}`,
      keywords: [b.category, ...split(blockTerms[b.slug]?.terms ?? ""), ...(used[b.slug] ?? [])],
    }));

  const useCases: SearchEntry[] = [
    {
      id: "use-case:hub",
      type: "use-case",
      title: "Use cases",
      description: "What you can build, by business domain and capability.",
      context: "Overview",
      href: HUB,
      keywords: ["capabilities", "business", "industries", "what can I build"],
    },
    ...DOMAIN_PAGES.map((d): SearchEntry => ({
      id: `use-case:${d.id}`,
      type: "use-case",
      title: d.title,
      description: d.summary,
      context: "Use case",
      href: domainHref(d.id),
      keywords: [
        ...d.workflows.map((id) => WORKFLOWS.find((w) => w.id === id)!.title),
        ...d.capabilities.map((id) => CAPABILITIES.find((c) => c.id === id)!.title),
      ],
    })),
    ...WORKFLOWS.filter((w) => pages.has(w.domain)).map((w): SearchEntry => ({
      id: `workflow:${w.id}`,
      type: "workflow",
      title: w.title,
      description: w.summary,
      context: `Workflow · ${domainById(w.domain)!.title}`,
      href: `${domainHref(w.domain)}#${w.id}`,
      keywords: w.stages.map((s) => s.title),
    })),
    ...CAPABILITIES.filter((c) => c.counts.existing + c.counts.partial > 0).map((c): SearchEntry => ({
      id: `capability:${c.id}`,
      type: "capability",
      title: c.title,
      description: c.summary,
      context: "Capability",
      href: `${HUB}#${c.id}`,
      keywords: [],
    })),
  ];

  // The shipping rows that cite a component, in words: "BoardingPass" cites pass-card, so "boarding pass" finds it.
  const citedBy = new Map<string, string[]>();
  for (const r of Object.values(ROWS).filter(ships))
    for (const slug of r.components) citedBy.set(slug, [...(citedBy.get(slug) ?? []), ...r.name.split(" / ").map(words)]);

  const componentKeywords = Object.fromEntries(
    componentDocs.map((c) => {
      const slug = c.href.split("/").pop()!;
      return [
        c.href,
        [...new Set([COMPONENT_CATEGORY[slug] ?? "", ...split(componentTerms[slug]?.terms ?? ""), ...(citedBy.get(slug) ?? [])])].filter(Boolean),
      ];
    }),
  );

  return { blocks: blockEntries, useCases, componentKeywords };
}
