"use client";

import * as React from "react";
import type { KinetixCapabilitySupport } from "../types/device-state";
import type { KinetixControlState, KinetixLockRequest, KinetixLockState, KinetixLockStrategy } from "../types/control";
import { LOCK_SENTENCE, describeLockState, lockActions, normalizeLockState, resolveLockStrategy } from "../functions/lock";
import { cn } from "./cn";
import { ControlAnnouncer, ControlOutcomeNote, SupportNote, useControlContract, type ControlContractProps } from "./control-outcome";
import { withDisplayName } from "./display-name";

/**
 * DeviceLockControl — a lock that never says "Locked" before the lock does.
 *
 * Security-sensitive, so the rules are stricter than the other controls':
 *
 * - **"Locked" is only ever the device's word.** The closed padlock, the word "Locked" and the
 *   `data-lock-state="locked"` hook appear only when the device *reports* locked. While a request is
 *   open the headline is its direction — "Locking" — and the reported state stays named beside it.
 * - **No `optimistic`.** The `strategy` prop accepts `confirmed` (default) and `hybrid` only; an
 *   `optimistic` passed from untyped code is drawn as `confirmed` (`resolveLockStrategy`). `hybrid`
 *   leads with the direction ("Locking") and an in-progress mark; `confirmed` leads with the reported
 *   state ("Unlocked") and marks the request beside it. Neither draws the secure state early.
 * - **An action, not a switch.** A lock is operated by a named button — "Lock", "Unlock" — because
 *   pressing it starts something that may not finish. A jammed or unknown lock offers both.
 *
 * A report that the lock moved without a request (someone turned the thumb-turn) updates the state as
 * any report does. A late reply to a superseded request is refused by the lifecycle, so it cannot
 * confirm a newer one; nothing in this component decides that itself.
 */
export interface DeviceLockControlProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">, Omit<ControlContractProps<KinetixLockState>, "strategy"> {
  /** What the device last reported. Ignored when a `lifecycle` is passed. */
  state?: KinetixLockState | boolean | null;
  /** What the user asked for, while unconfirmed. Ignored with a `lifecycle`. */
  requested?: KinetixLockRequest | null;
  /** `confirmed` (default) or `hybrid`. `optimistic` is not accepted for a lock. */
  strategy?: KinetixLockStrategy;
  /** Accessible name, e.g. "Front door". The buttons read "Lock Front door", "Unlock Front door". */
  label: string;
  control?: KinetixControlState;
  /** From `resolveCapabilitySupport`. `read-only` shows the state without buttons; `unsupported` says so. */
  support?: KinetixCapabilitySupport;
  /** Called with the state being requested. The component never assumes it succeeded. */
  onRequest?: (next: KinetixLockRequest) => void;
}

const ICON = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", focusable: "false" } as const;

