"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { spinnerVariants } from "@/components/ui/spinner";

/**
 * Button — reconciled 1:1 with the design source, Figma "KinetixUI" › UI Components ›
 * 02. Controls & Actions › Button (node 54863:351).
 *
 * Figma variant matrix (mirrored 1:1 below):
 *   variant : Primary | Secondary | Outline | Destructive | Ghost | Link
 *   size    : sm | md | lg | icon
 *   state   : Default | Hover | Focus | Active | Disabled
 *
 * `state` is expressed idiomatically: Hover/Focus/Active are CSS pseudo-classes
 * (`hover:` / `focus-visible:` / `active:`), Disabled is the native attribute.
 * The optional `state` prop force-pins one visual state for docs / snapshots.
 *
 * Colors resolve to the semantic token contract in
 * @kinetixui/tokens/dist/web/globals.css.
 *
 * `pending` is a sixth state, and it is NOT one of the five above: it says the action this button
 * started is in flight. It is deliberately not `disabled`. `disabled` removes the control from the
 * interactive set, which moves focus out from under the user at the exact moment they acted — the
 * defect nearly every hand-rolled submit spinner ships. `pending` keeps the button focusable and
 * named, marks it `aria-disabled` + `aria-busy`, suppresses activation for every input device, and
 * announces the status in a live region OUTSIDE the button so the accessible name never changes.
 */

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1 shrink-0",
    "font-sans font-medium whitespace-nowrap select-none",
    "rounded-md transition-colors duration-instant ease-standard outline-none",
    "focus-visible:shadow-focus",
    "disabled:pointer-events-none disabled:opacity-disabled",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-[18px]",
  ],
  {
    variants: {
      variant: {
        // bg primary / text on-primary; hover+active step down the blue ramp; disabled -> border grey
        // rest = --primary; hover/active dim it via opacity so it works in BOTH themes.
        // Alphas are bounded by contrast, not taste: text on the dimmed fill must stay >= 4.5:1
        // (light: 90% = 5.05, 85% = 4.54, 80% = 4.11 fails) — enforced by check:contrast.
        // (the old hover:bg-[--color-blue-600] was a hard-coded dark navy — on dark mode,
        //  where --primary is light, it inverted the button into the near-black background.)
        Primary:
          "bg-action text-action-foreground hover:bg-action/90 active:bg-action/85 disabled:bg-border disabled:text-muted-foreground",
        // rest = --secondary; hover/active promote to the --secondary-foreground fill with
        //  inverted text — theme-aware, unlike the previous hard-coded green primitives.
        //  Active is solid like hover: dimming it (90% was 3.97:1) drops the text under AA,
        //  and anything above ~97% is imperceptible. Enforced by check:contrast.
        Secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-foreground hover:text-secondary active:bg-secondary-foreground active:text-secondary focus-visible:bg-secondary disabled:bg-border disabled:text-muted-foreground",
        // 1px outline; hover fills with accent + strengthens the edge to --ring so the
        // state stays visible on the darkest surfaces (WCAG 2.2 SC 1.4.11); active pins primary
        Outline:
          "border border-input bg-transparent text-foreground hover:border-ring hover:bg-accent active:border-action active:bg-accent active:text-action disabled:border-input disabled:text-muted-foreground disabled:bg-transparent",
        Destructive:
          "bg-destructive text-destructive-foreground hover:brightness-95 active:brightness-90 disabled:bg-border disabled:text-muted-foreground",
        // transparent rest; hover adds an inset --ring outline (the accent fill alone is
        // <3:1 against the page on dark) plus the accent fill; active pins primary text
        Ghost:
          "bg-transparent text-foreground hover:bg-accent hover:ring-1 hover:ring-inset hover:ring-ring active:bg-accent active:text-action active:ring-0 disabled:text-muted-foreground disabled:bg-transparent",
        Link: "bg-transparent text-link underline-offset-4 hover:underline hover:text-foreground rounded-none px-0 disabled:text-muted-foreground disabled:no-underline",
      },
      size: {
        // padding = Figma spacing/3 + spacing/2 ; type = Label Small (11/16, +0.5 tracking)
        sm: "px-3 py-2 text-label-sm",
        // spacing/4 + spacing/3 ; Label Medium (12/16, +0.5)
        md: "px-4 py-3 text-label-md",
        // spacing/6 + spacing/3 ; Label Large (14/20, +0.1)
        lg: "px-6 py-3 text-label-lg",
        // spacing/3 all round, square
        icon: "p-3 [&>*:not(svg)]:sr-only",
      },
      /** force a static visual state — leave undefined for real interaction */
      state: {
        Default: "",
        Hover: "",
        Focus: "shadow-focus",
        Active: "",
        Disabled: "pointer-events-none opacity-disabled",
        // `pending` the prop is the real thing; this key lets the docs and snapshots pin the state
        // statically, exactly as `Disabled` is pinned today. No opacity change: a pending button is
        // working, not unavailable, and dimming it would read as the latter.
        Pending: "cursor-progress",
      },
      /** corner style — matches the design source's Corners property */
      corners: {
        sharp: "rounded-none",
        default: "",
        pill: "rounded-full",
      },
    },
    compoundVariants: [
      { variant: "Destructive", class: "focus-visible:shadow-focus-destructive" },
      { variant: "Primary", state: "Hover", class: "bg-action/90" },
      { variant: "Primary", state: "Active", class: "bg-action/85" },
      { variant: "Secondary", state: "Hover", class: "bg-secondary-foreground text-secondary" },
      { variant: "Secondary", state: "Active", class: "bg-secondary-foreground text-secondary" },
      { variant: "Outline", state: "Hover", class: "border-ring bg-accent" },
      { variant: "Outline", state: "Active", class: "border-action bg-accent text-action" },
      { variant: "Ghost", state: "Hover", class: "bg-accent ring-1 ring-inset ring-ring" },
      { variant: "Ghost", state: "Active", class: "bg-accent text-action" },
      { variant: "Link", state: "Hover", class: "underline text-foreground" },
      { variant: "Link", size: ["sm", "md", "lg"], class: "py-2 px-0 h-auto" },
    ],
    defaultVariants: { variant: "Primary", size: "md", state: "Default", corners: "default" },
  },
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    VariantProps<typeof buttonVariants> {
  /** render as the single child element (Radix Slot) instead of <button> */
  asChild?: boolean;
  /**
   * The action this button started is in flight. Controlled: the caller owns it and must move it
   * back to `false` on both the confirmed and the failed path.
   *
   * The button stays focusable and keeps its accessible name; activation is suppressed instead.
   * `disabled` takes precedence — see the precedence note in the implementation.
   */
  pending?: boolean;
  /**
   * What a screen reader hears while `pending`, announced separately from the button's name.
   * Defaults to the English "Working…"; pass your own string to localise, the same way
   * `ResultState` and `Spinner` take their labels.
   */
  pendingLabel?: string;
}

