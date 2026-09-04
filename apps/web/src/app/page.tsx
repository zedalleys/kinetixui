import Link from "next/link";
import { ArrowRight, ArrowUpRight, Boxes, Palette, Smartphone, Zap } from "lucide-react";
import { Button, Input } from "@kinetixui/ui";
import { CodeBlock } from "@/components/code-block";
import { Marquee, Reveal } from "@/components/reveal";

const PLATFORMS = ["React", "SwiftUI", "Jetpack Compose", "Flutter", "HTML + CSS"];

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
        <div className="relative mx-auto max-w-screen-2xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <Link
              href="/docs/changelog"
              className="eyebrow inline-flex items-center gap-2 transition-colors hover:text-foreground"
            >
              Free while in beta
              <ArrowRight className="size-3" />
            </Link>

            <h1 className="mt-6 text-balance font-display text-5xl font-bold leading-[1.03] md:text-7xl">
              One token architecture,{" "}
              <span className="kx-underline text-primary">in motion</span>
              <br className="hidden sm:block" /> across every platform.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-balance text-muted-foreground md:text-lg">
              KinetixUI turns a single design source into living tokens and components for React,
              SwiftUI, Jetpack Compose and Flutter. Copy a component, own the code, stay in sync as the
              design moves.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/docs">
                  Get started <ArrowUpRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="Outline">
                <Link href="/components">Browse components</Link>
              </Button>
            </div>

            <div className="mx-auto mt-8 w-full max-w-sm">
              <CodeBlock code="npx @kinetixui/cli add button" />
            </div>
          </div>
        </div>

        {/* platform ticker */}
        <div className="relative border-t border-border py-4">
          <Marquee durationSeconds={26}>
            {PLATFORMS.map((p) => (
              <span key={p} className="flex items-center gap-3 px-6 font-display text-sm text-muted-foreground">
                <span className="size-1.5 rounded-full bg-primary" />
                {p}
              </span>
            ))}
          </Marquee>
        </div>
      </section>

      {/* ─── features ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-screen-2xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">Why KinetixUI</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold md:text-4xl">
            A design system that moves with your design, not after it.
          </h2>
        </Reveal>

        <Reveal className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="group bg-background p-8 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:-translate-y-0.5">
                  <f.icon className="size-5" />
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ─── live strip ───────────────────────────────────────────────── */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-screen-2xl px-4 py-16 sm:px-6 lg:px-8">
          <Reveal>
            <p className="eyebrow">Live · rendered by @kinetixui/ui</p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
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
      <section className="mx-auto max-w-screen-2xl px-4 py-24 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold md:text-4xl">
            Built for teams that ship on more than one platform.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Agencies and product teams that want their design system to be the same everywhere. Free
            today; advanced tooling arrives as <span className="text-foreground">KinetixUI Pro</span>.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg">
              <Link href="/docs">
                Read the docs <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
