/**
 * source-defects.mjs — defects restored in the component's own SOURCE, for the negative controls that
 * cannot be reached from the page.
 *
 * Every other control in this gate's suite restores its defect by intercepting a DOM API from
 * `addInitScript`, which is the right tool when the behaviour under test is an attribute the component
 * writes. Some behaviour is not observable that way: the announcement's GENERATION check lives inside a
 * closure, decides nothing in the DOM, and a page-level control has no handle on it at all. Reverting it
 * needs the source the harness compiles.
 *
 * The mutation is applied by a Vite `transform` hook, in memory, during a build into a SEPARATE output
 * directory. Nothing writes to the working tree, so the tracked component cannot be contaminated by a
 * control run — not even one killed mid-build, which is the failure mode that cost a candidate commit
 * once already. The build asserts the rewrite matched EXACTLY ONCE and fails the whole run otherwise, so
 * a control cannot report a clean pass having silently mutated nothing after the source moved under it.
 */

/** @type {Record<string, { file: string; find: string; replace: string; why: string }>} */
export const SOURCE_DEFECTS = {
  /**
   * Before the fix a pending phrase was spent by whatever gesture happened to be current when its timer
   * fired. Measured: Next at t=0, a drag beginning at t=40ms and released after the window — the control's
   * position was announced and the drag's own landing was SILENT, because the pending callback found the
   * drag's fresh intent and consumed it.
   *
   * The repair is one line: a callback whose generation is no longer current stands down. Deleting that
   * line restores the race exactly, which is what makes this control a test of the rapid-input sequence
   * rather than of a timer length. The page-level `announce-per-position` control collapses the settle
   * window instead, and that is a DIFFERENT defect: it makes a burst speak per position. It reddens the
   * mid-phrase row too, which is why that row alone could not tell the two apart.
   */
  "stale-intent-wins": {
    file: "packages/ui/src/components/carousel.tsx",
    find: "      if (gen !== intentId.current) return;\n",
    replace: "",
    why: "a pending phrase is spent by a newer gesture, leaving that gesture's own landing silent",
  },

  /**
   * Focus follows the view EVERY time the view changes, not once. A reader arrowing through the track
   * faster than it settles leaves a slide behind on every press, and each of those slides goes `inert`
   * under them — so a transfer that happens once and then stands down loses the reader's place on the
   * SECOND press, which is the first one no completed-move row can see.
   *
   * This defect gates the transfer on a flag it sets after firing. One transfer still happens, so every
   * existing single-move row stays green and the interruption rows are the only ones that redden. Deleting
   * the effect outright would redden the single-move rows too and prove nothing about interruption
   * specifically; it is also worth recording that no control restores the transfer itself today, so the
   * `focus follows the view` rows in the axis sections have no negative control of their own.
   *
   * It is the whole block rather than one line because the flag has to be read before the search and
   * written after the focus call, and a source defect gets one rewrite.
   */
  "focus-follows-once": {
    file: "packages/ui/src/components/carousel.tsx",
    find: `    const leaving = slideNodes.find((n, i) => !slidesInView.includes(i) && n.contains(active));
    if (!leaving) return;
    const landing = slideNodes[slidesInView[0]!];
    if (landing instanceof HTMLElement) landing.focus();
`,
    replace: `    const once = window as unknown as { __kxFocusFollowedOnce?: boolean };
    if (once.__kxFocusFollowedOnce) return;
    const leaving = slideNodes.find((n, i) => !slidesInView.includes(i) && n.contains(active));
    if (!leaving) return;
    const landing = slideNodes[slidesInView[0]!];
    if (landing instanceof HTMLElement) landing.focus();
    once.__kxFocusFollowedOnce = true;
`,
    why: "focus follows the view only once, so the second gesture in a burst leaves the reader behind in a slide that goes inert",
  },
};
