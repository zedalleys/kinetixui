"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * "Change a token, watch it move." Pick a semantic token; see the primitive it
 * resolves to per theme, the component classes that read it, and the platform
 * files a change lands in. The impact map is hand-curated from the token
 * contract — enough to make the ripple concrete.
 */

type Entry = {
  token: string;
  light: string;
  dark: string;
  swatchLight: string;
  swatchDark: string;
  used: string[];
  files: string[];
};

const TOKENS: Entry[] = [
  {
    token: "--primary",
    light: "blue.500 #1b3c53",
    dark: "blue.100 #92b2c8",
    swatchLight: "#1b3c53",
    swatchDark: "#92b2c8",
    used: [
      "Button variant=Primary",
      "Badge, Tag, Progress fill",
      "Tabs / Toggle active",
      "focus ring (--ring)",
      "chart-1",
    ],
    files: [
      "packages/tokens/dist/web/globals.css",
      "dist/ios/KinetixColorsSwiftUI.swift",
      "dist/android/Theme.kt",
      "dist/flutter/kinetix_color_scheme.dart",
      "registry/kinetixui/globals.css",
    ],
  },
  {
    token: "--destructive",
    light: "red.500 #c60a0a",
    dark: "red.300 #dd6a6a",
    swatchLight: "#c60a0a",
    swatchDark: "#dd6a6a",
    used: [
      "Button variant=Destructive",
      "Alert / Field / Inform error",
      "Modal type=Destructive",
      "shadow-focus-destructive",
    ],
    files: [
      "tokens/semantic/color.light.json",
      "packages/tokens/dist/web/globals.css",
      "the three native colour sets",
      "registry/kinetixui/globals.css",
    ],
  },
  {
    token: "--radius-md",
    light: "8px",
    dark: "8px",
    swatchLight: "transparent",
    swatchDark: "transparent",
    used: [
      "Card, Input, Select, Button",
      "Popover / Dropdown / Menu",
      "code blocks",
      "Tailwind `rounded-md`",
    ],
    files: [
      "tokens/primitives/radius.json",
      "dist/web/globals.css",
      "dist/ios/KinetixRadius.swift",
      "dist/android + flutter dimen sets",
    ],
  },
  {
    token: "--muted-foreground",
    light: "neutral.600 #6d6d6d",
    dark: "blue.100 #92b2c8",
    swatchLight: "#6d6d6d",
    swatchDark: "#92b2c8",
    used: [
      "all secondary / helper text",
      "placeholders, captions, meta",
      "disabled labels",
      "axis ticks in charts",
    ],
    files: [
      "tokens/semantic/color.{light,dark}.json",
      "dist/web/globals*.css",
      "every platform onSurfaceVariant",
    ],
  },
];

export function TokenExplorer() {
  const [i, setI] = React.useState(0);
  const e = TOKENS[i];
  return (
    <div className="mt-5">
      <div role="group" aria-label="Pick a token" className="flex flex-wrap gap-1.5">
        {TOKENS.map((t, idx) => (
          <button
            key={t.token}
            type="button"
            aria-pressed={i === idx}
            onClick={() => setI(idx)}
            className={cn(
              "rounded-full border px-3 py-1 font-mono text-[11px] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              i === idx
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {t.token}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-[14rem_1fr]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Resolves to
          </p>
          <ul className="mt-2 space-y-1.5 font-mono text-[12px]">
            <li className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block size-3 rounded-[2px] border border-border/50"
                style={{ background: e.swatchLight }}
              />
              light · {e.light}
            </li>
            <li className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block size-3 rounded-[2px] border border-border/50"
                style={{ background: e.swatchDark }}
              />
              dark · {e.dark}
            </li>
          </ul>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Lands in
          </p>
          <ul className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
            {e.files.map((f) => (
              <li key={f} className="truncate">
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Read by
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {e.used.map((u) => (
              <span
                key={u}
                className="rounded border border-border px-2 py-1 font-mono text-[11px] text-foreground"
              >
                {u}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Edit one line in <code className="text-foreground">tokens/semantic/</code>, run{" "}
            <code className="text-foreground">pnpm build:tokens</code>, and every item above moves at
            once — on all four platforms, in both themes.
          </p>
        </div>
      </div>
    </div>
  );
}
