"use client";

import * as React from "react";
import type { KinetixControlState, KinetixDeviceMode } from "../types/control";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * DeviceModeControl — one of several mutually exclusive operating modes.
 *
 * The modes are the product's, always. This package ships no Auto/Eco/Comfort vocabulary, because
 * those words mean different things on a heat pump, an irrigation controller and a camera, and a
 * library that hard-codes them forces every product that disagrees to fight it.
 *
 * **A radiogroup, not a row of buttons.** Modes are exclusive, so arrow keys should move between
 * them and a screen reader should announce "2 of 4". That is what `role="radio"` inside
 * `role="radiogroup"` gives, and roving tabindex keeps the group a single tab stop instead of four.
 *
 * **An unavailable mode stays visible.** A heat pump with no cooling stage shows Cool, disabled,
 * rather than hiding it — because a mode that vanishes leaves the user hunting for it, while one
 * that is visibly unavailable answers the question. `aria-disabled` rather than `disabled` keeps it
 * reachable by screen reader so the explanation is discoverable.
 */
// `onSelect` is a real DOM handler on HTMLAttributes, so it is omitted rather than shadowed —
// same reason DeviceGroupCard omits it.
/** A mode as the product describes it, with an optional icon for the `tiles` presentation. */
export type DeviceModeOption = KinetixDeviceMode & {
  /** Drawn above the label in `tiles`. Decorative (`aria-hidden`); the label is the name. */
  icon?: React.ReactNode;
};

export interface DeviceModeControlProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "onSelect"> {
  modes: readonly DeviceModeOption[];
  /** The confirmed mode id. */
  value: string | null | undefined;
  /** A requested mode id that the device has not confirmed. */
  requested?: string | null;
  /** Accessible name for the group, e.g. "Heating mode". */
  label: string;
  control?: KinetixControlState;
  onSelect?: (id: string) => void;
  /** `segmented` for 2–4 short modes; `list` when modes carry descriptions. */
  variant?: "segmented" | "list";
  /**
   * `segmented` (default) uses `variant`. `tiles` draws icon-over-label square tiles in an inset surface;
   * the selected tile is solid `bg-primary` with a tick. Radiogroup semantics are identical.
   */
  presentation?: "segmented" | "tiles";
}

/** A small tick drawn inline — the shape cue that says "this one", beside the raised surface. */
function Tick() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className="shrink-0">
      <path d="m3.6 8.4 2.9 2.9 5.9-6.2" />
    </svg>
  );
}

