/**
 * What the operator is looking at: floor, camera, zone filter, status filter and map layers. A pure reducer,
 * so the synchronisation rules (a floor change re-targets the camera; picking a camera on another floor moves
 * to that floor) are tested without rendering anything.
 */
import { findCamera, findFloor } from "./engine";
import type { CameraFilter } from "./selectors";
import type { BuildingDef, Scenario } from "./types";

export type OpsViewState = {
  floorId: string;
  cameraId: string | null;
  zoneId: string | null;
  status: CameraFilter;
  showCameras: boolean;
  showOccupancy: boolean;
};

export type OpsViewAction =
  | { type: "floor"; floorId: string }
  | { type: "camera"; cameraId: string }
  | { type: "zone"; zoneId: string | null }
  | { type: "status"; status: CameraFilter }
  | { type: "layer"; layer: "cameras" | "occupancy"; on: boolean }
  | { type: "scenario"; scenario: Scenario };

export function initialViewState(scenario: Scenario): OpsViewState {
  return { floorId: scenario.floorId, cameraId: scenario.cameraId, zoneId: null, status: "all", showCameras: true, showOccupancy: true };
}

export function reduceView(building: BuildingDef, state: OpsViewState, action: OpsViewAction): OpsViewState {
  switch (action.type) {
    case "floor": {
      const floor = findFloor(building, action.floorId);
      if (!floor || floor.id === state.floorId) return state;
      const keep = state.cameraId && floor.cameras.some((c) => c.id === state.cameraId);
      return { ...state, floorId: floor.id, zoneId: null, cameraId: keep ? state.cameraId : (floor.cameras[0]?.id ?? null) };
    }
    case "camera": {
      const camera = findCamera(building, action.cameraId);
      if (!camera) return state;
      const sameFloor = camera.floorId === state.floorId;
      return {
        ...state,
        cameraId: camera.id,
        floorId: camera.floorId,
        // A zone filter that would hide the chosen camera is dropped rather than hiding the selection.
        zoneId: sameFloor && state.zoneId === camera.zoneId ? state.zoneId : null,
      };
    }
    case "zone": {
      if (action.zoneId === null) return { ...state, zoneId: null };
      const floor = findFloor(building, state.floorId);
      const zone = floor?.zones.find((z) => z.id === action.zoneId);
      if (!floor || !zone) return state;
      const current = state.cameraId ? findCamera(building, state.cameraId) : undefined;
      const inZone = floor.cameras.filter((c) => c.zoneId === zone.id);
      const cameraId = current?.zoneId === zone.id || inZone.length === 0 ? state.cameraId : inZone[0]!.id;
      return { ...state, zoneId: zone.id, cameraId };
    }
    case "status":
      return state.status === action.status ? state : { ...state, status: action.status };
    case "layer":
      return action.layer === "cameras" ? { ...state, showCameras: action.on } : { ...state, showOccupancy: action.on };
    case "scenario":
      return { ...initialViewState(action.scenario), showCameras: state.showCameras, showOccupancy: state.showOccupancy };
  }
}
