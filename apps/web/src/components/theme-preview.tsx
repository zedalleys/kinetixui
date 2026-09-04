"use client";

import { Button, Input, Textarea } from "@kinetixui/ui";

function Panel({ scheme }: { scheme: "light" | "dark" }) {
  return (
    <div className={scheme === "dark" ? "dark" : "theme-light"}>
      <div className="rounded-xl border border-border bg-background p-6 text-foreground">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          {scheme}
        </p>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm">Primary</Button>
            <Button size="sm" variant="Secondary">
              Secondary
            </Button>
            <Button size="sm" variant="Outline">
              Outline
            </Button>
            <Button size="sm" variant="Destructive">
              Delete
            </Button>
          </div>
          <Input placeholder="you@example.com" />
          <Textarea placeholder="Message…" rows={2} />
          <div className="rounded-lg border border-border bg-card p-3 text-sm text-card-foreground">
            Card surface with <span className="text-muted-foreground">muted foreground</span> text.
          </div>
        </div>
      </div>
    </div>
  );
}

/** Same components, both value sets — for /themes and the theming docs. */
export function ThemePreview() {
  return (
    <div className="my-6 grid gap-4 sm:grid-cols-2">
      <Panel scheme="light" />
      <Panel scheme="dark" />
    </div>
  );
}
