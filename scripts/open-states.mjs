/**
 * open-states.mjs — the declared open state of every overlay, and what counts as proof it opened.
 *
 * ── The blind spot this closes ─────────────────────────────────────────────
 *
 * `scripts/a11y-browser.mjs` opens every story and runs axe over it. For an overlay that means it scans a
 * button. The dialog, the menu, the thing a person actually reads and operates is not in the DOM yet, so
 * "206 stories, 0 violations" was a true sentence about a page containing ten closed triggers. The gap was
 * found while scanning an open Select by hand during the form-controls slice: it reported a serious
 * violation that the suite had never been in a position to see.
 *
 * ── Why a declaration rather than detection ───────────────────────────────
 *
 * A scanner could try to guess: click the first button, look for something that appeared. That guesses
 * wrong in both directions — the Modal story has four triggers, the ContextMenu story opens on a right
 * click and not a click at all, and the Tooltip story opens on focus. Worse, a guesser that finds nothing
 * has no way to tell "this story has no overlay" from "the overlay failed to open", so the honest outcome
 * (a hard failure) is indistinguishable from the common one (a skip).
 *
 * So each state is written down: which story, how to open it, and the selector that only exists once it is
 * open. An entry naming a story that is not in the built index fails. A declared family member with no
 * entry fails. The suite therefore cannot quietly stop covering a component, which is the failure mode
 * this whole file exists to prevent.
 *
 * ── How "open" is established without a sleep ─────────────────────────────
 *
 * Three facts, each waited for rather than assumed:
 *
 *   1. the action is performed on a selector that must exist (Playwright fails if it does not),
 *   2. `surface` becomes visible — Playwright waits for that, however long the animation takes,
 *   3. no animation is still running, by `document.getAnimations()`, so geometry is settled.
 *
 * There is no `waitForTimeout` anywhere in the sequence. An overlay that never opens stops at (2) with the
 * selector that was being waited for, and is reported as a failure against that component and state.
 */

/**
 * The overlay family, by canonical manifest slug. Every one of these must have at least one open state
 * below, or `coverageErrors` fails: adding an overlay to the family without a scanned open state is the
 * regression this list exists to catch.
 */
export const OVERLAY_FAMILY = [
  "dialog",
  "alert-dialog",
  "sheet",
  "drawer",
  "modal",
  "popover",
  "tooltip",
  "dropdown-menu",
  "context-menu",
  "menubar",
];

/**
 * `open` is one of four actions, chosen per primitive rather than forced into one shape:
 *
 *   click      — a trigger button (Dialog, AlertDialog, Sheet, Drawer, Modal, Popover, DropdownMenu, Menubar)
 *   rightClick — ContextMenu, whose whole contract is the contextmenu event
 *   focus      — Tooltip, which opens for a keyboard user on focus and is the state worth scanning;
 *                hover would need the provider's 700ms delay and a pointer that stays put
 *
 * `modal` says whether focus must ENTER the surface on open and be contained there until it closes.
 * It is true for the five dialog-shaped surfaces and false for the rest, and that is a statement about
 * each primitive rather than a preference: a Popover and a Tooltip are non-modal by design, and adding a
 * focus trap to either for symmetry would be a regression, not a fix. The menus manage focus themselves
 * without trapping Tab in the DOM sense, so they are checked for focus entry and not for containment.
 *
 * `stampsDir` marks the surfaces that write a `dir` attribute of their own onto their content. The three
 * menus do; Dialog, Sheet, Popover and Tooltip do not. It matters because an explicit attribute beats
 * inherited CSS: an app that sets `dir="rtl"` on <html> and does not also wrap in
 * `KinetixDirectionProvider` gets menus stamped `dir="ltr"`, so they read left-to-right inside a
 * right-to-left page. Measured, both widths. That is the concrete form of the rule RTL.md states — the
 * provider is not optional — and the check below asserts the stamp exists rather than pretending the
 * document attribute reached it.
 *
 * `surface` is measured, not guessed: each selector below is what that component actually renders into the
 * portal, read out of a real browser. Popover's content carries `role="dialog"`; Tooltip's carries
 * `role="tooltip"`; the three menus carry `role="menu"`; AlertDialog is `role="alertdialog"`.
 */
export const OPEN_STATES = [
  { component: "dialog", modal: true, story: "overlays-dialog--default", state: "open dialog", open: { click: "#storybook-root button" }, surface: '[role="dialog"]' },
  { component: "alert-dialog", modal: true, story: "overlays-alertdialog--default", state: "open alert dialog", open: { click: "#storybook-root button" }, surface: '[role="alertdialog"]' },
  { component: "sheet", modal: true, story: "overlays-sheet--default", state: "open sheet", open: { click: "#storybook-root button" }, surface: '[role="dialog"]' },
  { component: "drawer", modal: true, story: "overlays-drawer--default", state: "open drawer", open: { click: "#storybook-root button" }, surface: '[role="dialog"]' },
  { component: "modal", modal: true, story: "overlays-modal--default", state: "open modal", open: { click: "#storybook-root button" }, surface: '[role="dialog"]' },
  { component: "popover", modal: false, story: "overlays-popover--default", state: "open popover", open: { click: "#storybook-root button" }, surface: '[role="dialog"]' },
  { component: "tooltip", modal: false, story: "overlays-tooltip--default", state: "visible tooltip", open: { focus: "#storybook-root button" }, surface: '[role="tooltip"]' },
  { component: "dropdown-menu", modal: false, stampsDir: true, story: "overlays-dropdownmenu--default", state: "open menu", open: { click: "#storybook-root button" }, surface: '[role="menu"]' },
  { component: "context-menu", modal: false, stampsDir: true, story: "overlays-contextmenu--default", state: "open context menu", open: { rightClick: "#storybook-root [data-state]" }, surface: '[role="menu"]' },
  { component: "menubar", modal: false, stampsDir: true, story: "navigation-menubar--default", state: "open menubar menu", open: { click: '#storybook-root [role="menuitem"]' }, surface: '[role="menu"]' },
];

