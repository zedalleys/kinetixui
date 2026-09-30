import { readFileSync } from "node:fs";
import path from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { fieldAnchors, fieldPlan, homeAnchors, homePlan, siteAnchors, sitePlan } from "@/examples/iot/scenarios/plans";
import { smartSpaceSpaces, smartSpaceDevices } from "@/examples/iot/scenarios/smart-space";
import { agritechSpaces, agritechDevices } from "@/examples/iot/scenarios/agritech";
import { operationsSpaces, operationsDevices } from "@/examples/iot/scenarios/operations";
import { SpaceCanvas, hotspotName, type PlanHotspot } from "./space-canvas";

const hotspots: PlanHotspot[] = [
  { id: "thermostat", roomId: "room-hall", x: 32, y: 40, category: "thermostat", state: "pending", label: "Hallway thermostat", value: "20.5 °C", requested: "22 °C" },
  { id: "lamp", roomId: "room-living", x: 20, y: 30, category: "light", state: "offline", label: "Living room lamp" },
  { id: "air", roomId: "room-living", x: 40, y: 20, category: "sensor", state: "confirmed", label: "Air quality sensor", value: "62 AQI" },
  { id: "upstairs", roomId: "room-bedroom", x: 30, y: 30, category: "sensor", state: "warning", label: "Bedroom sensor" },
];

describe("SpaceCanvas", () => {
  it("draws a decorative SVG and only real buttons as interaction, with no video or canvas", () => {
    const { container } = render(<SpaceCanvas plan={homePlan} selectedRoomId="room-hall" hotspots={hotspots} />);
    const svg = container.querySelector("svg[data-plan-level]")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.querySelector("button, a, input, [tabindex]")).toBeNull();
    expect(container.querySelector("video, canvas, audio, img")).toBeNull();
  });

  it("names every hotspot honestly and reports the selected one with aria-pressed", () => {
    render(<SpaceCanvas plan={homePlan} selectedRoomId="room-hall" hotspots={hotspots} selectedHotspotId="thermostat" />);
    const thermostat = screen.getByRole("button", { name: "Hallway thermostat, 20.5 °C, requested 22 °C, not yet confirmed" });
    expect(thermostat.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Living room lamp, offline" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "Air quality sensor, 62 AQI" })).toBeTruthy();
    // a hotspot on the other floor is not on this plan
    expect(screen.queryByRole("button", { name: /Bedroom sensor/ })).toBeNull();
  });

  it("positions hotspots with logical inset properties", () => {
    render(<SpaceCanvas plan={homePlan} selectedRoomId="room-hall" hotspots={hotspots} />);
    const wrapper = screen.getByRole("button", { name: /Hallway thermostat/ }).parentElement!;
    expect(wrapper.style.insetInlineStart).toBe("32%");
    expect(wrapper.style.insetBlockStart).toBe("40%");
    expect(wrapper.style.left).toBe("");
  });

  it("reports hotspot selection", () => {
    const onSelectHotspot = vi.fn();
    render(<SpaceCanvas plan={homePlan} selectedRoomId="room-hall" hotspots={hotspots} onSelectHotspot={onSelectHotspot} />);
    fireEvent.click(screen.getByRole("button", { name: /Hallway thermostat/ }));
    expect(onSelectHotspot).toHaveBeenCalledWith("thermostat");
  });

  it("mirrors room selection from a click on the plan, and marks the selected room by word", () => {
    const onSelectRoom = vi.fn();
    const { container } = render(<SpaceCanvas plan={homePlan} selectedRoomId="room-hall" onSelectRoom={onSelectRoom} />);
    fireEvent.click(container.querySelector('[data-room="room-kitchen"]')!);
    expect(onSelectRoom).toHaveBeenCalledWith("room-kitchen");
    expect(container.querySelector('[data-room="room-hall"]')!.getAttribute("data-selected")).toBe("true");
    expect(screen.getByText("Selected")).toBeTruthy();
  });

  it("follows the selected room to its floor and lets the floor switcher change it", () => {
    render(<SpaceCanvas plan={homePlan} selectedRoomId="room-bedroom" hotspots={hotspots} />);
    expect(screen.getByRole("button", { name: /Bedroom sensor/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Upper floor" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Ground floor" }));
    expect(screen.getByRole("button", { name: /Hallway thermostat/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Bedroom sensor/ })).toBeNull();
  });

  it("shows no level switcher for a single-level plan", () => {
    render(<SpaceCanvas plan={fieldPlan} selectedRoomId="zone-2" />);
    expect(screen.queryByRole("button", { name: /floor/i })).toBeNull();
  });

  it("gives ambient readings to assistive technology once, as a list", () => {
    render(<SpaceCanvas plan={homePlan} selectedRoomId="room-living" ambient={{ "room-living": ["21.4 °C", "48 %"] }} />);
    const list = screen.getByRole("list", { name: /rooms and readings/ });
    expect(within(list).getByText(/Living room \(selected\): 21.4 °C, 48 %/)).toBeTruthy();
  });

  it("builds names for every state", () => {
    expect(hotspotName({ label: "Valve", state: "warning" })).toBe("Valve, needs attention");
    expect(hotspotName({ label: "Valve", state: "confirmed", value: "Open" })).toBe("Valve, Open");
    expect(hotspotName({ label: "Valve", state: "confirmed", ariaLabel: "Custom" })).toBe("Custom");
  });
});

describe("plans", () => {
  const ids = (plan: typeof homePlan) => new Set(plan.levels.flatMap((l) => l.rooms.map((r) => r.id)));

  it("use room ids that exist in the scenario fixtures", () => {
    const home = ids(homePlan);
    for (const n of smartSpaceSpaces.filter((s) => s.kind === "room")) expect(home.has(n.id), n.id).toBe(true);
    const farm = ids(fieldPlan);
    for (const n of agritechSpaces.filter((s) => s.id !== "farm")) expect(farm.has(n.id), n.id).toBe(true);
    const site = ids(sitePlan);
    for (const n of operationsSpaces.filter((s) => s.kind === "line")) expect(site.has(n.id), n.id).toBe(true);
  });

  it("place every scenario device inside a room of its plan", () => {
    const check = (plan: typeof homePlan, anchors: typeof homeAnchors, devices: { id: string }[]) => {
      const known = ids(plan);
      for (const d of devices) {
        expect(anchors[d.id], d.id).toBeTruthy();
        expect(known.has(anchors[d.id]!.roomId), d.id).toBe(true);
      }
    };
    check(homePlan, homeAnchors, smartSpaceDevices);
    check(fieldPlan, fieldAnchors, agritechDevices);
    check(sitePlan, siteAnchors, operationsDevices);
  });
});

describe("source discipline", () => {
  it("uses no physical direction, arbitrary value, hex colour, canvas or unguarded animation", () => {
    for (const file of ["space-canvas.tsx", "primitives.tsx", "showcase-shell.tsx"]) {
      const src = readFileSync(path.join(import.meta.dirname, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
      expect(src, file).not.toMatch(/\b(ml|mr|pl|pr|left|right)-\d|text-(left|right)|rounded-(l|r)-|#[0-9a-fA-F]{3,8}\b|<canvas|<video|dangerouslySetInnerHTML/);
      expect(src, file).not.toMatch(/\b(bg|text|p|m|w|h|gap|size|max-w|max-h)-\[/);
      if (/animate-pulse/.test(src)) expect(src).toContain("motion-reduce:animate-none");
    }
  });
});
