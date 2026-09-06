"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "../lib/utils";

const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & ({ color?: string; theme?: never } | { color?: never; theme: Record<keyof typeof THEMES, string> });
};

type ChartContextProps = { config: ChartConfig };
const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error("useChart must be used within a <ChartContainer />");
  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
    /**
     * Text alternative for the chart (WCAG 1.1.1). A chart conveys its data by
     * colour + position, which a screen reader can't relay — pass a one-line
     * summary of what it shows and the trend. Falls back to "Chart".
     * Cartesian charts should also get `accessibilityLayer` on the Recharts
     * primitive for keyboard data-point navigation.
     */
    label?: string;
    /**
     * Render a placeholder in place of the chart. `"loading"` shows a shimmer,
     * `"empty"` / `"error"` show a message (override with `stateMessage`).
     */
    state?: "loading" | "empty" | "error";
    stateMessage?: string;
    /**
     * Visually-hidden `<table>` rendered after the chart so a screen reader can
     * read the underlying numbers. Pair with a concise `label`.
     */
    srTable?: { columns: React.ReactNode[]; rows: React.ReactNode[][] };
  }
>(({
  id,
  className,
  children,
  config,
  label,
  state,
  stateMessage,
  srTable,
  role,
  "aria-label": ariaLabel,
  ...props
}, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;
  const name = ariaLabel ?? label ?? "Chart";

  const innerRef = React.useRef<HTMLDivElement | null>(null);
  const setRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref],
  );

  // The container carries the text alternative (role="img" + aria-label).
  // Recharts additionally (a) tags individual sector / dot <path>s with
  // role="img" and no <title> — redundant noise that fails axe's svg-img-alt —
  // and (b) leaves its accessibilityLayer <svg role="application"> unnamed.
  // Fix both on the rendered output; re-run on Recharts re-layout.
  React.useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const scrub = () => {
      el.querySelector(".recharts-surface")?.setAttribute("aria-label", name);
      el.querySelectorAll('[role="img"]:not([data-chart])').forEach((n) => n.removeAttribute("role"));
    };
    scrub();
    const mo = new MutationObserver(scrub);
    mo.observe(el, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [name]);

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={setRef}
        role={role ?? "img"}
        aria-label={name}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        {state ? (
          <ChartState state={state} message={stateMessage} />
        ) : (
          <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
        )}
        {srTable && !state ? <ChartSrTable {...srTable} /> : null}
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "Chart";

const STATE_COPY = {
  loading: "Loading chart…",
  empty: "No data to show",
  error: "Couldn't load this chart",
} as const;

function ChartState({
  state,
  message,
}: {
  state: "loading" | "empty" | "error";
  message?: string;
}) {
  return (
    <div
      role={state === "error" ? "alert" : "status"}
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 text-center text-xs",
        state === "error" ? "border-destructive/40 text-destructive" : "border-border text-muted-foreground",
      )}
    >
      {state === "loading" ? (
        <div aria-hidden className="flex w-full max-w-[220px] items-end justify-between gap-1.5">
          {[40, 72, 56, 88, 48, 64, 80].map((h, i) => (
            <span
              key={i}
              className="w-full animate-pulse rounded-sm bg-muted"
              style={{ height: `${h}px`, animationDelay: `${i * 90}ms` }}
            />
          ))}
        </div>
      ) : (
        <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
          {state === "empty" ? (
            <path d="M3 3v18h18M7 15l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.42 0Z" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      )}
      <span>{message ?? STATE_COPY[state]}</span>
    </div>
  );
}

function ChartSrTable({
  columns,
  rows,
}: {
  columns: React.ReactNode[];
  rows: React.ReactNode[][];
}) {
  return (
    <table className="sr-only">
      <thead>
        <tr>
          {columns.map((c, i) => (
            <th key={i} scope="col">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, c]) => c.theme || c.color);
  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean;
      hideIndicator?: boolean;
      indicator?: "line" | "dot" | "dashed";
      nameKey?: string;
      labelKey?: string;
    }
>(
  (
    { active, payload, className, indicator = "dot", hideLabel = false, hideIndicator = false, label, labelFormatter, formatter, color },
    ref,
  ) => {
    const { config } = useChart();

    if (!active || !payload?.length) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className,
        )}
      >
        {!hideLabel && (
          <div className="font-medium">{labelFormatter ? labelFormatter(label, payload) : label}</div>
        )}
        <div className="grid gap-1.5">
          {payload.map((item, i) => {
            const key = `${item.name || item.dataKey || "value"}`;
            const itemConfig = config[key];
            const indicatorColor = color || (item.payload as Record<string, string>)?.fill || item.color;
            return (
              <div key={key + i} className="flex w-full items-center gap-2">
                {!hideIndicator && (
                  <div
                    className={cn("shrink-0 rounded-[2px]", {
                      "size-2.5": indicator === "dot",
                      "w-1": indicator === "line",
                      "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed",
                    })}
                    style={{ backgroundColor: indicatorColor, borderColor: indicatorColor }}
                  />
                )}
                <div className="flex flex-1 justify-between leading-none">
                  <span className="text-muted-foreground">{itemConfig?.label || item.name}</span>
                  {item.value != null && (
                    <span className="font-mono font-medium tabular-nums text-foreground">
                      {formatter ? formatter(item.value, item.name!, item, i, payload) : item.value.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = "ChartTooltipContent";

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & { hideIcon?: boolean; nameKey?: string }
>(({ className, payload, verticalAlign = "bottom" }, ref) => {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <div
      ref={ref}
      className={cn("flex items-center justify-center gap-4", verticalAlign === "top" ? "pb-3" : "pt-3", className)}
    >
      {payload.map((item) => {
        const key = `${item.dataKey || "value"}`;
        const itemConfig = config[key];
        return (
          <div key={item.value} className="flex items-center gap-1.5">
            <div className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
            {itemConfig?.label || item.value}
          </div>
        );
      })}
    </div>
  );
});
ChartLegendContent.displayName = "ChartLegendContent";

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle };
