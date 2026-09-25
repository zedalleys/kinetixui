"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  MAX_CHROMA,
  formatOklch,
  gamutMapOklch,
  hexToOklch,
  maxChromaFor,
  oklchToHex,
  parseOklch,
  type Oklch,
} from "@kinetixui/create-theme";

/**
 * The theme colour control.
 *
 * Three sliders and two text inputs, not a 2D plane. A plane looks more like a design tool and is worse
 * at this job: it is pointer-only unless a parallel numeric UI is built anyway, it hides which axis moved,
 * and on an OKLCH plane most of its area is out of sRGB and clips. Hue / chroma / lightness are the
 * coordinates the engine actually uses, so what the user drags is what gets stored (§56).
 *
 * They are native `<input type="range">`. A custom-built slider would need arrow keys, Home/End, Page
 * Up/Down, the correct ARIA and a value announcement written by hand; the platform control has all of it,
 * costs no bundle, and takes a gradient background like anything else (§9, §10).
 *
 * `onDragChange` lets the workspace suppress colour transitions in the preview while a slider is moving —
 * without it, every component animates toward each intermediate value and the picker feels like it is
 * lagging behind the pointer (§80).
 */

const HUE_STOPS = 24;

type Draft = { hex: string; oklch: string };

export function CreateColorPicker({
  value,
  onChange,
  onDragChange,
  label,
  idPrefix,
}: {
  value: string;
  onChange: (hex: string) => void;
  onDragChange?: (dragging: boolean) => void;
  label: string;
  idPrefix: string;
}) {
  const colour = React.useMemo(() => hexToOklch(value) ?? { l: 0.5, c: 0, h: 0 }, [value]);
  const maxC = React.useMemo(() => Math.max(maxChromaFor(colour.l, colour.h), 0.001), [colour.l, colour.h]);

  // Text inputs keep their own draft so typing "#1d4" is not snapped back to the last valid colour on
  // every keystroke. The draft is cleared whenever the colour changes from anywhere else (§54).
  const [draft, setDraft] = React.useState<Partial<Draft>>({});
  React.useEffect(() => setDraft({}), [value]);

  const set = (next: Oklch) => onChange(oklchToHex(gamutMapOklch(next)));

  const commitHex = (text: string) => {
    const parsed = hexToOklch(text);
    if (parsed) onChange(oklchToHex(parsed));
    else setDraft((d) => ({ ...d, hex: text }));
  };
  const commitOklch = (text: string) => {
    const parsed = parseOklch(text);
    if (parsed) onChange(oklchToHex(parsed));
    else setDraft((d) => ({ ...d, oklch: text }));
  };

  const hexDraftInvalid = draft.hex !== undefined && !hexToOklch(draft.hex);
  const oklchDraftInvalid = draft.oklch !== undefined && !parseOklch(draft.oklch);

  // Gradient stops are computed from the live colour, so each track shows what moving it would actually
  // do — a fixed rainbow would be decoration rather than a preview.
  const hueTrack = `linear-gradient(to right, ${Array.from({ length: HUE_STOPS + 1 }, (_, i) =>
    oklchToHex({ l: colour.l, c: maxChromaFor(colour.l, (i * 360) / HUE_STOPS), h: (i * 360) / HUE_STOPS }),
  ).join(", ")})`;
  const chromaTrack = `linear-gradient(to right, ${oklchToHex({ l: colour.l, c: 0, h: colour.h })}, ${oklchToHex({ l: colour.l, c: maxC, h: colour.h })})`;
  const lightnessTrack = `linear-gradient(to right, #000000, ${oklchToHex({ l: 0.5, c: colour.c, h: colour.h })}, #ffffff)`;

  const drag = onDragChange
    ? { onPointerDown: () => onDragChange(true), onPointerUp: () => onDragChange(false), onBlur: () => onDragChange(false) }
    : {};

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="size-10 shrink-0 rounded-md border border-border"
          style={{ background: value }}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{label}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{formatOklch(colour)}</p>
        </div>
      </div>

      <Channel
        id={`${idPrefix}-h`}
        label="Hue"
        value={colour.h}
        min={0}
        max={360}
        step={1}
        // Degrees on a colour wheel: "210 degrees" is what the control is actually setting.
        valueText={`${Math.round(colour.h)} degrees`}
        track={hueTrack}
        onChange={(h) => set({ ...colour, h })}
        {...drag}
      />
      <Channel
        id={`${idPrefix}-c`}
        label="Chroma"
        value={colour.c}
        min={0}
        // The slider stops at the most chroma this lightness and hue can actually hold, so no part of its
        // travel is wasted on values that all clip to the same colour (§55).
        max={Math.min(maxC, MAX_CHROMA)}
        step={0.001}
        valueText={`${Math.round((colour.c / maxC) * 100)} percent`}
        track={chromaTrack}
        onChange={(c) => set({ ...colour, c })}
        {...drag}
      />
      <Channel
        id={`${idPrefix}-l`}
        label="Lightness"
        value={colour.l}
        min={0}
        max={1}
        step={0.005}
        valueText={`${Math.round(colour.l * 100)} percent`}
        track={lightnessTrack}
        onChange={(l) => set({ ...colour, l })}
        {...drag}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          id={`${idPrefix}-hex`}
          label="Hex"
          value={draft.hex ?? value}
          invalid={hexDraftInvalid}
          onCommit={commitHex}
          onDraft={(text) => setDraft((d) => ({ ...d, hex: text }))}
        />
        <TextField
          id={`${idPrefix}-oklch`}
          label="OKLCH"
          value={draft.oklch ?? formatOklch(colour)}
          invalid={oklchDraftInvalid}
          onCommit={commitOklch}
          onDraft={(text) => setDraft((d) => ({ ...d, oklch: text }))}
        />
      </div>
      {(hexDraftInvalid || oklchDraftInvalid) && (
        <p role="status" className="text-sm text-destructive">
          {hexDraftInvalid ? "Not a six-digit hex colour." : "Not a valid oklch() value."} The colour above is
          unchanged.
        </p>
      )}
    </div>
  );
}

