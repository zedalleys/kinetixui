"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";
import { Toggle } from "@kinetixui/ui";
import { usePersistedPause } from "@/lib/use-persisted-pause";
import geometry from "./polygon-mesh-geometry.json";

/** Exact owner-supplied OH38WC1 coordinates; provenance in design-assets/polygon/REFERENCE.md. */
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
    <div ref={root} className={`kx-polygon ${variant === "hero" ? "kx-polygon--hero" : ""} ${className}`} data-polygon-running={animated && active && !paused ? "true" : "false"}>
      {variant === "hero" ? (
        <svg viewBox="0 0 960 620" className="kx-polygon-art kx-hero-art" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="kx-hero-facet-shade" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity=".025" />
              <stop offset="65%" stopColor="hsl(var(--primary))" stopOpacity=".15" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity=".045" />
            </linearGradient>
            <radialGradient id="kx-hero-node-aura">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity=".26" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* New composition, not the source artwork: flowing triangulated ribbon with a distinct silhouette. */}
          <g className="kx-hero-drift">
            <g className="kx-hero-facets">
              <polygon points="35,505 165,430 260,494" />
              <polygon points="165,430 300,320 260,494" />
              <polygon points="300,320 418,392 260,494" />
              <polygon points="300,320 500,244 418,392" />
              <polygon points="500,244 602,318 418,392" />
              <polygon points="500,244 704,168 602,318" />
              <polygon points="704,168 790,256 602,318" />
              <polygon points="704,168 905,105 790,256" />
              <polygon points="905,105 952,325 790,256" />
              <polygon points="790,256 952,325 830,467" />
              <polygon points="602,318 790,256 830,467" />
              <polygon points="602,318 830,467 662,502" />
              <polygon points="418,392 602,318 662,502" />
              <polygon points="418,392 662,502 522,544" />
              <polygon points="260,494 418,392 522,544" />
              <polygon points="260,494 522,544 356,558" />
              <polygon points="35,505 260,494 180,586" />
            </g>
            <g className="kx-hero-lines">
              <path d="M35 505 165 430 300 320 500 244 704 168 905 105" />
              <path d="M35 505 260 494 418 392 602 318 790 256 952 325" />
              <path d="M180 586 260 494 356 558 522 544 662 502 830 467 952 325" />
              <path d="M165 430 260 494 300 320 418 392 500 244 602 318 704 168 790 256 905 105 952 325" />
              <path d="M260 494 522 544 418 392 662 502 602 318 830 467 790 256" />
            </g>
            <path className="kx-hero-horizon" d="M20 540 C160 420 285 460 392 368 S635 180 938 92" />
            <g className="kx-hero-glows">
              <circle cx="300" cy="320" r="40" fill="url(#kx-hero-node-aura)" />
              <circle cx="602" cy="318" r="44" fill="url(#kx-hero-node-aura)" />
              <circle cx="790" cy="256" r="44" fill="url(#kx-hero-node-aura)" />
            </g>
            <g className="kx-hero-nodes">
              {([[35, 505], [165, 430], [260, 494], [300, 320], [418, 392], [500, 244],
                [602, 318], [704, 168], [790, 256], [905, 105], [952, 325],
                [830, 467], [662, 502], [522, 544], [356, 558], [180, 586]] as const).map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={i % 4 === 2 ? 5 : 3.5} />
              ))}
            </g>
            <g className="kx-hero-traces">
              <path pathLength="1" d="M35 505 165 430 300 320 500 244 704 168 905 105" />
              <path pathLength="1" d="M180 586 260 494 418 392 602 318 790 256 952 325" />
              <path pathLength="1" d="M356 558 522 544 662 502 830 467 952 325" />
            </g>
          </g>
        </svg>
      ) : (
      <svg viewBox="0 0 741.71 860.74" className="kx-polygon-art" aria-hidden="true" focusable="false">
        <g className="kx-polygon-drift">
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
        </g>
      </svg>
      )}
      {animated && (
        <Toggle className="kx-polygon-pause" aria-label="Pause polygon animation" pressed={paused} onPressedChange={togglePaused}>
          {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
          <span>{paused ? "Resume motion" : "Pause motion"}</span>
        </Toggle>
      )}
    </div>
  );
}
