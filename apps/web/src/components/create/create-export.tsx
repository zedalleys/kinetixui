"use client";

import * as React from "react";
import { Button, Input, Label } from "@kinetixui/ui";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
import { generateExport, TARGETS, TARGET_LIST, type ExportTarget } from "@/lib/create/export-targets";
import type { CreateTheme } from "@/lib/create/theme-adapter";

/**
 * Export.
 *
 * One design, one resolved theme, four real exporters. The preview next to this is web — it renders
 * `@kinetixui/ui` components — and selecting SwiftUI here changes what the code pane contains, not
 * what the preview renders. Nothing on this page pretends to show an iOS or Android surface, because
 * nothing here can.
 *
 * The selected target and the generated symbol name are presentation state. Neither belongs in the
 * KX1 preset: a preset says what the design *is*, and which tab someone had open when they copied it
 * is not part of that. Share continues to carry the design alone.
 *
 * Beside the code is the `kinetixui preset …` command that writes the same file. It is here because it
 * is true — the CLI imports the same exporter — and because the useful next step after seeing generated
 * Swift is usually to generate it in a repository rather than to paste it out of a browser.
 */

/** One clipboard implementation, shared by the code and the command. */
function useCopy() {
  const [copied, setCopied] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => () => clearTimeout(timer.current), []);

  const copy = React.useCallback((value: string, what: string) => {
    navigator.clipboard.writeText(value).then(
      () => {
        setFailed(false);
        setCopied(what);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(null), 1500);
      },
      // Blocked by an insecure context or a denied permission. Nothing was copied, so say that
      // rather than showing a confirmation for something that did not happen.
      () => {
        setCopied(null);
        setFailed(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setFailed(false), 4000);
      },
    );
  }, []);

  return { copied, failed, copy };
}

export function CreateExport({
  theme,
  presetCode,
  className,
}: {
  theme: CreateTheme;
  /** The KX1 code for the current design, so the command writes *this* theme rather than a default. */
  presetCode: string;
  className?: string;
}) {
  const id = React.useId();
  const [target, setTarget] = React.useState<ExportTarget>("web-css");
  // One symbol per target, so switching away and back does not lose what was typed. Native only —
  // CSS has no generated type name.
  const [symbols, setSymbols] = React.useState<Record<string, string>>({});
  const { copied, failed, copy } = useCopy();

  const config = TARGETS[target];
  const symbol = symbols[target] ?? config.symbol?.default ?? "";

  // Only the selected target is generated. The theme is already memoized upstream on the config key,
  // so this recomputes when the design changes or the target changes — not on every render, and
  // never for the three targets nobody is looking at.
  const result = React.useMemo(
    () => generateExport(theme, target, symbol, presetCode),
    [theme, target, symbol, presetCode],
  );

  const select = (next: ExportTarget) => {
    setTarget(next);
    analytics.track("create_export_target_selected", { target: next, source: "create_workspace" });
  };

  const copyCode = () => {
    if (!result.code) return;
    copy(result.code, "code");
    analytics.track("create_export_copied", { target, source: "create_workspace" });
  };

  // No analytics on the command: it contains the preset, and a preset never travels to analytics.
  const copyCommand = () => {
    if (result.command) copy(result.command, "command");
  };

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {/*
        Buttons in a group rather than a tablist: each one switches a pane in place, and native
        button semantics already give a name, a role, keyboard reach and a focus ring. A tablist
        would add roving tabindex and aria-selected for no behaviour a reader does not already get.
      */}
      <div role="group" aria-label="Export target" className="flex flex-wrap gap-2">
        {TARGET_LIST.map((t) => {
          const selected = t.id === target;
          return (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant={selected ? "Primary" : "Outline"}
              // Selection is not carried by colour alone — it is also the button's pressed state,
              // which a screen reader announces.
              aria-pressed={selected}
              onClick={() => select(t.id)}
            >
              {t.label}
            </Button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-prose">
          <p className="text-sm text-foreground">{config.description}</p>
          <p className="mt-1 text-sm text-muted-foreground">{config.capability}</p>
        </div>

        {config.symbol ? (
          <div className="min-w-0">
            <Label htmlFor={`${id}-symbol`} className="text-xs font-medium">
              {config.symbol.shape} name
            </Label>
            <Input
              id={`${id}-symbol`}
              value={symbol}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              onChange={(event) => setSymbols((prev) => ({ ...prev, [target]: event.target.value }))}
              aria-invalid={result.error ? true : undefined}
              aria-describedby={result.error ? `${id}-symbol-error` : undefined}
              // `w-full max-w-[14rem]` rather than `w-56`: the same 224px wherever there is room for
              // it, but a maximum instead of a fixed size. `w-56` is 14rem, so at 200% text it became a
              // 448px field inside a 311px column and pushed /create 105px sideways on a phone — the
              // `min-w-0` on its wrapper cannot help, because the width is on the input itself. This is
              // the same defect family as the collapse this change fixes (a `rem` length that doubles
              // while the viewport does not); it is only visible after selecting SwiftUI, Compose or
              // Flutter, because Web CSS has no symbol to name, which is why the site sweep — which
              // measures each page in its default state — never saw it.
              className="mt-1 w-full max-w-[14rem] font-mono text-xs"
            />
          </div>
        ) : null}
      </div>

      {/*
        An invalid name is reported, never repaired. Silently turning "My Theme!" into "MyTheme"
        would put a symbol in someone's codebase that they did not choose and cannot find.
      */}
      {result.error ? (
        <p id={`${id}-symbol-error`} role="alert" className="mt-3 text-sm text-destructive">
          {result.error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs text-muted-foreground">{config.filename}</p>
        <Button size="sm" variant="Outline" onClick={copyCode} disabled={!result.code}>
          {copied === "code" ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          Copy code
        </Button>
      </div>

      {/* Scrolls sideways on a narrow screen, so it is focusable and named — the convention
          <TokenTable> already uses for axe's scrollable-region-focusable rule. The name changes with
          the target so it says which file is on screen. */}
      <div
        role="group"
        aria-label={config.outputLabel}
        tabIndex={0}
        className="mt-3 max-h-[28rem] min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <pre className="w-max min-w-full p-4 font-mono text-xs leading-relaxed text-foreground">
          <code>{result.code ?? ""}</code>
        </pre>
      </div>

      {/*
        The same file, without a browser. Shown rather than hidden behind a disclosure because it is
        the answer to "how do I do this again next month", and that question has a one-line answer.
      */}
      {result.command ? (
        <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-foreground">Or generate it from a terminal</p>
            <Button size="sm" variant="Ghost" onClick={copyCommand}>
              {copied === "command" ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              Copy command
            </Button>
          </div>
          {/* Scrolls sideways — a preset code is long — so it is focusable and named, like the code
              region above it. */}
          <div
            role="group"
            aria-label={`Terminal command for ${config.label}`}
            tabIndex={0}
            className="mt-2 overflow-x-auto rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <pre className="w-max min-w-full font-mono text-xs leading-relaxed text-muted-foreground">
              <code>{result.command}</code>
            </pre>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Needs{" "}
            <code className="rounded bg-muted px-1 font-mono text-foreground">@kinetixui/cli</code> — it runs
            the exporter this panel just ran.
          </p>
        </div>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {copied === "code"
          ? `${config.label} code copied to clipboard`
          : copied === "command"
            ? "Command copied to clipboard"
            : ""}
      </p>
      {failed ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Could not copy — your browser blocked clipboard access.
        </p>
      ) : null}
    </div>
  );
}
