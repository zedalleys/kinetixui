"use client";

import * as React from "react";
import type { KinetixPairingFailureCode, KinetixPairingRecoveryAction } from "../types/pairing";
import { getPairingFailure } from "../functions/pairing";
import { Glyph } from "./glyph";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * PairingFailure — a pairing problem, named, explained, and with a way out.
 *
 * Renders one entry of `KINETIX_PAIRING_FAILURES` (via `getPairingFailure`): a title, a plain
 * description of what was **observed** (the registry states no cause it cannot know), and the recovery
 * actions as buttons. `onAction(id, action)` is called with the action's id and the whole action, so
 * "retry", "back" and "cancel" — and product-specific ones like "open-settings" — go through one handler.
 *
 * `role="alert"`: the failure interrupts a flow the person is in the middle of, so it is announced when
 * it appears. That is the one place this package uses an assertive region, and it is on purpose; the
 * visible text says the same thing, so nothing depends on hearing it.
 *
 * It is visibly not a generic error: an octagon in a tinted tile, the word "Pairing problem", and — only where the
 * registry says the failure can leave a device half set up — a line saying so, so the product's undo is
 * offered rather than the person retrying into a mess. A `retry` action is dropped for a failure the
 * registry marks non-retryable, because offering it would be offering something that cannot help.
 */
export interface PairingFailureProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  code: KinetixPairingFailureCode | string | null | undefined;
  /** Called from any recovery button. */
  onAction?: (actionId: string, action: KinetixPairingRecoveryAction) => void;
  /** Replace the recovery actions, e.g. to localise labels or add a product action. */
  actions?: readonly KinetixPairingRecoveryAction[];
  /** Localised title / description overrides. Blank strings fall back to the registry's. */
  title?: string;
  description?: string;
  /** Label above the title. Defaults to "Pairing problem". */
  eyebrow?: string;
}

const BUTTON =
  "inline-flex min-h-11 items-center rounded-full px-5 text-label-lg transition-colors duration-fast motion-reduce:transition-none md:min-h-9 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const PairingFailure = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, PairingFailureProps>(
  ({ code, onAction, actions, title, description, eyebrow, className, ...props }, ref) => {
    const uid = React.useId();
    const info = getPairingFailure(code);
    const list = (actions ?? info.recovery).filter((a) => !(a.kind === "retry" && !info.retryable));
    // The first action is the registry's recommendation, so it takes the primary treatment.
    return (
      <div
        ref={ref}
        role="alert"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-desc`}
        data-failure-code={info.code}
        className={cn("flex min-w-0 flex-col gap-4 rounded-container bg-destructive/5 p-5 font-sans", className)}
        {...props}
      >
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive">
            <Glyph name="octagon" size={22} />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="m-0 text-label-md text-destructive">{eyebrow?.trim() ? eyebrow : "Pairing problem"}</p>
            <p id={`${uid}-title`} className="m-0 break-words text-title-md text-foreground">
              {title?.trim() ? title : info.title}
            </p>
            <p id={`${uid}-desc`} className="m-0 break-words text-body-md text-muted-foreground">
              {description?.trim() ? description : info.description}
            </p>
            {info.needsCleanup ? (
              <p data-needs-cleanup="" className="m-0 mt-1 flex items-start gap-1.5 text-body-sm text-foreground">
                <Glyph name="info" size={14} className="mt-0.5" />
                This step can leave setup partly finished on the device.
              </p>
            ) : null}
          </div>
        </div>

        {list.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {list.map((action, index) => (
              <button
                key={action.id}
                type="button"
                data-action={action.id}
                data-kind={action.kind}
                onClick={() => onAction?.(action.id, action)}
                className={cn(BUTTON, index === 0 ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-background text-foreground shadow-sm hover:bg-muted")}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  },
), "PairingFailure");

export { PairingFailure };
