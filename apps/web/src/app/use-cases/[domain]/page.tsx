import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PlatformSetupLink } from "@/components/platform-setup-link";
import { SectionHead } from "@/components/section-head";
import { ComponentCard, ComponentLinks, StatusTag, WorkflowStages, countsLine, linkClass, rowsOf } from "@/components/discovery-parts";
import { EvidenceLevelLegend, WorkflowReadiness } from "@/components/workflow-readiness";
import {
  DOMAIN_PAGES,
  HUB_HREF,
  WORKFLOWS,
  blockFacets,
  capabilityById,
  catalogueFacets,
  coverageLine,
  domainById,
  ships,
} from "@/lib/business-discovery";
import { ctaAttrs } from "@/lib/analytics-surfaces";
import type { AnalyticsCtaTarget } from "@/lib/analytics";
import { breadcrumbJsonLd, pageMetadata, type Crumb } from "@/lib/seo";

/**
 * /use-cases/<domain> — the reusable template for a business domain page.
 *
 * One template, every section derived from the generated data: the domain's workflows (stage by stage, each stage
 * naming the roadmap rows it uses and their status), each workflow's platform readiness (implementation and evidence
 * per part, from components.manifest.json, blocks.manifest.json and verification.json, through
 * lib/workflow-readiness.ts), the components and blocks that ship today, the planned capabilities (named, never
 * linked), the next steps, and the related capability groups. A domain gets a page by setting `"page": true` in
 * docs/business-capabilities.json, and the generator refuses one that does not meet the publication criteria.
 *
 * Breadcrumb: Use cases → the domain. The BreadcrumbList JSON-LD is built from the same crumbs, and `check:seo`
 * compares the two.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return DOMAIN_PAGES.map((d) => ({ domain: d.id }));
}

type Props = { params: Promise<{ domain: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = domainById((await params).domain);
  if (!d?.page) return {};
  const wfs = WORKFLOWS.filter((w) => w.domain === d.id).map((w) => w.title.toLowerCase());
  return pageMetadata({
    path: `/use-cases/${d.id}`,
    title: `${d.title} UI components and workflows`,
    description: `${d.summary} What KinetixUI ships today for ${d.title.toLowerCase()} interfaces${
      wfs.length ? `, mapped onto ${wfs.join(" and ")}` : ""
    }, with the platform evidence behind each part and planned work labelled as planned.`,
  });
}

const COMPONENT_DOMAINS = new Set(catalogueFacets().domains.map((d) => d.id));
const BLOCK_DOMAINS = new Set(blockFacets().domains.map((d) => d.id));

const ctaClass =
  "inline-flex items-center gap-1.5 text-body-sm font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Step = { title: string; body: string; href: string; label: string; target?: AnalyticsCtaTarget; platformSetup?: boolean };

/** Where a reader goes next, filtered to this domain where the destination offers the filter. No dead ends. */
function nextSteps(id: string, title: string): Step[] {
  return [
    {
      title: "Blocks",
      body: `Larger compositions${BLOCK_DOMAINS.has(id) ? ` used in ${title.toLowerCase()} interfaces` : ""}, each with its source.`,
      href: BLOCK_DOMAINS.has(id) ? `/blocks?domain=${id}` : "/blocks",
      label: "Explore blocks",
    },
    {
      title: "Components",
      body: "The catalogue entries this domain cites, with live previews and the platforms that implement each.",
      href: COMPONENT_DOMAINS.has(id) ? `/components?domain=${id}` : "/components",
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
      body: "Add the tokens and the components to a project on the platform you chose in a code tab (React until you choose).",
      href: "/docs/installation",
      label: "Read installation",
      target: "installation",
      platformSetup: true,
    },
  ];
}

