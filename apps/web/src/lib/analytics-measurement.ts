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
import { DIAGNOSTIC_TRAFFIC_TYPE } from "./analytics-attribution";

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

/**
 * analytics.md §4 "Eligible arriving session". A session counts as an arrival only if it holds at least one of
 * these: our manual `$pageview`, or any event in the `AnalyticsEvents` contract. Every contract event is fired by
 * a page of this site, on render or on a click, so each one proves the visitor was on a page.
 *
 * Deliberately NOT here:
 *  - `$pageleave`. The SDK fires it on `pagehide`, and when a tab sat idle past PostHog's 30-minute session
 *    timeout, that one event opens a NEW `$session_id` with nothing else in it (posthog-js
 *    `SessionIdManager`). Counting it would count the earlier visit twice.
 *  - any other event name, including `$`-prefixed SDK events and names nobody declared. It is an allowlist so
 *    an event added later cannot inflate the denominator without someone deciding it should.
 */
export const ARRIVAL_EVENTS = [
  "$pageview",
  "cta_clicked",
  "docs_viewed",
  "installation_viewed",
  "cli_command_copied",
  "install_command_copied",
  "component_viewed",
  "component_code_copied",
  "platform_selected",
  "github_clicked",
  "npm_clicked",
  "changelog_viewed",
  "external_link_clicked",
  "preset_shared",
  "preset_code_copied",
  "preset_loaded",
  "preset_randomized",
  "create_export_target_selected",
  "create_export_copied",
  "iot_example_copied",
  "block_code_copied",
] as const satisfies readonly ("$pageview" | AnalyticsEventName)[];

// A compile error here means an event was added to `AnalyticsEvents` without deciding whether it proves arrival.
type UnlistedEvent = Exclude<AnalyticsEventName, (typeof ARRIVAL_EVENTS)[number]>;
const arrivalListIsExhaustive: [UnlistedEvent] extends [never] ? true : UnlistedEvent = true;
void arrivalListIsExhaustive;

export const isArrivalEvent = (event: string) => (ARRIVAL_EVENTS as readonly string[]).includes(event);

/** The minimum of a captured event this model reads. `target` is the `cta_clicked` property. */
export interface MeasuredEvent {
  event: string;
  /** PostHog's `$session_id` — the unit every Tier 1 rate counts */
  sessionId: string;
  timestamp: number;
  target?: string;
  /** the event's `kx_campaign`, when attribution carried one */
  campaign?: string;
  /** the event's `kx_traffic_type`, set only on diagnostic traffic */
  trafficType?: string;
  /** PostHog's anonymous `distinct_id`: the unit of Returning evaluators, and of nothing else */
  distinctId?: string;
}

function matches(signals: readonly MeasurementSignal[], e: Pick<MeasuredEvent, "event" | "target">): boolean {
  return signals.some((s) => s.event === e.event && (!("targets" in s) || (typeof e.target === "string" && (s.targets as readonly string[]).includes(e.target))));
}

export const isQualifiedEvaluation = (e: Pick<MeasuredEvent, "event" | "target">) => matches(QUALIFIED_EVALUATION_SIGNALS, e);
export const isAdoptionIntent = (e: Pick<MeasuredEvent, "event" | "target">) => matches(ADOPTION_INTENT_SIGNALS, e);

export interface SessionSummary {
  /** sessions with at least one `ARRIVAL_EVENTS` event and no diagnostic marking: the denominator of QE Rate and Adoption Intent Rate */
  eligibleSessions: number;
  /** sessions left out because an event in them carried `kx_traffic_type = diagnostic`; reported, never counted */
  diagnosticSessions: number;
  /** eligible sessions in which at least one event carried a `kx_campaign` */
  attributedSessions: number;
  qualifiedEvaluationSessions: number;
  adoptionIntentSessions: number;
  /** sessions with an intent signal at or after the session's first QE signal (analytics.md §4) */
  progressionSessions: number;
  /** anonymous IDs with Qualified Evaluation in ≥2 eligible sessions: the one count whose unit is not the session */
  returningEvaluators: number;
}

/**
 * Events → session counts. Every count is of DISTINCT sessions: five qualifying events in one session are one
 * Qualified Evaluation session, never five.
 *
 * A session is attributed when ANY of its events carries a campaign, not only its first one. `kx_*` session
 * entry lives in the tab's sessionStorage while PostHog's `$session_id` spans tabs, so an evaluation in a tab
 * opened from a campaign landing can carry no campaign of its own while still belonging to that session.
 *
 * Every count is over ELIGIBLE sessions only. A session is dropped first if any of its events is diagnostic,
 * then if none of its events proves arrival (`ARRIVAL_EVENTS`). A `$pageleave`-only session still carries the
 * tab's `kx_campaign`, so attribution must be filtered by eligibility too, not only the denominator.
 */
export function summarizeSessions(events: readonly MeasuredEvent[]): SessionSummary {
  const sessions = new Map<string, MeasuredEvent[]>();
  for (const e of events) sessions.set(e.sessionId, [...(sessions.get(e.sessionId) ?? []), e]);

  const summary: SessionSummary = { eligibleSessions: 0, diagnosticSessions: 0, attributedSessions: 0, qualifiedEvaluationSessions: 0, adoptionIntentSessions: 0, progressionSessions: 0, returningEvaluators: 0 };
  const qeSessionsByVisitor = new Map<string, number>();
  for (const list of sessions.values()) {
    if (list.some((e) => e.trafficType === DIAGNOSTIC_TRAFFIC_TYPE)) {
      summary.diagnosticSessions++;
      continue;
    }
    if (!list.some((e) => isArrivalEvent(e.event))) continue;
    summary.eligibleSessions++;
    if (list.some((e) => e.campaign)) summary.attributedSessions++;
    const qe = list.filter(isQualifiedEvaluation);
    const intent = list.filter(isAdoptionIntent);
    if (qe.length) {
      summary.qualifiedEvaluationSessions++;
      const visitor = list.find((e) => e.distinctId)?.distinctId;
      if (visitor) qeSessionsByVisitor.set(visitor, (qeSessionsByVisitor.get(visitor) ?? 0) + 1);
    }
    if (intent.length) summary.adoptionIntentSessions++;
    if (qe.length && intent.length) {
      const firstQe = Math.min(...qe.map((e) => e.timestamp));
      if (intent.some((e) => e.timestamp >= firstQe)) summary.progressionSessions++;
    }
  }
  for (const n of qeSessionsByVisitor.values()) if (n >= 2) summary.returningEvaluators++;
  return summary;
}
