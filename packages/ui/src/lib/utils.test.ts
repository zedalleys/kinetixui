import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("keeps a type-scale class and a text colour together", () => {
    expect(cn("text-primary-foreground", "text-label-sm")).toBe("text-primary-foreground text-label-sm");
    expect(cn("text-label-sm", "text-primary-foreground")).toBe("text-label-sm text-primary-foreground");
  });
  it("still lets a later type-scale class override an earlier one", () => {
    expect(cn("text-label-sm", "text-body-md")).toBe("text-body-md");
  });
});
