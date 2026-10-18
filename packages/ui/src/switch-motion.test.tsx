import * as React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { KinetixDirectionProvider } from "./components/direction-provider";
import { Label } from "./components/label";
import { Switch } from "./components/switch";

/**
 * switch-motion.test.tsx — MX1b-1c: Switch on the `selection-control` role, and the state behaviour that must
 * never wait for it.
 *
 * Switch is deliberately not on Toggle's and Checkbox's `selection-state` (fast): its thumb, track colour and
 * halo all run on `instant`. jsdom computes no Tailwind and runs no transition, so this file holds the class
 * contract and the semantics; the rendered half (measured duration, easing, mid-travel position, settled
 * position, touch, forced colours, the viewport matrix) is `check:motion` and `check:switch-motion`.
 */

/** What a reader is told and where the thumb is told to sit, side by side. */
function reading(sw: HTMLElement) {
  const thumb = sw.querySelector<HTMLElement>(":scope > span");
  return { aria: sw.getAttribute("aria-checked"), root: sw.dataset.state, thumb: thumb?.dataset.state };
}
const ON = { aria: "true", root: "checked", thumb: "checked" };
const OFF = { aria: "false", root: "unchecked", thumb: "unchecked" };

// kx-verify: interaction
describe("Switch state is immediate", () => {
  it("uncontrolled: off by default, on with defaultChecked, and a click moves semantics and thumb together", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Switch aria-label="Off" />
        <Switch aria-label="On" defaultChecked />
      </>,
    );
    const off = screen.getByRole("switch", { name: "Off" });
    expect(reading(off)).toEqual(OFF);
    expect(reading(screen.getByRole("switch", { name: "On" }))).toEqual(ON);
    await user.click(off);
    expect(reading(off)).toEqual(ON);
    await user.click(off);
    expect(reading(off)).toEqual(OFF);
  });

  it("controlled: stays where the owner puts it, and follows every value the owner sets", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const { rerender } = render(<Switch checked={false} onCheckedChange={onCheckedChange} aria-label="Wi-Fi" />);
    const sw = screen.getByRole("switch", { name: "Wi-Fi" });
    await user.click(sw);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(reading(sw)).toEqual(OFF);
    for (const checked of [true, false, true]) {
      rerender(<Switch checked={checked} onCheckedChange={onCheckedChange} aria-label="Wi-Fi" />);
      expect(reading(sw)).toEqual(checked ? ON : OFF);
    }
  });

  it("programmatic: an owner that changes state outside a click keeps semantics and thumb together", () => {
    let set: (v: boolean) => void = () => {};
    function Owner() {
      const [v, setV] = React.useState(false);
      set = setV;
      return <Switch checked={v} onCheckedChange={setV} aria-label="Sync" />;
    }
    render(<Owner />);
    const sw = screen.getByRole("switch", { name: "Sync" });
    for (const v of [true, false, true, true, false]) {
      act(() => set(v));
      expect(reading(sw)).toEqual(v ? ON : OFF);
    }
  });

  it("a burst of clicks lands on the last one, at every step", async () => {
    const user = userEvent.setup({ delay: null });
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Burst" onCheckedChange={onCheckedChange} />);
    const sw = screen.getByRole("switch", { name: "Burst" });
    for (const want of [ON, OFF, ON, OFF, ON]) {
      await user.click(sw);
      expect(reading(sw)).toEqual(want);
    }
    expect(onCheckedChange.mock.calls.map(([v]) => v)).toEqual([true, false, true, false, true]);
  });

  it("Space and Enter both toggle from the keyboard, and Tab reaches it", async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Keys" />);
    const sw = screen.getByRole("switch", { name: "Keys" });
    await user.tab();
    expect(sw).toHaveFocus();
    await user.keyboard(" ");
    expect(reading(sw)).toEqual(ON);
    await user.keyboard("{Enter}");
    expect(reading(sw)).toEqual(OFF);
  });

  it("a label activates it, and names it", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Label htmlFor="sw-label">Airplane mode</Label>
        <Switch id="sw-label" />
      </>,
    );
    const sw = screen.getByRole("switch", { name: "Airplane mode" });
    await user.click(screen.getByText("Airplane mode"));
    expect(reading(sw)).toEqual(ON);
  });

  it("disabled: announced, not focusable by Tab, and a click, Space or a label does nothing", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <>
        <Label htmlFor="sw-disabled">SMS alerts</Label>
        <Switch id="sw-disabled" disabled onCheckedChange={onCheckedChange} />
      </>,
    );
    const sw = screen.getByRole("switch", { name: "SMS alerts" });
    expect(sw).toBeDisabled();
    expect(sw).toHaveAttribute("data-disabled");
    await user.click(sw);
    await user.click(screen.getByText("SMS alerts"));
    await user.tab();
    expect(sw).not.toHaveFocus();
    sw.focus();
    await user.keyboard(" ");
    expect(reading(sw)).toEqual(OFF);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("required is announced, and inside a form the native input carries it", () => {
    const { container } = render(
      <form>
        <Switch name="terms" required aria-label="Accept" />
      </form>,
    );
    expect(screen.getByRole("switch", { name: "Accept" })).toHaveAttribute("aria-required", "true");
    expect(container.querySelector<HTMLInputElement>("input[type=checkbox]")?.required).toBe(true);
  });

  it("submits its value only when on, and a form reset returns it to where it started", async () => {
    const user = userEvent.setup();
    render(
      <form aria-label="Prefs">
        <Switch name="digest" value="weekly" aria-label="Digest" />
        <Switch name="news" defaultChecked aria-label="News" />
      </form>,
    );
    const form = screen.getByRole("form", { name: "Prefs" }) as HTMLFormElement;
    const digest = screen.getByRole("switch", { name: "Digest" });
    const news = screen.getByRole("switch", { name: "News" });
    expect(new FormData(form).get("digest")).toBeNull();
    expect(new FormData(form).get("news")).toBe("on");
    await user.click(digest);
    await user.click(news);
    expect(new FormData(form).get("digest")).toBe("weekly");
    expect(new FormData(form).get("news")).toBeNull();
    act(() => form.reset());
    expect(reading(digest)).toEqual(OFF);
    expect(reading(news)).toEqual(ON);
  });

  it("unmounting while on, mid-interaction, leaves nothing behind", async () => {
    const user = userEvent.setup();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<Switch aria-label="Gone" />);
    await user.click(screen.getByRole("switch", { name: "Gone" }));
    unmount();
    expect(screen.queryByRole("switch")).toBeNull();
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});

