"use client";

import * as React from "react";

/** Exact accessible target; interruptible visual interpolation. No initial count-up or live region. */
export function useAnimatedNumber(value: number): number {
  const [display, setDisplay] = React.useState(value);
  const current = React.useRef(value);
  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const css = getComputedStyle(document.documentElement).getPropertyValue("--duration-base").trim();
    const parsed = parseFloat(css);
    const duration = Number.isFinite(parsed) ? parsed * (css.endsWith("ms") ? 1 : 1000) : 300;
    const from = current.current;
    let frame = 0;
    const start = window.performance.now();
    const finish = () => { cancelAnimationFrame(frame); current.current = value; setDisplay(value); };
    const tick = (time: number) => {
      const progress = duration > 0 ? Math.min(1, (time - start) / duration) : 1;
      const next = progress === 1 ? value : from * (1 - progress) + value * progress;
      current.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    const preference = () => { if (media.matches) finish(); };
    const hidden = () => { if (document.hidden) finish(); };
    media.addEventListener("change", preference);
    document.addEventListener("visibilitychange", hidden);
    if (media.matches || document.hidden || !Number.isFinite(value) || !Number.isFinite(from) || from === value) finish();
    else frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); media.removeEventListener("change", preference); document.removeEventListener("visibilitychange", hidden); };
  }, [value]);
  return display;
}

const numberText = (value: number) => String(Math.round(value));
export interface AnimatedNumberProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  value: number;
  format?: (value: number) => string;
}
export function AnimatedNumber({ value, format = numberText, ...props }: AnimatedNumberProps) {
  const display = useAnimatedNumber(value);
  return <span {...props}><span aria-hidden="true">{format(display)}</span><span className="sr-only">{format(value)}</span></span>;
}
