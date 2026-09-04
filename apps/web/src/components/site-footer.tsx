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
      { label: "Colors", href: "/colors" },
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
      <div className="mx-auto max-w-screen-2xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
                <Layers className="size-[18px]" />
              </span>
              <span className="font-display text-[15px] font-bold uppercase tracking-[0.18em]">
                Kinetix<span className="text-primary">ui</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              One token architecture, in motion across every platform. This site is built with it.
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

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Free while in beta. Advanced tooling ships later as KinetixUI Pro.</p>
          <p>Tokens compiled from the design source via Style Dictionary.</p>
        </div>
      </div>
    </footer>
  );
}
