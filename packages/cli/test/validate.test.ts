import { describe, expect, it } from "vitest";
import { assertComponentName, assertRegistryUrl } from "../src/lib/validate.js";

/**
 * These two functions are the only thing standing between a registry response and a filesystem path, so
 * they are tested for what they refuse rather than what they accept.
 */
describe("assertComponentName", () => {
  it("accepts the names the registry actually serves", () => {
    for (const name of ["button", "alert-dialog", "input-otp", "avatar", "data-grid", "tabs"]) {
      expect(assertComponentName(name)).toBe(name);
    }
  });

  it.each([
    ["../../etc/passwd", "a relative traversal"],
    ["..", "a bare parent"],
    ["a/b", "a forward slash"],
    ["a\\b", "a backslash"],
    ["button.json", "a dot"],
    ["-leading", "a leading dash"],
    ["trailing-", "a trailing dash"],
    ["", "the empty string"],
    ["with space", "a space"],
    ["null\u0000byte", "a NUL byte"],
    ["%2e%2e%2fetc", "a percent-encoded traversal"],
  ])("refuses %j (%s)", (name) => {
    expect(() => assertComponentName(name)).toThrow(/Invalid component name/);
  });

  it("names the offending value in the error, so the message is actionable", () => {
    expect(() => assertComponentName("../secrets")).toThrow(/\.\.\/secrets/);
  });
});

describe("assertRegistryUrl", () => {
  it("accepts http and https", () => {
    expect(assertRegistryUrl("https://kinetixui.com/r")).toMatch(/^https:\/\/kinetixui\.com\/r/);
    expect(assertRegistryUrl("http://localhost:3000/r")).toMatch(/^http:\/\/localhost:3000\/r/);
  });

  it.each(["file:///etc/passwd", "data:text/json,{}", "javascript:alert(1)", "ftp://example.com/r"])(
    "refuses the %s scheme",
    (url) => {
      expect(() => assertRegistryUrl(url)).toThrow(/must be http/);
    },
  );

  it.each(["not-a-url", "", "://missing-scheme"])("refuses %j as unparseable", (url) => {
    expect(() => assertRegistryUrl(url)).toThrow(/Invalid registry URL/);
  });
});
