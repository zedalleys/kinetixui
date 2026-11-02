"use client";

import { useEffect, useId, useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import geometry from "./hero-polygon-geometry.json";

// The source faces share vertices but receive distinct lighting materials.
// Cyan carries the illustration; indigo appears in the shaded return faces.
const facetMaterials: Record<string, string> = {
  "cls-10": "glass", "cls-8": "light", "cls-3": "light",
  "cls-7": "shadow", "cls-1": "shadow", "cls-2": "edge",
  "cls-4": "edge", "cls-5": "light", "cls-6": "shadow",
};

// The central face is the front plane. The surrounding faces taper back
// to a second ring, with shared vertices so their edges stay joined.
const faces = geometry.facets.filter(face => face.type === "polygon");
const vertices = (data: string) => {
  const values = data.split(/\s+/).map(Number);
  return values.flatMap((x, i) => i % 2 ? [] : [[x, values[i + 1]]]);
};
const front = new Set(vertices(faces[0].data).map(([x, y]) => Math.round(x) + "," + Math.round(y)));
const mesh = faces.map(face => ({
  tone: face.tone,
  points: vertices(face.data).map(([x, y]) => ({
    x: x - 300, y: y - 285,
    z: front.has(Math.round(x) + "," + Math.round(y)) ? 64 : -56,
  })),
}));

function project(pitch: number, yaw: number) {
  const p = pitch * Math.PI / 180, r = yaw * Math.PI / 180;
  return mesh.map(face => {
    let depth = 0;
    const points = face.points.map(({ x, y, z }) => {
      const rz = z * Math.cos(r) - x * Math.sin(r);
      const dz = rz * Math.cos(p) + y * Math.sin(p);
      depth += dz;
      const scale = 960 / (960 - dz);
      return [300 + (x * Math.cos(r) + z * Math.sin(r)) * scale,
        285 + (y * Math.cos(p) - rz * Math.sin(p)) * scale].join(",");
    });
    return { tone: face.tone, points: points.join(" "), depth: depth / points.length };
  }).sort((a, b) => a.depth - b.depth);
}

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

  const [pose, setPose] = useState(rotation.current);
  const rotate = (pitch: number, yaw: number) => {
    rotation.current = { pitch: clamp(pitch), yaw: clamp(yaw) };
    setPose(rotation.current);
    shape.current?.style.setProperty("--polygon-pitch", `${rotation.current.pitch}deg`);
    shape.current?.style.setProperty("--polygon-yaw", `${rotation.current.yaw}deg`);
  };
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || !(event.target instanceof SVGPolygonElement)) return;
    drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, ...rotation.current };
    event.currentTarget.focus({ preventScroll: true });
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
                <linearGradient id={`${id}-glass`} x1="150" y1="180" x2="450" y2="440" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#DDFBFC" stopOpacity=".78" />
                  <stop offset=".48" stopColor="#62DCE4" stopOpacity=".42" />
                  <stop offset="1" stopColor="#28C7D9" stopOpacity=".6" />
                </linearGradient>
                <linearGradient id={`${id}-light`} x1="140" y1="70" x2="475" y2="250" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#B7F5F4" stopOpacity=".85" />
                  <stop offset=".52" stopColor="#28C7D9" stopOpacity=".82" />
                  <stop offset="1" stopColor="#65A7E4" stopOpacity=".68" />
                </linearGradient>
                <linearGradient id={`${id}-shadow`} x1="230" y1="220" x2="470" y2="505" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#4E65BC" stopOpacity=".84" />
                  <stop offset=".5" stopColor="#218FA5" stopOpacity=".9" />
                  <stop offset="1" stopColor="#28C7D9" stopOpacity=".76" />
                </linearGradient>
                <linearGradient id={`${id}-edge`} x1="110" y1="125" x2="250" y2="500" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#9FEAF0" stopOpacity=".82" />
                  <stop offset=".5" stopColor="#28C7D9" stopOpacity=".78" />
                  <stop offset="1" stopColor="#6054F4" stopOpacity=".62" />
                </linearGradient>
              </defs>
              <g>
                <g className="kx-polygon-facets">
                  {project(pose.pitch, pose.yaw).map(face => (
                    <polygon key={face.tone} points={face.points} fill={`url(#${id}-${facetMaterials[face.tone]})`}
                      stroke="rgba(235,255,255,.55)" strokeWidth=".75" strokeLinejoin="round" />
                  ))}
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
