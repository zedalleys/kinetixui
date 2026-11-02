"use client";

import { useEffect, useId, useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
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
  const [paused, setPaused] = useState(false);
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
      case " ": setPaused(was => !was); break;
      case "Escape": setPaused(true); break;
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
          <div className="kx-polygon-idle">
            <svg className="kx-hero-polygon-art" viewBox="-35 -35 707.21 710.73" aria-hidden="true" focusable="false">
              <defs>
                <linearGradient id={`${id}-facet`} x1="130" y1="65" x2="490" y2="510" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#A78BFA" stopOpacity=".42" />
                  <stop offset=".48" stopColor="#6054F4" stopOpacity=".35" />
                  <stop offset="1" stopColor="#28C7D9" stopOpacity=".68" />
                </linearGradient>
              </defs>
              <g>
                <g className="kx-polygon-facets">
                  {geometry.facets.map((facet, i) => facet.type === "polygon" ?
                    <polygon key={i} points={facet.data} fill={`url(#${id}-facet)`} opacity={facet.tone === "cls-10" ? .36 : [ .72, .9, .68, .82 ][Math.floor(i / 2) % 4]} /> :
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
      </div>
      <p id={`${id}-instructions`} className="sr-only">
        Drag or use arrow keys to rotate. Home resets orientation. Space pauses or resumes animation; Escape pauses it.
      </p>
      <span className="sr-only" role="status">{paused ? "Polygon animation paused." : ""}</span>
    </div>
  );
}
