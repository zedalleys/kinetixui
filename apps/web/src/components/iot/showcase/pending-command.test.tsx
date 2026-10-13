import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { KinetixCommandLifecycle } from "@kinetixui/iot/functions";
import { CONFIRMATION_MS, PendingCommand, pendingCommandView } from "./pending-command";

const NOW = "2026-10-13T12:00:10.000Z";
const at = (ms: number) => new Date(Date.parse(NOW) + ms).toISOString();
const life = (over: Partial<KinetixCommandLifecycle>): KinetixCommandLifecycle => ({
  confirmedValue: "locked",
  requestedValue: "unlocked",
  stage: "requested",
  attempts: 1,
  maxAttempts: 3,
  sentAt: at(-2000),
  ...over,
});
const format = (v: unknown) => (v === "locked" ? "Locked" : v === "unlocked" ? "Unlocked" : String(v));

describe("pendingCommandView", () => {
  it("maps each lifecycle stage to one compact state", () => {
    expect(pendingCommandView(undefined)).toBe("none");
    expect(pendingCommandView(life({ stage: "idle" }))).toBe("none");
    expect(pendingCommandView(life({ stage: "requested" }))).toBe("changing");
    expect(pendingCommandView(life({ stage: "retrying" }))).toBe("changing");
    expect(pendingCommandView(life({ stage: "acknowledged", ackAt: at(-1000) }))).toBe("waiting");
    expect(pendingCommandView(life({ stage: "failed" }))).toBe("failed");
    expect(pendingCommandView(life({ stage: "timed-out" }))).toBe("failed");
    expect(pendingCommandView(life({ stage: "unreachable" }))).toBe("failed");
    expect(pendingCommandView(life({ stage: "cancelled", settledAt: at(-100) }), NOW)).toBe("none");
  });

  it("shows a confirmation briefly, then settles back to nothing", () => {
    const confirmed = life({ stage: "confirmed", confirmedValue: "unlocked", settledAt: at(-1000) });
    expect(pendingCommandView(confirmed, NOW)).toBe("confirmed");
    expect(pendingCommandView({ ...confirmed, settledAt: at(-CONFIRMATION_MS) }, NOW)).toBe("none");
    // no clock, no claim: a confirmation without a time to measure from is not shown
    expect(pendingCommandView(confirmed)).toBe("none");
  });
});

