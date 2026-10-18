import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Every `text-<name>` font-size utility the site can emit beyond Tailwind's defaults: the canonical type scale from
 * the @kinetixui/ui preset, then the site-only roles in apps/web/tailwind.config.ts. Without these, tailwind-merge
 * reads `text-label-md` as a text *colour*, and `cn("text-label-md", "text-muted-foreground")` silently drops the
 * size. utils.test.ts holds this list to both Tailwind configs.
 */
export const FONT_SIZE_CLASSES = [
  "display-lg", "display-md", "display-sm",
  "headline-lg", "headline-md", "headline-sm",
  "title-lg", "title-md", "title-sm", "title-dialog",
  "label-lg", "label-md", "label-sm",
  "body-lg", "body-md", "body-sm",
  "code", "wordmark",
] as const;

const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: [...FONT_SIZE_CLASSES] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
