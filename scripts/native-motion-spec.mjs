/**
 * native-motion-spec.mjs — the data `check-native-motion.mjs` enforces.
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
 */
export const PLATFORMS = {
  SwiftUI: {
    dir: "packages/ui-swiftui/Sources/KinetixUI",
    ext: ".swift",
    animates: /withAnimation|\.animation\(|\.transition\(|AnyTransition|repeatForever|matchedGeometryEffect/,
    preference: /accessibilityReduceMotion/,
    families: {
      disclosure: {
        helper: "KinetixDisclosureMotion.swift",
        members: ["Accordion.swift", "Collapsible.swift"],
        test: "packages/ui-swiftui/Tests/KinetixUITests/DisclosureMotionTests.swift",
        // A disclosure has an asymmetric pair of curves, so a member naming one direction and never
        // the other has unreachable code. A switch is symmetric and has no such pair, which is why
        // this is configured per family rather than per platform.
        directions: [/\.expanding\b/, /\.collapsing\b/],
      },
      selection: {
        helper: "KinetixSwitchMotion.swift",
        members: ["Switch.swift"],
        test: "packages/ui-swiftui/Tests/KinetixUITests/SwitchMotionTests.swift",
      },
    },
  },
  Compose: {
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
        helper: "KinetixDisclosureMotion.kt",
        members: ["Accordion.kt", "Collapsible.kt"],
        test: "packages/ui-compose/ui/src/test/kotlin/com/kinetixui/ui/DisclosureMotionTest.kt",
      },
      selection: {
        helper: "KinetixSwitchMotion.kt",
        members: ["Switch.kt"],
        test: "packages/ui-compose/ui/src/test/kotlin/com/kinetixui/ui/SwitchMotionTest.kt",
      },
    },
  },
  Flutter: {
    dir: "packages/ui-flutter/lib/src",
    ext: ".dart",
    animates: /Animated[A-Z]\w+|AnimationController|Tween|CurvedAnimation/,
    preference: /disableAnimationsOf|disableAnimations|reduceMotionOf/,
    families: {
      disclosure: {
        helper: "kinetix_disclosure_motion.dart",
        members: ["accordion.dart", "collapsible.dart"],
        test: "packages/ui-flutter/test/disclosure_motion_test.dart",
      },
      selection: {
        helper: "kinetix_switch_motion.dart",
        members: ["switch.dart"],
        test: "packages/ui-flutter/test/switch_motion_test.dart",
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
    "Dialog.swift": "overlay family: presentation transition, separate slice",
    "Input.swift": "focus ring transition — feedback family",
    "Marquee.swift": "infinite scroll; suppressing it needs a static fallback decision, not a duration",
    "MessageBubble.swift": "typing indicator loop; same open design question as Marquee",
    "Progress.swift": "determinate bar — progress feedback family",
    "Sheet.swift": "overlay family",
    "Sidebar.swift": "layout family: collapse width transition",
    "Skeleton.swift": "loading shimmer loop; needs an accessible static alternative",
    "Spinner.swift": "indeterminate loop; a spinner with no motion communicates nothing",
    "Textarea.swift": "focus ring transition — feedback family",
    "Toaster.swift": "overlay family",
  },
  Compose: {
    "CircularProgress.kt": "determinate ring sweep — progress feedback family",
    "Marquee.kt": "infinite scroll; needs a static fallback decision",
    "MessageBubble.kt": "typing indicator loop",
    "Progress.kt": "determinate bar — progress feedback family",
    "Carousel.kt": "animated page scrolling via PagerState — carousel/pager family, its own slice",
    "Skeleton.kt": "loading shimmer loop",
    "Spinner.kt": "indeterminate loop",
  },
  Flutter: {
    "json_viewer.dart": "disclosure-shaped, but a data-viewer concern; its own slice",
    "marquee.dart": "infinite scroll; needs a static fallback decision",
    "message_bubble.dart": "typing indicator loop",
    "skeleton.dart": "loading shimmer loop",
    "spinner.dart": "indeterminate loop",
  },
};

/**
 * Both directions. One-sided coverage is how the web gate shipped blind to every collapse.
 *
 * Matched against the TEST NAMES, not the file body, and anchored at a word start. The first version
 * of this check scanned the whole file for the substring `clos`, which the phrase "disclosed body" in
 * a test fixture satisfied — a check that passed because of a noun. Reading the declarations is the
 * difference between "the word appears somewhere" and "a test says it covers this".
 */
export const DIRECTION_TERMS = {
  // A disclosure opens and closes.
  disclosure: {
    forward: /\b(expand|open|enter|reveal)/i,
    reverse: /\b(collaps|clos|exit|revers|hide|hidden)/i,
  },
  // A switch turns on and off, and its two directions must be named as a PAIR rather than by a bare
  // "on" or "off". A test called "…with animations off" is about the preference, not the direction,
  // and a lone /\boff\b/ would have counted it — the same class of false pass as "disclosed body".
  // Requiring the transition arrow makes the two unambiguous.
  selection: {
    forward: /off\s*(?:→|->|to)\s*on/i,
    reverse: /on\s*(?:→|->|to)\s*off/i,
  },
};

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

