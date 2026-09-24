// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ATTRIBUTION_MEDIUMS, deriveAttribution, sanitizeAttributionProps, toProps } from "./analytics-attribution";
import { siteConfig } from "./site";

/**
 * Campaign links, checked against the parser that will actually read them.
 *
 * A marketing package can write any URL it likes; only this module decides what PostHog receives. The two
 * are checked by eye today, which is the same arrangement that produced every bug the a01 campaign is
 * about. A mistyped `utm_campaign` is the worst case available: it is dropped in silence, so the posts go
 * out, the traffic arrives, and nothing links it to the campaign. There is no way to repair that after the
 * fact — the sessions are gone.
 *
 * So each documented link is run through `deriveAttribution` → `toProps` → `sanitizeAttributionProps`, the
 * exact path a real visit takes, and the resulting property bag is asserted. The URLs are read out of the
 * marketing files rather than copied here: copying them would prove that two hard-coded strings agree.
 */
const ROOT = "../..";
const draft = (id: string, f: string) => readFileSync(`${ROOT}/marketing/content/drafts/${id}/${f}`, "utf8");

/** The full path a tagged visit takes, ending in the bag PostHog would receive. */
function propsFor(url: string): Record<string, string> {
  const u = new URL(url);
  const bag = toProps(
    deriveAttribution({ search: u.search, referrer: "", ownHostname: u.hostname, pathname: u.pathname }),
    "kx_",
  );
  sanitizeAttributionProps(bag);
  return bag;
}

/** Every absolute kinetixui.com URL carrying a utm_campaign, wherever a campaign package writes one. */
function taggedLinks(files: string[]): string[] {
  const found = new Set<string>();
  for (const body of files) {
    for (const m of body.matchAll(/https:\/\/kinetixui\.com\/[^\s`"'|)]*utm_campaign=[^\s`"'|)]*/g)) found.add(m[0]);
  }
  return [...found];
}

const A01 = ["measurement.md", "publish-checklist.md", "linkedin.md", "x-thread.md", "article.md"].map((f) => draft("a01", f));
const A02 = ["measurement.md", "publish-checklist.md", "linkedin.md", "x-thread.md", "sources.md", "visual-brief.md"].map((f) => draft("a02", f));

describe("campaign links survive the attribution parser", () => {
  const links = taggedLinks([...A01, ...A02]);

  it("finds the documented links rather than silently checking nothing", () => {
    // The a01 table has three channel rows; a02 carries its links in front matter. If this drops to
    // zero the regex has stopped matching and every assertion below would vacuously pass.
    expect(links.length).toBeGreaterThanOrEqual(4);
  });

  it.each(links)("%s keeps its campaign, source and medium", (url) => {
    const bag = propsFor(url);
    const q = new URL(url).searchParams;

    // The campaign is the one value that vanishes without an error, so assert it survived *as written*.
    expect(bag.kx_campaign).toBe(q.get("utm_campaign"));
    expect(bag.kx_campaign).toMatch(/^kx_[a-z0-9][a-z0-9_-]{0,62}$/);
    expect(bag.kx_source).toBe(q.get("utm_source"));
    expect(bag.kx_medium).toBe(q.get("utm_medium"));
    expect(ATTRIBUTION_MEDIUMS).toContain(bag.kx_medium);
    expect(bag.kx_landing_page).toBe(new URL(url).pathname);

    // Content is only kept alongside a valid campaign — if one is written, it must arrive.
    if (q.get("utm_content")) expect(bag.kx_content).toBe(q.get("utm_content"));
  });

  it("uses a different campaign id per campaign, so the two never merge in reporting", () => {
    const ids = new Set(links.map((l) => new URL(l).searchParams.get("utm_campaign")));
    expect(ids.size).toBeGreaterThanOrEqual(2);
    expect(ids).toContain("kx_parity_proof");
    expect(ids).toContain("kx_count_isnt_coverage");
  });

  it("points every campaign link at a real page on our own site", () => {
    for (const l of links) {
      expect(new URL(l).hostname).toBe(new URL(siteConfig.url).hostname);
      expect(new URL(l).pathname).toBe("/docs/platforms");
    }
  });
});

describe("every utm_content slug a campaign plans to use is accepted", () => {
  // a02 documents most variants as "same with utm_content=…" rather than a full URL, so the slugs are
  // collected separately and each is checked on a synthetic link. A slug the parser rejects is dropped
  // in silence, which merges that post's traffic into the campaign's unlabelled bucket.
  const slugs = [...new Set([...A02.join("\n").matchAll(/utm_content=([a-z0-9_-]+)/g)].map((m) => m[1]))];

  it("collected the a02 variant slugs", () => {
    expect(slugs).toEqual(expect.arrayContaining(["li_primary", "li_alt", "x_thread", "x_numbers", "x_principle", "x_checklist", "x_buildlog"]));
  });

  it.each(slugs)("utm_content=%s reaches PostHog intact", (slug) => {
    const bag = propsFor(
      `https://kinetixui.com/docs/platforms?utm_source=x&utm_medium=social&utm_campaign=kx_count_isnt_coverage&utm_content=${slug}`,
    );
    expect(bag.kx_content).toBe(slug);
  });
});

describe("the failures each campaign's measurement notes warn about are real", () => {
  // Both packages tell the operator that an untagged campaign is discarded without an error. If that ever
  // stopped being true the warning would be folklore, and the checklist's STOP GATE would be guarding
  // nothing. These assert the documented failure, not the success.
  it("drops a campaign id that does not carry the kx_ prefix, with no key at all", () => {
    const bag = propsFor("https://kinetixui.com/docs/platforms?utm_source=linkedin&utm_medium=social&utm_campaign=parity-proof");
    expect(bag).not.toHaveProperty("kx_campaign");
    expect(bag.kx_source).toBe("linkedin");
  });

  it("ignores a medium outside the closed list and infers one from the source instead", () => {
    const bag = propsFor("https://kinetixui.com/docs/platforms?utm_source=devto&utm_medium=article&utm_campaign=kx_parity_proof");
    expect(bag.kx_medium).not.toBe("article");
    expect(ATTRIBUTION_MEDIUMS).toContain(bag.kx_medium);
  });

  it("drops content when the campaign it travels with is invalid", () => {
    const bag = propsFor("https://kinetixui.com/docs/platforms?utm_source=x&utm_medium=social&utm_campaign=count-isnt-coverage&utm_content=x_thread");
    expect(bag).not.toHaveProperty("kx_campaign");
    expect(bag).not.toHaveProperty("kx_content");
  });
});
