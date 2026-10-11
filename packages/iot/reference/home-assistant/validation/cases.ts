/**
 * Real-device validation cases for the four held `@kinetixui/iot` changesets (`.changeset-held/iot/`).
 *
 * Each case names the held change it covers, what the operator does, and the criteria the trace must
 * meet. `evaluateCase` judges only the automated part, over the trace entries recorded between the
 * operator's `case` and `end`. What the device physically did is the operator's observation, recorded
 * separately in the evidence record; neither stands in for the other.
 *
 * Outcomes: `pass`, `fail`, or `not-exercised` when the run never produced the situation the case is
 * about (the provider refused the command, the link never dropped). `not-exercised` is never a pass.
 */
import type { TraceEntry } from "./trace";

export type HeldChangeset = "iot-device-ledger" | "iot-lifecycle-edges" | "iot-offline-request-wording" | "iot-pending-pulse-offline";

export type CaseOutcome = "pass" | "fail" | "not-exercised";

export type CaseCheck = { name: string; ok: boolean; detail?: string };

export type CaseEvaluation = {
  outcome: CaseOutcome;
  checks: CaseCheck[];
  /** Measured, not judged: latencies and clock skew in milliseconds. */
  metrics: Record<string, number>;
  /** Why the case was not exercised, when it was not. */
  reason?: string;
};

export type ValidationCase = {
  id: string;
  title: string;
  changesets: HeldChangeset[];
  /** Needs an independent look at the device as well as the trace. */
  physical: boolean;
  steps: string[];
  /** What the trace must show. Mirrors `evaluateCase`. */
  criteria: string[];
  /** What the operator must see at the device. */
  observe: string;
  evaluate: (window: TraceEntry[]) => CaseEvaluation;
};

const OPEN = ["requested", "acknowledged", "retrying"];
const ms = (from?: string, to?: string) => (from && to ? Date.parse(to) - Date.parse(from) : undefined);

function result(checks: CaseCheck[], metrics: Record<string, number> = {}): CaseEvaluation {
  return { outcome: checks.every((c) => c.ok) ? "pass" : "fail", checks, metrics };
}
function notExercised(reason: string, checks: CaseCheck[] = [], metrics: Record<string, number> = {}): CaseEvaluation {
  // A check that already failed still fails the case: not-exercised never hides a broken rule.
  if (checks.some((c) => !c.ok)) return { ...result(checks, metrics), reason };
  return { outcome: "not-exercised", checks, metrics, reason };
}

/** Request entries made in this window, oldest first. */
const requests = (window: TraceEntry[]) =>
  window.filter((e) => e.cause === "request").map((e) => ({ entry: e, commandId: e.transitions?.find((t) => t.cause === "request")?.commandId }));

/** No connectivity signal ever changed the lifecycle stage of the validated capability. */
function linkNeverSettles(window: TraceEntry[]): CaseCheck {
  for (let i = 1; i < window.length; i++) {
    const entry = window[i]!;
    const onlyLink = entry.transitions?.length && entry.transitions.every((t) => t.cause === "connectivity");
    if (onlyLink && entry.view.stage !== window[i - 1]!.view.stage) {
      return { name: "a link change never settles, fails or times out a request", ok: false, detail: `seq ${entry.seq}: ${window[i - 1]!.view.stage} → ${entry.view.stage}` };
    }
  }
  return { name: "a link change never settles, fails or times out a request", ok: true };
}

/** The first entry at which the validated capability reached `confirmed` with `commandId`. */
function confirmedBy(window: TraceEntry[], commandId: string | undefined) {
  return window.find((e) => e.view.stage === "confirmed" && e.view.commandId === commandId);
}

