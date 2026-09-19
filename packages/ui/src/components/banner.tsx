"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * Banner — a full-bleed, page-level notice (info/promo/maintenance),
 * optionally dismissible and stickied to the top of the viewport. Distinct
 * from `Alert` (in-flow, static) and `Sonner` (transient toast): Banner is
 * edge-to-edge and persistent until dismissed. Distinct from `Inform`
 * (contained, rounded inline card): Banner has no rounded corners or own
 * width — it spans whatever it's placed in, typically the full viewport.
 * Reuses `Inform`'s intent taxonomy and icon set for a consistent look.
 * Gap-fill addition (not in the original Figma source).
 */
const bannerVariants = cva(
  "flex w-full items-start gap-2.5 border-b px-4 py-3 text-body-sm font-sans [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        information: "border-info/20 bg-info/10 text-info-on-container",
        warning: "border-warning/25 bg-warning/15 text-warning",
        success: "border-success/25 bg-success/15 text-success",
        error: "border-destructive/20 bg-destructive/10 text-destructive",
        action: "border-transparent bg-foreground text-background",
      },
      sticky: {
        true: "sticky top-0 z-40",
        false: "",
      },
    },
    defaultVariants: { variant: "information", sticky: false },
  },
);

const ICON = {
  information: Info,
  warning: TriangleAlert,
  success: CircleCheck,
  error: CircleAlert,
  action: Info,
} as const;

export interface BannerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof bannerVariants> {
  hideIcon?: boolean;
  onDismiss?: () => void;
  /** optional CTA rendered inline after the message */
  action?: { label: React.ReactNode; onClick?: () => void };
}

const Banner = React.forwardRef<HTMLDivElement, BannerProps>(
  ({ className, variant = "information", sticky, hideIcon, onDismiss, action, children, ...props }, ref) => {
    const Icon = ICON[variant ?? "information"];
    return (
      <div ref={ref} role="banner" className={cn(bannerVariants({ variant, sticky }), className)} {...props}>
        {!hideIcon && <Icon />}
        <div className="mx-auto flex min-w-0 max-w-4xl flex-1 flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
          <span>{children}</span>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex shrink-0 items-center gap-1.5 text-label-md font-medium underline-offset-2 outline-none hover:underline focus-visible:underline"
            >
              {action.label}
            </button>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="-m-0.5 shrink-0 rounded-[2px] p-0.5 opacity-muted outline-none transition-opacity hover:opacity-visible focus-visible:opacity-visible focus-visible:ring-1 focus-visible:ring-current"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    );
  },
);
Banner.displayName = "Banner";

export { Banner, bannerVariants };
