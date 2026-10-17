import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { routeMetadata } from "@/lib/route-seo";
import { ctaAttrs } from "@/lib/analytics-surfaces";
import { SectionHead } from "@/components/section-head";
import {
  ComponentLinks,
  RowItem,
  StatusTag,
  WorkflowStages,
  countsLine,
  linkClass,
  rowsOf,
} from "@/components/discovery-parts";
import {
  BUSINESS_NEEDS,
  CAPABILITIES,
  DOMAINS,
  WORKFLOWS,
  blockFacets,
  catalogueFacets,
  coverageLine,
  domainById,
  domainHref,
  hubDomainAnchor,
  hubWorkflowAnchor,
  ships,
  workflowLink,
  workflowParts,
  type Domain,
  type Workflow,
} from "@/lib/business-discovery";
import { siteConfig } from "@/lib/site";
import type { AnalyticsCtaTarget } from "@/lib/analytics";

export const metadata: Metadata = routeMetadata("/capabilities");

/** Capability groups with something that ships today get a section; the rest are named once, as roadmap only. */
const SHIPPING = CAPABILITIES.filter((c) => c.counts.existing + c.counts.partial > 0);
const ROADMAP_ONLY = CAPABILITIES.filter((c) => c.counts.existing + c.counts.partial === 0);
/** Domains with nothing shipping: named once, never given a card or a link. */
const PLANNED_DOMAINS = DOMAINS.filter((d) => d.counts.existing + d.counts.partial === 0);

/** Filters the galleries really offer, so a card never links to a filter value the gallery would drop. */
const CATALOGUE_DOMAINS = new Set(catalogueFacets().domains.map((d) => d.id));
const BLOCK_DOMAINS = new Set(blockFacets().domains.map((d) => d.id));

const ctaClass =
  "inline-flex items-center gap-1.5 text-body-sm font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * The way from a use case to code. Every destination is a page that exists (the tests check them). The targets are the
 * existing CTA ones: `platform_coverage` is the same act the homepage's coverage button measures (a Qualified
 * Evaluation signal, analytics-measurement.ts); the blocks gallery has no CTA target, so that link is not tagged.
 */
const NEXT_STEPS: { title: string; body: string; href: string; label: string; target?: AnalyticsCtaTarget }[] = [
  {
    title: "Blocks",
    body: "Larger compositions, filtered by capability, domain and workflow, each with its source.",
    href: "/blocks",
    label: "Explore blocks",
  },
  {
    title: "Components",
    body: "The catalogue, with live previews and the platforms that implement each entry.",
    href: "/components",
    label: "Browse components",
    target: "browse_components",
  },
  {
    title: "Platform coverage",
    body: "What installs from npm, what is source you compile, and what each platform is verified by.",
    href: "/docs/platforms",
    label: "View platform coverage",
    target: "platform_coverage",
  },
  {
    title: "Installation",
    body: "Add tokens and components to a React project, or start from the native guides.",
    href: "/docs/installation",
    label: "Read installation",
    target: "installation",
  },
];

/**
 * Where a domain sends a reader next: its use-case page when it has one; otherwise the place its evidence lives — the
 * IoT module for a domain whose evidence is @kinetixui/iot exports, else the catalogue filtered to it. Never a page
 * that does not exist.
 */
function domainNext(d: Domain): { href: string; label: string } | null {
  if (d.page) return { href: domainHref(d.id), label: `Explore ${d.title}` };
  if (d.components.length && CATALOGUE_DOMAINS.has(d.id))
    return { href: `/components?domain=${d.id}`, label: `Browse its ${d.components.length} catalogue entries` };
  if (d.iot.length) return { href: "/iot", label: "Open the IoT module" };
  return null;
}

