/**
 * Three abstract plans for the showcase's SpaceCanvas: a home, a farm and a plant.
 *
 * Original drawings, not surveys of anything: the proportions are chosen to read well at 320 to 1440 px, not to
 * describe a real building. Room ids match the scenario fixtures in this folder so a composition can pass
 * `selectedRoomId` straight from the scenario's space nodes:
 *
 * - `homePlan`  <- smart-space.ts: room-living, room-kitchen, room-hall (Ground); room-bedroom, room-office (Upper)
 * - `fieldPlan` <- agritech.ts: field-greenhouse-a with zone-1 (decorative: no scenario node), zone-2, zone-3,
 *                  field-orchard, field-yard
 * - `sitePlan`  <- operations.ts: line-1 (Mixing), line-2 (Packing), line-3 (Utilities / plant room)
 *
 * Each plan also exports `*Anchors`: a suggested placement for every scenario device as `{ roomId, x, y }` with x/y in
 * percent of the plan, so a composition can build `PlanHotspot`s by mapping its devices onto them.
 *
 * Coordinates are in viewBox units. Rooms are separated by a gutter and joined by `opening` bridges, which reads as a
 * plan of tiles rather than boxes on a grid; furniture, crops and machines are abstract blocks.
 */
import type { PlanFeature, PlanLevel, PlanRoom, SpacePlan } from "@/components/iot/showcase/space-canvas";

const VIEW = { width: 640, height: 420 } as const;

/** Vertical crop rows between two x positions, `count` lines from y0 to y1. */
function rows(x0: number, x1: number, y0: number, y1: number, count: number): PlanFeature {
  const step = (x1 - x0) / (count - 1);
  const d = Array.from({ length: count }, (_, i) => `M${(x0 + step * i).toFixed(1)} ${y0}V${y1}`).join("");
  return { kind: "path", d, tone: "rows", width: 3 };
}

/** Evenly spaced parallel steps (a staircase) across a rectangle. */
function steps(x: number, y: number, width: number, height: number, count: number): PlanFeature {
  const gap = width / count;
  const d = Array.from({ length: count - 1 }, (_, i) => `M${(x + gap * (i + 1)).toFixed(1)} ${y}V${y + height}`).join("");
  return { kind: "path", d, tone: "line" };
}

const plot: PlanFeature = { kind: "rect", x: 12, y: 12, width: 616, height: 396, radius: 36, tone: "line", };

/* -------------------------------------------------------------------------------------------------
 * Home: two floors
 * ----------------------------------------------------------------------------------------------- */

const groundRooms: PlanRoom[] = [
  { id: "room-living", label: "Living room", shape: { kind: "rect", x: 32, y: 32, width: 338, height: 232, radius: 22 }, labelAt: { x: 52, y: 48 } },
  {
    id: "room-kitchen",
    label: "Kitchen",
    // a chamfered corner where the room meets the living space
    shape: { kind: "path", d: "M430 32H588a20 20 0 0 1 20 20V176a20 20 0 0 1-20 20H402a20 20 0 0 1-20-20V80Z" },
    labelAt: { x: 446, y: 46 },
  },
  {
    id: "room-hall",
    label: "Hallway",
    // an L: a long band under both rooms that steps up on the kitchen side
    shape: { kind: "path", d: "M54 276H382V208H586a22 22 0 0 1 22 22V366a22 22 0 0 1-22 22H54a22 22 0 0 1-22-22V298a22 22 0 0 1 22-22Z" },
    labelAt: { x: 190, y: 294 },
  },
];

