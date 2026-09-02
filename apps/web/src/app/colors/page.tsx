"use client";

import * as React from "react";
import tokens from "@strata/tokens";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const RAMPS = ["blue", "green", "taupe", "cream", "amber", "red", "neutral"] as const;
const STEPS = ["0", "50", "100", "150", "200", "300", "400", "500", "600", "700", "800", "850", "900", "950", "1000"];

export default function ColorsPage() {
  const [copied, setCopied] = React.useState<string>("");

  function copy(value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(value);
      setTimeout(() => setCopied(""), 1200);
    });
  }

  const color = tokens.color as Record<string, Record<string, string>>;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Colors</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        The six brand ramps and a synthesized neutral, extracted verbatim from Figma and remapped
        to a 0–1000 scale. Click any swatch to copy its hex.
      </p>

      <div className="mt-10 space-y-8">
        {RAMPS.map((ramp) => (
          <section key={ramp}>
            <h2 className="mb-3 text-sm font-semibold capitalize">{ramp}</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8 xl:[grid-template-columns:repeat(15,minmax(0,1fr))]">
              {STEPS.filter((s) => color[ramp]?.[s]).map((step) => {
                const hex = color[ramp][step];
                return (
                  <button
                    key={step}
                    onClick={() => copy(hex)}
                    className="group flex flex-col overflow-hidden rounded-lg border border-border text-left"
                  >
                    <span className="h-14 w-full" style={{ background: hex }} />
                    <span className="flex items-center justify-between gap-1 px-2 py-1.5 text-[11px]">
                      <span className="font-medium">{step}</span>
                      <span className="text-muted-foreground group-hover:hidden">{hex}</span>
                      <span className="hidden text-muted-foreground group-hover:inline">
                        {copied === hex ? <Check className="size-3" /> : <Copy className="size-3" />}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">neutral</code> is synthesized —
        Figma exposes only three anchors. See{" "}
        <a href="/docs/theming" className={cn("font-medium text-primary underline underline-offset-4")}>
          Theming
        </a>
        .
      </p>
    </div>
  );
}
