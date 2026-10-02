/**
 * check-native-motion.mjs — the ledger of native motion, and who answers to the reader's setting.
 *
 *   node scripts/check-native-motion.mjs
 *
 * ── This is a SECONDARY guard, and the distinction matters ────────────────
 *
 * It does not verify accessibility. It cannot: a file containing the word
 * `accessibilityReduceMotion` proves nothing about what happens on screen, and treating that as
 * evidence is the exact failure the web motion gate was built to stop. The PRIMARY proof lives in
 * the platforms' own test suites, run by their own CI:
 *
 *   Flutter   `test/disclosure_motion_test.dart` — renders, drives the clock by hand, and measures a
 *             real intermediate height mid-transition. The strongest evidence in the slice.
 *   Compose   `DisclosureMotionTest.kt` — Robolectric composes for real; asserts the spec's duration
 *             and easing, and that the state change still completes with animations off.
 *   SwiftUI   `DisclosureMotionTests.swift` — the resolver's contract. That package has no
 *             view-inspection library, so nothing there can render; the limit is stated, not hidden.
 *
 * What THIS catches is the bookkeeping those tests cannot: a component that starts animating and
 * never gets wired to the reader's preference, a family member quietly dropped from the contract, a
 * direction tested in one direction only, and a stale ledger. Those are structural facts about which
 * files reference what, which is exactly what a source check is good for and all it is claimed to be.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => (existsSync(`${root}/${p}`) ? readFileSync(`${root}/${p}`, "utf8") : null);

/**
 * The animation primitives that mean "this component moves". Finding one in a file is not a defect —
 * it is the trigger for asking the only question this script asks: does that file, or the helper it
 * delegates to, answer to the reader's setting?
 */
