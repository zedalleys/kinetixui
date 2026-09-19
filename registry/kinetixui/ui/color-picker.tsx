"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Pipette } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
  }
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace("#", "");
  if (h.length === 8) {
    const n = parseInt(h, 16);
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, (n & 255) / 255];
  }
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
}

function rgbaToHex(r: number, g: number, b: number, a: number, includeAlpha: boolean): string {
  const toHex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  const base = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  return includeAlpha ? `${base}${toHex(a * 255)}` : base;
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  s /= 100;
  v /= 100;
  const c = v * s;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 1) [r, g, b] = [c, x, 0];
  else if (hh < 2) [r, g, b] = [x, c, 0];
  else if (hh < 3) [r, g, b] = [0, c, x];
  else if (hh < 4) [r, g, b] = [0, x, c];
  else if (hh < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s * 100, max * 100];
}

const HEX_PATTERN_ALPHA = /^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;
const HEX_PATTERN = /^[0-9a-fA-F]{6}$/;

export interface ColorPickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  /** hex color, e.g. `#3b82f6` (or `#3b82f6ff` when `alpha` is on) */
  value: string;
  onChange: (hex: string) => void;
  /** show an alpha slider and read/emit 8-digit hex */
  alpha?: boolean;
  /** preset swatches row */
  swatches?: string[];
}

/**
 * ColorPicker — a saturation/value square, hue and (optional) alpha
 * sliders, a hex field, and swatches. Deliberately stateful rather than
 * deriving hue/saturation/value from `value` on every render: HSV is a
 * degenerate representation at the edges — saturation 0 (grayscale) or
 * value 0 (black) both erase hue information, since every hue produces
 * the same RGB there. Re-deriving HSV from the emitted hex on every
 * change would make the hue thumb jump to red the moment a drag crosses
 * either edge. Internal HSV state persists across those edges instead,
 * reconciled with the `value` prop only when it changes from something
 * other than this component's own last emission (tracked via a ref) — the
 * standard fix for this class of controlled color-picker bug.
 *
 * The 2D square is hand-rolled (no Radix primitive for a 2D slider); the
 * hue and alpha rails reuse `@radix-ui/react-slider` directly (not the
 * package's own `Slider` wrapper, whose track styling is fixed) for their
 * built-in keyboard and ARIA handling. The eyedropper button only renders
 * when `window.EyeDropper` exists (Chromium-only, behind a feature flag
 * on some browsers) — no polyfill, it just disappears elsewhere.
 */
