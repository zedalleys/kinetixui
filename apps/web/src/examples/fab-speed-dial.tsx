"use client";

import * as React from "react";
import { Fab } from "@kinetixui/ui";
import { Camera, FileUp, FolderPlus, Image as ImageIcon, Plus } from "lucide-react";

/**
 * A speed dial: one Fab that opens a short list of related actions.
 *
 * Motion, open: the Plus turns into a close mark while each action's disc pulls out of the Fab and travels to its
 * row, the furthest leaving first. A gooey SVG filter on a decorative layer keeps each disc joined to the Fab by a
 * stretching neck until it breaks away. Once a disc lands its icon fades in, then the labels slide out from
 * behind the discs, nearest first. Closing plays it back faster. Every timing is a motion token or a fraction of
 * one; only transform and opacity animate; with reduced motion everything lands in its final state at once.
 *
 * The decorative layer is aria-hidden and ignores the pointer. The real controls are a Fab with aria-expanded and
 * a list of ordinary buttons, named by their visible labels, reachable with Tab in order from the Fab outward.
 * Escape, a click outside or choosing an action closes the list and returns focus to the Fab.
 *
 * Centred like the reference from the sm breakpoint up; on narrow screens the Fab moves to the inline start so the
 * labels get the whole width to wrap into.
 */
const ACTIONS = [
  // nearest the Fab first: this is both the reading order and the Tab order
  { label: "Upload file", icon: FileUp },
  { label: "Create folder", icon: FolderPlus },
  { label: "Photo template", icon: ImageIcon },
  { label: "Take photo or video", icon: Camera },
];

// one stagger step, derived from the motion tokens so the choreography scales with them
const step = (n: number) => "calc(var(--duration-instant) * " + 0.6 * n + ")";
const after = (token: string, n: number) => "calc(var(" + token + ") + var(--duration-instant) * " + 0.6 * n + ")";