/** Each state's silhouette differs, so none depends on colour: shackle closed, shackle open, warning, dash, dashed ring. */
function LockGlyph({ kind }: { kind: "locked" | "unlocked" | "jammed" | "unknown" | "moving" }) {
  if (kind === "moving") {
    return (
      <svg {...ICON} data-lock-glyph="moving">
        <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />
        <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (kind === "jammed") {
    return (
      <svg {...ICON} data-lock-glyph="jammed">
        <path d="M12 3 2.5 20h19Z" />
        <path d="M12 10v4M12 17h.01" />
      </svg>
    );
  }
  if (kind === "unknown") {
    return (
      <svg {...ICON} data-lock-glyph="unknown">
        <rect x="5" y="11" width="14" height="9" rx="2" strokeDasharray="3 2" />
        <path d="M9.5 15.5h5" />
      </svg>
    );
  }
  return (
    <svg {...ICON} data-lock-glyph={kind}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      {kind === "locked" ? <path d="M8 11V8a4 4 0 0 1 8 0v3" /> : <path d="M8 11V7a4 4 0 0 1 7.5-2" />}
    </svg>
  );
}

const DeviceLockControl = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, DeviceLockControlProps>(
  ({ state, requested, label, control: controlProp, support = "supported", lifecycle, strategy, announce, onRequest, className, ...props }, ref) => {
    const { presentation, control, announcement } = useControlContract<KinetixLockState>(
      {
        lifecycle,
        // Coerced here, once: an untyped `optimistic` never reaches the presentation.
        strategy: resolveLockStrategy(strategy),
        announce,
        control: controlProp,
        reported: normalizeLockState(state),
        requested: requested === undefined || requested === null ? undefined : requested,
      },
      LOCK_SENTENCE,
    );
    const reported = normalizeLockState(presentation.reportedValue);
    const asked = presentation.pending && presentation.pendingValue !== undefined ? normalizeLockState(presentation.pendingValue) : undefined;
    const wanted: KinetixLockRequest | undefined = asked === "locked" || asked === "unlocked" ? asked : undefined;
    const pending = wanted !== undefined && wanted !== reported;
    // Read off the presentation, never off the strategy's name. `hybrid` leads with the direction.
    const leadsWithRequest = pending && presentation.valueSource === "requested";
    const headline = leadsWithRequest ? describeLockState(reported, wanted) : describeLockState(reported);
    const glyph = leadsWithRequest ? "moving" : reported;

    const labelId = React.useId();
    const descriptionId = React.useId();
    const interactive = control ? control.interactive : true;
    const described = control?.description && control.availability !== "ready";

    if (support === "unsupported") return <SupportNote nodeRef={ref} label={label} className={className} {...props} />;

    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={labelId}
        aria-busy={pending || undefined}
        data-strategy={presentation.strategy}
        // The device's word, only. Never the request's.
        data-lock-state={reported}
        data-pending={pending ? "" : undefined}
        className={cn("flex min-w-0 flex-col gap-3", className)}
        {...props}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "grid size-12 shrink-0 place-items-center rounded-full border-2",
              reported === "locked" && !leadsWithRequest ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-foreground",
              pending && "border-dashed border-primary",
            )}
          >
            <LockGlyph kind={glyph} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span id={labelId} className="text-label-lg text-muted-foreground">
              {label}
            </span>
            <span data-lock-headline="" data-value-source={leadsWithRequest ? "requested" : "reported"} className={cn("break-words text-title-lg", leadsWithRequest ? "text-muted-foreground" : "text-foreground")}>
              {headline}
            </span>
            {pending ? (
              <span
                data-requested=""
                className="inline-flex w-fit max-w-full animate-pulse items-center rounded-full border border-dashed border-primary bg-primary/10 px-2.5 py-0.5 text-label-md text-foreground motion-reduce:animate-none"
              >
                <span className="min-w-0 break-words">
                  {leadsWithRequest
                    ? `Waiting for the device. It still reports ${describeLockState(reported).toLowerCase()}`
                    : `${describeLockState(reported, wanted)}, not yet confirmed`}
                </span>
              </span>
            ) : null}
            {described ? (
              <span id={descriptionId} className="break-words text-label-md text-muted-foreground">
                {control!.description}
              </span>
            ) : null}
            {support === "read-only" ? <span className="text-label-md text-muted-foreground">Read only on this device</span> : null}
          </span>
        </div>

        {support === "supported" ? (
          <div className="flex flex-wrap gap-2">
            {lockActions(reported).map((action) => {
              const verb = action === "locked" ? "Lock" : "Unlock";
              return (
                <button
                  key={action}
                  type="button"
                  aria-label={`${verb} ${label}`}
                  aria-describedby={described ? descriptionId : undefined}
                  aria-busy={pending || undefined}
                  disabled={!interactive}
                  data-lock-action={action}
                  onClick={() => onRequest?.(action)}
                  className={cn(
                    "inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-label-lg font-medium md:min-h-9",
                    "transition-colors duration-fast ease-enter motion-reduce:transition-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    "forced-colors:focus-visible:outline forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-55",
                    action === "locked" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-input bg-background text-foreground hover:bg-muted",
                  )}
                >
                  {verb}
                </button>
              );
            })}
          </div>
        ) : null}

        <ControlOutcomeNote presentation={presentation} sentence={LOCK_SENTENCE} />
        <ControlAnnouncer announcement={announcement} />
      </div>
    );
  },
), "DeviceLockControl");

export { DeviceLockControl };
