/**
 * Which of this library's own controls submit a form they happen to sit in.
 *
 * `Button` renders a native `<button>` and sets no `type` (`components/button.tsx`), so it is a SUBMIT
 * button — HTML's default, and the right one for a button whose job is to submit. It is the wrong one for a
 * control that pages a table or opens a panel: inside a form, pressing it submits. The Carousel endpoint
 * controls had the same defect (#578); this file is the sweep that asked which others do.
 *
 * All five rows below are MEASURED here, not reasoned about, and two of them are controls that must keep
 * reporting zero. They are what tell a real finding from "no submit observed", which is also what you see
 * when the listener was never wired, when the form was never rendered, or when the press never landed:
 *
 *   - DataTable pagination — submitted. A table of editable rows inside a form is the ordinary case.
 *   - SidebarTrigger — submitted. The shell sits inside whatever the consumer wrapped it in.
 *   - Modal's footer buttons — did not, and not because of a `type`: its content is PORTALED, so those
 *     buttons are not descendants of the form at all. The row asserts the containment too, so a change that
 *     stopped portaling would not quietly pass here.
 *   - NotificationCenter's bell — did not: it is a Radix popover trigger, and Radix sets `type="button"`.
 *   - A bare `<Button>` in a form — MUST submit. The positive control for this file: without it, every zero
 *     above would also be the reading if jsdom did not dispatch submit at all.
 *
 * ENVIRONMENT: jsdom, which does dispatch a submit event for a typeless button — established by the last
 * row rather than assumed. Whether a press reaches the control at all is a browser question and is gated in
 * `scripts/react-carousel-focus.mjs`; this file is about which element the press belongs to.
 */
import { render, fireEvent, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./components/button";
import { DataTable } from "./components/data-table";
import { Modal } from "./components/modal";
import { NotificationCenter, NotificationCenterTrigger } from "./components/notification-center";
import { SidebarProvider, SidebarTrigger } from "./components/sidebar";

/** A form that counts its own submissions and never navigates. */
function inForm(ui: React.ReactNode) {
  const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
  render(<form onSubmit={onSubmit}>{ui}</form>);
  return onSubmit;
}

const byText = (re: RegExp) =>
  screen.getAllByRole("button").find((b) => re.test(b.textContent ?? "")) ??
  (() => {
    throw new Error(`no button matching ${re}; saw: ${screen.getAllByRole("button").map((b) => b.textContent).join(" | ")}`);
  })();

describe("library controls inside a form", () => {
  it("a bare Button submits — the control that proves this file can see a submission", () => {
    const onSubmit = inForm(<Button>Save</Button>);
    fireEvent.click(byText(/save/i));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("DataTable pagination does not submit", () => {
    const onSubmit = inForm(
      <DataTable
        columns={[{ accessorKey: "name", header: "Name" }] as never}
        data={Array.from({ length: 25 }, (_, i) => ({ name: `row ${i}` })) as never}
        pageSize={10}
      />,
    );
    fireEvent.click(byText(/^next$/i));
    fireEvent.click(byText(/^previous$/i));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("SidebarTrigger does not submit", () => {
    const onSubmit = inForm(
      <SidebarProvider>
        <SidebarTrigger />
      </SidebarProvider>,
    );
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Modal's footer buttons are portaled out of the form, so they cannot submit it", () => {
    const onSubmit = inForm(
      <Modal open type="Destructive" title="Delete" description="Are you sure?" onCancel={() => {}} onAction={() => {}} />,
    );
    const cancel = byText(/cancel/i);
    expect(document.querySelector("form")?.contains(cancel)).toBe(false);
    fireEvent.click(cancel);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("NotificationCenter's trigger does not submit", () => {
    const onSubmit = inForm(
      <NotificationCenter>
        <NotificationCenterTrigger unreadCount={2} />
      </NotificationCenter>,
    );
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
