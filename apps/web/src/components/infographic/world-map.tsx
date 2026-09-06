import * as React from "react";

/**
 * Dotted equirectangular world map — a "measured drawing" of reach.
 * Land is generated procedurally from coarse continent blobs + a deterministic
 * coastline dither, so it stays compact and reads as a world without shipping
 * geojson. Markers are decorative; the whole figure carries one aria-label.
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

// decorative "one system, everywhere" nodes at rough city positions
const NODES = [
  { x: 12, y: 9, label: "React" },
  { x: 31, y: 7, label: "Web" },
  { x: 50, y: 9, label: "Compose" },
  { x: 57, y: 8, label: "SwiftUI" },
  { x: 57, y: 22, label: "Flutter" },
  { x: 20, y: 20, label: "tokens" },
];

export function WorldMap() {
  const w = COLS * CELL;
  const h = ROWS * CELL;
  return (
    <div
      role="img"
      aria-label="World map — KinetixUI's single token contract resolves to React, Web, SwiftUI, Jetpack Compose and Flutter, wherever the app runs."
      className="kx-frame w-full overflow-x-auto border border-border bg-background/60 p-4"
    >
      <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto block w-full max-w-3xl" aria-hidden>
        {LAND.map(([x, y]) => (
          <circle
            key={`${x}-${y}`}
            cx={x * CELL + CELL / 2}
            cy={y * CELL + CELL / 2}
            r={R}
            className="fill-muted-foreground/35"
          />
        ))}
        {NODES.map((n, i) => (
          <g key={n.label} transform={`translate(${n.x * CELL + CELL / 2} ${n.y * CELL + CELL / 2})`}>
            <circle r={9} className="fill-primary/15" />
            <circle
              r={3.4}
              className="fill-primary motion-safe:animate-pulse"
              style={{ animationDelay: `${i * 240}ms` }}
            />
            <text
              x={9}
              y={3.5}
              className="fill-foreground font-mono"
              style={{ fontSize: 9, letterSpacing: 0.3 }}
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-3 border-t border-border pt-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        one token contract · five outputs · wherever the app ships
      </p>
    </div>
  );
}