describe("PendingCommand", () => {
  it("says 'Changing to' while requested, never the requested value as the device's state", () => {
    const { container } = render(<PendingCommand lifecycle={life({})} formatValue={format} now={NOW} onCancel={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent("Changing to Unlocked. Not yet confirmed; the device reports Locked.");
    expect(container.textContent).toContain("Changing to Unlocked");
    // no always-visible protocol timeline
    expect(container.querySelector('ol[aria-label="Progress of the request"]')).toBeNull();
    // the record is Level 3: present, closed
    const details = screen.getByText("Request details").closest("details")!;
    expect(details.open).toBe(false);
    expect(within(details).getByText("Not reported")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel request" })).toBeInTheDocument();
  });

  it("says 'Waiting for device' once acknowledged, and does not read as confirmed", () => {
    const { container } = render(<PendingCommand lifecycle={life({ stage: "acknowledged", ackAt: at(-500) })} formatValue={format} now={NOW} />);
    expect(container.textContent).toContain("Waiting for device");
    expect(container.textContent).not.toMatch(/Confirmed:/);
    // The live region says the request once: acknowledgement is protocol, so it does not re-announce.
    expect(screen.getByRole("status")).toHaveTextContent("Changing to Unlocked. Not yet confirmed; the device reports Locked.");
  });

  it("offers Retry on a failure, with the reason, and keeps the reported value", () => {
    const retry = vi.fn();
    const { container } = render(
      <PendingCommand lifecycle={life({ stage: "failed", reason: "Bolt jammed.", settledAt: at(-100) })} formatValue={format} now={NOW} onRetry={retry} onCancel={() => {}} failureTitle="The lock did not move" />,
    );
    expect(container.textContent).toContain("The lock did not move");
    expect(container.textContent).toContain("Bolt jammed.");
    expect(container.textContent).toContain("Still reports Locked");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByText("Request details").closest("details")!.open).toBe(false);
  });

  it("renders nothing visible for a settled command, and keeps one silent live region mounted", () => {
    const { container } = render(<PendingCommand lifecycle={life({ stage: "confirmed", confirmedValue: "unlocked", settledAt: at(-60_000) })} formatValue={format} now={NOW} />);
    expect(container.querySelector('[data-pending-command="none"]')).not.toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("");
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText("Request details")).toBeNull();
  });

  it("holds the next action at rest and the request line during a request, in one reserved row", () => {
    const action = <button type="button">Unlock</button>;
    const { container, rerender } = render(<PendingCommand lifecycle={undefined} action={action} reserve subject="Front door lock" />);
    const row = () => container.querySelector("[data-command-row]")!;
    expect(row()).not.toBeNull();
    expect(row().className).toContain("min-h-14");
    expect(screen.getByRole("button", { name: "Unlock" })).toBeInTheDocument();

    rerender(<PendingCommand lifecycle={life({})} action={action} reserve subject="Front door lock" onCancel={() => {}} now={NOW} details={false} formatValue={format} />);
    // the action gives way to the request line, in the same row
    expect(screen.queryByRole("button", { name: "Unlock" })).toBeNull();
    expect(row().textContent).toContain("Changing to Unlocked");
    expect(screen.getByRole("button", { name: "Cancel the Front door lock request" })).toBeInTheDocument();
    // with details={false}, the record is the card's to place (inside its own "Details")
    expect(screen.queryByText("Request details")).toBeNull();
    // the status line names the device, and there is no spinner: the wait is words
    expect(screen.getByRole("status")).toHaveTextContent("Front door lock: Changing to Unlocked.");
    expect(container.querySelector('[class*="animate-spin"]')).toBeNull();

    // a confirmation shows briefly with the next action beside it
    rerender(<PendingCommand lifecycle={life({ stage: "confirmed", confirmedValue: "unlocked", settledAt: at(-500) })} action={action} reserve now={NOW} details={false} formatValue={format} />);
    expect(row().textContent).toContain("Confirmed: Unlocked");
    expect(screen.getByRole("button", { name: "Unlock" })).toBeInTheDocument();
  });

  it("ends the confirmation on the wall clock when the simulated clock stops (reduced motion, paused)", () => {
    vi.useFakeTimers();
    try {
      const confirmed = life({ stage: "confirmed", confirmedValue: "unlocked", settledAt: at(0) });
      // `now` never moves: the simulation holds time once nothing is in flight
      render(<PendingCommand lifecycle={confirmed} now={NOW} reserve details={false} formatValue={format} action={<button type="button">Lock</button>} />);
      expect(screen.getByRole("status")).toHaveTextContent("Confirmed");
      act(() => vi.advanceTimersByTime(CONFIRMATION_MS));
      expect(screen.getByRole("status")).not.toHaveTextContent("Confirmed");
      expect(screen.getByRole("button", { name: "Lock" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("offers Cancel only while a request can still be cancelled, and Retry only on a failure", () => {
    const { rerender } = render(<PendingCommand lifecycle={life({})} now={NOW} formatValue={format} subject="Lock" />);
    // no onCancel passed: nothing claims the request can be withdrawn
    expect(screen.queryByRole("button", { name: /Cancel/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Retry/ })).toBeNull();
    rerender(<PendingCommand lifecycle={life({ stage: "failed", reason: "Jammed.", settledAt: at(-100) })} now={NOW} formatValue={format} subject="Lock" onRetry={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole("button", { name: "Retry Lock: Unlocked" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss the Lock failure" })).toBeInTheDocument();
  });

  it("moves focus to the row's new button when the button that had it goes away", () => {
    const Harness = ({ lifecycle }: { lifecycle: KinetixCommandLifecycle | undefined }) => (
      <PendingCommand lifecycle={lifecycle} reserve now={NOW} formatValue={format} subject="Front door lock" onCancel={() => {}} action={<button type="button">Unlock</button>} details={false} />
    );
    const { rerender } = render(<Harness lifecycle={undefined} />);
    screen.getByRole("button", { name: "Unlock" }).focus();
    rerender(<Harness lifecycle={life({})} />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel the Front door lock request" }));
    rerender(<Harness lifecycle={life({ stage: "confirmed", confirmedValue: "unlocked", settledAt: at(-60_000) })} />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Unlock" }));
  });
});
