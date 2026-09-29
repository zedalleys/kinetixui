import { describe, expect, it } from "vitest";
import {
  KINETIX_AUTOMATION_OPERATORS,
  addAction,
  addCondition,
  describeOperator,
  isAutomationRuleValid,
  moveItem,
  removeAction,
  removeCondition,
  summarizeAutomationRule,
  validateAutomationRule,
  type KinetixAutomationRule,
} from "./index";

const rule = (over: Partial<KinetixAutomationRule> = {}): KinetixAutomationRule => ({
  id: "r1",
  name: "Water when dry",
  enabled: true,
  trigger: { type: "metric", subject: "soil-moisture", scope: "greenhouse-a", operator: "lt", value: 28, unit: "%" },
  conditions: [],
  actions: [{ id: "a1", target: "zone-3", command: "open", durationMinutes: 12 }],
  ...over,
});
const codes = (r: KinetixAutomationRule | null) => validateAutomationRule(r).map((i) => `${i.path}:${i.code}`);

describe("validateAutomationRule", () => {
  it("accepts a well-formed rule", () => {
    expect(validateAutomationRule(rule())).toEqual([]);
    expect(isAutomationRuleValid(rule())).toBe(true);
  });
  it("requires a trigger and an action", () => {
    expect(codes(rule({ trigger: undefined, actions: [] }))).toEqual(["trigger:missing-trigger", "actions:missing-action"]);
    expect(isAutomationRuleValid(rule({ actions: [] }))).toBe(false);
  });
  it("requires id and name", () => {
    expect(codes(rule({ id: " ", name: "" }))).toEqual(["id:missing-id", "name:missing-name"]);
  });
  it("finds duplicate and missing ids within each list, with paths", () => {
    const c = { id: "c", subject: "x", operator: "is-detected" as const, join: "and" as const };
    expect(codes(rule({ conditions: [c, c, { ...c, id: "" }] }))).toEqual(["conditions[1].id:duplicate-id", "conditions[2].id:missing-id"]);
    const a = { id: "a", target: "t", command: "open" };
    expect(codes(rule({ actions: [a, a] }))).toEqual(["actions[1].id:duplicate-id"]);
  });
  it("checks values per operator", () => {
    const t = (operator: string, value?: unknown) => codes(rule({ trigger: { type: "metric", subject: "s", operator: operator as never, value: value as never } }));
    expect(t("lt")).toEqual(["trigger.value:missing-value"]);
    expect(t("lt", "abc")).toEqual(["trigger.value:invalid-value"]);
    expect(t("gt", NaN)).toEqual(["trigger.value:invalid-value"]);
    expect(t("gte", 3)).toEqual([]);
    expect(t("eq")).toEqual(["trigger.value:missing-value"]);
    expect(t("eq", "open")).toEqual([]);
    expect(t("neq", false)).toEqual([]);
    expect(t("eq", Infinity)).toEqual(["trigger.value:invalid-value"]);
    expect(t("changes-to", "closed")).toEqual([]);
    expect(t("changes-to")).toEqual(["trigger.value:missing-value"]);
    expect(t("is-detected")).toEqual([]);
    expect(t("after-time", "18:30")).toEqual([]);
    expect(t("before-time", "24:00")).toEqual(["trigger.value:invalid-time"]);
    expect(t("after-time", "6pm")).toEqual(["trigger.value:invalid-time"]);
    expect(t("after-time")).toEqual(["trigger.value:missing-value"]);
  });
  it("checks between ranges: shape, non-finite and min > max", () => {
    const t = (value?: unknown) => codes(rule({ trigger: { type: "metric", subject: "s", operator: "between", value: value as never } }));
    expect(t([10, 20])).toEqual([]);
    expect(t([10, 10])).toEqual([]);
    expect(t([20, 10])).toEqual(["trigger.value:invalid-range"]);
    expect(t([1])).toEqual(["trigger.value:invalid-value"]);
    expect(t([1, NaN])).toEqual(["trigger.value:invalid-value"]);
    expect(t(5)).toEqual(["trigger.value:invalid-value"]);
    expect(t()).toEqual(["trigger.value:missing-value"]);
  });
  it("rejects unknown operators and empty subjects", () => {
    expect(codes(rule({ trigger: { type: "metric", subject: " ", operator: "approx" as never, value: 1 } }))).toEqual(["trigger.subject:missing-subject", "trigger.operator:unknown-operator"]);
    expect(KINETIX_AUTOMATION_OPERATORS).toHaveLength(11);
  });
  it("validates conditions with their index and join", () => {
    const bad = { id: "c", subject: "", operator: "lt" as const, join: "xor" as never };
    expect(codes(rule({ conditions: [bad] }))).toEqual(["conditions[0].subject:missing-subject", "conditions[0].value:missing-value", "conditions[0].join:invalid-join"]);
  });
  it("validates actions: empty target, missing command, bad durations", () => {
    expect(codes(rule({ actions: [{ id: "a", target: " ", command: "" }] }))).toEqual(["actions[0].target:empty-target", "actions[0].command:missing-command"]);
    for (const durationMinutes of [0, -1, NaN, Infinity]) {
      expect(codes(rule({ actions: [{ id: "a", target: "t", command: "c", durationMinutes }] })), String(durationMinutes)).toEqual(["actions[0].durationMinutes:invalid-duration"]);
    }
    expect(codes(rule({ actions: [{ id: "a", target: "t", command: "c", durationMinutes: 0.5 }] }))).toEqual([]);
  });
  it("carries a human message on every issue and never throws on junk", () => {
    for (const issue of validateAutomationRule(rule({ trigger: undefined, actions: [], name: "" }))) expect(issue.message.length).toBeGreaterThan(0);
    expect(validateAutomationRule(null)).toHaveLength(1);
    expect(() => validateAutomationRule({ id: "x", name: "y", enabled: true, conditions: null, actions: [null] } as never)).not.toThrow();
  });
});