const ROOT_TRANSITION = "transition-[background-color,box-shadow]";
const THUMB_TRANSITION = "transition-[inset-inline-start]";

/**
 * Everything wrong with a Switch's root and thumb class strings against `selection-control`; empty means it
 * holds. The role is one tier for everything: track colour, halo and thumb travel on `instant`, `standard`.
 */
function switchErrors(root: string, thumb: string): string[] {
  const errors: string[] = [];
  const toks = (c: string) => c.split(/\s+/).filter(Boolean);
  const r = toks(root);
  const t = toks(thumb);
  for (const [name, cls, transition] of [["track", r, ROOT_TRANSITION], ["thumb", t, THUMB_TRANSITION]] as const) {
    if (!cls.includes(transition)) errors.push(`the ${name} does not transition ${transition.slice(12, -1)}`);
    if (!cls.includes("duration-instant")) errors.push(`the ${name} is not on selection-control (instant)`);
    const other = cls.filter((x) => /^(?:[a-z-]+:)*duration-/.test(x) && x !== "duration-instant");
    if (other.length) errors.push(`the ${name} has another duration: ${other.join(" ")}`);
    if (cls.some((x) => x.startsWith("[transition-duration:"))) errors.push(`the ${name} has per-property tiers`);
    if (!cls.includes("ease-standard") || cls.some((x) => /^ease-(?!standard$)/.test(x))) errors.push(`the ${name}'s easing is not standard`);
    if (!cls.includes("motion-reduce:transition-none")) errors.push(`the ${name} has no reduced form outside the preset`);
  }
  // The thumb's travel is logical, keyed on Radix's state, and moves nothing around it.
  if (!t.includes("start-0") || !t.includes("data-[state=checked]:start-6")) errors.push("the thumb's position is not keyed on its state");
  if (t.some((x) => /(?:^|:)-?(?:translate-x|left|right|ml|mr|ms|me)-/.test(x))) errors.push("the thumb moves on a physical or layout axis");
  if (!t.includes("relative")) errors.push("the thumb's offset is not relative, so the layout around it moves");
  // Forced colours paint the thumb's fill as Canvas, the same as the track, unless it names a system colour.
  if (!t.includes("forced-colors:bg-[CanvasText]")) errors.push("the thumb disappears under forced colours");
  // Hover only where the device can hover, and never on a disabled switch; press works on touch.
  const GATE = "[@media(hover:hover)]:";
  for (const tok of r) {
    const variants = tok.startsWith(GATE) ? tok.slice(GATE.length) : tok;
    if (!/(?:^|:)hover:/.test(variants)) continue;
    if (!tok.startsWith(GATE)) errors.push(`hover not gated on (hover:hover): ${tok}`);
    if (!/(?:^|:)enabled:hover:/.test(variants)) errors.push(`hover answers while disabled: ${tok}`);
  }
  // Focus is the keyboard's only cue and must not depend on motion or hover.
  if (!r.includes("focus-visible:!ring-2") || !r.includes("focus-visible:ring-ring")) errors.push("no focus-visible ring");
  if (!r.some((x) => x.startsWith("enabled:active:[box-shadow:"))) errors.push("no press layer for touch");
  if (r.some((x) => /^active:/.test(x))) errors.push("press answers while disabled");
  return errors;
}

