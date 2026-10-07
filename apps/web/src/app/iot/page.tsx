import type * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { KINETIX_PAIRING_FAILURES, KINETIX_PAIRING_METHODS, KINETIX_PAIRING_STAGES } from "@kinetixui/iot/functions";
import { BatteryIndicator, DeviceStatusBadge, LastSync, SensorReading, SignalStrength } from "@kinetixui/iot/react";
import { Button } from "@kinetixui/ui";
import { CodeSample } from "@/components/iot/code-sample";
import { DeviceShowcase } from "@/components/iot/device-showcase";
import { InstallCommand } from "@/components/iot/install-command";
import { IotExample } from "@/components/iot/iot-example";
import { HeroCommandStrip } from "@/components/iot/lab/hero-command-strip";
import { LiveControlPanel } from "@/components/iot/lab/live-control-panel";
import { LabSection } from "@/components/iot/lab/lab-section";
import { LabTabs } from "@/components/iot/lab/lab-tabs";
import { ENVIRONMENT_ICONS } from "@/components/iot/lab/environment-icons";
import { CategoryExplorer, MoreExamples } from "@/components/iot/lab/category-explorer";
import { ModuleBoundary } from "@/components/iot/module-boundary";
import { Reveal } from "@/components/reveal";
import { ctaAttrs } from "@/lib/analytics-surfaces";
import {
  IOT_CATALOGUE,
  IOT_CATEGORIES,
  IOT_ENTRY_POINTS,
  IOT_ENVIRONMENTS,
  IOT_MATURITY_LABEL,
  IOT_PACKAGE,
  IOT_PAGE_EXAMPLES,
  IOT_PART_LAYER,
  IOT_REACT_OPTIONAL,
  IOT_REACT_PEER,
  IOT_VERSION,
  type IotCategoryId,
} from "@/lib/iot";
import { canonical } from "@/lib/seo";

/**
 * /iot — the Connected Product Lab. `/docs/iot` stays the reference.
 *
 * The page is a hierarchy, not a waterfall: an overview (the hero and the three reference environments), then
 * "Explore by task", where one category is on screen at a time behind a category bar that stays in reach, then one
 * device in depth, then the technical proof (architecture, what ships, accessibility, install, roadmap). Each
 * category states its problem and state model before it shows parts or an example, and keeps secondary examples
 * behind a disclosure. The page teaches, demonstrates and routes; `/docs/iot` answers how.
 *
 * Every claim on this page is either derived from `packages/iot/package.json` (version, entry points, the React
 * peer), counted from the React barrel by `current-truth.test.ts` (`IOT_CATALOGUE`), or asserted there. The
 * thing it must never become is a capability list that grew past the package: there is no transport, no
 * automation engine, no video and no native port, and the page says so as prominently as it says what exists.
 *
 * **Client boundaries.** The page itself is a server component. Interactive code is limited to: the hero's
 * single-device command strip; `CategoryExplorer` and `MoreExamples`; `LabTabs` (each mounting only its active
 * panel); the examples, which bring their own boundaries; and `DeviceShowcase`. Nothing here imports the simulation into the hero.
 */

const NOW = "2026-01-01T12:00:00.000Z";
const FIVE_MINUTES_AGO = new Date(Date.parse(NOW) - 5 * 60_000).toISOString();

export const metadata: Metadata = {
  title: "IoT — Connected Product Lab",
  description:
    "Controls, telemetry, pairing and automation patterns for real asynchronous hardware. KinetixUI IoT is a React-only, experimental module that draws what a device confirmed differently from what a user requested. It ships no transport, no automation engine and no video; every demo on this page is simulated.",
  ...canonical("/iot"),
  openGraph: {
    title: "KinetixUI IoT — Build connected products that tell the truth about device state",
    description:
      "Controls, telemetry, pairing and automation patterns for real asynchronous hardware. React-only and experimental, with no transport and no automation engine.",
    url: "/iot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KinetixUI IoT — Build connected products that tell the truth about device state",
    description:
      "Controls, telemetry, pairing and automation patterns for real asynchronous hardware. React-only and experimental, with no transport and no automation engine.",
  },
};

/** The on-page contents, in section order. Ids match the `LabSection` ids below. */
const CONTENTS: readonly { id: string; label: string }[] = [
  { id: "environments", label: "Environments" },
  { id: "explore", label: "Explore by task" },
  { id: "device-detail", label: "One device" },
  { id: "architecture", label: "Architecture" },
  { id: "ships", label: "What ships" },
  { id: "accessibility", label: "Accessibility and RTL" },
  { id: "install", label: "Install" },
  { id: "roadmap", label: "Roadmap" },
];

