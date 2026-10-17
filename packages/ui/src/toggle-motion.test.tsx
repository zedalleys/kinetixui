import * as React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { KinetixDirectionProvider } from "./components/direction-provider";
import { Toggle, toggleVariants } from "./components/toggle";
import { ToggleGroup, ToggleGroupItem } from "./components/toggle-group";

/**
 * toggle-motion.test.tsx — MX1b-1a: Toggle and ToggleGroup on the `selection-state` and `press-feedback` roles.
 *
 * jsdom computes no Tailwind and runs no transition, so what a unit test can hold is the class contract that
 * makes the rendered result come out right, plus the state behaviour that must not wait for any of it. The
 * rendered half — the colour really interpolating over 200ms, the layer over 100ms, reduced motion landing
 * on the same end state, hover not sticking under touch — is `check:motion` and `check:toggle-motion`.
 *
 * Each contract rule is a function over a class string, and each is tested against a mutated string as
 * well as the real one, so a rule that could never fail is caught here rather than trusted.
 */

const FAST = "var(--duration-fast)";
const INSTANT = "var(--duration-instant)";

/** The properties a Toggle transitions and the tier each one runs on, read from one class string. */
function timing(cls: string): Record<string, string> | null {
  const props = /(?:^|\s)transition-\[([^\]]+)\]/.exec(cls)?.[1].split(",");
  const durs = /(?:^|\s)\[transition-duration:([^\]]+)\]/.exec(cls)?.[1].split(/,(?=var\()/);
  if (!props || !durs || props.length !== durs.length) return null;
  return Object.fromEntries(props.map((p, i) => [p, durs[i]]));
}

