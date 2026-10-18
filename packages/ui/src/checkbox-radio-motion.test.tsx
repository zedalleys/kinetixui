import * as React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./components/checkbox";
import { KinetixDirectionProvider } from "./components/direction-provider";
import { RadioGroup, RadioGroupItem } from "./components/radio-group";

/**
 * checkbox-radio-motion.test.tsx — MX1b-1b: Checkbox and RadioGroup on the `selection-state` and
 * `press-feedback` roles, and the Checkbox glyph defect found on the way.
 *
 * jsdom computes no Tailwind and runs no transition, so a unit test holds the class contract that makes the
 * rendered result come out right, plus the state behaviour that must not wait for any of it. The rendered half
 * is `check:motion` and `check:checkbox-radio-motion`.
 */

type CheckedState = boolean | "indeterminate";

/**
 * Which glyphs a checkbox shows, worked out the way the browser will: the Indicator's own `data-state` is
 * Radix's state, and each glyph's visibility is a class keyed on it. A glyph with no such class is shown in
 * every state, which is what the old component did with the one glyph it rendered.
 */
function shownGlyphs(box: HTMLElement): string[] {
  const indicator = box.querySelector<HTMLElement>(":scope > span[data-state]");
  if (!indicator) return [];
  const state = indicator.dataset.state;
  return [...indicator.querySelectorAll("svg")]
    .filter((svg) => {
      const tokens = (svg.getAttribute("class") ?? "").split(/\s+/);
      let shown = !tokens.includes("hidden");
      for (const tok of tokens) {
        const m = /^group-data-\[state=([a-z]+)\]\/indicator:(hidden|block)$/.exec(tok);
        if (m && m[1] === state) shown = m[2] === "block";
      }
      return shown;
    })
    .map((svg) => (svg.classList.contains("lucide-minus") ? "minus" : svg.classList.contains("lucide-check") ? "check" : "?"));
}

/** What a reader is told and what they see, side by side. */
function reading(box: HTMLElement) {
  return { aria: box.getAttribute("aria-checked"), glyphs: shownGlyphs(box) };
}

const MIXED = { aria: "mixed", glyphs: ["minus"] };
const CHECKED = { aria: "true", glyphs: ["check"] };

// kx-verify: interaction
describe("Checkbox: the glyph follows Radix's state, not the `checked` prop", () => {
  it("uncontrolled defaultChecked='indeterminate' announces mixed and draws the dash, not the tick", () => {
    render(<Checkbox defaultChecked="indeterminate" aria-label="All" />);
    expect(reading(screen.getByRole("checkbox", { name: "All" }))).toEqual(MIXED);
  });

  it("controlled checked='indeterminate' reads the same as uncontrolled", () => {
    render(<Checkbox checked="indeterminate" aria-label="All" />);
    expect(reading(screen.getByRole("checkbox", { name: "All" }))).toEqual(MIXED);
  });

  it("uncontrolled: a click from mixed goes to checked, and the glyph goes with it", async () => {
    const user = userEvent.setup();
    render(<Checkbox defaultChecked="indeterminate" aria-label="All" />);
    const box = screen.getByRole("checkbox", { name: "All" });
    await user.click(box);
    expect(reading(box)).toEqual(CHECKED);
    await user.click(box);
    expect(box).toHaveAttribute("aria-checked", "false");
  });

  it("controlled: every value the owner sets is the value read and drawn", () => {
    const { rerender } = render(<Checkbox checked={false} aria-label="All" />);
    const box = screen.getByRole("checkbox", { name: "All" });
    const seq: [CheckedState, { aria: string; glyphs: string[] }][] = [
      ["indeterminate", MIXED],
      [true, CHECKED],
      ["indeterminate", MIXED],
      [false, { aria: "false", glyphs: [] }],
      ["indeterminate", MIXED],
    ];
    for (const [checked, want] of seq) {
      rerender(<Checkbox checked={checked} aria-label="All" />);
      const r = reading(box);
      // Unchecked keeps a glyph in the DOM so it can fade, but the Indicator is then transparent, so what
      // matters is the Indicator's state, read below; a shown glyph under `unchecked` is not drawn.
      expect(r.aria).toBe(want.aria);
      if (checked !== false) expect(r.glyphs).toEqual(want.glyphs);
    }
  });

  it("programmatic: an owner that sets state from outside a click keeps glyph and semantics together", async () => {
    let set: (v: CheckedState) => void = () => {};
    function Owner() {
      const [v, setV] = React.useState<CheckedState>("indeterminate");
      set = setV;
      return <Checkbox checked={v} onCheckedChange={setV} aria-label="All" />;
    }
    render(<Owner />);
    const box = screen.getByRole("checkbox", { name: "All" });
    expect(reading(box)).toEqual(MIXED);
    act(() => set(true));
    expect(reading(box)).toEqual(CHECKED);
    act(() => set("indeterminate"));
    expect(reading(box)).toEqual(MIXED);
  });
});

