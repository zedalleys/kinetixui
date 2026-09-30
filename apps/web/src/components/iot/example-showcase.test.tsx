import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { IotExampleShowcase } from "./example-showcase";

const show = () =>
  render(
    <IotExampleShowcase slug="demo" title="Demo" description="d" uses={["DeviceCard"]} path="apps/web/src/examples/iot/demo.tsx" code="const x = 1;">
      <p>live preview</p>
    </IotExampleShowcase>,
  );

afterEach(() => {
  document.documentElement.removeAttribute("dir");
});

describe("IotExampleShowcase direction", () => {
  it("lets the live preview inherit an RTL document instead of forcing LTR", () => {
    document.documentElement.setAttribute("dir", "rtl");
    show();
    const region = screen.getByRole("region", { name: "Demo preview" });
    // the nearest element that carries a `dir` attribute above the preview decides its direction
    expect(region.closest("[dir]")?.getAttribute("dir")).toBe("rtl");
  });

  it("stays LTR in an LTR document, and keeps the source code LTR either way", () => {
    show();
    expect(screen.getByRole("region", { name: "Demo preview" }).closest("[dir]")?.getAttribute("dir")).toBe("ltr");
    document.documentElement.setAttribute("dir", "rtl");
    const { container } = show();
    expect(container.querySelector("pre")?.getAttribute("dir")).toBe("ltr");
  });
});
