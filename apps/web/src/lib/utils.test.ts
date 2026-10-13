import { describe, expect, it } from "vitest";
import preset from "../../../../packages/ui/tailwind.config";
import site from "../../tailwind.config";
import { FONT_SIZE_CLASSES, cn } from "./utils";

describe("cn keeps the site's font-size utilities", () => {
  it("knows every fontSize step both Tailwind configs define", () => {
    const keys = [
      ...Object.keys(preset.theme?.extend?.fontSize ?? {}),
      ...Object.keys(site.theme?.extend?.fontSize ?? {}),
    ];
    expect([...FONT_SIZE_CLASSES].sort()).toEqual([...new Set(keys)].sort());
  });

  it("does not drop a type-scale class when a text colour follows it", () => {
    for (const size of FONT_SIZE_CLASSES) {
      expect(cn(`text-${size}`, "text-muted-foreground").split(" ")).toEqual([`text-${size}`, "text-muted-foreground"]);
    }
  });

  it("still resolves two sizes to the last one", () => {
    expect(cn("text-body-sm", "text-label-md")).toBe("text-label-md");
  });
});