const ground: PlanLevel = {
  id: "ground",
  label: "Ground floor",
  rooms: groundRooms,
  ground: [plot],
  features: [
    // living
    { kind: "rect", x: 96, y: 110, width: 200, height: 122, radius: 18, tone: "dots" },
    { kind: "rect", x: 112, y: 196, width: 170, height: 46, radius: 16, tone: "soft" },
    { kind: "path", d: "M168 202V238M226 202V238", tone: "line" },
    { kind: "rect", x: 158, y: 138, width: 76, height: 36, radius: 12, tone: "furniture" },
    { kind: "rect", x: 214, y: 42, width: 120, height: 14, radius: 6, tone: "furniture" },
    { kind: "circle", cx: 340, cy: 236, r: 13, tone: "plant" },
    { kind: "circle", cx: 340, cy: 236, r: 5, tone: "plant" },
    // kitchen
    { kind: "rect", x: 548, y: 44, width: 46, height: 16, radius: 6, tone: "furniture" },
    { kind: "circle", cx: 571, cy: 52, r: 5, tone: "water" },
    { kind: "rect", x: 470, y: 118, width: 110, height: 38, radius: 12, tone: "furniture" },
    { kind: "circle", cx: 492, cy: 175, r: 7, tone: "soft" },
    { kind: "circle", cx: 525, cy: 175, r: 7, tone: "soft" },
    { kind: "circle", cx: 558, cy: 175, r: 7, tone: "soft" },
    // hall: stairs, console, front door
    { kind: "rect", x: 48, y: 298, width: 124, height: 74, radius: 10, tone: "furniture" },
    steps(48, 298, 124, 74, 8),
    { kind: "rect", x: 420, y: 226, width: 120, height: 14, radius: 6, tone: "furniture" },
    { kind: "circle", cx: 574, cy: 366, r: 10, tone: "plant" },
    // doorways
    { kind: "rect", x: 232, y: 262, width: 50, height: 16, tone: "opening" },
    { kind: "rect", x: 368, y: 116, width: 16, height: 50, tone: "opening" },
    { kind: "rect", x: 452, y: 194, width: 50, height: 16, tone: "opening" },
    { kind: "path", d: "M240 388H288", tone: "gap" },
    { kind: "path", d: "M240 388V342M240 342A46 46 0 0 1 286 388", tone: "swing" },
  ],
};

const upperRooms: PlanRoom[] = [
  { id: "room-bedroom", label: "Bedroom", shape: { kind: "rect", x: 32, y: 32, width: 338, height: 264, radius: 22 }, labelAt: { x: 52, y: 48 } },
  {
    id: "room-office",
    label: "Office",
    shape: { kind: "path", d: "M404 32H586a22 22 0 0 1 22 22V170L558 220H404a22 22 0 0 1-22-22V54a22 22 0 0 1 22-22Z" },
    labelAt: { x: 402, y: 46 },
  },
];

const upper: PlanLevel = {
  id: "upper",
  label: "Upper floor",
  rooms: upperRooms,
  ground: [plot],
  features: [
    // landing and the stair well, drawn as a hatched void
    { kind: "rect", x: 32, y: 308, width: 338, height: 80, radius: 22, tone: "hatch" },
    { kind: "rect", x: 32, y: 308, width: 338, height: 80, radius: 22, tone: "line" },
    { kind: "rect", x: 382, y: 232, width: 226, height: 156, radius: 22, tone: "hatch" },
    { kind: "rect", x: 382, y: 232, width: 226, height: 156, radius: 22, tone: "line" },
    // bedroom
    { kind: "rect", x: 90, y: 150, width: 104, height: 104, radius: 52, tone: "dots" },
    { kind: "rect", x: 206, y: 76, width: 122, height: 150, radius: 14, tone: "soft" },
    { kind: "rect", x: 216, y: 86, width: 44, height: 26, radius: 9, tone: "furniture" },
    { kind: "rect", x: 272, y: 86, width: 44, height: 26, radius: 9, tone: "furniture" },
    { kind: "path", d: "M206 150H328", tone: "line" },
    { kind: "rect", x: 166, y: 84, width: 28, height: 28, radius: 8, tone: "furniture" },
    { kind: "rect", x: 340, y: 84, width: 22, height: 28, radius: 8, tone: "furniture" },
    { kind: "rect", x: 46, y: 190, width: 26, height: 84, radius: 8, tone: "furniture" },
    { kind: "circle", cx: 344, cy: 272, r: 12, tone: "plant" },
    // office
    { kind: "rect", x: 480, y: 76, width: 94, height: 40, radius: 10, tone: "furniture" },
    { kind: "circle", cx: 527, cy: 142, r: 15, tone: "soft" },
    { kind: "rect", x: 584, y: 72, width: 12, height: 84, radius: 5, tone: "furniture" },
    { kind: "circle", cx: 410, cy: 192, r: 10, tone: "plant" },
    // doorways
    { kind: "rect", x: 368, y: 116, width: 16, height: 50, tone: "opening" },
    { kind: "rect", x: 170, y: 288, width: 50, height: 16, tone: "opening" },
    { kind: "rect", x: 450, y: 210, width: 50, height: 16, tone: "opening" },
  ],
};

