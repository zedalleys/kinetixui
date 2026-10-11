"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface DiffViewerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  oldText: string;
  newText: string;
  /** "unified" (one interleaved column, like `git diff`) or "split" (two columns, side by side). Default "unified". */
  mode?: "unified" | "split";
  /** column headers, `mode="split"` only */
  oldLabel?: string;
  newLabel?: string;
}

type DiffOp =
  | { type: "equal"; oldLine: number; newLine: number; text: string }
  | { type: "remove"; oldLine: number; text: string }
  | { type: "add"; newLine: number; text: string };

/**
 * Line-based LCS diff (the same longest-common-subsequence backtrack
 * `git diff`'s line mode is built on), hand-rolled rather than pulled from
 * a package: it needs to behave identically across all four platforms, and
 * a ~30-line DP table is easier to keep in lockstep across React/Compose/
 * SwiftUI/Flutter than four bindings to (or ports of) someone else's diff
 * library. O(n·m) time and space — fine for a config file or a token
 * snapshot, the sizes this dev-tool surface actually sees; not meant for
 * multi-thousand-line files.
 */
function computeLineDiff(oldText: string, newText: string): DiffOp[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const n = oldLines.length;
  const m = newLines.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = oldLines[i] === newLines[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (oldLines[i] === newLines[j]) {
      ops.push({ type: "equal", oldLine: i + 1, newLine: j + 1, text: oldLines[i]! });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      ops.push({ type: "remove", oldLine: i + 1, text: oldLines[i]! });
      i++;
    } else {
      ops.push({ type: "add", newLine: j + 1, text: newLines[j]! });
      j++;
    }
  }
  while (i < n) {
    ops.push({ type: "remove", oldLine: i + 1, text: oldLines[i]! });
    i++;
  }
  while (j < m) {
    ops.push({ type: "add", newLine: j + 1, text: newLines[j]! });
    j++;
  }
  return ops;
}

/**
 * True only while the element can actually scroll. A scroll container no keyboard can reach fails WCAG 2.1.1
 * (axe `scrollable-region-focusable`), but an unconditional `tabIndex` would add a focus stop to every short
 * snippet. Same contract as `Table`'s wrapper; kept in this file, as there, so the registry item stays
 * self-contained. The 1px tolerance absorbs sub-pixel rounding.
 */
function useScrollFocus(ref: React.RefObject<HTMLElement | null>, axis: "x" | "both" = "x"): boolean {
  const [scrollable, setScrollable] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () =>
      setScrollable(
        el.scrollWidth > el.clientWidth + 1 || (axis === "both" && el.scrollHeight > el.clientHeight + 1),
      );

    measure();
    // ResizeObserver rather than a window resize listener: the container changes size with the viewport, and its
    // content changes size with the text, the reader's font size and the active tab — none of which fire a resize
    // event on the window.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [ref, axis]);

  return scrollable;
}

/**
 * DiffViewer — a side-by-side / inline text diff with line markers and
 * gutter line numbers (token diffs, config changes — the site itself could
 * use this for a "what changed between versions" view). `split` mode
 * doesn't pair adjacent remove/add runs onto the same row the way GitHub's
 * split view does — each op renders in its own column, blank on the other
 * side — a deliberate simplification over that extra alignment heuristic.
 * Gap-fill addition (not in the original Figma source).
 */
const DiffViewer = React.forwardRef<HTMLDivElement, DiffViewerProps>(
  ({ oldText, newText, mode = "unified", oldLabel = "Before", newLabel = "After", className, ...props }, ref) => {
    const ops = React.useMemo(() => computeLineDiff(oldText, newText), [oldText, newText]);
    // The container scrolls both ways (long lines; a height a caller caps). While it can, it takes a tab stop so a
    // keyboard can reach it; while it cannot, it stays out of the tab order. A caller's own `tabIndex` still wins.
    const container = React.useRef<HTMLDivElement>(null);
    React.useImperativeHandle(ref, () => container.current as HTMLDivElement);
    const scrollable = useScrollFocus(container, "both");

    return (
      <div
        ref={container}
        className={cn(
          "overflow-auto rounded-md border font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        {...(scrollable ? { tabIndex: 0 } : {})}
        {...props}
      >
        {mode === "split" ? (
          <SplitDiff ops={ops} oldLabel={oldLabel} newLabel={newLabel} />
        ) : (
          <UnifiedDiff ops={ops} />
        )}
      </div>
    );
  },
);
DiffViewer.displayName = "DiffViewer";

function UnifiedDiff({ ops }: { ops: DiffOp[] }) {
  return (
    <div role="table">
      {ops.map((op, i) => (
        <div
          key={i}
          role="row"
          className={cn("flex", op.type === "add" && "bg-success/10", op.type === "remove" && "bg-destructive/10")}
        >
          <span role="cell" className="w-9 shrink-0 select-none border-r px-1.5 text-right text-muted-foreground">
            {op.type !== "add" ? op.oldLine : ""}
          </span>
          <span role="cell" className="w-9 shrink-0 select-none border-r px-1.5 text-right text-muted-foreground">
            {op.type !== "remove" ? op.newLine : ""}
          </span>
          <span
            role="cell"
            className={cn(
              "w-4 shrink-0 select-none text-center",
              op.type === "add" && "text-success",
              op.type === "remove" && "text-destructive",
            )}
          >
            {op.type === "add" ? "+" : op.type === "remove" ? "−" : ""}
          </span>
          <span role="cell" className="min-w-0 flex-1 whitespace-pre px-1">{op.text}</span>
        </div>
      ))}
    </div>
  );
}

function SplitDiff({ ops, oldLabel, newLabel }: { ops: DiffOp[]; oldLabel: string; newLabel: string }) {
  return (
    <div role="table">
      <div role="row" className="flex border-b bg-muted/40 text-muted-foreground">
        <div role="columnheader" className="flex-1 px-2 py-1">{oldLabel}</div>
        <div role="columnheader" className="flex-1 border-l px-2 py-1">{newLabel}</div>
      </div>
      {ops.map((op, i) => (
        <div key={i} role="row" className="flex">
          <div role="cell" className={cn("flex flex-1 items-start", op.type === "remove" && "bg-destructive/10")}>
            <span className="w-9 shrink-0 select-none px-1.5 text-right text-muted-foreground">
              {op.type !== "add" ? op.oldLine : ""}
            </span>
            <span className="min-w-0 flex-1 whitespace-pre px-1">{op.type !== "add" ? op.text : ""}</span>
          </div>
          <div role="cell" className={cn("flex flex-1 items-start border-l", op.type === "add" && "bg-success/10")}>
            <span className="w-9 shrink-0 select-none px-1.5 text-right text-muted-foreground">
              {op.type !== "remove" ? op.newLine : ""}
            </span>
            <span className="min-w-0 flex-1 whitespace-pre px-1">{op.type !== "remove" ? op.text : ""}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export { DiffViewer };
