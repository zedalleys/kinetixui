import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { routeMetadata } from "@/lib/route-seo";
import { SectionHead } from "@/components/section-head";
import { ComponentLinks, RowItem, countsLine, linkClass, rowsOf } from "@/components/discovery-parts";
import { BUSINESS_NEEDS, CAPABILITIES, domainHref, ships } from "@/lib/business-discovery";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = routeMetadata("/capabilities");

/** Capability groups with something that ships today get a section; the rest are named once, as roadmap only. */
const SHIPPING = CAPABILITIES.filter((c) => c.counts.existing + c.counts.partial > 0);
const ROADMAP_ONLY = CAPABILITIES.filter((c) => c.counts.existing + c.counts.partial === 0);

/** Where a business need sends a reader: its page if it has one, else the catalogue filtered to it, else the IoT module. */
function needHref(d: (typeof BUSINESS_NEEDS)[number]): { href: string; label: string } {
  if (d.page) return { href: domainHref(d.id), label: `Explore ${d.title}` };
  if (d.components.length) return { href: `/components?domain=${d.id}`, label: `Browse its ${d.components.length} catalogue entries` };
  return { href: "/iot", label: "Open the IoT module" };
}

/**
 * /capabilities — "What can I build with KinetixUI?"
 *
 * Every number and list on this page is read from discovery-index.json (generated from
 * docs/business-capabilities.json), so it moves when a capability row's status or evidence does, and a planned row
 * is never shown as something to install. The page does not mention Pro: Pro-candidate rows never reach the index
 * (marketing/STRATEGY.md rule 7).
 */
export default function CapabilitiesPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow">
        <Link href="/components" className="hover:text-foreground">
          Components
        </Link>{" "}
        / Capabilities
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">What can I build with KinetixUI?</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        The catalogue by the job it does rather than the part&apos;s name. Each capability below lists what ships today,
        what ships in part, and what is planned. <strong className="font-medium text-foreground">Planned means not built</strong>
        : it is on the{" "}
        <a href={`${siteConfig.repo}/blob/main/docs/BUSINESS-CAPABILITY-ROADMAP.md`} className={linkClass}>
          business capability roadmap
        </a>{" "}
        and nothing here installs it.
      </p>

      <section aria-labelledby="business-needs" className="mt-12">
        <SectionHead index="01" label="By business need" meta={`${BUSINESS_NEEDS.length} domains`} />
        <h2 id="business-needs" className="mt-4 text-xl font-semibold tracking-tight">
          Explore by business need
        </h2>
        <p className="mt-2 max-w-2xl text-body-sm text-muted-foreground">
          Domains with at least one capability that ships today. Counts are roadmap capabilities, not components.
        </p>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BUSINESS_NEEDS.map((d) => {
            const next = needHref(d);
            return (
              <li key={d.id} className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-4 [overflow-wrap:anywhere]">
                <h3 className="font-medium">{d.title}</h3>
                <p className="mt-1 text-body-sm text-muted-foreground">{d.summary}</p>
                <p className="mt-3 font-mono text-label-md uppercase tracking-[0.1em] text-muted-foreground">{countsLine(d.counts)}</p>
                {d.components.length > 0 && (
                  <p className="mt-2 text-body-sm">
                    <span className="text-muted-foreground">Components: </span>
                    <ComponentLinks slugs={d.components.slice(0, 5)} />
                    {d.components.length > 5 && <span className="text-muted-foreground"> and {d.components.length - 5} more</span>}
                  </p>
                )}
                <Link
                  href={next.href}
                  className="mt-auto inline-flex items-center gap-1.5 pt-4 text-body-sm font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {next.label}
                  <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="capability-groups" className="mt-16">
        <SectionHead index="02" label="By capability" meta={`${SHIPPING.length} with something shipping`} />
        <h2 id="capability-groups" className="mt-4 text-xl font-semibold tracking-tight">
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
                    <Link href={`/components?capability=${c.id}`} className={linkClass}>
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
    </div>
  );
}