describe("immutable editing helpers", () => {
  const c = (id: string) => ({ id, subject: "s", operator: "is-detected" as const, join: "and" as const });
  it("addCondition inserts without mutating and clamps the index", () => {
    const base = rule({ conditions: [c("1"), c("2")] });
    const frozen = Object.freeze({ ...base, conditions: Object.freeze([...base.conditions]) as never });
    expect(addCondition(frozen, c("x")).conditions.map((x) => x.id)).toEqual(["1", "2", "x"]);
    expect(addCondition(frozen, c("x"), 1).conditions.map((x) => x.id)).toEqual(["1", "x", "2"]);
    expect(addCondition(frozen, c("x"), -5).conditions.map((x) => x.id)).toEqual(["x", "1", "2"]);
    expect(addCondition(frozen, c("x"), 99).conditions.map((x) => x.id)).toEqual(["1", "2", "x"]);
    expect(addCondition(frozen, c("x"), NaN).conditions.map((x) => x.id)).toEqual(["1", "2", "x"]);
    expect(base.conditions).toHaveLength(2);
  });
  it("removeCondition removes by id and returns the same rule for an unknown id", () => {
    const base = rule({ conditions: [c("1"), c("2")] });
    expect(removeCondition(base, "1").conditions.map((x) => x.id)).toEqual(["2"]);
    expect(removeCondition(base, "zzz")).toBe(base);
    expect(base.conditions).toHaveLength(2);
  });
  it("addAction and removeAction mirror them", () => {
    const base = rule();
    const next = addAction(base, { id: "a2", target: "t", command: "close" });
    expect(next.actions.map((a) => a.id)).toEqual(["a1", "a2"]);
    expect(base.actions).toHaveLength(1);
    expect(removeAction(next, "a1").actions.map((a) => a.id)).toEqual(["a2"]);
    expect(removeAction(next, "nope")).toBe(next);
  });
  it("moveItem reorders and is bounds-safe", () => {
    const list = ["a", "b", "c", "d"];
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(list, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveItem(list, 1, 99)).toEqual(["a", "c", "d", "b"]);
    expect(moveItem(list, 1, -9)).toEqual(["b", "a", "c", "d"]);
    for (const from of [-1, 4, 1.5, NaN]) expect(moveItem(list, from, 0)).toEqual(list);
    expect(moveItem(list, 2, NaN)).toEqual(list);
    expect(moveItem([], 0, 0)).toEqual([]);
    expect(moveItem(list, 1, 1)).not.toBe(list);
    expect(list).toEqual(["a", "b", "c", "d"]);
  });
});

