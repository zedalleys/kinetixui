/**
 * A rating is one choice out of N. `Rating` claimed that — `role="radiogroup"` — while rendering
 * five independent `aria-pressed` buttons inside it, so nothing was ever checked and the "3 of 5"
 * position a screen reader announces for a radio set did not exist. `kx-rating` already stated the
 * correct contract and recorded the disagreement; these assertions hold React to it.
 *
 * Tier: DOM semantics, plus keyboard behaviour as `@testing-library/user-event` models it. The
 * arrow-key movement and the single tab stop are the BROWSER's native radio behaviour rather than
 * anything this component implements; jsdom does not provide them, but user-event does implement
 * both for a real radio group, and that was measured here before these assertions were written
 * rather than assumed. So they are evidence that the inputs form one genuine radio group — which is
 * the whole point of using native radios — and not evidence about a particular browser. Angular's
 * equivalent contract is asserted in a real browser by scripts/angular-browser.mjs; React has no
 * such harness, and this file does not pretend otherwise.
 */

// These assertions drive Rating and assert what it did, so they are claimed evidence rather than
// prose: a click chooses and reports, the arrow keys move the choice, Home and End take the ends,
// the group is one tab stop landing on the chosen star, hover previews without choosing, and a
// controlled Rating with no `onChange` to answer does not move. The accessibility claim is the
// radio-group semantics the header describes: five radios named by their count, one checked, one
// group per Rating, and a read-only Rating that is a labelled image with no control.
//
// ENVIRONMENT: jsdom, via `pnpm --filter @kinetixui/ui test`. This earns Rating `headless`, NOT
// `runtime` — the ladder reserves `runtime` for a real browser, and the header above is explicit
// that the arrow keys and the single tab stop are user-event's model of native radio behaviour and
// not a browser measurement. A Chromium gate for Rating is separate, unwritten work.
//
// kx-verify: interaction, accessibility
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Rating } from "./components/rating";

describe("Rating is a radio group", () => {
  it("is five radios named by their count, with the chosen one checked", () => {
    render(<Rating value={3} onChange={() => {}} />);
    const group = screen.getByRole("radiogroup", { name: "Rating" });
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(5);
    expect(group).toContainElement(radios[0]);
    expect(screen.getByRole("radio", { name: "1 star" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "3 stars" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "5 stars" })).not.toBeChecked();
  });

  it("no longer renders toggle buttons inside the group", () => {
    render(<Rating value={3} onChange={() => {}} />);
    // The defect in one line: a radiogroup of aria-pressed buttons.
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(document.querySelector("[aria-pressed]")).toBeNull();
  });

  it("puts its five inputs in one group, which is what makes the browser move between them", () => {
    render(<Rating value={2} onChange={() => {}} />);
    const names = new Set(
      screen.getAllByRole("radio").map((r) => (r as HTMLInputElement).name),
    );
    expect(names.size).toBe(1);
    expect([...names][0]).toBeTruthy();
  });

  it("gives two ratings on one page separate groups, so one does not answer for the other", () => {
    render(
      <>
        <Rating value={2} onChange={() => {}} aria-label="Food" />
        <Rating value={4} onChange={() => {}} aria-label="Service" />
      </>,
    );
    const food = screen.getByRole("radiogroup", { name: "Food" });
    const service = screen.getByRole("radiogroup", { name: "Service" });
    const nameOf = (group: HTMLElement) =>
      (group.querySelector("input[type='radio']") as HTMLInputElement).name;
    expect(nameOf(food)).not.toBe(nameOf(service));
    // Both choices stand at once, which five toggles in two groups could not guarantee.
    expect(food.querySelectorAll("input:checked")).toHaveLength(1);
    expect(service.querySelectorAll("input:checked")).toHaveLength(1);
  });

  it("chooses on click and reports the number", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Rating value={1} onChange={onChange} />);
    await user.click(screen.getByRole("radio", { name: "4 stars" }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("moves and chooses with the arrow keys, which five toggle buttons could never do", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Rating value={3} onChange={onChange} />);
    screen.getByRole("radio", { name: "3 stars" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith(4);
    expect(screen.getByRole("radio", { name: "4 stars" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it("is one tab stop, landing on the chosen star", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">before</button>
        <Rating value={3} onChange={() => {}} />
        <button type="button">after</button>
      </>,
    );
    screen.getByRole("button", { name: "before" }).focus();
    await user.tab();
    expect(screen.getByRole("radio", { name: "3 stars" })).toHaveFocus();
    // One more Tab leaves the whole group — five tab stops was the old behaviour.
    await user.tab();
    expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
  });

  it("lands on the first star when nothing is chosen yet", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">before</button>
        <Rating onChange={() => {}} />
        <button type="button">after</button>
      </>,
    );
    screen.getByRole("button", { name: "before" }).focus();
    await user.tab();
    expect(screen.getByRole("radio", { name: "1 star" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
  });

  it("chooses the lowest and the highest with Home and End", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Rating value={3} onChange={onChange} />);
    const third = screen.getByRole("radio", { name: "3 stars" });
    third.focus();
    await user.keyboard("{End}");
    expect(onChange).toHaveBeenLastCalledWith(5);
    await user.keyboard("{Home}");
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("previews on hover without choosing", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Rating value={1} onChange={onChange} />);
    await user.hover(screen.getByRole("radio", { name: "4 stars" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "1 star" })).toBeChecked();
  });

  it("read-only is a labelled image with no control and no tab stop", () => {
    render(<Rating value={3} readOnly />);
    expect(screen.getByRole("img", { name: "Rated 3 out of 5" })).toBeInTheDocument();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(document.querySelectorAll("input")).toHaveLength(0);
  });

  it("keeps the caller's own name for the group", () => {
    render(<Rating value={3} onChange={() => {}} aria-label="Rate this article" />);
    expect(screen.getByRole("radiogroup", { name: "Rate this article" })).toBeInTheDocument();
  });

  // The group's own state, rather than its keyboard. Asked for in IA-5.3 C1; each of these
  // already behaved correctly and none of it was asserted, which is the gap being closed.

  it("is uncontrolled from defaultValue, and moves without a value prop", async () => {
    const user = userEvent.setup();
    render(<Rating defaultValue={2} />);
    expect(screen.getByRole("radio", { name: "2 stars" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "4 stars" }));
    expect(screen.getByRole("radio", { name: "4 stars" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "2 stars" })).not.toBeChecked();
  });

  it("is controlled by value: without an onChange to answer, a click changes nothing", async () => {
    const user = userEvent.setup();
    render(<Rating value={3} />);
    await user.click(screen.getByRole("radio", { name: "1 star" }));
    expect(screen.getByRole("radio", { name: "3 stars" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "1 star" })).not.toBeChecked();
  });

  it("renders the same group and the same order under dir=rtl", () => {
    render(
      <div dir="rtl">
        <Rating value={3} onChange={() => {}} />
      </div>,
    );
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    const values = radios.map((r) => r.value);
    expect(values).toEqual(["1", "2", "3", "4", "5"]);
    expect(screen.getByRole("radio", { name: "3 stars" })).toBeChecked();
  });
});
