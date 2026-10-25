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

  /**
   * The reset timer is held so it can be cleared. A timer started in a handler outlives the component that
   * started it: the reader navigates away inside the 1500ms window and the callback still runs, holding the
   * closure and setting state on something that is gone. React 18 makes that a silent no-op, so nothing
   * complains in a browser — but under vitest the same orphan can fire after jsdom is torn down, and then
   * surfaces as `ReferenceError: window is not defined` in an unrelated test file.
   *
   * Clearing on each copy as well as on unmount: a second click inside the window would otherwise leave the
   * first timer running, and the earlier one would clear `copied` while the later copy is still fresh.
   */
  const resetTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  React.useEffect(() => () => clearTimeout(resetTimer.current), []);

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
              clearTimeout(resetTimer.current);
              resetTimer.current = setTimeout(() => setCopied(false), 1500);
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
