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
 * ## Tiles (visual pass)
 * Each method is a soft tonal tile — an original inline icon (waves, network nodes, a QR grid, a keypad,
 * an account) over the title and a one-line description — in a two-then-three column grid. The selected
 * tile is raised (surface, shadow, a ring) with a check and a heavier title, so selection is a shape and a
 * weight and never a colour alone; an unavailable tile is dashed with its reason printed. The icons are
 * generic shapes, not any vendor's marks.
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

/** Small original icons, drawn on a 24 grid: generic shapes for a radio, a network, a code, a keypad, an account. */
function MethodIcon({ method }: { method: string }) {
  const shape =
    method === "bluetooth" ? (
      <>
        <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
        <path d="M9.5 8.5a5 5 0 0 1 0 7M13 5.5a9 9 0 0 1 0 13M16.5 3a13 13 0 0 1 0 18" />
      </>
    ) : method === "network" ? (
      <>
        <circle cx="12" cy="5" r="2" />
        <circle cx="5" cy="19" r="2" />
        <circle cx="19" cy="19" r="2" />
        <path d="M12 7v4M12 11l-6 6.2M12 11l6 6.2" />
      </>
    ) : method === "qr" ? (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.2" />
        <rect x="14" y="3" width="7" height="7" rx="1.2" />
        <rect x="3" y="14" width="7" height="7" rx="1.2" />
        <path d="M14 14h3v3h-3zM20 14v.01M14 20v.01M17 20h4v-3" />
      </>
    ) : method === "manual-code" ? (
      <g fill="currentColor" stroke="none">
        {[6, 12, 18].flatMap((x) => [6, 12, 18].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />))}
      </g>
    ) : method === "cloud" ? (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </>
    ) : (
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    );
  return (
    <svg aria-hidden="true" focusable="false" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      {shape}
    </svg>
  );
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
      <div ref={setGroup} role="radiogroup" aria-label={label} className={cn("grid min-w-0 grid-cols-2 gap-3 font-sans md:grid-cols-3", className)} {...props}>
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
                "relative flex min-h-11 w-full min-w-0 flex-col items-start gap-3 rounded-2xl p-4 text-start transition-all duration-base ease-out motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                selected ? "bg-background shadow-md ring-2 ring-primary" : "bg-muted/50 hover:bg-muted",
                blocked && "cursor-not-allowed border border-dashed border-muted-foreground bg-transparent shadow-none hover:bg-transparent",
              )}
            >
              <span className={cn("grid size-11 place-items-center rounded-xl", selected ? "bg-primary text-primary-foreground" : "bg-background text-foreground", blocked && "bg-muted text-muted-foreground")}>
                <MethodIcon method={method} />
              </span>
              {selected ? <Glyph name="check" size={18} className="absolute end-3 top-3 text-primary" /> : null}
              <span className="flex min-w-0 flex-col gap-1">
                <span className={cn("break-words text-title-sm", selected ? "font-semibold" : "", blocked ? "text-muted-foreground" : "text-foreground")}>{text}</span>
                {option?.description ? (
                  <span id={descId} className="break-words text-body-sm text-muted-foreground">
                    {option.description}
                  </span>
                ) : null}
                {option?.unavailable ? (
                  <span id={reasonId} data-unavailable="" className="flex items-start gap-1.5 text-body-sm text-foreground">
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
