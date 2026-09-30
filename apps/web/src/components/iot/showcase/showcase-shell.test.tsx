import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AttentionButton, Disclosure, Panel, RailGroup, RailItem, RailList, SpaceHeader, Stat, StateBadge, SummaryChip } from "./primitives";
import { ShowcaseShell } from "./showcase-shell";

describe("ShowcaseShell", () => {
  const shell = () =>
    render(
      <ShowcaseShell label="Demo home" header={<p>header slot</p>} rail={<p>rail slot</p>} canvas={<p>canvas slot</p>} focus={<p>focus slot</p>} aside={<p>aside slot</p>} />,
    );

  it("renders every slot inside named landmarks and never a main", () => {
    const { container } = shell();
    for (const text of ["header slot", "rail slot", "canvas slot", "focus slot", "aside slot"]) expect(screen.getByText(text)).toBeTruthy();
    const outer = screen.getByRole("region", { name: "Demo home" });
    expect(within(outer).getByRole("region", { name: "Spaces" })).toBeTruthy();
    expect(within(outer).getByRole("region", { name: "Space plan" })).toBeTruthy();
    expect(within(outer).getByRole("region", { name: "Selected space" })).toBeTruthy();
    expect(within(outer).getByRole("region", { name: "Needs attention" })).toBeTruthy();
    expect(container.querySelector("main")).toBeNull();
  });

  it("keeps DOM order header, rail, canvas, focus, aside (the tab order)", () => {
    const { container } = shell();
    const order = [...container.querySelectorAll("[data-slot]")].map((el) => el.getAttribute("data-slot"));
    expect(order).toEqual(["header", "rail", "canvas", "focus", "aside"]);
  });

  it("uses one tinted surface without borders", () => {
    const { container } = shell();
    const outer = container.firstElementChild!;
    expect(outer.className).toContain("bg-muted/40");
    expect(outer.className).toContain("rounded-container");
    expect(container.innerHTML).not.toMatch(/\bborder(-\w+)?\b/);
  });
});

describe("primitives", () => {
  it("Panel titles its section", () => {
    render(<Panel title="Energy" description="Today" action={<button type="button">All</button>}><p>body</p></Panel>);
    expect(screen.getByRole("region", { name: "Energy" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 4, name: "Energy" })).toBeTruthy();
  });

  it("Stat shows value, unit, label, trend words and a worded state", () => {
    render(<Stat label="Target" value="22.0" unit="°C" trend="0.4 °C warmer" trendDirection="up" state="pending" />);
    expect(screen.getByText("22.0")).toBeTruthy();
    expect(screen.getByText("°C")).toBeTruthy();
    expect(screen.getByText("Not yet confirmed")).toBeTruthy();
    expect(screen.getByText("0.4 °C warmer")).toBeTruthy();
  });

  it("Disclosure is a details with a count badge, closed by default in jsdom and toggleable", () => {
    const { container } = render(<Disclosure title="Alerts" count={3} defaultOpen={false}><p>inside</p></Disclosure>);
    const details = container.querySelector("details")!;
    expect(details.open).toBe(false);
    expect(screen.getByText("3").parentElement?.textContent).toContain("items");
    details.open = true;
    fireEvent(details, new Event("toggle"));
    expect(details.open).toBe(true);
  });

  it("RailItem marks the selected item with aria-current and reports selection", () => {
    const onSelect = vi.fn();
    render(
      <RailList aria-label="Rooms">
        <RailGroup label="Ground floor">
          <RailItem name="Hallway" state="19.6 °C" health="warning" count={3} selected onSelect={onSelect} />
          <RailItem name="Kitchen" />
        </RailGroup>
      </RailList>,
    );
    const hall = screen.getByRole("button", { name: /Hallway/ });
    expect(hall.getAttribute("aria-current")).toBe("true");
    expect(hall.textContent).toContain("Needs attention");
    expect(screen.getByRole("button", { name: "Kitchen" }).getAttribute("aria-current")).toBeNull();
    fireEvent.click(hall);
    expect(onSelect).toHaveBeenCalled();
    expect(screen.getByRole("list", { name: "Ground floor" })).toBeTruthy();
  });

  it("SpaceHeader shows identity, a worded status and the slots", () => {
    render(<SpaceHeader title="Demo home" eyebrow="Home" status="warning" statusWord="2 need attention" chips={<SummaryChip value="21 °C" />} attention={<AttentionButton count={2} />} />);
    expect(screen.getByRole("heading", { name: "Demo home" })).toBeTruthy();
    expect(screen.getAllByText("2 need attention").length).toBe(2);
    expect(screen.getByRole("button", { name: "2 need attention" })).toBeTruthy();
  });

  it("AttentionButton says All clear at zero, and StateBadge always carries a word", () => {
    render(<><AttentionButton count={0} /><StateBadge state="offline" /></>);
    expect(screen.getByRole("button", { name: "All clear" })).toBeTruthy();
    expect(screen.getByText("Offline")).toBeTruthy();
  });
});
