/**
 * The demo building: an original, fictional six-storey office building with one occupancy sensor per zone and
 * a handful of camera placeholders per floor. Every name, address and network value below is a fixture.
 *
 * The plan is drawn in a 1000 × 640 unit space. All floors share one footprint (the structure does not move
 * between storeys): a north band of rooms, an east–west corridor, a south band, and a central core with lifts,
 * stairs and washrooms. The layouts differ by what each floor is for.
 */
import type { BuildingDef, CameraDef, FloorDef, FloorLayout, PlanRect, ZoneDef, ZoneKind } from "./types";

export const PLAN_WIDTH = 1000;
export const PLAN_HEIGHT = 640;

/** The building envelope, the corridor and the core: the same on every floor. */
export const PLAN_SHELL = {
  outline: { x: 40, y: 40, width: 920, height: 560 } satisfies PlanRect,
  corridor: { x: 40, y: 290, width: 920, height: 50 } satisfies PlanRect,
  core: { x: 420, y: 40, width: 160, height: 250 } satisfies PlanRect,
} as const;

/** The simulated wall-clock origin of every scenario. Fixed, so the server render and a test agree. */
export const SCENARIO_START = "2026-03-10T09:30:00.000Z";

type ZoneSpec = { key: string; name: string; kind: ZoneKind; capacity: number; rect: PlanRect; baseline: number };
type CameraSpec = { abbr: string; zone: string; x: number; y: number; mount: string };

const LAYOUTS: Record<FloorLayout, { zones: ZoneSpec[]; cameras: CameraSpec[] }> = {
  services: {
    zones: [
      { key: "dock", name: "Loading dock", kind: "service", capacity: 12, rect: { x: 40, y: 40, width: 380, height: 250 }, baseline: 0.35 },
      { key: "bike", name: "Bike store and lockers", kind: "service", capacity: 30, rect: { x: 580, y: 40, width: 380, height: 250 }, baseline: 0.3 },
      { key: "plant", name: "Plant room", kind: "service", capacity: 4, rect: { x: 40, y: 340, width: 260, height: 260 }, baseline: 0.25 },
      { key: "gym", name: "Fitness studio", kind: "social", capacity: 25, rect: { x: 300, y: 340, width: 400, height: 260 }, baseline: 0.5 },
      { key: "store", name: "Storage", kind: "service", capacity: 6, rect: { x: 700, y: 340, width: 260, height: 260 }, baseline: 0.2 },
    ],
    cameras: [
      { abbr: "DCK", zone: "dock", x: 90, y: 240, mount: "Loading dock, south bay" },
      { abbr: "DCK", zone: "dock", x: 380, y: 250, mount: "Loading dock, goods lift" },
      { abbr: "BIK", zone: "bike", x: 910, y: 90, mount: "Bike store, ramp entrance" },
      { abbr: "PLT", zone: "plant", x: 90, y: 560, mount: "Plant room door" },
      { abbr: "GYM", zone: "gym", x: 660, y: 390, mount: "Fitness studio, east" },
      { abbr: "STO", zone: "store", x: 910, y: 560, mount: "Storage cage" },
    ],
  },
  lobby: {
    zones: [
      { key: "cafe", name: "Café", kind: "social", capacity: 60, rect: { x: 40, y: 40, width: 380, height: 250 }, baseline: 0.5 },
      { key: "recp", name: "Reception and security", kind: "lobby", capacity: 30, rect: { x: 580, y: 40, width: 380, height: 250 }, baseline: 0.4 },
      { key: "atr", name: "Atrium", kind: "event", capacity: 180, rect: { x: 40, y: 340, width: 480, height: 260 }, baseline: 0.45 },
      { key: "mail", name: "Mailroom", kind: "service", capacity: 8, rect: { x: 520, y: 340, width: 180, height: 260 }, baseline: 0.4 },
      { key: "lng", name: "Visitor lounge", kind: "lobby", capacity: 40, rect: { x: 700, y: 340, width: 260, height: 260 }, baseline: 0.4 },
    ],
    cameras: [
      { abbr: "CAF", zone: "cafe", x: 90, y: 240, mount: "Café, south counter" },
      { abbr: "RCP", zone: "recp", x: 640, y: 250, mount: "Reception desk" },
      { abbr: "RCP", zone: "recp", x: 910, y: 90, mount: "Security turnstiles" },
      { abbr: "ATR", zone: "atr", x: 480, y: 400, mount: "Atrium, east balcony" },
      { abbr: "ATR", zone: "atr", x: 470, y: 560, mount: "Atrium, main entrance" },
      { abbr: "MAL", zone: "mail", x: 610, y: 560, mount: "Mailroom hatch" },
      { abbr: "LNG", zone: "lng", x: 910, y: 560, mount: "Visitor lounge, east doors" },
    ],
  },
  office: {
    zones: [
      { key: "wsw", name: "Open workspace West", kind: "workspace", capacity: 56, rect: { x: 40, y: 40, width: 380, height: 250 }, baseline: 0.55 },
      { key: "wse", name: "Open workspace East", kind: "workspace", capacity: 56, rect: { x: 580, y: 40, width: 380, height: 250 }, baseline: 0.5 },
      { key: "focus", name: "Focus rooms", kind: "meeting", capacity: 12, rect: { x: 40, y: 340, width: 220, height: 260 }, baseline: 0.6 },
      { key: "meet", name: "Meeting suite", kind: "meeting", capacity: 24, rect: { x: 260, y: 340, width: 220, height: 260 }, baseline: 0.45 },
      { key: "hub", name: "Collaboration hub", kind: "social", capacity: 30, rect: { x: 480, y: 340, width: 220, height: 260 }, baseline: 0.4 },
      { key: "kit", name: "Kitchen and lounge", kind: "social", capacity: 28, rect: { x: 700, y: 340, width: 260, height: 260 }, baseline: 0.35 },
    ],
    cameras: [
      { abbr: "WSW", zone: "wsw", x: 90, y: 240, mount: "Open workspace West, south-west" },
      { abbr: "WSE", zone: "wse", x: 910, y: 90, mount: "Open workspace East, north-east corner" },
      { abbr: "FOC", zone: "focus", x: 90, y: 560, mount: "Focus rooms, corridor door" },
      { abbr: "MTG", zone: "meet", x: 440, y: 560, mount: "Meeting suite, south-east" },
      { abbr: "HUB", zone: "hub", x: 660, y: 560, mount: "Collaboration hub, south wall" },
      { abbr: "KIT", zone: "kit", x: 910, y: 560, mount: "Kitchen and lounge, east" },
    ],
  },
  conference: {
    zones: [
      { key: "hall", name: "Conference hall", kind: "event", capacity: 120, rect: { x: 40, y: 40, width: 380, height: 250 }, baseline: 0.5 },
      { key: "board", name: "Boardroom", kind: "meeting", capacity: 20, rect: { x: 580, y: 40, width: 380, height: 250 }, baseline: 0.5 },
      { key: "brk", name: "Breakout rooms", kind: "meeting", capacity: 30, rect: { x: 40, y: 340, width: 290, height: 260 }, baseline: 0.4 },
      { key: "foyer", name: "Pre-function foyer", kind: "lobby", capacity: 60, rect: { x: 330, y: 340, width: 370, height: 260 }, baseline: 0.35 },
      { key: "terr", name: "Terrace lounge", kind: "social", capacity: 40, rect: { x: 700, y: 340, width: 260, height: 260 }, baseline: 0.3 },
    ],
    cameras: [
      { abbr: "HAL", zone: "hall", x: 90, y: 240, mount: "Conference hall, south-west" },
      { abbr: "HAL", zone: "hall", x: 380, y: 90, mount: "Conference hall, stage door" },
      { abbr: "BRD", zone: "board", x: 910, y: 90, mount: "Boardroom entrance" },
      { abbr: "BRK", zone: "brk", x: 90, y: 560, mount: "Breakout rooms corridor" },
      { abbr: "FOY", zone: "foyer", x: 660, y: 390, mount: "Foyer, terrace side" },
      { abbr: "TER", zone: "terr", x: 910, y: 560, mount: "Terrace doors" },
    ],
  },
};

