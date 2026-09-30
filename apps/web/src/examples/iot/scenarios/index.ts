/**
 * The three reference environments and the pairing fixtures. Data only: no JSX, no clock, no network.
 * Every one is fabricated — pair any page that renders them with `SIMULATION_DISCLOSURE`.
 */
import { agritech } from "./agritech";
import { operations } from "./operations";
import { smartSpace } from "./smart-space";
import type { SimScenario } from "@/lib/iot-sim/types";

export { smartSpace, SMART_SPACE_START } from "./smart-space";
export { agritech, agritechRule, agritechRainForecast, AGRITECH_START } from "./agritech";
export { operations, OPERATIONS_START } from "./operations";
export * from "./pairing";

export const scenarios = { "smart-space": smartSpace, agritech, operations } as const satisfies Record<string, SimScenario>;
export type ScenarioId = keyof typeof scenarios;
export const scenarioList: readonly SimScenario[] = [smartSpace, agritech, operations];
export const getScenario = (id: string): SimScenario | undefined => (scenarios as Record<string, SimScenario>)[id];