const FAST = "var(--duration-fast)";
const INSTANT = "var(--duration-instant)";

/** The properties a control transitions and the tier each one runs on, read from one class string. */
function timing(cls: string): Record<string, string> | null {
  const props = /(?:^|\s)transition-\[([^\]]+)\]/.exec(cls)?.[1].split(",");
  const durs = /(?:^|\s)\[transition-duration:([^\]]+)\]/.exec(cls)?.[1].split(/,(?=var\()/);
  if (!props || !durs || props.length !== durs.length) return null;
  return Object.fromEntries(props.map((p, i) => [p, durs[i]]));
}

const CHECKBOX_TIERS = { "background-color": FAST, color: FAST, "border-color": FAST, "box-shadow": INSTANT };
const RADIO_TIERS = { color: FAST, "border-color": FAST, "box-shadow": INSTANT };

/**
 * Everything wrong with a Checkbox or Radio class string against MX1b-1b's contract; empty means it holds.
 *
 * Unlike Toggle, the box's own hover/press colour step (TOKENS.md, "Selection controls") is kept, so hover may
 * change the border or fill; it then moves on the colour tier while the state layer gives the immediate answer.
 */
function controlErrors(cls: string, tiers: Record<string, string>): string[] {
  const errors: string[] = [];
  const t = timing(cls);
  if (!t) return ["no paired transition-[…] and [transition-duration:…] lists"];
  for (const [p, want] of Object.entries(tiers)) {
    if (t[p] !== want) errors.push(`${p} runs on ${t[p] ?? "nothing"}, not ${want === FAST ? "selection-state (fast)" : "press-feedback (instant)"}`);
  }
  if (Object.keys(t).length !== Object.keys(tiers).length) errors.push(`transitions ${Object.keys(t).join(",")}`);
  if (!/(?:^|\s)ease-standard(?:\s|$)/.test(cls)) errors.push("easing is not standard");
  if (/(?:^|\s)duration-(?:\d+|\[|instant|fast|base)/.test(cls)) errors.push("a single duration overrides the tiers");
  if (!/(?:^|\s)motion-reduce:transition-none(?:\s|$)/.test(cls)) errors.push("no reduced form outside the preset");
  const GATE = "[@media(hover:hover)]:";
  for (const tok of cls.split(/\s+/)) {
    const variants = tok.startsWith(GATE) ? tok.slice(GATE.length) : tok;
    if (!/(?:^|:)hover:/.test(variants)) continue;
    if (!tok.startsWith(GATE)) errors.push(`hover not gated on (hover:hover): ${tok}`);
    if (!/(?:^|:)enabled:hover:/.test(variants)) errors.push(`hover answers while disabled: ${tok}`);
  }
  if (!cls.split(/\s+/).some((tok) => tok.startsWith("enabled:active:[box-shadow:"))) errors.push("no press layer for touch");
  return errors;
}

/** The glyph's container: present in every state, faded in on `fast`, and the checkbox's leaves at once. */
function indicatorErrors(cls: string, exit: "instant" | "fade"): string[] {
  const errors: string[] = [];
  const has = (tok: string) => cls.split(/\s+/).includes(tok);
  if (!has("transition-opacity")) errors.push("the glyph does not fade");
  if (!has("duration-fast")) errors.push("the glyph is not on selection-state (fast)");
  if (!has("ease-standard")) errors.push("the glyph's easing is not standard");
  if (!has("motion-reduce:transition-none")) errors.push("the glyph still fades under reduced motion");
  if (!has("opacity-0") || !has("data-[state=checked]:opacity-100")) errors.push("the glyph's opacity is not keyed on Radix's state");
  if ((exit === "instant") !== has("data-[state=unchecked]:transition-none")) errors.push(`the glyph's exit is not ${exit}`);
  if (/(?:^|\s)duration-(?:\d+(?<!0)|\[)/.test(cls)) errors.push("a raw duration on the glyph");
  return errors;
}

function renderControls() {
  render(
    <>
      <Checkbox aria-label="Box" />
      <RadioGroup aria-label="Plan" defaultValue="free">
        <RadioGroupItem value="free" aria-label="Free" />
      </RadioGroup>
    </>,
  );
  const box = screen.getByRole("checkbox", { name: "Box" });
  const radio = screen.getByRole("radio", { name: "Free" });
  const ind = (el: HTMLElement) => el.querySelector<HTMLElement>(":scope > span[data-state]")!;
  return { box: box.className, radio: radio.className, boxInd: ind(box).className, radioInd: ind(radio).className };
}

describe("Checkbox and Radio motion contract", () => {
  it("Checkbox times fill, text and border on fast and the state layer on instant", () => {
    const { box } = renderControls();
    expect(controlErrors(box, CHECKBOX_TIERS)).toEqual([]);
    expect(timing(box)).toEqual(CHECKBOX_TIERS);
  });

  it("RadioGroupItem times border and dot colour on fast and the state layer on instant", () => {
    const { radio } = renderControls();
    expect(controlErrors(radio, RADIO_TIERS)).toEqual([]);
    expect(timing(radio)).toEqual(RADIO_TIERS);
  });

  it("the tick and the dot fade in on fast; the tick leaves at once and the dot fades out", () => {
    const { boxInd, radioInd } = renderControls();
    expect(indicatorErrors(boxInd, "instant")).toEqual([]);
    expect(indicatorErrors(radioInd, "fade")).toEqual([]);
  });

  // Negative controls: each mutation is something a later edit could plausibly do.
  it.each([
    ["the old single instant duration", (c: string) => c.replace(/\[transition-duration:[^\]]+\]/, "duration-instant")],
    ["a hard-coded duration on top", (c: string) => `${c} duration-[150ms]`],
    ["selection retimed to instant", (c: string) => c.replace(`[transition-duration:${FAST},`, `[transition-duration:${INSTANT},`)],
    ["the layer retimed to fast", (c: string) => c.replace(`,${INSTANT}]`, `,${FAST}]`)],
    ["a different easing", (c: string) => c.replace("ease-standard", "ease-emphasized")],
    ["the reduced form removed", (c: string) => c.replace("motion-reduce:transition-none", "")],
    ["hover not gated", (c: string) => `${c} hover:[box-shadow:0_0_0_5px_red]`],
    ["hover that answers while disabled", (c: string) => c.replace("[@media(hover:hover)]:enabled:hover:[box-shadow", "[@media(hover:hover)]:hover:[box-shadow")],
    ["no press layer for touch", (c: string) => c.replace(/(^|\s)enabled:active:\[box-shadow:[^\s]+/, "")],
  ])("rejects %s, on both controls", (_name, mutate) => {
    const { box, radio } = renderControls();
    for (const [real, tiers] of [[box, CHECKBOX_TIERS], [radio, RADIO_TIERS]] as const) {
      const mutated = mutate(real);
      expect(mutated).not.toBe(real);
      expect(controlErrors(mutated, tiers)).not.toEqual([]);
    }
  });

  it.each([
    ["no fade", (c: string) => c.replace("transition-opacity", "")],
    ["a hard-coded glyph duration", (c: string) => c.replace("duration-fast", "duration-[300ms]")],
    ["a different glyph easing", (c: string) => c.replace("ease-standard", "ease-enter")],
    ["the glyph fading under reduced motion", (c: string) => c.replace("motion-reduce:transition-none", "")],
    ["opacity not keyed on state", (c: string) => c.replace("data-[state=checked]:opacity-100", "")],
  ])("rejects a glyph with %s", (_name, mutate) => {
    const { boxInd, radioInd } = renderControls();
    for (const [real, exit] of [[boxInd, "instant"], [radioInd, "fade"]] as const) {
      const mutated = mutate(real);
      expect(mutated).not.toBe(real);
      expect(indicatorErrors(mutated, exit)).not.toEqual([]);
    }
  });

  it("rejects a checkbox glyph that fades out, which would show the tick leaving a mixed box", () => {
    const { boxInd } = renderControls();
    expect(indicatorErrors(boxInd.replace("data-[state=unchecked]:transition-none", ""), "instant")).not.toEqual([]);
  });

  it("rejects a glyph chosen from the prop: the reading helper sees the tick under mixed", () => {
    // The pre-fix component, inlined: one glyph, picked by `props.checked`, which is undefined when uncontrolled.
    const Old = (props: { defaultChecked?: CheckedState; checked?: CheckedState }) => (
      <button role="checkbox" aria-checked={(props.checked ?? props.defaultChecked) === "indeterminate" ? "mixed" : "false"} aria-label="Old">
        <span data-state="indeterminate">
          <svg className={props.checked === "indeterminate" ? "lucide lucide-minus" : "lucide lucide-check"} />
        </span>
      </button>
    );
    render(<Old defaultChecked="indeterminate" />);
    expect(reading(screen.getByRole("checkbox", { name: "Old" }))).toEqual({ aria: "mixed", glyphs: ["check"] });
  });
});

// kx-verify: interaction

describe("Checkbox state is immediate, under rapid and programmatic input", () => {
  it("a burst of clicks lands on the last one, at every step", async () => {
    const user = userEvent.setup({ delay: null });
    render(<Checkbox aria-label="Box" />);
    const box = screen.getByRole("checkbox", { name: "Box" });
    for (const want of ["true", "false", "true", "false", "true"]) {
      await user.click(box);
      expect(box).toHaveAttribute("aria-checked", want);
      expect(box).toHaveAttribute("data-state", want === "true" ? "checked" : "unchecked");
    }
    expect(reading(box)).toEqual(CHECKED);
  });

  it("Space toggles from the keyboard, and focus stays on the box", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Box" />);
    await user.tab();
    const box = screen.getByRole("checkbox", { name: "Box" });
    expect(box).toHaveFocus();
    await user.keyboard(" ");
    expect(box).toHaveAttribute("aria-checked", "true");
    await user.keyboard(" ");
    expect(box).toHaveAttribute("aria-checked", "false");
    expect(box).toHaveFocus();
  });

  it("a re-render that changes nothing keeps the state the user chose", async () => {
    const user = userEvent.setup();
    function Parent({ tick }: { tick: number }) {
      return <Checkbox aria-label="Box" data-tick={tick} />;
    }
    const { rerender } = render(<Parent tick={0} />);
    const box = screen.getByRole("checkbox", { name: "Box" });
    await user.click(box);
    rerender(<Parent tick={1} />);
    expect(box).toHaveAttribute("aria-checked", "true");
  });

  it("disabled never changes, however it is pressed", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Checkbox disabled defaultChecked="indeterminate" onCheckedChange={spy} aria-label="Box" />);
    const box = screen.getByRole("checkbox", { name: "Box" });
    await user.click(box);
    await user.keyboard(" ");
    expect(spy).not.toHaveBeenCalled();
    expect(reading(box)).toEqual(MIXED);
  });

  it("submits its value, and a form reset returns it to where it started", async () => {
    const user = userEvent.setup();
    render(
      <form aria-label="Terms">
        <Checkbox name="terms" value="yes" aria-label="Accept" />
        <Checkbox name="mixed" defaultChecked="indeterminate" aria-label="All" />
      </form>,
    );
    const form = screen.getByRole("form", { name: "Terms" }) as HTMLFormElement;
    const accept = screen.getByRole("checkbox", { name: "Accept" });
    expect(new FormData(form).get("terms")).toBeNull();
    await user.click(accept);
    expect(new FormData(form).get("terms")).toBe("yes");
    await user.click(screen.getByRole("checkbox", { name: "All" }));
    act(() => form.reset());
    expect(accept).toHaveAttribute("aria-checked", "false");
    expect(reading(screen.getByRole("checkbox", { name: "All" }))).toEqual(MIXED);
  });

  it("an unmount mid-fade leaves nothing behind to throw", async () => {
    const user = userEvent.setup({ delay: null });
    const { unmount } = render(<Checkbox aria-label="Box" />);
    await user.click(screen.getByRole("checkbox", { name: "Box" }));
    expect(() => act(() => unmount())).not.toThrow();
  });
});

