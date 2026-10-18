/**
 * Server-rendered pieces of the business discovery pages (/capabilities and /use-cases/<domain>).
 *
 * Status is always said in words ("Available", "Partial", "Planned"), never by colour or border alone, and a planned
 * row is never a link: there is nothing to link to. Platform coverage is the same `PlatformBadges` row the catalogue
 * cards draw, read from components.manifest.json, so these pages cannot claim a platform the catalogue does not.
 */
import Link from "next/link";
import { PlatformBadges } from "@/components/platform-badges";
import { blocks } from "@/lib/blocks";
import { ROWS, ships, type Counts, type DiscoveryRow, type RowStatus, type Workflow } from "@/lib/business-discovery";
import { STATUS } from "@/lib/component-status";
import { componentDocs } from "@/lib/site";
import { cn } from "@/lib/utils";

const TITLE = new Map(componentDocs.map((c) => [c.href.split("/").pop()!, c.title]));
const BLOCK_TITLE = new Map(blocks.map((b) => [b.slug, b.title]));

export const componentTitle = (slug: string) => TITLE.get(slug) ?? slug;
export const blockTitle = (slug: string) => BLOCK_TITLE.get(slug) ?? slug;

export const linkClass =
  "text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const STATUS_WORD: Record<RowStatus, string> = { existing: "Available", partial: "Partial", planned: "Planned" };

/** A status in words, with a quieter dashed outline for planned so the shape differs too, not just the colour. */
export function StatusTag({ status }: { status: RowStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded border px-1.5 font-mono text-label-md uppercase tracking-[0.1em]",
        status === "existing" && "border-success/50 text-success",
        status === "partial" && "border-warning/50 text-foreground",
        status === "planned" && "border-dashed border-border text-muted-foreground",
      )}
    >
      {STATUS_WORD[status]}
    </span>
  );
}

/** "4 available · 4 partial · 18 planned" — counts of roadmap capabilities, never of components. */
export function countsLine(c: Counts) {
  return [`${c.existing} available`, `${c.partial} partial`, `${c.planned} planned`].join(" · ");
}

/** Comma-separated links to component pages, or block anchors. */
export function ComponentLinks({ slugs, kind = "component" }: { slugs: string[]; kind?: "component" | "block" }) {
  return (
    <>
      {slugs.map((slug, i) => (
        <span key={slug}>
          {i > 0 && ", "}
          <Link href={kind === "block" ? `/blocks#${slug}` : `/docs/components/${slug}`} className={linkClass}>
            {kind === "block" ? blockTitle(slug) : componentTitle(slug)}
          </Link>
        </span>
      ))}
    </>
  );
}

/**
 * One roadmap row as a reader sees it: its name, its status in words, and — only if it ships — what to open.
 * A partial row says it is partial; the roadmap (BUSINESS-CAPABILITY-ROADMAP.md) carries what is missing.
 */
export function RowItem({ row }: { row: DiscoveryRow }) {
  const shipped = ships(row);
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-1.5">
      {/* row names are long CamelCase lists ("MoneyMovementSummary / FeeBreakdown"); at 200% text one word is wider
          than a 320px phone, so they may break anywhere rather than push the page sideways */}
      <span className={cn("min-w-0 [overflow-wrap:anywhere]", !shipped && "text-muted-foreground")}>{row.name}</span>
      <StatusTag status={row.status} />
      {shipped && (row.components.length > 0 || row.blocks.length > 0 || row.iot.length > 0) && (
        <span className="min-w-0 basis-full text-body-sm text-muted-foreground [overflow-wrap:anywhere] sm:basis-auto">
          {row.components.length > 0 && <ComponentLinks slugs={row.components} />}
          {row.components.length > 0 && row.blocks.length > 0 && "; "}
          {row.blocks.length > 0 && (
            <>
              block: <ComponentLinks slugs={row.blocks} kind="block" />
            </>
          )}
          {row.iot.length > 0 && (
            <>
              {(row.components.length > 0 || row.blocks.length > 0) && "; "}
              <Link href="/docs/iot" className={linkClass}>
                @kinetixui/iot
              </Link>{" "}
              ({row.iot.length} {row.iot.length === 1 ? "export" : "exports"})
            </>
          )}
        </span>
      )}
    </li>
  );
}

export const rowsOf = (names: string[]) => names.map((n) => ROWS[n]!).filter(Boolean);

/** A component as a small card: its name (the link), its lifecycle status if not stable, and its platform row. */
export function ComponentCard({ slug }: { slug: string }) {
  const status = STATUS[slug];
  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-3 [overflow-wrap:anywhere]">
      <span className="flex flex-wrap items-center gap-1.5">
        <Link href={`/docs/components/${slug}`} className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {componentTitle(slug)}
        </Link>
        {status && (
          <span className="rounded border border-info/40 px-1 font-mono text-label-md uppercase tracking-[0.1em] text-info">{status}</span>
        )}
      </span>
      <PlatformBadges slug={slug} />
    </li>
  );
}

/* ------------------------------------------------------------------------------------------------- workflows */

/**
 * A workflow's stages in order, each with its status in words. `detailed` adds the roadmap rows of every stage (the
 * use-case page); without it the list is the compact path the hub shows.
 */
export function WorkflowStages({ workflow, detailed = false }: { workflow: Workflow; detailed?: boolean }) {
  return (
    <ol className={cn("mt-3", detailed ? "space-y-3" : "space-y-1.5")}>
      {workflow.stages.map((s, i) => (
        <li key={s.title} className={cn(detailed && "grid gap-1 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-4")}>
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 font-medium [overflow-wrap:anywhere]">
            <span className="font-mono text-body-sm text-primary">{String(i + 1).padStart(2, "0")}</span>
            <span className="min-w-0">{s.title}</span>
            <StatusTag status={s.status} />
          </span>
          {detailed && (
            <ul className="min-w-0 divide-y divide-border/60">
              {s.rows.map((name) => (
                <RowItem key={name} row={ROWS[name]!} />
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