export const homePlan: SpacePlan = { id: "home", label: "Home plan", viewBox: VIEW, levels: [ground, upper] };

/* -------------------------------------------------------------------------------------------------
 * Field: greenhouse, three irrigation zones, an orchard and the utility yard
 * ----------------------------------------------------------------------------------------------- */

const zoneRoom = (id: string, label: string, x: number): PlanRoom => ({
  id,
  label,
  shape: { kind: "rect", x, y: 104, width: 108, height: 144, radius: 16 },
  labelAt: { x: x + 10, y: 112 },
});

const fieldLevel: PlanLevel = {
  id: "field",
  label: "Farm",
  ground: [plot],
  rooms: [
    { id: "field-greenhouse-a", label: "Greenhouse A", shape: { kind: "rect", x: 32, y: 32, width: 384, height: 236, radius: 40 }, labelAt: { x: 56, y: 46 } },
    zoneRoom("zone-1", "Zone 1", 52),
    zoneRoom("zone-2", "Zone 2", 170),
    zoneRoom("zone-3", "Zone 3", 288),
    {
      id: "field-orchard",
      label: "Orchard block",
      shape: { kind: "path", d: "M462 32H586a22 22 0 0 1 22 22V246a22 22 0 0 1-22 22H440V54a22 22 0 0 1 22-22Z" },
      labelAt: { x: 460, y: 46 },
      pattern: "dots",
    },
    { id: "field-yard", label: "Utility yard", shape: { kind: "rect", x: 32, y: 296, width: 576, height: 92, radius: 22 }, labelAt: { x: 52, y: 306 }, pattern: "hatch" },
  ],
  features: [
    // crop rows inside the zones
    rows(66, 150, 168, 238, 5),
    rows(184, 268, 168, 238, 5),
    rows(302, 386, 168, 238, 5),
    // irrigation: a header along the greenhouse floor, risers into each zone, and the feed from the yard
    { kind: "path", d: "M52 258H396", tone: "pipe" },
    { kind: "path", d: "M106 258V248M224 258V248M342 258V248", tone: "pipe" },
    { kind: "path", d: "M224 258V344H240", tone: "pipe" },
    // orchard trees
    ...[120, 160, 200, 240].flatMap((y) =>
      [474, 524, 574].flatMap((x): PlanFeature[] => [
        { kind: "circle", cx: x, cy: y, r: 14, tone: "plant" },
        { kind: "circle", cx: x, cy: y, r: 4, tone: "plant" },
      ]),
    ),
    // utility yard: pump house, tanks, weather mast, gateway
    { kind: "rect", x: 240, y: 318, width: 74, height: 52, radius: 10, tone: "metal" },
    { kind: "circle", cx: 277, cy: 344, r: 12, tone: "metal" },
    { kind: "path", d: "M314 344H364", tone: "pipe" },
    { kind: "circle", cx: 392, cy: 344, r: 26, tone: "water" },
    { kind: "circle", cx: 392, cy: 344, r: 15, tone: "line" },
    { kind: "circle", cx: 452, cy: 344, r: 26, tone: "water" },
    { kind: "circle", cx: 452, cy: 344, r: 15, tone: "line" },
    { kind: "circle", cx: 520, cy: 340, r: 8, tone: "metal" },
    { kind: "path", d: "M520 340V318M508 326H532", tone: "line" },
    { kind: "rect", x: 552, y: 340, width: 36, height: 26, radius: 7, tone: "metal" },
  ],
};

