"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { BusinessContext as Context } from "@/lib/business-discovery";

/** How many planned capabilities to name before pointing at the roadmap for the rest. */
const BUILDS_TOWARD_SHOWN = 5;

const linkClass = "text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // the term wraps above its value below `sm` so the row survives a narrow column at 200% text
    <div className="flex flex-wrap gap-x-3 gap-y-1 py-2">
      <dt className="font-mono text-label-md uppercase tracking-[0.12em] text-muted-foreground sm:w-36 sm:shrink-0">{label}</dt>
      <dd className="min-w-0 text-body-sm [overflow-wrap:anywhere] sm:flex-1 sm:basis-0">{children}</dd>
    </div>
  );
}

/** "a, b and c" with each item rendered by `render`. */
function Inline<T>({ items, render }: { items: T[]; render: (item: T) => React.ReactNode }) {
  return (
    <>
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && (i === items.length - 1 ? " and " : ", ")}
          {render(item)}
        </span>
      ))}
    </>
  );
}

/**
 * "In applications", at the foot of a component page: the roadmap layer, the business capabilities and domains the
 * component serves, the workflows that use it, the blocks built from it, and the planned capabilities that will build
 * on it, each planned one labelled as such in words.
 *
 * The data is computed on the server by the docs layout (`businessContexts()` plus the blocks' own imports) and passed
 * in, so the discovery index never reaches the browser. Renders nothing outside `/docs/components/*` or for a
 * component with nothing to say beyond "a core primitive".
 */
export function BusinessContext({
  contexts,
  blocks,
}: {
  contexts: Record<string, Context>;
  blocks: Record<string, { slug: string; title: string }[]>;
}) {
  const pathname = usePathname();
  if (!pathname.startsWith("/docs/components/")) return null;
  const slug = pathname.split("/").pop()!;
  const ctx = contexts[slug];
  const usedInBlocks = blocks[slug] ?? [];
  if (!ctx && usedInBlocks.length === 0) return null;
  const more = ctx ? ctx.buildsToward.length - BUILDS_TOWARD_SHOWN : 0;

  return (
    <section aria-labelledby="business-context" data-business-context className="mt-12 border-t border-border pt-6">
      <h2 id="business-context" className="text-base font-semibold tracking-tight">
        In applications
      </h2>
      <dl className="mt-2 divide-y divide-border/60">
        {ctx && (
          <Row label="Layer">
            {ctx.layer}
            {ctx.target ? ` · ${ctx.target}` : ""}
          </Row>
        )}
        {ctx && ctx.capabilities.length > 0 && (
          <Row label="Capabilities">
            <Inline
              items={ctx.capabilities}
              render={(c) => (
                <Link href={`/capabilities#${c.id}`} className={linkClass}>
                  {c.label}
                </Link>
              )}
            />
          </Row>
        )}
        {ctx && ctx.domains.length > 0 && (
          <Row label="Business domains">
            <Inline
              items={ctx.domains}
              render={(d) =>
                d.href ? (
                  <Link href={d.href} className={linkClass}>
                    {d.label}
                  </Link>
                ) : (
                  d.label
                )
              }
            />
          </Row>
        )}
        {ctx && ctx.workflows.length > 0 && (
          <Row label="Used in workflows">
            <Inline
              items={ctx.workflows}
              render={(w) => (
                <>
                  {w.href ? (
                    <Link href={w.href} className={linkClass}>
                      {w.label}
                    </Link>
                  ) : (
                    w.label
                  )}{" "}
                  <span className="text-muted-foreground">({w.domain})</span>
                </>
              )}
            />
          </Row>
        )}
        {usedInBlocks.length > 0 && (
          <Row label="Used in blocks">
            <Inline
              items={usedInBlocks}
              render={(b) => (
                <Link href={`/blocks#${b.slug}`} className={linkClass}>
                  {b.title}
                </Link>
              )}
            />
          </Row>
        )}
        {ctx && ctx.buildsToward.length > 0 && (
          <Row label="Planned on top of it">
            <ul className="flex flex-wrap gap-1.5">
              {ctx.buildsToward.slice(0, BUILDS_TOWARD_SHOWN).map((name) => (
                <li key={name} className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-md border border-dashed border-border px-2 py-0.5">
                  {name}
                  <span className="font-mono text-label-md uppercase tracking-[0.1em] text-muted-foreground">planned</span>
                </li>
              ))}
            </ul>
            {more > 0 && (
              <p className="mt-1.5 text-muted-foreground">
                and {more} more on the{" "}
                <Link href="/capabilities" className={linkClass}>
                  capability index
                </Link>
                . Planned means not built: none of these ships today.
              </p>
            )}
            {more <= 0 && <p className="mt-1.5 text-muted-foreground">Planned means not built: none of these ships today.</p>}
          </Row>
        )}
      </dl>
    </section>
  );
}
