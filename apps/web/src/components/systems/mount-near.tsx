"use client";

import * as React from "react";

/**
 * Mounts its children once they come within a screen of the viewport, and keeps them mounted.
 *
 * For the component spotlight's live previews only: four real interactive components (Radix slider, segmented
 * control, the composed preferences panel) far below the hero. Server-rendering them meant hydrating them in the
 * first-load task on every visit, which on a slow phone was about a tenth of the page's blocking time, for
 * demos most readers never scroll to. The space is reserved by the caller, so mounting shifts nothing on screen.
 * Without IntersectionObserver the children mount straight away.
 */
export function MountNear({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [near, setNear] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return setNear(true);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} data-mount-near={near ? "mounted" : "waiting"} className={className}>
      {near ? children : null}
    </div>
  );
}
