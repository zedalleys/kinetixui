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

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        {/*
          Four columns from `lg`, not `md`, and `minmax(0,1fr)` rather than `1fr`.

          A bare `1fr` track has `min-width: auto`, so it cannot shrink below its own min-content. At 768 — which
          is exactly where `md` turned this into four columns — the three link columns got about 133px each while a
          single word like "Changelog" needs 144px at the reader's doubled text size, so the footer pushed every
          page sideways by 176px. `minmax(0,1fr)` lets a track yield; moving the breakpoint to `lg` gives the
          columns room to exist at all before they are asked to. Below `lg` the footer stacks, which reflows.
        */}
        <div className="grid gap-10 py-14 lg:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
                <Layers className="size-[18px]" />
              </span>
              <span className="font-display text-[15px] font-bold uppercase tracking-[0.18em]">
                Kinetix<span className="text-primary">ui</span>
              </span>
            </div>
            {/* The canonical tagline, not a second copy of it: this paragraph carried the retired
                "One token architecture, in motion across every platform" long after the hero dropped it. */}
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              {siteConfig.tagline} This site is built with it.
            </p>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <p className="eyebrow mb-3">{col.title}</p>
              <ul className="grid gap-2 text-sm">
                {col.links.map((l) => {
                  const external = l.href.startsWith("http");
                  return (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                        className="text-muted-foreground transition-colors hover:text-foreground"
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

        {/* oversized specimen wordmark — pure decoration (a 15%-tint watermark), so it is generated content, not text:
            WCAG exempts decorative text from contrast, and this keeps it out of the DOM, the accessibility tree,
            text selection and contrast audits, which cannot tell a watermark from copy. */}
        <div aria-hidden className="select-none overflow-hidden border-t border-border pt-6">
          <span className="block font-display text-[13vw] font-bold uppercase leading-[0.82] tracking-[-0.045em] text-muted-foreground/15 before:content-['Kinetixui']" />
        </div>

        <div className="flex flex-col gap-2 border-t border-border py-6 font-mono text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          {/* The licence line and the creator credit are one group, so the bar keeps its two-sided balance.
              A third top-level item would be centred by `justify-between`, which is more prominence than a
              by-line should take next to the product's own copyright. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p>© 2026 KinetixUI — beta</p>
            {/* Underlined rather than colour-only: this is a link inside a text block, which is exactly the
                shape that tripped `link-in-text-block` on the homepage. It inherits the bar's muted mono, so
                it reads as a credit and not as a call to action. */}
            <p>
              Created by{" "}
              <Link
                href="https://zedalleys.com/"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4 transition-colors hover:text-foreground"
              >
                Zed Alleys
              </Link>
            </p>
          </div>
          <p>tokens · DTCG → Style Dictionary</p>
        </div>
      </div>
    </footer>
  );
}
