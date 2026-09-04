"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Fades + lifts its child into view once, on scroll. Respects reduced-motion (CSS). */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  as?: React.ElementType;
  className?: string;
}) {
  const ref = React.useRef<HTMLElement>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return (
    <Tag
      ref={ref}
      data-reveal=""
      {...(shown ? { "data-shown": "" } : {})}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={className}
    >
      {children}
    </Tag>
  );
}

/** Horizontal ticker — children scroll left forever; pauses on hover. */
export function Marquee({
  children,
  className,
  durationSeconds = 32,
}: {
  children: React.ReactNode;
  className?: string;
  durationSeconds?: number;
}) {
  return (
    <div
      className={cn(
        "kx-marquee group relative flex overflow-hidden",
        "[mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]",
        className,
      )}
      style={{ ["--marquee-duration" as string]: `${durationSeconds}s` }}
    >
      <div className="kx-marquee-track" aria-hidden="true">
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center">{children}</div>
      </div>
    </div>
  );
}
