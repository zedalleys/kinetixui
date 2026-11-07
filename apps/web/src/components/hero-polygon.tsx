"use client";

import { useEffect, useId, useRef, useState } from "react";
import mesh from "./hero-mesh.json";

/**
 * The homepage hero's polygon network — decoration.
 *
 * The geometry is the owner's supplied `OH38WC1.svg` — provenance and source
 * hash in `design-assets/polygon/REFERENCE.md`. Every coordinate is rendered
 * from that file, unmodified; `scripts/gen-hero-mesh.mjs` only classifies the
 * shapes and measures the junction centres so the light can be coupled to them.
 * This file is the presentation layer.
 *
 * What moves, and how:
 *   - the mesh breathes as one body (a CSS transform on `.kx-mesh-body`, so the
 *     facets and the wireframe that outlines them can never slip apart)
 *   - each facet's own opacity drifts on its own slow cycle (CSS, compositor)
 *   - three light pulses travel the supplied graph's own edges (one rAF loop)
 *   - a junction brightens because a pulse is near it, not on a timer: the loop
 *     measures the distance and writes the glow
 *
 * What the reader controls: nothing. The owner's decision of 2026-11-06 is that
 * the hero is pure decoration, so the drag rotation, the arrow keys, Home and
 * the illustration's tab stop are all gone, and with them the focus indicator
 * that existed only to serve that tab stop. There is no control row and no
 * pause: the motion follows the lifecycle below rather than anything a reader
 * has to operate. The pointer brightening that used to live here is now the
 * site-wide `components/cursor-glow.tsx`, because bound to this element it
 * could not leave the illustration and ended in a straight cut at its edge.
 *
 * Nothing in here takes focus or is announced: the `<svg>` is `aria-hidden`, and
 * there is no longer a named group pointing at keyboard instructions, because
 * there are no keys to describe. A decorative illustration that advertises
 * controls it does not have is worse than a silent one.
 *
 * Per frame, at 30fps, while the hero is on screen: 3 pulse positions and 26
 * junction glows, all written imperatively. No SVG filter over a large area and
 * no React state in the loop.
 *
 * The lifecycle is one switch, `data-running`. It is false offscreen, in a
 * hidden tab and under reduced motion, and it governs BOTH the rAF loop and the
 * CSS layers (the breath and the per-facet shimmer), which until 2026-11-05 ran
 * on regardless — so motion continued where the component reported none.
 * `check:rebrand-hero` measures the body transform and a facet's opacity, not
 * only the pulse coordinates, which is why that gate stayed green through it.
 */

const FRAME_MS = 1000 / 30;
/** Falloff of a junction's response to a passing pulse, in squared user units. */
const REACH = 7000;

export function HeroPolygon() {
  const id = useId().replace(/:/g, "");
  const root = useRef<HTMLDivElement>(null);
  const pulseRefs = useRef<(SVGCircleElement | null)[]>([]);
  const glowRefs = useRef<(SVGCircleElement | null)[]>([]);
  const [onScreen, setOnScreen] = useState(false);
  /**
   * The one motion switch, mirrored to `data-running` so the stylesheet obeys
   * the same lifecycle the rAF loop does. False offscreen, in a hidden tab and
   * under reduced motion. There is no reader-facing pause: the artwork simply
   * does not animate when nobody can see it.
   */
  const running = onScreen;

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

  return (
    <div ref={root} className="kx-hero-polygon" data-running={running}>
      <div className="kx-polygon-aura" aria-hidden="true" />
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

        {/* One group carries the breath, so the facets and the wireframe that
            outlines them move as one body. The reader's rotation used to live on
            a second group outside it; with the rotation gone, so is the group. */}
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
      </svg>
    </div>
  );
}