export const fieldPlan: SpacePlan = { id: "farm", label: "Farm plan", viewBox: VIEW, levels: [fieldLevel] };

/* -------------------------------------------------------------------------------------------------
 * Site: two production lines over a utilities plant room
 * ----------------------------------------------------------------------------------------------- */

const siteLevel: PlanLevel = {
  id: "site-04",
  label: "Site 04",
  ground: [plot],
  rooms: [
    { id: "line-1", label: "Line 1 · Mixing", shape: { kind: "rect", x: 32, y: 32, width: 278, height: 238, radius: 22 }, labelAt: { x: 52, y: 46 } },
    {
      id: "line-2",
      label: "Line 2 · Packing",
      shape: { kind: "path", d: "M370 32H586a22 22 0 0 1 22 22V248a22 22 0 0 1-22 22H344a22 22 0 0 1-22-22V80Z" },
      labelAt: { x: 380, y: 46 },
    },
    { id: "line-3", label: "Utilities · Plant room", shape: { kind: "rect", x: 32, y: 282, width: 576, height: 106, radius: 22 }, labelAt: { x: 52, y: 294 }, pattern: "hatch" },
  ],
  features: [
    // line 1: two vessels, a feed pump, a conveyor
    { kind: "circle", cx: 110, cy: 160, r: 34, tone: "metal" },
    { kind: "circle", cx: 110, cy: 160, r: 20, tone: "line" },
    { kind: "circle", cx: 110, cy: 160, r: 6, tone: "metal" },
    { kind: "circle", cx: 200, cy: 160, r: 34, tone: "metal" },
    { kind: "circle", cx: 200, cy: 160, r: 20, tone: "line" },
    { kind: "circle", cx: 200, cy: 160, r: 6, tone: "metal" },
    { kind: "rect", x: 252, y: 148, width: 40, height: 26, radius: 8, tone: "metal" },
    { kind: "path", d: "M144 160H166M234 160H252M110 194V208H272V174", tone: "pipe" },
    { kind: "rect", x: 52, y: 222, width: 240, height: 26, radius: 13, tone: "furniture" },
    { kind: "path", d: "M66 235H278", tone: "line" },
    // line 2: conveyor, two stations, pallet bay
    { kind: "rect", x: 372, y: 112, width: 214, height: 28, radius: 14, tone: "furniture" },
    { kind: "path", d: "M386 126H572", tone: "line" },
    { kind: "rect", x: 380, y: 166, width: 66, height: 46, radius: 10, tone: "metal" },
    { kind: "rect", x: 466, y: 166, width: 66, height: 46, radius: 10, tone: "metal" },
    { kind: "rect", x: 350, y: 226, width: 240, height: 30, radius: 10, tone: "hatch" },
    { kind: "rect", x: 350, y: 226, width: 240, height: 30, radius: 10, tone: "line" },
    { kind: "rect", x: 556, y: 164, width: 32, height: 46, radius: 6, tone: "soft" },
    // line 3: compressor, chiller, boiler, tank, switchgear
    { kind: "rect", x: 188, y: 308, width: 84, height: 62, radius: 12, tone: "metal" },
    { kind: "circle", cx: 214, cy: 339, r: 12, tone: "line" },
    { kind: "circle", cx: 246, cy: 339, r: 12, tone: "line" },
    { kind: "rect", x: 288, y: 308, width: 96, height: 62, radius: 12, tone: "metal" },
    { kind: "path", d: "M300 320H372M300 339H372M300 358H372", tone: "line" },
    { kind: "circle", cx: 428, cy: 339, r: 28, tone: "metal" },
    { kind: "circle", cx: 428, cy: 339, r: 14, tone: "line" },
    { kind: "circle", cx: 500, cy: 339, r: 28, tone: "water" },
    { kind: "circle", cx: 500, cy: 339, r: 14, tone: "line" },
    { kind: "rect", x: 556, y: 312, width: 20, height: 54, radius: 6, tone: "furniture" },
    { kind: "rect", x: 582, y: 312, width: 18, height: 54, radius: 6, tone: "furniture" },
    { kind: "path", d: "M272 339H288M384 339H400M456 339H472", tone: "pipe" },
    { kind: "path", d: "M428 311V270M500 311V270", tone: "pipe" },
    // doorways
    { kind: "rect", x: 308, y: 136, width: 16, height: 50, tone: "opening" },
    { kind: "rect", x: 100, y: 268, width: 50, height: 16, tone: "opening" },
    { kind: "rect", x: 520, y: 268, width: 50, height: 16, tone: "opening" },
  ],
};

