/**
 * Editorial copy for the component pages readers most often land on from search, and most often confuse with a
 * sibling: what the component is, when to use it, and when a related component fits better.
 *
 * The rules this data is held to (component-editorial.test.ts and `pnpm check:editorial`):
 *
 * - Every sentence describes behaviour the React source or its tests show. Where a claim rests on a test, the
 *   comment above the entry names the test. Nothing is said about other platforms here: the Platforms row of the
 *   page already states what each platform implements, derived from the manifest.
 * - Plain text only (no Markdown, no backticks): `summary` becomes the page's search description.
 * - 80–180 words per entry, no stock phrases (see `BOILERPLATE`), and every alternative names a real component page.
 *
 * Pages not listed here keep their hand-written summary. Adding a page is: add an entry, then in its page.mdx call
 * `componentMetadata("<slug>")` with no summary and replace the lead paragraph with `<ComponentIntro slug="…" />` and
 * `<ComponentGuide slug="…" />` after the preview.
 */

export type ComponentAlternative = {
  /** Component page slug of the sibling. */
  slug: string;
  /** Completes the sentence "<Sibling name> …": when the sibling is the better choice. */
  when: string;
};

export type ComponentEditorial = {
  /** What it is, in practical terms. One or two sentences; also the search description lead. */
  summary: string;
  /** When to use it: two or three concrete situations. */
  useWhen: readonly string[];
  /** When a sibling is the better choice. */
  instead?: readonly ComponentAlternative[];
  /** Only behaviour a test asserts. */
  accessibility?: string;
};

/**
 * Stock phrases that say nothing specific, and claims the project cannot back (marketing/CLAIMS.md). The gate fails
 * an entry, or a rendered intro, that uses one.
 */
export const BOILERPLATE: readonly RegExp[] = [
  /\bflexible\b/i,
  /\bversatile\b/i,
  /\bpowerful\b/i,
  /\bbeautiful(ly)?\b/i,
  /\bseamless(ly)?\b/i,
  /\bmodern (web )?(applications|apps)\b/i,
  /\beasy to use\b/i,
  /\benterprise[- ]grade\b/i,
  /\bbattle[- ]tested\b/i,
  /\bproduction[- ](ready|proven)\b/i,
  /\bbest[- ]in[- ]class\b/i,
  /\bfull(y)? (parity|accessible)\b/i,
  /\bpixel[- ]perfect\b/i,
];

