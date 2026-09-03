import Link from "next/link";
import { ArrowRight, Boxes, Palette, Smartphone, Sparkles, Zap } from "lucide-react";
import { Button, Input } from "@kinetixui/ui";
import { CodeBlock } from "@/components/code-block";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
      {/* hero */}
      <section className="flex flex-col items-center gap-6 py-20 text-center md:py-28">
        <Link
          href="/docs/changelog"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
        >
          <Sparkles className="size-3 text-primary" />
          Free while in beta — every component, every platform
          <ArrowRight className="size-3" />
        </Link>

        <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight md:text-6xl">
          One token architecture, <span className="text-primary">in motion</span> across every platform.
        </h1>
        <p className="max-w-2xl text-balance text-muted-foreground md:text-lg">
          KinetixUI turns a single design source into living tokens and components for React, SwiftUI,
          Jetpack Compose and Flutter. Copy a component, own the code, stay in sync as the design moves.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/docs">Get Started</Link>
          </Button>
          <Button asChild size="lg" variant="Outline">
            <Link href="/components">Browse Components</Link>
          </Button>
        </div>

        <div className="w-full max-w-md pt-4">
          <CodeBlock code="npx kinetixui add button" />
        </div>
      </section>

      {/* feature grid */}
      <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Zap, title: "Dynamic tokens", body: "One DTCG source, compiled by Style Dictionary v4 — change it once, it moves everywhere." },
          { icon: Smartphone, title: "Every platform", body: "CSS variables, TypeScript, SwiftUI, Jetpack Compose and Flutter from the same file." },
          { icon: Boxes, title: "Own your code", body: "Components install through the kinetixui CLI and land in your repo — no runtime dependency." },
          { icon: Palette, title: "Light & dark", body: "One semantic contract, two value sets, toggled with a class." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-border bg-card p-5">
            <f.icon className="size-5 text-primary" />
            <h3 className="mt-3 font-medium">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      {/* who it's for */}
      <section className="mb-16 rounded-2xl border border-border bg-muted/30 p-8 text-center">
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Built for product teams, agencies and companies that ship on more than one platform and want
          their design system to be the same everywhere. Free today; advanced tooling arrives as{" "}
          <span className="text-foreground">KinetixUI Pro</span>.
        </p>
      </section>

      {/* live showcase */}
      <section className="mb-24 rounded-2xl border border-border bg-card p-8">
        <p className="text-sm font-medium text-muted-foreground">Live — rendered by @kinetixui/ui</p>
        <div className="mt-6 flex flex-wrap items-end gap-4">
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
      </section>
    </div>
  );
}
