/**
 * Which registry item (`/r/<item>.json`) delivers a component's React source.
 *
 * Almost always the component's own slug. Two docs pages are not registry items of their own, and their
 * "Registry" link used to 404 — found by `pnpm check:seo`'s internal-link rule:
 *
 * - `avatar-group`: `AvatarGroup` is exported from `avatar.tsx`, so it ships in the `avatar` item.
 * - `combobox`: a documented composition of `Command` (its manifest `platformNote` says so), not a component;
 *   `command` is the item that carries the source it is built from.
 *
 * `registry-items.test.ts` checks every docs page resolves to an item that really exists in registry.json.
 */
const SHIPPED_IN: Record<string, string> = {
  "avatar-group": "avatar",
  combobox: "command",
};

export function registryItemFor(slug: string): string {
  return SHIPPED_IN[slug] ?? slug;
}
