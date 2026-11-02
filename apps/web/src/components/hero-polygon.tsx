"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import mesh from "./hero-mesh.json";

/**
 * The homepage hero's polygon network.
 *
 * The geometry is the owner's supplied `OH38WC1.svg` — provenance and source
 * hash in `design-assets/polygon/REFERENCE.md`. Every coordinate is rendered
 * from that file, unmodified; `scripts/gen-hero-mesh.mjs` only classifies the
 * shapes and measures the junction centres so the light can be coupled to them.
 * This file is the presentation and interaction layer.
 *
 * What moves, and how:
 *   - the mesh breathes as one body (a CSS transform on `.kx-mesh-body`, so the
 *     facets and the wireframe that outlines them can never slip apart)
 *   - each facet's own opacity drifts on its own slow cycle (CSS, compositor)
 *   - three light pulses travel the supplied graph's own edges (one rAF loop)
 *   - a junction brightens because a pulse is near it, not on a timer: the loop
 *     measures the distance and writes the glow
 *   - the pointer adds a local brightening, through a CSS gradient above the
 *     facets. It never displaces geometry.
 *
 * What the reader controls:
 *   - dragging a facet rotates the whole network in its plane. The rotation is
 *     a transform on `.kx-mesh-spin`, written with `setProperty` rather than
 *     through React, so a drag costs no render and cannot desynchronise the
 *     breath underneath it.
 *   - the arrow keys step the same rotation, Home returns it to the artwork's
 *     own pose, Space toggles the motion and Escape stops it. There is no
 *     visible control row: the group carries its name and its instructions, and
 *     a status region announces the pause.
 *
 * Per frame, at 30fps, while the hero is on screen: 3 pulse positions and 26
 * junction glows, all written imperatively. No SVG filter over a large area, no
 * React state in the loop, and the loop does not run offscreen, in a hidden tab,
 * under `prefers-reduced-motion`, or while the reader has paused it.
 */

const FRAME_MS = 1000 / 30;
/** Falloff of a junction's response to a passing pulse, in squared user units. */
const REACH = 7000;
/** One arrow press, in degrees. Small enough to aim, large enough to see. */
const KEY_STEP = 4;
/** Pointer travel to degrees. A drag across the artwork is about half a turn. */
const DRAG_GAIN = 0.28;

