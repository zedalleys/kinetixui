"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { docsGuideNav, mainNav, siteConfig } from "@/lib/site";

const iconButton =
  "inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// A modal dialog rather than a hand-rolled panel: Radix traps Tab inside, makes
// the rest of the page inert/aria-hidden, closes on Esc, and returns focus to the
// trigger. Because the header trigger is outside the modal, the panel carries its
// own close button.
//
// Where it shows depends on the page. Everywhere else the primary nav bar takes over at `md`. On /docs/* the docs
// sidebar only appears at `lg`, so hiding this at `md` left 768–1023px with no way to reach another docs page but
// the pager and in-page links. On docs pages it stays until the sidebar takes over.
export function menuBreakpointClass(pathname: string): string {
  return pathname === "/docs" || pathname.startsWith("/docs/") ? "lg:hidden" : "md:hidden";
}

export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  return (
    <div className={menuBreakpointClass(pathname)}>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger aria-label="Menu" className={iconButton}>
          <Menu className="size-4" />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex min-w-0 items-baseline gap-2 px-2">
                <Dialog.Title className="text-sm font-medium">Menu</Dialog.Title>
                <span className="font-mono text-[11px] text-muted-foreground">
                  v{siteConfig.version} — beta
                </span>
              </div>
              <Dialog.Close aria-label="Close menu" className={iconButton}>
                <X className="size-4" />
              </Dialog.Close>
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
                    <span className="rounded-[3px] border border-border px-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
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
                      {i.badge && <span className="ml-2 rounded-[3px] border border-border px-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{i.badge}</span>}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
