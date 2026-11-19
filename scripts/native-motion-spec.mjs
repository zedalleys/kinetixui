/**
 * native-motion-spec.mjs — the data `check-native-motion.mjs` and `check-motion-tokens.mjs` enforce,
 * composed for both of them by `native-motion-ledger.mjs`.
 *
 * Separated from the gate for the same reason `motion-states.mjs` is separated from `motion.mjs`:
 * the declarations are the interesting part, they want to be read on their own, and a test needs them
 * without running the gate's IO. `apps/web/src/lib/native-motion-guard.test.ts` imports this to build
 * fixtures that satisfy the ledger, so the fixtures cannot drift out of step with it.
 */
/**
 * The animation primitives that mean "this component moves". Finding one in a file is not a defect —
 * it is the trigger for asking the only question this script asks: does that file, or the helper it
 * delegates to, answer to the reader's setting?
 *
 * `contractPlatform` is how a platform here names itself in `tokens/contracts/motion.json`, and it is
 * required. `check-motion-tokens.mjs` used to carry its own hardcoded map of the three keys below and
 * silently skip any platform missing from it, so a fourth platform added here — families, helpers,
 * members, its own test — was held by `check:native-motion` and never checked against the contract at
 * all. The mapping belongs to the platform that knows its own name; see `native-motion-ledger.mjs`.
 *
 * `contractRole` on a family is required too, and may be `null` only with a `roleExemption` reason
 * saying why that family implements no contract role. Absent is not the same as null: one is silence,
 * the other is a decision.
 */
