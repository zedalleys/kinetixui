"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@kinetixui/ui";
import { cn } from "@/lib/utils";

/**
 * `onCopy` runs after the text has actually reached the clipboard (never when the write is blocked). It is how a
 * caller reports a copy to analytics: the callback gets no arguments, so the copied text cannot leak into an event.
 */
export function CopyButton({
  value,
  className,
  onCopy,
  label = "Copy",
}: {
  value: string;
  className?: string;
  onCopy?: () => void;
  /** The button's accessible name. Name it when several copy buttons share a region, so each says what it copies. */
  label?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  // The icon swap is visual only; the live region is what tells a screen reader the copy happened.
  return (
    <>
      <Button
        variant="Ghost"
        size="icon"
        type="button"
        aria-label={label}
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
          // kx-hit preserves the coarse-pointer hit-area contract (globals.css)
          // Keep toolbar shrink behavior at 200% text; callers retain the coarse hit area.
          "kx-hit size-11 shrink p-0 text-muted-foreground",
          className,
        )}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </Button>
      <span aria-live="polite" className="sr-only">{copied ? "Copied" : ""}</span>
    </>
  );
}
