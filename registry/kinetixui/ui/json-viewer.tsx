"use client";

import * as React from "react";
import { Check, ChevronRight, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface JsonViewerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  data: unknown;
  /** tree depth (root = 0) to auto-expand; deeper nodes start collapsed. Default 1. */
  expandDepth?: number;
  hideCopy?: boolean;
}

/**
 * JsonViewer — a collapsible, syntax-colored tree for arbitrary JSON data
 * (API responses, registry payloads, token diffs — a dev-tool surface the
 * site itself needs for `/docs/kinetixui-json` and friends). Distinct from
 * `TreeView`: this renders a *data structure* (object/array/primitive),
 * not a caller-composed hierarchy of `TreeItem`s, so expand state is
 * per-node uncontrolled rather than a lifted `expanded` prop — there's no
 * stable "value" to key a node by beyond its position in the data, and
 * nothing external needs to drive which nodes are open. Value colors reuse
 * the existing semantic tokens (`--success`/`--info`/`--warning`) rather
 * than introducing a separate syntax-highlighting palette. Gap-fill
 * addition (not in the original Figma source).
 */
const JsonViewer = React.forwardRef<HTMLDivElement, JsonViewerProps>(
  ({ data, expandDepth = 1, hideCopy, className, ...props }, ref) => {
    const [copied, setCopied] = React.useState(false);

    const copy = async () => {
      try {
        await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      } catch {
        // clipboard unavailable — no-op
      }
    };

    return (
      <div
        ref={ref}
        className={cn("relative overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs", className)}
        {...props}
      >
        {!hideCopy && (
          <button
            type="button"
            onClick={copy}
            aria-label="Copy JSON"
            className="absolute right-2 top-2 inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </button>
        )}
        <div role="tree">
          <JsonNode value={data} depth={0} expandDepth={expandDepth} isLast />
        </div>
      </div>
    );
  },
);
JsonViewer.displayName = "JsonViewer";

function JsonNode({
  name,
  value,
  depth,
  expandDepth,
  isLast,
}: {
  name?: string;
  value: unknown;
  depth: number;
  expandDepth: number;
  isLast: boolean;
}) {
  const isContainer = value !== null && typeof value === "object";
  const [expanded, setExpanded] = React.useState(depth < expandDepth);

  if (!isContainer) {
    return (
      <div role="treeitem" style={{ paddingLeft: depth * 16 }}>
        {name !== undefined && <span className="text-muted-foreground">{JSON.stringify(name)}: </span>}
        <JsonPrimitive value={value} />
        {!isLast && <span className="text-muted-foreground">,</span>}
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries: [string, unknown][] = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v])
    : Object.entries(value as Record<string, unknown>);
  const openBracket = isArray ? "[" : "{";
  const closeBracket = isArray ? "]" : "}";

  if (entries.length === 0) {
    return (
      <div role="treeitem" style={{ paddingLeft: depth * 16 + 20 }}>
        {name !== undefined && <span className="text-muted-foreground">{JSON.stringify(name)}: </span>}
        <span>
          {openBracket}
          {closeBracket}
        </span>
        {!isLast && <span className="text-muted-foreground">,</span>}
      </div>
    );
  }

  return (
    <div role="treeitem" aria-expanded={expanded}>
      <div style={{ paddingLeft: depth * 16 }} className="flex items-start gap-1">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Collapse" : "Expand"}
          className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className={cn("size-3 transition-transform", expanded && "rotate-90")} />
        </button>
        <span>
          {name !== undefined && <span className="text-muted-foreground">{JSON.stringify(name)}: </span>}
          <span>{openBracket}</span>
          {!expanded && (
            <span className="text-muted-foreground">
              {" "}
              {entries.length} {isArray ? "item" : "key"}
              {entries.length === 1 ? "" : "s"}{" "}
            </span>
          )}
          {!expanded && <span>{closeBracket}</span>}
          {!expanded && !isLast && <span className="text-muted-foreground">,</span>}
        </span>
      </div>
      {expanded && (
        <>
          {entries.map(([key, val], i) => (
            <JsonNode
              key={key}
              name={isArray ? undefined : key}
              value={val}
              depth={depth + 1}
              expandDepth={expandDepth}
              isLast={i === entries.length - 1}
            />
          ))}
          <div style={{ paddingLeft: depth * 16 }}>
            <span>{closeBracket}</span>
            {!isLast && <span className="text-muted-foreground">,</span>}
          </div>
        </>
      )}
    </div>
  );
}

function JsonPrimitive({ value }: { value: unknown }) {
  if (value === null) return <span className="italic text-muted-foreground">null</span>;
  if (value === undefined) return <span className="italic text-muted-foreground">undefined</span>;
  if (typeof value === "string") return <span className="text-success">{JSON.stringify(value)}</span>;
  if (typeof value === "number") return <span className="text-info">{value}</span>;
  if (typeof value === "boolean") return <span className="text-warning">{String(value)}</span>;
  return <span>{String(value)}</span>;
}

export { JsonViewer };
