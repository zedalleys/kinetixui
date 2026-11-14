import Link from "next/link";
import { ArrowUp } from "lucide-react";

import { BrandMark } from "./brand-mark";
import { siteConfig } from "@/lib/site";
import { PLATFORMS } from "@/lib/platform-parity";
import { ctaAttrs } from "@/lib/analytics-surfaces";

/**
 * `cta` marks a link whose click is a product CTA. Only the path to installation carries one: the footer is on
 * every route, so tagging each link here would attribute ordinary navigation as intent. Plain data attributes,
 * read by the provider's delegated listener, so this file stays a server component.
 */
type FooterLink = { label: string; href: string; cta?: ReturnType<typeof ctaAttrs> };

/*
  Four groups, not every documentation page. The register is a map of the site's four real axes — what it is,
  where it runs, what you can look at, and who keeps it — and every href below is a route that exists in
  `apps/web/src/app`. There is deliberately no React entry under Platforms: React has no page of its own
  because /docs/installation IS the React path, and a link labelled "React" would have to invent one.
*/
const GROUPS: { title: string; id: string; links: FooterLink[] }[] = [
  {
    title: "Docs",
    id: "footer-docs",
    links: [
      { label: "Introduction", href: "/docs" },
      { label: "Installation", href: "/docs/installation", cta: ctaAttrs("footer", "installation", "footer") },
      { label: "Theming", href: "/docs/theming" },
      { label: "Accessibility", href: "/docs/accessibility" },
      { label: "RTL", href: "/docs/rtl" },
    ],
  },
  {
    title: "Platforms",
    id: "footer-platforms",
    links: [
      { label: "Coverage", href: "/docs/platforms" },
      { label: "Angular", href: "/docs/angular" },
      { label: "SwiftUI", href: "/docs/swiftui" },
      { label: "Compose", href: "/docs/compose" },
      { label: "Flutter", href: "/docs/flutter" },
    ],
  },
  {
    title: "Explore",
    id: "footer-explore",
    links: [
      { label: "Components", href: "/components" },
      { label: "Blocks", href: "/blocks" },
      { label: "Charts", href: "/charts" },
      { label: "Use cases", href: "/capabilities" },
      { label: "Create", href: "/create" },
    ],
  },
  {
    title: "Project",
    id: "footer-project",
    links: [
      { label: "Changelog", href: "/docs/changelog" },
      { label: "Source", href: siteConfig.repo },
      { label: "Design source", href: siteConfig.figma },
    ],
  },
];

/*
  THE CLOSING STATEMENT.

  It is a `<p>`, not a heading, and the group titles are `<p>`s too, each naming its own list through
  `aria-labelledby`. That is a deliberate accessibility decision rather than the easy one:

  - The statement is a brand line, not a section of the document. Putting it in the outline would announce
    a second-level section on all 740 of the site's views.
  - Group titles as `<h3>` would be an axe `heading-order` violation on any page whose deepest heading is
    `h1` — a fifth of the routes here — because `h1 -> h3` skips a level. Group titles as `<h2>` would be
    legal everywhere, but it puts "Docs / Platforms / Explore / Project" into the outline of every page.
  - `aria-labelledby` on each `<ul>` gives a screen reader the grouping without either cost: the list is
    announced with its name and its item count.

  The sentence itself claims nothing. The positioning copy the site actually owns is `siteConfig.tagline`,
  which is derived (it counts the platforms) and is already on the homepage and in every page title; a second
  copy here is the thing this file carried for weeks after the hero dropped it. "One design language. Every
  platform." was considered and rejected: "every platform" invites exactly the parity reading the position
  rejects, which is why `siteConfig.tagline` counts them instead.
*/
const STATEMENT = "Built for the details that make interfaces feel right.";

