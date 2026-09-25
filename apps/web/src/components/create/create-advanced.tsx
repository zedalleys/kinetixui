"use client";

import * as React from "react";
import { Button, Label, Textarea } from "@kinetixui/ui";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { hexToOklch } from "@/lib/color/oklch";
import type { AcceptedToken } from "@/lib/theme-builder";
import type { CreateAction, CreateConfig } from "@/lib/create/config";
import { overridesToText, textToOverrides, type CreateTheme } from "@/lib/create/theme-adapter";

/**
 * Advanced: the exact values, for when the generated ones are not what a system needs.
 *
 * Two editors over one model. The semantic fields and the raw `token,hex` rows both write into
 * `manualOverrides`, so there is no third source of truth and no way for them to disagree — change a
 * field and the text updates, edit the text and the fields do (§41).
 *
 * The raw editor is the tool /theme-builder was. It is kept exactly as capable and moved to the bottom
 * of the panel instead of being the first thing anyone meets (§97).
 */

/** The groups §39 asks for: understandable names, not every low-level primitive. */
const GROUPS: { title: string; hint: string; tokens: [AcceptedToken, string][] }[] = [
  {
    title: "Brand & actions",
    hint: "Simple mode seeds all four from the theme colour. Set one here and it stops following.",
    tokens: [
      ["brand", "Brand"],
      ["action", "Action"],
      ["link", "Link"],
      ["focus", "Focus ring"],
    ],
  },
  {
    title: "Surfaces",
    hint: "The page and the things on it.",
    tokens: [
      ["background", "Background"],
      ["card", "Card"],
      ["muted", "Muted"],
      ["border", "Border"],
    ],
  },
  {
    title: "Status",
    hint: "Meaning, not decoration — these do not follow the theme colour, and should not.",
    tokens: [
      ["destructive", "Destructive"],
      ["secondary", "Secondary"],
      ["accent", "Accent"],
    ],
  },
];

export function CreateAdvanced({
  config,
  theme,
  dispatch,
}: {
  config: CreateConfig;
  theme: CreateTheme;
  dispatch: React.Dispatch<CreateAction>;
}) {
  const id = React.useId();

  return (
    <div className="space-y-6">
      {GROUPS.map((group) => (
        <fieldset key={group.title}>
          <legend className="text-sm font-medium">{group.title}</legend>
          <p className="mt-1 text-sm text-muted-foreground">{group.hint}</p>
          <div className="mt-3 space-y-2">
            {group.tokens.map(([token, label]) => (
              <SemanticField
                key={token}
                id={`${id}-${token}`}
                label={label}
                token={token}
                resolved={theme.active.colors[token] ?? "#000000"}
                manual={config.manualOverrides[token]}
                dispatch={dispatch}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <RawEditor config={config} dispatch={dispatch} />
    </div>
  );
}

/**
 * One semantic colour.
 *
 * Shows the resolved value whether it was generated or typed, and says which — a field that looks the
 * same in both states leaves you unable to tell what you have actually pinned.
 */
function SemanticField({
  id,
  label,
  token,
  resolved,
  manual,
  dispatch,
}: {
  id: string;
  label: string;
  token: AcceptedToken;
  resolved: string;
  manual?: string;
  dispatch: React.Dispatch<CreateAction>;
}) {
  const [draft, setDraft] = React.useState<string | null>(null);
  React.useEffect(() => setDraft(null), [resolved]);

  const shown = draft ?? resolved;
  const invalid = draft !== null && !hexToOklch(draft);

  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className="size-8 shrink-0 rounded-md border border-border"
        style={{ background: resolved }}
      />
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="flex items-baseline gap-2 text-sm">
          {label}
          <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            {manual ? "manual" : "generated"}
          </span>
        </label>
        <input
          id={id}
          value={shown}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            setDraft(e.target.value);
            if (hexToOklch(e.target.value)) dispatch({ type: "set-override", token, hex: e.target.value.trim().toLowerCase() });
          }}
          onBlur={() => setDraft(null)}
          className={cn(
            "mt-1 w-full rounded-md border bg-background px-2 py-1 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
            invalid ? "border-destructive" : "border-border",
          )}
        />
      </div>
      <Button
        size="sm"
        variant="Ghost"
        disabled={!manual}
        onClick={() => dispatch({ type: "set-override", token, hex: null })}
        aria-label={`Reset ${label} to the generated value`}
      >
        <RotateCcw className="size-4" aria-hidden />
      </Button>
    </div>
  );
}

/** The `token,hex` editor, unchanged in capability and no longer the front door. */
function RawEditor({ config, dispatch }: { config: CreateConfig; dispatch: React.Dispatch<CreateAction> }) {
  const id = React.useId();
  const fromConfig = overridesToText(config.manualOverrides);

  // Draft text so a half-typed row is not rewritten underneath the cursor.
  //
  // The draft must only be dropped when the overrides change from SOMEWHERE ELSE — a semantic field, a
  // style, Reset. Dropping it whenever `fromConfig` changes looks equivalent and is not: typing a valid
  // row changes the config, which would rewrite the textarea from the config and silently delete every
  // invalid row the user had typed, along with the error message explaining them.
  const [draft, setDraft] = React.useState<string | null>(null);
  const ours = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (ours.current === fromConfig) return;
    setDraft(null);
  }, [fromConfig]);

  const text = draft ?? fromConfig;
  const parsed = textToOverrides(text);
  const hasProblems = parsed.errors.length > 0 || parsed.unknownTokens.length > 0;

  return (
    <div>
      <Label htmlFor={id}>All overrides, as text</Label>
      <p className="mt-1 text-sm text-muted-foreground">
        One <code className="rounded bg-muted px-1 font-mono text-xs text-foreground">name, colour</code> per
        line. This is the same editor the old theme builder had, and it writes the same overrides as the
        fields above.
      </p>
      <Textarea
        id={id}
        value={text}
        rows={8}
        spellCheck={false}
        aria-invalid={parsed.errors.length > 0 || undefined}
        onChange={(e) => {
          const values = textToOverrides(e.target.value).values;
          setDraft(e.target.value);
          ours.current = overridesToText(values);
          dispatch({ type: "set-overrides", values });
        }}
        className="mt-3 font-mono text-xs"
      />
      {hasProblems && (
        <div role="status" className="mt-2 space-y-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          {parsed.errors.map((e, i) => (
            <p key={i} className="flex items-start gap-2 text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{e}</span>
            </p>
          ))}
          {parsed.unknownTokens.length > 0 && (
            <p className="text-muted-foreground">Not a theme colour, so skipped: {parsed.unknownTokens.join(", ")}.</p>
          )}
        </div>
      )}
    </div>
  );
}
