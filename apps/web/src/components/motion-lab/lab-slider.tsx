"use client";

import * as React from "react";
import { Slider } from "@kinetixui/ui";
import { LAB_SLIDER_LAYERS, type LabSliderLayer } from "@/lib/motion-lab/variants";

/**
 * A slider with the lab's three additive motion layers: a press halo, a value bubble and live tick marks.
 *
 * ── Why these three, and why not a spring release ──────────────────────────
 *
 * The brief asks for thumb response, a value bubble and a spring release. The first two and the ticks are
 * ADDITIVE: they are elements the lab owns outright, positioned beside the shipped `Slider` rather than
 * inside it, so they can be built, measured and discarded without touching a published file.
 *
 * The spring release cannot be built that way, and the lab says so rather than faking it. Radix positions
 * the thumb by writing its own inline style on the thumb element, and the shipped `Slider` exposes no seam
 * — no `asChild`, no thumb class, no render prop — through which a lab could add a transform to it. Every
 * way of getting one from out here is a defect dressed as a feature: a CSS rule on the thumb's `transform`
 * races an inline style and would stop working silently on a Radix version bump, and springing the lab's own
 * overlay instead would leave the halo visibly trailing a thumb that had already snapped. So the release
 * spring is recorded as a DEPENDENCY on `packages/ui` rather than implemented here. The integrator that
 * would drive it exists and is tested (`lib/motion-lab/spring.ts`); what is missing is a seam, which is the
 * owning package's decision and not a lab's to take.
 *
 * ── Accessibility ───────────────────────────────────────────────────────────
 *
 * The thumb is the slider to a screen reader (`role="slider"`), and it already announces its value. The
 * bubble is therefore `aria-hidden` in every state: a second live source for the same number would double
 * every announcement during a drag, which is worse than having no bubble. The halo and the ticks are
 * decoration over information that is already in `aria-valuenow`, `aria-valuemin` and `aria-valuemax`, so
 * they are `aria-hidden` too, and all three are hidden under forced colours where their tints collapse.
 *
 * "Engaged" — what shows the bubble and the halo — is pointer-held OR keyboard-focused, so a keyboard reader
 * gets the same bubble a pointer reader gets. It is deliberately not `:hover`: a bubble that appears under a
 * passing cursor is noise, and on touch there is no hover to speak of.
 *
 * ── Geometry and RTL ────────────────────────────────────────────────────────
 *
 * The thumb's offset is PHYSICAL — measured from the host's left edge whatever the direction — while the
 * overlays are placed with `inset-inline-start`, which is logical. Under RTL those two disagree, and the naive
 * version puts the bubble at the mirror image of the thumb: correct-looking in LTR, wrong in RTL, and
 * invisible to any test that only runs LTR. So the physical offset is converted to a logical one here, once,
 * and the browser gate measures the bubble against the thumb in both directions.
 *
 * It is measured with `getBoundingClientRect`, not `offsetLeft`. Radix wraps each thumb in its own positioned
 * span and positions THAT, so the thumb's `offsetParent` is a 16px box around the thumb and its `offsetLeft`
 * is ~0 wherever the thumb actually is. Reading `offsetLeft` put every overlay at the track's leading edge,
 * which looked plausible at value 0 and was wrong everywhere else — the browser gate measured it as 451px
 * from the thumb's centre. Rects are relative to the viewport, so the host's own rect is subtracted and the
 * result is in the host's coordinates, which is what `inset-inline-start` wants.
 */

export interface LabSliderProps {
  readonly label: string;
  readonly value: number;
  readonly onValueChange: (value: number) => void;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly layers: readonly LabSliderLayer[];
  readonly format?: (value: number) => string;
  readonly disabled?: boolean;
}

/** Ticks are only drawn when the step divides the range into a countable number of them. 40 is the point past which they read as a texture rather than as steps. */
const MAX_TICKS = 40;

