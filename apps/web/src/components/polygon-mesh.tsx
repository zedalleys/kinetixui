"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";
import { Toggle } from "@kinetixui/ui";
import { usePersistedPause } from "@/lib/use-persisted-pause";
import geometry from "./polygon-mesh-geometry.json";
import { PolygonHeroArtwork } from "./polygon-hero-artwork";

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
        <PolygonHeroArtwork />
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
