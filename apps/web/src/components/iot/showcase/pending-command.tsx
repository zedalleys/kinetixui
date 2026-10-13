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
 *   acknowledged  "Waiting for device" (the device has the request; it has NOT confirmed it)
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

export function PendingCommand({
  lifecycle,
  formatValue,
  onRetry,
  onCancel,
  now,
  failureTitle,
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
  className?: string;
}) {
  const view = pendingCommandView(lifecycle, now);
  const format = (v: unknown) => (v === undefined || v === null ? "Unknown" : (formatValue ?? String)(v));
  const want = lifecycle ? format(lifecycle.requestedValue) : "";
  const have = lifecycle ? format(lifecycle.confirmedValue) : "";

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
    spoken = `${retrying ? "Retrying, changing" : "Changing"} to ${want}. Not yet confirmed; the device reports ${have}.`;
  } else if (lifecycle && view === "waiting") {
    line = (
      <>
        <StateGlyph state="pending" className={STATE_TEXT.pending} />
        <span>
          Waiting for device <span className="text-muted-foreground">· <bdi>{want}</bdi> requested</span>
        </span>
      </>
    );
    spoken = `Waiting for the device. It has the request for ${want} but has not confirmed it; it reports ${have}.`;
  } else if (lifecycle && view === "confirmed") {
    line = (
      <>
        <StateGlyph state="confirmed" className={STATE_TEXT.confirmed} />
        <span className="text-muted-foreground">
          Confirmed: <bdi>{have}</bdi>
        </span>
      </>
    );
    spoken = `Confirmed: the device reports ${have}.`;
  } else if (lifecycle && view === "failed") {
    const headline = failureTitle ?? (lifecycle.stage === "timed-out" ? "Timed out, may still apply" : lifecycle.stage === "unreachable" ? "Device unreachable" : "The change failed");
    line = (
      <>
        <StateGlyph state="warning" className={STATE_TEXT.warning} />
        <span>
          <span className="font-semibold">{headline}</span>
          {lifecycle.reason ? <span className="text-muted-foreground"> · {lifecycle.reason}</span> : null}
          <span className="block text-body-sm text-muted-foreground">
            Still reports <bdi>{have}</bdi>
          </span>
        </span>
      </>
    );
    spoken = `${headline}. ${lifecycle.reason ? `${lifecycle.reason} ` : ""}${want} was not confirmed; the device reports ${have}.`;
  }

  const active = view === "changing" || view === "waiting" || view === "failed";
  const retry = view === "failed" && onRetry !== undefined && lifecycle !== null && lifecycle !== undefined && canRetryLifecycle(lifecycle);
  const cancel = onCancel !== undefined && lifecycle !== null && lifecycle !== undefined && (isLifecyclePending(lifecycle) || view === "failed");

  return (
    <div data-pending-command={view} className={cn("flex min-w-0 flex-col gap-2", view === "none" && "contents", className)}>
      <p role="status" className="sr-only">
        {spoken}
      </p>
      {line ? (
        // One row: what is happening, and — on the same row — the one action that applies to it.
        <div
          className={cn(
            "flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl px-3 py-2 text-body-md text-foreground",
            view === "failed" ? "bg-warning/15" : view === "confirmed" ? "bg-transparent px-0" : "bg-primary/5",
          )}
        >
          <span aria-hidden="true" className="flex min-w-0 items-start gap-2 [&>svg]:mt-0.5">
            {line}
          </span>
          {active && (retry || cancel) ? (
            <span className="flex flex-wrap gap-2">
              {retry ? (
                <button type="button" onClick={onRetry} className={cn(SMALL_BUTTON, "bg-primary text-primary-foreground")}>
                  Retry
                </button>
              ) : null}
              {cancel ? (
                <button type="button" onClick={onCancel} className={cn(SMALL_BUTTON, view === "failed" ? "bg-card text-foreground" : "bg-card/80 text-foreground")}>
                  {view === "failed" ? "Dismiss" : "Cancel request"}
                </button>
              ) : null}
            </span>
          ) : null}
        </div>
      ) : null}
      {lifecycle && active ? <RequestDetails lifecycle={lifecycle} format={format} /> : null}
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (d: Date) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;

/** Level 3: the whole record of the request, closed by default and never removed. */
function RequestDetails({ lifecycle, format }: { lifecycle: KinetixCommandLifecycle; format: (v: unknown) => string }) {
  const ack = parseTimestamp(lifecycle.ackAt ?? null);
  return (
    <Disclosure title="Request details" defaultOpen={false} className="bg-muted/40 shadow-none [&>summary]:min-h-11 [&>summary]:py-2 [&>summary]:text-body-md">
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
