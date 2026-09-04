"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** MDX <pre> with a hover-revealed copy button. Used for fenced code blocks. */
export function CodePre({ className, children, ...props }: React.ComponentPropsWithoutRef<"pre">) {
  const ref = React.useRef<HTMLPreElement>(null);
  const [copied, setCopied] = React.useState(false);

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
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  };

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={copy}
        aria-label="Copy code"
        className={cn(
          "absolute right-2.5 top-2.5 z-10 inline-flex size-7 items-center justify-center rounded-md border border-border bg-background/80 text-muted-foreground opacity-0 backdrop-blur transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100",
        )}
      >
        {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
      </button>
      <pre
        ref={ref}
        className={cn("my-4 rounded-lg border border-border bg-muted/40 text-[13px]", className)}
        {...props}
      >
        {children}
      </pre>
    </div>
  );
}