/** The default announcement. English, like every other default label in this package. */
const DEFAULT_PENDING_LABEL = "Working…";

/**
 * `process` is not typed here: this package carries no `@types/node`, and it should not grow one for
 * a single development-time guard. Declared narrowly and optionally instead, so the check runs under
 * every bundler that substitutes `process.env.NODE_ENV` (Next, Vite, tsup) and is skipped where the
 * identifier does not exist at all — skipping it is the safe direction, since what it guards is a
 * louder error message and not the behaviour itself.
 */
declare const process: { env?: { NODE_ENV?: string } } | undefined;

/**
 * Activation handlers a pending button must swallow.
 *
 * `onClick` alone is not enough. A native button turns Enter and Space into a click, so the click
 * guard covers keyboard activation too — but real applications also hang submit work on `keyDown`,
 * `keyUp`, `pointerDown` and `touchStart`, and those fire before any click. Each is wrapped, so the
 * caller's own handler is never reached while pending, whichever device started it.
 */
const ACTIVATION_HANDLERS = [
  "onClick",
  "onKeyDown",
  "onKeyUp",
  "onPointerDown",
  "onPointerUp",
  "onMouseDown",
  "onMouseUp",
  "onTouchStart",
  "onTouchEnd",
] as const;

type ActivationHandler = (typeof ACTIVATION_HANDLERS)[number];

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      state,
      corners,
      asChild = false,
      disabled,
      pending,
      pendingLabel = DEFAULT_PENDING_LABEL,
      ...props
    },
    ref,
  ) => {
    const Comp: React.ElementType = asChild ? Slot : "button";

    // PRECEDENCE, decided rather than discovered: `disabled` wins. A control the author has taken
    // out of service is not performing an action, so it is not pending — no spinner, no busy state,
    // no announcement. The same applies to the pinned `state="Disabled"`, which is `disabled`.
    const unavailable = Boolean(disabled) || state === "Disabled";
    const isPending = !unavailable && (Boolean(pending) || state === "Pending");

    // Whether this call site opted into the pending machinery at all. When it did not, the rendered
    // output is byte-identical to before this prop existed: no spinner slot, no live region, no
    // wrapped handlers, no extra attributes.
    const pendingAware = pending !== undefined || state === "Pending";

    if (typeof process !== "undefined" && process?.env?.NODE_ENV !== "production" && pending !== undefined && asChild) {
      // Rejected loudly in development: `asChild` renders through a Radix `Slot`, which takes exactly
      // one child, so the spinner has nowhere to go. In production this does NOT become a silent
      // no-op — the inert semantics, the busy state and the announcement are all still applied to the
      // slotted child below, and only the spinner is missing. Losing a visual is recoverable; losing
      // the double-submit guard is not.
      throw new Error(
        "Button: `pending` cannot draw its spinner through `asChild`, because a Radix Slot takes a " +
          "single child. Render a <Button> directly, or own the indicator inside your child element.",
      );
    }

    // The announcement is driven by the TRANSITION, not by the render: this effect runs when
    // `isPending` changes and nowhere else, so a parent re-rendering ten times mid-flight produces
    // one announcement, not ten. Leaving pending clears the region, which announces nothing.
    const [announcement, setAnnouncement] = React.useState("");
    React.useEffect(() => {
      setAnnouncement(isPending ? pendingLabel : "");
    }, [isPending, pendingLabel]);

    // Each activation handler is replaced by a guarded version of itself, so the caller's handler is
    // not reached while pending. `preventDefault` stops the browser's own submit; `stopPropagation`
    // stops a form or row listener above from treating it as a second attempt.
    const guarded: Partial<Record<ActivationHandler, React.EventHandler<React.SyntheticEvent>>> = {};
    if (pendingAware) {
      for (const name of ACTIVATION_HANDLERS) {
        const original = props[name] as React.EventHandler<React.SyntheticEvent> | undefined;
        guarded[name] = (event) => {
          if (isPending) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          original?.(event);
        };
      }
    }

    // `aria-disabled`, never the `disabled` attribute: the control has to stay in the tab order so
    // the focus the user just placed on it does not jump to the document. Applied AFTER the caller's
    // props so a stray `aria-disabled` on the call site cannot override the guard — and omitted
    // entirely when not pending, so a caller who sets those attributes themselves keeps them.
    const pendingAttributes = isPending
      ? ({ "aria-disabled": true, "aria-busy": true, "data-pending": "" } as const)
      : {};

    const shared = {
      ref,
      "data-slot": "button",
      "data-variant": variant ?? "Primary",
      "data-size": size ?? "md",
      disabled: unavailable,
      className: cn(
        buttonVariants({ variant, size, state: isPending ? "Pending" : state, corners }),
        className,
      ),
      ...props,
      ...pendingAttributes,
      ...guarded,
    };

    const button =
      pendingAware && !asChild ? (
        <Comp {...shared}>
          {/*
            Sized in BOTH states and present in both, so the label does not reflow when the spinner
            appears. `aria-hidden`: the status reaches a screen reader through the live region below,
            and a second source would announce the same thing twice. The ring reuses
            `spinnerVariants`, which is where this package's reduced-motion form is contracted — this
            slice adds no motion of its own and does not touch the motion contract.
          */}
          <span aria-hidden="true" className="inline-flex size-[18px] shrink-0 items-center justify-center">
            {isPending && <span className={cn(spinnerVariants({ size: "sm" }), "size-[18px] text-current")} />}
          </span>
          {props.children}
        </Comp>
      ) : (
        // No spinner slot: children flow through the spread exactly as they did before this prop
        // existed, which is what keeps `asChild`'s single-child contract intact.
        <Comp {...shared} />
      );

    if (!pendingAware) return button;

    return (
      <>
        {button}
        {/*
          OUTSIDE the button on purpose. A live region inside it would be part of the button's own
          accessible name (buttons are named from their content), so the name would change from
          "Save" to "Save Working…" mid-interaction. Mounted empty from the first render, because a
          region that appears at the same moment as its text is unreliably announced.
        */}
        <span role="status" aria-live="polite" className="sr-only">
          {announcement}
        </span>
      </>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants, DEFAULT_PENDING_LABEL };
