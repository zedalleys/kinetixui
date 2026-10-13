import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { KinetixDevice } from "../types/device";
import { CameraDeviceCard } from "./camera-device-card";
import { DeviceCard } from "./device-card";

const NOW = "2026-10-13T12:00:00.000Z";
const device = (over: Partial<KinetixDevice> = {}): KinetixDevice =>
  ({ id: "d1", name: "Hallway thermostat", type: "thermostat", status: "online", battery: 71, signal: 79, lastSeenAt: "2026-10-13T11:59:30.000Z", ...over }) as KinetixDevice;

describe("DeviceCard density (M5A)", () => {
  it("full (default) is unchanged: status badge, battery, signal and last update in view", () => {
    const { container } = render(<DeviceCard device={device()} now={NOW} />);
    expect(container.querySelector("details")).toBeNull();
    expect(screen.getByText("Online")).not.toHaveClass("sr-only");
    expect(screen.getAllByRole("img", { name: /battery/i }).length).toBeGreaterThan(0);
  });

  it("glance: an online device is quiet, the battery is detail, and nothing is removed", () => {
    const { container } = render(<DeviceCard device={device()} now={NOW} density="glance" />);
    expect(screen.getByText("Online")).toHaveClass("sr-only");
    const details = container.querySelector("details[data-device-meta]") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(within(details).getByText("Device details")).toBeInTheDocument();
    expect(within(details).getAllByRole("img", { name: /battery/i }).length).toBeGreaterThan(0);
  });

  it("glance: exceptions stay in view — an offline status and a low battery", () => {
    const { container } = render(<DeviceCard device={device({ status: "offline", battery: 12 })} now={NOW} density="glance" />);
    expect(screen.getByText("Offline")).not.toHaveClass("sr-only");
    const details = container.querySelector("details[data-device-meta]")!;
    const battery = screen.getAllByRole("img", { name: /battery/i })[0]!;
    expect(details.contains(battery)).toBe(false);
  });
});

describe("CameraDeviceCard density (M5A)", () => {
  it("glance keeps recording and privacy in view and tucks battery and signal away", () => {
    const { container } = render(<CameraDeviceCard device={device({ name: "Hallway camera", type: "camera", battery: 80 })} recording={false} privacy="off" now={NOW} density="glance" />);
    expect(screen.getByText("Not recording")).toBeInTheDocument();
    expect(screen.getByText("Privacy mode off")).toBeInTheDocument();
    expect(screen.getByText("Online")).toHaveClass("sr-only");
    expect((container.querySelector("details[data-device-meta]") as HTMLDetailsElement).open).toBe(false);
  });

  it("full (default) keeps its badge and indicators", () => {
    const { container } = render(<CameraDeviceCard device={device({ name: "Hallway camera", type: "camera" })} now={NOW} />);
    expect(container.querySelector("details")).toBeNull();
    expect(screen.getByText("Online")).not.toHaveClass("sr-only");
  });
});
