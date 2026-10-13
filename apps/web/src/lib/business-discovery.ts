/**
 * Business discovery: what a reader can build with KinetixUI, by capability, business domain and workflow.
 *
 * Everything here is READ from `discovery-index.json`, which `pnpm gen:capabilities` derives from
 * `docs/business-capabilities.json` and the two manifests (scripts/business-discovery.mjs documents every rule). There
 * is no list of "commerce components" or "finance components" anywhere in the website: a component reaches a
 * capability or a domain because a roadmap row cites it as evidence, or because a workflow uses such a row. A planned
 * row never contributes a component, so nothing planned can be linked as if it shipped.
 *
 * Server-side by default: the index is ~90 KB of JSON, so client components get the slim projections below as props
 * (`catalogueFacets`, `businessContexts`) instead of importing it.
 */
import index from "../../../../discovery-index.json";

export type RowStatus = "existing" | "partial" | "planned";
export type DiscoveryRow = {
  name: string;
  status: RowStatus;
  delivery: "component" | "block" | "recipe";
  layer: Layer;
  components: string[];
  blocks: string[];
  iot: string[];
};
export type Layer = "L1" | "L2" | "L3" | "L4";
/**
 * A catalogue entry no roadmap row classifies carries `unclassified` for layer and target. It is not L1: a missing
 * classification is not a product-architecture claim. It has no label, so it is never shown or offered as a filter.
 */
export type Unclassified = "unclassified";
export const UNCLASSIFIED: Unclassified = "unclassified";
export type Counts = { existing: number; partial: number; planned: number };
export type Capability = {
  id: string;
  title: string;
  summary: string;
  families: { id: string; title: string }[];
  counts: Counts;
  components: string[];
  blocks: string[];
  iot: string[];
  rows: string[];
};
export type Domain = Omit<Capability, "families"> & { page: boolean; capabilities: string[]; workflows: string[] };
export type Workflow = { id: string; title: string; domain: string; summary: string; stages: { title: string; rows: string[] }[] };
export type ComponentDiscovery = {
  layer: Layer | Unclassified;
  target: string;
  roadmapRow?: string;
  capabilities: string[];
  domains: string[];
  workflows: string[];
  buildsToward?: string[];
};

export const LAYER_LABEL = index.layers as Record<Layer, string>;
export const TARGET_LABEL = index.targets as Record<string, string>;
export const ROWS = index.rows as Record<string, DiscoveryRow>;
export const CAPABILITIES = index.capabilities as Capability[];
export const DOMAINS = index.domains as Domain[];
export const WORKFLOWS = index.workflows as Workflow[];
export const COMPONENT_DISCOVERY = index.components as Record<string, ComponentDiscovery>;
export const BLOCK_DISCOVERY = index.blocks as Record<string, Pick<ComponentDiscovery, "capabilities" | "domains" | "workflows">>;

export const capabilityById = (id: string) => CAPABILITIES.find((c) => c.id === id);
export const domainById = (id: string) => DOMAINS.find((d) => d.id === id);
export const workflowById = (id: string) => WORKFLOWS.find((w) => w.id === id);

/** A row "ships" when the repository has it, in full or in part; only those may be shown as available. */
export const ships = (row: Pick<DiscoveryRow, "status">) => row.status === "existing" || row.status === "partial";

/** Domains whose discovery page exists: `/use-cases/<id>`. */
export const DOMAIN_PAGES = DOMAINS.filter((d) => d.page);
export const domainHref = (id: string) => `/use-cases/${id}`;
export { DISCOVERY_ROUTES } from "./discovery-routes";

/**
 * A domain is worth offering under "Explore by business need" only when something in it ships today. Healthcare and
 * logistics are planned end to end; listing them would be a list of promises.
 */
export const BUSINESS_NEEDS = DOMAINS.filter((d) => d.counts.existing + d.counts.partial > 0);

/* -------------------------------------------------------------------------------------- catalogue facets */