const focusRing =
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function SiteFooter() {
  return (
    <footer className="kx-footer border-border bg-muted/30 text-foreground">
      {/* The seam is the footer's top edge: a hairline with the lockup's proportions ticked onto it in
          `primary`. Decorative, so it carries no name and no role. */}
      <div aria-hidden className="kx-footer-seam" />

      {/* The weave: hairline diagonals measured off the mark, drawn in CSS, faded out before the nav.
          It replaces the two Arabian engraving plates and the paper grain this footer shipped on `main`,
          which `DESIGN.md` excludes from the Kinetic Weave refresh. Nothing is fetched for it. */}
      <div aria-hidden className="kx-footer-weave" />

      <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        {/* Layer 1 — the closing statement. Two columns from `lg`, bottom-aligned so the statement and the
            note share a baseline band rather than floating in the same box. */}
        <div className="grid gap-6 pb-14 pt-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end lg:gap-12 lg:pb-20 lg:pt-24">
          <p className="kx-footer-statement font-display font-semibold">{STATEMENT}</p>
          {/* The one factual line, and every number in it is derived: the platform count from the parity
              manifest, the version and licence from @kinetixui/ui's own package.json. */}
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground lg:pb-1">
            {siteConfig.name} is a design system for teams shipping one product across {PLATFORMS.length}{" "}
            platforms. Every coverage claim on this site is generated from the repository and checked in CI.
            This site is built with it.
          </p>
        </div>

        {/* Layer 2 — the navigation register. Hairline rules between the columns, no boxes. */}
        <nav aria-label="Footer" className="border-t border-border py-12 lg:py-14">
          <div className="kx-footer-register">
            {GROUPS.map((group) => (
              <div key={group.id} className="kx-footer-group">
                <p id={group.id} className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {group.title}
                </p>
                <ul aria-labelledby={group.id} className="mt-5 grid gap-3.5 text-sm">
                  {group.links.map((l) => {
                    const external = l.href.startsWith("http");
                    return (
                      <li key={l.label}>
                        <Link
                          href={l.href}
                          {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                          {...(l.cta ?? {})}
                          className={`kx-footer-link text-foreground/75 transition-colors hover:text-foreground ${focusRing}`}
                        >
                          {l.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* Layer 3 — the utility strip. Three groups on one rule: the lockup, the record, the way back up. */}
        <div className="flex flex-col gap-6 border-t border-border py-8 text-body-sm text-foreground/70 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="flex items-center gap-2.5">
            <BrandMark className="size-7 shrink-0" />
            <span className="font-display text-wordmark font-bold tracking-[-0.035em] text-foreground">
              Kinetix<span className="text-brand">UI</span>
            </span>
          </div>

          {/* The licence line and the creator credit are one group, so the strip keeps its three-part
              balance. A fourth top-level item would be spread by `justify-between`, which is more
              prominence than a by-line should take next to the product's own copyright. */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <p>© 2026 KinetixUI — beta</p>
            {/* Derived from @kinetixui/ui's package.json, both of them: a typed version is a wrong
                version the day after a release, and a typed licence is a claim about a legal document. */}
            <p className="font-mono text-xs">
              v{siteConfig.version} · {siteConfig.license}
            </p>
            {/* Underlined rather than colour-only: this is a link inside a text block, which is exactly the
                shape that tripped `link-in-text-block` on the homepage. It inherits the strip's muted tone,
                so it reads as a credit and not as a call to action. */}
            <p>
              Created by{" "}
              <Link
                href="https://zedalleys.com/"
                target="_blank"
                rel="noreferrer"
                className={`underline underline-offset-4 transition-colors hover:text-foreground ${focusRing}`}
              >
                Zed Alleys
              </Link>
            </p>
          </div>

          {/* Back to the top of the page. A plain in-page anchor to the `<main>` the skip link already
              targets, so it works with no JavaScript and invents no id: `globals.css` gives `html` smooth
              scrolling and already turns it off under `prefers-reduced-motion`, which makes this an instant
              jump for a reader who asked for less motion. The arrow is decorative; the text is the name. */}
          <Link
            href="#main-content"
            className={`group inline-flex items-center gap-2 self-start whitespace-nowrap border border-border px-3.5 py-2 text-xs font-medium transition-colors hover:border-primary hover:text-foreground lg:self-auto ${focusRing}`}
          >
            <ArrowUp aria-hidden className="size-3.5" />
            Back to top
          </Link>
        </div>
      </div>
    </footer>
  );
}
