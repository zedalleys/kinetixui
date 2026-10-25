"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { CircleCheck, CircleX, Info, ListChecks, TriangleAlert } from "lucide-react";
import { cn } from "../lib/utils";
import { spinnerVariants } from "./spinner";

/**
 * ResultState — the outcome of something the reader just did: a payment that went through, a booking that
 * was confirmed, an application that is still being processed, a transfer where three of four items moved.
 *
 * It is the shared foundation the domain screens are built from — PaymentSuccess, BookingConfirmed,
 * OrderConfirmed, ApplicationSubmitted and RefundConfirmed are all a ResultState with different words, a
 * reference and different details, not five components. See docs/BUSINESS-CAPABILITY-ROADMAP.md.
 *
 * Distinct from the neighbours it resembles:
 *   Empty         a container with nothing in it yet. No outcome, no status.
 *   Alert/Inform  an inline notice inside a page that is about something else.
 *   ResultState   the page (or panel) IS the outcome — it is a landmark-sized section with a heading.
 *
 * Status is never carried by colour or icon alone. Every status has its own glyph shape (check, cross,
 * triangle, rotating ring, "i", checklist), the mark has an accessible name (`statusLabel`, English by
 * default and overridable for localisation), and `title` is required — it is where the outcome is stated
 * in words ("Payment received", not "Success").
 *
 * Announcements are opt-in. A result reached by navigation is announced by the page change and focus
 * landing on it, which is the router's job; a result that changes in place (pending → success after a
 * poll) is not, so `announce` makes the title and description a polite live region.
 *
 * The prop model is flat on purpose: a result has one title, one description, at most one reference and
 * two actions, and every real screen we looked at fits that. A compound API would make every consumer
 * re-assemble the same five parts in the same order. Anything beyond that goes in `children` (details).
 */
export type ResultStateStatus = "success" | "error" | "warning" | "pending" | "info" | "partial";

const DEFAULT_LABEL: Record<ResultStateStatus, string> = {
  success: "Success",
  error: "Error",
  warning: "Warning",
  pending: "In progress",
  info: "Information",
  partial: "Partially complete",
};

const GLYPH: Record<Exclude<ResultStateStatus, "pending">, React.ElementType> = {
  success: CircleCheck,
  error: CircleX,
  warning: TriangleAlert,
  info: Info,
  partial: ListChecks,
};

// The tinted medallion pairs are the ones Inform already ships and check:contrast measures — a status
// colour on a 10-15% wash of itself — so no new colour pairing is introduced here.
const markVariants = cva(
  "flex size-12 shrink-0 items-center justify-center rounded-full [&>svg]:size-6 [&>svg]:shrink-0",
  {
    variants: {
      status: {
        success: "bg-success/15 text-success-on-container",
        error: "bg-destructive/10 text-destructive-on-container",
        warning: "bg-warning/15 text-warning-on-container",
        pending: "bg-muted text-muted-foreground",
        info: "bg-info/10 text-info-on-container",
        partial: "bg-warning/15 text-warning-on-container",
      },
    },
    defaultVariants: { status: "info" },
  },
);

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface ResultStateProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  status: ResultStateStatus;
  /** States the outcome in words — "Payment received", "We couldn't confirm your booking". Required. */
  title: React.ReactNode;
  description?: React.ReactNode;
  /** The accessible name of the status mark. Defaults to an English word per status; pass your own to localise. */
  statusLabel?: string;
  /** Replaces the status glyph inside the mark. The mark keeps its shape, colour and `statusLabel`. */
  icon?: React.ReactNode;
  /** Replaces the whole mark — an illustration, a product image. Decorative: the status is still announced through `statusLabel`. */
  media?: React.ReactNode;
  /** Usually a `<ReferenceCode>`: the booking reference, order number or transaction ID the reader will need again. */
  reference?: React.ReactNode;
  /** The one thing to do next. Rendered first in reading order. */
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  /** `start` for a result inside a wider layout (a panel, a side sheet); `center` (default) for a full screen. */
  align?: "center" | "start";
  /** Heading level of the title. Default 2 — a result inside a page whose own h1 is the app's. */
  headingLevel?: HeadingLevel;
  /** Make the title and description a polite live region, for a result that changes in place. */
  announce?: boolean;
}

const ResultState = React.forwardRef<HTMLElement, ResultStateProps>(
  (
    {
      className,
      status,
      title,
      description,
      statusLabel,
      icon,
      media,
      reference,
      primaryAction,
      secondaryAction,
      align = "center",
      headingLevel = 2,
      announce = false,
      children,
      ...props
    },
    ref,
  ) => {
    const id = React.useId();
    const titleId = `${id}-title`;
    const descriptionId = `${id}-description`;
    const label = statusLabel ?? DEFAULT_LABEL[status];
    const Heading = `h${headingLevel}` as const;
    const Glyph = status === "pending" ? null : GLYPH[status];
    const centered = align === "center";

    return (
      <section
        ref={ref}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        aria-busy={status === "pending" || undefined}
        data-status={status}
        className={cn(
          "flex w-full min-w-0 flex-col gap-5 font-sans",
          centered ? "items-center text-center" : "items-start text-start",
          className,
        )}
        {...props}
      >
        {/* The mark is an image with a name, so the status reaches assistive technology as a word even
            when the title is written as a sentence. `media` swaps the visual, never the name. */}
        <div role="img" aria-label={label} data-slot="result-state-mark" className={media ? "shrink-0" : markVariants({ status })}>
          {media ??
            (icon ? (
              <span aria-hidden className="contents">
                {icon}
              </span>
            ) : Glyph ? (
              <Glyph aria-hidden />
            ) : (
              <span aria-hidden className={spinnerVariants({ size: "md", variant: "muted" })} />
            ))}
        </div>

        <div
          className={cn("flex max-w-prose flex-col gap-2", centered && "items-center")}
          role={announce ? "status" : undefined}
          aria-live={announce ? "polite" : undefined}
        >
          <Heading id={titleId} className="text-headline-sm font-semibold text-foreground">
            {title}
          </Heading>
          {description && (
            <p id={descriptionId} className="text-body-md text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {reference && <div className="max-w-full">{reference}</div>}

        {children && (
          <div data-slot="result-state-details" className="w-full max-w-md text-start">
            {children}
          </div>
        )}

        {(primaryAction || secondaryAction) && (
          <div
            data-slot="result-state-actions"
            className={cn("flex w-full max-w-md flex-wrap gap-3", centered ? "justify-center" : "justify-start")}
          >
            {primaryAction}
            {secondaryAction}
          </div>
        )}
      </section>
    );
  },
);
ResultState.displayName = "ResultState";

export { ResultState };
