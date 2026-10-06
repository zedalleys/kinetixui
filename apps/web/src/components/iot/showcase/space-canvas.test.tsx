import { readFileSync } from "node:fs";
import path from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { fieldAnchors, fieldPlan, homeAnchors, homePlan, siteAnchors, sitePlan } from "@/examples/iot/scenarios/plans";
import { smartSpaceSpaces, smartSpaceDevices } from "@/examples/iot/scenarios/smart-space";
import { agritechSpaces, agritechDevices } from "@/examples/iot/scenarios/agritech";
import { operationsSpaces, operationsDevices } from "@/examples/iot/scenarios/operations";
import { SpaceCanvas, hotspotName, phonePlanLayout, roomCaptionWidth, selectedLabelAlign, type PlanHotspot } from "./space-canvas";

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

describe("phone width (~390 px)", () => {
  // The plan is ~254 px wide at a 390 px viewport; the component culls against a 250 px floor.
  const PLAN_WIDTH = 250;
  const dense: PlanHotspot[] = [
    { id: "a", roomId: "room-hall", x: 40, y: 40, category: "thermostat", state: "confirmed", label: "A", value: "1" },
    // 3% of a 320 px plan is ~10 px apart: these three cannot all be drawn.
    { id: "b", roomId: "room-hall", x: 43, y: 40, category: "light", state: "confirmed", label: "B" },
    { id: "c", roomId: "room-hall", x: 46, y: 40, category: "light", state: "confirmed", label: "C" },
    { id: "far", roomId: "room-kitchen", x: 90, y: 15, category: "plug", state: "confirmed", label: "Far" },
  ];

  it("never drops the selected marker, and drops only markers that would overlap one already placed", () => {
    const layout = phonePlanLayout({ hotspots: dense, selectedRoomId: "room-hall", selectedHotspotId: "c", viewBox: { width: 640, height: 420 } });
    expect(layout.shown.has("c")).toBe(true);
    expect(layout.shown.has("far")).toBe(true);
    // a and b sit 15 px and 8 px from c on a 250 px plan, inside the 44 px target, so both give way
    expect(layout.dropped.map((h) => h.id)).toEqual(["a", "b"]);
  });

  it("judges collisions at the text size actually drawn: at 200% text the 88px targets need twice the room", () => {
    const spaced: PlanHotspot[] = [
      { id: "a", roomId: "room-hall", x: 20, y: 50, category: "light", state: "confirmed", label: "A" },
      { id: "b", roomId: "room-hall", x: 30, y: 50, category: "light", state: "confirmed", label: "B" },
    ];
    // 10% of a 480px plan is 48px: clear of a 44px target, inside an 88px one
    const normal = phonePlanLayout({ hotspots: spaced, viewBox: { width: 640, height: 420 }, planWidth: 480 });
    const large = phonePlanLayout({ hotspots: spaced, viewBox: { width: 640, height: 420 }, planWidth: 480, textScale: 2 });
    expect(normal.dropped).toEqual([]);
    expect(large.dropped.map((h) => h.id)).toEqual(["b"]);
  });

  it("prefers anything needing attention over a quiet marker in the selected room", () => {
    const withWarning = dense.map((h) => (h.id === "b" ? { ...h, roomId: "room-kitchen", state: "warning" as const } : h));
    const layout = phonePlanLayout({ hotspots: withWarning, selectedRoomId: "room-hall", viewBox: { width: 640, height: 420 } });
    expect(layout.shown.has("b")).toBe(true);
    expect(layout.dropped.map((h) => h.id).sort()).toEqual(["a", "c"]);
  });

  it("keeps markers off the room caption, and gives the caption up to an alert rather than the reverse", () => {
    const corner: PlanHotspot[] = [
      { id: "quiet", roomId: "room-hall", x: 4, y: 4, category: "light", state: "confirmed", label: "Quiet" },
      { id: "alert", roomId: "room-hall", x: 4, y: 4, category: "valve", state: "critical", label: "Alert" },
    ];
    const vb = { width: 640, height: 420 };
    // a quiet marker in the corner gives way to the caption
    const quiet = phonePlanLayout({ hotspots: [corner[0]!], captionWidth: 100, viewBox: vb });
    expect(quiet.caption).toBe(true);
    expect(quiet.dropped.map((h) => h.id)).toEqual(["quiet"]);
    // a critical one does not
    const alert = phonePlanLayout({ hotspots: corner, captionWidth: 100, viewBox: vb });
    expect(alert.shown.has("alert")).toBe(true);
    expect(alert.caption).toBe(false);
  });

  it("renders the selected room's name as one caption below sm and the in-place names only from sm up", () => {
    const { container } = render(<SpaceCanvas plan={homePlan} selectedRoomId="room-living" hotspots={dense} ambient={{ "room-living": ["21.4 °C"] }} />);
    const caption = container.querySelector<HTMLElement>("[data-room-caption]")!;
    expect(caption.textContent).toBe("Living room");
    expect(caption.className).toMatch(/sm:hidden/);
    expect(caption.getAttribute("aria-hidden")).toBe("true");
    // the in-place block (name + ambient chips) is held back below sm for every room, selected or not
    for (const block of container.querySelectorAll('[style*="inset-inline-start"]')) {
      if (block.querySelector("[data-hotspot]")) continue;
      expect(block.className).toMatch(/\bhidden\b/);
      expect(block.className).toMatch(/\bsm:flex\b/);
    }
  });

  it("leaves no two drawn markers overlapping, for every room of every plan", () => {
    const check = (plan: typeof homePlan, anchors: typeof homeAnchors, devices: { id: string }[]) => {
      const all: PlanHotspot[] = devices.map((d, i) => ({
        id: d.id,
        roomId: anchors[d.id]!.roomId,
        x: anchors[d.id]!.x,
        y: anchors[d.id]!.y,
        category: "sensor",
        state: (["confirmed", "pending", "warning", "offline"] as const)[i % 4]!,
        label: d.id,
      }));
      for (const level of plan.levels) {
        const ids = new Set(level.rooms.map((r) => r.id));
        const here = all.filter((h) => ids.has(h.roomId));
        for (const room of level.rooms) {
          for (const chosen of [null, ...here.filter((h) => h.roomId === room.id).map((h) => h.id)]) {
            const layout = phonePlanLayout({
              hotspots: here,
              selectedRoomId: room.id,
              selectedHotspotId: chosen,
              captionWidth: roomCaptionWidth(room.label),
              viewBox: plan.viewBox,
            });
            const shown = here.filter((h) => layout.shown.has(h.id));
            const height = (PLAN_WIDTH * plan.viewBox.height) / plan.viewBox.width;
            for (let i = 0; i < shown.length; i++) {
              for (let j = i + 1; j < shown.length; j++) {
                const dx = Math.abs(shown[i]!.x - shown[j]!.x) * (PLAN_WIDTH / 100);
                const dy = Math.abs(shown[i]!.y - shown[j]!.y) * (height / 100);
                expect(dx >= 44 || dy >= 44, `${plan.id}/${room.id}: ${shown[i]!.id} vs ${shown[j]!.id}`).toBe(true);
              }
            }
            // nothing is lost: every marker is either drawn or named in the hidden list
            expect(layout.shown.size + layout.dropped.length).toBe(here.length);
          }
        }
      }
    };
    check(homePlan, homeAnchors, smartSpaceDevices);
    check(fieldPlan, fieldAnchors, agritechDevices);
    check(sitePlan, siteAnchors, operationsDevices);
  });

  it("holds dropped markers back only below sm, and names them in a list that is gone from sm up", () => {
    const { container } = render(<SpaceCanvas plan={homePlan} selectedRoomId="room-hall" selectedHotspotId="c" hotspots={dense} />);
    expect(container.querySelector('[data-hotspot="c"]')!.parentElement!.className).not.toMatch(/hidden/);
    expect(container.querySelector('[data-hotspot="b"]')!.parentElement!.className).toMatch(/hidden sm:block/);
    const list = screen.getByRole("list", { name: /devices not shown on the plan/i });
    expect(list.className).toMatch(/sm:hidden/);
    expect(within(list).getByText("B")).toBeTruthy();
    // still a real, named button from sm up
    expect(screen.getByRole("button", { name: "B" })).toBeTruthy();
  });

  it("gives every marker a 44 px touch target at every width, with a smaller visible bubble", () => {
    const { container } = render(<SpaceCanvas plan={homePlan} selectedRoomId="room-hall" selectedHotspotId="a" hotspots={dense} />);
    const button = container.querySelector<HTMLElement>('[data-hotspot="a"]')!;
    expect(button.className).toMatch(/\bsize-11\b/);
    expect(button.className).not.toMatch(/md:size-/);
    expect(button.querySelector('[aria-hidden="true"]')!.className).toMatch(/\bsize-10\b/);
  });

  it("shows the selected marker's name at phone width, and no other marker's", () => {
    render(<SpaceCanvas plan={homePlan} selectedRoomId="room-hall" selectedHotspotId="a" hotspots={dense} hotspotLabels="all" />);
    const chip = (text: string) => screen.getByText(text).closest("span[aria-hidden]")!;
    expect(chip("A").className).toMatch(/\bflex\b/);
    expect(chip("Far").className).toMatch(/hidden md:flex/);
  });

  it("hangs the selected name chip off the marker's edge near the plan edges, with logical properties", () => {
    expect([selectedLabelAlign(20), selectedLabelAlign(50), selectedLabelAlign(90)]).toEqual(["start", "center", "end"]);
    const edge: PlanHotspot[] = [{ id: "edge", roomId: "room-hall", x: 8, y: 50, category: "light", state: "confirmed", label: "Edge lamp" }];
    render(<SpaceCanvas plan={homePlan} selectedRoomId="room-hall" selectedHotspotId="edge" hotspots={edge} />);
    const chip = screen.getByText("Edge lamp").closest("span[aria-hidden]")!;
    expect(chip.className).toMatch(/\bstart-0\b/);
    expect(chip.className).not.toMatch(/-translate-x-1\/2/);
  });

  it("markerDensity=all keeps every marker at every width", () => {
    const { container } = render(<SpaceCanvas plan={homePlan} selectedRoomId="room-hall" hotspots={dense} markerDensity="all" />);
    for (const id of ["a", "b", "c", "far"]) expect(container.querySelector(`[data-hotspot="${id}"]`)!.parentElement!.className).not.toMatch(/hidden/);
    expect(screen.queryByRole("list", { name: /not shown on the plan/i })).toBeNull();
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
