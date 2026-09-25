"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHead } from "@/components/section-head";
import type { CreateAction, CreateConfig, PreviewMode } from "@/lib/create/config";
import { currentStyle } from "@/lib/create/config";
import { SHIPPED_TOKENS, type CreateTheme } from "@/lib/create/theme-adapter";
import {
  CHART_PALETTES,
  NEUTRALS,
  RADII,
  STYLES,
  SURFACES,
  deriveChart,
  deriveNeutrals,
  deriveRadius,
  type ContrastResult,
} from "@kinetixui/create-theme";
import {
  CHART_LABELS,
  NEUTRAL_LABELS,
  RADIUS_LABELS,
  STYLE_LABELS,
  SURFACE_LABELS,
} from "@/lib/create/labels";
import { CreateAdvanced } from "./create-advanced";
import { CreateColorPicker } from "./create-color-picker";
import { CreateOutput } from "./create-output";

/**
 * The configuration panel.
 *
 * Simple controls are visible; only Advanced is folded away (§51). Everything here writes into the one
 * config — there is no control that changes the preview without changing what Copy CSS produces, which is
 * the rule that decided what PR 2 ships at all (§104).
 */

const MODES: { value: PreviewMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/** `card-foreground` → `Card foreground`. The contract's own names, not shouted in kebab-case. */
function readable(token: string): string {
  const words = token.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A row of mutually exclusive choices, as a real radio group so arrow keys work. */
function OptionGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
  labels,
  columns = 3,
  renderSample,
}: {
  legend: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  labels: Record<T, string>;
  columns?: number;
  renderSample?: (option: T) => React.ReactNode;
}) {
  const name = React.useId();
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div
        className={cn("grid gap-2", columns === 2 ? "grid-cols-2" : columns === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}
      >
        {options.map((option) => (
          <label
            key={option}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-md border px-2 py-2 text-center text-sm transition-colors",
              "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring",
              value === option
                ? "border-primary bg-accent font-medium text-accent-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              // Qualified by its group: "Default" is both a style and a radius, and two radios with the
              // same name in one panel are ambiguous to anyone not looking at the layout. The visible
              // text is kept as the prefix so the accessible name still contains the label (WCAG 2.5.3).
              aria-label={`${labels[option]} ${legend.toLowerCase()}`}
              className="sr-only"
            />
            {renderSample?.(option)}
            <span>{labels[option]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Contrast, summarised.
 *
 * Twelve identical "Pass" rows is the most visually dominant thing in a panel on the day nothing is
 * wrong, which is most days. The headline is the count; the rows are one disclosure away, and a failure
 * is pulled out of the list and shown whether the list is open or not (§74).
 */
function ContrastPanel({ results, manual }: { results: ContrastResult[]; manual: Set<string> }) {
  const failing = results.filter((c) => !c.pass);
  const [open, setOpen] = React.useState(false);

  const row = (c: ContrastResult) => (
    <div key={c.pair.join("-")} className="flex items-center justify-between gap-3 py-1 text-sm">
      <span className="min-w-0 truncate">
        {readable(c.pair[0])} <span className="text-muted-foreground">/ {c.pair[1].replace(`${c.pair[0]}-`, "")}</span>
        {(manual.has(c.pair[0]) || manual.has(c.pair[1])) && (
          <span className="ms-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">manual</span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-2 font-mono text-xs">
        <span className="text-muted-foreground">{c.ratio.toFixed(2)}:1</span>
        {/* The word carries the result; the colour only reinforces it. */}
        <span className={c.pass ? "text-success" : "text-destructive"}>{c.pass ? "Pass" : "Fail"}</span>
      </span>
    </div>
  );

  return (
    <div className="mt-3">
      <p className="text-sm">
        <span className="font-mono">
          {results.length - failing.length}/{results.length}
        </span>{" "}
        pairs meet WCAG AA.
        {failing.length > 0 && <span className="text-destructive"> {failing.length} do not.</span>}
      </p>

      {failing.length > 0 && (
        <div className="mt-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-1">
          {failing.map(row)}
          <p className="py-2 text-sm text-muted-foreground">
            A generated colour always gets a passing foreground. These are values you set by hand, so they
            are left exactly as you typed them.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronRight className={cn("size-4 transition-transform motion-reduce:transition-none", open && "rotate-90")} aria-hidden />
        {open ? "Hide" : "Show"} all pairs
      </button>
      {open && <div className="mt-2 divide-y divide-border rounded-lg border border-border px-3 py-1">{results.map(row)}</div>}
    </div>
  );
}

export function CreateSidebar({
  config,
  theme,
  dispatch,
  onDragChange,
  className,
}: {
  config: CreateConfig;
  theme: CreateTheme;
  dispatch: React.Dispatch<CreateAction>;
  onDragChange?: (dragging: boolean) => void;
  className?: string;
}) {
  const id = React.useId();
  const style = currentStyle(config);

  const heading = (key: string, text: string) => (
    <h2 id={`${id}-${key}`} className="sr-only">
      {text}
    </h2>
  );

  return (
    <div className={cn("space-y-8", className)}>
      {/* ── Appearance ─────────────────────────────────────────────────── */}
      <section aria-labelledby={`${id}-appearance`}>
        <SectionHead index="01" label="Appearance" />
        {heading("appearance", "Appearance")}
        <p className="mt-3 text-sm text-muted-foreground">
          Which one the preview shows. One configuration generates both, and the copied CSS carries both —
          you are not setting up two themes.
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

      {/* ── Design ─────────────────────────────────────────────────────── */}
      <section aria-labelledby={`${id}-design`}>
        <SectionHead index="02" label="Design" meta={style ?? "custom"} />
        {heading("design", "Design")}

        <p className="mt-3 text-sm font-medium">Style</p>
        <p className="mb-2 mt-1 text-sm text-muted-foreground">
          A named starting point for shape and surface. Change either afterwards and this simply stops
          naming a preset.
        </p>
        <OptionGroup
          legend="Style"
          options={STYLES}
          labels={STYLE_LABELS}
          value={style}
          onChange={(s) => dispatch({ type: "set-style", style: s })}
          renderSample={(s) => <StyleSample style={s} />}
        />
        <p className="sr-only" aria-live="polite">
          {style ? `${STYLE_LABELS[style]} style` : "Custom style"}
        </p>

        <div className="mt-6">
          <p className="text-sm font-medium">Theme colour</p>
          <p className="mb-3 mt-1 text-sm text-muted-foreground">
            Seeds the brand, the action colour, links and the focus ring. Each of them can be pinned
            separately in Advanced.
          </p>
          <CreateColorPicker
            value={config.brand}
            onChange={(hex) => dispatch({ type: "set-brand", hex })}
            onDragChange={onDragChange}
            label="Theme colour"
            idPrefix={`${id}-brand`}
          />
        </div>

        <div className="mt-6">
          <p className="text-sm font-medium">Neutral</p>
          <p className="mb-2 mt-1 text-sm text-muted-foreground">
            The personality of the greys, kept separate from the theme colour. Kinetix is the shipped
            palette.
          </p>
          <OptionGroup
            legend="Neutral"
            options={NEUTRALS}
            labels={NEUTRAL_LABELS}
            value={config.neutral}
            onChange={(n) => dispatch({ type: "set-neutral", neutral: n })}
            columns={3}
            renderSample={(n) => <NeutralSample neutral={n} mode={config.mode} />}
          />
        </div>
      </section>

      {/* ── Shape & surfaces ───────────────────────────────────────────── */}
      <section aria-labelledby={`${id}-shape`}>
        <SectionHead index="03" label="Shape & surfaces" />
        {heading("shape", "Shape and surfaces")}

        <p className="mt-3 text-sm font-medium">Radius</p>
        <p className="mb-2 mt-1 text-sm text-muted-foreground">
          Sets the four radius steps every component reads. {RADIUS_LABELS[config.radius]} puts controls at{" "}
          <span className="font-mono">{deriveRadius(config.radius).md}px</span>.
        </p>
        <OptionGroup
          legend="Radius"
          options={RADII}
          labels={RADIUS_LABELS}
          value={config.radius}
          onChange={(r) => dispatch({ type: "set-radius", radius: r })}
          renderSample={(r) => <RadiusSample radius={r} />}
        />

        <div className="mt-6">
          <p className="text-sm font-medium">Surface</p>
          <p className="mb-2 mt-1 text-sm text-muted-foreground">
            How raised things look. These remap the elevation tokens the system already ships rather than
            inventing shadows.
          </p>
          <OptionGroup
            legend="Surface"
            options={SURFACES}
            labels={SURFACE_LABELS}
            value={config.surface}
            onChange={(s) => dispatch({ type: "set-surface", surface: s })}
            columns={4}
          />
        </div>
      </section>

      {/* ── Data ───────────────────────────────────────────────────────── */}
      <section aria-labelledby={`${id}-data`}>
        <SectionHead index="04" label="Data" />
        {heading("data", "Data")}
        <p className="mb-2 mt-3 text-sm text-muted-foreground">
          Chart series colours. Chosen for separation from each other, not just contrast against the
          background.
        </p>
        <OptionGroup
          legend="Chart palette"
          options={CHART_PALETTES}
          labels={CHART_LABELS}
          value={config.chartPalette}
          onChange={(p) => dispatch({ type: "set-chart", palette: p })}
          columns={3}
          renderSample={(p) => <ChartSample palette={p} theme={theme} mode={config.mode} brand={config.brand} />}
        />
      </section>

      {/* ── Accessibility ──────────────────────────────────────────────── */}
      <section aria-labelledby={`${id}-a11y`}>
        <SectionHead index="05" label="Accessibility" />
        {heading("a11y", "Accessibility")}
        <ContrastPanel results={theme.contrast} manual={theme.manualTokens} />
      </section>

      {/* ── Advanced ───────────────────────────────────────────────────── */}
      <section aria-labelledby={`${id}-advanced`}>
        <SectionHead index="06" label="Advanced" meta={theme.manualTokens.size ? `${theme.manualTokens.size} pinned` : undefined} />
        {heading("advanced", "Advanced")}
        <details className="group mt-3">
          <summary className="inline-flex cursor-pointer items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronRight
              className="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none"
              aria-hidden
            />
            Semantic colours and raw overrides
          </summary>
          <div className="mt-4">
            <CreateAdvanced config={config} theme={theme} dispatch={dispatch} />
          </div>
        </details>
      </section>

      {/* ── Output ─────────────────────────────────────────────────────── */}
      <section aria-labelledby={`${id}-output`}>
        <SectionHead index="07" label="Output" meta="web css" />
        {heading("output", "Output")}
        <CreateOutput css={theme.css} isEmpty={theme.cssIsEmpty} className="mt-3" />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ samples */

/** Tiny live samples, drawn with CSS from the same values the option sets — no image assets (§57). */

function StyleSample({ style }: { style: (typeof STYLES)[number] }) {
  const radius = { default: "6px", soft: "12px", sharp: "0px" }[style];
  const shadow = style === "sharp" ? "none" : "0 1px 3px hsl(var(--foreground) / 0.2)";
  const border = style === "sharp" ? "2px solid hsl(var(--foreground) / 0.45)" : "1px solid hsl(var(--border))";
  return <span aria-hidden className="block h-6 w-full bg-muted" style={{ borderRadius: radius, boxShadow: shadow, border }} />;
}

function RadiusSample({ radius }: { radius: (typeof RADII)[number] }) {
  const px = deriveRadius(radius).md;
  // Scaled to the swatch so the difference is visible at this size.
  return (
    <span
      aria-hidden
      className="block h-6 w-full border border-border bg-muted"
      style={{ borderRadius: `${Math.min(px, 12)}px` }}
    />
  );
}

function NeutralSample({ neutral, mode }: { neutral: (typeof NEUTRALS)[number]; mode: PreviewMode }) {
  const preview = React.useMemo(() => {
    // "kinetix" generates nothing, so its swatch reads the shipped contract instead of the generator.
    const n = neutral === "kinetix" ? SHIPPED_TOKENS[mode] : deriveNeutrals(neutral, mode);
    return [n.background ?? "#ffffff", n.muted ?? "#eeeeee", n.border ?? "#cccccc"];
  }, [neutral, mode]);
  return (
    <span aria-hidden className="flex h-6 w-full overflow-hidden rounded border border-border">
      {preview.map((hex) => (
        <span key={hex} className="flex-1" style={{ background: hex }} />
      ))}
    </span>
  );
}

function ChartSample({
  palette,
  theme,
  mode,
  brand,
}: {
  palette: (typeof CHART_PALETTES)[number];
  theme: CreateTheme;
  mode: PreviewMode;
  brand: string;
}) {
  // The swatch asks the engine for the real values rather than approximating them, so it can never show
  // something the selection would not actually produce.
  const generated = deriveChart(palette, brand, mode);
  const series = [1, 2, 3, 4, 5].map(
    (i) => generated[`chart-${i}`] ?? theme.active.colors[`chart-${i}`] ?? "#888888",
  );
  return (
    <span aria-hidden className="flex h-6 w-full gap-0.5">
      {series.map((hex, i) => (
        <span key={i} className="flex-1 rounded-sm" style={{ background: hex }} />
      ))}
    </span>
  );
}