const category = (id: IotCategoryId) => IOT_CATEGORIES.find((c) => c.id === id)!;
const categoryLabel = (id: IotCategoryId) => category(id).tab;
const categoryAliases = (id: IotCategoryId) => category(id).aliases;
const layoutSlug = (id: string) => IOT_PAGE_EXAMPLES.layouts.find((l) => l.id === id)!.slug;
const layoutTab = (id: string) => {
  const layout = IOT_PAGE_EXAMPLES.layouts.find((l) => l.id === id)!;
  return { id: layout.id, label: layout.label, preload: layout.slug, panel: <IotExample slug={layout.slug} /> };
};

/**
 * One category of the explorer, always in the same order: the problem, the state model, the parts, one focused
 * example, then anything secondary behind a disclosure, then the way to the reference. The order is the point:
 * a reader learns what the thing is for before being shown how many pieces it has.
 */
function CategoryPanel({
  id,
  title,
  problem,
  model,
  example,
  more,
}: {
  id: IotCategoryId;
  title: React.ReactNode;
  problem: React.ReactNode;
  model?: React.ReactNode;
  example: React.ReactNode;
  more?: React.ReactNode;
}) {
  const { label, parts, docs } = category(id);
  const layers = (["control", "primitive", "pattern"] as const)
    .map((layer) => ({ layer, names: parts.filter((name) => (IOT_PART_LAYER[name] ?? "pattern") === layer) }))
    .filter((group) => group.names.length > 0);
  return (
    <div className="grid gap-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-16">
        <div className="min-w-0">
          <p className="eyebrow">{label}</p>
          <h3 className="mt-3 max-w-2xl text-balance font-display text-2xl font-semibold tracking-[-0.02em] md:text-3xl">
            {title}
          </h3>
          <div className="mt-4 grid max-w-2xl gap-4 text-muted-foreground">{problem}</div>
        </div>
        <aside aria-label={`${label}: parts`} className="min-w-0 rounded-xl border border-border bg-card p-5">
          <h4 className="text-sm font-semibold text-foreground">Parts</h4>
          <dl className="mt-3 grid gap-3">
            {layers.map((group) => (
              <div key={group.layer}>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group.layer === "control" ? "Controls" : group.layer === "primitive" ? "Primitives" : "Patterns"}
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {group.names.map((name) => (
                    <code key={name} className="break-all rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                      {name}
                    </code>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
          <Link href={docs} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-4">
            Props and behaviour in the reference <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
          </Link>
        </aside>
      </div>
      {model ? (
        <div className="min-w-0">
          <h4 className="font-display text-lg font-semibold">The state model</h4>
          <div className="mt-4">{model}</div>
        </div>
      ) : null}
      <div className="min-w-0">
        <h4 className="font-display text-lg font-semibold">Try it</h4>
        <div className="mt-4">{example}</div>
      </div>
      {more}
    </div>
  );
}

/**
 * Three across when each card gets 14rem, otherwise fewer. In rem, so the breakpoint follows the reader's text size:
 * at 768px and 200% text a third of the row cannot hold "Operations" at heading size, and a fixed `md:` three-column
 * grid pushed the page sideways there.
 */
const ENVIRONMENT_GRID = "grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))]";

/**
 * The three questions every reference environment asks of a device, whatever it calls its places. They are the
 * reason the package is not a smart-home kit, so the Environments section leads with them.
 */
const ENVIRONMENT_QUESTIONS: readonly { question: string; answer: string }[] = [
  { question: "What did I ask for?", answer: "A request is drawn and announced as a request until the device confirms it." },
  { question: "What did the device confirm?", answer: "The reported state stays authoritative, and the last known value is labelled as last known." },
  { question: "How much should I trust this number?", answer: "Readings carry their age, a missing value is never zero, and simulated data says so." },
];

/** The framework-independent layer, by the product question each group answers. */
const SEMANTIC_GROUPS: readonly { title: string; body: string }[] = [
  { title: "Device state", body: "Status, health and connectivity kept apart, and a normaliser for whatever spelling a backend sends." },
  { title: "Command lifecycle", body: "Requested, acknowledged, confirmed, timed out, unreachable, retrying — a machine that refuses an illegal step." },
  { title: "Telemetry", body: "A metric registry, thresholds, staleness, gaps, and the sentence a screen reader gets for a series." },
  { title: "Alerts and activity", body: "Severity, acknowledgement, and the reduction a list needs: which of forty devices is asking for help." },
  { title: "Automation rules", body: "A rule model with validation and a plain-language summary. It describes a rule; nothing evaluates one." },
  { title: "Pairing", body: "Stages, methods and a failure registry with recovery actions. No discovery and no connection." },
  { title: "Places", body: "A space tree with a health rollup, for a home, a farm or a factory without hard-coding any of them." },
  { title: "Battery, signal, firmware, energy", body: "Bands and comparisons that keep “not reported” apart from a number." },
];

/** The four places a convenient default would become a lie about someone's hardware. */
const UNKNOWNS: readonly { fact: string; misleading: string; accurate: React.ReactNode }[] = [
  { fact: "The device reports no battery", misleading: "Battery 0%", accurate: <BatteryIndicator value={null} /> },
  { fact: "The device reports no signal", misleading: "No signal", accurate: <SignalStrength value={null} /> },
  { fact: "The reading has no timestamp", misleading: "Just now", accurate: <LastSync value={null} now={NOW} /> },
  {
    fact: "The sensor did not answer",
    misleading: "0 °C",
    accurate: <SensorReading metric="Temperature" value={null} quality="missing" />,
  },
];

/** One step of the command story, said in words. The order is the lifecycle machine's. */
const COMMAND_STORY: readonly { word: string; body: string }[] = [
  { word: "Off", body: "The device last confirmed it is off. That is the only thing the switch may claim." },
  { word: "Turning on", body: "You asked. The track moves so the press feels received; the knob stays hollow and the label does not say “On”." },
  { word: "Timed out", body: "No confirmation arrived inside the window. The screen says so, and still shows what the device last reported." },
  { word: "Unreachable", body: "The device did not answer at all. A different sentence from a timeout, because the next step differs." },
  { word: "Retry", body: "A new attempt, counted and bounded, that begins again from “requested” rather than pretending the first one worked." },
];

/**
 * The roadmap is three groups, and only the first is in the module. The other two are marked so they cannot be
 * read as a schedule: nothing here has a date, and nothing here promises a platform. `current-truth.test.ts`
 * keeps the two unshipped groups out of the "shipped" checks by their `state`.
 */
const ROADMAP: readonly { when: string; state: "shipped" | "excluded" | "deferred"; items: readonly string[] }[] = [
  {
    when: "In the module",
    state: "shipped",
    items: [
      `${IOT_CATALOGUE.primitives} primitives, ${IOT_CATALOGUE.controls} controls and ${IOT_CATALOGUE.patterns} patterns for React`,
      "Models and pure functions for device state, commands, telemetry, alerts, automation rules, pairing and places",
      "Three reference environments on this page, as source to copy",
      "Status that is a glyph and a word, never colour alone",
    ],
  },
  {
    when: "Not in the module, by design",
    state: "excluded",
    items: [
      "A transport of any kind: no protocol client, no discovery, no vendor adapter",
      "An automation engine: rules are edited here and run by your application",
      "Video: a camera card is a poster and a state, never a feed",
      "Any implementation outside React",
    ],
  },
  {
    when: "Deferred, not scheduled",
    state: "deferred",
    items: [
      "A grouped or scheduled command queue, which needs a real product's requirements before it is modelled",
    ],
  },
];

export default function IotPage() {
  return (
    <div className="flex flex-col">
      {/* ─── hero ──────────────────────────────────────────────────────── */}
      <section aria-labelledby="iot-title" className="relative overflow-hidden border-b border-border">
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          {/* The single mobile track is `minmax(0,1fr)`, not the implicit `auto`. A grid item defaults to
              `min-width: auto`, so an `auto` track grows to its widest child's min-content width: while a
              command was in flight the strip's lifecycle row pushed this grid to 429px inside a 358px box and
              shoved the whole hero 55px past a 390px viewport. `documentElement.scrollWidth` never grew, so
              the overflow was invisible to automation and only showed up on a real phone. */}
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
            <div>
              <p className="eyebrow">Connected Product Lab</p>
              <h1
                id="iot-title"
                className="mt-4 max-w-2xl text-balance font-display text-4xl font-bold tracking-[-0.02em] md:text-5xl"
              >
                Build connected products that tell the truth about device state.
              </h1>
              <p className="mt-5 max-w-xl text-muted-foreground md:text-lg">
                Controls, telemetry, pairing and automation patterns for real asynchronous hardware. A switch that
                has been pressed is a request. It becomes a state when the device says so.
              </p>

              <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                {IOT_MATURITY_LABEL}
              </p>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                React only, and experimental: the API may still change. There is no transport, no automation engine
                and no video. Everything interactive on this page is simulation, which is demo state and nothing
                else.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="whitespace-normal">
                  <Link href="/docs/iot" {...ctaAttrs("iot_page", "read_docs")}>
                    Explore IoT <ArrowUpRight className="size-4" />
                  </Link>
                </Button>
                <div className="min-w-0 sm:max-w-xs sm:flex-1">
                  <InstallCommand command={`pnpm add ${IOT_PACKAGE}`} />
                </div>
              </div>
            </div>

            <HeroCommandStrip />
          </div>

          <nav aria-label="On this page" className="mt-12 border-t border-border pt-4">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {CONTENTS.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      {/* ─── environments ──────────────────────────────────────────────── */}
      {/* The section answers one question, why the package applies beyond a home, and answers it before the reader
          reaches the explorer: the three questions every environment shares, then the three environments side by
          side, each named by the place hierarchy it uses. Operating one is opt-in, behind a disclosure, because a
          whole environment is several screens of product and the point is made without it. */}
      <LabSection
        id="environments"
        index="01"
        label="Reference environments"
        meta="simulation"
        tone="muted"
        title="Three products, one interaction model."
        lede={
          <p>
            A home, a farm and a production line name their places differently and want different controls. They
            still ask the same three questions of every device, and the same components answer them.
          </p>
        }
      >
        {/* `minmax(0,1fr)`, not the implicit `auto` track: an `auto` track grows to its widest child's min-content,
            and an opened environment is wide, which stretched the cards above it past a 390px screen. */}
        <Reveal className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-8">
          <ol aria-label="The questions every environment asks" className={ENVIRONMENT_GRID}>
            {ENVIRONMENT_QUESTIONS.map((q, i) => (
              <li key={q.question} className="min-w-0 rounded-xl border border-border bg-card p-4">
                <span aria-hidden className="font-mono text-[11px] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-1 font-display text-base font-semibold">{q.question}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{q.answer}</p>
              </li>
            ))}
          </ol>

          <ul aria-label="Reference environments" className={ENVIRONMENT_GRID}>
            {IOT_ENVIRONMENTS.map((env) => (
              <li key={env.id} className="min-w-0 rounded-xl bg-card p-5 shadow-sm">
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <span className="text-primary">{ENVIRONMENT_ICONS[env.id]}</span>
                  {env.label}
                </h3>
                <p className="mt-2 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">
                  {env.hierarchy}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{env.summary}</p>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
            <p className="max-w-2xl text-sm text-muted-foreground">
              Each environment is fabricated and scripted in your browser. Nothing is measured, and no device is
              contacted.
            </p>
            <MoreExamples summary="Operate an environment" tabIds={IOT_ENVIRONMENTS.map((env) => env.id)} flush>
              <LabTabs
                label="Reference environment"
                tabs={IOT_ENVIRONMENTS.map((env) => ({
                  id: env.id,
                  label: env.label,
                  meta: env.hierarchy,
                  preload: env.slug,
                  panel: <IotExample slug={env.slug} />,
                }))}
              />
            </MoreExamples>
          </div>
        </Reveal>
      </LabSection>

      {/* ─── explore by task ──────────────────────────────────────────── */}
      <LabSection
        id="explore"
        index="02"
        label="Explore by task"
        title="Pick the job you are building for."
        lede={
          <p>
            Six groups, covering every component the package exports. Each starts with the problem it solves and the
            state model behind it, then lets you operate one focused example. The category bar stays in reach while
            you read.
          </p>
        }
      >
        <div className="mt-10">
          <CategoryExplorer
            label="IoT category"
            categories={[
              {
                id: "control",
                label: categoryLabel("control"),
                aliases: categoryAliases("control"),
                panel: (
                  <CategoryPanel
                    id="control"
                    title="A request is not a state."
                    problem={
                      <>
                        <p>
                          Almost every device UI fills the gap between <em>asked</em> and <em>confirmed</em> with an
                          optimistic update: the switch slides, the icon lights, and the screen asserts a state the
                          device has not reported. On a lamp that is harmless. On a lock, a valve or a pump it is a lie
                          the user finds out about later.
                        </p>
                        <p>
                          Every control draws the request differently from the confirmed state, in the picture and in the
                          accessible name, and one function decides what &ldquo;pending&rdquo; means so the controls on
                          a screen cannot disagree.
                        </p>
                      </>
                    }
                    model={
                      <ol aria-label="One command, told honestly" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {COMMAND_STORY.map((step, i) => (
                          <li key={step.word} className="rounded-xl border border-border bg-card p-4">
                            <span aria-hidden className="font-mono text-[11px] text-muted-foreground">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <p className="mt-1 font-display text-base font-semibold">{step.word}</p>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                          </li>
                        ))}
                      </ol>
                    }
                    example={
                      <>
                        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                          Every change below is a request first. The dashed treatment is what the device has not agreed
                          to yet, and it disappears when the (scripted) device confirms. Nothing here is connected to
                          anything.
                        </p>
                        <div className="mt-5">
                          <LiveControlPanel />
                        </div>
                      </>
                    }
                    more={
                      <MoreExamples summary="See a reliable, a flaky and an unreachable device side by side">
                        <IotExample slug={IOT_PAGE_EXAMPLES.stateHonesty} />
                      </MoreExamples>
                    }
                  />
                ),
              },
              {
                id: "monitoring",
                label: categoryLabel("monitoring"),
                aliases: categoryAliases("monitoring"),
                panel: (
                  <CategoryPanel
                    id="monitoring"
                    title="A reading is a value, a time, and how much to trust it."
                    problem={
                      <>
                        <p>
                          Connection, battery, freshness and the value itself are separate questions, and none is
                          derived from another: an online device can send a stale reading, and an offline one can have
                          a battery level you last heard an hour ago. A gap in a series is drawn as a gap, because a
                          straight line across it claims the sensor was answering.
                        </p>
                        <p>
                          A device that does not report a battery is not a device with a flat one, so
                          <code className="mx-1 text-foreground">unknown</code> is a first-class result rather than a
                          fallback.
                        </p>
                      </>
                    }
                    model={
                      <>
        {/* Scrollable, not clipped, and reachable by keyboard: `tabindex=0` plus a name is the part a bare
            `overflow-x-auto` leaves out. */}
        <Reveal>
          <div
            role="region"
            aria-label="Missing device data, compared"
            tabIndex={0}
            className="overflow-x-auto rounded-xl border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <table className="w-full min-w-[22rem] text-sm">
              <caption className="sr-only">
                What the interface shows when device data is missing, compared with the misleading alternative
              </caption>
              <thead>
                <tr className="border-b border-border text-start">
                  <th scope="col" className="px-4 py-3 text-start font-medium text-muted-foreground">
                    The fact
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-medium text-muted-foreground">
                    Misleading
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-medium text-muted-foreground">
                    What KinetixUI IoT renders
                  </th>
                </tr>
              </thead>
              <tbody>
                {UNKNOWNS.map((u) => (
                  <tr key={u.fact} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-4 align-middle text-muted-foreground">{u.fact}</td>
                    <td className="px-4 py-4 align-middle">
                      <span className="text-muted-foreground line-through decoration-destructive/70">{u.misleading}</span>
                    </td>
                    <td className="px-4 py-4 align-middle">{u.accurate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
        <Reveal className="mt-4">
          <p className="max-w-2xl text-sm text-muted-foreground">
            This is a rule about presentation, not a data-quality guarantee: the module cannot tell you whether a
            reading is <em>correct</em>, only refuse to present an absent one as a measurement.
          </p>
        </Reveal>
                      </>
                    }
                    example={<IotExample slug={IOT_PAGE_EXAMPLES.telemetry} />}
                    more={
                      <MoreExamples summary="Try imperfect data yourself, or see a telemetry board" tabIds={["monitoring-playground", "layout-telemetry"]}>
                        <LabTabs
                          label="More monitoring examples"
                          variant="pills"
                          tabs={[
                            {
                              id: "monitoring-playground",
                              label: "Imperfect data",
                              summary:
                                "Set a battery nobody reported, drag a reading three days into the past, tell the sensor it errored.",
                              panel: <DeviceShowcase />,
                            },
                            layoutTab("layout-telemetry"),
                          ]}
                        />
                      </MoreExamples>
                    }
                  />
                ),
              },
              {
                id: "alerts",
                label: categoryLabel("alerts"),
                aliases: categoryAliases("alerts"),
                panel: (
                  <CategoryPanel
                    id="alerts"
                    title="Somebody has to own it."
                    problem={
                      <p>
                        Severity is a word and a glyph. An alert carries what raised it and what can be done, and an
                        acknowledged alert is still visible as acknowledged rather than removed. Activity records what
                        happened and who or what caused it, and says &ldquo;Source unknown&rdquo; rather than guessing.
                        Live-region announcements are rare on purpose.
                      </p>
                    }
                    example={<IotExample slug={IOT_PAGE_EXAMPLES.alerts} />}
                    more={
                      <MoreExamples summary="See the same alerts as an inbox" tabIds={["layout-inbox"]}>
                        <IotExample slug={layoutSlug("layout-inbox")} />
                      </MoreExamples>
                    }
                  />
                ),
              },
              {
                id: "automation",
                label: categoryLabel("automation"),
                aliases: categoryAliases("automation"),
                panel: (
                  <CategoryPanel
                    id="automation"
                    title="Edit a rule. Your application runs it."
                    problem={
                      <>
                        <p>
                          <code className="font-mono text-[0.9em] text-foreground">AutomationBuilder</code> is a
                          keyboard-operable form over a structured rule: a trigger, conditions, actions, and validation
                          with words. It produces a rule and reads one back as a sentence.
                        </p>
                        <p className="text-sm">
                          There is no automation engine here. Nothing evaluates a trigger, schedules a run or sends a
                          command. Where a demo shows an automation firing, the event is scripted and says so.
                        </p>
                      </>
                    }
                    example={<IotExample slug={IOT_PAGE_EXAMPLES.automation} />}
                  />
                ),
              },
              {
                id: "setup",
                label: categoryLabel("setup"),
                aliases: categoryAliases("setup"),
                panel: (
                  <CategoryPanel
                    id="setup"
                    title="Pairing is a product pattern, not a Bluetooth API."
                    problem={
                      <p>
                        {KINETIX_PAIRING_STAGES.length} stages, {KINETIX_PAIRING_METHODS.length} ways a person may be
                        asked to connect, and a registry of {Object.keys(KINETIX_PAIRING_FAILURES).length} ways it goes
                        wrong, each with what to say and what to offer next. It models the screen so it can be built and
                        reviewed before any transport exists. It discovers nothing and connects to nothing.
                      </p>
                    }
                    example={<IotExample slug={IOT_PAGE_EXAMPLES.pairing} />}
                  />
                ),
              },
              {
                id: "fleet",
                label: categoryLabel("fleet"),
                aliases: categoryAliases("fleet"),
                panel: (
                  <CategoryPanel
                    id="fleet"
                    title="Forty devices, one question: which one needs you?"
                    problem={
                      <p>
                        A fleet view sorts by attention, not by name, and gives every device exactly one bucket so the
                        counts add up. Places (a home, a farm, a production line) roll device health up the hierarchy
                        your product already uses, without the library naming any level. The controls in these layouts
                        change local demo state only.
                      </p>
                    }
                    example={<IotExample slug={layoutSlug("layout-fleet")} />}
                    more={
                      <MoreExamples
                        summary="Three more layouts: dashboard, connected space, troubleshooting"
                        tabIds={["layout-dashboard", "layout-space", "layout-troubleshooting"]}
                      >
                        <LabTabs
                          label="More fleet layouts"
                          variant="pills"
                          tabs={["layout-dashboard", "layout-space", "layout-troubleshooting"].map(layoutTab)}
                        />
                      </MoreExamples>
                    }
                  />
                ),
              },
            ]}
          />
        </div>
      </LabSection>

      {/* ─── device detail ─────────────────────────────────────────────── */}
      <LabSection
        id="device-detail"
        index="03"
        label="Device detail"
        tone="muted"
        title="One device, in depth."
        lede={
          <p>
            The flagship composition: a pump station with Overview, Controls, Telemetry, Automations, Activity and
            Settings, built entirely from the parts above. It is source you copy, not a component you install,
            because a screen layout is where your product&rsquo;s decisions live.
          </p>
        }
      >
        <Reveal className="mt-10">
          <IotExample slug={IOT_PAGE_EXAMPLES.deviceDetail} />
        </Reveal>
      </LabSection>

      {/* ─── architecture ──────────────────────────────────────────────── */}
      <LabSection
        id="architecture"
        index="04"
        label="Architecture"
        tone="muted"
        title="Bring your own connection."
        lede={
          <>
            <p>
              KinetixUI IoT starts <em>above</em> the transport. Your application receives device state through
              whatever it already uses, an adapter turns that into the module&rsquo;s shapes, and everything from
              there down is state, controls and patterns.
            </p>
            <p className="text-sm">
              The protocols in the diagram are examples of infrastructure your application might use. This module
              opens no connection, holds no credential and parses no device payload.
            </p>
            <p>
              <Link href="/docs/iot#transport-boundary" className="text-sm font-medium text-primary underline underline-offset-4">
                Read the transport boundary in the docs
              </Link>
            </p>
          </>
        }
      >
        <Reveal className="mt-10 max-w-3xl">
          <ModuleBoundary />
        </Reveal>
      </LabSection>

      {/* ─── what ships ────────────────────────────────────────────────── */}
      <LabSection
        id="ships"
        index="05"
        label="What ships"
        meta={IOT_VERSION}
        title="Two layers. The useful half has nothing to do with rendering."
        lede={
          <p>
            The package is {IOT_ENTRY_POINTS.length} entry points over one codebase. The functions half imports no
            React and touches no DOM, so it runs in a server route, a worker or a test. That is asserted against the
            source import graph and the built output, not promised.
          </p>
        }
      >
        <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal className="min-w-0">
            <h3 className="font-display text-xl font-semibold">Functions and models</h3>
            <CodeSample
              className="mt-6"
              language="ts"
              code={`import {
  classifyBatteryLevel,
  evaluateReading,
  normalizeDeviceStatus,
} from "${IOT_PACKAGE}/functions";

classifyBatteryLevel(72);        // "high"
normalizeDeviceStatus("ONLINE"); // "online"
evaluateReading({ value: null, metric: "temperature" }).state; // "unavailable"`}
            />
            <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {SEMANTIC_GROUPS.map((g) => (
                <div key={g.title}>
                  <dt className="text-sm font-medium text-foreground">{g.title}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{g.body}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal className="min-w-0">
            <h3 className="font-display text-xl font-semibold">React components</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Module components, not entries in the{" "}
              <Link href="/components" className="font-medium text-primary underline underline-offset-4">
                component catalogue
              </Link>
              . They are React only.
            </p>
            <dl className="mt-6 divide-y divide-border border-y border-border">
              {[
                { name: "Primitives", count: IOT_CATALOGUE.primitives, body: "One fact, rendered: a status, a connection, a battery, a signal, a timestamp, a reading, an identity." },
                { name: "Controls", count: IOT_CATALOGUE.controls, body: "One thing a user can change: power, level, setpoint, mode, colour, lock and media playback." },
                { name: "Patterns", count: IOT_CATALOGUE.patterns, body: "Compositions with a rule or two: cards, lists, telemetry, command feedback, alerts, activity, automation, pairing, places, energy and a camera that is never a feed." },
              ].map((row) => (
                <div key={row.name} className="flex items-baseline gap-4 py-4">
                  <dt className="w-24 shrink-0 font-display text-sm font-semibold">{row.name}</dt>
                  <dd className="min-w-0 flex-1">
                    <span className="font-mono text-sm text-foreground">{row.count}</span>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{row.body}</p>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-muted-foreground">
              Full props and behaviour are in the{" "}
              <Link href="/docs/iot" className="font-medium text-primary underline underline-offset-4">
                IoT documentation
              </Link>
              .
            </p>
          </Reveal>
        </div>
      </LabSection>

      {/* ─── accessibility and RTL ─────────────────────────────────────── */}
      <LabSection
        id="accessibility"
        index="06"
        label="Accessibility, RTL and motion"
        title="A green dot is not a device state."
      >
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <Reveal>
            <div className="grid max-w-xl gap-4 text-muted-foreground">
              <p>
                Device dashboards lean on colour harder than almost any other interface, and colour is the one
                channel that disappears in greyscale, in forced-colors mode and for a screen reader. Every state here
                is a glyph with its own silhouette and a word; colour is only ever a second encoding.
              </p>
              <p className="text-sm">
                Where a visual shorthand is used, such as a battery bar or <code className="text-foreground">5m ago</code>,
                the visual is hidden from assistive technology and the full sentence is the accessible name. Nothing is
                announced twice.
              </p>
              <h3 className="font-display text-base font-semibold text-foreground">Right-to-left</h3>
              <p className="text-sm">
                The components use logical properties (start and end, not left and right), so a right-to-left page
                mirrors without a second stylesheet. The power switch reverses its knob travel. Time-series plots keep
                a left-to-right time axis, and identifiers, code and units stay left-to-right inside right-to-left text.
              </p>
              <h3 className="font-display text-base font-semibold text-foreground">Motion</h3>
              <p className="text-sm">
                Motion uses Tailwind&rsquo;s own <code className="text-foreground">motion-reduce:</code> variant, so a
                reader who asks for reduced motion gets the static version, and no animation carries information that is
                not also written down. In the simulations, reduced motion stops ambient drift; a request you make still
                settles.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                What assistive technology receives
              </p>
              <dl className="mt-4 grid gap-3">
                {[
                  { el: <DeviceStatusBadge status="online" />, said: "Online" },
                  { el: <BatteryIndicator value={72} />, said: "Battery 72%, high" },
                  { el: <SignalStrength value={84} />, said: "Signal 84%, excellent" },
                  { el: <LastSync value={FIVE_MINUTES_AGO} now={NOW} />, said: "Last seen 5 minutes ago" },
                  {
                    el: <SensorReading metric="Temperature" value={23.4} unit="°C" precision={1} />,
                    said: "Temperature 23.4 °C",
                  },
                ].map((r) => (
                  <div
                    key={r.said}
                    className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-border pb-3 last:border-b-0 last:pb-0"
                  >
                    <dt className="flex items-center">{r.el}</dt>
                    <dd className="font-mono text-xs text-muted-foreground">{r.said}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Missing values are stated rather than implied: <span className="text-foreground">Battery level unknown</span>,{" "}
                <span className="text-foreground">Never seen</span>.
              </p>
            </div>
          </Reveal>
        </div>
      </LabSection>

      {/* ─── install ───────────────────────────────────────────────────── */}
      <LabSection
        id="install"
        index="07"
        label="Install"
        meta={IOT_PACKAGE}
        tone="muted"
        title={`One package, ${IOT_ENTRY_POINTS.length} entry points.`}
      >
        <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-12">
          <Reveal className="min-w-0">
            <InstallCommand command={`pnpm add ${IOT_PACKAGE}`} />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {IOT_REACT_OPTIONAL ? (
                <>
                  <code className="text-foreground">react</code> is an <strong className="font-medium text-foreground">optional</strong>{" "}
                  peer (<code className="text-foreground">{IOT_REACT_PEER}</code>). The components need it; the functions
                  and models need nothing at all, so a server-side or worker consumer can install this package on its own.
                </>
              ) : (
                <>
                  <code className="text-foreground">react</code> is a peer dependency (
                  <code className="text-foreground">{IOT_REACT_PEER}</code>).
                </>
              )}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The components style themselves with Tailwind utilities on the{" "}
              <Link href="/docs/tokens" className="font-medium text-primary underline underline-offset-4">
                token contract
              </Link>{" "}
              rather than importing a stylesheet, so an app needs the tokens loaded and this package inside its Tailwind{" "}
              <code className="text-foreground">content</code>. The functions subpath needs neither;{" "}
              <Link href="/docs/iot" className="font-medium text-primary underline underline-offset-4">
                the docs have the exact config
              </Link>
              .
            </p>
          </Reveal>

          <Reveal className="min-w-0">
            <CodeSample
              language="ts"
              code={`// models and pure functions — no React required
import { classifyBatteryLevel } from "${IOT_PACKAGE}/functions";

// the React components
import { DeviceStatusBadge } from "${IOT_PACKAGE}/react";

// or everything, from the root
import { SensorReading, formatLastSeen } from "${IOT_PACKAGE}";`}
            />
            <ul className="mt-4 grid gap-2">
              {IOT_ENTRY_POINTS.map((e) => (
                <li key={e.subpath} className="flex items-baseline gap-3 text-sm">
                  <code dir="ltr" className="font-mono text-xs text-foreground">
                    {e.specifier}
                  </code>
                  <span className="text-muted-foreground">
                    {e.subpath === "."
                      ? "everything"
                      : e.subpath === "./functions"
                        ? "models and pure functions, no React"
                        : "primitives, controls and patterns"}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </LabSection>

      {/* ─── roadmap ───────────────────────────────────────────────────── */}
      <LabSection
        id="roadmap"
        index="08"
        label="Roadmap"
        meta="no dates"
        title="What exists, what does not, and what is only open."
        lede={
          <p>
            Nothing outside the first column is scheduled. The second column is a set of decisions, not a backlog;
            the third is work that is deliberately waiting on something.
          </p>
        }
      >
        <Reveal className="mt-10 grid gap-6 [&>*]:min-w-0 md:grid-cols-[repeat(3,minmax(0,1fr))]">
          {ROADMAP.map((column) => (
            <div key={column.when} className="rounded-xl border border-border bg-card p-5">
              {/* Wraps: at 768px and 200% text a third of the row is narrower than the heading and its chip together. */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <h3 className="font-display text-sm font-semibold">{column.when}</h3>
                <span
                  className={
                    column.state === "shipped"
                      ? "rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                      : "rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                  }
                >
                  {column.state === "shipped" ? "In the module" : column.state === "excluded" ? "Excluded" : "Deferred"}
                </span>
              </div>
              <ul className="mt-3 grid gap-2">
                {column.items.map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                    <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-border" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Reveal>
      </LabSection>

      {/* ─── closer ────────────────────────────────────────────────────── */}
      <section aria-labelledby="next-title">
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
          <Reveal className="max-w-3xl">
            <h2 id="next-title" className="text-balance font-display text-3xl font-semibold tracking-[-0.02em] md:text-5xl">
              The reference, the models, and every prop.
            </h2>
            <p className="mt-5 max-w-xl text-muted-foreground md:text-lg">
              The documentation carries the type definitions, the command lifecycle, the metric and failure
              registries, the accessibility contract and the module&rsquo;s stated limits.
            </p>
            <div className="mt-8">
              {/* `whitespace-normal` at the call site, as on the homepage: Button is `whitespace-nowrap` by design, and
                  at 200% text this label is 363px inside a 358px column at 390px, which pushed the page sideways. */}
              <Button asChild size="lg" className="whitespace-normal">
                <Link href="/docs/iot" {...ctaAttrs("iot_page", "read_docs")}>
                  Read the IoT docs <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
