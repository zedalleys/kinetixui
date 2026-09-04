import type { Metadata } from "next";
import { ThemePreview } from "@/components/theme-preview";
import { TokenTable } from "@/components/token-table";

export const metadata: Metadata = {
  title: "Themes",
  description: "One semantic contract, two value sets.",
};

export default function ThemesPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Themes</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
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

      <h2 className="mt-14 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
        The contract
      </h2>
      <TokenTable />
    </div>
  );
}
