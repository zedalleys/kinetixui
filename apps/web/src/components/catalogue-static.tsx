import Link from "next/link";
import { componentDocs } from "@/lib/site";
import { CATEGORY_ORDER, categoryOf } from "@/lib/component-registry";
import { PLATFORMS, PLATFORM_ABBR, platformsFor } from "@/lib/platform-parity";

/**
 * The catalogue a reader gets without JavaScript — and the first thing every reader gets, before
 * hydration.
 *
 * `ComponentGallery` is a client component that reads `useSearchParams()`, so during the static
 * prerender Next.js replaces its whole subtree with the enclosing Suspense fallback. The fallback
 * *is* the served document for /components: whatever it renders is what a reader without
 * JavaScript, and every crawler, actually sees. It used to render the single word "Loading…", and
 * the served HTML was measured carrying none of the catalogue's documentation links and 26
 * characters of main content — so the catalogue had no discovery path at all without JavaScript.
 *
 * This is deliberately a server component with no interactivity: the filters, the search box and
 * the live previews are the progressive enhancement, and they arrive with the client gallery, which
 * replaces this subtree wholesale. Because a Suspense fallback is swapped out rather than hydrated,
 * there is no duplicate link, no hydration mismatch and no second copy of the list in the DOM.
 *
 * It is not a visual placeholder and must not be reduced to one: a skeleton would restore the
 * defect. Every entry here is a real `<a href>` to a real documentation route.
 */

const slugOf = (href: string) => href.split("/").pop() ?? "";

const ENTRIES = componentDocs.map((item) => {
  const slug = slugOf(item.href);
  return { ...item, slug, category: categoryOf(slug), platforms: platformsFor(slug) };
});

export function CatalogueStatic() {
  return (
    <div data-catalogue-static="" className="mt-8">
      {/*
        Said once, in prose, rather than repeated per card: which abbreviations the tags use. The
        interactive gallery carries the same legend in its own intro.
      */}
      <p className="max-w-2xl text-muted-foreground">
        {ENTRIES.length} catalogue entries across {CATEGORY_ORDER.length} categories. The tags on each entry mark
        which libraries carry it today —{" "}
        <span className="font-mono text-label-md uppercase tracking-[0.1em]">
          {PLATFORMS.map((p) => PLATFORM_ABBR[p]).join(" · ")}
        </span>
        .
      </p>

      {CATEGORY_ORDER.map((cat, i) => {
        const rows = ENTRIES.filter((e) => e.category === cat);
        if (rows.length === 0) return null;
        return (
          <section key={cat} aria-labelledby={`static-cat-${i}`} className="mt-10">
            <h2
              id={`static-cat-${i}`}
              className="font-mono text-label-md uppercase tracking-[0.12em] text-muted-foreground"
            >
              <span className="text-foreground">{String(i + 1).padStart(2, "0")}</span> {cat}{" "}
              <span className="tabular-nums">({rows.length})</span>
            </h2>
            <ul className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((e) => (
                <li key={e.href} className="min-w-0">
                  {/*
                    `flex-wrap` and no fixed row height: the title and the platform tags are both
                    sized in rem, so at the reader's doubled text size the row needs to grow and
                    wrap rather than clip or push the page sideways.
                  */}
                  <Link
                    href={e.href}
                    className="group flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-sm py-1.5 text-foreground underline-offset-4 hover:underline hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="min-w-0">{e.title}</span>
                    {e.platforms.length > 0 && (
                      <span className="font-mono text-label-md uppercase tracking-[0.1em] text-muted-foreground">
                        {e.platforms.map((p) => PLATFORM_ABBR[p]).join(" ")}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