export const COMPONENT_EDITORIAL: Record<string, ComponentEditorial> = {
  // components-keyboard.test.tsx: "opens from the keyboard and moves focus inside", "traps Tab inside the dialog",
  // "closes on Escape and returns focus to the trigger".
  dialog: {
    summary:
      "Dialog shows a focused task in a window above the page, with a backdrop, a close button and free-form header, body and footer parts.",
    useWhen: [
      "A short task that should interrupt the page, such as editing one record or confirming a setting.",
      "Content you compose yourself: a form, a preview or a step that needs its own layout.",
    ],
    instead: [
      { slug: "alert-dialog", when: "when the user must answer before continuing, especially before a destructive action." },
      { slug: "modal", when: "when you want the standard header, body and footer with typed buttons instead of composing parts." },
      { slug: "sheet", when: "when the task benefits from keeping more of the page in view, in a panel from an edge." },
    ],
    accessibility:
      "Keyboard tests check that it opens from the keyboard, moves focus inside, keeps Tab inside while open, and closes on Escape with focus returned to the trigger.",
  },
  // components-keyboard.test.tsx: "opens with Enter and puts focus on the safe action, not the destructive one",
  // "closes on Escape and returns focus to the trigger".
  "alert-dialog": {
    summary:
      "Alert Dialog interrupts the page with a decision the user must make, offering a primary action and a cancel action and no close button.",
    useWhen: [
      "Confirming something hard to undo, such as deleting data or discarding unsaved work.",
      "Any question the user should not be able to dismiss without choosing an answer.",
    ],
    instead: [
      { slug: "dialog", when: "when the content is a task rather than a yes-or-no decision." },
      { slug: "modal", when: "when you want the same decision typed as Info, Confirmation, Warning or Destructive from props." },
    ],
    accessibility:
      "Keyboard tests check that opening it with Enter puts focus on the safe action rather than the destructive one, and that Escape closes it and returns focus to the trigger.",
  },
  // components-keyboard.test.tsx: "opens from the keyboard, names itself, and closes on Escape without taking the
  // action"; components-overlay.test.tsx: "Modal's own buttons carry its decisions, and each fires once".
  modal: {
    summary:
      "Modal is a Dialog with a fixed structure, header, body and footer, configured from props and typed as Info, Confirmation, Warning or Destructive.",
    useWhen: [
      "Messages and confirmations that should look the same everywhere in a product.",
      "Teams that want the buttons decided by type: one action for Info, Cancel plus a confirm, proceed or delete action for the others.",
    ],
    instead: [
      { slug: "dialog", when: "when the content needs its own layout, such as a form or a preview." },
      { slug: "alert-dialog", when: "when you need to compose the decision's parts yourself." },
    ],
    accessibility:
      "A keyboard test checks that it opens from the keyboard, is named by its title, and closes on Escape without taking the action.",
  },
  // components-keyboard.test.tsx: "traps Tab inside the panel and closes on Escape, returning focus".
  sheet: {
    summary:
      "Sheet is a dialog that slides in from an edge of the screen, top, bottom, left or right, and keeps the rest of the page visible behind it.",
    useWhen: [
      "Secondary content that relates to the page: filters, details of a selected row, settings for the current view.",
      "Longer tasks than a centred dialog comfortably holds.",
    ],
    instead: [
      { slug: "drawer", when: "for a bottom panel aimed at touch screens." },
      { slug: "dialog", when: "for a short task that deserves the reader's full attention." },
      { slug: "sidebar", when: "for persistent navigation that stays open while people work." },
    ],
    accessibility:
      "A keyboard test checks that Tab stays inside the open panel and that Escape closes it and returns focus. Left and right are physical edges, so they do not swap in right-to-left layouts.",
  },
  // components-overlay.test.tsx: "moves focus into the panel, and not onto the trigger the drawer has just hidden".
  drawer: {
    summary:
      "Drawer is a panel that rises from the bottom of the screen with a handle bar, built on Vaul, and scales the page behind it back by default.",
    useWhen: [
      "Mobile and touch layouts, where a bottom panel sits within reach of the thumb.",
      "Quick choices and short forms that should feel attached to the current screen.",
    ],
    instead: [
      { slug: "sheet", when: "when the panel should come from the top or a side, or the layout is mainly desktop." },
      { slug: "dialog", when: "for a centred, focused task on a large screen." },
    ],
    accessibility:
      "On open, focus moves to the panel itself rather than to its first field, so a phone's keyboard does not jump open; a test checks that focus does not stay on the hidden trigger.",
  },
  // components-keyboard.test.tsx: "opens with Enter, walks options with the arrow keys and Home/End, and commits with
  // Enter", "jumps to an option by typing its first letter", "closes with Escape without choosing".
  select: {
    summary:
      "Select lets someone choose one value from a fixed list in a styled popup listbox, opened from a trigger that matches the Input styles.",
    useWhen: [
      "A single choice from a short, known list, such as a country, a sort order or a status.",
      "Forms where the list should look the same on every browser and operating system.",
    ],
    instead: [
      { slug: "native-select", when: "when the form must work without JavaScript, or you want the operating system's own picker on phones." },
      { slug: "combobox", when: "when the list is long enough that people need to type to filter it." },
      { slug: "multi-select", when: "when people can pick more than one value." },
    ],
    accessibility:
      "Keyboard tests check that Enter opens it, arrow keys and Home and End move between options, typing a letter jumps to a match, and Escape closes it without choosing and returns focus to the trigger.",
  },
  "native-select": {
    summary:
      "Native Select is the browser's own select element, styled to match Input, for forms that must submit without JavaScript or should use the phone's native picker.",
    useWhen: [
      "Server-rendered forms that have to work before or without client JavaScript.",
      "Mobile-heavy flows where the operating system's picker is the better experience.",
    ],
    instead: [
      { slug: "select", when: "when the options need custom rendering or the same popup on every platform." },
      { slug: "radio-group", when: "when there are only a few options and showing them all at once helps people compare." },
      { slug: "combobox", when: "when the list is long enough that people need to type to filter it." },
    ],
  },
  combobox: {
    summary:
      "Combobox is a recipe rather than a component: a Popover holding a Command, so people can type to filter a long list and pick one value.",
    useWhen: [
      "Single choices from long lists, such as a timezone, a repository or a person.",
      "Pickers where typing is faster than scrolling.",
    ],
    instead: [
      { slug: "select", when: "for a short list people can scan without typing." },
      { slug: "multi-select", when: "when more than one value can be chosen; it is built on the same Command and Popover parts." },
      { slug: "command", when: "when the list is of actions to run rather than a value to store." },
    ],
  },
  // components-keyboard.test.tsx: "can be opened and an option chosen using only the keyboard", "closes with Escape
  // and gives focus back to the combobox", "Backspace in the empty search field removes the last chip".
  "multi-select": {
    summary:
      "Multi-Select lets people search a list and choose several values, shown as removable chips, with an optional row for creating a new value.",
    useWhen: [
      "Tags, labels, assignees and other many-to-one fields.",
      "Lists long enough that people need search to find the values they want.",
    ],
    instead: [
      { slug: "checkbox", when: "when there are only a handful of options and they should all stay visible." },
      { slug: "combobox", when: "when only one value can be chosen." },
      { slug: "tag", when: "for displaying values that are already chosen, without editing them." },
    ],
    accessibility:
      "Keyboard tests check that it opens with Enter or a vertical arrow, that an option can be chosen with the keyboard alone, that Escape returns focus to the field, and that Backspace in an empty search removes the last chip.",
  },
  command: {
    summary:
      "Command is a searchable list of actions or items, built on cmdk, with groups, keyboard shortcuts and an empty state, usable inline or inside a dialog.",
    useWhen: [
      "A command palette that lets people jump to pages or run actions by typing.",
      "The searchable list inside a picker, as Combobox and Multi-Select use it.",
      "Search inside a dialog, through the Command Dialog wrapper that places the list in a Dialog.",
    ],
    instead: [
      { slug: "dropdown-menu", when: "for a short, fixed set of actions where search would add nothing." },
      { slug: "combobox", when: "when the result of choosing is a stored value rather than an action." },
    ],
  },
  // components-keyboard.test.tsx: "opens with Enter, walks items with the arrow keys, closes with Escape".
  "dropdown-menu": {
    summary:
      "Dropdown Menu opens a list of actions from a button, with checkbox and radio items, labels, separators and submenus.",
    useWhen: [
      "Overflow actions on a row, card or toolbar, behind a single button.",
      "Small sets of options that change the view, such as sort order or visible columns.",
    ],
    instead: [
      { slug: "context-menu", when: "when the same actions should open from a right-click or long press on the item itself." },
      { slug: "menubar", when: "for a desktop-style bar of menus that stays on screen." },
      { slug: "select", when: "when the user is choosing a form value rather than running an action." },
    ],
    accessibility:
      "A keyboard test checks that Enter opens the menu, arrow keys move between items, and Escape closes it.",
  },
  // components-table-scroll.test.tsx: "adds no tab stop when the table fits", "becomes focusable when the table is
  // wider than the container", "points aria-labelledby at the caption".
  table: {
    summary:
      "Table is a semantic HTML table with header, body, footer and caption parts, styled from the tokens, with horizontal scrolling when it outgrows its container.",
    useWhen: [
      "Small, read-only sets of rows such as a price list, a comparison or an invoice.",
      "Data you sort, filter or page on the server and simply render.",
    ],
    instead: [
      { slug: "data-table", when: "when people need to sort and page the rows in the browser." },
      { slug: "data-grid", when: "for large or editable data with keyboard navigation between cells." },
      { slug: "description-list", when: "for label and value pairs about one item." },
    ],
    accessibility:
      "It stays a real table element. Tests check that the scroll area becomes a keyboard stop only when the table is wider than its container, and that it takes its name from the caption.",
  },
  "data-table": {
    summary:
      "Data Table renders rows from column definitions with sorting and pagination switched on, built on TanStack Table and drawn with the KinetixUI Table.",
    useWhen: [
      "Admin lists and reports that people sort and page in the browser.",
      "A starting point you can replace with TanStack Table's own hooks when you need filtering or row selection.",
    ],
    instead: [
      { slug: "table", when: "when the rows are static or already sorted and paged by the server." },
      { slug: "data-grid", when: "when the row count calls for virtualisation, or people need to edit cells, resize or pin columns." },
    ],
  },
  // components-keyboard.test.tsx, DataGrid suite: single tab stop, arrow-key cell movement, Home/End and
  // Ctrl+Home/End, Enter to edit and Escape to cancel, mirrored arrows under RTL.
  "data-grid": {
    summary:
      "Data Grid is a spreadsheet-style grid with row virtualisation, column resizing, reordering and pinning, sorting, in-place cell editing and optional range selection with copy.",
    useWhen: [
      "Thousands of rows, where rendering every row would slow the page.",
      "Operational tools where people edit values in place or rearrange columns to fit their task.",
    ],
    instead: [
      { slug: "data-table", when: "for a lighter sortable, paginated list without editing." },
      { slug: "table", when: "for static content that should stay a plain HTML table." },
    ],
    accessibility:
      "It is one tab stop. Keyboard tests cover moving between cells with the arrow keys, Home, End and Ctrl combinations, editing with Enter or F2, cancelling with Escape, and mirrored arrows in right-to-left layouts.",
  },
  // components-keyboard.test.tsx: "is a single tab stop; ArrowRight moves to and selects the next tab", "supports
  // Home and End", "mirrors the arrow keys under RTL".
  tabs: {
    summary:
      "Tabs show one panel of related content at a time, switched from a row of triggers, so a page can hold several views without scrolling.",
    useWhen: [
      "Sibling views of the same subject, such as Overview, Activity and Settings.",
      "Code samples per platform or language, where readers want one at a time.",
    ],
    instead: [
      { slug: "segmented-control", when: "when the choice filters or switches a value and there are no separate panels." },
      { slug: "accordion", when: "when readers may want several sections open at once, or the content is long." },
      { slug: "tab-bar", when: "for an app's main navigation at the bottom of a phone screen." },
    ],
    accessibility:
      "Keyboard tests check one tab stop for the whole row, arrow keys that move and select, Home and End, and arrow directions that mirror in right-to-left layouts.",
  },
  "segmented-control": {
    summary:
      "Segmented Control is a single-choice strip of buttons that looks like tabs but has no panels: a preset over Toggle Group with exactly one option selected.",
    useWhen: [
      "Switching a value that changes what the current view shows, such as Day, Week or Month.",
      "Two to five short options that people should see side by side.",
    ],
    instead: [
      { slug: "tabs", when: "when each option shows its own panel of content." },
      { slug: "toggle-group", when: "when several options can be on at once." },
      { slug: "radio-group", when: "inside a form, where the options need longer labels." },
    ],
  },
  // components-keyboard.test.tsx: "appears on keyboard focus and describes its trigger"; components-overlay.test.tsx:
  // "Tooltip does not trap focus either, and closes on Escape".
  tooltip: {
    summary:
      "Tooltip shows a short text label next to an element on hover or keyboard focus, and describes the element it belongs to.",
    useWhen: [
      "Naming icon-only buttons and showing keyboard shortcuts.",
      "One line of extra context that people can do without.",
    ],
    instead: [
      { slug: "hover-card", when: "to preview richer content behind a link, for sighted pointer users." },
      { slug: "popover", when: "when the content has links, buttons or fields people need to reach." },
    ],
    accessibility:
      "Tests check that it appears on keyboard focus, describes its trigger to assistive technology, does not trap focus and closes on Escape. Keep essential information out of it.",
  },
  // components-keyboard.test.tsx: "closes on Escape and returns focus to its trigger"; components-overlay.test.tsx:
  // accessible name and "closes on Escape and hands focus back, without trapping it the way a dialog does".
  popover: {
    summary:
      "Popover opens a small panel of rich content anchored to a trigger, such as a short form, filters or details, without blocking the rest of the page.",
    useWhen: [
      "Interactive content tied to one control: quick filters, a share panel, or the calendar of a date picker.",
      "The base for composed pickers such as Combobox and Date Picker.",
    ],
    instead: [
      { slug: "tooltip", when: "for a short, non-interactive label." },
      { slug: "dialog", when: "when the task should block the page until it is done." },
      { slug: "dropdown-menu", when: "when the content is a list of actions." },
    ],
    accessibility:
      "Tests check that it closes on Escape and returns focus to its trigger without trapping focus like a dialog, and that it has an accessible name, which you should set with a label.",
  },
  "hover-card": {
    summary:
      "Hover Card shows a preview card when a pointer rests on a link, such as a profile or a page summary, for sighted users who want a glance before clicking.",
    useWhen: [
      "Previewing a person, a repository or an article behind a link.",
      "Supplementary detail the link's destination also provides.",
      "Desktop layouts. Touch screens have no hover, so never put the only copy of information in a hover card.",
    ],
    instead: [
      { slug: "tooltip", when: "for a one-line label that keyboard users also need." },
      { slug: "popover", when: "when the content must be reachable by keyboard and touch, or holds actions." },
    ],
  },
  // components-form.test.tsx: label, description and message association; "moves focus to the failing control".
  form: {
    summary:
      "Form connects React Hook Form to KinetixUI fields, wiring each control's label, description and error message, and setting aria-invalid when validation fails.",
    useWhen: [
      "React forms that already use, or will use, React Hook Form for state and validation.",
      "Forms that should report errors consistently, with each message tied to its control.",
    ],
    instead: [
      { slug: "field", when: "for the same label, control and message layout without a form library, on every platform." },
      { slug: "input", when: "for a single standalone text field outside a form." },
    ],
    accessibility:
      "Form tests check that each control is described by its description and error message and that a failed submit moves focus to the first invalid control. A validation library such as Zod plugs in through React Hook Form; Form itself does not require one.",
  },
};

/** Words across every field of an entry, alternatives' sentences included. */
export function editorialWordCount(e: ComponentEditorial): number {
  const text = [e.summary, ...e.useWhen, ...(e.instead ?? []).map((a) => a.when), e.accessibility ?? ""].join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}