export type FacetOption = { id: string; label: string };
/** What the /components gallery needs to filter by business context, and nothing else. */
export type CatalogueFacets = {
  capabilities: FacetOption[];
  domains: FacetOption[];
  layers: FacetOption[];
  /** `terms`: the entry's capability, domain and workflow names and its roadmap row, lower-cased, for search. */
  bySlug: Record<string, { layer: Layer | Unclassified; capabilities: string[]; domains: string[]; terms: string }>;
};

/**
 * The gallery's business facets. An option is offered only if at least one catalogue entry carries it, so no chip
 * can lead to an empty grid by construction (a combination of chips still can, and says so).
 */
export function catalogueFacets(): CatalogueFacets {
  const entries = Object.entries(COMPONENT_DISCOVERY);
  const used = (key: "capabilities" | "domains") => new Set(entries.flatMap(([, e]) => e[key]));
  const caps = used("capabilities");
  const doms = used("domains");
  const layers = new Set(entries.map(([, e]) => e.layer));
  return {
    capabilities: CAPABILITIES.filter((c) => caps.has(c.id)).map((c) => ({ id: c.id, label: c.title })),
    domains: DOMAINS.filter((d) => doms.has(d.id)).map((d) => ({ id: d.id, label: d.title })),
    layers: (Object.keys(LAYER_LABEL) as Layer[]).filter((l) => layers.has(l)).map((l) => ({ id: l, label: LAYER_LABEL[l] })),
    bySlug: Object.fromEntries(
      entries.map(([slug, e]) => [
        slug,
        {
          layer: e.layer,
          capabilities: e.capabilities,
          domains: e.domains,
          terms: [
            ...e.capabilities.map((id) => capabilityById(id)!.title),
            ...e.domains.map((id) => domainById(id)!.title),
            ...e.workflows.map((id) => workflowById(id)!.title),
            e.roadmapRow ?? "",
          ]
            .join(" · ")
            .toLowerCase(),
        },
      ]),
    ),
  };
}

/* ------------------------------------------------------------------------------ component page context */

export type BusinessContext = {
  /** Absent when the roadmap does not classify the component; the page then says nothing about its layer. */
  layer?: string;
  target?: string;
  capabilities: FacetOption[];
  domains: (FacetOption & { href?: string })[];
  workflows: (FacetOption & { domain: string; href?: string })[];
  buildsToward: string[];
};

/**
 * The "In applications" context a component page shows, or null when there is nothing to say: no classification, no
 * capability, no workflow and nothing planned on top of it. An unclassified layer or target is left out, not
 * rendered as "Core primitive".
 */
export function businessContextFor(slug: string): BusinessContext | null {
  const e = COMPONENT_DISCOVERY[slug];
  if (!e) return null;
  const layer = e.layer === UNCLASSIFIED ? undefined : LAYER_LABEL[e.layer];
  const target = e.target === UNCLASSIFIED ? undefined : TARGET_LABEL[e.target];
  if (!layer && !target && !e.capabilities.length && !e.workflows.length && !e.buildsToward?.length) return null;
  return {
    ...(layer ? { layer } : {}),
    ...(target ? { target } : {}),
    capabilities: e.capabilities.map((id) => ({ id, label: capabilityById(id)!.title })),
    domains: e.domains.map((id) => {
      const d = domainById(id)!;
      return { id, label: d.title, ...(d.page ? { href: domainHref(id) } : {}) };
    }),
    workflows: e.workflows.map((id) => {
      const w = workflowById(id)!;
      const d = domainById(w.domain)!;
      return { id, label: w.title, domain: d.title, ...(d.page ? { href: `${domainHref(d.id)}#${id}` } : {}) };
    }),
    buildsToward: e.buildsToward ?? [],
  };
}

/** Every component page's context, for the docs layout to hand to its client footer. Only pages that have one. */
export function businessContexts(): Record<string, BusinessContext> {
  return Object.fromEntries(
    Object.keys(COMPONENT_DISCOVERY)
      .map((slug) => [slug, businessContextFor(slug)] as const)
      .filter((pair): pair is readonly [string, BusinessContext] => pair[1] !== null),
  );
}
