import * as React from "react";
import Link from "next/link";
import { durations, easings, elevation, motionRoles, platformUnits, radiusRoles, radiusScale, spacingScale } from "@/lib/foundations";
import manifest from "../../../../components.manifest.json";
import {
  CATALOGUE_VERIFICATION,
  EVIDENCE_KINDS,
  PLATFORMS,
  PLATFORM_DEFINITIONS,
  VERIFICATION_COUNTS,
  VERIFICATION_REQUIRES,
  evidenceStatus,
  type EvidenceKind,
  type Platform,
} from "@/lib/platform-parity";
import { componentTotal, gaps, nonPorts, notSupported, platformCount, platforms, statusCounts } from "@/lib/platform-support";
import { availabilitySentence } from "@/lib/platform-prose";
import { siteConfig } from "@/lib/site";

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
              <th key={h} scope="col" className="px-4 py-2 font-mono text-label-md uppercase tracking-[0.1em] text-muted-foreground">
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
  <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.875em] text-foreground">{children}</code>
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

const codeList = (names: string[]) =>
  names.map((n, i) => (
    <React.Fragment key={n}>
      {i ? " / " : ""}
      <span className="whitespace-nowrap">
        <Code>{n}</Code>
      </span>
    </React.Fragment>
  ));

/** Roles from tokens/contracts/motion.json; the status column is what check:motion-tokens enforces. */
export function MotionRolesTable() {
  return (
    <Table label="Motion roles" head={["Role", "Duration", "Easing", "Reduced motion", "Status", "Where"]}>
      {motionRoles.map((r) => (
        <tr key={r.name}>
          <th scope="row" className={`${td} text-left font-medium`}>
            {r.name}
          </th>
          <td className={td}>{r.duration.length ? codeList(r.duration) : "own period"}</td>
          <td className={td}>{r.easing.length ? codeList(r.easing) : "own curve"}</td>
          <td className={`${td} text-muted-foreground`}>{r.reducedForm}</td>
          <td className={td}>{r.status}</td>
          <td className={`${td} text-muted-foreground`}>
            {r.platforms.join(", ") || r.scope || "—"}
            {r.deviations.length ? ` (differs on ${r.deviations.join(", ")})` : ""}
          </td>
        </tr>
      ))}
    </Table>
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
  const field = "text-label-md font-mono uppercase tracking-[0.1em] text-muted-foreground";
  return (
    <ul aria-label="Supported platforms" className="my-6 grid list-none gap-4 p-0">
      {platforms.map((p) => {
        // maturity comes from platformDefinitions, keyed by the row's platform id — never a second label here
        const key = (Object.keys(PLATFORM_DEFINITIONS) as Platform[]).find((k) => k.toLowerCase() === p.id);
        const maturity = key ? PLATFORM_DEFINITIONS[key].maturity : undefined;
        return (
          <li key={p.id} className="min-w-0 rounded-lg border border-border">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-muted/30 px-4 py-3">
              {/* a flex row, so the maturity tag can drop under the name at 200% text: there is no space between
                  them for a line break, and together they were 8px wider than a 320px card */}
              <p className="m-0 flex flex-wrap items-center gap-x-2 text-base font-medium">
                {p.name}
                {maturity && maturity !== "stable" && (
                  <span className="rounded-[3px] border border-border px-1 font-mono text-label-md uppercase tracking-wider text-muted-foreground">
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
                  {/* each named workflow links to its run history, so the claim beside it can be checked */}
                  <span className="mt-1 flex flex-wrap gap-x-2 font-mono text-body-sm text-muted-foreground">
                    {p.workflow.split(/,\s*/).map((file) => (
                      <a
                        key={file}
                        href={`${siteConfig.repo}/actions/workflows/${file}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline underline-offset-2"
                      >
                        {file} <span className="sr-only">runs</span>
                      </a>
                    ))}
                  </span>
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

/** The verification cards name the metric as evidence, not as the capability ("Accessibility verification"). */
const EVIDENCE_ROW_LABEL: Record<EvidenceKind, string> = {
  build: "Build verification",
  interaction: "Interaction verification",
  accessibility: "Accessibility verification",
  rtl: "RTL verification",
  largeText: "Large-text verification",
  visual: "Visual verification",
  published: "Published",
};

/**
 * Per-platform verification summary: what the package promises, and separately what the tests prove.
 *
 * Every evidence row is a fraction, never a tick. "Interaction 21 / 98" and a green check are different
 * claims, and only one of them is true — a tick beside a partially covered catalogue is the single most
 * misleading thing this page could print. Each row leads with the evidence state in words ("Not yet verified",
 * "Limited evidence", "Partial", "Verified"; see `evidenceStatus`), because "0 / 90" or "1 / 90" alone reads as a
 * measured failure of the platform rather than as how much a test has recorded.
 */
export function PlatformVerificationTable() {
  return (
    <div className="my-6 grid gap-4 sm:grid-cols-2">
      {PLATFORMS.map((platform) => {
        const def = PLATFORM_DEFINITIONS[platform];
        const total = platformCount(platform);
        const rungs = VERIFICATION_COUNTS[platform] ?? {};
        return (
          // min-w-0 and wrapping rows: a grid item sized by its widest unbroken row pushed the page sideways at 200%
          // text; each label/value pair now wraps onto two lines instead of the card growing past the viewport
          <section key={platform} className="min-w-0 rounded-lg border border-border p-4">
            <h3 className="font-mono text-sm text-foreground">{def.label}</h3>
            <dl className="mt-2 space-y-1 font-mono text-body-sm">
              <div className="flex flex-wrap justify-between gap-x-3">
                <dt className="text-muted-foreground">Implementations</dt>
                <dd className="tabular-nums">
                  {total} of {componentTotal}
                  {def.catalogComplete ? " · catalogue complete" : " · catalogue incomplete"}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-3">
                <dt className="text-muted-foreground">Package maturity</dt>
                <dd className="capitalize">{def.maturity}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-3">
                <dt className="text-muted-foreground">Distribution</dt>
                <dd>{def.distribution.published ? def.distribution.channel : `${def.distribution.channel} — not published`}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-3">
                <dt className="text-muted-foreground">Catalogue verification</dt>
                <dd className="capitalize text-foreground">{CATALOGUE_VERIFICATION[platform] ?? "—"}</dd>
              </div>
            </dl>
            <p className="mt-3 font-mono text-label-md uppercase tracking-[0.12em] text-muted-foreground">Evidence</p>
            <dl className="mt-1 grid gap-y-1 font-mono text-body-sm">
              {EVIDENCE_KINDS.map((kind) => {
                const e = evidenceStatus(platform, kind);
                // the evidence state in words, the count as secondary detail, and the sentence: shown where there is
                // no fraction worth reading ("Not yet verified", "Limited evidence"), heard by assistive technology
                // everywhere. "0 / 90" or "1 / 90" alone reads as a failed score; the generator never records failures
                return (
                  <div key={kind} data-evidence-state={e.state} className="flex flex-wrap justify-between gap-x-3">
                    <dt className="text-muted-foreground">{EVIDENCE_ROW_LABEL[kind]}</dt>
                    <dd>
                      {e.label}
                      {e.count > 0 ? (
                        <span aria-hidden="true" className="ms-1.5 tabular-nums text-muted-foreground">
                          {e.count} / {e.of}
                        </span>
                      ) : null}
                    </dd>
                    <dd className={e.meter ? "sr-only" : "basis-full font-sans text-label-md text-muted-foreground"}>{e.summary}</dd>
                  </div>
                );
              })}
            </dl>
            <p className="mt-3 text-body-sm text-muted-foreground">
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
        // max-w-full + overflow-wrap: at 200% text on a 320px phone a long name ("NotificationCenter") is wider than
        // the page; it wraps inside its chip instead of scrolling the page sideways
        <li key={slug} className="max-w-full list-none">
          <a
            href={`/docs/components/${slug}`}
            className="inline-block max-w-full rounded-md border border-border px-2 py-1 font-mono text-xs text-foreground no-underline [overflow-wrap:anywhere] hover:bg-muted"
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

/** "`dimens.xml` and …" → the backticked spans as <code>, the way the /docs/platforms table renders the same rows. */
const withCode = (text: string) => text.split("`").map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part));

/** Where each platform page's own first-run section starts (its first `##`, slugged by rehype-slug). */
const FIRST_STEP: Partial<Record<Platform, string>> = { Angular: "#install", SwiftUI: "#setup", Compose: "#setup", Flutter: "#setup" };

/**
 * The seven facts an evaluator needs before reading a platform page, in one place at its top: package maturity,
 * distribution, catalogue coverage, what is not implemented, verification evidence, the token model and where to
 * start. Every value is read from the manifest, the generated verification counts or the /docs/platforms rows, so
 * the four platform pages differ exactly where the platforms do and cannot drift from the coverage table.
 */
export function PlatformAtAGlance({ platform }: { platform: Platform }) {
  const def = PLATFORM_DEFINITIONS[platform];
  const row = platforms.find((r) => r.id === platform.toLowerCase());
  const shipped = platformCount(platform);
  const missing = componentTotal - shipped;
  // a kind no test records yet, or only a handful do, says so in words; "Interaction 0/90" reads as a failed score
  const kinds = (["interaction", "accessibility", "rtl", "largeText"] as const).map((k) => {
    const e = evidenceStatus(platform, k);
    return e.meter ? `${EVIDENCE_LABEL[k]} ${e.count}/${e.of}` : `${EVIDENCE_LABEL[k]} ${e.label.toLowerCase()}${e.count ? ` (${e.count}/${e.of})` : ""}`;
  });
  const level = CATALOGUE_VERIFICATION[platform];
  const link = "text-primary underline underline-offset-2";
  return (
    <dl aria-label={`${def.label} at a glance`} data-platform-glance={platform} className="my-6 divide-y divide-border rounded-lg border border-border bg-muted/20 text-sm">
      {[
        ["Package", <><code>{def.package}</code> · {def.maturity} package</>],
        [
          "Distribution",
          def.distribution.published ? (
            <>On {def.distribution.channel}.</>
          ) : (
            <>Not on {def.distribution.channel} yet: build it from a repository checkout pinned to a commit.</>
          ),
        ],
        [
          "Catalogue",
          <>
            {shipped} of {componentTotal} catalogue entries.{" "}
            <Link href="/components" className={link}>Browse components</Link>
          </>,
        ],
        [
          "Not implemented",
          missing === 0 ? (
            <>Nothing in the catalogue.</>
          ) : (
            <>
              {missing} entries, each with its reason on{" "}
              <Link href="/docs/platforms#not-on-every-platform-on-purpose" className={link}>platform coverage</Link>.
            </>
          ),
        ],
        [
          "Verification",
          <>
            {level ? <>Catalogue verified to <strong className="font-medium">{level}</strong> (the weakest component sets it). </> : null}
            Components with test evidence: {kinds.join(" · ")}.{row ? <> CI: <code>{row.workflow}</code>.</> : null}
          </>,
        ],
        [
          "Tokens",
          <>
            {withCode(row?.tokens ?? "Generated from the canonical token source.")}{" "}
            <Link href="/docs/tokens" className={link}>How tokens reach {def.label}</Link>
          </>,
        ],
        ...(FIRST_STEP[platform] ? [["Start", <a key="start" href={FIRST_STEP[platform]} className={link}>{platform === "Angular" ? "Install" : "Set up"} {def.label}</a>] as const] : []),
      ].map(([label, value]) => (
        <div key={label as string} className="flex flex-wrap items-baseline gap-x-3 px-3.5 py-2">
          <dt className="font-mono text-label-md uppercase tracking-[0.14em] text-muted-foreground sm:w-28 sm:shrink-0">{label}</dt>
          <dd className="min-w-0 sm:flex-1 sm:basis-0">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
