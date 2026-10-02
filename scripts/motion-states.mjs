/**
 * motion-states.mjs — the interactions whose motion is a claim, and what counts as proof it moved.
 *
 * ── What this closes ───────────────────────────────────────────────────────
 *
 * The catalogue's motion evidence was, until this file, a grep. A component "had motion" because its
 * source contained `transition` or `animate-`, which proves that someone typed a class — not that
 * anything moves on screen. Three ways that reads false, all of them true of this repository before
 * this slice:
 *
 *   `menubar` carries `data-[state=closed]:fade-out-0` with no `animate-out` beside it. That utility
 *   supplies keyframes and nothing plays them, so the class is inert. A grep counts it.
 *
 *   `accordion` animated at a hard-coded `0.2s ease-out` while the catalogue's duration and easing
 *   tokens sat unused. A grep sees `animate-accordion-down` and reports token-driven motion.
 *
 *   `collapsible` shipped as a bare re-export with no motion at all, beside `accordion`, which has
 *   the same disclosure semantics. A grep correctly reports nothing — but nothing in CI said the
 *   absence was a defect rather than a decision.
 *
 * So motion is declared here and proven in a browser by `scripts/motion.mjs`, the same way #271
 * declared overlay open states rather than guessing at them.
 *
 * ── Why duration, and not just a midpoint ─────────────────────────────────
 *
 * The first version of this check proved motion by pausing the element's animations, seeking to half
 * their duration and reading the frame there. That is a real rendered midpoint, and it is necessary —
 * it is what distinguishes a property that interpolates from one that jumps. It is not sufficient,
 * and the reduced-motion pass is what exposed that: seeking to 50% of a 0.01ms animation yields a
 * perfectly good midpoint too. The check reported that reduced motion was "still animating" when the
 * floor was in fact working exactly as designed, 200ms → 0.01ms.
 *
 * Perceptibility is duration. So both facts are required, and they are asserted separately:
 *
 *   normal motion   a rendered midpoint strictly between the ends, AND a duration a person can see
 *   reduced motion  a duration nobody can see, AND the same end state normal motion reaches
 *
 * ── Why this does not (yet) add a `motion` kind to verification.json ──────
 *
 * The evidence this produces is objective, repeatable and CI-enforced: a rendered midpoint and a
 * measured duration, deterministic across runs, run by `check:motion` in the accessibility workflow.
 * Three of the four bars the evidence model asks for are met. The fourth is not.
 *
 * It is not meaningful across platforms. This harness is a browser driving Storybook; SwiftUI,
 * Compose and Flutter have no rendered-interaction harness in CI at all, so a `motion` total would
 * read 0 for three platforms that do animate — 15, 9 and 8 components respectively use their
 * framework's animation APIs — and the zero would mean "nobody can measure this here", not "no
 * motion".
 *
 * And a flat count would misread on the web too. `verification.json` records kind → sources, with no
 * way to say a cell is correctly empty. `motion: 2` against 98 components implies 96 failures when
 * most of those components should never animate: `kbd`, `separator` and `aspect-ratio` are finished
 * work, not gaps. Publishing that number would make the catalogue look broken in order to look
 * measured.
 *
 * So the dimension is deferred rather than added, and the precondition is written down: it becomes
 * truthful when every catalogue entry carries one of the four classifications below, so the counter
 * can report "N of M motion-required interactions proven" instead of "N of 98 components animated",
 * and when either a native rendered-interaction harness exists or the kind is explicitly scoped to
 * web. The classification vocabulary is defined here so that work has somewhere to start.
 *
 * ── How the midpoint is obtained without a sleep ──────────────────────────
 *
 * Sampling a transition on a timer is a race: too early and nothing has started, too late and it has
 * finished, and the window narrows as machines get faster. The Web Animations API backs CSS
 * transitions and animations, so the runner pauses the animation and seeks it, which is deterministic
 * and has no flake to tolerate. An element with no animations yields no midpoint and is reported as
 * not moving, which is the honest answer rather than a skip.
 */

/** Motion materially communicates the change. These must prove a perceptible rendered midpoint. */
export const MOTION_REQUIRED = "MOTION_REQUIRED";
/** Animation would add noise. Absence is correct, and proving absence is the evidence. */
export const STATIC_BY_DESIGN = "STATIC_BY_DESIGN";
/** The moving part belongs to something this composes, and is verified there. */
export const COMPOSITION_OWNED = "COMPOSITION_OWNED";

/**
 * Below this, a change reads as a jump rather than a movement. The catalogue's own smallest duration
 * token is `instant` at 100ms, described as "near-immediate feedback — below this a change reads as a
 * jump", so 50ms is a floor that admits every real token while rejecting a transition that was
 * declared and then given no time to happen.
 */
export const PERCEPTIBLE_MS = 50;

/**
 * Above this, under `prefers-reduced-motion`, movement is still happening. The package's reduced
 * motion floor collapses durations to 0.01ms, so 2ms leaves room for rounding without admitting
 * anything a person could perceive.
 */