function DomainCard({ d }: { d: Domain }) {
  const next = domainNext(d);
  const workflows = WORKFLOWS.filter((w) => w.domain === d.id);
  return (
    <li
      id={hubDomainAnchor(d.id)}
      className="flex min-w-0 scroll-mt-28 flex-col rounded-xl border border-border bg-card p-4 [overflow-wrap:anywhere]"
    >
      <h3 className="font-medium">{d.title}</h3>
      <p className="mt-1 text-body-sm text-muted-foreground">{d.summary}</p>
      <p className="mt-3 font-mono text-label-md uppercase tracking-[0.1em] text-muted-foreground">{countsLine(d.counts)}</p>
      {workflows.length > 0 && (
        <p className="mt-2 text-body-sm">
          <span className="text-muted-foreground">Workflows: </span>
          {workflows.map((w, i) => (
            <span key={w.id}>
              {i > 0 && ", "}
              <Link href={workflowLink(w.id)} className={linkClass}>
                {w.title}
              </Link>
            </span>
          ))}
        </p>
      )}
      {d.components.length > 0 && (
        <p className="mt-2 text-body-sm">
          <span className="text-muted-foreground">Components: </span>
          <ComponentLinks slugs={d.components.slice(0, 5)} />
          {d.components.length > 5 && <span className="text-muted-foreground"> and {d.components.length - 5} more</span>}
        </p>
      )}
      {d.blocks.length > 0 && (
        <p className="mt-2 text-body-sm">
          <span className="text-muted-foreground">Blocks: </span>
          <ComponentLinks slugs={d.blocks} kind="block" />
        </p>
      )}
      {d.iot.length > 0 && (
        <p className="mt-2 text-body-sm">
          <span className="text-muted-foreground">Evidence: </span>
          {d.iot.length} {d.iot.length === 1 ? "export" : "exports"} of the{" "}
          <Link href="/docs/iot" className={linkClass}>
            @kinetixui/iot
          </Link>{" "}
          package.{d.components.length + d.blocks.length === 0 && " No catalogue component or block cites this domain yet."}
        </p>
      )}
      <p className="mt-3 text-body-sm text-muted-foreground">{d.page ? "Has a use-case page." : "No use-case page yet; what ships is listed on this card."}</p>
      {next && (
        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 pt-4">
          <Link href={next.href} className={ctaClass}>
            {next.label}
            <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
          </Link>
          {!d.page && d.blocks.length > 0 && BLOCK_DOMAINS.has(d.id) && (
            <Link href={`/blocks?domain=${d.id}`} className={ctaClass}>
              Browse its blocks
              <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
            </Link>
          )}
        </div>
      )}
    </li>
  );
}

function WorkflowCard({ w }: { w: Workflow }) {
  const d = domainById(w.domain)!;
  const parts = workflowParts(w);
  return (
    <li
      id={hubWorkflowAnchor(w.id)}
      className="flex min-w-0 scroll-mt-28 flex-col rounded-xl border border-border p-4 [overflow-wrap:anywhere]"
    >
      <h3 className="font-medium">{w.title}</h3>
      <p className="mt-0.5 text-body-sm text-muted-foreground">{d.title}</p>
      <p className="mt-2 text-body-sm">
        <span className="text-muted-foreground">Goal: </span>
        {w.summary}
      </p>
      <p className="mt-3 font-mono text-label-md uppercase tracking-[0.1em] text-muted-foreground">{coverageLine(w)}</p>
      <WorkflowStages workflow={w} />
      {parts.components.length > 0 && (
        <p className="mt-4 text-body-sm">
          <span className="text-muted-foreground">Components that ship for it: </span>
          <ComponentLinks slugs={parts.components} />
        </p>
      )}
      {parts.blocks.length > 0 && (
        <p className="mt-2 text-body-sm">
          <span className="text-muted-foreground">Blocks: </span>
          <ComponentLinks slugs={parts.blocks} kind="block" />
        </p>
      )}
      {parts.iot > 0 && (
        <p className="mt-2 text-body-sm">
          <span className="text-muted-foreground">Package: </span>
          {parts.iot} {parts.iot === 1 ? "export" : "exports"} of{" "}
          <Link href="/docs/iot" className={linkClass}>
            @kinetixui/iot
          </Link>
          ; there is no catalogue component or block for this workflow.
        </p>
      )}
      <div className="mt-auto pt-4">
        {d.page ? (
          <Link href={workflowLink(w.id)} className={ctaClass}>
            See every stage on the {d.title} page
            <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
          </Link>
        ) : parts.iot > 0 ? (
          <Link href="/iot" className={ctaClass}>
            Open the IoT module
            <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
          </Link>
        ) : null}
      </div>
    </li>
  );
}

