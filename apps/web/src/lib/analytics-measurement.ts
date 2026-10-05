/**
 * The marketing measurement model, as data: which emitted events count as Qualified Evaluation and Adoption
 * Intent, and how a stream of events becomes SESSION counts.
 *
 * `marketing/analytics.md` §3 and §4 own these definitions. This module is their executable form and nothing
 * more: no UI imports it and nothing here is ever emitted (a `qualified_evaluation` event would be a second
 * source of truth — analytics.md §3). It exists so a test can fail when the strategy, the event contract and
 * the emitters stop agreeing, and so the session-counting rule is written down once, in code, instead of
 * being re-derived by whoever builds the next PostHog query.
 *
 * Change a signal here only together with analytics.md — `analytics-measurement.test.ts` compares the two.
 */
import type { AnalyticsCtaTarget, AnalyticsEventName } from "./analytics";

/** One qualifying signal: an event, or `cta_clicked` with one of the listed targets. */
export type MeasurementSignal = { event: Exclude<AnalyticsEventName, "cta_clicked"> } | { event: "cta_clicked"; targets: readonly AnalyticsCtaTarget[] };

/** analytics.md §3. A session qualifies on any one of these. */
export const QUALIFIED_EVALUATION_SIGNALS = [
  { event: "component_viewed" },
  { event: "component_code_copied" },
  { event: "block_code_copied" },
  { event: "platform_selected" },
  { event: "cta_clicked", targets: ["platform_coverage", "platform_availability", "view_verification"] },
  { event: "installation_viewed" },
] as const satisfies readonly MeasurementSignal[];

/** analytics.md §4. The signal list IS the definition: Adoption Intent does not require evaluation. */
export const ADOPTION_INTENT_SIGNALS = [
  { event: "installation_viewed" },
  { event: "install_command_copied" },
  { event: "cli_command_copied" },
  { event: "cta_clicked", targets: ["adopt_tokens", "adopt_components", "adopt_blocks"] },
] as const satisfies readonly MeasurementSignal[];

/** The minimum of a captured event this model reads. `target` is the `cta_clicked` property. */
export interface MeasuredEvent {
  event: string;
  /** PostHog's `$session_id` — the unit every Tier 1 rate counts */
  sessionId: string;
  timestamp: number;
  target?: string;
  /** the event's `kx_campaign`, when attribution carried one */
  campaign?: string;
}

function matches(signals: readonly MeasurementSignal[], e: Pick<MeasuredEvent, "event" | "target">): boolean {
  return signals.some((s) => s.event === e.event && (!("targets" in s) || (typeof e.target === "string" && (s.targets as readonly string[]).includes(e.target))));
}

export const isQualifiedEvaluation = (e: Pick<MeasuredEvent, "event" | "target">) => matches(QUALIFIED_EVALUATION_SIGNALS, e);
export const isAdoptionIntent = (e: Pick<MeasuredEvent, "event" | "target">) => matches(ADOPTION_INTENT_SIGNALS, e);

export interface SessionSummary {
  /** every session the site received events from: the denominator of QE Rate and Adoption Intent Rate */
  eligibleSessions: number;
  /** sessions in which at least one event carried a `kx_campaign` */
  attributedSessions: number;
  qualifiedEvaluationSessions: number;
  adoptionIntentSessions: number;
  /** sessions with an intent signal at or after the session's first QE signal (analytics.md §4) */
  progressionSessions: number;
}

/**
 * Events → session counts. Every count is of DISTINCT sessions: five qualifying events in one session are one
 * Qualified Evaluation session, never five.
 *
 * A session is attributed when ANY of its events carries a campaign, not only its first one. `kx_*` session
 * entry lives in the tab's sessionStorage while PostHog's `$session_id` spans tabs, so an evaluation in a tab
 * opened from a campaign landing can carry no campaign of its own while still belonging to that session.
 */
export function summarizeSessions(events: readonly MeasuredEvent[]): SessionSummary {
  const sessions = new Map<string, MeasuredEvent[]>();
  for (const e of events) sessions.set(e.sessionId, [...(sessions.get(e.sessionId) ?? []), e]);

  const summary: SessionSummary = { eligibleSessions: sessions.size, attributedSessions: 0, qualifiedEvaluationSessions: 0, adoptionIntentSessions: 0, progressionSessions: 0 };
  for (const list of sessions.values()) {
    if (list.some((e) => e.campaign)) summary.attributedSessions++;
    const qe = list.filter(isQualifiedEvaluation);
    const intent = list.filter(isAdoptionIntent);
    if (qe.length) summary.qualifiedEvaluationSessions++;
    if (intent.length) summary.adoptionIntentSessions++;
    if (qe.length && intent.length) {
      const firstQe = Math.min(...qe.map((e) => e.timestamp));
      if (intent.some((e) => e.timestamp >= firstQe)) summary.progressionSessions++;
    }
  }
  return summary;
}
