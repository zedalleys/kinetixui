import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  BatteryIndicator,
  DeviceStatusBadge,
  LastSync,
  SensorReading,
  SignalStrength,
} from "@kinetixui/iot/react";
import { Button } from "@kinetixui/ui";
import { CodeSample } from "@/components/iot/code-sample";
import { DeviceCard } from "@/components/iot/device-card";
import { DeviceShowcase } from "@/components/iot/device-showcase";
import { InstallCommand } from "@/components/iot/install-command";
import { ModuleBoundary } from "@/components/iot/module-boundary";
import { Reveal } from "@/components/reveal";
import { SectionHead } from "@/components/section-head";
import { ctaAttrs } from "@/lib/analytics-surfaces";
import {
  IOT_ENTRY_POINTS,
  IOT_MATURITY_LABEL,
  IOT_PACKAGE,
  IOT_REACT_OPTIONAL,
  IOT_REACT_PEER,
  IOT_VERSION,
} from "@/lib/iot";
import { canonical } from "@/lib/seo";

/**
 * /iot — the product story for the IoT module. `/docs/iot` stays the reference.
 *
 * The split is deliberate: this page is for someone who has not decided yet, so it answers what the module is,
 * what it ships, what it refuses to do, and what it looks like — with the real primitives, not screenshots. The
 * documentation answers how, and is linked from every section that has a counterpart there.
 *
 * Every claim on this page is either derived from `packages/iot/package.json` (version, entry points, the React
 * peer) or asserted in `current-truth.test.ts`. The one thing the page must never become is a capability list
 * that grew past the package: there is no transport here, no native port, and no blocks, and the sections below
 * say so as prominently as they say what does exist.
 */

const NOW = "2026-01-01T12:00:00.000Z";
const FIVE_MINUTES_AGO = new Date(Date.parse(NOW) - 5 * 60_000).toISOString();

export const metadata: Metadata = {
  title: "IoT",
  description:
    "KinetixUI IoT is a connected-device module for building products that pair, monitor, control and troubleshoot devices. Framework-independent models and functions for device status, battery, signal, telemetry and firmware, plus five accessible React primitives. Experimental.",
  ...canonical("/iot"),
  openGraph: {
    title: "KinetixUI IoT — Connected-device UI primitives",
    description:
      "Framework-independent connected-device models and functions, plus five accessible React primitives. Experimental.",
    url: "/iot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KinetixUI IoT — Connected-device UI primitives",
    description:
      "Framework-independent connected-device models and functions, plus five accessible React primitives. Experimental.",
  },
};

/** The framework-independent layer, by the product question each group answers. */
const SEMANTIC_GROUPS: readonly { title: string; body: string }[] = [
  { title: "Device status", body: "Nine presentation states, and a normaliser for whatever spelling a fleet backend sends." },
  { title: "Battery", body: "Bands rather than a bare percentage, because 23% means nothing without knowing whether this product considers that fine." },
  { title: "Signal", body: "A normalised 0–100 quality banded for display. Not dBm — that scale differs per radio." },
  { title: "Last seen", body: "Relative time in two forms: the shorthand a row shows, and the sentence a screen reader gets." },
  { title: "Telemetry", body: "A reading is a value, a unit, a time and a statement about how much to trust it." },
  { title: "Firmware", body: "Compare two version strings that are rarely semver, and say when they cannot be compared." },
  { title: "Pairing", body: "The states a pairing screen moves through, and local code-shape validation. No transport." },
  { title: "Commands", body: "A command's lifecycle — queued, sent, acknowledged, completed, failed, cancelled, expired." },
  { title: "Alerts", body: "Severity, and the reduction a fleet list needs: which of forty devices is the one asking for help." },
];

