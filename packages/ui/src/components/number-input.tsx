"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * NumberInput — a numeric field with increment / decrement controls.
 * The wrapper shows `--shadow-focus` on `focus-within`; each stepper also
 * draws its own `--ring` inset outline on `:focus-visible` so keyboard users
 * can tell which control is focused.
 */
export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange"> {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, defaultValue = 0, min, max, step = 1, onChange, disabled, ...props }, ref) => {
    const [internal, setInternal] = React.useState(defaultValue);
    const current = value ?? internal;

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
    };

    return (
      <div
        className={cn(
          "flex h-10 items-stretch overflow-hidden rounded-md border border-input font-sans focus-within:shadow-focus",
          disabled && "pointer-events-none opacity-50",
          className,
        )}
      >
        <button
          type="button"
          aria-label="Decrease"
          disabled={disabled || (min != null && current <= min)}
          onClick={() => set(current - step)}
          className="flex w-9 shrink-0 items-center justify-center text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
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
          onChange={(e) => {
            const n = e.target.valueAsNumber;
            if (!Number.isNaN(n)) set(n);
          }}
          className="w-full min-w-0 flex-1 border-x border-input bg-transparent px-2 text-center text-body-md text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          {...props}
        />
        <button
          type="button"
          aria-label="Increase"
          disabled={disabled || (max != null && current >= max)}
          onClick={() => set(current + step)}
          className="flex w-9 shrink-0 items-center justify-center text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          <Plus className="size-4" />
        </button>
      </div>
    );
  },
);
NumberInput.displayName = "NumberInput";

export { NumberInput };
