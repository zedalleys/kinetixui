import { readFileSync } from "node:fs";
import path from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KINETIX_DEVICE_CATEGORIES } from "@kinetixui/iot/functions";
import { DateStrip, DeviceIllustration, HouseMark, IconButton, IconCluster, PillSelector, SpaceHeader, Tile } from "./index";

afterEach(() => document.documentElement.removeAttribute("dir"));

describe("DeviceIllustration", () => {
  it("draws every category (and the speaker) as decorative SVG, and only `on` changes the art", () => {
    for (const category of [...KINETIX_DEVICE_CATEGORIES, "speaker" as const]) {
      const { container, unmount } = render(<DeviceIllustration category={category} on />);
      const off = render(<DeviceIllustration category={category} />);
      const svg = container.querySelector("svg")!;
      expect(svg.getAttribute("aria-hidden"), category).toBe("true");
      expect(svg.children.length, category).toBeGreaterThan(0);
      expect(svg.querySelector("video, canvas, image, foreignObject"), category).toBeNull();
      if (category !== "unknown" && category !== "speaker") expect(svg.innerHTML === off.container.querySelector("svg")!.innerHTML, category).toBe(false);
      off.unmount();
      unmount();
    }
  });

  it("maps size to a token size class", () => {
    const { container } = render(<DeviceIllustration category="light" size="lg" className="extra" />);
    expect(container.querySelector("svg")!.getAttribute("class")).toContain("size-28");
  });
});