export function FabSpeedDial() {
  const [open, setOpen] = React.useState(false);
  const [last, setLast] = React.useState<string | null>(null);
  // how far each disc sits above the Fab's centre, measured, so wrapped labels and 200% text stay aligned
  const [rise, setRise] = React.useState<number[]>(() => ACTIONS.map(() => 0));
  const rootRef = React.useRef<HTMLDivElement>(null);
  const fabRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const discRefs = React.useRef<(HTMLSpanElement | null)[]>([]);
  const listId = React.useId();
  const gooId = "kx-goo-" + listId.replace(/[^a-zA-Z0-9]/g, "");

  React.useLayoutEffect(() => {
    const measure = () => {
      const fab = fabRef.current?.getBoundingClientRect();
      if (!fab) return;
      const centre = fab.top + fab.height / 2;
      setRise(
        discRefs.current.map((disc) => {
          const r = disc?.getBoundingClientRect();
          return r ? centre - (r.top + r.height / 2) : 0;
        }),
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined" || !listRef.current) return;
    const observer = new ResizeObserver(measure);
    observer.observe(listRef.current);
    return () => observer.disconnect();
  }, []);

  const close = React.useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) fabRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  const lastIndex = ACTIONS.length - 1;

  return (
    <div
      ref={rootRef}
      className="relative isolate grid w-full grid-cols-[0_auto_1fr] items-end gap-y-3 py-2 sm:grid-cols-[1fr_auto_1fr]"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          close(true);
        }
      }}
      onBlur={(event) => {
        if (open && !event.currentTarget.contains(event.relatedTarget as Node | null)) close(false);
      }}
    >
      <svg aria-hidden="true" className="absolute size-0">
        <defs>
          <filter id={gooId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div className="relative col-start-2 row-start-2">
        {/* Decorative: the discs that travel. The buttons below sit exactly on top of where they land. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/2 z-0 w-28 -translate-x-1/2 forced-colors:hidden"
          style={{ height: "calc(" + Math.max(...rise) + "px + 5.5rem)", filter: "url(#" + gooId + ")" }}
        >
          <span className="absolute bottom-0 left-1/2 -ml-7 size-14 rounded-full bg-action" />
          {ACTIONS.map((action, i) => (
            <span
              key={action.label}
              className="absolute bottom-1.5 left-1/2 -ml-[1.375rem] size-11 rounded-full bg-action transition-transform motion-reduce:transition-none"
              style={{
                transform: open ? "translateY(" + -rise[i] + "px)" : "translateY(0)",
                transitionDuration: open ? "var(--duration-slow)" : "var(--duration-base)",
                transitionTimingFunction: open ? "var(--easing-emphasized)" : "var(--easing-exit)",
                transitionDelay: open ? step(lastIndex - i) : after("--duration-fast", i * 0.5),
              }}
            />
          ))}
        </div>
        <Fab
          ref={fabRef}
          aria-label="Create"
          aria-expanded={open}
          aria-controls={listId}
          className="relative z-10"
          onClick={() => setOpen((o) => !o)}
        >
          <Plus
            className={"transition-transform motion-reduce:transition-none " + (open ? "rotate-45" : "rotate-0")}
            style={{ transitionDuration: "var(--duration-base)", transitionTimingFunction: "var(--easing-emphasized)" }}
          />
        </Fab>
      </div>

      <ul
        id={listId}
        ref={listRef}
        aria-label="Create"
        className={
          "relative z-10 col-span-2 col-start-2 row-start-1 flex flex-col-reverse gap-3 justify-self-start ps-1.5 " +
          "transition-[visibility] motion-reduce:transition-none " +
          (open ? "visible" : "invisible")
        }
        // hidden only once the closing motion has played, so nothing vanishes mid-animation
        style={{ transitionDelay: open ? "0s" : "calc(var(--duration-fast) + var(--duration-base))" }}
      >
        {ACTIONS.map((action, i) => {
          const Icon = action.icon;
          return (
            <li key={action.label}>
              <button
                type="button"
                className="group flex items-center rounded-[1.375rem] text-start outline-none focus-visible:shadow-focus forced-colors:focus-visible:[outline:2px_solid_Highlight]"
                onClick={() => {
                  setLast(action.label);
                  close(true);
                }}
              >
                <span
                  ref={(el) => {
                    discRefs.current[i] = el;
                  }}
                  className={
                    "relative z-10 grid size-11 shrink-0 place-items-center rounded-full bg-action text-action-foreground " +
                    "transition-[opacity,transform] group-hover:bg-action/90 group-active:bg-action/85 motion-reduce:transition-none " +
                    "forced-colors:border forced-colors:border-[ButtonText] [&_svg]:size-5 " +
                    (open ? "scale-100 opacity-100" : "scale-75 opacity-0")
                  }
                  style={{
                    transitionDuration: open ? "var(--duration-fast)" : "var(--duration-instant)",
                    transitionTimingFunction: open ? "var(--easing-enter)" : "var(--easing-exit)",
                    transitionDelay: open ? after("--duration-base", (lastIndex - i) * 0.5) : step(0.5),
                  }}
                >
                  <Icon aria-hidden="true" />
                </span>
                {/* the label slides out from behind the disc; the clip is what makes it emerge rather than fade */}
                <span className="-ms-2 overflow-hidden py-1 pe-2">
                  <span
                    className={
                      "block rounded-[1.125rem] bg-card py-2 pe-4 ps-5 text-body-md font-medium text-card-foreground shadow-sm " +
                      "transition-[opacity,transform] group-hover:bg-muted motion-reduce:transition-none " +
                      "forced-colors:border forced-colors:border-[ButtonText] " +
                      (open ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 rtl:translate-x-full")
                    }
                    style={{
                      transitionDuration: open ? "var(--duration-base)" : "var(--duration-fast)",
                      transitionTimingFunction: open ? "var(--easing-enter)" : "var(--easing-exit)",
                      // starts once the nearest disc is opaque, so the label never shows through it
                      transitionDelay: open ? after("--duration-slow", 2 + i) : "0s",
                    }}
                  >
                    {action.label}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p role="status" className="col-span-3 row-start-3 min-h-6 text-center text-body-md text-muted-foreground">
        {last ? "Last action: " + last : ""}
      </p>
    </div>
  );
}
