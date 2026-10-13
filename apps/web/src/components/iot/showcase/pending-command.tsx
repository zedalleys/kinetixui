"use client";

/**
 * PendingCommand: the compact, glance-level presentation of a command's lifecycle. Showcase code, not part of
 * `@kinetixui/iot` — every environment on /iot uses it (three real callers), so it lives beside the other
 * showcase primitives rather than in the package's public API.
 *
 * It replaces an always-visible protocol timeline with one line that says what is happening, in the order a
 * person asks:
 *
 *   normal        nothing — the confirmed value beside it is the whole story
 *   requested     "Changing to Unlocked"
 *   acknowledged  "Waiting for device", "Unlocked requested" beneath (the device has the request; NOT confirmed)
 *   confirmed     "Confirmed: Unlocked" for a few seconds of the simulated clock, then nothing again
 *   failed        what failed and why, with Retry, and the full request record one press away
 *
 * The state machine underneath is untouched: this reads `lifecycle.stage` and decides nothing about the
 * device. The requested value is never drawn as the confirmed one — it is only ever the object of
 * "Changing to". The full record (stage, acknowledgement, attempts, times, requested and reported values)
 * is in a closed "Request details" disclosure: Level 3, progressively disclosed, never removed.
 *
 * Live region: one polite `role="status"` line, mounted from the first render so its first message is
 * announced, and silent when there is nothing to say. The details hold no second live region.
 */
import * as React from "react";
import { CommandFeedback } from "@kinetixui/iot/react";
import { canRetryLifecycle, isLifecyclePending, parseTimestamp, type KinetixCommandLifecycle } from "@kinetixui/iot/functions";
import { cn } from "@/lib/utils";
import { Disclosure, StateGlyph, STATE_TEXT } from "./primitives";

/** How long a confirmation stays on screen, on the simulated clock, before the line settles back to nothing. */
export const CONFIRMATION_MS = 4000;

const FAILED = new Set(["failed", "timed-out", "unreachable"]);

export type PendingCommandView = "none" | "changing" | "waiting" | "confirmed" | "failed";

/** Which compact state a lifecycle is in at `now`. Pure, so it is tested without rendering. */
export function pendingCommandView(lifecycle: KinetixCommandLifecycle | undefined | null, now?: string | number | Date): PendingCommandView {
  if (!lifecycle) return "none";
  const { stage } = lifecycle;
  if (stage === "requested" || stage === "retrying") return "changing";
  if (stage === "acknowledged") return "waiting";
  if (FAILED.has(stage)) return "failed";
  if (stage === "confirmed") {
    const settled = parseTimestamp(lifecycle.settledAt ?? null);
    const at = parseTimestamp(now ?? null);
    if (!settled || !at) return "none";
    const age = at.getTime() - settled.getTime();
    return age >= 0 && age < CONFIRMATION_MS ? "confirmed" : "none";
  }
  return "none";
}

const SMALL_BUTTON = cn(
  "inline-flex min-h-11 items-center rounded-lg px-3 text-label-lg md:min-h-9",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
);

/** Whether the lifecycle has a record worth reading: a request in flight or one that failed. */
export const hasRequestRecord = (view: PendingCommandView) => view === "changing" || view === "waiting" || view === "failed";