export const SUPPRESSED_MS = 2;

/**
 * The disclosure family, by canonical manifest slug.
 *
 * A member with no declared state below fails the run, which is what stops the suite quietly
 * dropping a component the way `a11y-browser` once dropped every overlay.
 *
 * `tree-view` is deliberately NOT a member. It is a disclosure control and it does have a motion gap
 * — its chevron rotates but its `role="group"` subtree mounts with no transition — but it is a
 * hand-rolled tree that mounts and unmounts its children rather than a Radix primitive with a
 * measured content height, so giving it disclosure motion is a different piece of work from the one
 * this slice does. It is recorded as a remaining gap rather than silently folded in or quietly
 * dropped.
 */
export const DISCLOSURE_FAMILY = ["accordion", "collapsible"];

/**
 * Each entry:
 *   slug            canonical manifest slug
 *   story           story id in the built Storybook index
 *   interaction     human name, used in the report and in the evidence
 *   classification  MOTION_REQUIRED | STATIC_BY_DESIGN | COMPOSITION_OWNED
 *   trigger         { action: "click" | "press", selector, key? }
 *   target          "@aria-controls" resolves the element the trigger points at, which is how both
 *                   Radix disclosure primitives associate a trigger with its content and does not
 *                   depend on a class name the component may not set. Otherwise a CSS selector.
 *   targetBefore    optional selector for reading STATE A when `target` only exists once open
 *   property        the computed property sampled
 */
export const MOTION_STATES = [
  {
    slug: "accordion",
    story: "data-display-accordion--playground",
    interaction: "expand",
    classification: MOTION_REQUIRED,
    trigger: { action: "click", selector: "button[data-state=closed]" },
    target: "@aria-controls",
    property: "height",
  },
  {
    slug: "accordion",
    story: "data-display-accordion--playground",
    interaction: "chevron rotation",
    classification: MOTION_REQUIRED,
    trigger: { action: "click", selector: "button[data-state=closed]" },
    target: "button[data-state=open] > svg",
    targetBefore: "button[data-state=closed] > svg",
    property: "transform",
  },
  {
    slug: "collapsible",
    story: "data-display-collapsible--playground",
    interaction: "expand",
    classification: MOTION_REQUIRED,
    trigger: { action: "click", selector: "button[data-state=closed]" },
    target: "@aria-controls",
    property: "height",
  },
];

/** A family member with no declared state is a coverage hole, not a pass. */
export function coverageErrors(states = MOTION_STATES, family = DISCLOSURE_FAMILY) {
  const covered = new Set(states.map((s) => s.slug));
  return family.filter((slug) => !covered.has(slug)).map((slug) => `${slug}: in DISCLOSURE_FAMILY with no declared motion state.`);
}

/**
 * Two rendered values are "the same" if a reader could not tell them apart. Browsers report `height`
 * to a fraction of a pixel and `transform` as a matrix, so exact string inequality would call a
 * 0.0001px difference motion.
 */
export const PERCEPTIBLE_PX = 1;

export function parsePx(value) {
  const n = Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

/** matrix(a,b,c,d,tx,ty) / matrix3d(...) → the numbers we compare on. `none` is not a matrix. */
export function parseMatrix(value) {
  const m = /matrix(3d)?\(([^)]+)\)/.exec(String(value));
  if (!m) return null;
  return m[2].split(",").map((p) => Number.parseFloat(p.trim()));
}

/**
 * Is `mid` a rendered state strictly between `a` and `b`?
 *
 * A length is a numeric betweenness test with a perceptibility floor. A transform is a distance test
 * on the matrix. `none` is treated as the identity matrix, because a rotation starting from no
 * transform at all is the normal way a chevron begins.
 */
export function isIntermediate(a, mid, b) {
  const IDENTITY = [1, 0, 0, 1, 0, 0];
  const [na, nm, nb] = [a, mid, b].map(parsePx);
  const looksLength = [a, b].some((v) => String(v).includes("px"));
  if (looksLength && na !== null && nm !== null && nb !== null) {
    const lo = Math.min(na, nb);
    const hi = Math.max(na, nb);
    if (hi - lo < PERCEPTIBLE_PX) return false; // the ends are the same; there is nothing to move between
    return nm > lo + 0.01 && nm < hi - 0.01;
  }
  const asMatrix = (v) => (String(v).trim() === "none" ? IDENTITY : parseMatrix(v));
  const [ma, mm, mb] = [a, mid, b].map(asMatrix);
  if (ma && mm && mb) {
    const dist = (x, y) => Math.hypot(...x.map((v, i) => v - (y[i] ?? 0)));
    if (dist(ma, mb) < 0.01) return false;
    return dist(ma, mm) > 0.001 && dist(mm, mb) > 0.001;
  }
  // Anything unparseable is not evidence: calling `none` vs `matrix(...)` motion would count a state
  // change rendered in a single frame.
  return false;
}