const ColorPicker = React.forwardRef<HTMLDivElement, ColorPickerProps>(
  ({ value, onChange, alpha = false, swatches, className, ...props }, ref) => {
    const [hsv, setHsv] = React.useState<[number, number, number]>(() => {
      const [r, g, b] = hexToRgba(value);
      return rgbToHsv(r, g, b);
    });
    const [a, setA] = React.useState(() => hexToRgba(value)[3]);
    const lastEmitted = React.useRef(value);
    const [h, s, v] = hsv;

    React.useEffect(() => {
      if (value === lastEmitted.current) return;
      const [r, g, b, na] = hexToRgba(value);
      setHsv(rgbToHsv(r, g, b));
      setA(na);
      lastEmitted.current = value;
    }, [value]);

    const commit = React.useCallback(
      (nh: number, ns: number, nv: number, na: number) => {
        setHsv([nh, ns, nv]);
        setA(na);
        const [r, g, b] = hsvToRgb(nh, ns, nv);
        const hex = rgbaToHex(r, g, b, na, alpha);
        lastEmitted.current = hex;
        onChange(hex);
      },
      [alpha, onChange],
    );

    const squareRef = React.useRef<HTMLDivElement>(null);
    const draggingRef = React.useRef(false);

    const updateFromPoint = React.useCallback(
      (clientX: number, clientY: number) => {
        const el = squareRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const ns = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
        const nv = clamp(100 - ((clientY - rect.top) / rect.height) * 100, 0, 100);
        commit(h, ns, nv, a);
      },
      [commit, h, a],
    );

    const handleSquarePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      updateFromPoint(e.clientX, e.clientY);
    };
    const handleSquarePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      updateFromPoint(e.clientX, e.clientY);
    };
    const handleSquarePointerUp = () => {
      draggingRef.current = false;
    };
    const handleSquareKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowLeft") commit(h, clamp(s - step, 0, 100), v, a);
      else if (e.key === "ArrowRight") commit(h, clamp(s + step, 0, 100), v, a);
      else if (e.key === "ArrowUp") commit(h, s, clamp(v + step, 0, 100), a);
      else if (e.key === "ArrowDown") commit(h, s, clamp(v - step, 0, 100), a);
      else return;
      e.preventDefault();
    };

    const [supportsEyeDropper, setSupportsEyeDropper] = React.useState(false);
    React.useEffect(() => setSupportsEyeDropper(typeof window !== "undefined" && !!window.EyeDropper), []);

    const pickFromScreen = async () => {
      if (!window.EyeDropper) return;
      try {
        const result = await new window.EyeDropper().open();
        const [r, g, b] = hexToRgba(result.sRGBHex);
        commit(...rgbToHsv(r, g, b), a);
      } catch {
        // cancelled — no-op
      }
    };

    return (
      <div ref={ref} className={cn("flex w-64 flex-col gap-3 font-sans", className)} {...props}>
        <div
          ref={squareRef}
          role="slider"
          tabIndex={0}
          aria-label="Saturation and value"
          aria-valuetext={`saturation ${Math.round(s)}%, value ${Math.round(v)}%`}
          onPointerDown={handleSquarePointerDown}
          onPointerMove={handleSquarePointerMove}
          onPointerUp={handleSquarePointerUp}
          onKeyDown={handleSquareKeyDown}
          className="relative h-40 w-full touch-none rounded-md outline-none focus-visible:ring-1 focus-visible:ring-ring"
          style={{
            backgroundColor: `hsl(${h} 100% 50%)`,
            backgroundImage: "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
          }}
        >
          <div
            className="absolute size-3.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white shadow"
            style={{ left: `${s}%`, bottom: `${v}%`, backgroundColor: `hsl(${h} ${s}% ${v}%)` }}
          />
        </div>

        <SliderPrimitive.Root
          value={[h]}
          min={0}
          max={360}
          step={1}
          onValueChange={([nh]) => commit(nh ?? h, s, v, a)}
          className="relative flex h-4 w-full touch-none select-none items-center"
        >
          <SliderPrimitive.Track
            className="relative h-3 w-full grow rounded-full"
            style={{
              backgroundImage:
                "linear-gradient(to right, hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(360 100% 50%))",
            }}
          />
          <SliderPrimitive.Thumb aria-label="Hue" className="block size-4 rounded-full border-2 border-white bg-background shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </SliderPrimitive.Root>

        {alpha && (
          <SliderPrimitive.Root
            value={[Math.round(a * 100)]}
            min={0}
            max={100}
            step={1}
            onValueChange={([na]) => commit(h, s, v, (na ?? a * 100) / 100)}
            className="relative flex h-4 w-full touch-none select-none items-center"
          >
            <SliderPrimitive.Track
              className="relative h-3 w-full grow overflow-hidden rounded-full"
              style={{
                backgroundImage:
                  "conic-gradient(#0000001a 90deg, transparent 90deg 180deg, #0000001a 180deg 270deg, transparent 270deg)",
                backgroundSize: "8px 8px",
              }}
            >
              <div
                className="absolute inset-0"
                style={{ backgroundImage: `linear-gradient(to right, transparent, hsl(${h} ${s}% ${v}%))` }}
              />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb aria-label="Alpha" className="block size-4 rounded-full border-2 border-white bg-background shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </SliderPrimitive.Root>
        )}

        <div className="flex items-center gap-2">
          <div
            className="size-8 shrink-0 rounded-md border"
            style={{
              backgroundImage:
                "conic-gradient(#0000001a 90deg, transparent 90deg 180deg, #0000001a 180deg 270deg, transparent 270deg), linear-gradient(hsl(0 0% 0% / 0), hsl(0 0% 0% / 0))",
              backgroundSize: "8px 8px",
            }}
          >
            <div className="size-full rounded-md" style={{ backgroundColor: value }} />
          </div>
          <div className="flex flex-1 items-center gap-1">
            <span className="text-muted-foreground">#</span>
            <HexField value={value} alpha={alpha} onCommit={onChange} />
          </div>
          {supportsEyeDropper && (
            <Button
              type="button"
              variant="Ghost"
              size="icon"
              aria-label="Pick color from screen"
              onClick={pickFromScreen}
            >
              <Pipette className="size-4" />
            </Button>
          )}
        </div>

        {swatches && swatches.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {swatches.map((sw) => (
              <button
                key={sw}
                type="button"
                aria-label={sw}
                onClick={() => {
                  const [r, g, b] = hexToRgba(sw);
                  commit(...rgbToHsv(r, g, b), a);
                }}
                className="size-6 rounded-sm border transition-shadow hover:ring-1 hover:ring-ring hover:ring-offset-1"
                style={{ backgroundColor: sw }}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);
ColorPicker.displayName = "ColorPicker";

function HexField({
  value,
  alpha,
  onCommit,
}: {
  value: string;
  alpha: boolean;
  onCommit: (hex: string) => void;
}) {
  const [draft, setDraft] = React.useState(value.replace("#", "").toUpperCase());

  React.useEffect(() => setDraft(value.replace("#", "").toUpperCase()), [value]);

  const commit = () => {
    const pattern = alpha ? HEX_PATTERN_ALPHA : HEX_PATTERN;
    if (pattern.test(draft)) {
      onCommit(`#${draft.toLowerCase()}`);
    } else {
      setDraft(value.replace("#", "").toUpperCase());
    }
  };

  return (
    <Input
      value={draft}
      onChange={(e) => setDraft(e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, alpha ? 8 : 6))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit();
          e.currentTarget.blur();
        }
      }}
      className="h-8 flex-1 px-2 py-1 font-mono text-xs uppercase"
    />
  );
}

export { ColorPicker };
