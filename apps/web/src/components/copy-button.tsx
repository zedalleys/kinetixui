"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * `onCopy` runs after the text has actually reached the clipboard (never when the write is blocked). It is how a
 * caller reports a copy to analytics: the callback gets no arguments, so the copied text cannot leak into an event.
 */
export function CopyButton({ value, className, onCopy }: { value: string; className?: string; onCopy?: () => void }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <button
      type="button"
      aria-label="Copy"
      onClick={() => {
        navigator.clipboard.writeText(value).then(
          () => {
            onCopy?.();
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          },
          // clipboard blocked (permissions, insecure context): nothing was copied, so nothing is reported
          () => {},
        );
      }}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}
