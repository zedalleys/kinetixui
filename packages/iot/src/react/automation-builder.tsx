"use client";

import * as React from "react";
import type {
  KinetixAutomationAction,
  KinetixAutomationCondition,
  KinetixAutomationIssue,
  KinetixAutomationOperator,
  KinetixAutomationRule,
  KinetixAutomationTrigger,
  KinetixAutomationValue,
} from "../types/automation";
import { KINETIX_AUTOMATION_OPERATORS } from "../types/automation";
import {
  addAction,
  addCondition,
  describeOperator,
  moveItem,
  removeAction,
  removeCondition,
  summarizeAutomationRule,
  validateAutomationRule,
} from "../functions/automation";
import { AutomationRuleView } from "./automation-rule-view";
import { valueKindOf } from "./automation-text";
import { Glyph } from "./glyph";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * AutomationBuilder — a structured form for one automation rule. No canvas, no drag.
 *
 * A **controlled** component: `value` in, `onChange` out with a new {@link KinetixAutomationRule}
 * built by the headless helpers (`addCondition`, `removeAction`, `moveItem`, …). It edits data; it
 * never executes anything, and nothing in the UI implies that it does.
 *
 * ## Structure
 * Three `<fieldset><legend>` sections — **Trigger**, **Conditions**, **Actions** — each field a real,
 * labelled `<select>` or `<input>`, and a **Summary** that restates the rule as a sentence
 * (`summarizeAutomationRule`). The summary is derived text: it is *not* a live region, so typing never
 * announces anything.
 *
 * ## Reordering without a pointer
 * Every condition and action has *Move up*, *Move down* and *Remove* buttons with specific names
 * ("Move condition 2 up", "Remove action 1"). After each add, remove or move, focus goes somewhere
 * sensible (the new item's first field; the next item's Remove button; the moved item's own move
 * button) and **one** polite status message says what happened. That status region is the only live
 * region in the component.
 *
 * ## Validation
 * `validateAutomationRule` is the only validator. Problems appear inline under their field
 * (`aria-invalid` + `aria-describedby`, with a glyph and the word "Error" — never colour alone) once a
 * field has been left or a submit attempted, and as a list at the top after a failed submit, whose
 * items move focus to the offending field. A blank draft is not shouted at on first render.
 *
 * ## What the product supplies
 * `subjects` (what can be watched), `targets` (what an action can act on, each with optional
 * `commands`) and optionally a subset of `operators`. Units come from `unitFor` or the subject. Vocabulary
 * is the product's; this component ships none.
 *
 * `readOnly` renders {@link AutomationRuleView} instead of a form; `disabled` disables every field.
 */
export type KinetixBuilderSubject = { id: string; label: string; unit?: string };
export type KinetixBuilderTarget = { id: string; label: string; commands?: readonly { id: string; label: string }[] };

export interface AutomationBuilderProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onChange" | "onSubmit"> {
  value: KinetixAutomationRule;
  onChange: (rule: KinetixAutomationRule) => void;
  subjects: readonly KinetixBuilderSubject[];
  targets: readonly KinetixBuilderTarget[];
  /** A subset of operators to offer. Defaults to all of them. */
  operators?: readonly KinetixAutomationOperator[];
  /** Unit for a subject, when it is not on the subject itself. */
  unitFor?: (subjectId: string) => string | undefined;
  /** The `type` given to a newly created trigger. Defaults to `"metric"`. */
  triggerType?: string;
  disabled?: boolean;
  readOnly?: boolean;
  /** Present → a Save button is rendered and validation runs on submit. Called only with a valid rule. */
  onSubmit?: (rule: KinetixAutomationRule) => void;
  /** Present → a Cancel button is rendered. */
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  /** Show validation problems immediately instead of after a field is left or a submit is attempted. */
  showValidation?: boolean;
  /** Accessible name of the form. Defaults to "Automation rule". */
  label?: string;
}

const INPUT =
  "min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-label-md text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background " +
  "disabled:cursor-not-allowed disabled:opacity-50";
const BUTTON =
  "inline-flex min-h-9 min-w-9 items-center justify-center gap-1 rounded-lg border border-input bg-background px-2.5 text-label-md text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background " +
  "disabled:cursor-not-allowed disabled:opacity-40";
const FIELDSET = "m-0 flex min-w-0 flex-col gap-3 rounded-xl border border-border p-3";
const LEGEND = "px-1 text-label-md text-foreground";
const FIELD = "flex min-w-0 grow basis-40 flex-col gap-1";