const PLATFORMS = {
  SwiftUI: {
    dir: "packages/ui-swiftui/Sources/KinetixUI",
    ext: ".swift",
    animates: /withAnimation|\.animation\(|\.transition\(|AnyTransition|repeatForever|matchedGeometryEffect/,
    preference: /accessibilityReduceMotion/,
    helper: "KinetixDisclosureMotion.swift",
    test: "packages/ui-swiftui/Tests/KinetixUITests/DisclosureMotionTests.swift",
    family: ["Accordion.swift", "Collapsible.swift"],
  },
  Compose: {
    dir: "packages/ui-compose/ui/src/main/kotlin/com/kinetixui/ui",
    ext: ".kt",
    animates: /animate[A-Z]\w*AsState|AnimatedVisibility|AnimatedContent|updateTransition|rememberInfiniteTransition|animateContentSize/,
    preference: /ANIMATOR_DURATION_SCALE|rememberReduceMotion/,
    helper: "KinetixDisclosureMotion.kt",
    test: "packages/ui-compose/ui/src/test/kotlin/com/kinetixui/ui/DisclosureMotionTest.kt",
    family: ["Accordion.kt", "Collapsible.kt"],
  },
  Flutter: {
    dir: "packages/ui-flutter/lib/src",
    ext: ".dart",
    animates: /Animated[A-Z]\w+|AnimationController|Tween|CurvedAnimation/,
    preference: /disableAnimationsOf|disableAnimations|reduceMotionOf/,
    helper: "kinetix_disclosure_motion.dart",
    test: "packages/ui-flutter/test/disclosure_motion_test.dart",
    family: ["accordion.dart", "collapsible.dart"],
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
const KNOWN_GAPS = {
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
    "Switch.swift": "selection-control family, the strongest candidate for the next slice",
    "Textarea.swift": "focus ring transition — feedback family",
    "Toaster.swift": "overlay family",
  },
  Compose: {
    "CircularProgress.kt": "determinate ring sweep — progress feedback family",
    "Marquee.kt": "infinite scroll; needs a static fallback decision",
    "MessageBubble.kt": "typing indicator loop",
    "Progress.kt": "determinate bar — progress feedback family",
    "Skeleton.kt": "loading shimmer loop",
    "Spinner.kt": "indeterminate loop",
    "Switch.kt": "selection-control family — next slice candidate",
  },
  Flutter: {
    "json_viewer.dart": "disclosure-shaped, but a data-viewer concern; its own slice",
    "marquee.dart": "infinite scroll; needs a static fallback decision",
    "message_bubble.dart": "typing indicator loop",
    "skeleton.dart": "loading shimmer loop",
    "spinner.dart": "indeterminate loop",
    "switch.dart": "selection-control family — next slice candidate",
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
const DIRECTION_TERMS = {
  forward: /\b(expand|open|enter|reveal)/i,
  reverse: /\b(collaps|clos|exit|revers|hide|hidden)/i,
};

/** How each platform spells a test declaration, so the check reads names rather than prose. */
const TEST_NAMES = {
  SwiftUI: /func\s+(test[A-Za-z0-9_]*)/g,
  Compose: /fun\s+(?:`([^`]+)`|([A-Za-z0-9_]+))\s*\(/g,
  Flutter: /(?:testWidgets|test|group)\(\s*['"]([^'"]+)/g,
};

/** The declared test names in a suite, lower-cased and joined. */
function testNames(platform, source) {
  const re = new RegExp(TEST_NAMES[platform].source, "g");
  const names = [];
  for (const m of source.matchAll(re)) names.push((m[1] ?? m[2] ?? "").replace(/([a-z0-9])([A-Z])/g, "$1 $2"));
  return names;
}

const errors = [];
const summary = [];

for (const [name, p] of Object.entries(PLATFORMS)) {
  const dir = `${root}/${p.dir}`;
  if (!existsSync(dir)) {
    errors.push(`${name}: source directory ${p.dir} is missing.`);
    continue;
  }

  const files = readdirSync(dir).filter((f) => f.endsWith(p.ext));
  const animated = files.filter((f) => p.animates.test(readFileSync(`${dir}/${f}`, "utf8")));
  const gaps = KNOWN_GAPS[name] ?? {};

  // 1. The helper must exist — it is what the family delegates to.
  if (!files.includes(p.helper)) errors.push(`${name}: the reduced-motion helper ${p.helper} is missing from ${p.dir}.`);

  // 2. Every family member must reach the reader's setting, directly or through the helper.
  for (const member of p.family) {
    const src = read(`${p.dir}/${member}`);
    if (src === null) {
      errors.push(`${name}: declared family member ${member} does not exist.`);
      continue;
    }
    const routed = p.preference.test(src) || src.includes(p.helper.replace(p.ext, ""));
    if (!routed) {
      errors.push(
        `${name}/${member}: in the disclosure family but reaches neither the platform preference nor ${p.helper}.\n` +
          `      The family's reduced-motion contract is only as good as its least-wired member.`,
      );
    }
  }

  // 3. An animated component must be in the family or a declared gap. This is the check that fires
  //    on the commit which adds motion without wiring it up.
  for (const f of animated) {
    if (p.family.includes(f) || f === p.helper) continue;
    if (!(f in gaps)) {
      errors.push(
        `${name}/${f}: animates, but is neither in the disclosure family nor listed in KNOWN_GAPS.\n` +
          `      Either wire it to the reader's setting, or record why it is still outstanding — silence is not a decision.`,
      );
    }
  }

  // 4. The ledger must not go stale: a listed gap that no longer animates is a dead entry.
  for (const f of Object.keys(gaps)) {
    if (!files.includes(f)) errors.push(`${name}: KNOWN_GAPS lists ${f}, which does not exist.`);
    else if (!animated.includes(f)) errors.push(`${name}: KNOWN_GAPS lists ${f}, but it no longer animates — remove the entry.`);
  }

  // 5. The platform's test must exercise both directions.
  const test = read(p.test);
  if (test === null) {
    errors.push(`${name}: no reduced-motion test at ${p.test}.`);
  } else {
    const names = testNames(name, test);
    if (names.length === 0) {
      errors.push(`${name}: ${p.test} declares no recognisable tests — the direction check has nothing to read.`);
    }
    for (const [dirName, re] of Object.entries(DIRECTION_TERMS)) {
      if (!names.some((n) => re.test(n))) {
        errors.push(
          `${name}: no test in ${p.test} is NAMED for the ${dirName} direction.\n` +
            `      Opening and closing are separate animations with separate curves, so proving one says nothing about\n` +
            `      the other. Found: ${names.slice(0, 6).map((n) => `"${n}"`).join(", ")}${names.length > 6 ? ", …" : ""}`,
        );
      }
    }
  }

  // The resolver itself references the animation primitives, but it is not a component —
  // counting it would inflate the inventory the PR reports.
  const animatedComponents = animated.filter((f) => f !== p.helper);
  summary.push({ name, animated: animatedComponents.length, family: p.family.length, gaps: Object.keys(gaps).length });
}

console.log("native motion — animated components, and who answers to the reader's setting\n");
console.log(`  ${"platform".padEnd(9)} ${"animated".padStart(8)} ${"in family".padStart(9)} ${"declared gaps".padStart(13)}`);
for (const s of summary) {
  console.log(`  ${s.name.padEnd(9)} ${String(s.animated).padStart(8)} ${String(s.family).padStart(9)} ${String(s.gaps).padStart(13)}`);
}

if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  console.error(errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}
const covered = summary.reduce((n, s) => n + s.family, 0);
const outstanding = summary.reduce((n, s) => n + s.gaps, 0);
console.log(
  `\ncheck:native-motion ok — ${covered} component(s) across 3 platforms wired to the reader's setting and ` +
    `tested in both directions; ${outstanding} animated component(s) remain declared gaps, which is a roadmap and not a failure.\n` +
    `  This is a bookkeeping guard. The behavioural proof is in the platforms' own suites — see the header.`,
);
