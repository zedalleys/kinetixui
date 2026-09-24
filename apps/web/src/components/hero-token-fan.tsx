import { PLATFORMS, PLATFORM_DEFINITIONS } from "@/lib/platform-parity";

/**
 * Decorative hero diagram: one token source fanning out to every platform KinetixUI implements.
 * Pure SVG + CSS (see `.kx-fan-*` in globals.css), animation disabled under `prefers-reduced-motion`.
 * Hidden from assistive technology — the hero's own prose names the platforms and their maturity
 * (`platformSentence`), so repeating them here would only duplicate what a screen reader already heard.
 */

/**
 * The platforms, their order and their maturity all come from the manifest. There is no list in this file:
 * adding or removing a platform changes the diagram, and the geometry below follows the count.
 *
 * The short manifest key is the label on purpose — "Jetpack Compose" is the prose name (platform-prose.ts)
 * and does not fit a fan row, while the key is what this diagram has always shown.
 */
const TARGETS = PLATFORMS.map((platform) => ({
  platform,
  /** Only a non-stable platform carries a word. Angular is real and it is preview; the fan says both. */
  note: PLATFORM_DEFINITIONS[platform].maturity === "stable" ? null : PLATFORM_DEFINITIONS[platform].maturity,
}));

/*
 * Geometry is computed from TARGETS.length, not typed out per row, so a sixth platform re-lays the diagram
 * instead of overflowing it. The viewBox is a tight bound on the ink: the visible breathing room is the
 * wrapper's padding, not a second, invisible layer of whitespace inside the SVG.
 */
const ROW_GAP = 36; // clear of the 11px label (~8 units of ink either side of the row centre)
const FIRST_Y = 10; // half a row, so the top row's ink starts just inside the box
const NODE_X = 148;
const NODE_R = 5;
const LABEL_X = NODE_X + 13;
const SOURCE_X = 8;
const SOURCE_SIZE = 24;

const rowY = (index: number) => FIRST_Y + index * ROW_GAP;
const LAST_Y = rowY(TARGETS.length - 1);

const SOURCE_CY = (FIRST_Y + LAST_Y) / 2;
const SOURCE_Y = SOURCE_CY - SOURCE_SIZE / 2;
const WIRE_X = SOURCE_X + SOURCE_SIZE;

/** Widest label is 7 mono characters at 11px (~46 units) starting at LABEL_X — nothing reaches the edge. */
const VIEW_W = 212;
/** Bottom row's ink ends at LAST_Y + 8; the source caption sits well above that. */
const VIEW_H = LAST_Y + FIRST_Y;

const C1 = WIRE_X + (NODE_X - WIRE_X) * 0.5;
const C2 = WIRE_X + (NODE_X - WIRE_X) * 0.6;

export function HeroTokenFan() {
  return (
    <div aria-hidden className="kx-frame border border-border bg-background/60 p-4">
      <p className="eyebrow mb-3">one token architecture → platform-native UI</p>
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="presentation" className="w-full">
        {TARGETS.map(({ platform }, i) => (
          <path
            key={platform}
            d={`M${WIRE_X} ${SOURCE_CY} C ${C1} ${SOURCE_CY}, ${C2} ${rowY(i)}, ${NODE_X} ${rowY(i)}`}
            className="kx-fan-wire"
            style={{ animationDelay: `${i * -0.55}s` }}
          />
        ))}

        <rect x={SOURCE_X} y={SOURCE_Y} width={SOURCE_SIZE} height={SOURCE_SIZE} rx="4" className="kx-fan-source" />
        <text x={SOURCE_X + SOURCE_SIZE / 2} y={SOURCE_Y + SOURCE_SIZE + 16} textAnchor="middle" className="kx-fan-label">
          token
        </text>

        {TARGETS.map(({ platform, note }, i) => (
          <g key={platform}>
            {/* One node class for every platform, so the reduced-motion rule keeps covering all of them. */}
            <circle
              cx={NODE_X}
              cy={rowY(i)}
              r={NODE_R}
              className="kx-fan-node"
              style={{ animationDelay: `${i * 0.5}s` }}
            />
            <text x={LABEL_X} y={rowY(i) + 4} className="kx-fan-label">
              {platform}
            </text>
            {note ? (
              /* A second, quieter line rather than a suffix: it keeps every row the same width and cannot
                 push a long platform name past the edge of the box. */
              <text x={LABEL_X} y={rowY(i) + 15} className="kx-fan-note">
                {note}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}
