import * as React from "react";
import { durations, easings, elevation, platformUnits, radiusRoles, radiusScale, spacingScale } from "@/lib/foundations";
import manifest from "../../../../components.manifest.json";
import {
  CATALOGUE_VERIFICATION,
  EVIDENCE_COUNTS,
  EVIDENCE_KINDS,
  PLATFORMS,
  PLATFORM_DEFINITIONS,
  VERIFICATION_COUNTS,
  VERIFICATION_REQUIRES,
  type EvidenceKind,
  type Platform,
} from "@/lib/platform-parity";
import { componentTotal, gaps, nonPorts, notSupported, platformCount, platforms, statusCounts } from "@/lib/platform-support";
import { availabilitySentence } from "@/lib/platform-prose";

const manifestComponents = manifest.components as Record<
  string,
  { platforms: string[]; platformGuidance?: Record<string, { type: string; wave?: string; reason?: string }> }
>;

/** Same look as the token table on /docs/tokens: a bordered, horizontally scrollable table. */
function Table({ head, children, label }: { head: string[]; children: React.ReactNode; label: string }) {
  return (
    // a scrollable region must be keyboard-focusable and named (WCAG 2.1.1 / axe scrollable-region-focusable)
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="my-6 overflow-x-auto rounded-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [background:linear-gradient(to_right,hsl(var(--background))_30%,transparent),linear-gradient(to_left,hsl(var(--background))_30%,transparent),radial-gradient(farthest-side_at_0_50%,hsl(var(--foreground)/0.18),transparent),radial-gradient(farthest-side_at_100%_50%,hsl(var(--foreground)/0.18),transparent)_100%_0] [background-attachment:local,local,scroll,scroll] [background-repeat:no-repeat] [background-size:40px_100%,40px_100%,14px_100%,14px_100%] [background-position:0_0,100%_0,0_0,100%_0]"
    >
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left">
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border align-top">{children}</tbody>
      </table>
    </div>
  );
}

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">{children}</code>
);
const td = "px-4 py-2";

/** Inline `code` spans in the data strings. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, i) =>
        part.startsWith("`") && part.endsWith("`") && part.length > 2 ? <Code key={i}>{part.slice(1, -1)}</Code> : <React.Fragment key={i}>{part}</React.Fragment>,
      )}
    </>
  );
}

export function SpacingTable() {
  return (
    <Table label="Spacing scale" head={["Token", "Value", "Grid", "Size", "Native constant"]}>
      {spacingScale.map((s) => (
        <tr key={s.step}>
          <td className={td}>
            <Code>--spacing-{s.step}</Code>
          </td>
          <td className={`${td} font-mono tabular-nums`}>{s.px}</td>
          <td className={td}>{s.px === 0 ? "—" : s.role === "base" ? "Base (× 8)" : "Half-step (× 4)"}</td>
          <td className={`${td} w-40`} aria-hidden>
            <span className="block h-2 rounded-full bg-primary" style={{ width: s.px }} />
          </td>
          <td className={td}>
            <Code>space{s.step}</Code>
          </td>
        </tr>
      ))}
    </Table>
  );
}

export function PlatformUnitsTable() {
  return (
    <Table label="What a unit means on each platform" head={["Platform", "Unit", "How"]}>
      {platformUnits.map((p) => (
        <tr key={p.platform}>
          <th scope="row" className={`${td} text-left font-medium`}>
            {p.platform}
          </th>
          <td className={td}>{p.unit}</td>
          <td className={td}>
            <Inline text={p.how} />
          </td>
        </tr>
      ))}
    </Table>
  );
}

export function RadiusTable() {
  return (
    <Table label="Radius scale" head={["Token", "Value", "Native constant", "Use"]}>
      {radiusScale.map((r) => (
        <tr key={r.name}>
          <td className={td}>
            <Code>--radius-{r.name}</Code>
          </td>
          <td className={`${td} font-mono tabular-nums`}>{r.px === 9999 ? "9999 (pill)" : r.px}</td>
          <td className={td}>
            <Code>KinetixRadius.{r.name}</Code>
          </td>
          <td className={`${td} text-muted-foreground`}>{r.description ?? ""}</td>
        </tr>
      ))}
    </Table>
  );
}

export function RadiusRolesTable() {
  return (
    <Table label="Radius role aliases" head={["Role token", "Resolves to", "Value", "Native constant", "Used by"]}>
      {radiusRoles.map((r) => (
        <tr key={r.role}>
          <td className={td}>
            <Code>--radius-{r.role}</Code>
          </td>
          <td className={td}>
            <Code>--radius-{r.target}</Code>
          </td>
          <td className={`${td} font-mono tabular-nums`}>{r.px}</td>
          <td className={td}>
            <Code>KinetixRadius.{r.role}</Code>
          </td>
          <td className={`${td} text-muted-foreground`}>{r.description?.replace(/^Role alias — /, "")}</td>
        </tr>
      ))}
    </Table>
  );
}

export function MotionTable() {
  return (
    <>
      <Table label="Motion durations" head={["Token", "Duration", "Use"]}>
        {durations.map((d) => (
          <tr key={d.name}>
            <td className={td}>
              <Code>--duration-{d.name}</Code>
            </td>
            <td className={`${td} font-mono tabular-nums`}>{d.ms}ms</td>
            <td className={`${td} text-muted-foreground`}>{d.description}</td>
          </tr>
        ))}
      </Table>
      <Table label="Motion easings" head={["Token", "Curve", "Use"]}>
        {easings.map((e) => (
          <tr key={e.name}>
            <td className={td}>
              <Code>--easing-{e.name}</Code>
            </td>
            <td className={`${td} font-mono text-xs`}>{e.curve}</td>
            <td className={`${td} text-muted-foreground`}>{e.description}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}

export function ElevationTable() {
  return (
    <Table label="Elevation as used by the components" head={["Level", "Token", "Used by"]}>
      {elevation.map((e) => (
        <tr key={e.level}>
          <th scope="row" className={`${td} text-left font-medium`}>
            {e.level}
          </th>
          <td className={td}>{e.token === "none" ? "—" : <Code>{e.token}</Code>}</td>
          <td className={`${td} text-muted-foreground`}>{e.used}</td>
        </tr>
      ))}
    </Table>
  );
}

/**
 * One card per platform instead of a 7-column table: the columns are prose-heavy, so a table forced a hidden
 * horizontal scroll that readers had to discover. Cards wrap to the container and never scroll sideways.
 */
