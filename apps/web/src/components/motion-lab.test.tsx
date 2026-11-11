import * as React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MotionLab } from "./motion-lab";

describe("motion laboratory", () => {
  it("keeps validation local, describes an error, and recovers after editing", async () => {
    const user = userEvent.setup();
    render(<MotionLab />);
    const input = screen.getByLabelText("Email address");
    await user.click(screen.getByRole("button", { name: "Check address" }));
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/Enter an email address/);
    await user.type(input, "reader@example.com");
    expect(input).toHaveAttribute("aria-invalid", "false");
    await user.click(screen.getByRole("button", { name: "Check address" }));
    expect(screen.getByText("Address accepted for this demo.")).toBeVisible();
  });

  it("exposes the disclosure state immediately and keeps the panel associated", async () => {
    const user = userEvent.setup();
    render(<MotionLab />);
    const trigger = screen.getByRole("button", { name: "What happens with reduced motion?" });
    const panel = document.getElementById(trigger.getAttribute("aria-controls")!)!;
    expect(panel).not.toBeVisible();
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(panel).toBeVisible();
    await user.click(trigger);
    expect(panel).not.toBeVisible();
  });

  it("follows document direction for tab navigation, including live changes", async () => {
    const user = userEvent.setup();
    document.documentElement.dir = "rtl";
    try {
      render(<MotionLab />);
      await user.click(screen.getByRole("tab", { name: "Overview" }));
      await user.keyboard("{ArrowRight}");
      await waitFor(() => expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-selected", "true"));
      act(() => { document.documentElement.dir = "ltr"; });
      await user.click(screen.getByRole("tab", { name: "Overview" }));
      await user.keyboard("{ArrowRight}");
      await waitFor(() => expect(screen.getByRole("tab", { name: "Activity" })).toHaveAttribute("aria-selected", "true"));
    } finally {
      document.documentElement.dir = "ltr";
    }
  });

});
