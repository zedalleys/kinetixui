import Link from "next/link";
import { ArrowRight, Boxes, Palette, Smartphone, Sparkles } from "lucide-react";
import { Button, Input } from "@strata/ui";
import { CodeBlock } from "@/components/code-block";
import { siteConfig } from "@/lib/site";

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
          New — token engine ships web, iOS, Android &amp; Flutter
          <ArrowRight className="size-3" />
        </Link>

        <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight md:text-6xl">
          The design system, in <span className="text-primary">code</span> and{" "}
          <span className="text-primary">design</span>.
        </h1>
        <p className="max-w-xl text-balance text-muted-foreground md:text-lg">
          {siteConfig.description} Copy a component, own the code, keep it in sync with Figma.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/docs">Get Started</Link>
          </Button>
          <Button asChild size="lg" variant="Outline">
            <Link href="/docs/components/button">Browse Components</Link>
          </Button>
        </div>

        <div className="w-full max-w-md pt-4">
          <CodeBlock code="npx shadcn@latest add https://strata.design/r/button.json" />
        </div>
      </section>

      {/* feature grid */}
      <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Palette, title: "One token source", body: "DTCG tokens extracted from Figma, compiled by Style Dictionary v4." },
          { icon: Smartphone, title: "Every platform", body: "CSS variables, TS, SwiftUI, Jetpack Compose, Flutter — from the same file." },
          { icon: Boxes, title: "shadcn registry", body: "Components you install with the shadcn CLI and own outright." },
          { icon: Sparkles, title: "Light & dark", body: "A synthesized dark theme rides the same semantic contract." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-border bg-card p-5">
            <f.icon className="size-5 text-primary" />
            <h3 className="mt-3 font-medium">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      {/* live showcase */}
      <section className="mb-24 rounded-2xl border border-border bg-card p-8">
        <p className="text-sm font-medium text-muted-foreground">Live — rendered by @strata/ui</p>
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