export function PendingCommand({
  lifecycle,
  formatValue,
  onRetry,
  onCancel,
  now,
  failureTitle,
  subject,
  action,
  reserve = false,
  details = true,
  className,
}: {
  lifecycle: KinetixCommandLifecycle | undefined | null;
  formatValue?: (value: unknown) => string;
  onRetry?: () => void;
  onCancel?: () => void;
  /** The simulated clock, so a confirmation settles away deterministically. */
  now?: string | number | Date;
  /** Names what did not happen, e.g. "The valve did not move". Defaults to the lifecycle's own headline. */
  failureTitle?: string;
  /** The device, for the buttons' accessible names: "Cancel the Front door lock request". */
  subject?: string;
  /**
   * The next action at rest (e.g. an "Unlock" button). It sits in the same row the request line takes over, so
   * asking, waiting and confirming happen in one place and the card does not grow. Shown again with the brief
   * confirmation, so the next action is never more than one step away.
   */
  action?: React.ReactNode;
  /** Keep the row's one-line height even when there is nothing to say, so a request does not push the card. */
  reserve?: boolean;
  /** Render the closed "Request details" here. Pass `false` when the card puts them in its own "Details". */
  details?: boolean;
  className?: string;
}) {
  // The simulated clock can stop right after a confirmation (reduced motion holds time while nothing is in
  // flight, or the user pauses), which would leave "Confirmed" up for good. A wall-clock timer ends it too.
  const settledKey = lifecycle?.stage === "confirmed" ? (lifecycle.settledAt ?? null) : null;
  const [expiredKey, setExpiredKey] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!settledKey) return;
    const id = setTimeout(() => setExpiredKey(settledKey), CONFIRMATION_MS);
    return () => clearTimeout(id);
  }, [settledKey]);
  const simView = pendingCommandView(lifecycle, now);
  const view = simView === "confirmed" && settledKey !== null && expiredKey === settledKey ? "none" : simView;
  const format = (v: unknown) => (v === undefined || v === null ? "Unknown" : (formatValue ?? String)(v));
  const want = lifecycle ? format(lifecycle.requestedValue) : "";
  const have = lifecycle ? format(lifecycle.confirmedValue) : "";
  const who = subject ? `${subject}: ` : "";

  let line: React.ReactNode = null;
  let spoken = "";
  if (lifecycle && view === "changing") {
    const retrying = lifecycle.stage === "retrying";
    line = (
      <>
        <StateGlyph state="pending" className={STATE_TEXT.pending} />
        <span>
          {retrying ? "Retrying: changing to " : "Changing to "}
          <bdi className="font-semibold">{want}</bdi>
        </span>
      </>
    );
  } else if (lifecycle && view === "waiting") {
    line = (
      <>
        <StateGlyph state="pending" className={STATE_TEXT.pending} />
        <span className="flex min-w-0 flex-col">
          <span>Waiting for device</span>
          <span className="text-body-sm text-muted-foreground">
            <bdi>{want}</bdi> requested
          </span>
        </span>
      </>
    );
  } else if (lifecycle && view === "confirmed") {
    line = (
      <>
        <StateGlyph state="confirmed" className={STATE_TEXT.confirmed} />
        <span className="text-muted-foreground">
          {/* The glyph and the word carry it on a phone, beside the next action; the status line says "Confirmed". */}
          <span className="hidden sm:inline">Confirmed: </span>
          <bdi>{have}</bdi>
        </span>
      </>
    );
    spoken = `${who}Confirmed: the device reports ${have}.`;
  } else if (lifecycle && view === "failed") {
    const headline = failureTitle ?? (lifecycle.stage === "timed-out" ? "Timed out, may still apply" : lifecycle.stage === "unreachable" ? "Device unreachable" : "The change failed");
    line = (
      <>
        <StateGlyph state="warning" className={STATE_TEXT.warning} />
        <span>
          <span className="font-semibold">{headline}</span>
          {lifecycle.reason ? <span className="text-muted-foreground"> · {lifecycle.reason}</span> : null}
          {/* On a phone the reported word directly above already says it; the status line always does. */}
          <span className="hidden text-muted-foreground sm:inline">
            {" "}
            · Still reports <bdi>{have}</bdi>
          </span>
        </span>
      </>
    );
    spoken = `${failureTitle ? "" : who}${headline}. ${lifecycle.reason ? `${lifecycle.reason} ` : ""}${want} was not confirmed; the device reports ${have}.`;
  }
  // One sentence for the whole wait. "Sent", "acknowledged" and "retrying" are protocol, not news: the live
  // region says the request once, then only what the person needs next — confirmed, or what failed.
  if (lifecycle && (view === "changing" || view === "waiting")) spoken = `${who}Changing to ${want}. Not yet confirmed; the device reports ${have}.`;

  const active = hasRequestRecord(view);
  const retry = view === "failed" && onRetry !== undefined && lifecycle !== null && lifecycle !== undefined && canRetryLifecycle(lifecycle);
  const cancel = onCancel !== undefined && lifecycle !== null && lifecycle !== undefined && (isLifecyclePending(lifecycle) || view === "failed");
  const atRest = view === "none" || view === "confirmed";
  const rowVisible = line !== null || (atRest && action !== undefined) || reserve;

  // Focus follows the row: pressing the action replaces it with the request line, and the line with the next
  // action again. When focus was in the row and its button went away, it moves to the row's new first button
  // (Cancel, Retry, or the next action) instead of falling back to the page.
  const rowRef = React.useRef<HTMLDivElement>(null);
  const focusInRow = React.useRef(false);
  React.useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row || !focusInRow.current) return;
    const current = document.activeElement;
    if (current && current !== document.body && row.contains(current)) return;
    const target = row.querySelector<HTMLElement>("button:not([disabled])") ?? row;
    target.focus({ preventScroll: true });
  }, [view]);

  return (
    <div data-pending-command={view} className={cn("flex min-w-0 flex-col gap-2", !rowVisible && !active && "contents", className)}>
      <p role="status" className="sr-only">
        {spoken}
      </p>
      {rowVisible ? (
        // One row: what is happening, and — on the same row — the one action that applies to it.
        <div
          ref={rowRef}
          tabIndex={-1}
          data-command-row=""
          onFocus={() => (focusInRow.current = true)}
          onBlur={(event) => {
            const next = event.relatedTarget as Node | null;
            if (next ? !event.currentTarget.contains(next) : event.target.isConnected) focusInRow.current = false;
          }}
          className={cn(
            "flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl text-body-md text-foreground focus-visible:outline-none",
            reserve && "min-h-14",
            line && view !== "confirmed" && "px-3 py-1.5",
            view === "failed" ? "bg-warning/15" : view === "changing" || view === "waiting" ? "bg-primary/5" : "bg-transparent",
          )}
        >
          {line ? (
            // A floor on the words' width: when the row is short of room (a phone, 200% text) the buttons wrap beneath
            // the line rather than squeezing it into a column of broken words.
            <span aria-hidden="true" className={cn("flex min-w-0 flex-1 items-start gap-2 [&>svg]:mt-0.5", view === "confirmed" ? "basis-auto" : "basis-36")}>
              {line}
            </span>
          ) : null}
          {active && (retry || cancel) ? (
            <span className="flex flex-wrap gap-2">
              {retry ? (
                <button type="button" onClick={onRetry} aria-label={subject ? `Retry ${subject}: ${want}` : undefined} className={cn(SMALL_BUTTON, "bg-primary text-primary-foreground")}>
                  Retry
                </button>
              ) : null}
              {cancel ? (
                <button
                  type="button"
                  onClick={onCancel}
                  aria-label={view === "failed" ? (subject ? `Dismiss the ${subject} failure` : undefined) : subject ? `Cancel the ${subject} request` : "Cancel request"}
                  className={cn(SMALL_BUTTON, view === "failed" ? "bg-card text-foreground" : "bg-card/80 text-foreground")}
                >
                  {/* Short on screen so the row fits a phone in one line; the accessible name says what it cancels. */}
                  {view === "failed" ? "Dismiss" : "Cancel"}
                </button>
              ) : null}
            </span>
          ) : null}
          {atRest && action !== undefined ? <span className={cn("flex min-w-0 flex-wrap gap-2", line ? "" : "flex-1")}>{action}</span> : null}
        </div>
      ) : null}
      {lifecycle && active && details ? <RequestDetails lifecycle={lifecycle} format={format} /> : null}
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (d: Date) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;

/** Level 3: the whole record of the request, closed by default and never removed. */
export function RequestDetails({ lifecycle, format, nested = false }: { lifecycle: KinetixCommandLifecycle; format: (v: unknown) => string; nested?: boolean }) {
  const ack = parseTimestamp(lifecycle.ackAt ?? null);
  return (
    <Disclosure title="Request details" defaultOpen={false} className={cn("bg-muted/40 shadow-none [&>summary]:min-h-11 [&>summary]:py-2 [&>summary]:text-body-md", nested && "bg-card")}>
      <div data-request-details="" className="flex min-w-0 flex-col gap-3">
        <CommandFeedback lifecycle={lifecycle} formatValue={format} density="full" />
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-label-md">
          <dt className="text-muted-foreground">Requested</dt>
          <dd className="m-0 text-foreground">
            <bdi>{format(lifecycle.requestedValue)}</bdi>
          </dd>
          <dt className="text-muted-foreground">Device reports</dt>
          <dd className="m-0 text-foreground">
            <bdi>{format(lifecycle.confirmedValue)}</bdi>
          </dd>
          <dt className="text-muted-foreground">Acknowledged</dt>
          <dd className="m-0 tabular-nums text-foreground">{ack ? <time dateTime={ack.toISOString()}>{clock(ack)}</time> : "Not reported"}</dd>
          <dt className="text-muted-foreground">Attempts</dt>
          <dd className="m-0 tabular-nums text-foreground">
            {lifecycle.attempts} of {lifecycle.maxAttempts}
          </dd>
        </dl>
      </div>
    </Disclosure>
  );
}