export const sitePlan: SpacePlan = { id: "site-04", label: "Site 04 plan", viewBox: VIEW, levels: [siteLevel] };

/* -------------------------------------------------------------------------------------------------
 * Suggested device placements
 * ----------------------------------------------------------------------------------------------- */

export type PlanAnchor = { roomId: string; /** percent, inline-start */ x: number; /** percent, top */ y: number };

const anchor = (roomId: string, x: number, y: number): PlanAnchor => ({
  roomId,
  x: Math.round((x / VIEW.width) * 1000) / 10,
  y: Math.round((y / VIEW.height) * 1000) / 10,
});

/** Device id (smart-space.ts) -> placement. */
export const homeAnchors: Record<string, PlanAnchor> = {
  "lamp-living": anchor("room-living", 150, 178),
  "air-living": anchor("room-living", 330, 120),
  "plug-kettle": anchor("room-kitchen", 585, 96),
  "thermostat-hall": anchor("room-hall", 430, 330),
  "lock-front": anchor("room-hall", 306, 362),
  "camera-hall": anchor("room-hall", 560, 262),
  "lamp-bedroom": anchor("room-bedroom", 118, 200),
  "sensor-bedroom": anchor("room-bedroom", 266, 262),
  "plug-heater": anchor("room-office", 480, 168),
};

/** Device id (agritech.ts) -> placement. */
export const fieldAnchors: Record<string, PlanAnchor> = {
  "climate-a": anchor("field-greenhouse-a", 340, 70),
  "valve-02": anchor("zone-2", 224, 232),
  "soil-03": anchor("zone-2", 224, 192),
  "valve-03": anchor("zone-3", 342, 232),
  "soil-04": anchor("zone-3", 342, 192),
  "soil-05": anchor("field-orchard", 524, 180),
  "pump-01": anchor("field-yard", 277, 344),
  "weather-01": anchor("field-yard", 520, 340),
  "gateway-farm": anchor("field-yard", 570, 372),
};

/** Device id (operations.ts, all 24) -> placement. */
export const siteAnchors: Record<string, PlanAnchor> = {
  "m-101": anchor("line-1", 110, 160),
  "m-102": anchor("line-1", 200, 160),
  "m-103": anchor("line-1", 84, 235),
  "p-101": anchor("line-1", 272, 161),
  "p-102": anchor("line-1", 272, 208),
  "e-101": anchor("line-1", 268, 104),
  "s-101": anchor("line-1", 110, 110),
  "s-102": anchor("line-1", 200, 110),
  "m-201": anchor("line-2", 420, 126),
  "m-202": anchor("line-2", 520, 126),
  "m-203": anchor("line-2", 413, 189),
  "p-201": anchor("line-2", 499, 189),
  "e-201": anchor("line-2", 585, 82),
  "e-202": anchor("line-2", 572, 241),
  "s-201": anchor("line-2", 536, 82),
  "s-202": anchor("line-2", 470, 241),
  "g-01": anchor("line-3", 52, 358),
  "m-301": anchor("line-3", 230, 339),
  "p-301": anchor("line-3", 336, 339),
  "p-302": anchor("line-3", 428, 339),
  "e-301": anchor("line-3", 566, 340),
  "e-302": anchor("line-3", 591, 340),
  "s-301": anchor("line-3", 500, 339),
  "s-302": anchor("line-3", 160, 340),
};
