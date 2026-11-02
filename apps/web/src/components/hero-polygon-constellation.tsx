"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";
import { Toggle } from "@kinetixui/ui";
import { usePersistedPause } from "@/lib/use-persisted-pause";

/** Original SVG network composition; colors come from existing KinetixUI tokens. */
const points = [
  [28, 304], [107, 203], [184, 284], [221, 118], [320, 195],
  [360, 54], [445, 133], [528, 57], [605, 184], [539, 300],
  [445, 391], [328, 327], [233, 431], [95, 424], [607, 401],
] as const;

const facets = [
  [0, 1, 2], [1, 3, 2], [2, 3, 4], [3, 5, 4], [4, 5, 6],
  [5, 7, 6], [6, 7, 8], [6, 8, 9], [4, 6, 9], [4, 9, 11],
  [2, 4, 11], [2, 11, 12], [0, 2, 13], [2, 12, 13],
  [11, 9, 10], [11, 10, 12], [9, 14, 10], [8, 14, 9],
] as const;

const segments = Array.from(new Set(facets.flatMap(([a, b, c]) =>
  [[a, b], [b, c], [c, a]].map(([x, y]) => Math.min(x, y) + ":" + Math.max(x, y))
))).map((edge) => edge.split(":").map(Number));

const route = (...indices: number[]) => indices.map((i, n) =>
  (n === 0 ? "M " : "L ") + points[i][0] + " " + points[i][1]
).join(" ");

export function HeroPolygonConstellation() {
  const root = React.useRef<HTMLDivElement>(null);
  const [paused, togglePaused] = usePersistedPause("kx-polygon-motion");
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => setActive(visible && !document.hidden && !media.matches);
    const observer = typeof IntersectionObserver === "undefined" ? null :
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        sync();
      });
    if (root.current) observer?.observe(root.current);
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer?.disconnect();
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <div ref={root} className="kx-hero-constellation" data-polygon-running={active && !paused ? "true" : "false"}>
      <svg className="kx-hero-constellation-art" viewBox="0 0 640 480"
        preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="kx-hero-facet" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity=".25" />
            <stop offset=".55" stopColor="hsl(var(--primary))" stopOpacity=".06" />
            <stop offset="1" stopColor="hsl(var(--background))" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="kx-hero-glow">
            <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity=".32" />
            <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="404" cy="246" rx="231" ry="179" fill="url(#kx-hero-glow)" />
        <g className="kx-hero-constellation-drift">
          <g className="kx-hero-facets">
            {facets.map(([a, b, c], i) => (
              <polygon key={i} className={i % 3 === 0 ? "kx-hero-facet-strong" : "kx-hero-facet"}
                points={[a, b, c].map((k) => points[k].join(",")).join(" ")} fill="url(#kx-hero-facet)" />
            ))}
          </g>
          <g className="kx-hero-links" fill="none">
            {segments.map(([a, b], i) => (
              <line key={i} x1={points[a][0]} y1={points[a][1]} x2={points[b][0]} y2={points[b][1]} />
            ))}
          </g>
          <g className="kx-hero-traces" fill="none">
            <path pathLength="1" d={route(0, 1, 3, 5, 7, 8)} />
            <path pathLength="1" d={route(13, 12, 11, 4, 6, 9, 14)} />
            <path pathLength="1" d={route(2, 4, 9, 10)} />
          </g>
          <g className="kx-hero-nodes">
            {points.map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r={i % 4 === 0 ? 5 : 3.2} />
            ))}
          </g>
        </g>
      </svg>
      <Toggle className="kx-polygon-pause kx-hero-motion-control"
        aria-label={paused ? "Resume polygon animation" : "Pause polygon animation"}
        pressed={paused} onPressedChange={togglePaused}>
        {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        <span>{paused ? "Resume motion" : "Pause motion"}</span>
      </Toggle>
    </div>
  );
}
