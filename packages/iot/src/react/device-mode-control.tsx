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
export interface DeviceModeControlProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "onSelect"> {
  modes: readonly KinetixDeviceMode[];
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
}

const DeviceModeControl = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, DeviceModeControlProps>(
  ({ modes, value, requested, label, control, onSelect, variant = "segmented", className, ...props }, ref) => {
    const pendingId = requested && requested !== value ? requested : null;
    const interactive = control ? control.interactive : true;

    const selectable = modes.filter((m) => !m.unavailable);
    // Roving tabindex lands on the current mode, or the first selectable one if the device reports
    // a mode this product no longer offers.
    const focusId = modes.find((m) => m.id === (pendingId ?? value))?.id ?? selectable[0]?.id;

    const move = (from: string, dir: 1 | -1) => {
      if (!interactive || selectable.length === 0) return;
      const i = selectable.findIndex((m) => m.id === from);
      const next = selectable[(i + dir + selectable.length) % selectable.length]!;
      onSelect?.(next.id);
    };

    return (
      <div
        ref={ref}
        role="radiogroup"
        aria-label={label}
        data-pending={pendingId ? "" : undefined}
        className={cn(
          variant === "segmented"
            ? "inline-flex rounded-xl border border-border bg-muted/50 p-1"
            : "flex flex-col gap-1.5",
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
                "relative min-h-11 rounded-lg px-3 text-label-md transition-colors duration-200 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                "focus-visible:ring-offset-background motion-reduce:transition-none",
                variant === "segmented" ? "flex-1 text-center" : "flex flex-col items-start gap-0.5 py-2 text-start",
                disabled && "cursor-not-allowed opacity-45",
                isConfirmed && "bg-card text-foreground shadow-sm",
                // Requested-not-confirmed: outlined, never filled. Same grammar as the power knob.
                isPending && "border border-dashed border-primary text-primary",
                !active && !disabled && "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="truncate">{mode.label}</span>
              {variant === "list" && mode.description ? (
                <span className="truncate text-label-sm text-muted-foreground">{mode.description}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  },
), "DeviceModeControl");

export { DeviceModeControl };