function classes() {
  render(<Switch aria-label="Contract" />);
  const sw = screen.getByRole("switch", { name: "Contract" });
  return { root: sw.className, thumb: sw.querySelector<HTMLElement>(":scope > span")!.className };
}

describe("Switch motion contract (selection-control)", () => {
  it("the track, halo and thumb all run on instant, standard, with a reduced form", () => {
    const { root, thumb } = classes();
    expect(switchErrors(root, thumb)).toEqual([]);
  });

  // Negative controls: each mutation is something a later edit could plausibly do, including "aligning" Switch
  // with the other selection controls, which would conflate a physical control with a colour settling.
  it.each([
    ["retimed to selection-state (fast)", (c: string) => c.replace("duration-instant", "duration-fast"), "thumb"],
    ["the track retimed to fast", (c: string) => c.replace("duration-instant", "duration-fast"), "root"],
    ["a hard-coded duration", (c: string) => c.replace("duration-instant", "duration-[150ms]"), "thumb"],
    ["a raw duration on top", (c: string) => `${c} duration-200`, "root"],
    ["Toggle's per-property tiers", (c: string) => `${c} [transition-duration:var(--duration-fast)]`, "root"],
    ["a different easing", (c: string) => c.replace("ease-standard", "ease-emphasized"), "thumb"],
    ["an overshooting easing added", (c: string) => `${c} ease-[cubic-bezier(0.3,1.6,0.6,1)]`, "thumb"],
    ["the thumb's reduced form removed", (c: string) => c.replace("motion-reduce:transition-none", ""), "thumb"],
    ["the track's reduced form removed", (c: string) => c.replace("motion-reduce:transition-none", ""), "root"],
    ["the travel no longer transitioned", (c: string) => c.replace("transition-[inset-inline-start]", "transition-none"), "thumb"],
    ["a physical translate, flipped by rtl:", (c: string) => c.replace("start-0 data-[state=checked]:start-6", "translate-x-0 data-[state=checked]:translate-x-6 rtl:data-[state=checked]:-translate-x-6"), "thumb"],
    ["the position not keyed on state", (c: string) => c.replace("data-[state=checked]:start-6", "start-6"), "thumb"],
    ["the thumb vanishing under forced colours", (c: string) => c.replace("forced-colors:bg-[CanvasText]", ""), "thumb"],
    ["hover not gated", (c: string) => `${c} hover:[box-shadow:0_0_0_5px_red]`, "root"],
    ["hover that answers while disabled", (c: string) => c.replace("[@media(hover:hover)]:enabled:hover:[box-shadow", "[@media(hover:hover)]:hover:[box-shadow"), "root"],
    ["press that answers while disabled", (c: string) => `${c} active:[box-shadow:0_0_0_5px_red]`, "root"],
    ["the focus-visible ring removed", (c: string) => c.replace("focus-visible:!ring-2", ""), "root"],
    ["no press layer for touch", (c: string) => c.replace(/(^|\s)enabled:active:\[box-shadow:[^\s]+/, ""), "root"],
  ] as const)("rejects %s", (_name, mutate, part) => {
    const { root, thumb } = classes();
    const mutated = { root, thumb, [part]: mutate(part === "root" ? root : thumb) };
    expect(mutated[part]).not.toBe(part === "root" ? root : thumb);
    expect(switchErrors(mutated.root, mutated.thumb)).not.toEqual([]);
  });
});

// kx-verify: rtl
describe("Switch under RTL", () => {
  const thumbClass = (container: HTMLElement) => container.querySelector("[role=switch] > span")?.getAttribute("class") ?? "";

  it("keeps the same logical travel through the provider, through `dir`, and after a direction change", () => {
    const { container, rerender } = render(
      <KinetixDirectionProvider dir="rtl">
        <Switch defaultChecked aria-label="Arabic" />
      </KinetixDirectionProvider>,
    );
    const rtl = thumbClass(container);
    expect(rtl).toContain("data-[state=checked]:start-6");
    rerender(
      <KinetixDirectionProvider dir="ltr">
        <Switch defaultChecked aria-label="Arabic" />
      </KinetixDirectionProvider>,
    );
    // The class does not change with direction: the browser resolves `start` against the switch's own `dir`.
    expect(thumbClass(container)).toBe(rtl);
    expect(reading(screen.getByRole("switch"))).toEqual(ON);
  });

  it("keyboard toggling is the same in RTL", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <Switch aria-label="RTL keys" />
      </div>,
    );
    const sw = screen.getByRole("switch", { name: "RTL keys" });
    await user.tab();
    await user.keyboard(" ");
    expect(reading(sw)).toEqual(ON);
  });

  it("negative control: an `rtl:` flip of a physical offset is caught", () => {
    const { root, thumb } = classes();
    expect(switchErrors(root, `${thumb} rtl:data-[state=checked]:-translate-x-6`)).not.toEqual([]);
  });
});
