"use client";

import * as React from "react";
import tokens from "@kinetixui/tokens";
import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { Button, Card, SegmentedControl, SegmentedControlItem } from "@kinetixui/ui";
import { useDocumentDirection } from "@/lib/use-document-direction";
import { useTransientState } from "@/lib/use-transient-state";
import { tokenNameForHex, hexToRgb, rgbToHsl, contrastRatio } from "@kinetixui/create-theme";
import { SectionHead } from "@/components/section-head";

const RAMPS = ["azure", "blue", "green", "taupe", "cream", "amber", "red", "neutral"] as const;
const STEPS = ["0", "50", "100", "150", "200", "300", "400", "500", "600", "700", "800", "850", "900", "950", "1000"];
const FORMATS = ["hex", "hsl", "rgb"] as const;
type Format = (typeof FORMATS)[number];

const RAMP_NOTE: Record<(typeof RAMPS)[number], string> = {
  azure: "Action blue — the interactive hue. Backs --primary, --ring and --accent-foreground (light = azure.700, dark = azure.400).",
  blue: "Navy — backs --foreground and the dark surface scale, plus --border/--input and --accent on light.",
  green: "Secondary + success — backs --secondary, --secondary-foreground, --success.",
  amber: "Reserved for --warning and the data-viz palette (--chart-3).",
  red: "Backs --destructive (light = red.500, dark = red.300) and the data-viz reds (--chart-4, --chart-7).",
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

export function ColorsContent() {
  const [copied, showCopied] = useTransientState<string>("", 1200);
  const [format, setFormat] = React.useState<Format>("hex");
  const dir = useDocumentDirection();

  function copy(value: string) {
    navigator.clipboard.writeText(value).then(() => {
      showCopied(value);
    });
  }

  function copyRamp(ramp: string, steps: string[]) {
    const css = steps.map((s) => `--${ramp}-${s}: ${color[ramp][s]};`).join("\n");
    copy(css);
  }

  const color = tokens.color as unknown as Record<string, Record<string, string>>;

  return (
    <div>
      <p className="eyebrow">Color system</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">Colors</h1>
      <p aria-live="polite" className="sr-only">
        {copied ? `Copied ${copied}` : ""}
      </p>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Seven brand ramps and a synthesized neutral, remapped to a 0–1000 scale — the navy family and
        the sage/warm hues verbatim from Figma, plus an <code className="font-mono text-foreground">azure</code>{" "}
        action-blue ramp for the interactive tokens. Every semantic token in the{" "}
        <a href="/docs/theming" className="font-medium text-primary underline underline-offset-4">
          contract
        </a>{" "}
        resolves to one of these steps — swatches that back a live token are tagged below.
      </p>

      <Link
        href="/create"
        // flex-wrap: at 320px and 200% text the CTA needs its own line rather than pushing the page sideways
        className="group mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3 transition-colors hover:border-primary/40"
      >
        <span>
          <span className="font-medium">Want your own palette?</span>{" "}
          <span className="text-sm text-muted-foreground">
            Pick a theme colour in Create and it derives the interactive roles, in OKLCH.
          </span>
        </span>
        <span className="font-mono text-label-md uppercase tracking-[0.1em] text-primary transition-transform group-hover:translate-x-0.5">
          Customize in Create →
        </span>
      </Link>

      {/* quick jump + format toggle */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-border py-3">
        <nav
          aria-label="Jump to a ramp"
          className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-label-md uppercase tracking-[0.12em] text-muted-foreground"
        >
          {RAMPS.map((r) => (
            <a
              key={r}
              href={`#${r}`}
              className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {r}
            </a>
          ))}
        </nav>
        {/* One format at a time: the library SegmentedControl, a radiogroup with one tab stop. */}
        <SegmentedControl
          aria-label="Value format"
          dir={dir}
          value={format}
          onValueChange={(f) => {
            if (f) setFormat(f as Format);
          }}
        >
          {FORMATS.map((f) => (
            <SegmentedControlItem key={f} value={f} className="px-2.5 font-mono uppercase tracking-[0.1em]">
              {f}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
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
                <Button
                  type="button"
                  variant="Outline"
                  size="md"
                  onClick={() => copyRamp(ramp, steps)}
                  className="max-w-full gap-1.5 whitespace-normal px-2.5 py-1.5 font-mono uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground"
                >
                  <Copy aria-hidden className="!size-3.5" />
                  Copy ramp as CSS
                </Button>
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

                  return (
                    // The library Card as its button: hover lifts it, press settles it and focus draws the shared ring,
                    // which replaces the hand-rolled hover ring that needed mouse-enter/leave state.
                    <Card key={step} asChild className="group overflow-hidden rounded-lg">
                      <button type="button" onClick={() => copy(value)}>
                        {/*
                          Named by its own content, with only the verb and the ramp added out of sight: "Copy azure 50 AA
                          --azure-50 #eff6ff". A separate aria-label reworded and reordered what the swatch shows, so the
                          visible "50 AA --azure-50 #eff6ff" was not in the name and a speech-input user could not say it
                          (WCAG 2.5.3).
                        */}
                        <span className="sr-only">Copy {ramp} </span>
                        <span
                          className="relative flex h-24 w-full flex-col justify-between p-2"
                          style={{ background: hex, color: textHex }}
                        >
                          <span className="flex items-start justify-between gap-1">
                            <span className="font-mono text-body-sm font-medium">{step}</span>
                            {aaTag && (
                              <span
                                className="rounded px-1 py-0.5 font-mono text-label-md uppercase leading-none"
                                style={{ boxShadow: `inset 0 0 0 1px ${textHex}66` }}
                              >
                                {aaTag}
                              </span>
                            )}
                          </span>
                          {tokenName && (
                            <span className="max-w-full self-start rounded px-1.5 py-0.5 font-mono text-label-md uppercase leading-none [overflow-wrap:anywhere]" style={{ boxShadow: `inset 0 0 0 1px ${textHex}66` }}>
                              --{tokenName}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center justify-between gap-1 px-2 py-1.5 text-body-sm">
                          <span className="truncate font-mono text-muted-foreground">{value}</span>
                          <span className="shrink-0 text-muted-foreground">
                            {copied === value ? <Check className="size-3" /> : <Copy className="size-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />}
                          </span>
                        </span>
                      </button>
                    </Card>
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