const slug = (path: string) => path.replace(/[^a-zA-Z0-9]+/g, "-").replace(/-$/, "");

/** A path the form has a control for. The two structural paths are pointed at their nearest control. */
const controlPath = (path: string) => (path === "trigger" ? "trigger.subject" : path === "actions" ? "actions.add" : path);

function nextId(prefix: string, existing: readonly { id: string }[]): string {
  const used = new Set(existing.map((e) => e.id));
  let n = existing.length + 1;
  while (used.has(`${prefix}-${n}`)) n += 1;
  return `${prefix}-${n}`;
}

/** "conditions[1].subject" → "Condition 2"; used to give each summary item its context. */
function issueContext(path: string): string {
  if (path === "name") return "Name";
  if (path.startsWith("trigger")) return "Trigger";
  if (path === "actions") return "Actions";
  const c = /^conditions\[(\d+)\]/.exec(path);
  if (c) return `Condition ${Number(c[1]) + 1}`;
  const a = /^actions\[(\d+)\]/.exec(path);
  if (a) return `Action ${Number(a[1]) + 1}`;
  return "Rule";
}

const AutomationBuilder = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLFormElement, AutomationBuilderProps>(
  (
    {
      value, onChange, subjects, targets, operators, unitFor, triggerType = "metric", disabled = false, readOnly = false,
      onSubmit, onCancel, submitLabel = "Save rule", cancelLabel = "Cancel", showValidation = false, label = "Automation rule", className, ...props
    },
    ref,
  ) => {
    const uid = React.useId();
    const rootRef = React.useRef<HTMLFormElement | null>(null);
    const summaryRef = React.useRef<HTMLDivElement | null>(null);
    const setRoot = React.useCallback(
      (node: HTMLFormElement | null) => {
        rootRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLFormElement | null>).current = node;
      },
      [ref],
    );

    const [submitted, setSubmitted] = React.useState(false);
    const [touched, setTouched] = React.useState<Record<string, true>>({});
    const [announcement, setAnnouncement] = React.useState("");
    const pendingFocus = React.useRef<{ key: string; from: KinetixAutomationRule } | null>(null);
    const focusSummary = React.useRef(false);

    const ops = operators && operators.length > 0 ? operators : KINETIX_AUTOMATION_OPERATORS;
    const conditions = value.conditions ?? [];
    const actions = value.actions ?? [];
    const issues = validateAutomationRule(value);
    const byPath = new Map<string, KinetixAutomationIssue[]>();
    for (const issue of issues) {
      const key = controlPath(issue.path);
      byPath.set(key, [...(byPath.get(key) ?? []), issue]);
    }

    const labelFor = (kind: "subject" | "scope" | "target", id: string): string | undefined =>
      kind === "subject" ? subjects.find((s) => s.id === id)?.label : kind === "target" ? targets.find((t) => t.id === id)?.label : undefined;

    // Focus follows an edit, but only once the parent has actually re-rendered with a new value —
    // otherwise a parent that ignores `onChange` would have focus yanked at some later, unrelated render.
    React.useEffect(() => {
      const pending = pendingFocus.current;
      if (pending && pending.from !== value && rootRef.current) {
        pendingFocus.current = null;
        const target = [...rootRef.current.querySelectorAll<HTMLElement>("[data-focus-key]")].find((el) => el.dataset.focusKey === pending.key);
        target?.focus();
      }
      if (focusSummary.current && summaryRef.current) {
        focusSummary.current = false;
        summaryRef.current.focus();
      }
    });

    const emit = (next: KinetixAutomationRule, focusKey?: string, message?: string) => {
      if (focusKey) pendingFocus.current = { key: focusKey, from: value };
      if (message !== undefined) setAnnouncement(message);
      onChange(next);
    };

    const showErr = (path: string) => showValidation || submitted || touched[path] === true;
    const idFor = (path: string) => `${uid}-${slug(path)}`;
    const messagesFor = (path: string) => (showErr(path) ? (byPath.get(path) ?? []) : []);

    /** The props every control needs to be invalid, described and to mark itself touched on blur. */
    const a11y = (path: string, extraDescribedBy?: string) => {
      const errors = messagesFor(path);
      const describedBy = [errors.length > 0 ? `${idFor(path)}-error` : null, extraDescribedBy].filter(Boolean).join(" ") || undefined;
      return {
        id: idFor(path),
        "aria-invalid": errors.length > 0 ? (true as const) : undefined,
        "aria-describedby": describedBy,
        onBlur: () => setTouched((t) => (t[path] ? t : { ...t, [path]: true })),
        className: cn(INPUT, errors.length > 0 ? "border-destructive" : "border-input"),
        disabled,
      };
    };

    const errorText = (path: string) => {
      const errors = messagesFor(path);
      if (errors.length === 0) return null;
      return (
        <p id={`${idFor(path)}-error`} data-error={path} className="flex items-start gap-1.5 text-label-sm text-destructive">
          <Glyph name="triangle" size={12} className="mt-0.5" />
          <span>
            <span className="sr-only">Error: </span>
            {errors.map((e) => e.message).join(" ")}
          </span>
        </p>
      );
    };

    const field = (path: string, text: string, control: React.ReactNode, hint?: React.ReactNode) => (
      <div className={FIELD}>
        <label htmlFor={idFor(path)} className="text-label-sm text-muted-foreground">
          {text}
        </label>
        {control}
        {hint}
        {errorText(path)}
      </div>
    );

    const select = (path: string, text: string, current: string, options: readonly { id: string; label: string }[], onPick: (id: string) => void, focusKey?: string) =>
      field(
        path,
        text,
        <select {...a11y(path)} value={current} data-focus-key={focusKey} onChange={(e) => onPick(e.target.value)}>
          <option value="">Choose…</option>
          {/* A current value the product no longer offers stays selectable so the form does not silently drop it. */}
          {current !== "" && !options.some((o) => o.id === current) ? <option value={current}>{current}</option> : null}
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>,
      );

    const numberValue = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? String(v) : "");
    const toNumber = (text: string): number | undefined => (text.trim() === "" ? undefined : Number(text));

    /** The comparison fields shared by the trigger and every condition. */
    const comparison = (
      base: string,
      item: { subject: string; operator: KinetixAutomationOperator; value?: KinetixAutomationValue; unit?: string },
      form: "trigger" | "condition",
      patch: (p: Partial<KinetixAutomationTrigger & KinetixAutomationCondition>) => void,
      subjectFocusKey?: string,
    ) => {
      const kind = valueKindOf(item.operator);
      const unit = item.unit ?? unitFor?.(item.subject) ?? subjects.find((s) => s.id === item.subject)?.unit;
      const range = Array.isArray(item.value) ? (item.value as readonly [number, number]) : undefined;
      return (
        <>
          {select(
            `${base}.subject`,
            "What to watch",
            item.subject ?? "",
            subjects,
            (id) => patch({ subject: id, unit: unitFor?.(id) ?? subjects.find((s) => s.id === id)?.unit }),
            subjectFocusKey,
          )}
          {select(
            `${base}.operator`,
            "Comparison",
            item.operator,
            ops.map((op) => ({ id: op, label: describeOperator(op, form) })),
            (id) => {
              const next = id as KinetixAutomationOperator;
              patch(valueKindOf(next) === kind ? { operator: next } : { operator: next, value: undefined });
            },
          )}
          {kind === "number"
            ? field(
                `${base}.value`,
                "Value",
                <input {...a11y(`${base}.value`)} type="number" step="any" inputMode="decimal" value={numberValue(item.value)} onChange={(e) => patch({ value: toNumber(e.target.value) })} />,
                unit ? <span className="text-label-sm text-muted-foreground">Unit: {unit}</span> : null,
              )
            : null}
          {kind === "scalar"
            ? field(
                `${base}.value`,
                "Value",
                <input {...a11y(`${base}.value`)} type="text" value={item.value === undefined || Array.isArray(item.value) ? "" : String(item.value)} onChange={(e) => patch({ value: e.target.value === "" ? undefined : e.target.value })} />,
              )
            : null}
          {kind === "time"
            ? field(
                `${base}.value`,
                "Time of day",
                <input {...a11y(`${base}.value`)} type="time" value={typeof item.value === "string" ? item.value : ""} onChange={(e) => patch({ value: e.target.value === "" ? undefined : e.target.value })} />,
              )
            : null}
          {kind === "range" ? (
            <>
              {field(
                `${base}.value`,
                "Minimum",
                <input
                  {...a11y(`${base}.value`)}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={numberValue(range?.[0])}
                  onChange={(e) => {
                    const min = toNumber(e.target.value);
                    const max = range?.[1];
                    patch({ value: min === undefined && (max === undefined || Number.isNaN(max)) ? undefined : [min ?? Number.NaN, max ?? Number.NaN] });
                  }}
                />,
                unit ? <span className="text-label-sm text-muted-foreground">Unit: {unit}</span> : null,
              )}
              <div className={FIELD}>
                <label htmlFor={`${idFor(`${base}.value`)}-max`} className="text-label-sm text-muted-foreground">
                  Maximum
                </label>
                <input
                  id={`${idFor(`${base}.value`)}-max`}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  disabled={disabled}
                  aria-invalid={messagesFor(`${base}.value`).length > 0 ? true : undefined}
                  aria-describedby={messagesFor(`${base}.value`).length > 0 ? `${idFor(`${base}.value`)}-error` : undefined}
                  className={cn(INPUT, messagesFor(`${base}.value`).length > 0 ? "border-destructive" : "border-input")}
                  value={numberValue(range?.[1])}
                  onBlur={() => setTouched((t) => (t[`${base}.value`] ? t : { ...t, [`${base}.value`]: true }))}
                  onChange={(e) => {
                    const max = toNumber(e.target.value);
                    const min = range?.[0];
                    patch({ value: max === undefined && (min === undefined || Number.isNaN(min)) ? undefined : [min ?? Number.NaN, max ?? Number.NaN] });
                  }}
                />
              </div>
            </>
          ) : null}
        </>
      );
    };

    /* ---------------------------------------------------------------- trigger */
    const trigger: KinetixAutomationTrigger = value.trigger ?? { type: triggerType, subject: "", operator: ops[0] ?? "lt" };
    const patchTrigger = (p: Partial<KinetixAutomationTrigger>) => emit({ ...value, trigger: { ...trigger, ...p } });

    /* ------------------------------------------------------------- conditions */
    const patchCondition = (index: number, p: Partial<KinetixAutomationCondition>) =>
      emit({ ...value, conditions: conditions.map((c, i) => (i === index ? { ...c, ...p } : c)) });

    const onAddCondition = () => {
      const id = nextId("condition", conditions);
      const next = addCondition(value, { id, subject: "", operator: ops[0] ?? "lt", join: "and" });
      emit(next, `condition:${id}:first`, `Condition ${conditions.length + 1} added. ${conditions.length + 1} in total.`);
    };
    const onRemoveCondition = (index: number) => {
      const id = conditions[index]!.id;
      const next = removeCondition(value, id);
      const remaining = next.conditions;
      const target = remaining[index] ?? remaining[index - 1];
      emit(next, target ? `condition:${target.id}:remove` : "condition:add", `Condition ${index + 1} removed. ${remaining.length} remaining.`);
    };
    const onMoveCondition = (index: number, to: number) => {
      const moved = conditions[index]!;
      const list = moveItem(conditions, index, to);
      const at = list.findIndex((c) => c.id === moved.id);
      const dir = to < index ? "up" : "down";
      const key = dir === "up" ? (at === 0 ? "down" : "up") : at === list.length - 1 ? "up" : "down";
      emit({ ...value, conditions: list }, `condition:${moved.id}:${key}`, `Condition moved ${dir} to position ${at + 1} of ${list.length}.`);
    };

    /* ---------------------------------------------------------------- actions */
    const patchAction = (index: number, p: Partial<KinetixAutomationAction>) =>
      emit({ ...value, actions: actions.map((a, i) => (i === index ? { ...a, ...p } : a)) });

    const onAddAction = () => {
      const id = nextId("action", actions);
      const next = addAction(value, { id, target: "", command: "" });
      emit(next, `action:${id}:first`, `Action ${actions.length + 1} added. ${actions.length + 1} in total.`);
    };
    const onRemoveAction = (index: number) => {
      const id = actions[index]!.id;
      const next = removeAction(value, id);
      const remaining = next.actions;
      const target = remaining[index] ?? remaining[index - 1];
      emit(next, target ? `action:${target.id}:remove` : "action:add", `Action ${index + 1} removed. ${remaining.length} remaining.`);
    };
    const onMoveAction = (index: number, to: number) => {
      const moved = actions[index]!;
      const list = moveItem(actions, index, to);
      const at = list.findIndex((a) => a.id === moved.id);
      const dir = to < index ? "up" : "down";
      const key = dir === "up" ? (at === 0 ? "down" : "up") : at === list.length - 1 ? "up" : "down";
      emit({ ...value, actions: list }, `action:${moved.id}:${key}`, `Action moved ${dir} to position ${at + 1} of ${list.length}.`);
    };

    const itemControls = (noun: "condition" | "action", id: string, index: number, count: number, move: (from: number, to: number) => void, remove: (i: number) => void) => (
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={BUTTON} disabled={disabled || index === 0} data-focus-key={`${noun}:${id}:up`} aria-label={`Move ${noun} ${index + 1} up`} title={`Move ${noun} ${index + 1} up`} onClick={() => move(index, index - 1)}>
          <svg aria-hidden="true" focusable="false" width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <path d="m3.5 10 4.5-4.5 4.5 4.5" />
          </svg>
        </button>
        <button type="button" className={BUTTON} disabled={disabled || index === count - 1} data-focus-key={`${noun}:${id}:down`} aria-label={`Move ${noun} ${index + 1} down`} title={`Move ${noun} ${index + 1} down`} onClick={() => move(index, index + 1)}>
          <svg aria-hidden="true" focusable="false" width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <path d="m3.5 6 4.5 4.5L12.5 6" />
          </svg>
        </button>
        <button type="button" className={BUTTON} disabled={disabled} data-focus-key={`${noun}:${id}:remove`} aria-label={`Remove ${noun} ${index + 1}`} onClick={() => remove(index)}>
          Remove
        </button>
      </div>
    );

    /* ----------------------------------------------------------------- submit */
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!onSubmit) return;
      setSubmitted(true);
      if (issues.length > 0) {
        focusSummary.current = true;
        return;
      }
      onSubmit(value);
    };

    const goToField = (event: React.MouseEvent, path: string) => {
      event.preventDefault();
      const el = rootRef.current ? (rootRef.current.querySelector(`[id="${idFor(path)}"]`) as HTMLElement | null) : null;
      el?.focus();
    };

    if (readOnly) {
      return (
        <div className={cn("font-sans", className)}>
          <AutomationRuleView rule={value} labelFor={labelFor} />
        </div>
      );
    }

    const titleId = `${uid}-title`;

    return (
      <form ref={setRoot} noValidate aria-label={label} onSubmit={handleSubmit} className={cn("flex min-w-0 flex-col gap-4 font-sans", className)} {...props}>
        {/* The one live region, and it is only ever written to after an add, remove or move. */}
        <p role="status" data-builder-status="" className="sr-only">
          {announcement}
        </p>

        {submitted && issues.length > 0 ? (
          <div ref={summaryRef} tabIndex={-1} data-error-summary="" aria-labelledby={titleId} role="group" className="flex flex-col gap-2 rounded-xl border border-destructive p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <p id={titleId} className="flex items-center gap-1.5 text-label-md text-destructive">
              <Glyph name="octagon" size={14} />
              <span>
                {issues.length} {issues.length === 1 ? "problem" : "problems"} to fix before this can be saved
              </span>
            </p>
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-label-sm">
              {issues.map((issue, i) => {
                const path = controlPath(issue.path);
                const linkable = issue.path !== "" && !/(^|\.)id$/.test(issue.path);
                return (
                  <li key={`${issue.path}-${issue.code}-${i}`}>
                    {linkable ? (
                      <a href={`#${idFor(path)}`} className="text-foreground underline underline-offset-2" onClick={(e) => goToField(e, path)}>
                        {issueContext(issue.path)}: {issue.message}
                      </a>
                    ) : (
                      <span className="text-foreground">
                        {issueContext(issue.path)}: {issue.message}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <fieldset disabled={disabled} className={FIELDSET}>
          <legend className={LEGEND}>Rule</legend>
          <div className="flex flex-wrap items-end gap-3">
            {field("name", "Rule name", <input {...a11y("name")} type="text" value={value.name ?? ""} onChange={(e) => emit({ ...value, name: e.target.value })} />)}
            <label className="flex min-h-11 items-center gap-2 text-label-md text-foreground">
              <input type="checkbox" className="size-4" checked={value.enabled} disabled={disabled} onChange={(e) => emit({ ...value, enabled: e.target.checked })} />
              <span>Rule is on</span>
            </label>
          </div>
        </fieldset>

        <fieldset disabled={disabled} className={FIELDSET}>
          <legend className={LEGEND}>Trigger</legend>
          <div className="flex flex-wrap gap-3">{comparison("trigger", trigger, "trigger", patchTrigger)}</div>
        </fieldset>

        <fieldset disabled={disabled} className={FIELDSET}>
          <legend className={LEGEND}>Conditions</legend>
          {conditions.length === 0 ? <p className="text-label-sm text-muted-foreground">No conditions. The rule applies whenever the trigger happens.</p> : null}
          {conditions.map((condition, index) => (
            <fieldset key={condition.id} disabled={disabled} data-condition={condition.id} className={FIELDSET}>
              <legend className={LEGEND}>Condition {index + 1}</legend>
              <div className="flex flex-wrap gap-3">
                {index > 0
                  ? select(
                      `conditions[${index}].join`,
                      "Combine with the one above using",
                      condition.join,
                      [
                        { id: "and", label: "And" },
                        { id: "or", label: "Or" },
                      ],
                      (id) => patchCondition(index, { join: id === "or" ? "or" : "and" }),
                    )
                  : null}
                {comparison(`conditions[${index}]`, condition, "condition", (p) => patchCondition(index, p), `condition:${condition.id}:first`)}
              </div>
              {itemControls("condition", condition.id, index, conditions.length, onMoveCondition, onRemoveCondition)}
            </fieldset>
          ))}
          <div>
            <button type="button" className={BUTTON} disabled={disabled} data-focus-key="condition:add" onClick={onAddCondition}>
              Add condition
            </button>
          </div>
        </fieldset>

        <fieldset disabled={disabled} className={FIELDSET}>
          <legend className={LEGEND}>Actions</legend>
          {actions.length === 0 ? <p className="text-label-sm text-muted-foreground">No actions yet.</p> : null}
          {actions.map((action, index) => {
            const commands = targets.find((t) => t.id === action.target)?.commands;
            return (
              <fieldset key={action.id} disabled={disabled} data-action={action.id} className={FIELDSET}>
                <legend className={LEGEND}>Action {index + 1}</legend>
                <div className="flex flex-wrap gap-3">
                  {select(`actions[${index}].target`, "Act on", action.target ?? "", targets, (id) => patchAction(index, { target: id, command: "" }), `action:${action.id}:first`)}
                  {commands && commands.length > 0
                    ? select(`actions[${index}].command`, "Do", action.command ?? "", commands, (id) => patchAction(index, { command: id }))
                    : field(
                        `actions[${index}].command`,
                        "Do",
                        <input {...a11y(`actions[${index}].command`)} type="text" value={action.command ?? ""} onChange={(e) => patchAction(index, { command: e.target.value })} />,
                      )}
                  {field(
                    `actions[${index}].value`,
                    "Value (optional)",
                    <input {...a11y(`actions[${index}].value`)} type="text" value={action.value === undefined ? "" : String(action.value)} onChange={(e) => patchAction(index, { value: e.target.value === "" ? undefined : e.target.value })} />,
                  )}
                  {field(
                    `actions[${index}].durationMinutes`,
                    "Run for, in minutes (optional)",
                    <input {...a11y(`actions[${index}].durationMinutes`)} type="number" min="0" step="any" inputMode="decimal" value={numberValue(action.durationMinutes)} onChange={(e) => patchAction(index, { durationMinutes: toNumber(e.target.value) })} />,
                  )}
                </div>
                {itemControls("action", action.id, index, actions.length, onMoveAction, onRemoveAction)}
              </fieldset>
            );
          })}
          <div className="flex min-w-0 flex-col gap-1">
            <div>
              <button
                type="button"
                {...{ id: idFor("actions.add") }}
                className={BUTTON}
                disabled={disabled}
                data-focus-key="action:add"
                aria-invalid={messagesFor("actions.add").length > 0 ? true : undefined}
                aria-describedby={messagesFor("actions.add").length > 0 ? `${idFor("actions.add")}-error` : undefined}
                onClick={onAddAction}
              >
                Add action
              </button>
            </div>
            {errorText("actions.add")}
          </div>
        </fieldset>

        <div role="group" aria-labelledby={`${uid}-summary`} data-builder-summary="" className="flex flex-col gap-1 rounded-xl border border-border bg-muted/40 p-3">
          <p id={`${uid}-summary`} className="text-label-md text-foreground">
            Summary
          </p>
          <p className="break-words text-label-md text-muted-foreground">{summarizeAutomationRule(value, { label: labelFor })}</p>
        </div>

        {onSubmit || onCancel ? (
          <div className="flex flex-wrap gap-2">
            {onSubmit ? (
              <button type="submit" disabled={disabled} className={cn(BUTTON, "min-h-11 border-transparent bg-primary px-4 text-primary-foreground")}>
                {submitLabel}
              </button>
            ) : null}
            {onCancel ? (
              <button type="button" disabled={disabled} className={cn(BUTTON, "min-h-11 px-4")} onClick={onCancel}>
                {cancelLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </form>
    );
  },
), "AutomationBuilder");

export { AutomationBuilder };