const DeviceModeControl = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, DeviceModeControlProps>(
  ({ modes, value, requested, label, control, onSelect, variant: variantProp = "segmented", presentation = "segmented", className, ...props }, ref) => {
    const tiles = presentation === "tiles";
    const variant = tiles ? "segmented" : variantProp;
    const pendingId = requested && requested !== value ? requested : null;
    const interactive = control ? control.interactive : true;

    const selectable = modes.filter((m) => !m.unavailable);

    // Roving tabindex lands on the current mode, or the first selectable one if the device reports
    // a mode this product no longer offers. Once the user has arrowed within the group, it lands on
    // wherever they arrowed to instead — the group stays one tab stop either way.
    const [arrowedTo, setArrowedTo] = React.useState<string | null>(null);
    const settledId = modes.find((m) => m.id === (pendingId ?? value))?.id ?? selectable[0]?.id;
    const focusId = arrowedTo && modes.some((m) => m.id === arrowedTo) ? arrowedTo : settledId;

    // Focusing the next radio needs the group element, and `ref` belongs to the caller.
    const groupRef = React.useRef<HTMLDivElement | null>(null);
    const setGroup = React.useCallback(
      (node: HTMLDivElement | null) => {
        groupRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      },
      [ref],
    );

    const move = (from: string, dir: 1 | -1) => {
      if (!interactive || selectable.length === 0) return;
      const i = selectable.findIndex((m) => m.id === from);
      const next = selectable[(i + dir + selectable.length) % selectable.length]!;
      // Focus has to follow, not just selection. In a roving-tabindex radiogroup the tabbable radio
      // is the selected one, so selecting without moving focus leaves the user's focus on a radio
      // that is no longer the group's tab stop — and a subsequent arrow press starts from the wrong
      // place. Arrow keys in a radiogroup move focus and selection together.
      setArrowedTo(next.id);
      groupRef.current?.querySelector<HTMLElement>(`[data-mode-id="${CSS.escape(next.id)}"]`)?.focus();
      onSelect?.(next.id);
    };

    return (
      <div
        ref={setGroup}
        role="radiogroup"
        aria-label={label}
        data-pending={pendingId ? "" : undefined}
        className={cn(
          tiles
            ? "grid grid-cols-2 gap-2 rounded-2xl bg-muted/60 p-2 sm:grid-cols-4"
            : variant === "segmented"
            // An inset surface, not an outlined box: the selected segment is what stands up from it.
            ? "flex w-full gap-1 rounded-xl bg-muted/60 p-1 sm:inline-flex sm:w-auto"
            : "flex flex-col gap-1 rounded-xl bg-muted/60 p-1",
          className,
        )}
        {...props}
      >
        {modes.map((mode) => {
          const isConfirmed = mode.id === value;
          const isPending = mode.id === pendingId;
          const active = isConfirmed || isPending;
          const disabled = !interactive || mode.unavailable;

          return (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={isConfirmed}
              aria-disabled={disabled || undefined}
              aria-label={isPending ? `${mode.label}, requested, not yet confirmed` : undefined}
              tabIndex={mode.id === focusId ? 0 : -1}
              data-mode-id={mode.id}
              data-state={isConfirmed ? "confirmed" : isPending ? "requested" : "inactive"}
              onClick={() => !disabled && onSelect?.(mode.id)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  move(mode.id, 1);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  move(mode.id, -1);
                }
              }}
              className={cn(
                "relative rounded-lg px-3 text-label-lg transition-colors duration-fast ease-enter",
                tiles ? "min-h-20 rounded-xl" : "min-h-11 md:min-h-9",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                "focus-visible:ring-offset-background motion-reduce:transition-none",
                tiles
                  ? "flex flex-col items-center justify-center gap-1.5 py-3 text-center"
                  : variant === "segmented"
                  // `min-w-0` alongside `flex-1`. A flex item's `min-width` defaults to `auto`, which is its
                  // min-content width, so without this the `truncate` on the label below is inert: the button
                  // cannot be narrower than its own label, and a segmented group of several modes therefore
                  // cannot fit a narrow viewport at all. Measured at the reader's doubled text size, the group
                  // pushed its page 212px sideways at 320px. With `min-w-0` the tracks share the width and the
                  // label truncates as it was always meant to.
                  ? "flex min-w-0 flex-1 items-center justify-center gap-1.5 text-center"
                  : "flex flex-col items-start gap-0.5 py-2 text-start",
                disabled && "cursor-not-allowed opacity-45",
                // Selected = raised: a lighter surface, a shadow, heavier type and a tick. Four cues, so
                // it survives greyscale, low contrast and a screen magnifier.
                isConfirmed && (tiles ? "bg-primary font-semibold text-primary-foreground shadow-sm" : "bg-background font-semibold text-foreground shadow-sm"),
                // Requested-not-confirmed: outlined, never filled. Same grammar as the power knob.
                isPending && "border border-dashed border-primary bg-primary/10 text-foreground",
                !active && !disabled && (tiles ? "bg-background text-muted-foreground hover:text-foreground" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"),
              )}
            >
              {tiles && mode.icon ? (
                <span aria-hidden="true" className="grid size-6 place-items-center">
                  {mode.icon}
                </span>
              ) : null}
              {tiles && isConfirmed ? (
                <span aria-hidden="true" className="absolute end-2 top-2">
                  <Tick />
                </span>
              ) : null}
              {!tiles && variant === "segmented" && isConfirmed ? <Tick /> : null}
              <span className="truncate">{mode.label}</span>
              {variant === "list" && mode.description ? (
                <span className="truncate text-label-md font-normal text-muted-foreground">{mode.description}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  },
), "DeviceModeControl");

export { DeviceModeControl };