export const PLATFORMS = {
  SwiftUI: {
    contractPlatform: "swiftui",
    dir: "packages/ui-swiftui/Sources/KinetixUI",
    ext: ".swift",
    animates: /withAnimation|\.animation\(|\.transition\(|AnyTransition|repeatForever|matchedGeometryEffect/,
    preference: /accessibilityReduceMotion/,
    families: {
      disclosure: {
        contractRole: "disclosure",
        helper: "KinetixDisclosureMotion.swift",
        members: ["Accordion.swift", "Collapsible.swift"],
        test: "packages/ui-swiftui/Tests/KinetixUITests/DisclosureMotionTests.swift",
        // A disclosure has an asymmetric pair of curves, so a member naming one direction and never
        // the other has unreachable code. A switch is symmetric and has no such pair, which is why
        // this is configured per family rather than per platform.
        directions: [/\.expanding\b/, /\.collapsing\b/],
      },
      selection: {
        contractRole: "selection-control",
        helper: "KinetixSwitchMotion.swift",
        members: ["Switch.swift"],
        test: "packages/ui-swiftui/Tests/KinetixUITests/SwitchMotionTests.swift",
      },
      // The second selection role, kept separate from `selection` above because the two durations are
      // separate by owner decision: a thumb lands on `instant`, a colour settles on `fast`.
      // ToggleGroup.swift is deliberately not a member — it is a pass-through to Toggle and animates
      // nothing of its own, and a member that never animates makes the family's wiring check vacuous.
      selectionState: {
        contractRole: "selection-state",
        helper: "KinetixSelectionMotion.swift",
        members: ["Toggle.swift", "Checkbox.swift", "RadioGroup.swift"],
        test: "packages/ui-swiftui/Tests/KinetixUITests/SelectionMotionTests.swift",
      },
      selectionIndicator: {
        contractRole: "selection-indicator",
        helper: "KinetixSelectionIndicator.swift",
        members: ["Tabs.swift", "SegmentedControl.swift"],
        test: "packages/ui-swiftui/Tests/KinetixUITests/SelectionIndicatorTests.swift",
      },
      slide: {
        contractRole: "spatial",
        // A panel that slides across the screen is positional movement, which is what Reduce Motion
        // exists to remove. The reduced form is a cross-fade. See the helper's header.
        // `strict`: the member must read the setting itself AND call the helper. A view can name a helper in a
        // comment or declare the environment value and never use either, so for the families whose whole job
        // is the reduced form, mere mention is not routing.
        strict: true,
        helper: "KinetixSlideMotion.swift",
        members: ["Sheet.swift", "Sidebar.swift", "Toaster.swift"],
        test: "packages/ui-swiftui/Tests/KinetixUITests/SlideMotionTests.swift",
      },
      loop: {
        contractRole: "loop",
        // A loop has no destination to keep, so its reduced form is not a shorter duration but no loop
        // at all plus a static state that says the same thing. See the helper's header.
        strict: true,
        helper: "KinetixLoopMotion.swift",
        members: ["Spinner.swift", "Skeleton.swift", "Marquee.swift", "MessageBubble.swift"],
        test: "packages/ui-swiftui/Tests/KinetixUITests/LoopMotionTests.swift",
      },
    },
  },
  Compose: {
    contractPlatform: "compose",
    dir: "packages/ui-compose/ui/src/main/kotlin/com/kinetixui/ui",
    ext: ".kt",
    // `animateScrollToPage` and friends are animations that match none of the composable or
    // `animate*AsState` patterns: they are verbs on a state object. Review caught Carousel animating
    // its way past this guard entirely — the one thing the guard exists to notice.
    animates:
      /animate[A-Z]\w*AsState|AnimatedVisibility|AnimatedContent|updateTransition|rememberInfiniteTransition|animateContentSize|animateScroll[A-Z]\w*|\.animateTo\(/,
    preference: /ANIMATOR_DURATION_SCALE|rememberReduceMotion/,
    families: {
      disclosure: {
        contractRole: "disclosure",
        helper: "KinetixDisclosureMotion.kt",
        members: ["Accordion.kt", "Collapsible.kt"],
        test: "packages/ui-compose/ui/src/test/kotlin/com/kinetixui/ui/DisclosureMotionTest.kt",
      },
      selection: {
        contractRole: "selection-control",
        helper: "KinetixSwitchMotion.kt",
        members: ["Switch.kt"],
        test: "packages/ui-compose/ui/src/test/kotlin/com/kinetixui/ui/SwitchMotionTest.kt",
      },
      // The second selection role, kept separate from `selection` above because the two durations are
      // separate by owner decision: a thumb lands on `instant`, a colour settles on `fast`.
      // ToggleGroup.kt is deliberately not a member — it is a pass-through to Toggle and animates
      // nothing of its own, and a member that never animates makes the family's wiring check vacuous.
      selectionIndicator: {
        contractRole: "selection-indicator",
        helper: "KinetixSelectionIndicator.kt",
        members: ["Tabs.kt", "SegmentedControl.kt"],
        test: "packages/ui-compose/ui/src/test/kotlin/com/kinetixui/ui/SelectionIndicatorTest.kt",
      },
      selectionState: {
        contractRole: "selection-state",
        helper: "KinetixSelectionMotion.kt",
        members: ["Toggle.kt", "Checkbox.kt", "RadioGroup.kt"],
        test: "packages/ui-compose/ui/src/test/kotlin/com/kinetixui/ui/SelectionMotionTest.kt",
      },
      loop: {
        contractRole: "loop",
        // A loop has no destination to keep, so its reduced form is not a shorter duration but no loop
        // at all plus a static state that says the same thing. See the helper's header.
        strict: true,
        helper: "KinetixLoopMotion.kt",
        members: ["Spinner.kt", "Skeleton.kt", "Marquee.kt", "MessageBubble.kt"],
        test: "packages/ui-compose/ui/src/test/kotlin/com/kinetixui/ui/LoopMotionTest.kt",
      },
    },
  },
  Flutter: {
    contractPlatform: "flutter",
    dir: "packages/ui-flutter/lib/src",
    ext: ".dart",
    animates: /Animated[A-Z]\w+|AnimationController|Tween|CurvedAnimation/,
    preference: /disableAnimationsOf|disableAnimations|reduceMotionOf|runsOf/,
    families: {
      disclosure: {
        contractRole: "disclosure",
        helper: "kinetix_disclosure_motion.dart",
        members: ["accordion.dart", "collapsible.dart"],
        test: "packages/ui-flutter/test/disclosure_motion_test.dart",
      },
      selection: {
        contractRole: "selection-control",
        helper: "kinetix_switch_motion.dart",
        members: ["switch.dart"],
        test: "packages/ui-flutter/test/switch_motion_test.dart",
      },
      // The second selection role, kept separate from `selection` above because the two durations are
      // separate by owner decision: a thumb lands on `instant`, a colour settles on `fast`.
      // toggle_group.dart is deliberately not a member — it is a pass-through to toggle.dart and
      // animates nothing of its own, and a member that never animates makes the wiring check vacuous.
      selectionIndicator: {
        contractRole: "selection-indicator",
        helper: "kinetix_selection_indicator.dart",
        members: ["tabs.dart", "segmented_control.dart"],
        test: "packages/ui-flutter/test/selection_indicator_test.dart",
      },
      selectionState: {
        contractRole: "selection-state",
        helper: "kinetix_selection_motion.dart",
        members: ["toggle.dart", "checkbox.dart", "radio_group.dart"],
        test: "packages/ui-flutter/test/selection_motion_test.dart",
      },
      loop: {
        contractRole: "loop",
        // A loop has no destination to keep, so its reduced form is not a shorter duration but no loop
        // at all plus a static state that says the same thing. See the helper's header.
        strict: true,
        helper: "kinetix_loop_motion.dart",
        members: ["spinner.dart", "skeleton.dart", "marquee.dart", "message_bubble.dart"],
        test: "packages/ui-flutter/test/loop_motion_test.dart",
      },
    },
  },
};

/**
 * Animated components that do NOT yet answer to the reader's setting, with the reason each is still
 * outstanding. This is the honest ledger: every entry is a known gap, and an animated component that
 * is neither in the family nor listed here fails the run — which is how "motion added without
 * reduced-motion handling" gets caught on the commit that adds it rather than a quarter later.
 *
 * Removing an entry is a claim that the component now honours the setting, and the family check below
 * then demands it reference the helper. Entries cannot go stale in the other direction either: a name
 * listed here that no longer animates also fails.
 */
export const KNOWN_GAPS = {
  SwiftUI: {
    "CircularProgress.swift": "determinate ring sweep — progress feedback family, not this slice",
    "Dialog.swift": "opacity fade only: positional movement is what Reduce Motion removes, and a fade is the accepted replacement, so there is nothing concrete to fix",
    "Input.swift": "focus ring transition — feedback family",
    "Progress.swift": "determinate bar — progress feedback family",
    "Textarea.swift": "focus ring transition — feedback family",
  },
  Compose: {
    "CircularProgress.kt": "determinate ring sweep — progress feedback family",
    "Progress.kt": "determinate bar — progress feedback family",
    "Carousel.kt": "animated page scrolling via PagerState — carousel/pager family, its own slice",
  },
  Flutter: {
    "json_viewer.dart": "disclosure-shaped, but a data-viewer concern; its own slice",
  },
};

/**
 * Both directions. One-sided coverage is how the web gate shipped blind to every collapse.
 *
 * Matched against the TEST NAMES, not the file body, and anchored at a word start. The first version
 * of this check scanned the whole file for the substring `clos`, which the phrase "disclosed body" in
 * a test fixture satisfied — a check that passed because of a noun. Reading the declarations is the
 * difference between "the word appears somewhere" and "a test says it covers this".
 *
 * ── `kind` ────────────────────────────────────────────────────────────────
 *
 * Every entry declares whether its two terms are two DIRECTIONS of one transition
 * (`kind: "direction"`) or two MODES of one behaviour (`kind: "mode"`). The difference is not
 * cosmetic, and two clauses in `check-native-motion.mjs` read it:
 *
 *   A direction family's two terms name opposite ends of a journey, so the reader's reduced-motion
 *   preference is NOT one of them. A test named "…with animations off" is about the preference, and
 *   counting it as the reverse direction is the same class of false pass as "disclosed body":
 *   `directionTermDefects` refuses to let a direction family's vocabulary admit that wording at all,
 *   and `directionCoverage` refuses to let such a test be a direction's only evidence.
 *
 *   A mode family's terms are the preference — `reduced motion` IS the second mode — so both of
 *   those clauses stand down for it.
 *
 * Both kinds require the two terms to be satisfied by DISTINCT test names. One name carrying both
 * words proves one transition, and the clause's own error text says why that is not two.
 */
export const DIRECTION_TERMS = {
  // A disclosure opens and closes.
  disclosure: {
    kind: "direction",
    forward: /\b(expand|open|enter|reveal)/i,
    reverse: /\b(collaps|clos|exit|revers|hide|hidden)/i,
  },
  // A switch turns on and off, and its two directions must be named as a PAIR rather than by a bare
  // "on" or "off". A test called "…with animations off" is about the preference, not the direction,
  // and a lone /\boff\b/ would have counted it — the same class of false pass as "disclosed body".
  // Requiring the transition arrow makes the two unambiguous.
  selection: {
    kind: "direction",
    forward: /off\s*(?:→|->|to)\s*on/i,
    reverse: /on\s*(?:→|->|to)\s*off/i,
  },
  // Selection has two directions as well, named for what the reader sees change: unchecked or
  // unselected becoming checked or selected, and back. A bare on/off pair would have collided with the
  // switch family's vocabulary, and with test names like "…with animations off".
  selectionState: {
    kind: "direction",
    forward: /(?:unchecked|unselected)\s*(?:\u2192|->|to)\s*(?:checked|selected)/i,
    reverse: /\b(?:checked|selected)\s*(?:\u2192|->|to)\s*(?:unchecked|unselected)/i,
  },
  // A selection indicator travels between items, so its two directions are named for the two ways
  // the selection can move through the list: to a later item, and back to an earlier one. Named as
  // an arrow-joined PAIR for exactly the reason given above for `selection` and `selectionState` —
  // one name cannot plausibly carry the arrow both ways.
  //
  // What this vocabulary deliberately does NOT contain is the reader's preference. The first version
  // of this family declared `reverse: /backward|reduced.?motion/i`, which did both things the rule
  // above forbids at once: a single test named "forward retargets backward" satisfied both
  // directions, and a reduced-motion test could stand in for a direction of travel.
  // `directionTermDefects` now refuses that shape outright, so it cannot come back.
  selectionIndicator: {
    kind: "direction",
    forward: /(?:earlier|previous)\s*(?:\u2192|->|to)\s*(?:later|next)/i,
    reverse: /(?:later|next)\s*(?:\u2192|->|to)\s*(?:earlier|previous)/i,
  },
  // A loop has no two directions; it has two MODES, and both must be named. "normal" is the loop
  // running, "reduced" is it stopped with its information intact. Anchored on the mode words so a test
  // named only for the component ("spinner renders") satisfies neither.
  // A slide has two modes as well: sliding normally, fading when reduced.
  slide: {
    kind: "mode",
    forward: /normal motion|slides/i,
    reverse: /reduced motion|fades/i,
  },
  loop: {
    kind: "mode",
    forward: /normal motion|runs|rotates|pulses|moves|translates/i,
    reverse: /reduced motion|do not run|does not rotate|rests|stopped/i,
  },
};

/**
 * Wording that names the reader's reduced-motion PREFERENCE rather than a direction of travel.
 *
 * Kept here, beside the vocabulary it polices, so a new family cannot be written against a different
 * idea of what "reduced motion" looks like in a test name.
 */
export const PREFERENCE_NAME = /reduc\w*[\s-]*motion|animations?\s+(?:are\s+)?off|prefers[\s-]*reduced/i;

/**
 * Phrases that name only the preference. A direction family's terms must match none of them: if one
 * does, a suite can satisfy that direction without ever travelling in it.
 */
const PREFERENCE_SAMPLES = [
  "with animations off",
  "animations are off",
  "under reduced motion",
  "prefers reduced motion",
  "with reduced-motion on",
];

/**
 * Structural defects in a family's own vocabulary, independent of any test suite.
 *
 * This is the clause that stops the next family from being written the way `selectionIndicator` was:
 * `reverse: /backward|reduced.?motion/i` mixes a direction with a mode in one alternation, so a
 * single test named "forward travel under reduced motion" satisfies both ends of the pair. Catching
 * that in the vocabulary is strictly better than catching it in one suite, because the vocabulary is
 * written once and every platform's suite is then measured against it.
 */
export function directionTermDefects(familyName, terms) {
  const out = [];
  if (terms.kind !== "direction" && terms.kind !== "mode") {
    out.push(
      `DIRECTION_TERMS.${familyName} declares no kind. Say "direction" (two ends of one transition) ` +
        `or "mode" (two behaviours, one of them the reader's reduced-motion preference) — the ` +
        `reduced-motion clauses read it, and a missing kind would silently turn them off.`,
    );
    return out;
  }
  if (terms.kind !== "direction") return out;
  for (const dir of ["forward", "reverse"]) {
    const hit = PREFERENCE_SAMPLES.find((sample) => terms[dir].test(sample));
    if (hit) {
      out.push(
        `DIRECTION_TERMS.${familyName}.${dir} matches ${JSON.stringify(hit)}, which names the reader's ` +
          `preference and not a direction of travel.\n` +
          `      A suite could then satisfy the ${dir} direction without ever going that way. Either name ` +
          `the two directions as a pair the preference cannot stand in for, or declare the family ` +
          `kind: "mode" if its two terms really are two behaviours.`,
      );
    }
  }
  return out;
}

/**
 * How each direction of a family is covered by a suite's test names.
 *
 * Returns, per direction: every name matching it (`matched`) and those that do NOT also match the
 * other direction (`distinct`). A direction is proven only by a distinct name.
 *
 * The two levels exist so the gate can say WHICH failure it found, and so a control can tell the
 * benign case from the defect. A name matching both directions is benign when the direction also has
 * an independent test — six family/platform pairs on `main` are exactly that, and a check keyed on
 * "a dual name exists" would redden all six and be switched off within a week.
 *
 * Note what this deliberately does NOT do: it does not reject a distinct name that also mentions the
 * reduced-motion preference. `"off → on is suppressed under reduced motion"` is an honest name for a
 * test of the forward direction under the preference, and most of the native suites are written that
 * way. The preference is kept out of the directions upstream instead, by `directionTermDefects`
 * refusing a vocabulary that preference wording could satisfy on its own. Filtering here as well was
 * tried and reddened eight correct suites on `main`.
 */
export function directionCoverage(terms, names) {
  const out = {};
  for (const dir of ["forward", "reverse"]) {
    const other = dir === "forward" ? "reverse" : "forward";
    const matched = names.filter((n) => terms[dir].test(n));
    out[dir] = { matched, distinct: matched.filter((n) => !terms[other].test(n)) };
  }
  return out;
}

/** How each platform spells a test declaration, so the check reads names rather than prose. */
export const TEST_NAMES = {
  SwiftUI: /func\s+(test[A-Za-z0-9_]*)/g,
  Compose: /fun\s+(?:`([^`]+)`|([A-Za-z0-9_]+))\s*\(/g,
  Flutter: /(?:testWidgets|test|group)\(\s*['"]([^'"]+)/g,
};

/** The declared test names in a suite, lower-cased and joined. */
export function testNames(platform, source) {
  const re = new RegExp(TEST_NAMES[platform].source, "g");
  const names = [];
  for (const m of source.matchAll(re)) names.push((m[1] ?? m[2] ?? "").replace(/([a-z0-9])([A-Z])/g, "$1 $2"));
  return names;
}