export function PlatformSupportTable() {
  const field = "text-[11px] font-mono uppercase tracking-[0.1em] text-muted-foreground";
  return (
    <ul aria-label="Supported platforms" className="my-6 grid list-none gap-4 p-0">
      {platforms.map((p) => {
        // maturity comes from platformDefinitions, keyed by the row's platform id — never a second label here
        const key = (Object.keys(PLATFORM_DEFINITIONS) as Platform[]).find((k) => k.toLowerCase() === p.id);
        const maturity = key ? PLATFORM_DEFINITIONS[key].maturity : undefined;
        return (
          <li key={p.id} className="min-w-0 rounded-lg border border-border">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-muted/30 px-4 py-3">
              <p className="m-0 text-base font-medium">
                {p.name}
                {maturity && maturity !== "stable" && (
                  <span className="ml-2 rounded-[3px] border border-border px-1 align-middle font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    {maturity}
                  </span>
                )}
              </p>
              <span className="text-xs text-muted-foreground">{p.technology}</span>
              <span className="ml-auto text-sm tabular-nums">
                {p.components} of {componentTotal} entries
              </span>
            </div>
            {/* `[&>div]:min-w-0` and `break-words`: these cells are sized by their widest content, which is a
                package name inside <Code> — one unbreakable token. A bare grid track cannot shrink below it. */}
            <dl className="m-0 grid gap-x-6 gap-y-4 px-4 py-4 text-sm [&_dd]:break-words [&>div]:min-w-0 sm:grid-cols-2">
              <div>
                <dt className={field}>Package · distribution</dt>
                <dd className="m-0 mt-1">
                  <Code>{p.package}</Code>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    <Inline text={p.distribution} />
                  </span>
                </dd>
              </div>
              <div>
                <dt className={field}>Tokens</dt>
                <dd className="m-0 mt-1">{p.tokens}</dd>
              </div>
              <div>
                <dt className={field}>Dark mode</dt>
                <dd className="m-0 mt-1">{p.darkMode}</dd>
              </div>
              <div>
                <dt className={field}>RTL</dt>
                <dd className="m-0 mt-1">{p.rtl}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className={field}>Automated verification</dt>
                <dd className="m-0 mt-1">
                  <Inline text={p.verification} />
                  <span className="mt-1 block font-mono text-[11px] text-muted-foreground">{p.workflow}</span>
                </dd>
              </div>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}

const EVIDENCE_LABEL: Record<EvidenceKind, string> = {
  build: "Build",
  interaction: "Interaction",
  accessibility: "Accessibility",
  rtl: "RTL",
  largeText: "Large text",
  visual: "Visual",
  published: "Published",
};

/**
 * Per-platform verification summary: what the package promises, and separately what the tests prove.
 *
 * Every evidence row is a fraction, never a tick. "Interaction 21 / 98" and a green check are different
 * claims, and only one of them is true — a tick beside a partially covered catalogue is the single most
 * misleading thing this page could print.
 */
export function PlatformVerificationTable() {
  return (
    <div className="my-6 grid gap-4 sm:grid-cols-2">
      {PLATFORMS.map((platform) => {
        const def = PLATFORM_DEFINITIONS[platform];
        const total = platformCount(platform);
        const counts = EVIDENCE_COUNTS[platform];
        const rungs = VERIFICATION_COUNTS[platform] ?? {};
        return (
          <section key={platform} className="rounded-lg border border-border p-4">
            <h3 className="font-mono text-sm text-foreground">{def.label}</h3>
            <dl className="mt-2 space-y-1 font-mono text-[11px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Implementations</dt>
                <dd className="tabular-nums">
                  {total} of {componentTotal}
                  {def.catalogComplete ? " · catalogue complete" : " · catalogue incomplete"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Package maturity</dt>
                <dd className="capitalize">{def.maturity}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Distribution</dt>
                <dd>{def.distribution.published ? def.distribution.channel : `${def.distribution.channel} — not published`}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Catalogue verification</dt>
                <dd className="capitalize text-foreground">{CATALOGUE_VERIFICATION[platform] ?? "—"}</dd>
              </div>
            </dl>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Evidence</p>
            <dl className="mt-1 grid gap-x-5 gap-y-0.5 font-mono text-[11px] sm:grid-cols-2">
              {EVIDENCE_KINDS.map((kind) => (
                <div key={kind} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{EVIDENCE_LABEL[kind]}</dt>
                  <dd className="tabular-nums">
                    {counts?.[kind] ?? 0} / {total}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[11px] text-muted-foreground">
              {Object.entries(rungs)
                .map(([level, n]) => `${n} ${level}`)
                .join(" · ")}
              . The catalogue figure above is the weakest of these, not an average.
            </p>
          </section>
        );
      })}
    </div>
  );
}

/** What each verification rung costs, read from the generator so this cannot describe a different ladder. */
export function VerificationLadderTable() {
  return (
    <Table label="Verification levels" head={["Level", "Evidence required"]}>
      {(Object.keys(VERIFICATION_REQUIRES) as (keyof typeof VERIFICATION_REQUIRES)[]).map((level) => (
        <tr key={level}>
          <th scope="row" className={`${td} text-left font-medium capitalize`}>
            {level}
          </th>
          <td className={td}>
            {VERIFICATION_REQUIRES[level].map((k) => EVIDENCE_LABEL[k]).join(" · ")}
          </td>
        </tr>
      ))}
    </Table>
  );
}

/** How a gap is filled on the component page. Neither counts as platform coverage. */
const GAP_KIND_LABEL: Record<string, string> = {
  "native-equivalent": "The platform's own idiom",
  composition: "A composition of other components",
  planned: "Nothing — a port is planned",
};

export function ComponentGapsTable() {
  return (
    <Table label="Components not on every platform" head={["Component", "Missing on", "What the page shows instead", "Why"]}>
      {gaps.map((g) => (
        <tr key={g.slug}>
          <th scope="row" className={`${td} text-left font-medium`}>
            <Code>{g.slug}</Code>
          </th>
          <td className={td}>{g.missing.join(", ")}</td>
          <td className={td}>{g.kind ? GAP_KIND_LABEL[g.kind] : "—"}</td>
          <td className={`${td} text-muted-foreground`}>{g.note ?? ""}</td>
        </tr>
      ))}
    </Table>
  );
}

export function NotSupportedTable() {
  return (
    <Table label="Not supported" head={["Platform", "Status"]}>
      {notSupported.map((n) => (
        <tr key={n.name}>
          <th scope="row" className={`${td} text-left font-medium`}>
            {n.name}
          </th>
          <td className={td}>
            <span className="font-medium">Not supported.</span> <span className="text-muted-foreground"><Inline text={n.note} /></span>
          </td>
        </tr>
      ))}
    </Table>
  );
}

/** "97 stable, 1 beta" — from the manifest. The example in this comment is the only part that can go stale. */
export function StatusSummary() {
  const parts = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${n} ${s}`);
  return <>{parts.join(", ")}</>;
}

/** "98" — from the manifest, for use inside a sentence. */
export function ComponentTotalInline() {
  return <>{componentTotal}</>;
}

/** "91" — how many components ship on one platform, from the manifest. */
export function PlatformCountInline({ platform }: { platform: Platform }) {
  return <>{platformCount(platform)}</>;
}

/** "Preview" — a platform's maturity, read from `platformDefinitions` rather than typed into the prose. */
export function PlatformMaturityInline({ platform }: { platform: Platform }) {
  const m = PLATFORM_DEFINITIONS[platform].maturity;
  return <>{m.charAt(0).toUpperCase() + m.slice(1)}</>;
}

/**
 * "React and Angular (preview) install from a package registry today. SwiftUI, … are real
 * implementations, compiled in CI, not yet distributed as packages."
 *
 * Maturity and distribution are separate axes and this renders the second one. Every native port is
 * `maturity: "stable"` and on no package registry, so a page that names the platforms from maturity alone
 * reads as five installable things. Derived in `platform-prose.ts`; both halves disappear on their own if
 * the native ports are ever published.
 */
export function PlatformAvailability() {
  return <>{availabilitySentence}</>;
}

/**
 * What is left for a rolling-out platform, by delivery wave — counted from the manifest's `platformGuidance`,
 * never typed in. A component classified as a native equivalent or a composition is not "remaining": there is
 * nothing to build, so it is reported separately rather than folded into a backlog number that then never
 * reaches zero.
 */
export function PlatformWaveTable({ platform }: { platform: Platform }) {
  const byWave = new Map<string, string[]>();
  let settled = 0;
  for (const [slug, c] of Object.entries(manifestComponents)) {
    const g = c.platformGuidance?.[platform];
    if (!g) continue;
    if (g.type !== "planned") { settled++; continue; }
    const wave = g.wave ?? "unassigned";
    byWave.set(wave, [...(byWave.get(wave) ?? []), slug]);
  }
  const ORDER = ["primitives", "inputs", "layout", "navigation", "overlays", "data", "advanced"];
  const rows = ORDER.filter((w) => byWave.has(w));
  const shipped = Object.values(manifestComponents).filter((c) => c.platforms.includes(platform)).length;

  return (
    <div className="my-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 font-medium">Wave</th>
            <th className="py-2 font-medium">Remaining</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((wave) => (
            <tr key={wave} className="border-b border-border/60">
              <td className="py-2 capitalize">{WAVE_TITLE[wave] ?? wave}</td>
              <td className="py-2 font-mono text-muted-foreground">{byWave.get(wave)!.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-sm text-muted-foreground">
        {shipped} shipped. {settled} more need no port at all — they are a native equivalent or a composition
        on {PLATFORM_DEFINITIONS[platform].label}, and each says so on its own page.
      </p>
    </div>
  );
}

const WAVE_TITLE: Record<string, string> = {
  primitives: "Primitives",
  inputs: "Inputs and forms",
  layout: "Layout",
  navigation: "Navigation",
  overlays: "Overlays",
  data: "Data display",
  advanced: "Advanced interaction",
};

/**
 * The components a platform actually ships, as links to their docs — derived from the manifest, so a page that
 * lists "what Angular has today" cannot drift from what Angular has today.
 */
export function PlatformComponentList({ platform }: { platform: Platform }) {
  const slugs = Object.entries(manifestComponents)
    .filter(([, c]) => c.platforms.includes(platform))
    .map(([slug]) => slug)
    .sort();
  return (
    <ul className="my-4 flex flex-wrap gap-2 p-0" aria-label={`Components available for ${platform}`}>
      {slugs.map((slug) => (
        <li key={slug} className="list-none">
          <a
            href={`/docs/components/${slug}`}
            className="inline-block rounded-md border border-border px-2 py-1 font-mono text-xs text-foreground no-underline hover:bg-muted"
          >
            {componentName(slug)}
          </a>
        </li>
      ))}
    </ul>
  );
}

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/** "seven" — how many standing non-ports the manifest has (see `nonPorts`). */
export function NonPortCountInline() {
  return <>{WORDS[nonPorts.length] ?? nonPorts.length}</>;
}

/** `Form`, `NavigationMenu`, … — the standing non-ports by their component names, from the manifest. */
export function NonPortNamesInline() {
  const names = nonPorts.map(componentName);
  return (
    <>
      {names.map((n, i) => (
        <React.Fragment key={n}>
          {i > 0 ? (i === names.length - 1 ? ", and " : ", ") : null}
          <Code>{n}</Code>
        </React.Fragment>
      ))}
    </>
  );
}

/** "navigation-menu" → "NavigationMenu". */
export const componentName = (slug: string) =>
  slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
