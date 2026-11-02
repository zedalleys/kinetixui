"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";
import { Toggle } from "@kinetixui/ui";
import { usePersistedPause } from "@/lib/use-persisted-pause";

/**
 * Custom brand illustration. The user-provided polygon mesh is a visual
 * reference, not a source image or geometry that is pasted into the hero.
 * All visible surfaces remain vector SVG, with tokenized color and CSS motion.
 */
const nodes = [
  [150, 116], [295, 166], [400, 108], [522, 177], [660, 218],
  [154, 241], [273, 263], [404, 248], [538, 305], [682, 332],
  [118, 385], [244, 385], [361, 392], [472, 406], [609, 411],
  [170, 505], [295, 526], [425, 514], [560, 535], [365, 606],
  [298, 332], [478, 267], [545, 465], [185, 312],
] as const;

const faces = [
  [0, 1, 5], [1, 5, 6], [1, 2, 7], [1, 6, 7], [2, 3, 7],
  [3, 4, 8], [3, 7, 8], [4, 8, 9], [5, 6, 23], [5, 10, 23],
  [6, 20, 23], [6, 7, 20], [7, 20, 12], [7, 12, 21],
  [7, 8, 21], [8, 9, 14], [8, 13, 14], [8, 13, 21],
  [10, 11, 23], [11, 20, 23], [11, 12, 20], [10, 11, 15],
  [11, 15, 16], [11, 12, 16], [12, 13, 17], [12, 16, 17],
  [13, 14, 22], [13, 17, 22], [14, 18, 22], [15, 16, 19],
  [16, 17, 19], [17, 18, 19], [17, 18, 22],
] as const;

const edges = Array.from(new Set(faces.flatMap(([a, b, c]) =>
  [[a, b], [b, c], [c, a]].map(([x, y]) => Math.min(x, y) + ":" + Math.max(x, y))
))).map((value) => value.split(":").map(Number));

const paths = [
  "M 68 458 C 192 543 375 222 587 241 C 750 256 748 416 562 488 C 342 574 149 550 68 458",
  "M 106 358 C 218 171 466 125 651 279 C 773 379 644 536 441 537 C 261 540 89 455 106 358",
  "M 127 490 C 245 525 347 403 457 353 C 565 305 658 309 722 341",
] as const;

function lineThrough(...indices: number[]) {
  return indices.map((i, n) => (n ? "L " : "M ") + nodes[i].join(" ")).join(" ");
}

export function CrystalBrandHero() {
  const root = React.useRef<HTMLDivElement>(null);
  const [paused, onPausedChange] = usePersistedPause("kx-polygon-motion");
  const [active, setActive] = React.useState(false);
  const uid = React.useId().replace(/:/g, "");
  const soft = uid + "-soft";
  const rich = uid + "-rich";
  const ice = uid + "-ice";
  const glow = uid + "-glow";

  React.useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => setActive(visible && !document.hidden && !preference.matches);
    const observer = typeof IntersectionObserver === "undefined" ? null :
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    if (root.current) observer?.observe(root.current);
    preference.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer?.disconnect();
      preference.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <div ref={root} className="kx-crystal-hero" data-polygon-running={active && !paused ? "true" : "false"}>
      <svg className="kx-crystal-svg" viewBox="0 0 780 700" role="presentation"
        aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={soft} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--kx-brand-ice)" stopOpacity=".2"/>
            <stop offset=".6" stopColor="var(--kx-brand-sky)" stopOpacity=".32"/>
            <stop offset="1" stopColor="var(--kx-brand-cyan)" stopOpacity=".17"/>
          </linearGradient>
          <linearGradient id={rich} x1=".1" y1="0" x2=".85" y2="1">
            <stop offset="0" stopColor="var(--kx-brand-cyan)" stopOpacity=".54"/>
            <stop offset=".52" stopColor="var(--kx-brand-teal)" stopOpacity=".57"/>
            <stop offset="1" stopColor="var(--kx-brand-sky)" stopOpacity=".32"/>
          </linearGradient>
          <linearGradient id={ice} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="var(--kx-brand-ice)" stopOpacity=".28"/>
            <stop offset="1" stopColor="var(--kx-brand-sky)" stopOpacity=".53"/>
          </linearGradient>
          <radialGradient id={glow}>
            <stop offset="0" stopColor="var(--kx-brand-cyan)" stopOpacity=".3"/>
            <stop offset="1" stopColor="var(--kx-brand-cyan)" stopOpacity="0"/>
          </radialGradient>
          <filter id={uid + "-blur"} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5"/>
          </filter>
        </defs>
        <ellipse cx="415" cy="380" rx="340" ry="260" fill={"url(#" + glow + ")"}/>
        <g className="kx-crystal-drift">
          <g className="kx-crystal-facets">
            {faces.map(([a, b, c], i) => (
              <polygon key={i} className={"kx-crystal-facet " + (i % 5 === 0 ? "kx-crystal-facet--strong" : "")}
                fill={"url(#" + (i % 5 === 0 ? rich : i % 3 === 0 ? ice : soft) + ")"}
                points={[a, b, c].map((n) => nodes[n].join(",")).join(" ")}/>
            ))}
          </g>
          <g className="kx-crystal-edges">
            {edges.map(([a, b], i) => (
              <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]}/>
            ))}
          </g>
          <g className="kx-crystal-core-traces" fill="none">
            <path pathLength="1" d={lineThrough(10, 11, 6, 7, 21, 8, 9)}/>
            <path pathLength="1" d={lineThrough(0, 1, 7, 12, 13, 14)}/>
            <path pathLength="1" d={lineThrough(15, 16, 17, 22, 14)}/>
          </g>
          <g className="kx-crystal-nodes">
            {nodes.map(([cx, cy], i) => (
              <g key={i}>
                {[0, 6, 8, 12, 14, 17, 21].includes(i) && <>
                  <circle className="kx-crystal-halo" cx={cx} cy={cy} r="17"/>
                  <circle className="kx-crystal-hub-ring" cx={cx} cy={cy} r="10"/>
                </>}
                <circle className="kx-crystal-node" cx={cx} cy={cy}
                  r={[0, 6, 8, 12, 14, 17, 21].includes(i) ? 4.7 : 3}/>
              </g>
            ))}
          </g>
        </g>
        <g className="kx-crystal-orbits" fill="none">
          {paths.map((d, i) => <path className="kx-crystal-orbit" key={i} d={d}/>)}
        </g>
        <g className="kx-crystal-orbit-signals" fill="none">
          {paths.map((d, i) => <path className="kx-crystal-orbit-signal" key={i} d={d} pathLength="1"/>)}
        </g>
        <g className="kx-crystal-shines" filter={"url(#" + uid + "-blur" + ")"}>
          <circle cx="361" cy="392" r="19"/><circle cx="538" cy="305" r="15"/>
        </g>
      </svg>
      <Toggle className="kx-polygon-pause kx-crystal-motion-button" aria-label={paused ? "Resume polygon animation" : "Pause polygon animation"}
        pressed={paused} onPressedChange={onPausedChange}>
        {paused ? <Play size={16} aria-hidden="true"/> : <Pause size={16} aria-hidden="true"/>}
        <span>{paused ? "Resume motion" : "Pause motion"}</span>
      </Toggle>
    </div>
  );
}
