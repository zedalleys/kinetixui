"use client";

import * as React from "react";
import { Button, Label, Textarea } from "@kinetixui/ui";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHead } from "@/components/section-head";
import { ACCEPTED_TOKENS, type ContrastResult } from "@/lib/theme-builder";
import type { CreateAction, CreateConfig, PreviewMode } from "@/lib/create/config";
import type { CreateTheme } from "@/lib/create/theme-adapter";
import { defaultThemeInput } from "@/lib/create/theme-adapter";
import { CreateOutput } from "./create-output";

const MODES: { value: PreviewMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/** `card-foreground` → `Card foreground`. The contract's own names, just not shouted in kebab-case. */
function readable(token: string): string {
  const words = token.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function ContrastRow({ result }: { result: ContrastResult }) {
  const [base, fg] = result.pair;
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <span className="min-w-0 truncate">
        {readable(base)} <span className="text-muted-foreground">/ {fg.replace(`${base}-`, "")}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2 font-mono text-xs">
        <span className="text-muted-foreground">{result.ratio.toFixed(2)}:1</span>
        {/* Never colour alone: the word carries the result, the colour only reinforces it. */}
        <span className={result.pass ? "text-success" : "text-destructive"}>
          {result.pass ? "Pass" : "Fail"}
        </span>
      </span>
    </div>
  );
}

export function CreateSidebar({
  config,
  theme,
  dispatch,
  className,
}: {
  config: CreateConfig;
  theme: CreateTheme;
  dispatch: React.Dispatch<CreateAction>;
  className?: string;
}) {
  const inputId = React.useId();
  const errorsId = React.useId();
  const failing = theme.contrast.filter((c) => !c.pass).length;

  return (
    <div className={cn("space-y-8", className)}>
      {/* ── Appearance ─────────────────────────────────────────────────────── */}
      <section aria-labelledby={`${inputId}-appearance`}>
        <SectionHead index="01" label="Appearance" />
        <h2 id={`${inputId}-appearance`} className="sr-only">
          Appearance
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Which theme the preview renders in. Independent of the site&apos;s own light/dark setting, so you
          can check both without leaving the page.
        </p>
        <div role="group" aria-label="Preview appearance" className="mt-3 flex gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              aria-pressed={config.mode === m.value}
              onClick={() => dispatch({ type: "set-mode", mode: m.value })}
              className={cn(
                "flex-1 rounded-md border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                config.mode === m.value
                  ? "border-primary bg-accent font-medium text-accent-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Theme ──────────────────────────────────────────────────────────── */}
      <section aria-labelledby={`${inputId}-theme`}>
        <SectionHead index="02" label="Theme" meta={theme.cssIsDefault ? "default" : "customized"} />
        <h2 id={`${inputId}-theme`} className="sr-only">
          Theme
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          One <code className="rounded bg-muted px-1 font-mono text-xs text-foreground">name, colour</code>{" "}
          per line. Anything you leave out keeps its Kinetix value, and a colour you set without its text
          colour gets a readable one chosen for it.
        </p>

        <div className="mt-3 space-y-2">
          <Label htmlFor={`${inputId}-input`}>Theme colors</Label>
          <Textarea
            id={`${inputId}-input`}
            value={config.themeInput}
            onChange={(e) => dispatch({ type: "set-theme-input", value: e.target.value })}
            placeholder={"primary, #1d4ed8\nbackground, #ffffff\nborder, #92b2c8"}
            rows={8}
            spellCheck={false}
            aria-describedby={theme.hasErrors ? errorsId : undefined}
            aria-invalid={theme.parsed.errors.length > 0 || undefined}
            className="font-mono text-xs"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="Outline"
              onClick={() => dispatch({ type: "set-theme-input", value: defaultThemeInput(config.mode) })}
            >
              Load current values
            </Button>
            {config.themeInput.trim() !== "" && (
              <Button size="sm" variant="Ghost" onClick={() => dispatch({ type: "set-theme-input", value: "" })}>
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Inline, beside the input that caused it — never a page-level error state. The preview keeps
            rendering every row that did parse. */}
        {theme.hasErrors && (
          <div
            id={errorsId}
            role="status"
            className="mt-3 space-y-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm"
          >
            {theme.parsed.errors.map((e, i) => (
              <p key={i} className="flex items-start gap-2 text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{e}</span>
              </p>
            ))}
            {theme.parsed.unknownTokens.length > 0 && (
              <p className="text-muted-foreground">
                Not a theme colour, so skipped: {theme.parsed.unknownTokens.join(", ")}.
              </p>
            )}
          </div>
        )}

        <details className="group mt-3">
          <summary className="cursor-pointer text-sm text-muted-foreground underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Which names are recognized?
          </summary>
          <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
            {ACCEPTED_TOKENS.join(" · ")}
          </p>
        </details>
      </section>

      {/* ── Accessibility ──────────────────────────────────────────────────── */}
      <section aria-labelledby={`${inputId}-a11y`}>
        <SectionHead
          index="03"
          label="Accessibility"
          meta={failing === 0 ? "all pass" : `${failing} failing`}
        />
        <h2 id={`${inputId}-a11y`} className="sr-only">
          Accessibility
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          WCAG AA contrast for each surface and the text on it. A failure is shown, not corrected — a
          builder that quietly fixed your colours would be lying about what you picked.
        </p>
        <div className="mt-3 divide-y divide-border rounded-lg border border-border px-3 py-1">
          {theme.contrast.map((c) => (
            <ContrastRow key={c.pair.join("-")} result={c} />
          ))}
        </div>
      </section>

      {/* ── Output ─────────────────────────────────────────────────────────── */}
      <section aria-labelledby={`${inputId}-output`}>
        <SectionHead index="04" label="Output" meta="web css" />
        <h2 id={`${inputId}-output`} className="sr-only">
          Output
        </h2>
        <CreateOutput css={theme.css} isDefault={theme.cssIsDefault} className="mt-3" />
      </section>
    </div>
  );
}
