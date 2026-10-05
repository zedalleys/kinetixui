/**
 * visual-gates.mjs — which rendered visual/state gates exist, and what each one measures, per platform.
 *
 * A rendered visual gate (one that drives states in a real browser and reads pixels back) is evidence about
 * specific components on specific platforms. This is the one place that says which. The gates read their own
 * platform list from here, so an entry cannot claim a platform its gate does not run, and
 * `check:angular-graduation` reads it to decide whether Angular's VISUAL dimension is met.
 *
 * `partial` names coverage that is real but narrower than React's for the same component, with the reason. The
 * graduation guard treats a partial entry as not yet covering that component.
 *
 * These are deliberately not a `visual` kind in verification.json: that kind means a comparison against a
 * stored reference image, and these gates store none (see the header of card-visual.mjs for why).
 */
export const VISUAL_GATES = [
  {
    script: "scripts/card-visual.mjs",
    command: "check:card-visual",
    contract: "TOKENS.md — Surface model / Card",
    covers: { React: ["card"], Angular: ["card"] },
  },
  {
    script: "scripts/selection-visual.mjs",
    command: "check:selection-visual",
    contract: "TOKENS.md — Selection controls",
    covers: {
      React: ["checkbox", "radio-group", "switch", "segmented-control"],
      Angular: ["checkbox", "radio-group", "switch", "segmented-control"],
    },
  },
  {
    script: "scripts/entry-visual.mjs",
    command: "check:entry-visual",
    contract: "TOKENS.md — Text entry and navigation",
    covers: {
      React: ["input", "textarea", "select", "native-select", "tabs"],
      Angular: ["input", "textarea", "native-select", "tabs"],
    },
  },
  {
    script: "scripts/composite-visual.mjs",
    command: "check:composite-visual",
    contract: "TOKENS.md — Composite fields",
    covers: {
      React: ["input-group", "number-input", "multi-select", "input-otp"],
      Angular: ["input-group", "number-input", "input-otp", "password-input"],
    },
  },
  {
    script: "scripts/navigation-visual.mjs",
    command: "check:navigation-visual",
    contract: "TOKENS.md — Navigation and disclosure",
    // Angular only: React's navigation components are not changed by Angular Wave B and are not measured here
    covers: {
      Angular: ["breadcrumb", "pagination", "table-of-contents", "tab-bar", "app-bar", "footer", "accordion"],
    },
  },
  {
    script: "scripts/overlay-visual.mjs",
    command: "check:overlay-visual",
    contract: "TOKENS.md — Overlays",
    // Angular only: React's overlays are not changed by Angular Wave C1 and are not measured here
    covers: {
      Angular: ["dialog", "alert-dialog", "modal", "sheet", "drawer", "popover", "tooltip", "hover-card"],
    },
  },
];

/** The registry entry for a gate script, by its path relative to the repository root. */
export const gate = (script) => {
  const entry = VISUAL_GATES.find((g) => g.script === script);
  if (!entry) throw new Error(`visual-gates: ${script} is not registered`);
  return entry;
};
