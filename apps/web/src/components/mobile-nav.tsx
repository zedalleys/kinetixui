"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Sheet, SheetContent, SheetTitle, SheetTrigger } from "@kinetixui/ui";
import { Menu } from "lucide-react";
import { docsGuideNav, mainNav, siteConfig } from "@/lib/site";

// The library Sheet, a modal dialog: it traps Tab inside, makes the rest of the page inert/aria-hidden, closes on Esc
// and on a press outside the panel, and returns focus to the trigger. It opens from the inline start — the left in
// LTR, the right in RTL — and carries its own close button, because the header trigger is outside the modal.
//
// Where it shows depends on the page. Everywhere else the primary nav bar takes over at `md`. On /docs/* the docs
// sidebar only appears at `lg-rem`, so hiding this at `md` left 768–1023px with no way to reach another docs page but
// the pager and in-page links. On docs pages it stays until the sidebar takes over.
//
// `lg-rem`, not `lg`: the sidebar's own breakpoint. The two have to be the same question asked once, or a reader
// between them gets both or neither. At 1280px with a 32px default font size `lg` is true and `lg-rem` is not, so
// a `lg:hidden` trigger beside a `lg-rem:block` sidebar would leave that reader with no docs navigation at all.
export function menuBreakpointClass(pathname: string): string {
  return pathname === "/docs" || pathname.startsWith("/docs/") ? "lg-rem:hidden" : "md:hidden";
}

export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  return (
    <div className={menuBreakpointClass(pathname)}>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="Ghost" size="icon" aria-label="Menu" className="kx-hit">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="start" closeLabel="Close menu" aria-describedby={undefined} className="flex flex-col">
          {/* `pe-10` keeps the title clear of the close button the Sheet places at the inline end of this row. */}
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 px-2 pe-10">
            <SheetTitle>Menu</SheetTitle>
            <span className="font-mono text-body-sm text-muted-foreground">v{siteConfig.version} — beta</span>
          </div>
          <nav aria-label="Mobile" className="flex flex-col gap-1 text-sm">
            {mainNav.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                aria-current={pathname === i.href ? "page" : undefined}
                onClick={close}
                className="flex items-center gap-2 rounded px-2 py-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {i.title}
                {i.soon && (
                  <span className="rounded-[3px] border border-border px-1 font-mono text-label-md uppercase tracking-wider text-muted-foreground">
                    soon
                  </span>
                )}
              </Link>
            ))}
            <div className="my-2 h-px bg-border" />
            {/*
              The guide pages only. This used to list every component as well — 127 links in one column, 98 of them
              components — which buried the dozen destinations a visitor opens the menu for. Components are one
              destination above (the gallery, which filters and searches) and every one is in site search.
            */}
            {docsGuideNav.map((g) => (
              <div key={g.title} className="py-1">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">{g.title}</p>
                {g.items.map((i) => (
                  <Link
                    key={i.href}
                    href={i.href}
                    aria-current={pathname === i.href ? "page" : undefined}
                    onClick={close}
                    className="block rounded px-2 py-1.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {i.title}
                    {i.badge && <span className="ms-2 rounded-[3px] border border-border px-1 font-mono text-label-md uppercase tracking-wider text-muted-foreground">{i.badge}</span>}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
