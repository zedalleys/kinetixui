import type { Metadata } from "next";
import Link from "next/link";
import { ThemePreview } from "@/components/theme-preview";
import { TokenTable } from "@/components/token-table";

export const metadata: Metadata = {
  title: "Themes",
  description: "One semantic contract, two value sets.",
};

export default function ThemesPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow">Light &amp; dark</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">Themes</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        One semantic contract, two value sets. Light is aliased from Figma; dark is synthesized —
        see{" "}
        <a
          href="/docs/dark-mode"
          className="font-medium text-primary underline underline-offset-4"
        >
          Dark Mode
        </a>
        .
      </p>

      <div className="mt-10">
        <ThemePreview />
      </div>

      <Link
        href="/theme-builder"
        className="group mt-8 flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3 transition-colors hover:border-primary/40"
      >
        <span>
          <span className="font-medium">Have your own palette?</span>{" "}
          <span className="text-sm text-muted-foreground">
            Paste it into the Theme Builder and preview it on real components.
          </span>
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-primary transition-transform group-hover:translate-x-0.5">
          Try it →
        </span>
      </Link>

      <h2 className="mt-14 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
        The contract
      </h2>
      <TokenTable />
    </div>
  );
}