/** The dot a radio shows: its Indicator is transparent unless Radix says this item is checked. */
function dotShown(radio: HTMLElement) {
  return radio.querySelector<HTMLElement>(":scope > span[data-state]")?.dataset.state === "checked";
}

function Plan(props: React.ComponentProps<typeof RadioGroup>) {
  return (
    <RadioGroup aria-label="Plan" {...props}>
      <RadioGroupItem value="free" aria-label="Free" />
      <RadioGroupItem value="pro" aria-label="Pro" />
      <RadioGroupItem value="team" aria-label="Team" />
    </RadioGroup>
  );
}
const radios = () => ["Free", "Pro", "Team"].map((name) => screen.getByRole("radio", { name }));
/**
 * An arrow key held for as long as a person holds it. Radix selects the radio that receives focus while an
 * arrow is down, and its roving focus moves in a timeout; user-event's bare `{ArrowDown}` releases the key
 * before that timeout runs, which no keyboard does, so the focus would move without selecting.
 */
async function arrow(user: ReturnType<typeof userEvent.setup>, key: string) {
  await user.keyboard(`{${key}>}`);
  await act(() => new Promise((r) => setTimeout(r, 0)));
  await user.keyboard(`{/${key}}`);
}

/** For each radio: is it announced checked, and does it show its dot. They must always agree. */
const radioReading = () => radios().map((r) => `${r.getAttribute("aria-checked")}/${dotShown(r)}`);

