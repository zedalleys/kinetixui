"use client";

import * as React from "react";
import { Button, Input, Textarea } from "@kinetixui/ui";

/** resolved semantic contract, both themes — mirrors packages/tokens/dist/web/globals*.css */
const CONTRACT: { token: string; light: string; dark: string }[] = [
  { token: "background", light: "#ffffff", dark: "#050c11" },
  { token: "foreground", light: "#050c11", dark: "#f0f7ff" },
  { token: "card", light: "#ffffff", dark: "#0b1821" },
  { token: "popover", light: "#ffffff", dark: "#0b1821" },
  { token: "primary", light: "#1b3c53", dark: "#92b2c8" },
  { token: "primary-foreground", light: "#f0f7ff", dark: "#050c11" },
  { token: "secondary", light: "#f1f3f1", dark: "#2e362e" },
  { token: "secondary-foreground", light: "#748873", dark: "#e3e7e3" },
  { token: "muted", light: "#f6f6f6", dark: "#102432" },
  { token: "muted-foreground", light: "#6d6d6d", dark: "#92b2c8" },
  { token: "accent", light: "#f0f7ff", dark: "#102432" },
  { token: "accent-foreground", light: "#1b3c53", dark: "#f0f7ff" },
  { token: "destructive", light: "#ec5047", dark: "#dd6a6a" },
  { token: "success", light: "#5d6d5c", dark: "#90a08f" },
  { token: "warning", light: "#f97907", dark: "#ffc975" },
  { token: "border", light: "#92b2c8", dark: "#395a70" },
  { token: "ring", light: "#1b3c53", dark: "#92b2c8" },
];

function Preview({ scheme }: { scheme: "light" | "dark" }) {
  return (
    <div className={scheme === "dark" ? "dark" : "theme-light"}>
      <div className="rounded-xl border border-border bg-background p-6 text-foreground">
        <p className="text-xs font-medium text-muted-foreground">{scheme}</p>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm">Primary</Button>
            <Button size="sm" variant="Secondary">Secondary</Button>
            <Button size="sm" variant="Outline">Outline</Button>
            <Button size="sm" variant="Destructive">Delete</Button>
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

export default function ThemesPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Themes</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        One semantic contract, two value sets. Light is aliased from Figma; dark is synthesized —
        see <a href="/docs/dark-mode" className="font-medium text-primary underline underline-offset-4">Dark Mode</a>.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Preview scheme="light" />
        <Preview scheme="dark" />
      </div>

      <h2 className="mt-14 text-sm font-semibold">The contract</h2>
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Token</th>
              <th className="px-4 py-2 font-medium">Light</th>
              <th className="px-4 py-2 font-medium">Dark</th>
            </tr>
          </thead>
          <tbody>
            {CONTRACT.map((row) => (
              <tr key={row.token} className="border-t border-border">
                <td className="px-4 py-2 font-mono text-[13px]">--{row.token}</td>
                {(["light", "dark"] as const).map((k) => (
                  <td key={k} className="px-4 py-2">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-4 rounded border border-border" style={{ background: row[k] }} />
                      <span className="font-mono text-[13px] text-muted-foreground">{row[k]}</span>
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