/** Everything wrong with a Toggle class string against MX1b-1a's contract; empty means it holds. */
function contractErrors(cls: string): string[] {
  const errors: string[] = [];
  const t = timing(cls);
  if (!t) return ["no paired transition-[…] and [transition-duration:…] lists"];
  for (const p of ["background-color", "color", "border-color"]) {
    if (t[p] !== FAST) errors.push(`${p} runs on ${t[p] ?? "nothing"}, not selection-state (fast)`);
  }
  if (t["box-shadow"] !== INSTANT) errors.push(`box-shadow runs on ${t["box-shadow"] ?? "nothing"}, not press-feedback (instant)`);
  if (!/(?:^|\s)ease-standard(?:\s|$)/.test(cls)) errors.push("easing is not standard");
  if (/(?:^|\s)duration-(?:\d+|\[)/.test(cls)) errors.push("a raw duration overrides the tiers");
  if (!/(?:^|\s)motion-reduce:transition-none(?:\s|$)/.test(cls)) errors.push("no reduced form outside the preset");
  // Hover that is not behind (hover:hover) sticks after a tap on a touch screen, and a hover that changes
  // background or text colour would run on selection's 200ms instead of press feedback's 100ms.
  const GATE = "[@media(hover:hover)]:";
  for (const tok of cls.split(/\s+/)) {
    const variants = tok.startsWith(GATE) ? tok.slice(GATE.length) : tok;
    if (!/(?:^|:)hover:/.test(variants)) continue;
    if (!tok.startsWith(GATE)) errors.push(`hover not gated on (hover:hover): ${tok}`);
    if (/(?:^|:)(?:bg|text|border)-/.test(variants)) errors.push(`hover changes a selection property: ${tok}`);
    if (!/(?:^|:)enabled:hover:/.test(variants)) errors.push(`hover answers while disabled: ${tok}`);
  }
  if (!cls.split(/\s+/).some((tok) => /^enabled:active:shadow-\[/.test(tok))) errors.push("no press layer for touch");
  return errors;
}

describe("Toggle motion contract", () => {
  const variants = ["default", "outline", "pill"] as const;

  it.each(variants)("the %s variant times selection on fast and the state layer on instant", (variant) => {
    const cls = toggleVariants({ variant });
    expect(contractErrors(cls)).toEqual([]);
    expect(timing(cls)).toEqual({
      "background-color": FAST,
      color: FAST,
      "border-color": FAST,
      "box-shadow": INSTANT,
    });
  });

  it("the rendered element carries the merged classes, not just the variant table", () => {
    render(<Toggle variant="outline" aria-label="Bold" />);
    const cls = screen.getByRole("button", { name: "Bold" }).className;
    expect(contractErrors(cls)).toEqual([]);
    // tailwind-merge keeps the outline layer (which keeps shadow-sm under it) and drops the default one.
    expect(cls).toContain("shadow-[shadow:inset_0_0_0_100vmax_hsl(var(--foreground)/0.08),var(--shadow-sm)]");
    expect(cls).not.toContain("hover:shadow-[inset_0_0_0_100vmax_hsl(var(--foreground)/0.08)]");
  });

  it("a ToggleGroup item gets the same contract from the group's variant", () => {
    render(
      <ToggleGroup type="single" variant="pill" aria-label="View">
        <ToggleGroupItem value="list">List</ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(contractErrors(screen.getByRole("radio", { name: "List" }).className)).toEqual([]);
  });

  // Negative controls: each mutation is something a later edit could plausibly do.
  it.each([
    ["the old untokenised transition", (c: string) => c.replace(/transition-\[[^\]]+\]/, "transition-colors")],
    ["selection retimed to instant", (c: string) => c.replace(`[transition-duration:${FAST},`, `[transition-duration:${INSTANT},`)],
    ["the layer retimed to fast", (c: string) => c.replace(`,${INSTANT}]`, `,${FAST}]`)],
    ["a raw duration on top", (c: string) => `${c} duration-[150ms]`],
    ["a different easing", (c: string) => c.replace("ease-standard", "ease-emphasized")],
    ["the reduced form removed", (c: string) => c.replace("motion-reduce:transition-none", "")],
    ["the old hover background", (c: string) => `${c} hover:bg-muted`],
    ["a gated hover that changes text colour", (c: string) => `${c} [@media(hover:hover)]:enabled:hover:text-foreground`],
    ["hover that answers while disabled", (c: string) => c.replace("[@media(hover:hover)]:enabled:hover:", "[@media(hover:hover)]:hover:")],
    ["no press layer for touch", (c: string) => c.replace(/(^|\s)enabled:active:shadow-\[[^\s]+/, "")],
  ])("rejects %s", (_name, mutate) => {
    const real = toggleVariants({ variant: "default" });
    const mutated = mutate(real);
    expect(mutated).not.toBe(real);
    expect(contractErrors(mutated)).not.toEqual([]);
  });
});

// kx-verify: interaction

/**
 * The semantic state never waits for paint. Each assertion is made synchronously after the input, so a
 * component that deferred `aria-pressed` or `data-state` to a transition end would fail here.
 */
describe("state changes are immediate, under rapid input", () => {
  it("Toggle: pressed on, off, on in quick succession lands on the last input", async () => {
    const user = userEvent.setup({ delay: null });
    render(<Toggle aria-label="Bold" />);
    const t = screen.getByRole("button", { name: "Bold" });
    await user.click(t);
    expect(t).toHaveAttribute("aria-pressed", "true");
    expect(t).toHaveAttribute("data-state", "on");
    await user.click(t);
    expect(t).toHaveAttribute("aria-pressed", "false");
    await user.click(t);
    expect(t).toHaveAttribute("aria-pressed", "true");
    expect(t).toHaveAttribute("data-state", "on");
  });

  it("ToggleGroup single: A → B → C leaves only C chosen, at every step", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <ToggleGroup type="single" aria-label="Alignment">
        <ToggleGroupItem value="start">Start</ToggleGroupItem>
        <ToggleGroupItem value="center">Center</ToggleGroupItem>
        <ToggleGroupItem value="end">End</ToggleGroupItem>
      </ToggleGroup>,
    );
    const [a, b, c] = ["Start", "Center", "End"].map((name) => screen.getByRole("radio", { name }));
    for (const [pick, others] of [[a, [b, c]], [b, [a, c]], [c, [a, b]]] as const) {
      await user.click(pick);
      expect(pick).toHaveAttribute("aria-checked", "true");
      for (const o of others) expect(o).toHaveAttribute("aria-checked", "false");
    }
  });

  it("ToggleGroup multiple: pressing items in a burst keeps every one pressed", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <ToggleGroup type="multiple" aria-label="Formatting">
        <ToggleGroupItem value="bold" aria-label="Bold" />
        <ToggleGroupItem value="italic" aria-label="Italic" />
        <ToggleGroupItem value="underline" aria-label="Underline" />
      </ToggleGroup>,
    );
    const items = ["Bold", "Italic", "Underline"].map((name) => screen.getByRole("button", { name }));
    for (const it of items) await user.click(it);
    for (const it of items) expect(it).toHaveAttribute("aria-pressed", "true");
    await user.click(items[1]);
    expect(items.map((i) => i.getAttribute("aria-pressed"))).toEqual(["true", "false", "true"]);
  });

  it("a controlled ToggleGroup moves only when its owner says so, however fast the input", async () => {
    const user = userEvent.setup({ delay: null });
    const seen: string[] = [];
    function Owner() {
      const [value, setValue] = React.useState("start");
      return (
        <>
          <ToggleGroup type="single" value={value} onValueChange={(v) => v && seen.push(v)} aria-label="Alignment">
            <ToggleGroupItem value="start">Start</ToggleGroupItem>
            <ToggleGroupItem value="end">End</ToggleGroupItem>
          </ToggleGroup>
          <button onClick={() => setValue("end")}>Set end</button>
        </>
      );
    }
    render(<Owner />);
    const end = screen.getByRole("radio", { name: "End" });
    await user.click(end);
    await user.click(end);
    expect(end).toHaveAttribute("aria-checked", "false");
    expect(seen).toEqual(["end", "end"]);
    // A programmatic change is as immediate as a click.
    await user.click(screen.getByRole("button", { name: "Set end" }));
    expect(end).toHaveAttribute("aria-checked", "true");
  });

  it("a disabled item is skipped and never changes, mid-burst or not", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <ToggleGroup type="single" aria-label="Size">
        <ToggleGroupItem value="s">Small</ToggleGroupItem>
        <ToggleGroupItem value="m" disabled>
          Medium
        </ToggleGroupItem>
        <ToggleGroupItem value="l">Large</ToggleGroupItem>
      </ToggleGroup>,
    );
    const m = screen.getByRole("radio", { name: "Medium" });
    await user.click(screen.getByRole("radio", { name: "Small" }));
    await user.click(m);
    expect(m).toHaveAttribute("aria-checked", "false");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Large" })).toHaveFocus();
  });

  it("an unmount mid-burst leaves nothing behind to throw", async () => {
    const user = userEvent.setup({ delay: null });
    const { unmount } = render(<Toggle aria-label="Bold" />);
    await user.click(screen.getByRole("button", { name: "Bold" }));
    expect(() => act(() => unmount())).not.toThrow();
  });
});

