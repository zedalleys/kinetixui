import { PlatformMark } from "./platform-marks";
import type { MapOutput, MapPlatform, MapToken } from "./hero-system-map";
import { breakable } from "./breakable";
import { TraceLayer, type TracePair } from "./trace-layer";

/**
 * Chapter 03's pipeline: the token boundary drawn as a route, left to right (start to end under RTL).
 *
 * Every label is a real path or name handed in from `lib/systems-in-motion.ts`. The two halves are styled
 * differently on purpose — a solid trace into the generated files, a broken one into the hand-written
 * packages — so the boundary the copy describes is also the thing the eye sees first.
 */
export function TokenPipeline({
  token,
  outputs,
  platforms,
  buildScript,
  dirs,
}: {
  token: MapToken;
  outputs: MapOutput[];
  platforms: MapPlatform[];
  /** the repository path of the token build */
  buildScript: string;
  /** platform → its package directory, from platformDefinitions */
  dirs: Record<string, string>;
}) {
  const pairs: TracePair[] = [
    { from: "source", to: "build" },
    ...outputs.map((o) => ({ from: "build", to: `out-${o.id}` })),
    ...platforms.map((p) => ({ from: `out-${p.output}`, to: `impl-${p.platform}`, kind: "written" as const })),
  ];
  const stage = "font-mono text-label-md text-muted-foreground";

  return (
    <div data-token-pipeline="" className="relative">
      <TraceLayer pairs={pairs} />
      <ol className="relative grid grid-cols-1 gap-8 lg-rem:grid-cols-[minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,1.1fr)_auto_minmax(0,1.3fr)] lg-rem:items-center lg-rem:gap-12">
        <li className="min-w-0">
          <p className={stage}>01 · canonical source</p>
          <div data-anchor="source" className="mt-3 rounded-xl border border-border bg-card p-4">
            <p className="font-mono text-sm text-foreground [overflow-wrap:anywhere]" dir="ltr">
              {breakable(token.files.light)}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]" dir="ltr">
              {breakable(token.files.dark)}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">DTCG JSON, one file per theme</p>
          </div>
        </li>
        <li className="min-w-0">
          <p className={stage}>02 · build</p>
          <div data-anchor="build" className="mt-3 rounded-xl border border-border p-4">
            <p className="font-display text-base font-semibold">Style Dictionary</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]" dir="ltr">
              {breakable(buildScript)}
            </p>
          </div>
        </li>
        <li className="min-w-0">
          <p className={stage}>03 · generated</p>
          <ul className="mt-3 grid gap-2">
            {outputs.map((o) => (
              <li key={o.id} data-anchor={`out-${o.id}`} className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
                <span className="block text-sm text-foreground">{o.language}</span>
                <span className="block font-mono [overflow-wrap:anywhere] text-xs text-muted-foreground" dir="ltr">
                  {breakable(o.files.light)}
                </span>
              </li>
            ))}
          </ul>
        </li>
        <li aria-hidden="true" className="hidden self-stretch lg-rem:flex lg-rem:flex-col lg-rem:items-center">
          <span className="w-px flex-1 border-s border-dashed border-foreground/30" />
          <span className="my-3 font-mono text-xs text-muted-foreground [writing-mode:vertical-rl]">token boundary</span>
          <span className="w-px flex-1 border-s border-dashed border-foreground/30" />
        </li>
        <li className="min-w-0">
          <p className={stage}>04 · written per platform</p>
          <ul className="mt-3 grid gap-2">
            {platforms.map((p) => (
              <li
                key={p.platform}
                data-anchor={`impl-${p.platform}`}
                className="flex items-center gap-3 rounded-lg border border-dashed border-foreground/25 px-3 py-2"
              >
                <PlatformMark platform={p.platform} className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block text-sm text-foreground">
                    {p.label}
                    {p.maturity !== "stable" ? <span className="ms-2 font-mono text-xs text-primary">{p.maturity}</span> : null}
                  </span>
                  <span className="block font-mono [overflow-wrap:anywhere] text-xs text-muted-foreground" dir="ltr">
                    {breakable(dirs[p.platform])}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </li>
      </ol>
    </div>
  );
}
