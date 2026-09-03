"use client";

import * as React from "react";
import { cn } from "../lib/utils";

/**
 * Footer — a page footer shell: columns of nav links plus a bottom bar
 * (copyright, legal, social). Compose `FooterColumn` / `FooterLink` /
 * `FooterBottom` inside it.
 */
const Footer = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, children, ...props }, ref) => (
    <footer ref={ref} className={cn("w-full border-t border-border bg-background px-6 py-10 font-sans", className)} {...props}>
      {children}
    </footer>
  ),
);
Footer.displayName = "Footer";

export interface FooterColumnProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
}

const FooterColumn = React.forwardRef<HTMLDivElement, FooterColumnProps>(
  ({ className, title, children, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-3", className)} {...props}>
      <p className="text-label-md font-medium text-foreground">{title}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  ),
);
FooterColumn.displayName = "FooterColumn";

const FooterLink = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(
  ({ className, ...props }, ref) => (
    <a
      ref={ref}
      className={cn(
        "text-body-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground",
        className,
      )}
      {...props}
    />
  ),
);
FooterLink.displayName = "FooterLink";

const FooterBottom = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-body-sm text-muted-foreground",
        className,
      )}
      {...props}
    />
  ),
);
FooterBottom.displayName = "FooterBottom";

export { Footer, FooterColumn, FooterLink, FooterBottom };
