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
  The footer is a fixed brand surface, not a themed one: the panorama is printed in exactly two primitives —
  `azure.800` sky and `cream.500` paper (see design-assets/) — so the panel uses those same two primitives in
  both themes and the illustration's sky runs into the panel with no seam. Cream on azure.800 is 7.9:1; the
  80% tagline blends to 5.7:1, the 75% links to 5.2:1 and the 70% bottom bar to 4.7:1, all above AA.
*/
const focusRing =
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--cream-500))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--azure-800))]";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-[hsl(var(--azure-800))] text-[hsl(var(--cream-500))]">
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
              <span className="grid size-8 place-items-center rounded-md bg-[hsl(var(--cream-500))] text-[hsl(var(--azure-800))]">
                <Layers className="size-[18px]" />
              </span>
              <span className="font-display text-wordmark font-bold uppercase tracking-[0.18em]">Kinetixui</span>
            </div>
            {/* The canonical tagline, not a second copy of it: this paragraph carried the retired
                "One token architecture, in motion across every platform" long after the hero dropped it. */}
            <p className="mt-5 max-w-sm text-base leading-relaxed text-[hsl(var(--cream-500)/0.8)]">
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
                        className={`text-[hsl(var(--cream-500)/0.75)] transition-colors hover:text-[hsl(var(--cream-500))] ${focusRing}`}
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

        <div className="flex flex-col gap-2 border-t border-[hsl(var(--cream-500)/0.2)] py-6 text-body-sm text-[hsl(var(--cream-500)/0.7)] sm:flex-row sm:items-center sm:justify-between">
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
                className={`underline underline-offset-4 transition-colors hover:text-[hsl(var(--cream-500))] ${focusRing}`}
              >
                Zed Alleys
              </Link>
            </p>
          </div>
          <p className="font-mono">tokens · DTCG → Style Dictionary</p>
        </div>
      </div>

      {/* Decorative panorama — an <img alt=""> rather than a CSS background so it can lazy-load: the footer is on
          every route, and a background is fetched as soon as styles resolve, even for a visitor who never scrolls
          this far. Its height tracks the artwork's ~4:1 ratio and is floored for phones, where `object-cover` crops
          the edges (the artwork keeps its village and caravan away from them for that reason), so `sizes` floors
          at the ~890px a 220px-tall crop is wide. It is pulled up under the bottom bar so the bar sits in the
          print's empty sky, and the top is masked so the paper grain fades into the flat panel rather than
          starting on a hard line. */}
      <div
        aria-hidden
        className="-mt-[7vw] h-[clamp(220px,25vw,640px)] [mask-image:linear-gradient(to_bottom,transparent,#000_18%)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a static decorative image with its own srcset; no optimisation to gain */}
        <img
          src="/footer/arabian-panorama.webp"
          srcSet="/footer/arabian-panorama-1032.webp 1032w, /footer/arabian-panorama.webp 2064w"
          sizes="max(100vw, 890px)"
          alt=""
          width={2064}
          height={512}
          loading="lazy"
          decoding="async"
          className="size-full object-cover object-[66%_100%] sm:object-bottom"
        />
      </div>
    </footer>
  );
}