// kx-verify: rtl

/**
 * Under right-to-left, the arrow keys follow reading order: ArrowLeft goes to the NEXT item. Radix reads
 * direction from context, which is why the library's route is KinetixDirectionProvider (or `dir` on the
 * group) rather than a bare `dir` attribute on an ancestor.
 */
describe("ToggleGroup under RTL", () => {
  function Group(props: { dir?: "ltr" | "rtl" }) {
    return (
      <ToggleGroup type="single" aria-label="Alignment" {...props}>
        <ToggleGroupItem value="start">Start</ToggleGroupItem>
        <ToggleGroupItem value="center">Center</ToggleGroupItem>
        <ToggleGroupItem value="end">End</ToggleGroupItem>
      </ToggleGroup>
    );
  }

  it.each([
    ["the provider", () => (
      <KinetixDirectionProvider dir="rtl">
        <Group />
      </KinetixDirectionProvider>
    )],
    ["dir on the group", () => <Group dir="rtl" />],
  ])("with %s, ArrowLeft moves forward and ArrowRight moves back", async (_how, ui) => {
    const user = userEvent.setup();
    render(ui());
    await user.tab();
    expect(screen.getByRole("radio", { name: "Start" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Center" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Start" })).toHaveFocus();
    // Selection still follows Space, not focus, and is immediate.
    await user.keyboard("{ArrowLeft} ");
    expect(screen.getByRole("radio", { name: "Center" })).toHaveAttribute("aria-checked", "true");
  });

  it("the negative control: without a direction, ArrowLeft goes back (LTR), so the test above can fail", async () => {
    const user = userEvent.setup();
    render(<Group />);
    await user.tab();
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Start" })).toHaveFocus();
  });

  it("a Toggle's leading icon sits at the inline start in either direction", () => {
    render(
      <KinetixDirectionProvider dir="rtl">
        <div dir="rtl">
          <Toggle leadingIcon={<svg data-testid="icon" />} aria-label="Pin">
            Pin
          </Toggle>
        </div>
      </KinetixDirectionProvider>,
    );
    const btn = screen.getByRole("button", { name: "Pin" });
    // DOM order is the inline order; the flex row mirrors with direction, so the icon stays first.
    expect(btn.firstElementChild).toContainElement(screen.getByTestId("icon"));
    expect(btn.className).not.toMatch(/(?:^|\s)(?:ml|mr|pl|pr|left|right)-/);
  });
});
