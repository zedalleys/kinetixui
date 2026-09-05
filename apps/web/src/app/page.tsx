import Link from "next/link";
import { ArrowRight, ArrowUpRight, Boxes, Palette, Smartphone, Zap } from "lucide-react";
import { Button, Input } from "@kinetixui/ui";
import { HeroCommand } from "@/components/hero-command";
import { HeroTokenFan } from "@/components/hero-token-fan";
import { Marquee, Reveal } from "@/components/reveal";
import { SectionHead } from "@/components/section-head";

const PLATFORMS = ["React", "SwiftUI", "Jetpack Compose", "Flutter", "HTML + CSS"];

const SPEC: [string, string][] = [
  ["Targets", "05"],
  ["Source", "DTCG"],
  ["Runtime deps", "0"],
  ["Components", "72"],
  ["License", "Beta"],
];

const FEATURES = [
  {
    icon: Zap,
    title: "Dynamic tokens",
    body: "One DTCG source, compiled by Style Dictionary v4. Change a value once — it moves everywhere, in every language.",
  },
  {
    icon: Smartphone,
    title: "Every platform",
    body: "CSS variables, TypeScript, SwiftUI, Jetpack Compose and Flutter emitted from the same file. The Code tab on every component shows all five.",
  },
  {
    icon: Boxes,
    title: "Own your code",
    body: "Components install through the kinetixui CLI and land in your repo. No runtime dependency, no lock-in — the code is yours to change.",
  },
  {
    icon: Palette,
    title: "Light & dark, verified",
    body: "One semantic contract, two value sets, toggled with a class. Contrast is audited against WCAG AA in CI.",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* ─── hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 kx-grid-bg" />
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 py-16 md:py-28 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-16">
            {/* headline */}
            <div className="kx-hero-enter max-w-3xl">
              <Link
                href="/docs/changelog"
                className="eyebrow group inline-flex items-center gap-2 transition-colors hover:text-foreground"
              >
                <span className="text-primary">[00]</span> Free while in beta
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <h1 className="mt-6 text-balance font-display text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] sm:text-6xl sm:leading-[1.02] lg:text-[4.5rem]">
                One token{" "}
                <br className="hidden sm:block" />
                architecture,{" "}
                <span className="kx-underline text-primary">in motion</span>{" "}
                <br className="hidden sm:block" />
                across every platform.
              </h1>

              <p className="mt-7 max-w-xl text-muted-foreground md:text-lg">
                KinetixUI compiles one design source into living tokens and components for React,
                SwiftUI, Jetpack Compose and Flutter. Copy a component, own the code, stay in sync as
                the design moves.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/docs">
                    Get started <ArrowUpRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="Outline">
                  <Link href="/components">Browse components</Link>
                </Button>
              </div>

              <div className="mt-8 w-full max-w-xl">
                <HeroCommand />
                <p className="mt-2 text-[13px] text-muted-foreground sm:whitespace-nowrap">
                  Example — adds one component.{" "}
                  <Link href="/docs/installation" className="text-primary underline-offset-4 hover:underline">
                    Installation
                  </Link>{" "}
                  covers the full library.
                </p>
              </div>
            </div>

            {/* right rail: token fan-out + spec panel */}
            <aside className="flex flex-col gap-4 self-start">
              <HeroTokenFan />
              <div className="kx-frame hidden border border-border bg-background/60 lg:block">
                <p className="border-b border-border px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  spec
                </p>
                <dl className="divide-y divide-border">
                  {SPEC.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-4 px-4 py-3">
                      <dt className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                        {k}
                      </dt>
                      <dd className="font-display text-sm font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </aside>
          </div>
        </div>

        {/* targets ticker — a hard structural band */}
        <div className="relative border-t border-border">
          <div className="mx-auto flex max-w-screen-2xl items-stretch">
            <span className="hidden shrink-0 items-center border-r border-border px-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:flex sm:px-6 lg:px-8">
              Targets&nbsp;→
            </span>
            <Marquee durationSeconds={26} className="flex-1 py-4">
              {PLATFORMS.map((p) => (
                <span
                  key={p}
                  className="flex items-center gap-3 px-6 font-display text-sm text-muted-foreground"
                >
                  <span className="size-1.5 rounded-full bg-primary" />
                  {p}
                </span>
              ))}
            </Marquee>
          </div>
        </div>
      </section>

      {/* ─── features ledger ──────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <Reveal>
            <SectionHead index="01" label="Why KinetixUI" meta="04 principles" />
            <h2 className="mt-6 max-w-2xl text-balance font-display text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
              A design system that moves with your design, not after it.
            </h2>
          </Reveal>

          <Reveal className="mt-12 border-t border-border">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="group grid gap-4 border-b border-border py-8 md:grid-cols-[5rem_1fr_1.4fr] md:gap-8 md:py-10"
              >
                <span className="font-display text-4xl font-bold leading-none text-muted-foreground/40 transition-colors group-hover:text-primary md:text-5xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="mt-1 font-display text-lg font-semibold">{f.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground md:text-base">{f.body}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ─── live strip ───────────────────────────────────────────────── */}
      <section className="border-b border-border bg-muted/20">
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 py-16 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHead index="02" label="Rendered by @kinetixui/ui" meta="live" />
            <div className="kx-frame mt-10 flex flex-wrap items-center gap-4 border border-border bg-background p-8">
              <Button>Primary</Button>
              <Button variant="Secondary">Secondary</Button>
              <Button variant="Outline">Outline</Button>
              <Button variant="Destructive">Destructive</Button>
              <Button variant="Ghost">Ghost</Button>
              <Button variant="Link">Link</Button>
              <div className="w-56">
                <Input placeholder="you@example.com" type="email" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── closer ───────────────────────────────────────────────────── */}
      <section>
        <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
          <Reveal className="max-w-3xl">
            <SectionHead index="03" label="Who it's for" />
            <h2 className="mt-6 text-balance font-display text-3xl font-semibold tracking-[-0.02em] md:text-5xl">
              Built for teams that ship on more than one platform.
            </h2>
            <p className="mt-5 max-w-xl text-muted-foreground md:text-lg">
              Agencies and product teams that want their design system to be identical everywhere.
              Free today; advanced tooling arrives as{" "}
              <span className="text-foreground">KinetixUI Pro</span>.
            </p>
            <div className="mt-8">
              <Button asChild size="lg">
                <Link href="/docs">
                  Read the docs <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
