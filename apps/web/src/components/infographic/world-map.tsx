"use client";

import * as React from "react";

/**
 * Dotted equirectangular world map — a "measured drawing" of reach.
 * Land is generated procedurally from coarse continent blobs + a deterministic
 * coastline dither, so it stays compact and reads as a world without shipping
 * geojson. The platform nodes are interactive: hover or keyboard-focus one to
 * light its link back to the token contract and read what it resolves to.
 */

const COLS = 66;
const ROWS = 30;

type Blob = { cx: number; cy: number; rx: number; ry: number };
const CONTINENTS: Blob[] = [
  { cx: 13, cy: 8, rx: 7, ry: 6 }, // North America
  { cx: 22, cy: 4, rx: 3, ry: 2.6 }, // Greenland
  { cx: 19.5, cy: 20, rx: 4, ry: 7 }, // South America
  { cx: 31, cy: 6, rx: 4, ry: 3 }, // Europe
  { cx: 33, cy: 14, rx: 5, ry: 8 }, // Africa
  { cx: 37.5, cy: 9, rx: 4, ry: 3 }, // Middle East
  { cx: 46, cy: 6, rx: 12, ry: 4 }, // N Asia / Russia
  { cx: 44, cy: 12, rx: 3, ry: 3 }, // India
  { cx: 50, cy: 9, rx: 5, ry: 3 }, // E Asia
  { cx: 51, cy: 16, rx: 5, ry: 2 }, // SE Asia
  { cx: 56, cy: 21, rx: 5, ry: 3 }, // Australia
];

const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

const isLand = (x: number, y: number) => {
  for (const b of CONTINENTS) {
    const d = ((x - b.cx) / b.rx) ** 2 + ((y - b.cy) / b.ry) ** 2;
    if (d <= 0.82) return true;
    if (d <= 1.15 && hash(x, y) > 0.42) return true;
  }
  return false;
};

const CELL = 9; // px pitch between dots
const R = 2.1; // dot radius

const LAND: [number, number][] = [];
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (isLand(x, y)) LAND.push([x, y]);
  }
}

// The token contract sits at the centre; every platform node links back to it.
const HUB = { x: 20, y: 20, label: "token contract", output: "tokens/semantic/**" };
const NODES = [
  { x: 12, y: 9, label: "React", output: "@kinetixui/ui · globals.css" },
  { x: 31, y: 7, label: "Web", output: "dist/web/tokens.ts" },
  { x: 50, y: 9, label: "Compose", output: "Theme.kt · Color.kt" },
  { x: 57, y: 8, label: "SwiftUI", output: "KinetixColorsSwiftUI.swift" },
  { x: 57, y: 22, label: "Flutter", output: "kinetix_color_scheme.dart" },
];

const px = (n: number) => n * CELL + CELL / 2;

export function WorldMap() {
  const w = COLS * CELL;
  const h = ROWS * CELL;
  const [active, setActive] = React.useState<number | null>(null);
  const [pinned, setPinned] = React.useState<number | null>(null);

  const shown = active ?? pinned;
  const node = shown == null ? null : NODES[shown];

  return (
    <figure className="kx-frame m-0 w-full border border-border bg-background/60 p-4">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mx-auto block w-full max-w-3xl"
        role="group"
        aria-label="World map — KinetixUI's single token contract resolves to React, Web, SwiftUI, Jetpack Compose and Flutter, wherever the app runs. Focus a platform marker for its generated output."
      >
        {LAND.map(([x, y]) => (
          <circle
            key={`${x}-${y}`}
            cx={px(x)}
            cy={px(y)}
            r={R}
            className="fill-muted-foreground/35"
            aria-hidden
          />
        ))}

        {/* links: token contract → each platform */}
        {NODES.map((n, i) => (
          <line
            key={`link-${n.label}`}
            x1={px(HUB.x)}
            y1={px(HUB.y)}
            x2={px(n.x)}
            y2={px(n.y)}
            className={
              shown === i
                ? "stroke-primary"
                : shown == null
                  ? "stroke-primary/25"
                  : "stroke-primary/10"
            }
            strokeWidth={shown === i ? 1.6 : 1}
            strokeDasharray="2 3"
            aria-hidden
          />
        ))}

        {/* hub */}
        <g transform={`translate(${px(HUB.x)} ${px(HUB.y)})`} aria-hidden>
          <circle r={10} className="fill-primary/10" />
          <circle r={3.6} className="fill-primary" />
          <text
            x={0}
            y={-13}
            textAnchor="middle"
            className="fill-muted-foreground font-mono"
            style={{ fontSize: 8, letterSpacing: 0.3 }}
          >
            {HUB.label}
          </text>
        </g>

        {/* interactive platform nodes */}
        {NODES.map((n, i) => {
          const on = shown === i;
          return (
            <g
              key={n.label}
              transform={`translate(${px(n.x)} ${px(n.y)})`}
              tabIndex={0}
              role="button"
              aria-pressed={pinned === i}
              aria-label={`${n.label} — resolves to ${n.output}`}
              className="cursor-pointer outline-none"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onClick={() => setPinned((p) => (p === i ? null : i))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setPinned((p) => (p === i ? null : i));
                }
              }}
            >
              <circle
                r={13}
                className={on ? "fill-transparent stroke-ring" : "fill-transparent stroke-transparent"}
                strokeWidth={1.5}
              />
              <circle r={on ? 11 : 9} className="fill-primary/15 transition-all" />
              <circle
                r={on ? 4.4 : 3.4}
                className="fill-primary transition-all motion-safe:animate-pulse"
                style={{ animationDelay: `${i * 240}ms` }}
              />
              <text
                x={9}
                y={3.5}
                className={on ? "fill-foreground font-mono" : "fill-muted-foreground font-mono"}
                style={{ fontSize: 9, letterSpacing: 0.3, fontWeight: on ? 600 : 400 }}
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>

      <figcaption
        aria-live="polite"
        className="mt-3 border-t border-border pt-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
      >
        {node ? (
          <>
            <span className="text-foreground">{node.label}</span>
            {" · "}
            {node.output}
            {pinned != null && <span className="text-muted-foreground/70"> · click to unpin</span>}
          </>
        ) : (
          <>one token contract · five outputs · hover a node to trace it</>
        )}
      </figcaption>
    </figure>
  );
}
