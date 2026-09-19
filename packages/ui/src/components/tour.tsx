"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";

/**
 * Tour — sequenced spotlight popovers over real elements (onboarding
 * walkthroughs), with dismiss/skip/next. `target` is a CSS selector
 * resolved against the live DOM on every step change (and on resize/
 * scroll, so the spotlight tracks a target that moves or resizes) rather
 * than a ref, since steps are authored as plain data ahead of the
 * elements existing. The spotlight itself is a single positioned `div`
 * with a `box-shadow: 0 0 0 9999px` — a well-known CSS-only cutout
 * technique, no SVG mask or second overlay layer needed. No focus trap:
 * a tour narrates the page rather than blocking interaction with it, so
 * the underlying page stays operable while a step is shown. Gap-fill
 * addition (not in the original Figma source).
 */
export interface TourStep {
  /** CSS selector for the element this step spotlights */
  target: string;
  title: React.ReactNode;
  content: React.ReactNode;
}

export interface TourProps {
  steps: TourStep[];
  open: boolean;
  stepIndex: number;
  onStepIndexChange: (index: number) => void;
  onOpenChange: (open: boolean) => void;
  nextLabel?: React.ReactNode;
  backLabel?: React.ReactNode;
  skipLabel?: React.ReactNode;
  doneLabel?: React.ReactNode;
}

const SPOTLIGHT_PADDING = 8;

const Tour: React.FC<TourProps> = ({
  steps,
  open,
  stepIndex,
  onStepIndexChange,
  onOpenChange,
  nextLabel = "Next",
  backLabel = "Back",
  skipLabel = "Skip",
  doneLabel = "Done",
}) => {
  const [mounted, setMounted] = React.useState(false);
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const step = steps[stepIndex];

  React.useEffect(() => setMounted(true), []);

  const titleId = React.useId();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);

  // Remember what had focus when the tour opened and give it back when it closes.
  React.useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => returnFocusRef.current?.focus();
  }, [open]);

  // Move focus into the dialog on open and on every step, so a screen reader announces the new title.
  React.useEffect(() => {
    if (open && mounted) dialogRef.current?.focus();
  }, [open, mounted, stepIndex]);

  // aria-modal only *tells* assistive tech the page is inert; keep Tab inside the card ourselves.
  const trapTab = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const dialog = e.currentTarget;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex='-1'])"));
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === dialog)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  React.useEffect(() => {
    if (!open || !step) return;
    const update = () => {
      const el = document.querySelector(step.target);
      if (el) {
        setRect(el.getBoundingClientRect());
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setRect(null);
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, step]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  if (!mounted || !open || !step) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const spotlightStyle: React.CSSProperties = rect
    ? {
        top: rect.top - SPOTLIGHT_PADDING,
        left: rect.left - SPOTLIGHT_PADDING,
        width: rect.width + SPOTLIGHT_PADDING * 2,
        height: rect.height + SPOTLIGHT_PADDING * 2,
        boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.6)",
      }
    : { inset: 0, background: "rgb(0 0 0 / 0.6)" };

  const cardStyle: React.CSSProperties = rect
    ? {
        top: Math.min(rect.bottom + SPOTLIGHT_PADDING + 8, window.innerHeight - 220),
        left: Math.min(Math.max(rect.left, 16), window.innerWidth - 336),
      }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  return createPortal(
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed z-overlay rounded-lg transition-all duration-fast"
        style={spotlightStyle}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapTab}
        className="fixed z-overlay w-80 rounded-lg border border-border bg-popover p-4 font-sans text-popover-foreground shadow-lg outline-none transition-all duration-fast"
        style={cardStyle}
      >
        <p id={titleId} className="text-title-sm font-medium text-foreground">
          {step.title}
        </p>
        <div className="mt-1.5 text-body-sm text-muted-foreground">{step.content}</div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-label-sm text-muted-foreground">
            {stepIndex + 1} / {steps.length}
          </span>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button variant="Ghost" size="sm" onClick={() => onStepIndexChange(stepIndex - 1)}>
                {backLabel}
              </Button>
            )}
            {!isLast ? (
              <>
                <Button variant="Link" size="sm" onClick={() => onOpenChange(false)}>
                  {skipLabel}
                </Button>
                <Button size="sm" onClick={() => onStepIndexChange(stepIndex + 1)}>
                  {nextLabel}
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => onOpenChange(false)}>
                {doneLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
};

export { Tour };
