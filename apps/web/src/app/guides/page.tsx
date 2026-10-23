import type { Metadata } from "next";
import Link from "next/link";
import { PILLAR, guideHref, publishedGuides } from "@/lib/guides";
import { pageMetadata } from "@/lib/seo";

/**
 * /guides — the index of the long-form cluster.
 *
 * Until now the four guides had no page of their own to be read from: each is named by the one docs page whose
 * subject it continues (`<FurtherReading>` on /docs/platforms, /docs/tokens, /docs/accessibility and
 * /docs/installation), and they link each other, but nothing showed the cluster as a set and `/guides` itself
 * returned a 404. A reader who finished one guide could reach the others; a reader who wanted to know what had
 * been written could not.
 *
 * Published guides only, from the registry, so this page can never be the thing that links a draft: `lib/guides.ts`
 * explains why that matters, and `check:editorial`'s draft-linked rule enforces it. The pillar is listed first and
 * says so, because the supporting guides are written to be read after it.
 */
export const metadata: Metadata = pageMetadata({
  path: "/guides",
  title: "Guides",
  description:
    "Every long-form guide published here, what each one answers and the date it went live. Written for a team working out whether, and how, to adopt a component library that has to serve more than one platform.",
});

const link = "font-medium text-primary underline underline-offset-4";

export default function GuidesIndexPage() {
  const published = publishedGuides();
  // the pillar first, then the rest in registry order: the supporting guides assume it has been read
  const ordered = [...published].sort((a, b) => Number(b.role === "pillar") - Number(a.role === "pillar"));

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">Guides</h1>
      <p className="mt-3 text-muted-foreground">
        Longer pieces that answer one question each, in more depth than a documentation page. They are written to be
        read before a decision, not during an implementation — the reference material lives in{" "}
        <Link href="/docs" className={link}>
          the docs
        </Link>
        .
      </p>

      <ul className="mt-10 grid gap-8">
        {ordered.map((g) => (
          <li key={g.slug}>
            <h2 className="text-xl font-semibold tracking-tight">
              <Link href={guideHref(g.slug)} className={link}>
                {g.title}
              </Link>
            </h2>
            <p className="mt-1 font-mono text-label-md uppercase tracking-[0.1em] text-muted-foreground">
              {g === PILLAR ? "Start here" : "Supporting"}
              {g.datePublished ? (
                <>
                  {" · "}
                  <time dateTime={g.datePublished}>{g.datePublished}</time>
                </>
              ) : null}
            </p>
            <p className="mt-2 text-muted-foreground">{g.description}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