/** One axis. The label, the number and the keyboard behaviour all come from the platform control. */
function Channel({
  id,
  label,
  value,
  min,
  max,
  step,
  valueText,
  track,
  onChange,
  ...rest
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  valueText: string;
  track: string;
  onChange: (value: number) => void;
  // Only the drag handlers are forwarded; the value props are owned above so they cannot be overridden.
} & Omit<React.ComponentProps<"input">, "onChange" | "value" | "min" | "max" | "step" | "id" | "type">) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm">
          {label}
        </label>
        <span aria-hidden className="font-mono text-xs text-muted-foreground">
          {valueText}
        </span>
      </div>
      <input
        {...rest}
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueText}
        onChange={(e) => onChange(Number(e.target.value))}
        className="kx-create-channel mt-2 h-8 w-full cursor-pointer appearance-none rounded-md border border-border bg-[image:var(--track)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ "--track": track } as React.CSSProperties}
      />
    </div>
  );
}

/**
 * A text field that does not fight the person typing in it.
 *
 * The value is committed on Enter and on blur, and immediately when what is typed is already a complete
 * valid colour. Anything else stays as a draft, so `#1d4` can exist on its way to `#1d4ed8` instead of
 * being rewritten mid-word.
 */
function TextField({
  id,
  label,
  value,
  invalid,
  onCommit,
  onDraft,
}: {
  id: string;
  label: string;
  value: string;
  invalid: boolean;
  onCommit: (text: string) => void;
  onDraft: (text: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
      <input
        id={id}
        value={value}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          onDraft(e.target.value);
          onCommit(e.target.value);
        }}
        onBlur={(e) => onCommit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit((e.target as HTMLInputElement).value);
          }
        }}
        className={cn(
          "mt-2 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
          invalid ? "border-destructive" : "border-border",
        )}
      />
    </div>
  );
}
