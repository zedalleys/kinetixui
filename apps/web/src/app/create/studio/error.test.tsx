import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import StudioError from "./error";

// The boundary's contract, not its wording. Each assertion below has a negative control recorded
// in M5.20-NEGATIVE-CONTROLS.md: remove the retry button, print the message, drop the focus call,
// and the matching test fails naming what it lost.
const thrown = () => Object.assign(new Error("TypeError: cannot read properties of undefined (reading 'ref')"), { digest: "d1g3st" });

it("explains the failure, offers a retry that sends nothing, and keeps a way out", async () => {
  const reset = vi.fn();
  render(<StudioError error={thrown()} reset={reset} />);
  // Explains what happened and what is safe, without the caller having to read a console.
  expect(screen.getByRole("alert")).toHaveTextContent(/failed to render/i);
  expect(screen.getByRole("alert")).toHaveTextContent(/has not been changed/i);
  // Points at the draft the editor already stored, rather than implying the work is gone.
  expect(screen.getByText(/Recover\s+draft/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Try the editor again" }));
  expect(reset).toHaveBeenCalledOnce();
  expect(screen.getByRole("link", { name: "Reload Create Studio" })).toHaveAttribute("href", "/create/studio");
  expect(screen.getByRole("link", { name: "Back to the theme creator" })).toHaveAttribute("href", "/create");
});

it("never shows the raw error, in development or production", () => {
  render(<StudioError error={thrown()} reset={() => {}} />);
  const text = document.body.textContent ?? "";
  expect(text).not.toMatch(/TypeError/);
  expect(text).not.toMatch(/cannot read properties/i);
  // The digest is an opaque reference for the server log, so it may appear; a stack must not.
  expect(text).not.toMatch(/\.tsx:|\bat \w+ \(/);
  expect(text).toContain("d1g3st");
});

it("moves focus to its heading, because the workspace it replaced is gone", () => {
  render(<StudioError error={thrown()} reset={() => {}} />);
  const heading = screen.getByRole("heading", { level: 1 });
  expect(document.activeElement).toBe(heading);
  expect(heading).toHaveAttribute("tabindex", "-1");
});

it("omits the reference line when the framework gave no digest", () => {
  render(<StudioError error={new Error("boom")} reset={() => {}} />);
  expect(screen.queryByText(/Reference for the server log/)).toBeNull();
});
