/**
 * Decorative hero diagram: one token source fanning out to the four
 * component platforms. Pure SVG + CSS (see `.kx-fan-*` in globals.css),
 * animation disabled under `prefers-reduced-motion`. Hidden from AT.
 */
const TARGETS = ["React", "SwiftUI", "Compose", "Flutter"] as const;

export function HeroTokenFan() {
  return (
    <div
      aria-hidden
      className="kx-frame border border-border bg-background/60 p-4"
    >
      <p className="eyebrow mb-3">one token → four platforms</p>
      <svg viewBox="0 0 240 176" role="presentation" className="w-full">
        {TARGETS.map((_, i) => {
          const y = 22 + i * 44;
          return (
            <path
              key={i}
              d={`M44 88 C 112 88, 120 ${y}, 186 ${y}`}
              className="kx-fan-wire"
              style={{ animationDelay: `${i * -0.55}s` }}
            />
          );
        })}

        <rect x="22" y="76" width="24" height="24" rx="4" className="kx-fan-source" />
        <text x="34" y="118" textAnchor="middle" className="kx-fan-label">
          token
        </text>

        {TARGETS.map((t, i) => {
          const y = 22 + i * 44;
          return (
            <g key={t}>
              <circle
                cx="186"
                cy={y}
                r="5"
                className="kx-fan-node"
                style={{ animationDelay: `${i * 0.5}s` }}
              />
              <text x="200" y={y + 4} className="kx-fan-label">
                {t}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