export default async function UseCasePage({ params }: Props) {
  const d = domainById((await params).domain);
  if (!d?.page) notFound();
  const workflows = WORKFLOWS.filter((w) => w.domain === d.id);
  const planned = rowsOf(d.rows).filter((r) => !ships(r));
  const crumbs: Crumb[] = [{ name: "Use cases", href: HUB_HREF }, { name: d.title }];
  const steps = nextSteps(d.id, d.title);
  const complete = workflows.filter((w) => w.coverage.existing === w.stages.length).length;
  let n = 0;
  const index = () => String(++n).padStart(2, "0");

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-label-md uppercase tracking-[0.14em] text-muted-foreground">
        <Link href={HUB_HREF} className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Use cases
        </Link>
        <span aria-hidden>/</span>
        <span data-crumb aria-current="page" className="text-foreground">
          {d.title}
        </span>
        <script
          type="application/ld+json"
          // built from the discovery index and the route — no user input reaches it
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
        />
      </nav>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">{d.title}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">{d.summary}</p>
      <p className="mt-3 max-w-2xl text-body-sm text-muted-foreground">
        {workflows.length} {workflows.length === 1 ? "workflow" : "workflows"} mapped. Today {d.components.length}{" "}
        {d.components.length === 1 ? "component" : "components"}
        {d.blocks.length > 0 && ` and ${d.blocks.length} ${d.blocks.length === 1 ? "block" : "blocks"}`} ship for this
        domain.{" "}
        {workflows.length > 0 && complete === workflows.length
          ? "Every workflow here ships all its stages, and platform support differs part by part."
          : `${complete} of ${workflows.length} ${workflows.length === 1 ? "workflow ships" : "workflows ship"} every stage, and platform support differs part by part.`}
      </p>
      <p className="mt-2 font-mono text-label-md uppercase tracking-[0.1em] text-muted-foreground">
        Roadmap capabilities: {countsLine(d.counts)}
      </p>

      <nav aria-label="On this page" className="mt-6">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-body-sm">
          {workflows.map((w) => (
            <li key={w.id}>
              <a href={`#${w.id}`} className={linkClass}>
                {w.title}
              </a>
            </li>
          ))}
          <li>
            <a href="#evidence-levels" className={linkClass}>
              Evidence levels
            </a>
          </li>
          <li>
            <a href="#next-steps" className={linkClass}>
              Next steps
            </a>
          </li>
        </ul>
      </nav>

      {workflows.length > 0 && (
        <section aria-labelledby="build" className="mt-12">
          <SectionHead index={index()} label="Workflows" meta={`${workflows.length}`} />
          <h2 id="build" className="mt-4 text-xl font-semibold tracking-tight">
            What you can build
          </h2>
          <p className="mt-2 max-w-2xl text-body-sm text-muted-foreground">
            Each stage names the capabilities it needs. <StatusTag status="existing" /> stages ship in full,{" "}
            <StatusTag status="partial" /> ones in part, and <StatusTag status="planned" /> ones are not built yet.
          </p>
          {workflows.map((w) => (
            <section key={w.id} id={w.id} aria-labelledby={`wf-${w.id}`} className="mt-6 scroll-mt-28 rounded-xl border border-border p-4">
              <h3 id={`wf-${w.id}`} className="font-medium">
                {w.title}
              </h3>
              <p className="mt-1 text-body-sm text-muted-foreground">{w.summary}</p>
              <p className="mt-1 font-mono text-label-md uppercase tracking-[0.1em] text-muted-foreground" data-coverage>
                {coverageLine(w)}
              </p>
              <WorkflowStages workflow={w} detailed />
              <WorkflowReadiness workflow={w} />
            </section>
          ))}
        </section>
      )}

      <section aria-labelledby="evidence-levels" className="mt-16">
        <SectionHead index={index()} label="Evidence" />
        <h2 id="evidence-levels" className="mt-4 scroll-mt-28 text-xl font-semibold tracking-tight">
          How to read the evidence levels
        </h2>
        <p className="mt-2 max-w-2xl text-body-sm text-muted-foreground">
          Computed from the repository&rsquo;s verification records, which are generated from the tests themselves. A level
          applies to one part on one platform; a package that builds says nothing about how a part behaves.{" "}
          <Link href="/docs/platforms" className={linkClass}>
            How each platform is verified
          </Link>
          .
        </p>
        <EvidenceLevelLegend />
      </section>

      <section aria-labelledby="available" className="mt-16">
        <SectionHead index={index()} label="Available now" meta={`${d.components.length} components`} />
        <h2 id="available" className="mt-4 text-xl font-semibold tracking-tight">
          Components available now
        </h2>
        <p className="mt-2 max-w-2xl text-body-sm text-muted-foreground">
          Catalogue entries cited as evidence by an available or partial capability in this domain. The tags show which
          platform libraries carry each one; its page shows the verification evidence per platform.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {d.components.map((slug) => (
            <ComponentCard key={slug} slug={slug} />
          ))}
        </ul>
        {d.blocks.length > 0 && (
          <p className="mt-6 text-body-sm">
            <span className="font-medium">Blocks: </span>
            <ComponentLinks slugs={d.blocks} kind="block" />
          </p>
        )}
      </section>

      {planned.length > 0 && (
        <section aria-labelledby="planned" className="mt-16">
          <SectionHead index={index()} label="Planned" meta={`${planned.length}`} />
          <h2 id="planned" className="mt-4 text-xl font-semibold tracking-tight">
            Planned capabilities
          </h2>
          <p className="mt-2 max-w-2xl text-body-sm text-muted-foreground">
            On the roadmap and not built. Nothing in this list can be installed today.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {planned.map((r) => (
              <li key={r.name} className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-md border border-dashed border-border px-2 py-1 text-body-sm text-muted-foreground [overflow-wrap:anywhere]">
                {r.name}
                <StatusTag status="planned" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="next-steps" className="mt-16">
        <SectionHead index={index()} label="Next steps" />
        <h2 id="next-steps" className="mt-4 scroll-mt-28 text-xl font-semibold tracking-tight">
          From {d.title.toLowerCase()} to your code
        </h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.title} className="flex min-w-0 flex-col rounded-xl border border-border p-4 [overflow-wrap:anywhere]">
              <h3 className="font-medium">{s.title}</h3>
              <p className="mt-1 text-body-sm text-muted-foreground">{s.body}</p>
              <div className="mt-auto pt-4">
                {s.platformSetup ? (
                  <PlatformSetupLink source="use_case_page" className={ctaClass} />
                ) : (
                  <Link href={s.href} className={ctaClass} {...(s.target ? ctaAttrs("use_case_page", s.target) : {})}>
                    {s.label}
                    <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="related" className="mt-16">
        <SectionHead index={index()} label="Related" />
        <h2 id="related" className="mt-4 text-xl font-semibold tracking-tight">
          Related capabilities
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {d.capabilities.map((id) => (
            <li key={id}>
              <Link href={`${HUB_HREF}#${id}`} className={linkClass}>
                {capabilityById(id)!.title}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-body-sm">
          <Link href={HUB_HREF} className={linkClass}>
            All use cases
          </Link>
        </p>
      </section>
    </div>
  );
}
