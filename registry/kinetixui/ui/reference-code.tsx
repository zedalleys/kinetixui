"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ReferenceCode — a code the reader will need again: a booking reference, an order number, a transaction
 * ID, a voucher code, a support ticket. It shows the code, makes it trivially selectable and copyable, and
 * says out loud whether the copy worked.
 *
 *   selectable  the value is `user-select: all`, so one click or tap selects the whole code (no dragging
 *               across a 12-character string with a thumb), and `translate="no"` keeps browser page
 *               translation from rewriting it.
 *   copyable    a real `<button>` whose accessible name is its visible text plus the label — "Copy Booking
 *               reference" — so it is distinguishable when a page carries several codes (WCAG 2.5.3: the
 *               visible word is inside the name).
 *   feedback    the result goes into a polite `role="status"` region that is always rendered, so it is
 *               announced; it is also visible beside the button. The button's own label never changes —
 *               swapping a focused button's name is announced inconsistently across screen readers.
 *   failure     the Clipboard API is missing in insecure contexts and can be refused by permissions. The
 *               component does not pretend: it selects the code so a keyboard copy works, and says so.
 *
 * It does not format, validate, mask or generate the code. What the value means is the product's business;
 * `value` is shown and copied exactly as given.
 */
export interface ReferenceCodeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onCopy"> {
  /** What the code is — "Booking reference", "Order number". Shown above the code and used to name the copy button. */
  label: React.ReactNode;
  /** The code itself, copied exactly as given. */
  value: string;
  /** Show the copy button. Default true. */
  copyable?: boolean;
  /** `lg` for a code that is the point of the screen (a confirmation); `md` (default) inside details. */
  size?: "md" | "lg";
  /** Visible text of the copy button. Default "Copy". */
  copyLabel?: string;
  /** Announced and shown after a successful copy. Default "Copied". */
  copiedMessage?: string;
  /** Announced and shown when the clipboard is unavailable or refused. */
  copyFailedMessage?: string;
  /** Called with the value after it reached the clipboard. */
  onCopy?: (value: string) => void;
}

/** How long the confirmation stays visible. Announcements are not cut short by its removal. */
const FEEDBACK_MS = 2000;

const ReferenceCode = React.forwardRef<HTMLDivElement, ReferenceCodeProps>(
  (
    {
      className,
      label,
      value,
      copyable = true,
      size = "md",
      copyLabel = "Copy",
      copiedMessage = "Copied",
      copyFailedMessage = "Couldn't copy automatically. The code is selected — copy it with your keyboard.",
      onCopy,
      ...props
    },
    ref,
  ) => {
    const id = React.useId();
    const labelId = `${id}-label`;
    const buttonTextId = `${id}-copy`;
    const valueRef = React.useRef<HTMLSpanElement>(null);
    const [feedback, setFeedback] = React.useState<"idle" | "copied" | "failed">("idle");
    const timer = React.useRef<number | undefined>(undefined);

    React.useEffect(() => () => window.clearTimeout(timer.current), []);

    const selectValue = () => {
      const node = valueRef.current;
      const selection = typeof window !== "undefined" ? window.getSelection() : null;
      if (!node || !selection) return;
      const range = document.createRange();
      range.selectNodeContents(node);
      selection.removeAllRanges();
      selection.addRange(range);
    };

    const copy = async () => {
      window.clearTimeout(timer.current);
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
        await navigator.clipboard.writeText(value);
      } catch {
        // Leave the failure message up: the reader still has to act on it.
        selectValue();
        setFeedback("failed");
        return;
      }
      setFeedback("copied");
      timer.current = window.setTimeout(() => setFeedback("idle"), FEEDBACK_MS);
      // Outside the clipboard try: a consumer callback that throws must not turn a real copy into "Couldn't copy".
      onCopy?.(value);
    };

    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={labelId}
        className={cn("inline-flex min-w-0 max-w-full flex-col gap-1 font-sans", className)}
        {...props}
      >
        <span id={labelId} className="text-label-md text-muted-foreground">
          {label}
        </span>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <span
            ref={valueRef}
            translate="no"
            className={cn(
              "min-w-0 select-all font-mono font-semibold tracking-wide text-foreground [overflow-wrap:anywhere]",
              size === "lg" ? "text-headline-sm" : "text-title-md",
            )}
          >
            {value}
          </span>
          {copyable && (
            <button
              type="button"
              onClick={copy}
              aria-labelledby={`${buttonTextId} ${labelId}`}
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border border-input px-3 text-label-md text-foreground outline-none transition-colors duration-fast ease-standard hover:bg-muted focus-visible:shadow-focus motion-reduce:transition-none [&>svg]:size-4 [&>svg]:shrink-0"
            >
              {feedback === "copied" ? <Check aria-hidden /> : <Copy aria-hidden />}
              <span id={buttonTextId}>{copyLabel}</span>
            </button>
          )}
        </div>
        {copyable && (
          <span
            role="status"
            data-slot="reference-code-feedback"
            className={cn(
              "text-body-sm",
              feedback === "failed" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {feedback === "copied" ? copiedMessage : feedback === "failed" ? copyFailedMessage : ""}
          </span>
        )}
      </div>
    );
  },
);
ReferenceCode.displayName = "ReferenceCode";

export { ReferenceCode };
