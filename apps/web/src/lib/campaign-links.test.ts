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
    expect(ids).toContain("kx_p1_a_parity_proof");
    expect(ids).toContain("kx_p1_a_count_isnt_coverage");
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

describe("the ART-001 → pillar post-publication link (SEO Phase 3)", () => {
  // Read from the runbook the operator follows and from the register row, so the two cannot drift apart and the
  // link is proved against the parser before anyone pastes it into dev.to.
  const runbook = readFileSync(`${ROOT}/marketing/seo/GUIDE-PUBLISH-RUNBOOK.md`, "utf8");
  const links = taggedLinks([runbook]);
  const register = JSON.parse(readFileSync(`${ROOT}/marketing/content/register.json`, "utf8")) as {
    assets: { id: string; url?: string; campaign?: string; utm_content?: string }[];
  };
  const row = register.assets.find((a) => a.id === "ART-001-PILLAR");

  it("is the one tagged link in the runbook, and the register carries it byte for byte", () => {
    expect(links).toHaveLength(1);
    expect(row?.url).toBe(links[0]);
  });

  it("keeps ART-001's campaign, tells itself apart with utm_content, and lands on the pillar", () => {
    const bag = propsFor(links[0]);
    expect(bag.kx_campaign).toBe("kx_p1_a_parity_proof");
    expect(bag.kx_content).toBe("art_pillar");
    expect(bag.kx_source).toBe("devto");
    expect(bag.kx_medium).toBe("referral");
    expect(bag.kx_landing_page).toBe("/guides/cross-platform-design-systems");
  });
});

describe("every tagged link in the content register survives the parser (M2)", () => {
  // The register is what the operator pastes from. check:content validates its names against the runtime's
  // vocabularies; this runs each built URL through the parser itself, so a link the runtime would rewrite or drop
  // fails here, before anything is posted.
  const register = JSON.parse(readFileSync(`${ROOT}/marketing/content/register.json`, "utf8")) as {
    assets: { id: string; url?: string; campaign?: string; utm_content?: string }[];
  };
  const rows = register.assets.filter((a) => a.url).map((a) => [a.id, a] as const);

  it("finds the register's links rather than checking nothing", () => {
    expect(rows.length).toBeGreaterThanOrEqual(20);
  });

  it.each(rows)("%s keeps campaign, content, source and medium exactly as built", (_id, asset) => {
    const bag = propsFor(asset.url!);
    const q = new URL(asset.url!).searchParams;
    expect(bag.kx_campaign).toBe(asset.campaign);
    expect(bag.kx_content).toBe(asset.utm_content);
    expect(bag.kx_source).toBe(q.get("utm_source"));
    expect(bag.kx_medium).toBe(q.get("utm_medium"));
  });

  it("LI-001, the next post out, arrives as linkedin / social / kx_p1_a_parity_proof / li_primary", () => {
    const li001 = register.assets.find((a) => a.id === "LI-001")!;
    expect(propsFor(li001.url!)).toMatchObject({
      kx_source: "linkedin",
      kx_medium: "social",
      kx_campaign: "kx_p1_a_parity_proof",
      kx_content: "li_primary",
      kx_landing_page: "/docs/platforms",
    });
  });

  it("negative control: a wrong medium or a mistyped campaign on LI-001's link would not arrive as built", () => {
    const li001 = new URL(register.assets.find((a) => a.id === "LI-001")!.url!);
    const wrongMedium = new URL(li001);
    wrongMedium.searchParams.set("utm_medium", "article");
    expect(propsFor(wrongMedium.href).kx_medium).not.toBe("article");
    const typo = new URL(li001);
    typo.searchParams.set("utm_campaign", "kx-p1-a-parity-proof"); // hyphens after kx: fails the runtime pattern
    expect(propsFor(typo.href)).not.toHaveProperty("kx_campaign");
    expect(propsFor(typo.href)).not.toHaveProperty("kx_content");
  });
});