describe("describeOperator", () => {
  it("phrases every operator for trigger and condition forms", () => {
    expect(describeOperator("lt")).toBe("falls below");
    expect(describeOperator("lt", "condition")).toBe("is below");
    expect(describeOperator("gt")).toBe("rises above");
    for (const op of KINETIX_AUTOMATION_OPERATORS) {
      expect(describeOperator(op).length).toBeGreaterThan(0);
      expect(describeOperator(op, "condition").length).toBeGreaterThan(0);
    }
    expect(describeOperator("weird")).toBe("weird");
  });
});

describe("summarizeAutomationRule", () => {
  const labels: Record<string, string> = { "soil-moisture": "soil moisture", "greenhouse-a": "Greenhouse A", "zone-3": "Zone 3 irrigation" };
  const label = (_kind: string, id: string) => labels[id];

  it("reads as the example sentence", () => {
    expect(summarizeAutomationRule(rule(), { label })).toBe("When soil moisture falls below 28% in Greenhouse A, open Zone 3 irrigation for 12 minutes.");
  });
  it("has neutral wording with no labeler, hard-coding no domain vocabulary", () => {
    expect(summarizeAutomationRule(rule())).toBe("When soil moisture falls below 28% in greenhouse a, open zone 3 for 12 minutes.");
  });
  it("adds conditions with their joins, no precedence implied", () => {
    const r = rule({
      conditions: [
        { id: "c1", subject: "time", operator: "after-time", value: "18:00", join: "and" },
        { id: "c2", subject: "rain", operator: "is-detected", join: "or" },
        { id: "c3", subject: "temperature", operator: "between", value: [5, 30], unit: "°C", join: "and" },
      ],
    });
    expect(summarizeAutomationRule(r, { label })).toBe(
      "When soil moisture falls below 28% in Greenhouse A, provided time is after 18:00 or rain is detected and temperature is between 5°C and 30°C, open Zone 3 irrigation for 12 minutes.",
    );
  });
  it("handles multiple actions, values, singular minute and word units", () => {
    const r = rule({
      trigger: { type: "metric", subject: "pressure", operator: "gte", value: 400, unit: "kPa" },
      actions: [
        { id: "1", target: "pump", command: "turn-off", durationMinutes: 1 },
        { id: "2", target: "fan", command: "set-speed", value: 3 },
      ],
    });
    expect(summarizeAutomationRule(r)).toBe("When pressure rises to or above 400 kPa, turn off pump for 1 minute, then set speed fan to 3.");
  });
  it("describes edges, detection and disabled rules", () => {
    const r = rule({ enabled: false, trigger: { type: "device-state", subject: "door", operator: "changes-to", value: "open" }, actions: [{ id: "1", target: "light", command: "turn-on" }] });
    expect(summarizeAutomationRule(r)).toBe("When door changes to open, turn on light. This rule is off.");
    expect(summarizeAutomationRule(rule({ trigger: { type: "event", subject: "motion", operator: "is-detected" } }))).toContain("When motion is detected,");
  });
  it("describes an incomplete rule as incomplete instead of guessing", () => {
    expect(summarizeAutomationRule(rule({ trigger: undefined, actions: [] }))).toBe("No trigger is set, and no action is set.");
  });
  it("falls back to the readable id when the labeler returns undefined", () => {
    expect(summarizeAutomationRule(rule(), { label: () => undefined })).toContain("When soil moisture");
  });
  it("is deterministic and does not mutate", () => {
    const r = rule();
    const copy = JSON.stringify(r);
    expect(summarizeAutomationRule(r)).toBe(summarizeAutomationRule(r));
    expect(JSON.stringify(r)).toBe(copy);
  });
});
