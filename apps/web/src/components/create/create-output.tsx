"use client";

import * as React from "react";
import { Button } from "@kinetixui/ui";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared copy state: label swaps to a confirmation and an aria-live region announces it. */
function useCopy(value: string) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => () => clearTimeout(timer.current), []);

  const copy = React.useCallback(() => {
    navigator.clipboard.writeText(value).then(
      () => {
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1500);
      },
      // Clipboard blocked (insecure context, denied permission): nothing was copied, so claim nothing.
      () => {},
    );
  }, [value]);

  return { copied, copy };
}

/**
 * "Copy CSS", not "Export theme".
 *
 * What this produces is a block of CSS custom properties for the web. It is not a theme package and it is
 * not a native export, so it is not called one — `kinetixui theme build` has the same honest scope, and
 * PR 4 is where that changes.
 */
export function CopyCssButton({ css, className, disabled }: { css: string; className?: string; disabled?: boolean }) {
  const { copied, copy } = useCopy(css);

  return (
    <>
      <Button size="sm" variant="Outline" onClick={copy} disabled={disabled} className={className}>
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        Copy CSS
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? "CSS copied to clipboard" : ""}
      </span>
    </>
  );
}

/**
 * The generated block: only what differs from the shipped theme, in both appearances.
 *
 * It is NOT the same output `kinetixui theme build` writes any more, and the caption says so. The CLI
 * compiles a CSV of colours into one `:root` block; Create also writes a `.dark` block and the radius and
 * elevation variables, which the CLI has no input format for. PR 1 claimed the two were identical, and
 * keeping that sentence once it stopped being true would be the exact failure the campaign this project
 * sits next to is about (§102).
 */
export function CreateOutput({
  css,
  isEmpty,
  className,
}: {
  css: string;
  isEmpty: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {isEmpty
            ? "Nothing to override yet — the preview is the shipped Kinetix theme."
            : "Web CSS. Paste after the token import in your own stylesheet; it carries both appearances."}
        </p>
        <CopyCssButton css={css} disabled={isEmpty} />
      </div>

      {/* Scrolls sideways on a narrow screen, so it is focusable and named — the convention <TokenTable>
          already uses for axe's scrollable-region-focusable rule. */}
      <div
        role="group"
        aria-label="Generated CSS"
        tabIndex={0}
        className="mt-3 min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <pre className="w-max min-w-full p-4 font-mono text-xs leading-relaxed text-foreground">
          <code>{css}</code>
        </pre>
      </div>
    </div>
  );
}
