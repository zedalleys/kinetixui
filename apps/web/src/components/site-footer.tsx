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
  The footer is a fixed print surface, not a themed one: the engraving (design-assets/) is a two-colour plate —
  Prussian ink #173D73 (accents #102D57) on parchment #F1E5C8 — and the panel is set in those same inks in both
  themes, so the plate's sky is the panel. They are the artwork's own colours, not semantic tokens.
  Ink on parchment is 10.9:1 (#102D57) and 8.6:1 (#173D73); the 80% links and bottom bar blend to 5.3:1.
*/
const focusRing =
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#102D57] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F1E5C8]";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-[#F1E5C8] text-[#102D57]">
      {/* Paper grain: a seamless 384px tile under everything, so the plain panel and the plate read as one sheet.
          `overlay` against mid-grey is neutral on average, so it textures the parchment without dulling it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-overlay"
        style={{ backgroundImage: "url(/footer/paper-grain.webp)", backgroundSize: "384px" }}
      />

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
              <span className="grid size-8 place-items-center rounded-md bg-[#102D57] text-[#F1E5C8]">
                <Layers className="size-[18px]" />
              </span>
              <span className="font-display text-wordmark font-bold uppercase tracking-[0.18em]">Kinetixui</span>
            </div>
            {/* The canonical tagline, not a second copy of it: this paragraph carried the retired
                "One token architecture, in motion across every platform" long after the hero dropped it. */}
            <p className="mt-5 max-w-sm text-base leading-relaxed text-[#173D73]">
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
                        className={`text-[#173D73]/80 transition-colors hover:text-[#102D57] ${focusRing}`}
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

        <div className="flex flex-col gap-2 border-t border-[#173D73]/25 py-6 text-body-sm text-[#173D73]/80 sm:flex-row sm:items-center sm:justify-between">
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
                className={`underline underline-offset-4 transition-colors hover:text-[#102D57] ${focusRing}`}
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
          floored for phones, where `object-cover` crops the edges — the town sits in the middle 30–70% of the
          plate for that reason — so `sizes` floors at the ~720px a 240px-tall crop is wide. It is pulled up under
          the bottom bar so the bar sits in the plate's empty sky, and the top fades into the panel. */}
      <div
        aria-hidden
        className="relative -mt-[5vw] h-[clamp(240px,33.333vw,800px)] [mask-image:linear-gradient(to_bottom,transparent,#000_14%)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a static decorative image with its own srcset; no optimisation to gain */}
        <img
          src="/footer/arabian-engraving-1920.webp"
          srcSet="/footer/arabian-engraving-960.webp 960w, /footer/arabian-engraving-1920.webp 1920w"
          sizes="max(100vw, 720px)"
          alt=""
          width={1920}
          height={640}
          loading="lazy"
          decoding="async"
          className="size-full object-cover object-bottom"
        />
      </div>
    </footer>
  );
}