export function LabSlider({
  label,
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  layers,
  format = (v) => String(v),
  disabled = false,
}: LabSliderProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  /**
   * Engagement is the UNION of two independent conditions, not one flag that either can clear.
   *
   * With a single flag, a reader who clicked the thumb and then kept adjusting with the arrow keys lost the
   * value bubble and the halo at `pointerup`: the thumb was still focused, but no second focus event fires
   * for the keyboard presses that follow, so nothing ever set the flag back. Every subsequent keyboard
   * adjustment then happened with the cue hidden — which is the reader most in need of it. Found by Codex on
   * PR #662. A pointer release may only release the pointer's claim.
   */
  const [pressed, setPressed] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const engaged = pressed || focused;
  const [thumb, setThumb] = React.useState<number | null>(null);
  /**
   * The thumb's centre on the BLOCK axis, in pixels from the host's top edge.
   *
   * The decorations were originally pinned to `inset-block-start: 50%`, which is the host's centre, not the
   * track's: the host carries asymmetric block padding (`pt-7 pb-1`) to make room for the value bubble above
   * the thumb, so its 50% sat 12px above the thumb — measured on a 38px host, reported by Codex on PR #662,
   * and invisible to the browser gate, which asserted horizontal centring only. Deriving the offset from the
   * padding would hard-code two Tailwind utilities and the thumb's size; measuring it is the same discipline
   * the inline axis already follows one state above.
   */
  const [thumbMid, setThumbMid] = React.useState<number | null>(null);

  const has = (layer: LabSliderLayer) => layers.includes(layer);

  // The thumb's logical centre, re-read whenever the value, the direction or the width can have moved it.
  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const handle = host.querySelector<HTMLElement>('[role="slider"]');
      if (!handle) {
        setThumb(null);
        setThumbMid(null);
        return;
      }
      const hostBox = host.getBoundingClientRect();
      const handleBox = handle.getBoundingClientRect();
      if (hostBox.width === 0) {
        setThumb(null);
        setThumbMid(null);
        return;
      }
      const physical = handleBox.left + handleBox.width / 2 - hostBox.left;
      const rtl = getComputedStyle(host).direction === "rtl";
      setThumb(rtl ? hostBox.width - physical : physical);
      // The block axis does not mirror, so this one is physical in both directions.
      setThumbMid(handleBox.top + handleBox.height / 2 - hostBox.top);
    };
    measure();
    const sizes = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    sizes?.observe(host);
    const dirs = new MutationObserver(measure);
    const director = host.closest("[dir]");
    if (director) dirs.observe(director, { attributes: true, attributeFilter: ["dir"] });
    return () => {
      sizes?.disconnect();
      dirs.disconnect();
    };
  }, [value, min, max]);

  const ticks = React.useMemo(() => {
    if (!has("ticks") || step <= 0) return [];
    const count = Math.round((max - min) / step);
    if (!Number.isFinite(count) || count < 1 || count > MAX_TICKS) return [];
    return Array.from({ length: count + 1 }, (_, index) => min + index * step);
  }, [layers, min, max, step]);

  return (
    <div
      ref={hostRef}
      className="kx-lab-slider pb-1 pt-7"
      data-kx-lab-engaged={engaged && !disabled ? "true" : "false"}
      data-kx-lab-layers={layers.join(" ")}
      // Published on the host so the halo and the tick rail both inherit one measurement.
      style={thumbMid === null ? undefined : ({ ["--kx-lab-thumb-mid" as string]: `${thumbMid}px` } as React.CSSProperties)}
    >
      {has("ticks") && ticks.length > 0 ? (
        <div className="kx-lab-ticks" aria-hidden="true">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="kx-lab-tick"
              data-passed={tick <= value ? "true" : "false"}
              data-current={tick === value ? "true" : "false"}
              style={{ insetInlineStart: `${((tick - min) / (max - min)) * 100}%` }}
            />
          ))}
        </div>
      ) : null}
      {has("press") && thumb !== null ? (
        <span className="kx-lab-halo" aria-hidden="true" style={{ ["--kx-lab-thumb" as string]: `${thumb}px` }} />
      ) : null}
      {has("bubble") && thumb !== null ? (
        <span className="kx-lab-bubble-anchor" aria-hidden="true" style={{ ["--kx-lab-thumb" as string]: `${thumb}px` }}>
          <span className="kx-lab-bubble">{format(value)}</span>
        </span>
      ) : null}
      {/*
        Engagement is bound to the control, not to the wrapper: `Slider` forwards unknown props to the Radix root,
        which composes them with its own handlers, so a press lands only on the slider itself and not on the padding
        the bubble needs. Focus and blur bubble out of the thumb, so one pair here covers keyboard entry and exit.
      */}
      <Slider
        aria-label={label}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(next) => onValueChange(next[0] ?? value)}
      />
    </div>
  );
}

/** Re-exported so the lab's legend and the gate read the same list. */
export { LAB_SLIDER_LAYERS };