const FLOOR_SPECS: readonly { code: string; name: string; layout: FloorLayout }[] = [
  // Top first: the rail lists floors the way a building section reads.
  { code: "L4", name: "Level 4 · Conference", layout: "conference" },
  { code: "L3", name: "Level 3 · Offices", layout: "office" },
  { code: "L2", name: "Level 2 · Offices", layout: "office" },
  { code: "L1", name: "Level 1 · Offices", layout: "office" },
  { code: "GF", name: "Ground floor · Lobby", layout: "lobby" },
  { code: "B1", name: "Basement · Services", layout: "services" },
];

const hex2 = (n: number) => n.toString(16).toUpperCase().padStart(2, "0");

function buildFloor(spec: (typeof FLOOR_SPECS)[number], index: number): FloorDef {
  const floorId = spec.code.toLowerCase();
  const layout = LAYOUTS[spec.layout];
  const zones: ZoneDef[] = layout.zones.map((z) => ({
    id: `${floorId}-${z.key}`,
    floorId,
    name: z.name,
    kind: z.kind,
    capacity: z.capacity,
    rect: z.rect,
    baseline: z.baseline,
  }));
  // Floors are numbered bottom-up for the network plan: B1 is VLAN 110, GF 120, … L4 160.
  const storey = FLOOR_SPECS.length - 1 - index;
  const vlan = 110 + storey * 10;
  const perAbbr = new Map<string, number>();
  const cameras: CameraDef[] = layout.cameras.map((c, n) => {
    const seq = (perAbbr.get(c.abbr) ?? 0) + 1;
    perAbbr.set(c.abbr, seq);
    return {
      id: `${floorId}-cam-${n + 1}`,
      name: `${spec.code}-${c.abbr}-${String(seq).padStart(2, "0")}`,
      mount: c.mount,
      floorId,
      zoneId: `${floorId}-${c.zone}`,
      x: c.x,
      y: c.y,
      network: {
        ip: `10.40.${vlan}.${21 + n}`,
        vlan,
        subnetMask: "255.255.255.0",
        gateway: `10.40.${vlan}.1`,
        // Locally administered (02:…) so it can never collide with a real vendor prefix.
        mac: `02:4B:58:${hex2(storey)}:${hex2(n + 1)}:${hex2((storey * 37 + n * 11) & 0xff)}`,
        switchPort: `IDF-${spec.code} Gi1/0/${11 + n}`,
      },
      nominal: { frameRate: n % 3 === 0 ? 25 : 15, bitrateKbps: n % 3 === 0 ? 2400 : 1600, temperatureC: 41 + ((storey + n) % 5) },
    };
  });
  return { id: floorId, code: spec.code, name: spec.name, layout: spec.layout, zones, cameras };
}

export const BUILDING: BuildingDef = {
  id: "harbourline",
  name: "Harbourline House",
  site: "Demo campus · Building A",
  timeZone: "UTC",
  floors: FLOOR_SPECS.map(buildFloor),
};
