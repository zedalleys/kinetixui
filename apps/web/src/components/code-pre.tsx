"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@kinetixui/ui";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { trackFenceCopy } from "@/lib/analytics-surfaces";
import { useTransientState } from "@/lib/use-transient-state";

/** MDX <pre>: always-visible mobile copy control, revealed by hover/focus on desktop. */
export function CodePre({ className, children, ...props }: React.ComponentPropsWithoutRef<"pre">) {
  const isTextDiagram = (props as { "data-language"?: string })["data-language"] === "text";
  const ref = React.useRef<HTMLPreElement>(null);
  const pathname = usePathname();
  const [copied, showCopied] = useTransientState(false, 2000);

  const copy = () => {
    const el = ref.current;
    if (!el) return;
    const lines = el.querySelectorAll("[data-line]");
    const text = lines.length
      ? Array.from(lines)
          .map((l) => l.textContent ?? "")
          .join("\n")
      : (el.textContent ?? "");
    navigator.clipboard.writeText(text.replace(/\n$/, "")).then(
      () => {
        // rehype-pretty-code sets data-language on the <pre>; the copied text is inspected, never sent
        trackFenceCopy(text, (props as { "data-language"?: string })["data-language"], pathname);
        showCopied(true);
      },
      () => {},
    );
  };

  return (
    <div className="group relative">
      <Button
        variant="Ghost"
        size="icon"
        type="button"
        onClick={copy}
        aria-label="Copy code"
        className="kx-hit absolute end-2.5 top-2.5 z-10 size-7 p-0 bg-background text-muted-foreground opacity-100 md:opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
      >
        {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
      </Button>
      <span aria-live="polite" className="sr-only">{copied ? "Copied" : ""}</span>
      <pre
        ref={ref}
        data-documentation-tree={isTextDiagram || undefined}
        dir={isTextDiagram ? "ltr" : undefined}
        role={isTextDiagram ? "group" : undefined}
        aria-label={isTextDiagram ? "Scrollable text diagram" : undefined}
        // a code block scrolls sideways when a line is long, so the keyboard must be able to reach it
        tabIndex={0}
        className={cn("my-4 overflow-x-auto rounded-lg border border-border bg-muted/40 text-code focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
        {...props}
      >
        {children}
      </pre>
    </div>
  );
}
