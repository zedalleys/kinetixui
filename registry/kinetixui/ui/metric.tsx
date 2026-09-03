"use client";

import * as React from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Metric — a stat / KPI display: label, value, an optional trend indicator
 * and an optional chart or icon slot (bring your own chart, e.g. compose
 * with `ChartContainer`).
 */
export interface MetricProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  change?: React.ReactNode;
  icon?: React.ReactNode;
  chart?: React.ReactNode;
}

const Metric = React.forwardRef<HTMLDivElement, MetricProps>(
  ({ className, label, value, trend, change, icon, chart, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-2 rounded-md border border-input p-4 font-sans", className)} {...props}>
      <div className="flex items-center justify-between">
        <p className="text-body-sm text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground [&_svg]:size-5">{icon}</span>}
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-headline-sm font-medium text-foreground">{value}</p>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-label-md font-medium",
              trend === "up" && "text-success",
              trend === "down" && "text-destructive",
              trend === "neutral" && "text-muted-foreground",
            )}
          >
            {trend === "up" && <ArrowUp className="size-3.5" />}
            {trend === "down" && <ArrowDown className="size-3.5" />}
            {change}
          </span>
        )}
      </div>
      {chart && <div className="mt-1">{chart}</div>}
    </div>
  ),
);
Metric.displayName = "Metric";

export { Metric };
