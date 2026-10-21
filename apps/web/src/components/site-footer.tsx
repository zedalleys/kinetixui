import Link from "next/link";
import { Layers } from "lucide-react";
import { siteConfig } from "@/lib/site";

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Docs",
    links: [
      { label: "Introduction", href: "/docs" },
      { label: "Installation", href: "/docs/installation" },
      { label: "Theming", href: "/docs/theming" },
      { label: "Accessibility", href: "/docs/accessibility" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Components", href: "/components" },
      { label: "Blocks", href: "/blocks" },
      { label: "Use cases", href: "/capabilities" },
      { label: "Charts", href: "/charts" },
      { label: "Create", href: "/create" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "Changelog", href: "/docs/changelog" },
      { label: "Source", href: siteConfig.repo },
      { label: "Design source", href: siteConfig.figma },
    ],
  },
];

/*
  The footer is a print surface: the panel is the `accent` token, and the engraving (design-assets/) is printed
  on that same `accent` paper, so the plate's sky is the panel. There are two plates of the one scene, one per
  theme, each inked in that theme's values of the same tokens:
  - light, by day: `azure.1000`/`950` ink and `azure.900` mid-tones (the ramp `primary` comes from) on light
    `accent`, highlights in `background`;
  - dark, at evening: dark `accent` (blue.700) sky with stars and a dusk glow on the horizon, the land in
    `background` (blue.900) silhouettes with moonlit edges. Not an inversion — that reads as a photographic
    negative — but the same tones re-lit for night.
  The mark matches the header (`primary`), headings are `foreground` and the secondary text is `foreground` at
  70%: 18.2:1 and 7.3:1 on light `accent`, 14.7:1 and 7.8:1 on dark. `muted-foreground` is 4.8:1 on light
  `accent`, so it is not used.

  The sheet itself — the `accent` panel and the grain tile over it — is `.kx-paper` in globals.css, shared so
  the next surface to print on this paper cannot drift from this one. `pnpm check:engraving` measures it, and
  the four contrast ratios above are what that gate reproduces.
*/
const focusRing =
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-accent";

export function SiteFooter() {
  return (
    <footer className="kx-paper overflow-hidden">
      <div className="relative z-10 mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        {/*
          Four columns from `lg`, not `md`, and `minmax(0,1fr)` rather than `1fr`.

          A bare `1fr` track has `min-width: auto`, so it cannot shrink below its own min-content. At 768 — which
          is exactly where `md` turned this into four columns — the three link columns got about 133px each while a
          single word like "Changelog" needs 144px at the reader's doubled text size, so the footer pushed every
          page sideways by 176px. `minmax(0,1fr)` lets a track yield; moving the breakpoint to `lg` gives the
          columns room to exist at all before they are asked to. Below `lg` the footer stacks, which reflows.
        */}
        <div className="grid gap-10 pb-12 pt-16 lg:grid-cols-[2fr_repeat(3,minmax(0,1fr))] lg:pt-20">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
                <Layers className="size-[18px]" />
              </span>
              <span className="font-display text-wordmark font-bold uppercase tracking-[0.18em]">
                Kinetix<span className="text-primary">ui</span>
              </span>
            </div>
            {/* The canonical tagline, not a second copy of it: this paragraph carried the retired
                "One token architecture, in motion across every platform" long after the hero dropped it. */}
            <p className="mt-5 max-w-sm text-base leading-relaxed text-foreground/70">
              {siteConfig.tagline} This site is built with it.
            </p>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <p className="mb-4 text-sm font-semibold">{col.title}</p>
              <ul className="grid gap-3 text-sm">
                {col.links.map((l) => {
                  const external = l.href.startsWith("http");
                  return (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                        className={`text-foreground/70 transition-colors hover:text-foreground ${focusRing}`}
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

        <div className="flex flex-col gap-2 border-t border-border py-6 text-body-sm text-foreground/70 sm:flex-row sm:items-center sm:justify-between">
          {/* The licence line and the creator credit are one group, so the bar keeps its two-sided balance.
              A third top-level item would be centred by `justify-between`, which is more prominence than a
              by-line should take next to the product's own copyright. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p>© 2026 KinetixUI — beta</p>
            {/* Underlined rather than colour-only: this is a link inside a text block, which is exactly the
                shape that tripped `link-in-text-block` on the homepage. It inherits the bar's muted tone, so
                it reads as a credit and not as a call to action. */}
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
          <p className="font-mono">tokens · DTCG → Style Dictionary</p>
        </div>
      </div>

      {/* Decorative engraving — an <img alt=""> rather than a CSS background so it can lazy-load: the footer is
          on every route, and a background is fetched as soon as styles resolve, even for a visitor who never
          scrolls this far. The plate is 3:1; its box keeps that ratio (so nothing shifts when it loads) and is
          floored for phones, where `object-cover` crops the edges — the oasis sits in the middle 30–70% of the
          plate for that reason — so `sizes` floors at the ~720px a 240px-tall crop is wide. It is pulled up under
          the bottom bar so the bar sits in the plate's empty sky, and the top fades into the panel. The plate for
          the other theme is `display: none`, which a lazy image never fetches, so each visitor downloads one. */}
      <div
        aria-hidden
        className="relative -mt-[5vw] h-[clamp(240px,33.333vw,800px)] [mask-image:linear-gradient(to_bottom,transparent,#000_14%)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a static decorative image with its own srcset; no optimisation to gain */}
        <img
          src="/footer/arabian-landscape-1920.webp"
          srcSet="/footer/arabian-landscape-960.webp 960w, /footer/arabian-landscape-1920.webp 1920w, /footer/arabian-landscape-2880.webp 2880w, /footer/arabian-landscape-3840.webp 3840w, /footer/arabian-landscape-5760.webp 5760w"
          sizes="max(100vw, 720px)"
          alt=""
          width={5760}
          height={1920}
          loading="lazy"
          decoding="async"
          className="size-full object-cover object-bottom dark:hidden"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
        <img
          src="/footer/arabian-landscape-evening-1920.webp"
          srcSet="/footer/arabian-landscape-evening-960.webp 960w, /footer/arabian-landscape-evening-1920.webp 1920w, /footer/arabian-landscape-evening-2880.webp 2880w, /footer/arabian-landscape-evening-3840.webp 3840w, /footer/arabian-landscape-evening-5760.webp 5760w"
          sizes="max(100vw, 720px)"
          alt=""
          width={5760}
          height={1920}
          loading="lazy"
          decoding="async"
          className="hidden size-full object-cover object-bottom dark:block"
        />
      </div>
    </footer>
  );
}
