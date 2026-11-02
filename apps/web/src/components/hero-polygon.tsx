"use client";

import { useEffect, useId, useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import geometry from "./hero-polygon-geometry.json";

// Build a closed, bevelled prism from the outline of the supplied central face.
type Point = [number, number, number];
const outline = geometry.facets[0].data.split(/\s+/).map(Number).slice(0, -2);
function ring(scale: number, depth: number): Point[] {
  return outline.flatMap((x, i) => i % 2 ? [] : [[(x - 300) * scale, (outline[i + 1] - 285) * scale, depth] as Point]);
}
const front = ring(.88, 110), rim = ring(1.15, 10), back = ring(.94, -105);
function sides(a: Point[], b: Point[], material: string) {
  return a.map((point, i) => {
    const j = (i + 1) % a.length;
    return { points: [point, b[i], b[j], a[j]], material };
  });
}
const mesh = [
  { points: front, material: "glass" }, ...sides(front, rim, "light"),
  ...sides(rim, back, "shadow"), { points: [...back].reverse(), material: "edge" },
];

function project(pitch: number, yaw: number) {
  const p = pitch * Math.PI / 180, r = yaw * Math.PI / 180;
  return mesh.flatMap((face, index) => {
    const points = face.points.map(([x, y, z]) => {
      const rz = z * Math.cos(r) - x * Math.sin(r);
      return [x * Math.cos(r) + z * Math.sin(r), y * Math.cos(p) - rz * Math.sin(p),
        rz * Math.cos(p) + y * Math.sin(p)];
    });
    const [a, b, c] = points;
    const u = b.map((n,i) => n-a[i]), v = c.map((n,i) => n-a[i]);
    const nx = u[1]*v[2]-u[2]*v[1], ny = u[2]*v[0]-u[0]*v[2], nz = u[0]*v[1]-u[1]*v[0];
    if (nz*(960-a[2]) - nx*a[0] - ny*a[1] <= 0) return [];
    const light = (-.4*nx - .55*ny + .7*nz) / Math.hypot(nx,ny,nz);
    return [{ index, material: face.material, brightness: .78 + .32 * light,
      points: points.map(([x,y,z]) => [300+x*960/(960-z),285+y*960/(960-z)].join(",")).join(" ") }];
  });
}

// Closed circuit along the cage's original edges, including their intersections.
const circuit = [[91.94,52.44],[190.84,2.34],[635.06,257.55],[603.05,374.32],
  [234.38,638.34],[2.96,228.45],[135.6,234.55]];
const legs = circuit.map(([x,y], i) => {
  const [endX,endY] = circuit[(i + 1) % circuit.length];
  return { x, y, dx: endX-x, dy: endY-y, travel: Math.hypot(endX-x,endY-y)/155 };
});
const dwell = .65;
const lap = legs.reduce((sum, leg) => sum + leg.travel + dwell, 0);
function signalAt(time: number) {
  let t = time % lap;
  for (const leg of legs) {
    if (t < dwell) return { x: leg.x, y: leg.y, pulse: Math.sin(Math.PI*t/dwell)**2 };
    t -= dwell;
    if (t < leg.travel) return { x: leg.x + leg.dx*t/leg.travel, y: leg.y + leg.dy*t/leg.travel, pulse: 0 };
    t -= leg.travel;
  }
  return { x: circuit[0][0], y: circuit[0][1], pulse: 0 };
}

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
  const beacon = useRef<SVGGElement>(null);
  const halo = useRef<SVGCircleElement>(null);
  const elapsed = useRef(0);
  const [spin, setSpin] = useState(0);
  useEffect(() => {
    if (!active || paused) return;
    let frame: number, last = performance.now();
    function tick(now: number) {
      if (now - last >= 32) {
        const delta = Math.min(now - last, 80);
        elapsed.current += delta / 1000;
        const { x, y, pulse } = signalAt(elapsed.current);
        beacon.current?.setAttribute("transform", `translate(${x} ${y})`);
        halo.current?.setAttribute("r", String(6 + 11 * pulse));
        halo.current?.setAttribute("opacity", String(.22 + .38 * pulse));
        if (!drag.current) setSpin(angle => (angle + delta * .012) % 360);
        last = now;
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, paused]);
  const rotate = (pitch: number, yaw: number) => {
    rotation.current = { pitch: pitch % 360, yaw: yaw % 360 };
    setPose(rotation.current);
    shape.current?.style.setProperty("--polygon-pitch", `${rotation.current.pitch}deg`);
    shape.current?.style.setProperty("--polygon-yaw", `${rotation.current.yaw}deg`);
  };
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || !(event.target instanceof SVGPolygonElement)) return;
    drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, ...rotation.current };
    event.currentTarget.dataset.pointerFocus = "true";
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = "true";
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId) return;
    rotate(start.pitch - (event.clientY - start.y) * .65, start.yaw + (event.clientX - start.x) * .65);
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    event.currentTarget.dataset.dragging = "false";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const keyboardRotate = (event: KeyboardEvent<HTMLDivElement>) => {
    delete event.currentTarget.dataset.pointerFocus;
    const { pitch, yaw } = rotation.current;
    switch (event.key) {
      case "ArrowLeft": rotate(pitch, yaw - 5); break;
      case "ArrowRight": rotate(pitch, yaw + 5); break;
      case "ArrowUp": rotate(pitch - 5, yaw); break;
      case "ArrowDown": rotate(pitch + 5, yaw); break;
      case "Home": setSpin(0); rotate(0, 0); break;
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
        onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag} onKeyDown={keyboardRotate} onBlur={event => { delete event.currentTarget.dataset.pointerFocus; }}>
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
                  {project(pose.pitch - 15, pose.yaw + 24 + spin).map(face => (
                    <polygon key={face.index} data-face={face.index} style={{ filter: `brightness(${face.brightness})` }} points={face.points} fill={`url(#${id}-${face.material})`}
                      stroke="rgba(235,255,255,.55)" strokeWidth=".75" strokeLinejoin="round" />
                  ))}
                </g>
                {/* The supplied upper wireframe is drawn over the facets in the main brand colour. */}
                <g className="kx-polygon-wireframe">
                  {geometry.outline.map((path, i) => <path key={i} d={path.d} />)}
                </g>
                <g ref={beacon} className="kx-polygon-signals" transform="translate(91.94 52.44)">
                  <circle ref={halo} r="6" fill="#28c7d9" opacity=".22" />
                  <circle r="4" fill="white" stroke="#169bae" strokeWidth="1.5" />
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
