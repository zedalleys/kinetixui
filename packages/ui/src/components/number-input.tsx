"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * NumberInput — a numeric field with increment / decrement controls.
 *
 * The wrapper is ONE field and follows the text-entry state contract (TOKENS.md, "Composite fields"); the
 * steppers sit inside its edge, separated by quiet internal dividers rather than borders of their own.
 *
 *   rest       edge `--muted-foreground` at 80% (3:1 on a card; `--input` was 2.2:1)
 *   hover      the edge steps to full `--muted-foreground` — never over focus, invalid, read-only or disabled
 *   focus      the INPUT focused → `--action` edge + `--shadow-focus` on the wrapper. A stepper focused → its
 *              own inset `--ring`, and the wrapper stays at rest, so the ring says which part has focus
 *   invalid    `aria-invalid="true"` (passed through to the input) → `--destructive` edge, kept under the
 *              pointer and focus
 *   read-only  `readOnly` → the inset `--muted` fill, and the steppers are disabled: a read-only value is
 *              not one a button may change either
 *   disabled   `--opacity-disabled`, inert
 *
 * It is also the catalogue's QuantityPicker (cart lines, tickets, rooms, guests — business capability
 * roadmap, Phase 2), so two things a quantity needs are part of the base contract:
 *
 *   bounds     a stepper at `min`/`max` is `aria-disabled`, not `disabled`. A focused button that becomes
 *              `disabled` drops keyboard focus to the page body, so pressing Decrease down to the minimum
 *              used to lose the reader's place. It stays focusable, says it is unavailable, and does nothing
 *   announced  a stepper press changes a value the reader is not focused on, which no screen reader reads
 *              out. The new value goes into a polite visually hidden status region (`formatAnnouncement`
 *              turns 2 into "2 guests"); typing in the field is not announced, because the field itself is
 *              read back as it changes
 *
 * The stepper names default to "Decrease"/"Increase" and are replaceable (`decrementLabel`,
 * `incrementLabel`) for localisation or to name what is counted.
 */
export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange"> {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  /** Accessible name of the decrement button. Default "Decrease". */
  decrementLabel?: string;
  /** Accessible name of the increment button. Default "Increase". */
  incrementLabel?: string;
  /** What is announced after a stepper press. Default: the number itself. */
  formatAnnouncement?: (value: number) => string;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      value,
      defaultValue = 0,
      min,
      max,
      step = 1,
      onChange,
      disabled,
      readOnly,
      decrementLabel = "Decrease",
      incrementLabel = "Increase",
      formatAnnouncement = String,
      ...props
    },
    ref,
  ) => {
    const [internal, setInternal] = React.useState(defaultValue);
    const [announcement, setAnnouncement] = React.useState("");
    const current = value ?? internal;
    const atMin = min != null && current <= min;
    const atMax = max != null && current >= max;

    const clamp = (n: number) => {
      let v = n;
      if (min != null) v = Math.max(min, v);
      if (max != null) v = Math.min(max, v);
      return v;
    };

    const set = (n: number) => {
      const v = clamp(n);
      setInternal(v);
      onChange?.(v);
      return v;
    };

    const stepBy = (delta: number, blocked: boolean) => {
      if (blocked || disabled || readOnly) return;
      setAnnouncement(formatAnnouncement(set(current + delta)));
    };

    return (
      <div
        className={cn(
          // no fixed height: the input's own padding sets it, so it matches Input and InputGroup in the same row
          // (it was a fixed 40px beside their 46px) and still grows with the text
          "flex items-stretch overflow-hidden rounded-md border border-muted-foreground/80 bg-background font-sans",
          "transition-[border-color,box-shadow,background-color] duration-instant ease-standard",
          !disabled && "[@media(hover:hover)]:hover:[&:not(:has(input:is(:focus,[readonly],[aria-invalid=true])))]:border-muted-foreground",
          "has-[input[readonly]]:bg-muted",
          "has-[input:focus:not([aria-invalid=true])]:border-action has-[input:focus]:shadow-focus",
          "has-[input[aria-invalid=true]]:border-destructive has-[input[aria-invalid=true]:focus]:shadow-focus-destructive",
          disabled && "pointer-events-none opacity-disabled",
          className,
        )}
      >
        <button
          type="button"
          aria-label={decrementLabel}
          disabled={disabled || readOnly}
          aria-disabled={atMin || undefined}
          onClick={() => stepBy(-step, atMin)}
          className="flex w-9 shrink-0 items-center justify-center text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-disabled aria-disabled:cursor-not-allowed aria-disabled:opacity-disabled aria-disabled:hover:bg-transparent"
        >
          <Minus className="size-4" />
        </button>
        <input
          ref={ref}
          type="number"
          inputMode="numeric"
          value={current}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(e) => {
            const n = e.target.valueAsNumber;
            if (!Number.isNaN(n)) set(n);
          }}
          className="w-full min-w-0 flex-1 border-x border-input bg-transparent px-2 py-3 text-center text-body-md text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          {...props}
        />
        <button
          type="button"
          aria-label={incrementLabel}
          disabled={disabled || readOnly}
          aria-disabled={atMax || undefined}
          onClick={() => stepBy(step, atMax)}
          className="flex w-9 shrink-0 items-center justify-center text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-disabled aria-disabled:cursor-not-allowed aria-disabled:opacity-disabled aria-disabled:hover:bg-transparent"
        >
          <Plus className="size-4" />
        </button>
        <span role="status" className="sr-only" data-slot="number-input-announcement">
          {announcement}
        </span>
      </div>
    );
  },
);
NumberInput.displayName = "NumberInput";

export { NumberInput };
