/**
 * Class-name joining.
 *
 * `packages/ui` uses `clsx` + `tailwind-merge` because its components have variant matrices where a
 * consumer's `bg-*` has to defeat a variant's `bg-*`. This module has no variants: each primitive
 * emits one fixed class string, and `className` is concatenated last. So a join is enough, and it
 * keeps this package at zero runtime dependencies — see the module README for why that matters here.
 *
 * The consequence, stated rather than hidden: conflicting Tailwind classes are not resolved. Passing
 * `className="bg-red-500"` to a primitive that already sets a background leaves both classes in the
 * attribute, and which one wins is Tailwind's source order, not this function's. A primitive that
 * ever grows real variants should move to `tailwind-merge` at that point.
 */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter((part): part is string => typeof part === "string" && part.length > 0).join(" ");
}
