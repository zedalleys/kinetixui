import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHead } from "@/components/section-head";
import { ComponentCard, ComponentLinks, RowItem, StatusTag, countsLine, linkClass, rowsOf } from "@/components/discovery-parts";
import { DOMAIN_PAGES, ROWS, WORKFLOWS, capabilityById, domainById, ships } from "@/lib/business-discovery";
import { pageMetadata } from "@/lib/seo";

/**
 * /use-cases/<domain> — the reusable template for a business domain page.
 *
 * One template, every section derived from discovery-index.json: the domain's workflows (stage by stage, each stage
 * naming the roadmap rows it uses and their status), the components and blocks that ship today, the planned
 * capabilities (named, never linked), and the related capability groups. A domain gets a page by setting
 * `"page": true` in docs/business-capabilities.json; `check:capabilities` refuses one with nothing that ships.
 *
 * Platform coverage is the catalogue's own platform row per component (components.manifest.json). Quality claims
 * (accessibility, RTL, reduced motion) are not made here: each component page shows its verification evidence.
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
    }, with platform coverage per component and planned work labelled as planned.`,
  });
}

export default async function UseCasePage({ params }: Props) {
  const d = domainById((await params).domain);
  if (!d?.page) notFound();
  const workflows = WORKFLOWS.filter((w) => w.domain === d.id);
  const planned = rowsOf(d.rows).filter((r) => !ships(r));

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow">
        <Link href="/capabilities" className="hover:text-foreground">
          Capabilities
        </Link>{" "}
        / Use case
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">{d.title}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">{d.summary}</p>
      <p className="mt-2 font-mono text-label-md uppercase tracking-[0.1em] text-muted-foreground">
        Roadmap capabilities: {countsLine(d.counts)}
      </p>

      {workflows.length > 0 && (
        <section aria-labelledby="build" className="mt-12">
          <SectionHead index="01" label="Workflows" meta={`${workflows.length}`} />
          <h2 id="build" className="mt-4 text-xl font-semibold tracking-tight">
            What you can build
          </h2>
          <p className="mt-2 max-w-2xl text-body-sm text-muted-foreground">
            Each stage names the capabilities it needs. Available and partial ones link to what you can use today;
            planned ones are not built yet.
          </p>
          {workflows.map((w) => (
            <section key={w.id} id={w.id} aria-labelledby={`wf-${w.id}`} className="mt-6 scroll-mt-28 rounded-xl border border-border p-4">
              <h3 id={`wf-${w.id}`} className="font-medium">
                {w.title}
              </h3>
              <p className="mt-1 text-body-sm text-muted-foreground">{w.summary}</p>
              <ol className="mt-3 space-y-3">
                {w.stages.map((s, i) => (
                  <li key={s.title} className="grid gap-1 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:gap-4">
                    <span className="min-w-0 font-medium [overflow-wrap:anywhere]">
                      <span className="me-2 font-mono text-body-sm text-primary">{String(i + 1).padStart(2, "0")}</span>
                      {s.title}
                    </span>
                    <ul className="min-w-0 divide-y divide-border/60">
                      {s.rows.map((name) => (
                        <RowItem key={name} row={ROWS[name]!} />
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </section>
      )}

      <section aria-labelledby="available" className="mt-16">
        <SectionHead index="02" label="Available now" meta={`${d.components.length} components`} />
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
          <SectionHead index="03" label="Planned" meta={`${planned.length}`} />
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

      <section aria-labelledby="related" className="mt-16">
        <SectionHead index={planned.length > 0 ? "04" : "03"} label="Related" />
        <h2 id="related" className="mt-4 text-xl font-semibold tracking-tight">
          Related capabilities
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {d.capabilities.map((id) => (
            <li key={id}>
              <Link href={`/capabilities#${id}`} className={linkClass}>
                {capabilityById(id)!.title}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-body-sm">
          <Link href={`/components?domain=${d.id}`} className={linkClass}>
            Filter the component catalogue to {d.title}
          </Link>
        </p>
      </section>
    </div>
  );
}
