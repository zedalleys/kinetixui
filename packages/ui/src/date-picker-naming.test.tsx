/**
 * A field's visible label has to reach the accessibility tree, or it is decoration.
 *
 * `DatePicker` rendered `label` as a bare `<label>` with no `htmlFor`, and its trigger carried no
 * naming attribute at all, so the label was associated with nothing: a screen reader announced
 * "Select date, button, has popup" and never said which field it was. `helperText` had the same
 * shape — visible, and referenced by nothing.
 *
 * Tier: DOM semantics. These assertions read the accessible name and description that the browser
 * accessibility API computes from the DOM, through Testing Library's role queries. What a screen
 * reader SAYS is not measured here, or anywhere else in this package.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatePicker } from "./components/date-picker";

const MARCH_14 = new Date(2026, 2, 14);

describe("DatePicker naming", () => {
  it("names the trigger with the label and the shown date, not one or the other", () => {
    render(<DatePicker label="Depart" value={MARCH_14} onChange={() => {}} />);
    // Both halves, in reading order: the field's name, then what it currently holds. A `<label for>`
    // would have named it "Depart" alone, dropping the date out of the name.
    expect(screen.getByRole("button", { name: "Depart Mar 14, 2026" })).toBeInTheDocument();
  });

  it("still carries the placeholder in the name when nothing is selected", () => {
    render(<DatePicker label="Depart" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Depart Select date" })).toBeInTheDocument();
  });

  it("describes the trigger with the helper text, so a hint is not sighted-only", () => {
    render(<DatePicker label="Depart" helperText="Any day this month" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Depart Select date" })).toHaveAccessibleDescription(
      "Any day this month",
    );
  });

  it("describes it with the error text too — the same element, in the error colour", () => {
    render(<DatePicker label="Depart" helperText="Pick a date to continue" error onChange={() => {}} />);
    const trigger = screen.getByRole("button", { name: "Depart Select date" });
    expect(trigger).toHaveAccessibleDescription("Pick a date to continue");
    expect(trigger).toHaveAttribute("aria-invalid", "true");
  });

  it("names the open calendar with the field's label, so the popup is not anonymous", async () => {
    const user = userEvent.setup();
    render(<DatePicker label="Depart" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Depart Select date" }));
    expect(await screen.findByRole("dialog", { name: "Depart" })).toBeInTheDocument();
  });

  it("adds nothing when there is no label and no helper text", () => {
    render(<DatePicker onChange={() => {}} />);
    // The name still comes from the contents, exactly as before this change, and no empty
    // reference is left pointing at an element that does not exist.
    const trigger = screen.getByRole("button", { name: "Select date" });
    expect(trigger).not.toHaveAttribute("aria-labelledby");
    expect(trigger).not.toHaveAttribute("aria-describedby");
  });

  it("renders the label as a span, because a <label> would both rename and re-target the trigger", () => {
    const { container } = render(<DatePicker label="Depart" onChange={() => {}} />);
    // Clicking a <label> forwards activation to its control, which would open the calendar on a
    // click meant for the text. The span cannot do that.
    expect(container.querySelector("label")).toBeNull();
  });
});