/** The one action key each entry carries, so a malformed entry is a failure rather than a silent no-op. */
export const ACTIONS = ["click", "rightClick", "focus"];

/**
 * Reasons this declaration is not trustworthy, if any. Called before the browser launches: a list that has
 * drifted from the catalogue or from the built Storybook should stop the run, not produce a smaller one.
 *
 * `storyIds` is the set of story ids in the built index; `slugs` the manifest's component slugs.
 */
export function coverageErrors({ storyIds, slugs }) {
  const errors = [];
  const covered = new Set(OPEN_STATES.map((s) => s.component));

  for (const slug of OVERLAY_FAMILY) {
    if (!slugs.has(slug)) {
      errors.push(`open-states: ${slug} is in OVERLAY_FAMILY but not in components.manifest.json`);
    } else if (!covered.has(slug)) {
      errors.push(
        `open-states: ${slug} is in OVERLAY_FAMILY with no open state declared — its axe evidence would ` +
          `come from a closed trigger. Add an entry to OPEN_STATES or remove it from the family.`,
      );
    }
  }
  for (const entry of OPEN_STATES) {
    if (!slugs.has(entry.component)) {
      errors.push(`open-states: ${entry.component} is not a component in components.manifest.json`);
    }
    if (!storyIds.has(entry.story)) {
      errors.push(
        `open-states: ${entry.component}'s state "${entry.state}" names the story ${entry.story}, which is ` +
          `not in the built Storybook index. Run \`pnpm gen:stories\` and rebuild Storybook.`,
      );
    }
    const actions = ACTIONS.filter((a) => entry.open?.[a]);
    if (actions.length !== 1) {
      errors.push(
        `open-states: ${entry.component}'s state "${entry.state}" must declare exactly one of ` +
          `${ACTIONS.join(" / ")}; it declares ${actions.length}.`,
      );
    }
    if (!entry.surface) errors.push(`open-states: ${entry.component}'s state "${entry.state}" declares no surface selector`);
  }
  return errors;
}

/**
 * Open one declared surface in an already-loaded story page, and return what was measured.
 *
 * Shared rather than written twice: `a11y-browser.mjs` needs it to scan and to check the focus contract,
 * and `large-text.mjs` needs it to measure the same surfaces at 200% text and at phone width. Two copies
 * of this sequence would be two chances for one of them to start waiting a little less carefully.
 *
 * Throws with the selector it was waiting for. The caller turns that into a failure against a named
 * component and state; nothing here returns a "could not open" that a caller might treat as a skip.
 */
export async function openSurface(page, entry, { timeout = 10_000 } = {}) {
  // A focus-opened surface will not reappear if the trigger is still the active element, which is the
  // state the page is in after a close-and-reopen. Blur first, so "focus the trigger" is a transition.
  if (entry.open.focus) await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  if (entry.open.click) await page.click(entry.open.click, { timeout });
  else if (entry.open.rightClick) await page.click(entry.open.rightClick, { button: "right", timeout });
  else if (entry.open.focus) await page.focus(entry.open.focus, { timeout });

  await page.waitForSelector(entry.surface, { state: "visible", timeout });
  // Settled, by asking the browser rather than by waiting a guessed number of milliseconds.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"), null, { timeout });

  const measured = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const r = el.getBoundingClientRect();
    const active = document.activeElement;
    /** An ancestor chain check, because the hidden element is the page root and not the focused node. */
    const inAriaHidden = (node) => {
      for (let n = node; n; n = n.parentElement) if (n.getAttribute?.("aria-hidden") === "true") return true;
      return false;
    };
    return {
      role: el.getAttribute("role"),
      w: Math.round(r.width),
      h: Math.round(r.height),
      text: (el.textContent || "").trim().slice(0, 40),
      // Does the surface fit on screen, and did the page gain a sideways scroll because of it?
      offscreen: r.left < -1 || r.top < -1 || r.right > document.documentElement.clientWidth + 1 || r.bottom > document.documentElement.clientHeight + 1,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      // Text that no longer fits the box it is in.
      // Visually-hidden text is a 1x1 box with its content clipped — that is what `sr-only` IS, so
      // counting it would report every Close button's screen-reader label as a defect. Measured: the
      // first version of this check did exactly that, on Dialog and Sheet, in all four combinations.
      clipped: [...el.querySelectorAll("*")].some((n) => {
        const cs = getComputedStyle(n);
        if (cs.overflowX !== "hidden" && cs.overflowY !== "hidden") return false;
        if (n.clientWidth <= 1 || n.clientHeight <= 1) return false;
        return n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1;
      }),
      focusInside: Boolean(active && el.contains(active)),
      focusInAriaHidden: Boolean(active && active !== document.body && inAriaHidden(active)),
      focusDescription: active ? `${active.tagName.toLowerCase()}${active.getAttribute("role") ? `[${active.getAttribute("role")}]` : ""}` : "none",
    };
  }, entry.surface);

  if (measured.w < 1 || measured.h < 1) {
    throw new Error(`surface ${entry.surface} is present but has no size (${measured.w}x${measured.h})`);
  }
  return measured;
}