export function HeroPolygon() {
  const id = useId().replace(/:/g, "");
  const root = useRef<HTMLDivElement>(null);
  const spin = useRef<SVGGElement>(null);
  const pulseRefs = useRef<(SVGCircleElement | null)[]>([]);
  const glowRefs = useRef<(SVGCircleElement | null)[]>([]);
  const angle = useRef(0);
  const drag = useRef<{ pointer: number; x: number; from: number } | null>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [paused, setPaused] = useState(false);
  const running = onScreen && !paused;

  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => setOnScreen(visible && !document.hidden && !preference.matches);
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
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

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = 0;
    const started = performance.now();

    function step(now: number) {
      frame = requestAnimationFrame(step);
      if (now - last < FRAME_MS) return;
      last = now;
      const t = (now - started) / 1000;

      const lit = new Float64Array(mesh.nodes.length);
      for (let r = 0; r < mesh.routes.length; r++) {
        const route = mesh.routes[r];
        const travelled = (((t + route.delay) / route.duration) % 1) * route.total;
        let seg = 0;
        while (seg < route.spans.length - 1 && route.spans[seg] < travelled) seg++;
        const from = seg === 0 ? 0 : route.spans[seg - 1];
        const span = route.spans[seg] - from || 1;
        const k = Math.min(1, Math.max(0, (travelled - from) / span));
        const a = route.v[seg];
        const b = route.v[seg + 1] ?? a;
        const x = a[0] + (b[0] - a[0]) * k;
        const y = a[1] + (b[1] - a[1]) * k;

        const pulse = pulseRefs.current[r];
        if (pulse) {
          pulse.setAttribute("cx", x.toFixed(1));
          pulse.setAttribute("cy", y.toFixed(1));
        }
        for (let n = 0; n < mesh.nodes.length; n++) {
          const node = mesh.nodes[n];
          const near = Math.exp(-(((node.cx - x) ** 2 + (node.cy - y) ** 2) / REACH));
          if (near > lit[n]) lit[n] = near;
        }
      }

      for (let n = 0; n < mesh.nodes.length; n++) {
        const glow = glowRefs.current[n];
        if (!glow) continue;
        // A slow resting shimmer under the pulse response: a junction nothing
        // has reached is alive, not dead, and never flashes.
        const rest = 0.13 + 0.05 * Math.sin(t * 0.5 + n * 1.7);
        glow.setAttribute("opacity", (rest + 0.6 * lit[n]).toFixed(3));
        glow.setAttribute("r", (mesh.nodes[n].r * (2.1 + 2.4 * lit[n])).toFixed(1));
      }
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  /**
   * The pointer's local brightening. A mouse affordance only — touch is left
   * alone, so the hero scrolls the way the rest of the page does.
   */
  const trackPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || !root.current) return;
    const box = root.current.getBoundingClientRect();
    root.current.style.setProperty("--kx-px", `${(((event.clientX - box.left) / box.width) * 100).toFixed(1)}%`);
    root.current.style.setProperty("--kx-py", `${(((event.clientY - box.top) / box.height) * 100).toFixed(1)}%`);
    root.current.dataset.pointer = "true";
  };
  const dropPointer = () => {
    if (root.current) root.current.dataset.pointer = "false";
  };

  /**
   * The one place the rotation is written. Never through React.
   *
   * `angle` is what the reader sees: degrees clockwise on screen. The artwork
   * itself is mirrored in LTR (`.kx-hero-mesh` carries `scaleX(-1)`, so the
   * supplied spur sweeps across the hero instead of out of it) and is not
   * mirrored in RTL, and a mirror reverses the sense of a rotation. So the sign
   * is chosen from the live direction at write time: without it, ArrowRight
   * would turn the network clockwise on one page and anticlockwise on the other.
   */
  const turn = (degrees: number) => {
    angle.current = ((degrees % 360) + 360) % 360;
    const mirrored = document.documentElement.getAttribute("dir") !== "rtl";
    spin.current?.style.setProperty("--kx-spin", `${(mirrored ? -angle.current : angle.current).toFixed(2)}deg`);
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    // Only a facet starts a drag. The links, the junctions and the space around
    // the artwork stay inert, so a touch there scrolls the page.
    if (!event.isPrimary || event.button !== 0) return;
    if (!(event.target instanceof SVGPathElement) || event.target.dataset.facet === undefined) return;
    drag.current = { pointer: event.pointerId, x: event.clientX, from: angle.current };
    event.currentTarget.dataset.pointerFocus = "true";
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = "true";
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId) return;
    turn(start.from + (event.clientX - start.x) * DRAG_GAIN);
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    event.currentTarget.dataset.dragging = "false";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const keyboardRotate = (event: KeyboardEvent<HTMLDivElement>) => {
    // A key means this focus is a keyboard focus, whatever brought it here.
    delete event.currentTarget.dataset.pointerFocus;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp":
        turn(angle.current - KEY_STEP);
        break;
      case "ArrowRight":
      case "ArrowDown":
        turn(angle.current + KEY_STEP);
        break;
      case "Home":
        turn(0);
        break;
      case " ":
        setPaused((was) => !was);
        break;
      case "Escape":
        setPaused(true);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <div
      ref={root}
      className="kx-hero-polygon"
      data-running={running}
      data-pointer="false"
      onPointerMove={trackPointer}
      onPointerLeave={dropPointer}
    >
      <div className="kx-polygon-aura" aria-hidden="true" />
      <div
        className="kx-polygon-interaction"
        tabIndex={0}
        role="group"
        aria-label="Rotate hero polygon network"
        aria-describedby={`${id}-instructions`}
        data-dragging="false"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={keyboardRotate}
        onBlur={(event) => {
          delete event.currentTarget.dataset.pointerFocus;
        }}
      >
        <svg className="kx-hero-mesh" viewBox={mesh.viewBox} aria-hidden="true" focusable="false" role="presentation">
          <defs>
            {/* Four facet materials, from the deepest return face to the
                highlight. Stop colours come from CSS so the dark theme re-tints
                one mesh rather than shipping a second one. */}
            {[0, 1, 2, 3].map((m) => (
              <linearGradient
                key={m}
                id={`${id}-m${m}`}
                x1={m % 2 ? "1" : "0"}
                y1={m > 1 ? "1" : "0"}
                x2={m % 2 ? "0" : "1"}
                y2={m > 1 ? "0" : "1"}
              >
                <stop className={`kx-mesh-stop-${m}a`} />
                <stop offset="1" className={`kx-mesh-stop-${m}b`} />
              </linearGradient>
            ))}
            <radialGradient id={`${id}-node`}>
              <stop className="kx-mesh-stop-node-a" />
              <stop offset="0.4" className="kx-mesh-stop-node-b" />
              <stop offset="1" className="kx-mesh-stop-node-c" />
            </radialGradient>
          </defs>

          {/* Two nested groups, and the nesting is the point: the reader's
              rotation lives on the outer one and the breath on the inner one, so
              a drag composes with the idle motion instead of fighting it for the
              same `transform`. */}
          <g ref={spin} className="kx-mesh-spin">
            <g className="kx-mesh-body">
              <g className="kx-mesh-facets">
                {mesh.facets.map((facet) => (
                  <path
                    key={facet.i}
                    data-facet={facet.i}
                    data-material={facet.m}
                    d={facet.d}
                    fill={`url(#${id}-m${facet.m})`}
                    style={
                      {
                        "--kx-in": `${(0.012 * Number(facet.i)).toFixed(3)}s`,
                        "--kx-shimmer": `${(13 + Number(facet.p) * 11).toFixed(2)}s`,
                        "--kx-shimmer-delay": `${(Number(facet.p) * -22).toFixed(2)}s`,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </g>

              <g className="kx-mesh-links">
                {mesh.links.map((link) => (
                  <path
                    key={link.i}
                    data-link={link.i}
                    data-tone={link.tone}
                    pathLength={1}
                    d={link.d}
                    style={{ "--kx-in": `${(0.016 * Number(link.i)).toFixed(3)}s` } as React.CSSProperties}
                  />
                ))}
              </g>

              <g className="kx-mesh-nodes">
                {mesh.nodes.map((node, n) => (
                  <g key={node.i} data-junction={n}>
                    <circle
                      ref={(el) => {
                        glowRefs.current[n] = el;
                      }}
                      className="kx-mesh-node-glow"
                      cx={node.cx}
                      cy={node.cy}
                      r={node.r * 2.1}
                      opacity={0.15}
                      fill={`url(#${id}-node)`}
                    />
                    <circle className="kx-mesh-node-core" cx={node.cx} cy={node.cy} r={node.r} />
                  </g>
                ))}
              </g>

              <g className="kx-mesh-pulses">
                {mesh.routes.map((route, r) => (
                  <circle
                    key={r}
                    ref={(el) => {
                      pulseRefs.current[r] = el;
                    }}
                    className="kx-mesh-pulse"
                    cx={route.v[0][0]}
                    cy={route.v[0][1]}
                    r={3.4}
                  />
                ))}
              </g>
            </g>
          </g>
        </svg>
      </div>
      {/* The pointer's local brightening. Above the facets, below nothing that
          carries meaning, and inert until a mouse is actually over the art. */}
      <div className="kx-polygon-spotlight" aria-hidden="true" />
      <p id={`${id}-instructions`} className="sr-only">
        Drag a facet or use the arrow keys to rotate the network. Home returns it to its original angle. Space pauses or
        resumes the moving light; Escape pauses it.
      </p>
      <span className="sr-only" role="status">
        {paused ? "Hero network motion paused." : ""}
      </span>
    </div>
  );
}
