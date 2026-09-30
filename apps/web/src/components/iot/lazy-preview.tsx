"use client";

import * as React from "react";
import { iotPreviewLoaders } from "@/registry/iot-preview-loaders";

/**
 * Mounts an interactive IoT example only when it is about to be seen.
 *
 * `/iot` has a dozen interactive examples and most sit below the fold or in an inactive tab. Bundling them
 * all into the route made its first load 77 kB heavier than the page it replaced, to run simulations nobody
 * had scrolled to. This wrapper defers each one's chunk until its placeholder is within `rootMargin` of the
 * viewport (or its tab is activated, which mounts it in view immediately).
 *
 * - **Initial render is the server render.** `active` starts `false`, so hydration sees exactly the
 *   placeholder the server sent. The observer runs in an effect, after mount.
 * - **The placeholder is server-rendered** and passed in as `fallback`: it holds the height and the
 *   SIMULATION notice, so the disclosure is in the HTML and does not shift when the example replaces it.
 *   The mounted example carries its own notice; the placeholder is unmounted, so there is never two.
 * - **No IntersectionObserver** (very old browsers, some test runners) mounts immediately rather than never.
 * - **A waiting mark.** The reserved height on its own reads as a broken page on a slow connection, so the
 *   placeholder carries one quiet chip that says the preview is loading. It is laid over the reserved box
 *   (`absolute`), so it adds no height and shifts nothing when the example replaces it.
 * - **Reduced motion.** The chip's dot pulses only under `motion-safe`; the word "Loading" is the signal that
 *   does not move, so nothing is carried by animation alone.
 * - **Deliberately `aria-hidden`.** `/iot` holds a dozen of these. A live region here would announce
 *   "loading" again for every example the reader scrolls past, which is noise, not news: the example's
 *   heading, description and Code tab are already server-rendered above it and are the dependable path. The
 *   mark is a visual reassurance for a sighted reader watching an empty box.
 * - **A failed chunk** shows a plain sentence instead of taking the page down.
 */
type Loaded = React.LazyExoticComponent<React.ComponentType>;
const cache = new Map<string, Loaded>();

function componentFor(slug: string): Loaded | null {
  const loader = iotPreviewLoaders[slug];
  if (!loader) return null;
  let component = cache.get(slug);
  if (!component) {
    component = React.lazy(loader);
    cache.set(slug, component);
  }
  return component;
}

/** Start fetching an example's chunk without mounting it, e.g. on tab hover or focus. Safe to call twice. */
export function preloadPreview(slug: string): void {
  void iotPreviewLoaders[slug]?.().catch(() => {});
}

class ChunkBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <p role="status" className="text-sm text-muted-foreground">
          This preview could not be loaded. Reload the page to try again; the source is in the Code tab.
        </p>
      );
    }
    return this.props.children;
  }
}

/**
 * The reserved-height placeholder with a quiet "loading" mark laid over it.
 *
 * The mark is absolutely positioned inside the reserved block, so the block's height is unchanged and there is
 * no layout shift when the example mounts. See the note above for why it is out of the accessibility tree.
 */
function Waiting({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative" data-preview-loading="">
      {children}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-card/90 px-3 py-1 text-label-md text-muted-foreground shadow-sm">
          <span className="size-2 rounded-full bg-muted-foreground motion-safe:animate-pulse motion-reduce:animate-none" />
          Loading preview
        </span>
      </span>
    </div>
  );
}

export function LazyPreview({
  slug,
  fallback,
  rootMargin = "400px",
}: {
  slug: string;
  fallback: React.ReactNode;
  rootMargin?: string;
}) {
  const [active, setActive] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (active) return;
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setActive(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [active, rootMargin]);

  const Preview = active ? componentFor(slug) : null;
  const waiting = <Waiting>{fallback}</Waiting>;
  return (
    <div ref={ref} data-lazy-preview={slug} data-mounted={Preview ? "" : undefined}>
      {Preview ? (
        <ChunkBoundary>
          <React.Suspense fallback={waiting}>
            <Preview />
          </React.Suspense>
        </ChunkBoundary>
      ) : (
        waiting
      )}
    </div>
  );
}
