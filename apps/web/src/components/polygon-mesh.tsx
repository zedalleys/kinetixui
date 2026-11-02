"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";
import { Toggle } from "@kinetixui/ui";
import { usePersistedPause } from "@/lib/use-persisted-pause";
import geometry from "./polygon-mesh-geometry.json";

/** Owner reference remains for static ornaments. The animated hero uses a distinct SVG composition. */
export function PolygonMesh({ animated = false, className = "", variant = "reference" }: { animated?: boolean; className?: string; variant?: "reference" | "hero" }) {
  const root = React.useRef<HTMLDivElement>(null);
  const [paused, togglePaused] = usePersistedPause("kx-polygon-motion");
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    if (!animated) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => setActive(visible && !document.hidden && !preference.matches);
    // Static is also the safe fallback in environments without intersection observation.
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    if (root.current) observer?.observe(root.current);
    preference.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer?.disconnect();
      preference.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [animated]);

  return (
    <div ref={root} className={`kx-polygon ${className}`} data-polygon-running={animated && active && !paused ? "true" : "false"}>
      <svg viewBox={variant === "hero" ? "0 0 760 520" : "0 0 741.71 860.74"} className="kx-polygon-art" aria-hidden="true" focusable="false">
        {variant === "hero" ? <HeroPolygonArt /> : <g className="kx-polygon-drift">
          {geometry.map((shape, index) => shape.d ? (
            <path key={index} className={`kx-mesh-tone-${shape.tone}`} d={shape.d} />
          ) : (
            <circle key={index} className={`kx-mesh-tone-${shape.tone}`} cx={shape.cx} cy={shape.cy} r={shape.r} />
          ))}
          <g className="kx-polygon-signals" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path pathLength="1" d="M170.54 84.79 125.89 294.31 394.41 434.17" />
            <path pathLength="1" d="M193.24 660.91 344.39 665.34 497 490.02 550.73 402.56" />
            <path pathLength="1" d="M95.71 219.28 187.36 150.65 326.47 177.11 460.16 396.62" />
          </g>
        </g>}
      </svg>
      {animated && (
        <Toggle className="kx-polygon-pause" aria-label="Pause polygon animation" pressed={paused} onPressedChange={togglePaused}>
          {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
          <span>{paused ? "Resume motion" : "Pause motion"}</span>
        </Toggle>
      )}
    </div>
  );
}

/**
 * Original hero geometry: a directional, airy network. KinetixUI semantic
 * brand tokens supply the color; SVG structure remains editable in source.
 */
const heroNodes: [number, number][] = [
 [25,365],[98,307],[160,385],[204,255],[260,315],[310,186],
 [350,371],[390,250],[429,132],[475,314],[514,197],[556,98],
 [595,352],[629,237],[694,151],[721,323],[536,432],[315,453],[120,450]
];
const heroFaces: [number, number, number][] = [
 [0,1,2],[1,3,2],[2,3,4],[3,5,4],[4,5,7],[4,7,6],
 [5,8,7],[7,8,10],[7,10,9],[8,11,10],[9,10,13],
 [10,11,14],[10,14,13],[9,13,12],[12,13,15],
 [6,9,16],[6,16,17],[2,6,17],[0,2,18]
];
const heroEdges: [number, number][] = [
 [0,1],[0,2],[1,2],[1,3],[2,3],[2,4],[2,17],[3,4],
 [3,5],[4,5],[4,6],[4,7],[5,7],[5,8],[6,7],[6,9],
 [6,16],[6,17],[7,8],[7,9],[7,10],[8,10],[8,11],
 [9,10],[9,12],[9,13],[9,16],[10,11],[10,13],
 [10,14],[11,14],[12,13],[12,15],[13,14],[13,15],[16,17]
];
const heroTrail = (indices: number[]) => indices.map((i,n) => (n === 0 ? "M" : "L") + heroNodes[i].join(" ")).join(" ");

function HeroPolygonArt() {
  const gradient = React.useId();
  return (
    <g className="kx-polygon-drift" data-artwork="original-hero">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity=".95" />
          <stop offset="1" stopColor="hsl(var(--info))" stopOpacity=".25" />
        </linearGradient>
      </defs>
      <path className="kx-hero-sweep" d="M 8 465 C 166 394 231 494 355 410 S 613 242 754 294" />
      <g className="kx-hero-facets">
        {heroFaces.map((face,i) => (
          <polygon key={i} className="kx-hero-facet" points={face.map(j => heroNodes[j].join(",")).join(" ")} />
        ))}
      </g>
      <g className="kx-hero-connections">
        {heroEdges.map(([a,b],i) => <line key={i} className="kx-hero-link"
          x1={heroNodes[a][0]} y1={heroNodes[a][1]}
          x2={heroNodes[b][0]} y2={heroNodes[b][1]} />)}
      </g>
      <g className="kx-polygon-signals kx-hero-signals" fill="none"
        stroke={"url(#" + gradient + ")"} strokeWidth="3" strokeLinecap="round">
        <path pathLength="1" d={heroTrail([0,1,3,5,8,11,14])} />
        <path pathLength="1" d={heroTrail([18,2,4,7,10,13,15])} />
        <path pathLength="1" d={heroTrail([17,6,9,12])} />
      </g>
      {heroNodes.map(([cx,cy],i) => (
        <circle key={i} className={i % 4 === 1 ? "kx-hero-node kx-hero-node-pulse" : "kx-hero-node"}
          cx={cx} cy={cy} r={i % 4 === 1 ? 4.5 : 2.7} />
      ))}
      {[5,9,13].map(i => <circle key={"ring-"+i} className="kx-hero-ring"
        cx={heroNodes[i][0]} cy={heroNodes[i][1]} r="12" />)}
    </g>
  );
}
