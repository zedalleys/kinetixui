import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlatformAtAGlance } from "./foundations-tables";
import { PLATFORM_DEFINITIONS, type Platform } from "@/lib/platform-parity";
import { componentTotal, platformCount } from "@/lib/platform-support";

const PAGES: Platform[] = ["Angular", "SwiftUI", "Compose", "Flutter"];

describe("PlatformAtAGlance", () => {
  it.each(PAGES)("states %s's facts from the manifest, not from prose", (platform) => {
    const { container } = render(<PlatformAtAGlance platform={platform} />);
    const dl = container.querySelector<HTMLElement>(`[data-platform-glance="${platform}"]`)!;
    expect(dl.getAttribute("aria-label")).toBe(`${PLATFORM_DEFINITIONS[platform].label} at a glance`);
    const text = dl.textContent!;
    const def = PLATFORM_DEFINITIONS[platform];
    expect(text).toContain(def.package);
    expect(text).toContain(`${platformCount(platform)} of ${componentTotal} catalogue entries`);
    expect(text).toContain(def.distribution.published ? `On ${def.distribution.channel}` : `Not on ${def.distribution.channel} yet`);
    expect(text).not.toMatch(/fully accessible|WCAG compliant|production[- ]ready|enterprise/i);
    const hrefs = within(dl).getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(expect.arrayContaining(["/components", "/docs/tokens"]));
  });
});