describe("RadioGroup: what is announced is what is drawn, under any input", () => {
  it("A → B → C in a burst leaves only C chosen, with only C's dot, at every step", async () => {
    const user = userEvent.setup({ delay: null });
    render(<Plan defaultValue="free" />);
    const [a, b, c] = radios();
    expect(radioReading()).toEqual(["true/true", "false/false", "false/false"]);
    await user.click(b);
    expect(radioReading()).toEqual(["false/false", "true/true", "false/false"]);
    await user.click(c);
    expect(radioReading()).toEqual(["false/false", "false/false", "true/true"]);
    await user.click(a);
    expect(radioReading()).toEqual(["true/true", "false/false", "false/false"]);
  });

  it("arrow keys move focus and selection together, and wrap", async () => {
    const user = userEvent.setup();
    render(<Plan defaultValue="free" />);
    await user.tab();
    const [a, b, c] = radios();
    expect(a).toHaveFocus();
    await arrow(user, "ArrowDown");
    expect(b).toHaveFocus();
    expect(radioReading()).toEqual(["false/false", "true/true", "false/false"]);
    await arrow(user, "ArrowDown");
    await arrow(user, "ArrowDown");
    expect(a).toHaveFocus();
    expect(radioReading()).toEqual(["true/true", "false/false", "false/false"]);
    expect(c).toHaveAttribute("tabindex", "-1");
  });

  it("controlled: it moves only when the owner says so, and a programmatic change is as immediate", async () => {
    const user = userEvent.setup({ delay: null });
    const seen: string[] = [];
    let set: (v: string) => void = () => {};
    function Owner() {
      const [v, setV] = React.useState("free");
      set = setV;
      return <Plan value={v} onValueChange={(next) => seen.push(next)} />;
    }
    render(<Owner />);
    const [, b] = radios();
    await user.click(b);
    expect(seen).toEqual(["pro"]);
    expect(radioReading()).toEqual(["true/true", "false/false", "false/false"]);
    act(() => set("team"));
    expect(radioReading()).toEqual(["false/false", "false/false", "true/true"]);
  });

  it("a disabled item is skipped by the keys and never chosen by a click", async () => {
    const user = userEvent.setup();
    render(
      <RadioGroup aria-label="Plan" defaultValue="free">
        <RadioGroupItem value="free" aria-label="Free" />
        <RadioGroupItem value="pro" aria-label="Pro" disabled />
        <RadioGroupItem value="team" aria-label="Team" />
      </RadioGroup>,
    );
    const [a, b, c] = radios();
    await user.click(b);
    expect(radioReading()[1]).toBe("false/false");
    await user.click(a);
    await arrow(user, "ArrowDown");
    expect(c).toHaveFocus();
    expect(radioReading()).toEqual(["false/false", "false/false", "true/true"]);
  });

  it("submits the chosen value, and a form reset returns to the default", async () => {
    const user = userEvent.setup();
    render(
      <form aria-label="Signup">
        <Plan name="plan" defaultValue="free" />
      </form>,
    );
    const form = screen.getByRole("form", { name: "Signup" }) as HTMLFormElement;
    expect(new FormData(form).get("plan")).toBe("free");
    await user.click(radios()[2]);
    expect(new FormData(form).get("plan")).toBe("team");
    act(() => form.reset());
    expect(radioReading()).toEqual(["true/true", "false/false", "false/false"]);
  });

  it("an unmount mid-fade leaves nothing behind to throw", async () => {
    const user = userEvent.setup({ delay: null });
    const { unmount } = render(<Plan defaultValue="free" />);
    await user.click(radios()[1]);
    expect(() => act(() => unmount())).not.toThrow();
  });
});

