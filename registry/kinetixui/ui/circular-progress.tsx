"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * CircularProgress — a ring progress indicator. Track = `--muted`, indicator
 * = `--primary`. Optionally shows the value in the centre.
 */
export interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  /** diameter in px */
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  /** override the visible label (defaults to `${value}%`) */
  label?: React.ReactNode;
}

const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  ({ value = 0, size = 48, strokeWidth = 4, showValue = false, label, className, ...props }, ref) => {
    const v = Math.max(0, Math.min(100, value));
    const r = (size - strokeWidth) / 2;
    const c = 2 * Math.PI * r;

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        className={cn("relative inline-grid place-items-center font-sans", className)}
        style={{ width: size, height: size }}
        {...props}
      >
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (v / 100) * c}
            className="stroke-primary transition-[stroke-dashoffset] duration-300"
          />
        </svg>
        {(showValue || label != null) && (
          <span className="absolute text-label-md text-foreground">{label ?? `${Math.round(v)}%`}</span>
        )}
      </div>
    );
  },
);
CircularProgress.displayName = "CircularProgress";

export { CircularProgress };
