import { cn } from "@/lib/utils";

/**
 * A slot for real editorial photography or video, used as an interruption between chapters — never as
 * evidence, and never carrying text a reader needs.
 *
 * It renders nothing until it is given media, so the page has the structure without a placeholder anyone can
 * see. When media arrives:
 *   - an image is lazy-loaded with explicit dimensions, so it cannot shift the layout;
 *   - a video never autoplays (with or without sound): it shows its poster with native controls, so it moves
 *     only when a reader starts it, and readers who prefer reduced motion and narrow screens get the poster
 *     image instead.
 */
export type EditorialMediaProps = {
  className?: string;
  /** a short description of what the picture shows; empty string only for a purely decorative image */
  alt?: string;
  width?: number;
  height?: number;
} & ({ image?: string; video?: never; poster?: never } | { image?: never; video?: string; poster: string });

export function EditorialMedia({ image, video, poster, alt = "", width = 1600, height = 900, className }: EditorialMediaProps) {
  if (!image && !video) return null;
  return (
    <figure data-editorial-media="" className={cn("m-0 overflow-hidden rounded-2xl border border-border", className)}>
      {video ? (
        <>
          <video
            className="hidden aspect-video w-full object-cover motion-safe:sm:block"
            src={video}
            poster={poster}
            width={width}
            height={height}
            controls
            playsInline
            preload="none"
            aria-label={alt || undefined}
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- a static poster with explicit size; no optimisation to gain */}
          <img src={poster} alt={alt} width={width} height={height} loading="lazy" className="aspect-video w-full object-cover motion-safe:sm:hidden" />
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- see above
        <img src={image} alt={alt} width={width} height={height} loading="lazy" className="w-full object-cover" />
      )}
    </figure>
  );
}
