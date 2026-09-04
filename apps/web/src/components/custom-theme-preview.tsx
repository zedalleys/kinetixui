"use client";

import { Button, Input, Textarea } from "@kinetixui/ui";
import { toCssVarStyle, type AcceptedToken } from "@/lib/theme-builder";

/**
 * The same real components as <ThemePreview>, recolored via inline CSS custom
 * properties instead of the .theme-light/.dark classes — so an uploaded
 * palette renders through the actual Tailwind classes (bg-primary etc.),
 * not a hand-rolled style copy.
 */
export function CustomThemePreview({ values }: { values: Partial<Record<AcceptedToken, string>> }) {
  const style = toCssVarStyle(values) as React.CSSProperties;

  return (
    <div style={style} className="rounded-xl border border-border bg-background p-6 text-foreground">
      <div className="space-y-4">
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
          <Button size="sm" variant="Ghost">
            Ghost
          </Button>
        </div>
        <Input placeholder="you@example.com" />
        <Textarea placeholder="Message…" rows={2} />
        <div className="rounded-lg border border-border bg-card p-3 text-sm text-card-foreground">
          Card surface with <span className="text-muted-foreground">muted foreground</span> text.
        </div>
        <div className="rounded-lg bg-accent p-3 text-sm text-accent-foreground">
          Accent surface, for hover/selected states.
        </div>
      </div>
    </div>
  );
}
