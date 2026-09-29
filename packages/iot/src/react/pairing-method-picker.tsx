"use client";

import * as React from "react";
import type { KinetixPairingMethod } from "../types/pairing";
import { KINETIX_PAIRING_METHODS } from "../types/pairing";
import { describePairingMethod } from "../functions/pairing";
import { Glyph } from "./glyph";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * PairingMethodPicker — "how do you want to add this device?", as one radio group.
 *
 * The methods are `KINETIX_PAIRING_METHODS` (bluetooth, same network, QR, code, account); each label
 * and description is the product's to override, because "Bluetooth" is a promise about hardware this
 * package cannot make. Nothing here starts a scan or opens a connection — it reports a choice.
 *
 * **Real radio-group semantics.** `role="radiogroup"` of `role="radio"` buttons with a roving
 * tabindex: one tab stop, arrow keys (and Home/End) move focus *and* selection together, skipping
 * unavailable methods. An **unavailable** method stays visible and named, `aria-disabled`, with its
 * reason printed and linked by `aria-describedby` — a method that vanishes leaves the user hunting for
 * it; one that says "Turn on Bluetooth to use this" answers the question.
 *
 * The selected option is a ringed dot against an empty ring: a shape, not only a colour.
 */
export type PairingMethodOption = {
  label?: string;
  description?: string;
  /** Not usable right now. Shown, not selectable. */
  unavailable?: boolean;
  /** Why it is unavailable, in the product's words. */
  unavailableReason?: string;
};

export interface PairingMethodPickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Which methods to offer, in order. Defaults to all of them. */
  methods?: readonly KinetixPairingMethod[];
  value: KinetixPairingMethod | null | undefined;
  onChange?: (method: KinetixPairingMethod) => void;
  /** Per-method overrides. */
  options?: Partial<Record<KinetixPairingMethod, PairingMethodOption>>;
  /** Accessible name of the group. Defaults to "Pairing method". */
  label?: string;
  disabled?: boolean;
}

const PairingMethodPicker = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, PairingMethodPickerProps>(
  ({ methods = KINETIX_PAIRING_METHODS, value, onChange, options, label = "Pairing method", disabled = false, className, ...props }, ref) => {
    const uid = React.useId();
    const groupRef = React.useRef<HTMLDivElement | null>(null);
    const setGroup = React.useCallback(
      (node: HTMLDivElement | null) => {
        groupRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      },
      [ref],
    );

    const usable = methods.filter((m) => !options?.[m]?.unavailable);
    const [arrowedTo, setArrowedTo] = React.useState<KinetixPairingMethod | null>(null);
    // The tab stop is the selected method, else wherever the user last arrowed, else the first usable one.
    const focusId =
      (arrowedTo && usable.includes(arrowedTo) ? arrowedTo : null) ?? (value && usable.includes(value) ? value : null) ?? usable[0];

    const move = (from: KinetixPairingMethod, step: 1 | -1 | "first" | "last") => {
      if (disabled || usable.length === 0) return;
      const i = usable.indexOf(from);
      const next = step === "first" ? usable[0]! : step === "last" ? usable[usable.length - 1]! : usable[(i + step + usable.length) % usable.length]!;
      setArrowedTo(next);
      // Focus follows selection, as in a native radio group.
      [...(groupRef.current?.querySelectorAll<HTMLElement>("[data-method]") ?? [])].find((el) => el.dataset.method === next)?.focus();
      onChange?.(next);
    };

    return (
      <div ref={setGroup} role="radiogroup" aria-label={label} className={cn("flex min-w-0 flex-col gap-2 font-sans", className)} {...props}>
        {methods.map((method) => {
          const option = options?.[method];
          const selected = method === value;
          const blocked = disabled || option?.unavailable === true;
          const text = option?.label ?? describePairingMethod(method);
          const descId = `${uid}-${method}-desc`;
          const reasonId = `${uid}-${method}-reason`;
          const described = [option?.description ? descId : null, option?.unavailable && option.unavailableReason ? reasonId : null].filter(Boolean).join(" ") || undefined;
          return (
            <button
              key={method}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={blocked || undefined}
              aria-describedby={described}
              tabIndex={method === focusId && !disabled ? 0 : -1}
              data-method={method}
              data-state={selected ? "selected" : "idle"}
              onClick={() => !blocked && onChange?.(method)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                  e.preventDefault();
                  move(method, 1);
                } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  move(method, -1);
                } else if (e.key === "Home") {
                  e.preventDefault();
                  move(method, "first");
                } else if (e.key === "End") {
                  e.preventDefault();
                  move(method, "last");
                }
              }}
              className={cn(
                "flex min-h-11 w-full items-start gap-3 rounded-xl border p-3 text-start transition-colors duration-200 ease-out motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                selected ? "border-primary bg-primary/5" : "border-border bg-card",
                blocked && "cursor-not-allowed border-dashed bg-muted/40",
              )}
            >
              <Glyph name={selected ? "circle-dot" : "circle"} size={18} className={cn("mt-0.5", selected ? "text-primary" : "text-muted-foreground")} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className={cn("break-words text-label-md", blocked ? "text-muted-foreground" : "text-foreground")}>{text}</span>
                {option?.description ? (
                  <span id={descId} className="break-words text-label-sm text-muted-foreground">
                    {option.description}
                  </span>
                ) : null}
                {option?.unavailable ? (
                  <span id={reasonId} data-unavailable="" className="flex items-start gap-1.5 text-label-sm text-foreground">
                    <Glyph name="dash" size={12} className="mt-0.5" />
                    <span>{option.unavailableReason ? `Unavailable: ${option.unavailableReason}` : "Unavailable"}</span>
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    );
  },
), "PairingMethodPicker");

export { PairingMethodPicker };