describe("PillSelector", () => {
  const options = [
    { id: "a", label: "Living", count: 2 },
    { id: "b", label: "Kitchen" },
    { id: "c", label: "Hall" },
  ];

  it("is a named radiogroup with a roving tabindex and a check on the selected pill", () => {
    const { container } = render(<PillSelector label="Rooms" options={options} value="b" onChange={() => {}} showAll allLabel="All rooms" />);
    expect(screen.getByRole("radiogroup", { name: "Rooms" })).toBeTruthy();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.textContent?.replace(/\s+/g, " ").trim())).toEqual(["All rooms", "Living2 devices", "Kitchen", "Hall"]);
    expect(screen.getByRole("radio", { name: "Kitchen" }).getAttribute("aria-checked")).toBe("true");
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, -1, 0, -1]);
    expect(screen.getByRole("radio", { name: "Kitchen" }).querySelector("svg")).toBeTruthy();
    expect(container.querySelector("[role=radiogroup]")!.className).toContain("flex-wrap");
  });

  it("moves with arrow keys, reversed under RTL", () => {
    const onChange = vi.fn();
    render(<PillSelector label="Rooms" options={options} value="a" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("radio", { name: /Living/ }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("b");
    document.documentElement.setAttribute("dir", "rtl");
    fireEvent.keyDown(screen.getByRole("radio", { name: /Living/ }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("c");
    fireEvent.keyDown(screen.getByRole("radio", { name: /Living/ }), { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("b");
    fireEvent.keyDown(screen.getByRole("radio", { name: /Living/ }), { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("c");
  });

  it("selects the All pill by its id", () => {
    const onChange = vi.fn();
    render(<PillSelector label="Rooms" options={options} value="all" onChange={onChange} showAll />);
    expect(screen.getByRole("radio", { name: "All" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: /Hall/ }));
    expect(onChange).toHaveBeenCalledWith("c");
  });
});

describe("DateStrip", () => {
  const days = [
    { id: "d1", date: "2026-03-13", hasEvents: false },
    { id: "d2", date: "2026-03-14", count: 3 },
    { id: "d3", date: "2026-03-15", hasEvents: true },
  ];

  it("names each day in words, from the supplied dates and `now` only", () => {
    render(<DateStrip label="Activity day" days={days} value="d2" onChange={() => {}} now="2026-03-14" />);
    expect(screen.getByRole("radiogroup", { name: "Activity day" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Friday 13" })).toBeTruthy();
    const thursday = screen.getByRole("radio", { name: "Saturday 14, 3 events, today" });
    expect(thursday.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Sunday 15, 1 event" })).toBeTruthy();
  });

  it("uses roving tabindex and reverses arrows under RTL", () => {
    const onChange = vi.fn();
    render(<DateStrip label="Day" days={days} value="d2" onChange={onChange} />);
    expect(screen.getAllByRole("radio").map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
    fireEvent.keyDown(screen.getByRole("radio", { name: /Saturday/ }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("d3");
    document.documentElement.setAttribute("dir", "rtl");
    fireEvent.keyDown(screen.getByRole("radio", { name: /Saturday/ }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("d1");
  });

  it("localises weekday names", () => {
    render(<DateStrip label="Day" days={days} value="d1" onChange={() => {}} locale="de" />);
    expect(screen.getByRole("radio", { name: "Freitag 13" })).toBeTruthy();
  });
});

describe("Tile", () => {
  it("shows name, worded state, value and control, with the illustration decorative", () => {
    const { container } = render(<Tile name="Lamp" state="On, 6 hr up" value="80%" visual={<DeviceIllustration category="light" on />} control={<button type="button" role="switch" aria-checked="true" aria-label="Lamp power" />} />);
    expect(screen.getByText("Lamp")).toBeTruthy();
    expect(screen.getByText("On, 6 hr up")).toBeTruthy();
    expect(screen.getByText("80%")).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Lamp power" })).toBeTruthy();
    expect(container.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByRole("button", { pressed: true })).toBeNull();
  });

  it("is a toggle button when selectable, and keeps the control outside it", () => {
    const onSelect = vi.fn();
    render(<Tile name="Lock" state="Locked" selected onSelect={onSelect} control={<button type="button">Toggle</button>} />);
    const head = screen.getByRole("button", { name: /Lock/ });
    expect(head.getAttribute("aria-pressed")).toBe("true");
    expect(head.contains(screen.getByRole("button", { name: "Toggle" }))).toBe(false);
    fireEvent.click(head);
    expect(onSelect).toHaveBeenCalled();
  });

  it("marks a request with a dashed outline and words", () => {
    const { container } = render(<Tile name="Thermostat" value="20.5°" requested />);
    expect(screen.getByText("Requested, not yet confirmed")).toBeTruthy();
    expect(container.firstElementChild!.className).toContain("border-dashed");
  });
});

describe("SpaceHeader identity", () => {
  it("defaults to the house mark, takes a location line and an icon cluster", () => {
    const { container } = render(
      <SpaceHeader title="Demo home" location="Sample street 4" actions={<IconCluster label="Home actions"><IconButton label="Notifications" badge={3}>x</IconButton></IconCluster>} />,
    );
    expect(container.querySelector("svg path.stroke-primary")).toBeTruthy();
    expect(screen.getByText("Sample street 4")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Home actions" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Notifications, 3 new" })).toBeTruthy();
  });

  it("lets a composition supply its own identity", () => {
    render(<SpaceHeader title="Farm" identity={<span data-testid="mark">F</span>} />);
    expect(screen.getByTestId("mark")).toBeTruthy();
    render(<HouseMark />);
  });
});

describe("source discipline", () => {
  it("has no physical direction, arbitrary value, hex colour or canvas in the new files", () => {
    for (const file of ["device-illustration.tsx", "pill-selector.tsx", "date-strip.tsx", "roving.ts"]) {
      const src = readFileSync(path.join(import.meta.dirname, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
      expect(src, file).not.toMatch(/\b(ml|mr|pl|pr|left|right)-\d|text-(left|right)|rounded-(l|r)-|#[0-9a-fA-F]{3,8}\b|<canvas|<video|dangerouslySetInnerHTML|Date\.now|Math\.random/);
      expect(src, file).not.toMatch(/\b(bg|text|p|m|w|h|gap|size|max-w|max-h)-\[/);
    }
  });
});
