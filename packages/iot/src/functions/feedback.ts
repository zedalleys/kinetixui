import type { KinetixCommandLifecycle } from "../types/command";
import type { KinetixCommandFeedback, KinetixCommandFeedbackTone } from "../types/monitoring";
import { canRetryLifecycle, describeCommandLifecycle, isLifecyclePending, type DescribeLifecycleOptions } from "./commands";

/**
 * Command feedback (M3): the words for where an existing {@link KinetixCommandLifecycle} stands.
 *
 * This is presentation over the lifecycle, never a second state machine: it reads `stage`, the two
 * values and the reason, and it decides nothing about what the device is doing. Reported state stays
 * authoritative; every sentence ends with what the device last reported.
 */

const HEADLINE: Record<KinetixCommandLifecycle["stage"], { headline: string; tone: KinetixCommandFeedbackTone }> = {
  idle: { headline: "No change requested", tone: "neutral" },
  requested: { headline: "Requested, not yet confirmed", tone: "pending" },
  acknowledged: { headline: "Acknowledged, not yet confirmed", tone: "pending" },
  retrying: { headline: "Retrying, not yet confirmed", tone: "pending" },
  confirmed: { headline: "Confirmed", tone: "success" },
  failed: { headline: "Failed", tone: "attention" },
  // A timeout is the application giving up waiting; the device may still carry the change out.
  "timed-out": { headline: "Timed out, may still apply", tone: "attention" },
  unreachable: { headline: "Device unreachable", tone: "attention" },
  // Cancelling withdraws the request. It says nothing about a rollback on the device.
  cancelled: { headline: "Cancelled", tone: "neutral" },
};

/**
 * Headline, sentence and tone for a lifecycle.
 *
 * - `requested`, `acknowledged` and `retrying` say "not yet confirmed"; only `confirmed` reads as done.
 * - `timed-out` says the change may still apply and invents no reported value.
 * - `unreachable` is its own headline, not "Failed".
 * - `cancelled` claims no rollback.
 */
export function describeCommandFeedback(lifecycle: KinetixCommandLifecycle, options: DescribeLifecycleOptions = {}): KinetixCommandFeedback {
  const { headline, tone } = HEADLINE[lifecycle.stage] ?? HEADLINE.idle;
  let sentence = describeCommandLifecycle(lifecycle, options);
  if (lifecycle.stage === "timed-out") sentence += " It may still apply.";
  return {
    stage: lifecycle.stage,
    headline,
    sentence,
    tone,
    pending: isLifecyclePending(lifecycle),
    retryable: canRetryLifecycle(lifecycle),
  };
}
