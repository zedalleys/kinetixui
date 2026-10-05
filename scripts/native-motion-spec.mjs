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
      slide: {
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
      loop: {
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
    dir: "packages/ui-flutter/lib/src",
    ext: ".dart",
    animates: /Animated[A-Z]\w+|AnimationController|Tween|CurvedAnimation/,
    preference: /disableAnimationsOf|disableAnimations|reduceMotionOf|runsOf/,
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
      loop: {
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
  // A loop has no two directions; it has two MODES, and both must be named. "normal" is the loop
  // running, "reduced" is it stopped with its information intact. Anchored on the mode words so a test
  // named only for the component ("spinner renders") satisfies neither.
  // A slide has two modes as well: sliding normally, fading when reduced.
  slide: {
    forward: /normal motion|slides/i,
    reverse: /reduced motion|fades/i,
  },
  loop: {
    forward: /normal motion|runs|rotates|pulses|moves|translates/i,
    reverse: /reduced motion|do not run|does not rotate|rests|stopped/i,
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

