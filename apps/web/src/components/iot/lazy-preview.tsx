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
 * - **Reduced motion.** Nothing here animates.
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
  return (
    <div ref={ref} data-lazy-preview={slug} data-mounted={Preview ? "" : undefined}>
      {Preview ? (
        <ChunkBoundary>
          <React.Suspense fallback={fallback}>
            <Preview />
          </React.Suspense>
        </ChunkBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}
