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
    // Measured, but not the whole contract React is held to. Angular's kx-card is static — it has no link or
    // button card — so only the resting rows (edge, lift, grouped, static) run for it. A partial entry does
    // not count toward the graduation guard's visual parity: that needs the interactive states.
    partial: { Angular: { card: "resting surface only — Angular has no interactive Card (hover, pressed, selected, focus)" } },
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
];

/** The registry entry for a gate script, by its path relative to the repository root. */
export const gate = (script) => {
  const entry = VISUAL_GATES.find((g) => g.script === script);
  if (!entry) throw new Error(`visual-gates: ${script} is not registered`);
  return entry;
};
