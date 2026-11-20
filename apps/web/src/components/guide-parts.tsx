import Link from "next/link";
import { Button } from "@kinetixui/ui";
import { Callout } from "./callout";
import { GUIDES, PILLAR, guide, guideHref, guideJsonLd, isPublished } from "@/lib/guides";

const link = "font-medium text-primary underline underline-offset-4";

/**
 * Under a guide's H1: whether it is a draft, and where it sits in the cluster. A draft says so to anyone who reaches
 * it by URL (it is noindex and unlinked, but not hidden), and the date line appears only for a published guide.
 */
export function GuideStatus({ slug }: { slug: string }) {
  const g = guide(slug);
  return (
    <>
      <p data-guide-meta className="mt-1 text-sm text-muted-foreground">
        Guide
        {g.role === "supporting" ? (
          <>
            {" "}· part of <Link href={guideHref(PILLAR.slug)} className={link}>{PILLAR.title}</Link>
          </>
        ) : null}
        {isPublished(g) && g.datePublished ? (
          <>
            {" "}· Published <time dateTime={g.datePublished}>{g.datePublished}</time>
          </>
        ) : null}
      </p>
      {!isPublished(g) ? (
        <Callout>
          <strong>Draft.</strong> This guide is under review and is not published or indexed yet.
        </Callout>
      ) : null}
    </>
  );
}

/** The guide's one primary call to action, specific to the question it answers. */
export function GuideCta({ slug }: { slug: string }) {
  const { cta } = guide(slug);
  return (
    <p className="mt-10">
      <Button asChild size="lg" className="h-auto min-h-11 max-w-full whitespace-normal py-2 text-center">
        <Link href={cta.href} data-guide-cta>
          {cta.label}
        </Link>
      </Button>
    </p>
  );
}

/**
 * The foot of a guide: the other guides in the cluster (each by its title), then the article structured data, which
 * exists only for a published guide. Draft guides may link each other: none of them is indexable. A published guide
 * links only published guides, so publishing one never exposes a draft (`check:editorial` draft-linked).
 */
export function GuideFooter({ slug }: { slug: string }) {
  const published = isPublished(guide(slug));
  const others = GUIDES.filter((g) => g.slug !== slug && (!published || isPublished(g)));
  const ld = guideJsonLd(slug);
  return (
    <>
      {others.length > 0 ? (
        <nav aria-labelledby="related-reading" data-guide-related className="mt-12 border-t border-border pt-6">
          <h2 id="related-reading" className="text-base font-semibold tracking-tight">
            Related reading
          </h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {others.map((g) => (
              <li key={g.slug}>
                <Link href={guideHref(g.slug)} className={link}>
                  {g.title}
                </Link>
              </li>
            ))}
            {/* the index, so the cluster has one page that lists it and /guides is not an orphan route */}
            <li>
              <Link href="/guides" className={link}>
                All guides
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
      {ld ? (
        <script
          type="application/ld+json"
          // built from the typed registry at build time; no user input reaches it
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ) : null}
    </>
  );
}

/**
 * A "Further reading" line on a docs page, pointing at guides. It renders only the PUBLISHED guides it names, so a
 * docs page can name a draft today and start linking it the day it is published, without linking an unfinished,
 * noindex page in the meantime.
 */
export function FurtherReading({ guides }: { guides: string[] }) {
  const shown = guides.map(guide).filter(isPublished);
  if (shown.length === 0) return null;
  return (
    <p data-further-reading className="leading-relaxed [&:not(:first-child)]:mt-5">
      Further reading:{" "}
      {shown.map((g, i) => (
        <span key={g.slug}>
          {i > 0 ? "; " : null}
          <Link href={guideHref(g.slug)} className={link}>
            {g.title}
          </Link>
        </span>
      ))}
      .
    </p>
  );
}
