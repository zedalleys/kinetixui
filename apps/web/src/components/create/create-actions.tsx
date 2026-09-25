"use client";

import * as React from "react";
import { Button } from "@kinetixui/ui";
import { Check, Copy, Link2, RotateCcw, Shuffle } from "lucide-react";
import { analytics } from "@/lib/analytics";
import type { CreateConfig } from "@/lib/create/config";
import { encodeConfig, shareUrlFor } from "@/lib/create/preset";

/**
 * The workspace actions: Share, Copy preset, Copy CSS, Randomize, Reset.
 *
 * Three of these produce something you can paste, and they are deliberately not interchangeable:
 *
 *   Share link   → https://kinetixui.com/create?preset=KX1_…   opens the workspace with this design
 *   Preset code  → KX1_…                                        the design itself, for the CLI or a note
 *   Copy CSS     → :root { … } .dark { … }                      the theme, for a stylesheet
 *
 * A label that blurred them would be the most expensive kind of small mistake: someone pastes a preset
 * code into a stylesheet, or CSS into the CLI, and neither says anything useful about why it failed.
 */

/** Clipboard write plus a spoken confirmation. Returns false when the platform refused. */
function useCopyAction() {
  const [done, setDone] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => () => clearTimeout(timer.current), []);

  const run = React.useCallback((id: string, text: string, onDone?: () => void) => {
    const settle = (ok: boolean) => {
      setFailed(!ok);
      setDone(ok ? id : null);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(null), 2000);
      if (ok) onDone?.();
    };
    // `navigator.clipboard` is absent over plain http and can be denied by permission. Neither is an
    // error worth a dialog, but claiming success when nothing was copied is worse than saying so.
    if (!navigator.clipboard?.writeText) return settle(false);
    navigator.clipboard.writeText(text).then(
      () => settle(true),
      () => settle(false),
    );
  }, []);

  return { done, failed, run };
}

export function CreateActions({
  config,
  css,
  cssIsEmpty,
  isDefault,
  onRandomize,
  onReset,
  onShared,
}: {
  config: CreateConfig;
  css: string;
  cssIsEmpty: boolean;
  isDefault: boolean;
  onRandomize: () => void;
  onReset: () => void;
  /** Lets the workspace put the canonical URL in the address bar once a link has been shared. */
  onShared: (url: string) => void;
}) {
  const { done, failed, run } = useCopyAction();

  const shareLink = () => {
    // `window.location.origin` rather than a hard-coded host: a preview deployment should share a link
    // to itself, not to production.
    const url = shareUrlFor(config, window.location.origin);
    run("share", url, () => {
      onShared(url);
      analytics.track("preset_shared", { source: "create_workspace" });
    });
  };

  const copyCode = () =>
    run("code", encodeConfig(config), () => analytics.track("preset_code_copied", { source: "create_workspace" }));

  const copyCss = () => run("css", css);

  const label = (id: string, idle: string) => (done === id ? "Copied" : idle);

  return (
    <div role="group" aria-label="Workspace actions" className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="Ghost" onClick={onReset} disabled={isDefault}>
        <RotateCcw className="size-4" aria-hidden />
        Reset
      </Button>

      <Button
        size="sm"
        variant="Ghost"
        onClick={() => {
          onRandomize();
          analytics.track("preset_randomized", { source: "create_workspace" });
        }}
      >
        <Shuffle className="size-4" aria-hidden />
        Randomize
      </Button>

      <Button size="sm" variant="Outline" onClick={copyCode} disabled={isDefault}>
        {done === "code" ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {label("code", "Copy preset")}
      </Button>

      <Button size="sm" variant="Outline" onClick={copyCss} disabled={cssIsEmpty}>
        {done === "css" ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {label("css", "Copy CSS")}
      </Button>

      <Button size="sm" onClick={shareLink} disabled={isDefault}>
        {done === "share" ? <Check className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
        {label("share", "Share")}
      </Button>

      {/* One live region for all of them: a screen reader hears what happened, not merely that a button
          was pressed. The failure case is announced too — silence would read as success. */}
      <span aria-live="polite" className="sr-only">
        {failed
          ? "Could not copy — your browser blocked clipboard access."
          : done === "share"
            ? "Share link copied to clipboard"
            : done === "code"
              ? "Preset code copied to clipboard"
              : done === "css"
                ? "CSS copied to clipboard"
                : ""}
      </span>
      {failed && (
        <p role="status" className="basis-full text-sm text-destructive">
          Could not copy — your browser blocked clipboard access. Select the code in the Output panel and
          copy it manually.
        </p>
      )}
    </div>
  );
}
