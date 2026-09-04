"use client";

import * as React from "react";
import { Check, Copy, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parsePaletteText,
  deriveForegrounds,
  toCssBlock,
  checkContrast,
  ACCEPTED_TOKENS,
} from "@/lib/theme-builder";
import { CustomThemePreview } from "@/components/custom-theme-preview";
import { SectionHead } from "@/components/section-head";

const TEMPLATE = [
  "token,hex",
  "primary,#1b3c53",
  "secondary,#748873",
  "accent,#f0f7ff",
  "destructive,#ec5047",
  "background,#ffffff",
  "foreground,#050c11",
  "border,#92b2c8",
  "ring,#1b3c53",
].join("\n");

function useClipboardCopy() {
  const [copied, setCopied] = React.useState("");
  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(""), 1500);
    });
  };
  return { copied, copy };
}

export default function ThemeBuilderPage() {
  const [text, setText] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);
  const { copied, copy } = useClipboardCopy();

  const parsed = React.useMemo(() => parsePaletteText(text), [text]);
  const values = React.useMemo(() => deriveForegrounds(parsed.values), [parsed.values]);
  const contrast = React.useMemo(() => checkContrast(values), [values]);
  const hasPalette = Object.keys(parsed.values).length > 0;

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow">Bring your own palette</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">
        Theme Builder
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Paste rows exported from Excel or Google Sheets — <code className="rounded bg-muted px-1 py-0.5 font-mono text-[13px] text-foreground">token, hex</code> per
        line — or upload a <code className="rounded bg-muted px-1 py-0.5 font-mono text-[13px] text-foreground">.csv</code>.
        Everything runs in your browser; nothing is uploaded anywhere. Set just the base colors
        (<code className="rounded bg-muted px-1 py-0.5 font-mono text-[13px] text-foreground">primary</code>,{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[13px] text-foreground">background</code>…) and
        readable foregrounds are picked for you automatically.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        {/* input */}
        <div>
          <SectionHead index="01" label="Your palette" />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm transition-colors hover:bg-muted"
            >
              <Upload className="size-3.5" />
              Upload .csv
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
            <button
              onClick={() => copy("template", TEMPLATE)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {copied === "template" ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
              Copy CSV template
            </button>
            <button
              onClick={() => setText(TEMPLATE)}
              className="font-mono text-[11px] uppercase tracking-[0.1em] text-primary underline underline-offset-2"
            >
              Load example
            </button>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"token, hex\nprimary, #1b3c53\nsecondary, #748873\n…"}
            rows={12}
            spellCheck={false}
            className="mt-3 w-full rounded-lg border border-border bg-muted/20 p-3 font-mono text-[13px] leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
          />

          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            Recognized tokens: {ACCEPTED_TOKENS.join(" · ")}
          </p>

          {(parsed.errors.length > 0 || parsed.unknownTokens.length > 0) && (
            <div className="mt-3 space-y-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
              {parsed.errors.map((e, i) => (
                <p key={i} className="text-destructive">
                  {e}
                </p>
              ))}
              {parsed.unknownTokens.length > 0 && (
                <p className="text-muted-foreground">
                  Skipped unrecognized token{parsed.unknownTokens.length > 1 ? "s" : ""}:{" "}
                  {parsed.unknownTokens.join(", ")}
                </p>
              )}
            </div>
          )}
        </div>

        {/* preview */}
        <div>
          <SectionHead index="02" label="Live preview" meta={hasPalette ? "recolored" : "waiting for input"} />
          <div className="mt-4">
            {hasPalette ? (
              <CustomThemePreview values={values} />
            ) : (
              <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Paste or upload a palette to see it rendered on real components.
              </div>
            )}
          </div>

          {contrast.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {contrast.map((c) => (
                <div key={c.pair.join("-")} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="font-mono text-muted-foreground">
                    --{c.pair[0]} / --{c.pair[1]}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[11px] uppercase tracking-wide",
                      c.pass ? "text-success" : "text-destructive",
                    )}
                  >
                    {c.ratio.toFixed(2)}:1 · {c.pass ? "AA pass" : "fails AA"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {hasPalette && (
            <button
              onClick={() => copy("css", toCssBlock(values))}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
            >
              {copied === "css" ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
              Copy as CSS
            </button>
          )}
        </div>
      </div>

      <p className="mt-14 max-w-2xl border-t border-border pt-6 text-sm text-muted-foreground">
        The exported block overrides the same semantic contract every component reads from — drop
        it after <code className="rounded bg-muted px-1 py-0.5 font-mono text-[13px] text-foreground">@import &quot;@kinetixui/tokens/css&quot;;</code> in
        your project. See{" "}
        <a href="/docs/theming" className="font-medium text-primary underline underline-offset-4">
          Theming
        </a>{" "}
        for the full contract.
      </p>
    </div>
  );
}
