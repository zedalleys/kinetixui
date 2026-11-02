"use client";

import { useEffect, useId, useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Toggle, Button } from "@kinetixui/ui";
import { usePersistedPause } from "@/lib/use-persisted-pause";
import geometry from "./hero-polygon-geometry.json";

const clamp = (value: number) => Math.max(-28, Math.min(28, value));

/** Owner-supplied 189 [Converted].svg; its coordinates and outlined cage stay intact. */
export function HeroPolygon() {
  const id = useId().replace(/:/g, "");
  const root = useRef<HTMLDivElement>(null);
  const shape = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointer: number; x: number; y: number; pitch: number; yaw: number } | null>(null);
  const rotation = useRef({ pitch: 0, yaw: 0 });
  const [active, setActive] = useState(false);
  const [paused, togglePaused] = usePersistedPause("kx-hero-polygon-paused");
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => setActive(visible && !document.hidden && !preference.matches);
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
  }, []);

  // Pointer movement writes only two CSS variables; no React render per frame.
  const rotate = (pitch: number, yaw: number) => {
    rotation.current = { pitch: clamp(pitch), yaw: clamp(yaw) };
    shape.current?.style.setProperty("--polygon-pitch", `${rotation.current.pitch}deg`);
    shape.current?.style.setProperty("--polygon-yaw", `${rotation.current.yaw}deg`);
  };
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, ...rotation.current };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = "true";
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId) return;
    rotate(start.pitch - (event.clientY - start.y) * .14, start.yaw + (event.clientX - start.x) * .14);
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    event.currentTarget.dataset.dragging = "false";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const keyboardRotate = (event: KeyboardEvent<HTMLDivElement>) => {
    const { pitch, yaw } = rotation.current;
    switch (event.key) {
      case "ArrowLeft": rotate(pitch, yaw - 5); break;
      case "ArrowRight": rotate(pitch, yaw + 5); break;
      case "ArrowUp": rotate(pitch - 5, yaw); break;
      case "ArrowDown": rotate(pitch + 5, yaw); break;
      case "Home": rotate(0, 0); break;
      default: return;
    }
    event.preventDefault();
  };

  return (
    <div ref={root} className="kx-hero-polygon" data-running={active && !paused}>
      <div className="kx-polygon-aura" aria-hidden="true" />
      <div className="kx-polygon-interaction" tabIndex={0} role="group" aria-label="Rotate hero polygon" aria-describedby={`${id}-instructions`}
        onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag} onKeyDown={keyboardRotate}>
        <div ref={shape} className="kx-polygon-rotation">
          <svg className="kx-hero-polygon-art" viewBox="-35 -35 707.21 710.73" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id={`${id}-facet`} x1="110" y1="110" x2="470" y2="510" gradientUnits="userSpaceOnUse">
                <stop stopColor="#A78BFA" /><stop offset=".48" stopColor="#6054F4" /><stop offset="1" stopColor="#28C7D9" />
              </linearGradient>
              <linearGradient id={`${id}-reverse`} x1="450" y1="80" x2="150" y2="470" gradientUnits="userSpaceOnUse">
                <stop stopColor="#28C7D9" /><stop offset=".5" stopColor="#A78BFA" /><stop offset="1" stopColor="#6054F4" />
              </linearGradient>
            </defs>
            <g className="kx-polygon-idle">
              <g className="kx-polygon-facets">
                {geometry.facets.map((facet, i) => facet.type === "polygon" ?
                  <polygon key={i} points={facet.data} fill={`url(#${id}-${["cls-4", "cls-5", "cls-8"].includes(facet.tone) ? "reverse" : "facet"})`} opacity={facet.tone === "cls-10" ? .52 : 1} /> :
                  <path key={i} d={facet.data} className="kx-polygon-seam" />)}
              </g>
              {/* The supplied upper wireframe is drawn over the facets in the main brand colour. */}
              <g className="kx-polygon-wireframe">
                {geometry.outline.map((path, i) => <path key={i} d={path.d} />)}
              </g>
              <g className="kx-polygon-signals" fill="none" strokeWidth="1.8">
                <path d="M92 52 190 2 635 257 603 374 234 638 3 228" pathLength="1" />
                <path d="M190 2 210 279 603 374" pathLength="1" />
              </g>
            </g>
          </svg>
        </div>
      </div>
      <div className="kx-polygon-controls">
        <p id={`${id}-instructions`} className="text-body-sm text-muted-foreground">Drag to rotate <span aria-hidden="true">·</span><span className="sr-only">. Or use</span> arrow keys <span aria-hidden="true">·</span> Home to reset</p>
        <div className="flex flex-wrap items-center justify-center gap-1">
          <Button variant="Ghost" size="sm" onClick={() => rotate(0, 0)} aria-label="Reset polygon rotation"><RotateCcw size={14} aria-hidden="true" /><span>Reset</span></Button>
          <Toggle className="kx-mesh-pause" pressed={paused} onPressedChange={togglePaused} aria-label="Pause polygon animation">
            {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
            <span>{paused ? "Resume motion" : "Pause motion"}</span>
          </Toggle>
        </div>
      </div>
    </div>
  );
}
