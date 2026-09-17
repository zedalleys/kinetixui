export type ComponentStatus = "stable" | "beta" | "deprecated";

/**
 * slug → maturity status. Absent slug ⇒ "stable" — same "exceptions only"
 * convention as {@link PRIMITIVE} and platform-parity's `EXCEPTIONS`. Single
 * source of truth — imported by the /components gallery and <ComponentMeta>
 * (doc pages).
 *
 * A component ships "beta" for the release cycle it lands in (still on all
 * required platforms, still CI-verified — "beta" here means "new", not
 * "incomplete"). Drop its entry once it's shipped a full cycle with no
 * reported issues, which promotes it to the "stable" default.
 *
 * "deprecated" has no members yet; nothing has been removed from the
 * library so far.
 */
export const STATUS: Record<string, Exclude<ComponentStatus, "stable">> = {
  // 0.12.0 — new this release
  "color-picker": "beta",
  "data-grid": "beta",
  "diff-viewer": "beta",
  "json-viewer": "beta",
  "kanban-board": "beta",
  "markdown-editor": "beta",
  "message-bubble": "beta",
  "multi-select": "beta",
  "notification-center": "beta",
  tour: "beta",
  "tree-view": "beta",
  "virtual-list": "beta",
};

export function statusOf(slug: string): ComponentStatus {
  return STATUS[slug] ?? "stable";
}
