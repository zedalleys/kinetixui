import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlatformAtAGlance } from "./foundations-tables";
import { PLATFORM_DEFINITIONS, PLATFORMS, type Platform } from "@/lib/platform-parity";
import { componentTotal, platformCount } from "@/lib/platform-support";

/** Each platform's own page, where this block has always been rendered. */
const OWN_PAGE: Record<Platform, string> = {
  React: "/docs/installation",
  Angular: "/docs/angular",
  SwiftUI: "/docs/swiftui",
  Compose: "/docs/compose",
  Flutter: "/docs/flutter",
};

const glance = (platform: Platform, page: string) => {
  const { container } = render(<PlatformAtAGlance platform={platform} page={page} />);
  return container.querySelector<HTMLElement>(`[data-platform-glance="${platform}"]`)!;
};

describe("PlatformAtAGlance", () => {
  it.each(PLATFORMS)("states %s's facts from the manifest, not from prose", (platform) => {
    const dl = glance(platform, OWN_PAGE[platform]);
    const def = PLATFORM_DEFINITIONS[platform];
    expect(dl.getAttribute("aria-label")).toBe(`${def.label} at a glance`);
    const text = dl.textContent!;
    expect(text).toContain(def.package);
    expect(text).toContain(`${platformCount(platform)} of ${componentTotal} catalogue entries`);
    expect(text).toContain(def.distribution.published ? `On ${def.distribution.channel}` : `Not on ${def.distribution.channel} yet`);
    expect(text).not.toMatch(/fully accessible|WCAG compliant|production[- ]ready|enterprise/i);
    const hrefs = within(dl).getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(expect.arrayContaining(["/components", "/docs/tokens"]));
  });

  /*
   * The block is rendered on /docs/platforms as well as on each platform's own page. A bare `#setup` resolves
   * against whichever page it lands on, so on /docs/platforms the Start link pointed at ids that do not exist
   * there. Every href has to carry its own path.
   */
  it.each(PLATFORMS)("gives %s no href that depends on which page it is rendered on", (platform) => {
    const dl = glance(platform, "/docs/platforms");
    const hrefs = within(dl).getAllByRole("link").map((a) => a.getAttribute("href")!);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(href.startsWith("/")).toBe(true);
  });

  it("offers every platform a first step on /docs/platforms", () => {
    for (const platform of PLATFORMS) {
      const text = glance(platform, "/docs/platforms").textContent!;
      expect(text).toContain("Start");
    }
  });

  /* On the setup page itself, "Install React" would be a link to the page you are reading, with no fragment
   * to move you. It is dropped there, and only there. */
  it("drops React's first step on the installation page, and keeps Angular's in-page jump", () => {
    expect(glance("React", "/docs/installation").textContent).not.toContain("Install React");
    const angular = within(glance("Angular", "/docs/angular")).getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(angular).toContain("/docs/angular#install");
  });
});
