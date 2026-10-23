import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RegistryTreemap } from "./registry-treemap";
import { CATEGORY_COUNT } from "@/lib/component-taxonomy";
import { componentDocs } from "@/lib/site";
import taxonomyData from "../../../../../component-taxonomy.json";

/**
 * The treemap's `aria-label` is the whole chart for a reader who cannot see it, and it names the two largest
 * groups. Those two names were retyped, so CAT-2's rename left the description naming `Form Inputs` — a
 * category the chart had stopped drawing. These assertions read the taxonomy rather than a fixed sentence, so a
 * later rename, or a category overtaking another, moves the expectation with them.
 */
describe("the registry treemap's text alternative", () => {
  const byCount = Object.entries(CATEGORY_COUNT).sort((a, b) => b[1] - a[1]);
  const labelOf = () => {
    render(<RegistryTreemap />);
    return screen.getByRole("img").getAttribute("aria-label") ?? "";
  };

  it("names the two largest categories, as the taxonomy counts them", () => {
    const label = labelOf();
    expect(label).toContain(`The ${componentDocs.length} catalogue entries by category`);
    expect(label).toContain(`${byCount[0][0]} and ${byCount[1][0]} are the largest groups`);
  });

  it("names no label the taxonomy has retired", () => {
    const label = labelOf();
    // the labels a `?cat=` link may still carry: the set that reads as current and is not
    const retired = Object.values(taxonomyData.categories).flatMap((c) => ("formerly" in c ? c.formerly : []));
    expect(retired.length).toBeGreaterThan(0);
    for (const former of retired) expect(label).not.toContain(former);
  });
});