/**
 * /capabilities — the Use Cases hub: "What can I build with KinetixUI?"
 *
 * The URL is the W1 one (kept: it is linked from component pages, /components and the sitemap); readers meet it as
 * "Use cases". Every number and list on this page is read from discovery-index.json (generated from
 * docs/business-capabilities.json), so it moves when a capability row's status or evidence does, and a planned row
 * is never shown as something to install. A domain or workflow with no page of its own is explained on its card
 * here (`#domain-<id>`, `#workflow-<id>`), so no link leads to a page that does not exist. The page does not mention
 * Pro: Pro-candidate rows never reach the index (marketing/STRATEGY.md rule 7).
 */
export default function CapabilitiesPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow">Use cases</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">What can I build with KinetixUI?</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Start from the problem your product solves. Each business domain below lists the workflows KinetixUI maps onto
        it, stage by stage, and the components and blocks that ship for them today. These are interface parts: nothing
        here processes payments, books inventory or talks to your devices, and no domain is a complete solution.
      </p>
      <p className="mt-3 max-w-2xl text-body-sm text-muted-foreground">
        <strong className="font-medium text-foreground">How to read the status:</strong> <StatusTag status="existing" /> is in
        the repository today. <StatusTag status="partial" /> ships in part. <StatusTag status="planned" /> is not built: it is on
        the{" "}
        <a href={`${siteConfig.repo}/blob/main/docs/BUSINESS-CAPABILITY-ROADMAP.md`} className={linkClass}>
          business capability roadmap
        </a>{" "}
        and nothing here installs it.
      </p>
      <nav aria-label="On this page" className="mt-6">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-body-sm">
          <li>
            <a href="#business-domains" className={linkClass}>
              Business domains
            </a>
          </li>
          <li>
            <a href="#workflows" className={linkClass}>
              Workflows
            </a>
          </li>
          <li>
            <a href="#capability-groups" className={linkClass}>
              Capabilities
            </a>
          </li>
          <li>
            <a href="#next-steps" className={linkClass}>
              Next steps
            </a>
          </li>
        </ul>
      </nav>

      <section aria-labelledby="business-domains" className="mt-12">
        <SectionHead index="01" label="By business domain" meta={`${BUSINESS_NEEDS.length} with something shipping`} />
        <h2 id="business-domains" className="mt-4 scroll-mt-28 text-xl font-semibold tracking-tight">
          Explore by business domain
        </h2>
        <p className="mt-2 max-w-2xl text-body-sm text-muted-foreground">
          Domains with at least one capability that ships today. Counts are roadmap capabilities, not components. A
          domain gets its own page once it has a workflow that mostly ships today and enough components and blocks to
          open.
        </p>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BUSINESS_NEEDS.map((d) => (
            <DomainCard key={d.id} d={d} />
          ))}
        </ul>
        {PLANNED_DOMAINS.length > 0 && (
          <p className="mt-6 max-w-2xl text-body-sm text-muted-foreground">
            On the roadmap with nothing shipped yet: {PLANNED_DOMAINS.map((d) => d.title).join(", ")}.
          </p>
        )}
      </section>

      <section aria-labelledby="workflows" className="mt-16">
        <SectionHead index="02" label="By workflow" meta={`${WORKFLOWS.length} workflows`} />
        <h2 id="workflows" className="mt-4 scroll-mt-28 text-xl font-semibold tracking-tight">
          Workflows
        </h2>
        <p className="mt-2 max-w-2xl text-body-sm text-muted-foreground">
          A workflow is the path a person takes through your product. A stage is available only when everything it
          needs is; one available part makes a stage partial, not done.
        </p>
        <ul className="mt-5 grid gap-4 lg:grid-cols-2">
          {WORKFLOWS.map((w) => (
            <WorkflowCard key={w.id} w={w} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="capability-groups" className="mt-16">
        <SectionHead index="03" label="By capability" meta={`${SHIPPING.length} with something shipping`} />
        <h2 id="capability-groups" className="mt-4 scroll-mt-28 text-xl font-semibold tracking-tight">
          Capabilities
        </h2>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {SHIPPING.map((c) => {
            const rows = rowsOf(c.rows);
            const shipping = rows.filter(ships);
            const planned = rows.filter((r) => !ships(r));
            return (
              <section key={c.id} id={c.id} aria-labelledby={`cap-${c.id}`} className="min-w-0 scroll-mt-28 rounded-xl border border-border p-4">
                <h3 id={`cap-${c.id}`} className="font-medium">
                  {c.title}
                </h3>
                <p className="mt-1 text-body-sm text-muted-foreground">{c.summary}</p>
                <p className="mt-2 font-mono text-label-md uppercase tracking-[0.1em] text-muted-foreground">{countsLine(c.counts)}</p>
                {c.components.length > 0 && (
                  <p className="mt-3 text-body-sm">
                    <Link href={`/components?capability=${c.id}`} className={linkClass} {...ctaAttrs("use_cases_hub", "browse_components")}>
                      {c.components.length} catalogue {c.components.length === 1 ? "entry" : "entries"} in the gallery
                    </Link>
                  </p>
                )}
                <h4 className="mt-4 font-mono text-label-md uppercase tracking-[0.12em] text-muted-foreground">Ships today</h4>
                <ul className="mt-1 divide-y divide-border/60">
                  {shipping.map((r) => (
                    <RowItem key={r.name} row={r} />
                  ))}
                </ul>
                {planned.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer font-mono text-label-md uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground">
                      Planned ({planned.length})
                    </summary>
                    <ul className="mt-1 divide-y divide-border/60">
                      {planned.map((r) => (
                        <RowItem key={r.name} row={r} />
                      ))}
                    </ul>
                  </details>
                )}
              </section>
            );
          })}
        </div>
        {ROADMAP_ONLY.length > 0 && (
          <p className="mt-6 max-w-2xl text-body-sm text-muted-foreground">
            On the roadmap with nothing shipped yet: {ROADMAP_ONLY.map((c) => c.title).join(", ")}.
          </p>
        )}
      </section>

      <section aria-labelledby="next-steps" className="mt-16">
        <SectionHead index="04" label="Next steps" />
        <h2 id="next-steps" className="mt-4 scroll-mt-28 text-xl font-semibold tracking-tight">
          From a use case to your code
        </h2>
        <p className="mt-2 max-w-2xl text-body-sm text-muted-foreground">
          Each component page shows its code, which platforms implement it and how that is verified. Check a platform
          before you plan around it: not every part ships on every platform, and source is not the same as verified.
        </p>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {NEXT_STEPS.map((n) => (
            <li key={n.href} className="flex min-w-0 flex-col rounded-xl border border-border p-4 [overflow-wrap:anywhere]">
              <h3 className="font-medium">{n.title}</h3>
              <p className="mt-1 text-body-sm text-muted-foreground">{n.body}</p>
              <div className="mt-auto pt-4">
                <Link href={n.href} className={ctaClass} {...(n.target ? ctaAttrs("use_cases_hub", n.target) : {})}>
                  {n.label}
                  <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
