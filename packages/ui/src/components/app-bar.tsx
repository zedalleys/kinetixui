"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Menu, X } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * AppBar — a web application top bar: a brand slot, a row of primary nav
 * links, and a trailing actions slot inside a sticky bordered header. Below
 * the `md` breakpoint the nav collapses behind a menu toggle into a panel
 * under the bar.
 *
 * <AppBar>
 *   <AppBarBrand>Acme</AppBarBrand>
 *   <AppBarNav>
 *     <AppBarLink href="/" active>Overview</AppBarLink>
 *     <AppBarLink href="/reports">Reports</AppBarLink>
 *   </AppBarNav>
 *   <AppBarActions><Button size="sm">New</Button></AppBarActions>
 * </AppBar>
 *
 * `NavigationBar` is the mobile back-button bar; this is the desktop app shell.
 */

interface AppBarCtx {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}
const Ctx = React.createContext<AppBarCtx | null>(null);
const useAppBar = () => {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("AppBar parts must be used within <AppBar>");
  return ctx;
};

const AppBar = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, children, ...props }, ref) => {
    const [open, setOpen] = React.useState(false);

    const nav = React.Children.toArray(children).find(
      (c): c is React.ReactElement<React.ComponentProps<typeof AppBarNav>> =>
        React.isValidElement(c) && c.type === AppBarNav,
    );

    return (
      <Ctx.Provider value={{ open, setOpen }}>
        <header
          ref={ref}
          className={cn(
            "sticky top-0 z-40 w-full border-b border-border bg-background/95 font-sans",
            "backdrop-blur supports-[backdrop-filter]:bg-background/75",
            className,
          )}
          {...props}
        >
          <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-4 px-4">
            {children}
            {nav && (
              <button
                type="button"
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className={cn(
                  "ml-auto inline-flex size-9 items-center justify-center rounded-md text-foreground outline-none transition-colors md:hidden",
                  "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            )}
          </div>
          {nav && open && (
            <nav className="flex flex-col gap-1 border-t border-border p-2 md:hidden">
              {nav.props.children}
            </nav>
          )}
        </header>
      </Ctx.Provider>
    );
  },
);
AppBar.displayName = "AppBar";

const AppBarBrand = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex shrink-0 items-center gap-2 text-[15px] font-semibold text-foreground", className)}
      {...props}
    />
  ),
);
AppBarBrand.displayName = "AppBarBrand";

const AppBarNav = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <nav ref={ref} className={cn("hidden items-center gap-1 md:flex", className)} {...props} />
  ),
);
AppBarNav.displayName = "AppBarNav";

export interface AppBarLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Marks the current destination — sets `aria-current="page"` and the active style. */
  active?: boolean;
  /** Render as the child element (e.g. a framework `<Link>`), forwarding props. */
  asChild?: boolean;
}

const AppBarLink = React.forwardRef<HTMLAnchorElement, AppBarLinkProps>(
  ({ className, active, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "a";
    return (
      <Comp
        ref={ref}
        data-active={active ? "" : undefined}
        aria-current={active ? "page" : undefined}
        className={cn(
          "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium outline-none transition-colors",
          "text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
          "data-[active]:bg-accent data-[active]:text-foreground",
          className,
        )}
        {...props}
      />
    );
  },
);
AppBarLink.displayName = "AppBarLink";

const AppBarActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("ml-auto flex shrink-0 items-center gap-2", className)} {...props} />
  ),
);
AppBarActions.displayName = "AppBarActions";

export { AppBar, AppBarBrand, AppBarNav, AppBarLink, AppBarActions, useAppBar };