export const VALIDATION_CASES: ValidationCase[] = [
  {
    id: "H01",
    title: "Initial snapshot matches the device",
    changesets: ["iot-device-ledger"],
    physical: true,
    steps: ["Start the runner with the device in a known state.", "Type `case H01`, look at the device, then `observe matches|differs`, then `end`."],
    criteria: ["The link is online.", "The reported power value is `on` or `off`, with no open request."],
    observe: "The device is physically in the state the trace reports.",
    evaluate(window) {
      const last = window.at(-1)!;
      return result([
        { name: "link online", ok: last.view.connectivity === "online", detail: last.view.connectivity },
        { name: "reported value known", ok: last.view.confirmedValue === "on" || last.view.confirmedValue === "off", detail: String(last.view.confirmedValue) },
        { name: "no request open", ok: !OPEN.includes(last.view.stage), detail: last.view.stage },
      ]);
    },
  },
  {
    id: "H02",
    title: "An acknowledgement never confirms; the device's report does",
    changesets: ["iot-device-ledger"],
    physical: true,
    steps: ["`case H02`", "Type the opposite of the device's current state (`on` or `off`) once.", "Wait for the device to change, `observe`, then `end`."],
    criteria: [
      "The request is recorded as `requested`.",
      "Home Assistant's `call_service` success moves it to `acknowledged` without changing the reported value.",
      "Only a report with the requested value moves it to `confirmed`.",
    ],
    observe: "The device changed to the requested state, and not before the command was sent.",
    evaluate(window) {
      const sent = requests(window);
      if (sent.length !== 1) return notExercised(`expected exactly one request in the window, saw ${sent.length}`);
      const { entry: request, commandId } = sent[0]!;
      const before = request.view.confirmedValue;
      const after = window.slice(window.indexOf(request) + 1);
      const ack = after.find((e) => e.transitions?.some((t) => t.cause === "acknowledgement" && t.commandId === commandId && !t.rejection));
      const confirmed = confirmedBy(after, commandId);
      const confirmCause = confirmed?.transitions?.find((t) => t.to === "confirmed")?.cause;
      const checks: CaseCheck[] = [
        { name: "request recorded as requested", ok: request.view.stage === "requested" },
        { name: "acknowledgement leaves the reported value unchanged", ok: !ack || (ack.view.stage !== "confirmed" && ack.view.confirmedValue === before), detail: ack ? `${ack.view.stage}, ${String(ack.view.confirmedValue)}` : "no acknowledgement in window" },
        { name: "confirmed only by a device report", ok: !confirmed || confirmCause === "report" || confirmCause === "snapshot", detail: confirmCause ?? "not confirmed" },
      ];
      const metrics: Record<string, number> = {};
      const ackMs = ms(request.view.sentAt, ack?.at);
      const confirmMs = ms(request.view.sentAt, confirmed?.at);
      if (ackMs !== undefined) metrics.ackLatencyMs = ackMs;
      if (confirmMs !== undefined) metrics.confirmLatencyMs = confirmMs;
      if (!ack) return notExercised("no acknowledgement arrived for the request", checks, metrics);
      if (!confirmed) return notExercised("the device never reported the requested value", checks, metrics);
      checks.push({ name: "confirmed value is the requested one", ok: confirmed.view.confirmedValue === request.view.requestedValue });
      return result(checks, metrics);
    },
  },
  {
    id: "H03",
    title: "Provider clock behind the application clock (M4A `receivedAt`)",
    changesets: ["iot-lifecycle-edges"],
    physical: false,
    steps: ["Evaluated over the same window as H02: `case H03`, one `on`/`off`, wait for the report, `end`."],
    criteria: [
      "Records the skew between the provider's observation time and the application's send time.",
      "When the provider's clock is behind (observation earlier than the send), the matching report still confirms.",
    ],
    observe: "Nothing to observe at the device.",
    evaluate(window) {
      const sent = requests(window);
      if (sent.length !== 1) return notExercised(`expected exactly one request in the window, saw ${sent.length}`);
      const confirmed = confirmedBy(window, sent[0]!.commandId);
      if (!confirmed) return notExercised("the request was never confirmed");
      const skew = ms(confirmed.view.sentAt, confirmed.view.reportedAt);
      if (skew === undefined) return notExercised("the provider sent no observation time");
      const metrics = { observedMinusSentMs: skew, receivedMinusObservedMs: ms(confirmed.view.reportedAt, confirmed.at)! };
      if (skew >= 0) return notExercised("the provider's clock was not behind the application's on this setup, so the M4A rule was not needed", [], metrics);
      return result([{ name: "a report observed before the send (provider clock behind) still confirms", ok: true, detail: `${skew} ms` }], metrics);
    },
  },
  {
    id: "H04",
    title: "A physical switch press is device truth, not a confirmation of anything",
    changesets: ["iot-device-ledger"],
    physical: true,
    steps: ["`case H04`", "Press the device's own button (or switch it at the wall) once. Do not type `on`/`off`.", "`observe`, then `end`."],
    criteria: ["No request in the window.", "The reported value changes.", "No request is confirmed or attributed to the change."],
    observe: "The device changed state because of the button press.",
    evaluate(window) {
      const first = window[0]!;
      const last = window.at(-1)!;
      const reports = window.filter((e) => e.transitions?.some((t) => t.cause === "report" && !t.rejection));
      if (requests(window).length) return result([{ name: "no request in the window", ok: false }]);
      if (!reports.length || last.view.confirmedValue === first.view.confirmedValue) return notExercised("no change was reported by the provider");
      return result([
        { name: "reported value changed", ok: true, detail: `${String(first.view.confirmedValue)} → ${String(last.view.confirmedValue)}` },
        { name: "no request settled by the change", ok: last.view.commandId === first.view.commandId && last.view.stage === first.view.stage, detail: `${first.view.stage} → ${last.view.stage}` },
      ]);
    },
  },
  {
    id: "H05",
    title: "Device link lost with a request open",
    changesets: ["iot-device-ledger", "iot-offline-request-wording", "iot-pending-pulse-offline"],
    physical: true,
    steps: [
      "`case H05`",
      "Cut the device's power (unplug it), then immediately type the opposite of its last state, before Home Assistant marks it unavailable.",
      "Wait until Home Assistant shows the entity as unavailable (integration-dependent; see the setup notes), then past the command timeout.",
      "`observe`, then `end`. Leave the device unplugged for H06.",
    ],
    criteria: [
      "A request is open when the link becomes `offline`.",
      "The link change leaves the request open (not failed, not timed out).",
      "While open and offline: availability `offline` or `unreachable`, description starts \"Device offline. The requested change is not confirmed.\" (or \"Device unreachable.\"), summary never says \"in progress\" (held wording change).",
      "If the timeout passes, the request reads `timed-out` (may still apply), never `failed`.",
    ],
    observe: "The device stayed off power and did not change state.",
    evaluate(window) {
      const sent = requests(window);
      if (!sent.length) return notExercised("no request was made in the window");
      const commandId = sent.at(-1)!.commandId;
      const offline = window.find((e) => e.transitions?.some((t) => t.cause === "connectivity" && (t.connectivity?.to === "offline" || t.connectivity?.to === "unreachable")));
      const link = linkNeverSettles(window);
      const rejected = window.find((e) => e.transitions?.some((t) => t.cause === "result" && t.commandId === commandId && t.to === "failed"));
      if (rejected && (!offline || rejected.seq < offline.seq)) {
        return notExercised(`the provider refused the command before the link dropped (code ${rejected.view.reasonCode ?? "none"}), so no request was open while offline`, [link]);
      }
      if (!offline) return notExercised("the provider never reported the device unavailable in this window", [link]);
      if (!OPEN.includes(offline.view.stage)) {
        return notExercised(`the request had already settled (${offline.view.stage}) before the link dropped; raise the timeout or use an integration that detects loss sooner`, [link]);
      }
      const word = offline.view.availability === "unreachable" ? "unreachable" : "offline";
      const checks: CaseCheck[] = [
        link,
        { name: "availability follows the lost link", ok: offline.view.availability === "offline" || offline.view.availability === "unreachable", detail: offline.view.availability },
        { name: "offline wording names the link and does not promise progress", ok: offline.view.description.startsWith(`Device ${word}. The requested change is not confirmed.`), detail: offline.view.description },
        { name: "summary does not call the request in progress", ok: !/in progress/.test(offline.view.summary), detail: offline.view.summary },
      ];
      const expired = window.find((e) => e.cause === "expire" && e.transitions?.some((t) => t.commandId === commandId));
      if (expired) checks.push({ name: "timeout reads may-still-apply, never failed", ok: expired.view.stage === "timed-out", detail: expired.view.stage });
      return result(checks, { offlineAfterSendMs: ms(offline.view.sentAt, offline.at) ?? 0 });
    },
  },
  {
    id: "H06",
    title: "Device returns: the link alone confirms nothing",
    changesets: ["iot-device-ledger"],
    physical: true,
    steps: ["Run straight after H05, with its request still open or timed out.", "`case H06`, plug the device back in, wait for Home Assistant to show it again, `observe`, `end`."],
    criteria: [
      "The link returns to `online`.",
      "The link change alone never settles the request.",
      "If the device comes back in the requested state, its report confirms the request (late confirmation).",
      "If it comes back in the old state, the request stays unconfirmed.",
    ],
    observe: "The state the device came back in (most plugs restore their last state or default off: note which).",
    evaluate(window) {
      const back = window.find((e) => e.transitions?.some((t) => t.cause === "connectivity" && t.connectivity?.to === "online" && t.connectivity.from !== "online"));
      const link = linkNeverSettles(window);
      if (![...OPEN, "timed-out"].includes(window[0]!.view.stage)) return notExercised("no request was open or timed out when the case started; run H05 first", [link]);
      if (!back) return notExercised("the provider never reported the device back online in this window", [link]);
      const last = window.at(-1)!;
      const requested = window[0]!.view.requestedValue;
      const checks: CaseCheck[] = [link, { name: "link back online", ok: last.view.connectivity === "online" }];
      if (requested !== undefined && last.view.confirmedValue === requested) {
        checks.push({ name: "matching report confirms the open request", ok: last.view.stage === "confirmed", detail: last.view.stage });
      } else {
        checks.push({ name: "request not confirmed by the return", ok: last.view.stage !== "confirmed" || last.view.commandId !== window[0]!.view.commandId, detail: last.view.stage });
      }
      return result(checks);
    },
  },
  {
    id: "H07",
    title: "Provider connection lost and restored",
    changesets: ["iot-device-ledger"],
    physical: false,
    steps: [
      "`case H07`, then restart the test Home Assistant (Settings → System → Restart) or drop its network. No device command is needed.",
      "Wait for the runner to reconnect (`status` shows phase `ready`), `end`.",
    ],
    criteria: [
      "The link becomes `connecting` while the provider is away, and that never moves a lifecycle stage.",
      "The session reconnects through a fresh snapshot.",
      "No command is sent again without an operator request (no replay).",
    ],
    observe: "Nothing to observe at the device beyond H02.",
    evaluate(window) {
      const link = linkNeverSettles(window);
      const away = window.find((e) => e.transitions?.some((t) => t.cause === "connectivity" && t.connectivity?.to === "connecting"));
      if (!away) return notExercised("the provider connection never dropped in this window", [link]);
      const back = window.find((e) => e.seq > away.seq && e.session.phase === "ready");
      const operatorSends = window.filter((e) => e.operator === "on" || e.operator === "off").length;
      const checks: CaseCheck[] = [
        link,
        { name: "reconnected through a snapshot", ok: Boolean(back) || window.at(-1)!.session.phase === "ready", detail: window.at(-1)!.session.phase },
        { name: "no request without an operator command", ok: requests(window).length <= operatorSends, detail: `${requests(window).length} requests, ${operatorSends} operator commands` },
      ];
      return result(checks, { reconnectMs: ms(away.at, (back ?? window.at(-1)!).at) ?? 0 });
    },
  },
  {
    id: "H09",
    title: "Rapid toggles: only the last request settles",
    changesets: ["iot-device-ledger", "iot-lifecycle-edges"],
    physical: true,
    steps: ["`case H09`", "Type `on`, `off`, `on` (or the reverse) as fast as you can.", "Wait for the device to settle, `observe`, `end`."],
    criteria: [
      "Three or more requests in the window.",
      "Replies to replaced requests never change the stage (refused as stale when they arrive).",
      "The capability ends confirmed under the last request's id with its value, or still open under that id.",
    ],
    observe: "The device ends in the last requested state.",
    evaluate(window) {
      const sent = requests(window);
      if (sent.length < 3) return notExercised(`expected at least three requests, saw ${sent.length}`);
      const last = sent.at(-1)!.commandId;
      const earlier = new Set(sent.slice(0, -1).map((s) => s.commandId));
      const lastIndex = window.indexOf(sent.at(-1)!.entry);
      const strayAfter = window.slice(lastIndex + 1).filter((e) => e.transitions?.some((t) => t.commandId && earlier.has(t.commandId) && !t.rejection && t.from !== t.to));
      const end = window.at(-1)!;
      const stale = window.flatMap((e) => e.transitions ?? []).filter((t) => t.rejection?.code === "stale-response").length;
      return result(
        [
          { name: "no replaced request changes the stage", ok: strayAfter.length === 0, detail: strayAfter.map((e) => e.seq).join(",") || undefined },
          { name: "ends under the last request", ok: end.view.commandId === last, detail: end.view.commandId },
          { name: "confirmed value is the last request's", ok: end.view.stage !== "confirmed" || end.view.confirmedValue === sent.at(-1)!.entry.view.requestedValue, detail: `${end.view.stage}, ${String(end.view.confirmedValue)}` },
        ],
        { requests: sent.length, staleRepliesRefused: stale },
      );
    },
  },
];

export function findCase(id: string): ValidationCase | undefined {
  return VALIDATION_CASES.find((c) => c.id === id);
}

export function evaluateCase(id: string, window: TraceEntry[]): CaseEvaluation {
  const found = findCase(id);
  if (!found) throw new Error(`Unknown case ${id}`);
  if (!window.length) return { outcome: "not-exercised", checks: [], metrics: {}, reason: "empty window" };
  return found.evaluate(window);
}