// kx-verify: rtl

describe("RadioGroup under RTL", () => {
  it.each([
    ["the provider", () => (
      <KinetixDirectionProvider dir="rtl">
        <Plan defaultValue="free" orientation="horizontal" />
      </KinetixDirectionProvider>
    )],
    ["dir on the group", () => <Plan defaultValue="free" orientation="horizontal" dir="rtl" />],
  ])("with %s, ArrowLeft moves forward and selection follows", async (_how, ui) => {
    const user = userEvent.setup();
    render(ui());
    await user.tab();
    await arrow(user, "ArrowLeft");
    expect(radios()[1]).toHaveFocus();
    expect(radioReading()).toEqual(["false/false", "true/true", "false/false"]);
    await arrow(user, "ArrowRight");
    expect(radios()[0]).toHaveFocus();
  });

  it("the negative control: without a direction, ArrowLeft goes back (LTR), so the test above can fail", async () => {
    const user = userEvent.setup();
    render(<Plan defaultValue="pro" orientation="horizontal" />);
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(radios()[0]).toHaveFocus();
  });

  it("a direction change after mount is followed without a remount", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Plan defaultValue="free" orientation="horizontal" dir="ltr" />);
    rerender(<Plan defaultValue="free" orientation="horizontal" dir="rtl" />);
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(radios()[1]).toHaveFocus();
  });

  it("the controls use no physical side classes, so they mirror", () => {
    const { box, radio, boxInd, radioInd } = renderControls();
    for (const cls of [box, radio, boxInd, radioInd]) expect(cls).not.toMatch(/(?:^|\s)(?:ml|mr|pl|pr|left|right)-/);
  });
});
