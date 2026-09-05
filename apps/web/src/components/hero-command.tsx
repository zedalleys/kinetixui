"use client";

import * as React from "react";
import { CopyButton } from "./copy-button";

const PREFIX = "npx @kinetixui/cli add ";
const NAMES = ["button", "card", "dialog", "input", "tabs", "chart", "calendar", "command"];

/**
 * Hero CLI snippet that types out `add <component>` on a loop — the same
 * chrome as <CodeBlock>, plus a blinking caret. Static ("add button")
 * under `prefers-reduced-motion`. Copy grabs the currently-shown command.
 */
export function HeroCommand() {
  const [typed, setTyped] = React.useState("button");
  const [current, setCurrent] = React.useState("button");

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let idx = 0;
    let ch = NAMES[0].length;
    let phase: "typing" | "pausing" | "deleting" = "pausing";
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const target = NAMES[idx];
      if (phase === "typing") {
        ch += 1;
        setTyped(target.slice(0, ch));
        if (ch >= target.length) {
          phase = "pausing";
          timer = setTimeout(tick, 1700);
          return;
        }
        timer = setTimeout(tick, 65);
      } else if (phase === "pausing") {
        phase = "deleting";
        timer = setTimeout(tick, 60);
      } else {
        ch -= 1;
        setTyped(target.slice(0, Math.max(ch, 0)));
        if (ch <= 0) {
          idx = (idx + 1) % NAMES.length;
          setCurrent(NAMES[idx]);
          phase = "typing";
          ch = 0;
          timer = setTimeout(tick, 140);
          return;
        }
        timer = setTimeout(tick, 32);
      }
    };

    timer = setTimeout(tick, 1700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-muted/40">
      <div className="flex items-center justify-between border-b border-border px-4 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span>bash</span>
        <CopyButton value={PREFIX + current} />
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code>
          <span className="text-muted-foreground">{PREFIX}</span>
          <span className="text-foreground">{typed}</span>
          <span aria-hidden className="kx-caret" />
        </code>
      </pre>
    </div>
  );
}
