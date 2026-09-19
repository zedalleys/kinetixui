import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The Material type-scale utilities (`text-label-md`, `text-body-sm`, …) come
// from `fontSize` in tailwind.config.ts. Without this, tailwind-merge reads them
// as text *colours* and drops a real colour class (`text-primary-foreground`).
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-lg", "display-md", "display-sm",
            "headline-lg", "headline-md", "headline-sm",
            "title-lg", "title-md", "title-sm", "title-dialog",
            "label-lg", "label-md", "label-sm",
            "body-lg", "body-md", "body-sm",
          ],
        },
      ],
    },
  },
});

/** Merges Tailwind class names, resolving conflicts (clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
