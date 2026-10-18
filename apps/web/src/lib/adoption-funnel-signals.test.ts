import { describe, expect, it } from "vitest";
import { INSTALL_SUCCESS as REPORT_INSTALL_SUCCESS, STAGES } from "../../../../scripts/adoption-funnel-report.mjs";
import { ADOPTION_FUNNEL_STAGES, ADOPTION_INTENT_SIGNALS, INSTALL_SUCCESS, isAdoptionIntent, isQualifiedEvaluation } from "./analytics-measurement";

/**
 * The funnel report counts its stages in HogQL, so it carries its own copy of `ADOPTION_FUNNEL_STAGES`. This keeps
 * the copy equal to the definitions, and holds the two rules the funnel exists under: it does not move QE or
 * Adoption Intent, and it has no install stage.
 */
const flatten = (signals: readonly { event: string; targets?: readonly string[]; platformed?: boolean }[]) => ({
  events: signals.filter((s) => s.event !== "cta_clicked" && !s.platformed).map((s) => s.event).sort(),
  platformed: signals.filter((s) => s.platformed).map((s) => s.event).sort(),
  targets: signals.flatMap((s) => s.targets ?? []).sort(),
});

describe("adoption funnel stages", () => {
  it("the report's stages equal ADOPTION_FUNNEL_STAGES, in order", () => {
    expect(STAGES.map((s) => s.stage)).toEqual(ADOPTION_FUNNEL_STAGES.map((s) => s.stage));
    for (const [i, s] of STAGES.entries()) {
      expect({ events: [...s.events].sort(), platformed: [...(s.platformed ?? [])].sort(), targets: [...s.targets].sort() }).toEqual(flatten(ADOPTION_FUNNEL_STAGES[i]!.signals));
    }
  });

  it("the last stage is exactly Adoption Intent, and no stage is an install", () => {
    expect(ADOPTION_FUNNEL_STAGES.at(-1)!.signals).toBe(ADOPTION_INTENT_SIGNALS);
    expect(INSTALL_SUCCESS).toBe("not observable");
    expect(REPORT_INSTALL_SUCCESS).toBe(INSTALL_SUCCESS);
  });

  it("verification inspection and a platformed setup-page view stay outside QE and Adoption Intent", () => {
    for (const event of ["verification_inspected", "docs_viewed"]) {
      expect(isQualifiedEvaluation({ event })).toBe(false);
      expect(isAdoptionIntent({ event })).toBe(false);
    }
  });
});