const PRIMITIVES: readonly { name: string; body: string; demo: React.ReactNode }[] = [
  {
    name: "DeviceStatusBadge",
    body: "A device's state, as a word. The dot is decoration; the text is the reading.",
    demo: <DeviceStatusBadge status="online" />,
  },
  {
    name: "BatteryIndicator",
    body: "A bar and a percentage, with the band spelled out in the accessible name.",
    demo: <BatteryIndicator value={72} />,
  },
  {
    name: "SignalStrength",
    body: "A bar meter — filled-bar count is shape, not colour, so it survives greyscale.",
    demo: <SignalStrength value={84} />,
  },
  {
    name: "LastSync",
    body: "A <time> element: shorthand visible, full sentence as the accessible name.",
    demo: <LastSync value={FIVE_MINUTES_AGO} now={NOW} />,
  },
  {
    name: "SensorReading",
    body: "Metric, value and unit — or the unknown label when the reading cannot be trusted.",
    demo: <SensorReading metric="Temperature" value={23.4} unit="°C" precision={1} />,
  },
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

const ROADMAP: readonly { when: string; state: "now" | "planned"; items: readonly string[] }[] = [
  {
    when: "Available now",
    state: "now",
    items: [
      "Device, telemetry, command, pairing, firmware and alert models",
      "Framework-independent functions for every one of them",
      "Five accessible React primitives",
      "Device state that never depends on colour alone",
    ],
  },
  {
    when: "Next",
    state: "planned",
    items: [
      "React blocks and patterns composed from the primitives",
      "Device overview and device detail",
      "Sensor dashboard",
      "Alert rules, command history, connection troubleshooting",
    ],
  },
  {
    when: "Later",
    state: "planned",
    items: [
      "Adapter contracts — a shape a transport can implement",
      "Native primitives for SwiftUI, Jetpack Compose and Flutter",
      "Optional protocol adapters (MQTT, BLE, HTTP polling, WebSocket)",
    ],
  },
];

export default function IotPage() {
  return (
    <div className="flex flex-col">
      {/* ─── hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
            <div>
              <p className="eyebrow">Module</p>
              <h1 className="mt-4 max-w-2xl text-balance font-display text-4xl font-bold tracking-[-0.02em] md:text-5xl">
                Connected-device UI primitives, without owning your device stack.
              </h1>
              <p className="mt-5 max-w-xl text-muted-foreground md:text-lg">
                KinetixUI IoT is a connected-device module for building products that pair, monitor, control and
                troubleshoot devices. It models what a device <em>is</em> — status, battery, signal, telemetry,
                firmware — so the layer that talks to one has something honest to render into.
              </p>

              <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                {IOT_MATURITY_LABEL}
              </p>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                Public and usable today. The API may still change before 1.0 — this is the first release of the
                module, not a finished surface.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Button asChild size="lg">
                  <Link href="/docs/iot" {...ctaAttrs("iot_page", "read_docs")}>
                    Explore IoT <ArrowUpRight className="size-4" />
                  </Link>
                </Button>
                <div className="min-w-0 sm:max-w-xs sm:flex-1">
                  <InstallCommand command={`pnpm add ${IOT_PACKAGE}`} />
                </div>
              </div>
            </div>

            <DeviceCard />
          </div>
        </div>
      </section>

      {/* ─── what ships today ──────────────────────────────────────────── */}
      <section className="border-b border-border bg-muted/20">
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <Reveal>
            <SectionHead index="01" label="What ships today" meta={IOT_VERSION} />
            <h2 className="mt-6 max-w-2xl text-balance font-display text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
              Two layers. The useful half has nothing to do with rendering.
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-16">
            {/* functions & models */}
            <Reveal className="min-w-0">
              <h3 className="font-display text-xl font-semibold">Functions and models</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                The product semantics of a connected device, as plain functions over plain types. This half
                imports no React and touches no DOM, so it runs in a server route, a worker, a queue consumer or
                a test with no renderer — asserted against both the source import graph and the published build,
                not promised.
              </p>
              <CodeSample
                className="mt-6"
                language="ts"
                code={`import {
  classifyBatteryLevel,
  classifySignalStrength,
  normalizeDeviceStatus,
} from "${IOT_PACKAGE}/functions";

classifyBatteryLevel(72);        // "high"
classifySignalStrength(84);      // "excellent"
normalizeDeviceStatus("ONLINE"); // "online"`}
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

            {/* react primitives */}
            <Reveal className="min-w-0">
              <h3 className="font-display text-xl font-semibold">React primitives</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Five components, each rendering one fact as text first. They are module primitives, not entries
                in the{" "}
                <Link href="/components" className="font-medium text-primary underline underline-offset-4">
                  component catalogue
                </Link>{" "}
                — there is no SwiftUI, Compose or Flutter port of them.
              </p>
              <ul className="mt-6 divide-y divide-border border-y border-border">
                {PRIMITIVES.map((p) => (
                  <li key={p.name} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
                    <div className="min-w-0">
                      <code className="font-mono text-sm text-foreground">{p.name}</code>
                      <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                    </div>
                    <div className="flex items-center">{p.demo}</div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-muted-foreground">
                Full props and behaviour in the{" "}
                <Link href="/docs/iot" className="font-medium text-primary underline underline-offset-4">
                  IoT documentation
                </Link>
                .
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── interactive showcase ──────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <Reveal>
            <SectionHead index="02" label="Try the primitives" meta="live" />
            <h2 className="mt-6 max-w-2xl text-balance font-display text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
              Move a control, watch what the reading says.
            </h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              These are the shipped components with their real props. Set a battery nobody reported, drag a
              reading three days into the past, tell the sensor it errored — the point is what the interface says
              when the data is imperfect.
            </p>
          </Reveal>
          <Reveal className="mt-10">
            <DeviceShowcase />
          </Reveal>
        </div>
      </section>

      {/* ─── "we do not know" survives ─────────────────────────────────── */}
      <section className="border-b border-border bg-muted/20">
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <Reveal>
            <SectionHead index="03" label="Missing data" meta="the rule" />
            <h2 className="mt-6 max-w-2xl text-balance font-display text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
              &ldquo;We do not know&rdquo; survives.
            </h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              A device that does not report a battery is not a device with a flat one. Each of these is a place
              where a convenient default becomes a lie the interface tells about someone&rsquo;s hardware, so
              <code className="mx-1 text-foreground">unknown</code> is a first-class result rather than a
              fallback.
            </p>
          </Reveal>

          {/* Scrollable, not clipped. Three columns do not fit 320px, and the wrapper used to be
              `overflow-hidden` — which cut the third column off with no way to reach it. `tabindex=0` plus a
              name makes the scroll region reachable by keyboard, which is the part a bare `overflow-x-auto`
              leaves out. */}
          <Reveal className="mt-10">
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
                      <span className="text-muted-foreground line-through decoration-destructive/70">
                        {u.misleading}
                      </span>
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
              This is a rule about presentation, not a data-quality guarantee: the module cannot tell you whether
              a reading is <em>correct</em>, only refuse to present an absent one as a measurement.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─── accessible device states ──────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            <Reveal>
              <SectionHead index="04" label="Accessible device states" />
              <h2 className="mt-6 max-w-xl text-balance font-display text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
                A green dot is not a device state.
              </h2>
              <p className="mt-4 max-w-xl text-muted-foreground">
                Device dashboards lean on colour harder than almost any other interface — and colour is the one
                channel that disappears in greyscale, in forced-colors mode, and for a screen reader. Every
                primitive here renders its fact as text, and colour is only ever a second encoding of something
                already written down.
              </p>
              <p className="mt-4 max-w-xl text-sm text-muted-foreground">
                Where a visual shorthand is used — a battery bar, a signal meter,{" "}
                <code className="text-foreground">5m ago</code> — the visuals are hidden from assistive
                technology and the full sentence is the accessible name. Nothing is announced twice, and nothing
                is announced only as an abbreviation.
              </p>
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
                  Missing values are stated rather than implied —{" "}
                  <span className="text-foreground">Battery level unknown</span>,{" "}
                  <span className="text-foreground">Never seen</span>. No primitive animates, so there is
                  nothing for <code className="text-foreground">prefers-reduced-motion</code> to suppress.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── architecture / bring your own connection ──────────────────── */}
      <section className="border-b border-border bg-muted/20">
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            <Reveal>
              <SectionHead index="05" label="Where the module sits" />
              <h2 className="mt-6 max-w-xl text-balance font-display text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
                Bring your own connection.
              </h2>
              <p className="mt-4 max-w-xl text-muted-foreground">
                KinetixUI IoT starts <em>above</em> the transport layer. Your product can receive device state
                through an API, a gateway, a device SDK, a BLE connection, an MQTT broker or another transport
                entirely — the module begins after that boundary and turns the resulting state into consistent
                product semantics and UI.
              </p>
              <p className="mt-4 max-w-xl text-sm text-muted-foreground">
                To be unambiguous, because this is the most common thing to get wrong about a library like this:
                those are examples of infrastructure <em>your application</em> might use. This module ships no
                transport, no protocol client and no vendor adapter. Nothing in it opens a connection, holds a
                credential, or parses a device payload.
              </p>
              <p className="mt-6">
                <Link
                  href="/docs/iot"
                  className="text-sm font-medium text-primary underline underline-offset-4"
                >
                  Read the module boundary in the docs
                </Link>
              </p>
            </Reveal>

            <Reveal>
              <ModuleBoundary />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── install ───────────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <Reveal>
            <SectionHead index="06" label="Install" meta={IOT_PACKAGE} />
            <h2 className="mt-6 max-w-2xl text-balance font-display text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
              One package, {IOT_ENTRY_POINTS.length} entry points.
            </h2>
          </Reveal>

          <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-12">
            <Reveal className="min-w-0">
              <InstallCommand command={`pnpm add ${IOT_PACKAGE}`} />
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {IOT_REACT_OPTIONAL ? (
                  <>
                    <code className="text-foreground">react</code> is an{" "}
                    <strong className="font-medium text-foreground">optional</strong> peer (
                    <code className="text-foreground">{IOT_REACT_PEER}</code>). The primitives need it; the
                    functions and models need nothing at all, so a server-side or worker consumer can install
                    this package on its own.
                  </>
                ) : (
                  <>
                    <code className="text-foreground">react</code> is a peer dependency (
                    <code className="text-foreground">{IOT_REACT_PEER}</code>).
                  </>
                )}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                The primitives style themselves with Tailwind utilities on the{" "}
                <Link href="/docs/tokens" className="font-medium text-primary underline underline-offset-4">
                  token contract
                </Link>{" "}
                rather than importing a stylesheet, so an app needs the tokens loaded and this package inside its
                Tailwind <code className="text-foreground">content</code>. The functions subpath needs neither —{" "}
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

// the five React primitives
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
                      {e.subpath === "." ? "everything" : e.subpath === "./functions" ? "models and pure functions, no React" : "the five React primitives"}
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── roadmap ───────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-muted/20">
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <Reveal>
            <SectionHead index="07" label="Roadmap" meta="no dates" />
            <h2 className="mt-6 max-w-2xl text-balance font-display text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
              What exists, and what is only intended.
            </h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Nothing below the first column is scheduled, and none of it is in the module today. It is here so
              the shape of the module is legible — not as a commitment.
            </p>
          </Reveal>

          <Reveal className="mt-10 grid gap-6 md:grid-cols-3">
            {ROADMAP.map((column) => (
              <div key={column.when} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                  <h3 className="font-display text-sm font-semibold">{column.when}</h3>
                  <span
                    className={
                      column.state === "now"
                        ? "rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                        : "rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                    }
                  >
                    {column.state === "now" ? `Shipped in ${IOT_VERSION}` : "Planned"}
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
        </div>
      </section>

      {/* ─── closer ────────────────────────────────────────────────────── */}
      <section>
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
          <Reveal className="max-w-3xl">
            <SectionHead index="08" label="Next" />
            <h2 className="mt-6 text-balance font-display text-3xl font-semibold tracking-[-0.02em] md:text-5xl">
              The reference, the models, and every prop.
            </h2>
            <p className="mt-5 max-w-xl text-muted-foreground md:text-lg">
              The documentation carries the full type definitions, every utility with its edge cases, the
              accessibility contract and the module&rsquo;s stated limitations.
            </p>
            <div className="mt-8">
              <Button asChild size="lg">
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
