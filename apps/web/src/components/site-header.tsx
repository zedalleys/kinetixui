"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { mainNav, siteConfig } from "@/lib/site";
import { CommandMenu } from "./command-menu";
import { GitHubButton } from "./github-button";
import { ModeToggle } from "./mode-toggle";
import { MobileNav } from "./mobile-nav";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      {/* row 1 — identity + tools */}
      {/*
        `min-h-12` and `flex-wrap`, not `h-12`: everything in this row is sized in `rem` — the mark is `size-8`
        and each tool button `size-9` — so at the reader's doubled text size the row needs about 370px of a
        320px viewport and pushed every page on the site sideways. The controls growing is correct (a 36px
        target becoming 72px is the point of the setting); the row not being allowed to grow was the bug.
        A fixed height would clip them instead, which is worse.
      */}
      <div className="mx-auto flex min-h-12 max-w-screen-2xl flex-wrap items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-6">
            <Layers className="size-[18px]" />
          </span>
          <span className="font-display text-[15px] font-bold uppercase tracking-[0.18em]">
            Kinetix<span className="text-primary">ui</span>
          </span>
        </Link>

        <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
          v{siteConfig.version} — beta
        </span>

        {/*
          The tools are one flex child of the row, so `flex-wrap` on the row lets the GROUP move to a second line
          but does nothing for the group's own contents. At 640 — where `sm` has just made the command menu
          visible — the group's min-content width exceeded the row on its own and the page still overflowed by
          106px. It needs to wrap internally too, and `justify-end` keeps it against the inline end whether it
          sits beside the mark or under it.
        */}
        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
          <div className="hidden sm:block">
            <CommandMenu />
          </div>
          <GitHubButton />
          <ModeToggle />
          <MobileNav />
        </div>
      </div>

      {/* row 2 — numbered section index (desktop) */}
      {/*
        `flex-wrap` and `min-h-10`, for the same reason and with the same shape of cause.

        The comment below records tightening the gutter at `md` to buy 64px across the bar. That fix was real but
        it was a width *budget*, and a budget only balances at one text size: the label is `text-sm`, which this
        preset emits in `rem`, so at 200% text the eight items need 1608px and overflowed a 1280px viewport by
        328px — identically on all 21 pages, because this header is shared. Wrapping removes the budget instead
        of re-tuning it, so there is no text size at which the arithmetic stops working.

        Wrapping rather than `overflow-x-auto`: every destination stays visible and reachable without a second
        scroll axis, which is what WCAG 1.4.10 is asking for. The active underline is positioned per item, so it
        follows an item onto the second line without any change.
      */}
      <nav
        aria-label="Primary"
        className="mx-auto hidden min-h-10 max-w-screen-2xl flex-wrap items-stretch border-t border-border px-4 text-sm sm:px-6 md:flex lg:px-8"
      >
        {mainNav.map((item, i) => {
          const active =
            item.href === "/docs" ? pathname.startsWith("/docs") : pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                // px-2 at md, not px-3: the bar shows every primary nav item from 768px up, and at exactly that
                // width eight items at px-3 overflowed the viewport by 12px — which showed up as sideways scroll
                // on every page, since this header is shared. Tightening the gutter one step at md buys 64px
                // across the bar and leaves the roomier lg spacing untouched.
                "group relative flex items-center gap-2 px-2 font-medium transition-colors lg:px-4",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="font-mono text-[10px] text-muted-foreground transition-colors group-hover:text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              {item.title}
              {item.soon && (
                <span className="rounded-[3px] border border-border px-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                  soon
                </span>
              )}
              <span
                className={cn(
                  "absolute inset-x-3 -bottom-px h-0.5 bg-primary transition-transform duration-300 lg:inset-x-4",
                  active ? "scale-x-100" : "scale-x-0",
                )}
              />
            </Link>
          );
        })}
      </nav>

      {/* kinetic hairline */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
    </header>
  );
}
