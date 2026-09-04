"use client";

import * as React from "react";
import tokens from "@kinetixui/tokens";
import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { tokenNameForHex } from "@/lib/token-contract";
import { SectionHead } from "@/components/section-head";
import { hexToRgb, rgbToHsl, contrastRatio } from "@/lib/color-math";

const RAMPS = ["blue", "green", "taupe", "cream", "amber", "red", "neutral"] as const;
const STEPS = ["0", "50", "100", "150", "200", "300", "400", "500", "600", "700", "800", "850", "900", "950", "1000"];
const FORMATS = ["hex", "hsl", "rgb"] as const;
type Format = (typeof FORMATS)[number];

const RAMP_NOTE: Record<(typeof RAMPS)[number], string> = {
  blue: "Brand anchor — backs --primary, --ring, --border/--input, and --foreground on light.",
  green: "Secondary + success — backs --secondary, --secondary-foreground, --success.",
  amber: "Reserved for --warning and the data-viz palette (--chart-3).",
  red: "Powers the data-viz palette (--chart-4); --destructive is a standalone Figma value, not this ramp.",
  taupe: "Data-viz only today (--chart-5) — open for a semantic role in a future release.",
  cream: "Not yet wired to a semantic token — free for a future surface or accent.",
  neutral: "Synthesized (Figma exposes only three anchors) — backs --background, --card, --muted.",
};

function formatValue(hex: string, fmt: Format) {
  if (fmt === "hex") return hex;
  const [r, g, b] = hexToRgb(hex);
  if (fmt === "rgb") return `rgb(${r} ${g} ${b})`;
  const [h, s, l] = rgbToHsl(r, g, b);
  return `hsl(${h} ${s}% ${l}%)`;
}

export default function ColorsPage() {
  const [copied, setCopied] = React.useState<string>("");
  const [format, setFormat] = React.useState<Format>("hex");
  const [hoverStep, setHoverStep] = React.useState<string | null>(null);

  function copy(value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(value);
      setTimeout(() => setCopied(""), 1200);
    });
  }

  function copyRamp(ramp: string, steps: string[]) {
    const css = steps.map((s) => `--${ramp}-${s}: ${color[ramp][s]};`).join("\n");
    copy(css);
  }

  const color = tokens.color as unknown as Record<string, Record<string, string>>;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow">Color system</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">Colors</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Six brand ramps and a synthesized neutral, extracted verbatim from Figma and remapped to a
        0–1000 scale. Every semantic token in the{" "}
        <a href="/docs/theming" className="font-medium text-primary underline underline-offset-4">
          contract
        </a>{" "}
        resolves to one of these steps — swatches that back a live token are tagged below.
      </p>

      <Link
        href="/theme-builder"
        className="group mt-6 flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3 transition-colors hover:border-primary/40"
      >
        <span>
          <span className="font-medium">Have your own palette?</span>{" "}
          <span className="text-sm text-muted-foreground">
            Paste it into the Theme Builder and preview it on real components.
          </span>
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-primary transition-transform group-hover:translate-x-0.5">
          Try it →
        </span>
      </Link>

      {/* quick jump + format toggle */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-border py-3">
        <nav className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          {RAMPS.map((r) => (
            <a key={r} href={`#${r}`} className="transition-colors hover:text-foreground">
              {r}
            </a>
          ))}
        </nav>
        <div className="inline-flex rounded-md border border-border p-0.5">
          {FORMATS.map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors",
                format === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-16">
        {RAMPS.map((ramp, i) => {
          const steps = STEPS.filter((s) => color[ramp]?.[s]);
          return (
            <section key={ramp} id={ramp} className="scroll-mt-28">
              <SectionHead
                index={String(i + 1).padStart(2, "0")}
                label={ramp}
                meta={`${steps.length} steps`}
              />
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{RAMP_NOTE[ramp]}</p>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => copyRamp(ramp, steps)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Copy className="size-3.5" />
                  Copy ramp as CSS
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {steps.map((step) => {
                  const hex = color[ramp][step];
                  const value = formatValue(hex, format);
                  const onWhite = contrastRatio(hex, "#ffffff");
                  const onBlack = contrastRatio(hex, "#000000");
                  const useWhiteText = onWhite >= onBlack;
                  const textHex = useWhiteText ? "#ffffff" : "#000000";
                  const bestRatio = Math.max(onWhite, onBlack);
                  const aaTag = bestRatio >= 4.5 ? "AA" : bestRatio >= 3 ? "AA (large)" : null;
                  const tokenName = tokenNameForHex(hex);
                  const active = hoverStep === step;

                  return (
                    <button
                      key={step}
                      onClick={() => copy(value)}
                      onMouseEnter={() => setHoverStep(step)}
                      onMouseLeave={() => setHoverStep(null)}
                      className={cn(
                        "group flex flex-col overflow-hidden rounded-lg border text-left transition-colors",
                        active ? "border-primary ring-1 ring-primary" : "border-border",
                      )}
                    >
                      <span
                        className="relative flex h-24 w-full flex-col justify-between p-2"
                        style={{ background: hex, color: textHex }}
                      >
                        <span className="flex items-start justify-between gap-1">
                          <span className="font-mono text-[11px] font-medium">{step}</span>
                          {aaTag && (
                            <span
                              className="rounded px-1 py-0.5 font-mono text-[9px] uppercase leading-none"
                              style={{ background: `${textHex}22` }}
                            >
                              {aaTag}
                            </span>
                          )}
                        </span>
                        {tokenName && (
                          <span className="self-start rounded px-1.5 py-0.5 font-mono text-[9px] uppercase leading-none" style={{ background: `${textHex}22` }}>
                            --{tokenName}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center justify-between gap-1 px-2 py-1.5 text-[11px]">
                        <span className="truncate font-mono text-muted-foreground">{value}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {copied === value ? <Check className="size-3" /> : <Copy className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-14 border-t border-border pt-6 text-sm text-muted-foreground">
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">neutral</code> is
        synthesized — Figma exposes only three anchors. Full mapping (and how to override it) is on{" "}
        <a href="/docs/theming" className="font-medium text-primary underline underline-offset-4">
          Theming
        </a>
        .
      </p>
    </div>
  );
}
