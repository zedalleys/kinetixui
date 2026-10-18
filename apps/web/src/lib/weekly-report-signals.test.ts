import { describe, expect, it } from "vitest";
import {
  AI_CTA_TARGETS,
  AI_EVENTS,
  ARRIVAL_EVENTS as REPORT_ARRIVAL_EVENTS,
  QE_CTA_TARGETS,
  QE_EVENTS,
  RENDER_EVENTS,
} from "../../../../scripts/marketing-weekly-report.mjs";
import { ADOPTION_INTENT_SIGNALS, ARRIVAL_EVENTS, QUALIFIED_EVALUATION_SIGNALS, type MeasurementSignal } from "./analytics-measurement";

/**
 * The weekly report (scripts/marketing-weekly-report.mjs) counts Qualified Evaluation and Adoption Intent in HogQL,
 * so it carries its own copy of the signal lists. This test is what keeps that copy equal to the executable
 * definitions here: a signal added to analytics-measurement.ts and not to the report fails CI, instead of quietly
 * undercounting a week.
 */
const split = (signals: readonly MeasurementSignal[]) => ({
  events: signals.filter((s) => s.event !== "cta_clicked").map((s) => s.event).sort(),
  targets: signals.flatMap((s) => ("targets" in s ? [...s.targets] : [])).sort(),
});

describe("weekly report signal lists match analytics-measurement.ts", () => {
  it("Qualified Evaluation", () => {
    expect({ events: [...QE_EVENTS].sort(), targets: [...QE_CTA_TARGETS].sort() }).toEqual(split(QUALIFIED_EVALUATION_SIGNALS));
  });

  it("Adoption Intent", () => {
    expect({ events: [...AI_EVENTS].sort(), targets: [...AI_CTA_TARGETS].sort() }).toEqual(split(ADOPTION_INTENT_SIGNALS));
  });

  it("arrival events", () => {
    expect([...REPORT_ARRIVAL_EVENTS].sort()).toEqual([...ARRIVAL_EVENTS].sort());
  });

  it("render-only events are real arrival events (or $pageleave), and none is a click", () => {
    for (const e of RENDER_EVENTS) if (e !== "$pageleave") expect(ARRIVAL_EVENTS as readonly string[]).toContain(e);
    expect(RENDER_EVENTS).not.toContain("cta_clicked");
    expect(RENDER_EVENTS).not.toContain("page_engaged");
  });
});
