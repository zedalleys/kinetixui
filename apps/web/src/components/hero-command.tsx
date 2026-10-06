"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";
import { CopyButton } from "./copy-button";
import { analytics } from "@/lib/analytics";
import { PACKAGES } from "@/lib/packages";
import { usePersistedPause } from "@/lib/use-persisted-pause";
import { cn } from "@/lib/utils";

const PREFIX = "npx @kinetixui/cli add ";
const NAMES = ["button", "card", "dialog", "input", "tabs", "chart", "calendar", "command"];

/** Where the typing loop is, kept outside React state so a pause can stop it mid-word and a resume picks it up there. */
type Cursor = { idx: number; ch: number; phase: "typing" | "pausing" | "deleting" };

/**
 * Hero CLI snippet that types out `add <component>` on a loop — the same
 * chrome as <CodeBlock>, plus a blinking caret. Static ("add button")
 * under `prefers-reduced-motion`. Copy grabs the currently-shown command.
 *
 * The loop never ends, so WCAG 2.2.2 (Pause, Stop, Hide) needs a way to stop it that does not depend on the
 * operating-system motion setting: the pause button in the header. Pausing clears the pending timer — nothing keeps
 * typing in the background — and freezes the caret; resuming continues the same word from the same letter after the
 * usual beat. The choice is remembered for the next visit. Under reduced motion nothing loops, so there is nothing to
 * pause and the button is not shown.
 */
export function HeroCommand() {
  const [typed, setTyped] = React.useState("button");
  const [current, setCurrent] = React.useState("button");
  const [paused, togglePaused] = usePersistedPause("kx-hero-command");
  const cursor = React.useRef<Cursor>({ idx: 0, ch: NAMES[0].length, phase: "pausing" });

  React.useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const at = cursor.current;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const target = NAMES[at.idx];
      if (at.phase === "typing") {
        at.ch += 1;
        setTyped(target.slice(0, at.ch));
        if (at.ch >= target.length) {
          at.phase = "pausing";
          timer = setTimeout(tick, 1700);
          return;
        }
        timer = setTimeout(tick, 65);
      } else if (at.phase === "pausing") {
        at.phase = "deleting";
        timer = setTimeout(tick, 60);
      } else {
        at.ch -= 1;
        setTyped(target.slice(0, Math.max(at.ch, 0)));
        if (at.ch <= 0) {
          at.idx = (at.idx + 1) % NAMES.length;
          setCurrent(NAMES[at.idx]);
          at.phase = "typing";
          at.ch = 0;
          timer = setTimeout(tick, 140);
          return;
        }
        timer = setTimeout(tick, 32);
      }
    };

    timer = setTimeout(tick, 1700);
    return () => clearTimeout(timer);
  }, [paused]);

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-muted/40">
      <div className="flex items-center justify-between border-b border-border px-4 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span>bash</span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Pause typing animation"
            aria-pressed={paused}
            data-hero-command-pause=""
            onClick={togglePaused}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "motion-reduce:hidden",
            )}
          >
            {paused ? <Play aria-hidden="true" className="size-3.5" /> : <Pause aria-hidden="true" className="size-3.5" />}
          </button>
          <CopyButton
            value={PREFIX + current}
            // which component is currently typed is not reported — only that the CLI command was copied
            onCopy={() => analytics.track("cli_command_copied", { source: "homepage_hero", package: PACKAGES.cli })}
          />
        </span>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code>
          <span className="text-muted-foreground">{PREFIX}</span>
          <span className="text-foreground">{typed}</span>
          <span aria-hidden className="kx-caret" {...(paused ? { "data-paused": "" } : {})} />
        </code>
      </pre>
    </div>
  );
}
