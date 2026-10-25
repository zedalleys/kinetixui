import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Heading with a hover-revealed `#` permalink (id from rehype-slug in MDX, or passed by a component).
 * Typography lives here — the docs layout no longer restyles headings — and is shared by the MDX renderer and
 * the docs components that emit their own section headings, so the two cannot drift apart.
 *
 * The anchor hides with `opacity-0`, which hides it from the eye and from nothing else: an opacity-0 element
 * still answers `elementFromPoint` and still takes a click. There is no hover on a touch device to reveal it, so
 * it stayed invisible and stayed tappable — a 15×31px target just past the end of every heading that silently
 * jumped the reader to a fragment. `pointer-events-none` is what actually removes it from the hit test, and the
 * reveal rules hand interactivity back at the same moment they hand back visibility, so a mouse user who hovers
 * the heading still clicks the `#`. Keyboard reach is untouched: `pointer-events` governs pointers only, and
 * `focus-visible` still reveals the anchor on tab.
 */
export function heading(Tag: "h2" | "h3" | "h4", base: string) {
  return function Heading({ id, children, className, ...p }: ComponentPropsWithoutRef<"h2">) {
    return (
      <Tag id={id} className={cn("group scroll-mt-28 break-words font-display", base, className)} {...p}>
        {children}
        {id ? (
          <a
            href={`#${id}`}
            data-heading-anchor
            aria-label="Permalink to this section"
            className="pointer-events-none ml-2 text-muted-foreground no-underline opacity-0 transition-opacity hover:text-primary focus-visible:pointer-events-auto focus-visible:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
          >
            #
          </a>
        ) : null}
      </Tag>
    );
  };
}

export const DocsH2 = heading("h2", "mb-4 mt-12 border-b border-border pb-2 text-2xl font-semibold");
export const DocsH3 = heading("h3", "mb-2 mt-8 text-lg font-semibold");
export const DocsH4 = heading("h4", "mt-6 text-base font-semibold");
