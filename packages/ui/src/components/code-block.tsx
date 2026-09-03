"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * CodeBlock — a code display with a copy button and, for more than one
 * file, a tab strip. Presentational only: bring your own syntax
 * highlighting by rendering highlighted markup as `code`/`files[].code`.
 */
export interface CodeBlockFile {
  name: string;
  code: string;
  language?: string;
}

export interface CodeBlockProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  code?: string;
  language?: string;
  filename?: string;
  files?: CodeBlockFile[];
  hideCopy?: boolean;
}

const CodeBlock = React.forwardRef<HTMLDivElement, CodeBlockProps>(
  ({ className, code, language, filename, files, hideCopy, ...props }, ref) => {
    const tabs = files && files.length > 0 ? files : [{ name: filename ?? language ?? "", code: code ?? "" }];
    const [active, setActive] = React.useState(0);
    const [copied, setCopied] = React.useState(false);
    const current = tabs[active] ?? tabs[0]!;
    const hasHeader = tabs.length > 1 || !!current.name;

    const copy = async () => {
      try {
        await navigator.clipboard.writeText(current.code);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      } catch {
        // clipboard unavailable — no-op
      }
    };

    return (
      <div ref={ref} className={cn("overflow-hidden rounded-md border border-input bg-muted font-sans", className)} {...props}>
        {hasHeader && (
          <div className="flex items-center justify-between border-b border-input bg-background px-2">
            <div className="flex">
              {tabs.map((t, i) => (
                <button
                  key={t.name || i}
                  type="button"
                  onClick={() => setActive(i)}
                  className={cn(
                    "border-b-2 px-3 py-2 text-body-sm transition-colors outline-none",
                    i === active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.name || "code"}
                </button>
              ))}
            </div>
            {!hideCopy && (
              <button
                type="button"
                onClick={copy}
                aria-label="Copy code"
                className="rounded-[2px] p-1.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-current"
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </button>
            )}
          </div>
        )}
        <div className="relative">
          {!hasHeader && !hideCopy && (
            <button
              type="button"
              onClick={copy}
              aria-label="Copy code"
              className="absolute right-2 top-2 rounded-[2px] p-1.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-current"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          )}
          <pre className="overflow-x-auto p-4 text-body-sm text-foreground">
            <code>{current.code}</code>
          </pre>
        </div>
      </div>
    );
  },
);
CodeBlock.displayName = "CodeBlock";

export { CodeBlock };
