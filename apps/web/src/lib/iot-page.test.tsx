import { readFileSync } from "node:fs";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import IotPage, { metadata } from "../app/iot/page";
import {
  KINETIX_COMMAND_LIFECYCLE_STAGES,
  KINETIX_DEVICE_CATEGORIES,
  KINETIX_METRIC_IDS,
  KINETIX_PAIRING_FAILURES,
  KINETIX_PAIRING_METHODS,
  KINETIX_PAIRING_STAGES,
} from "@kinetixui/iot/functions";
import { IOT_CATALOGUE, IOT_CATEGORIES, IOT_ENVIRONMENTS, IOT_PAGE_EXAMPLES, IOT_PART_LAYER } from "./iot";
import { IOT_EXAMPLES } from "./iot-examples";
import { SIMULATION_DISCLOSURE } from "./iot-sim/labels";

// <Reveal> and <LazyPreview> observe with IntersectionObserver, which jsdom does not implement. The stub
// records its observers so a test can say "this element scrolled near the viewport".
const observers = new Set<{ target?: Element; callback: IntersectionObserverCallback }>();
vi.stubGlobal(
  "IntersectionObserver",
  class {
    entry: { target?: Element; callback: IntersectionObserverCallback };
    constructor(callback: IntersectionObserverCallback) {
      this.entry = { callback };
      observers.add(this.entry);
    }
    observe(target: Element) {
      this.entry.target = target;
    }
    disconnect() {
      observers.delete(this.entry);
    }
    unobserve() {}
  },
);
/** Report every observed element matching `selector` as intersecting. */
function intersect(selector: string) {
  act(() => {
    for (const o of [...observers]) {
      if (o.target?.matches(selector)) o.callback([{ isIntersecting: true, target: o.target } as IntersectionObserverEntry], {} as IntersectionObserver);
    }
  });
}

/**
 * How long a test waits for a lazy preview to replace its placeholder. Mounting one is a real dynamic `import()`
 * of the example's module graph, which Vitest transforms on first use: 0.3–0.9 s alone, but 1.5–2.4 s while
 * `turbo run test` runs every package's suite at once, past Testing Library's 1 s default. The wait still polls
 * and resolves the moment the example is there; this only bounds how long a preview that never mounts can take
 * to fail. Tests that use it raise their own timeout to LAZY_MOUNT_TEST_TIMEOUT so the wait, not Vitest's 5 s
 * test timeout, reports the failure.
 */
const LAZY_MOUNT_TIMEOUT = 5_000;
const LAZY_MOUNT_TEST_TIMEOUT = 10_000;

/**
 * The /iot page against its own claims. `current-truth.test.ts` polices what the page must never say; this file
 * asserts what it does say, and that the structure a keyboard or screen-reader user relies on is there.
 */
// Vitest runs with apps/web as the root.
const read = (path: string) => readFileSync(path, "utf8");
const pageSource = read("src/app/iot/page.tsx");
const boundarySource = read("src/components/iot/module-boundary.tsx");
const docsSource = read("src/app/docs/iot/page.mdx");
const LAB_FILES = [
  "src/components/iot/lab/lab-section.tsx",
  "src/components/iot/lab/lab-tabs.tsx",
  "src/components/iot/lab/hero-command-strip.tsx",
];
const SURFACES: Record<string, string> = {
  "app/iot/page.tsx": pageSource,
  "components/iot/module-boundary.tsx": boundarySource,
  "docs/iot": docsSource,
  ...Object.fromEntries(LAB_FILES.map((f) => [f.replace("src/", ""), read(f)])),
};

/* ------------------------------------------------------------------ counts come from the barrel */

const barrel = read("../../packages/iot/src/react/index.ts");
function layer(name: string): string[] {
  const start = barrel.indexOf(`${name} */`);
  expect(start, `no "${name}" section in the react barrel`).toBeGreaterThan(-1);
  const rest = barrel.slice(start);
  const end = rest.indexOf("/* --", 1);
  return [...(end === -1 ? rest : rest.slice(0, end)).matchAll(/^export \{ (\w+),/gm)].map((m) => m[1]!);
}

describe("/iot: what it counts", () => {
  it("states the component counts the React barrel actually has", () => {
    expect(IOT_CATALOGUE.primitives).toBe(layer("primitives").length);
    expect(IOT_CATALOGUE.controls).toBe(layer("controls").length);
    expect(IOT_CATALOGUE.patterns).toBe(layer("patterns").length);
  });

  it("never types a component count into the page or the docs — it reads IOT_CATALOGUE", () => {
    expect(pageSource).toMatch(/IOT_CATALOGUE\.patterns/);
    expect(pageSource).not.toMatch(/\b(eight|twenty-seven|27)\s+(primitives|patterns|components)/i);
  });
});

describe("/docs/iot: what it counts", () => {
  const flat = docsSource.replace(/\s+/g, " ");

  it("states the component counts the React barrel has", () => {
    expect(flat).toContain(`${IOT_CATALOGUE.primitives} React primitives, ${IOT_CATALOGUE.controls} device controls and ${IOT_CATALOGUE.patterns} patterns`);
    expect(flat).toContain(`${IOT_CATALOGUE.patterns} compositions`);
  });

  it("states the registry and machine sizes the package has", () => {
    expect(flat).toContain(`The ${KINETIX_DEVICE_CATEGORIES.length} categories`);
    expect(flat).toContain(`It holds ${KINETIX_METRIC_IDS.length} metrics`);
    expect(flat).toContain(`${Object.keys(KINETIX_PAIRING_FAILURES).length === 13 ? "Thirteen" : "??"} failures are described once`);
    expect(flat).toContain(`${KINETIX_PAIRING_STAGES.length === 7 ? "seven" : "??"} **stages**`);
    expect(flat).toContain(`${KINETIX_PAIRING_METHODS.length === 5 ? "five" : "??"} **methods**`);
    expect(flat).toContain(`${KINETIX_COMMAND_LIFECYCLE_STAGES.length === 9 ? "nine" : "??"} stages: \`idle\``);
  });

  it("documents the transport boundary under an anchor the overview links to", () => {
    expect(docsSource).toMatch(/^## Transport boundary$/m);
    expect(pageSource).toContain("/docs/iot#transport-boundary");
    expect(docsSource).toContain("**KinetixUI does not own the transport.**");
  });

  it("carries the command example the overview describes, in order", () => {
    const at = (needle: string) => docsSource.indexOf(needle);
    const order = ["// OFF", "// TURNING ON", "// TIMEOUT", "// UNREACHABLE", "// RETRY"].map(at);
    for (const i of order) expect(i).toBeGreaterThan(-1);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

/* ------------------------------------------------------------------ every slug is a real example */

describe("/iot: examples", () => {
  const manifestSlugs = IOT_EXAMPLES.map((e) => e.slug);
  const pageSlugs = [
    ...IOT_ENVIRONMENTS.map((e) => e.slug),
    IOT_PAGE_EXAMPLES.stateHonesty,
    IOT_PAGE_EXAMPLES.telemetry,
    IOT_PAGE_EXAMPLES.alerts,
    IOT_PAGE_EXAMPLES.automation,
    IOT_PAGE_EXAMPLES.pairing,
    IOT_PAGE_EXAMPLES.deviceDetail,
    ...IOT_PAGE_EXAMPLES.layouts.map((l) => l.slug),
  ];

  it("only references examples that exist in the manifest, so no tab or section renders empty", () => {
    for (const slug of pageSlugs) expect(manifestSlugs, `"${slug}" is on the page but not in iot-examples.manifest.json`).toContain(slug);
  });

  it("renders every manifest example somewhere, so none is published and then forgotten", () => {
    for (const slug of manifestSlugs) expect(pageSlugs, `"${slug}" is in the manifest but the page never renders it`).toContain(slug);
  });
});

/* ------------------------------------------------------------------ structure */

describe("/iot: structure", () => {
  it("has exactly one h1, and it says the thing", () => {
    render(<IotPage />);
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Build connected products that tell the truth about device state.");
  });

  it("never skips a heading level", () => {
    const { container } = render(<IotPage />);
    const levels = [...container.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => Number(h.tagName[1]));
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]!, `heading #${i} jumps from h${levels[i - 1]} to h${levels[i]}`).toBeLessThanOrEqual(levels[i - 1]! + 1);
    }
  });

  it("names every section as a landmark by its own heading", () => {
    const { container } = render(<IotPage />);
    const sections = [...container.querySelectorAll("section[aria-labelledby]")];
    // Eight top-level sections since the categories moved into the explorer, plus the hero and the closer.
    expect(sections.length).toBeGreaterThanOrEqual(10);
    for (const section of sections) {
      const id = section.getAttribute("aria-labelledby")!;
      const heading = section.querySelector(`#${id}`);
      expect(heading, `section labelled by #${id} has no such heading`).not.toBeNull();
      expect(heading!.textContent!.trim().length).toBeGreaterThan(0);
    }
  });

  it("links the on-page contents to real sections", () => {
    const { container } = render(<IotPage />);
    const nav = screen.getByRole("navigation", { name: "On this page" });
    const links = within(nav).getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(8);
    for (const link of links) {
      const id = link.getAttribute("href")!.slice(1);
      expect(container.querySelector(`section#${id}`), `contents links to #${id}, which is not a section`).not.toBeNull();
    }
  });

  it("names its scroll region and makes it reachable by keyboard", () => {
    render(<IotPage />);
    // It lives in the Monitoring category, which is a hidden tab panel until chosen.
    const region = screen.getByRole("region", { name: "Missing device data, compared", hidden: true });
    expect(region).toHaveAttribute("tabindex", "0");
  });

  it("uses no physical left/right utilities in the new page chrome", () => {
    for (const [name, text] of Object.entries(SURFACES)) {
      if (name === "docs/iot") continue;
      expect(text, `${name} uses a physical direction utility`).not.toMatch(/["'\s](ml|mr|pl|pr|left|right|text-left|text-right)-(?:\d|\[|auto|px)/);
    }
  });
});

/* ------------------------------------------------------------------ explore by task */

describe("/iot: explore by task", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("puts every exported React component in exactly one category, and nothing else", () => {
    const exported = [...layer("primitives"), ...layer("controls"), ...layer("patterns")].sort();
    const listed = IOT_CATEGORIES.flatMap((c) => c.parts);
    expect([...listed].sort()).toEqual(exported);
    expect(new Set(listed).size, "a part appears in two categories").toBe(listed.length);
  });

  it("labels each part with the barrel layer it really comes from", () => {
    for (const name of layer("primitives")) expect(IOT_PART_LAYER[name], name).toBe("primitive");
    for (const name of layer("controls")) expect(IOT_PART_LAYER[name], name).toBe("control");
    for (const name of layer("patterns")) expect(IOT_PART_LAYER[name], name).toBeUndefined();
  });

  it("offers the categories as tabs in a sticky bar, with one panel visible and every panel server-rendered", () => {
    const { container } = render(<IotPage />);
    const list = screen.getByRole("tablist", { name: "IoT category" });
    const tabs = within(list).getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(IOT_CATEGORIES.map((c) => c.tab));
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(container.querySelector("[data-category-bar]")!.className).toMatch(/\bsticky\b/);
    const panels = [...container.querySelectorAll("[data-category-panel]")];
    expect(panels.map((p) => p.getAttribute("data-category-panel"))).toEqual(IOT_CATEGORIES.map((c) => c.id));
    expect(panels.filter((p) => !p.hasAttribute("hidden"))).toHaveLength(1);
  });

  it("points every tab at its own panel, so aria-controls and aria-labelledby resolve", () => {
    const { container } = render(<IotPage />);
    const tabs = [...container.querySelectorAll<HTMLElement>("[data-category-tab]")];
    expect(tabs.length).toBe(IOT_CATEGORIES.length);
    for (const tab of tabs) {
      const panel = document.getElementById(tab.getAttribute("aria-controls") ?? "");
      expect(panel, `${tab.textContent}: aria-controls names no element`).not.toBeNull();
      expect(panel!.getAttribute("role")).toBe("tabpanel");
      expect(panel!.getAttribute("aria-labelledby")).toBe(tab.id);
    }
  });

  it("gives every category the same order: problem, parts, the way to the reference, then an example", () => {
    const { container } = render(<IotPage />);
    for (const category of IOT_CATEGORIES) {
      const panel = container.querySelector(`[data-category-panel="${category.id}"]`)!;
      expect(panel.querySelector("h3"), `${category.id} has no heading`).not.toBeNull();
      const parts = panel.querySelector(`aside[aria-label="${category.label}: parts"]`)!;
      for (const name of category.parts) expect(parts.textContent, `${category.id} does not list ${name}`).toContain(name);
      expect(parts.querySelector(`a[href="${category.docs}"]`), `${category.id} does not link the reference`).not.toBeNull();
      expect([...panel.querySelectorAll("h4")].map((h) => h.textContent)).toContain("Try it");
    }
  });

  it("switches category in place and records it in the URL without adding history", async () => {
    const user = userEvent.setup();
    const { container } = render(<IotPage />);
    const before = window.history.length;
    await user.click(screen.getByRole("tab", { name: "Setup" }));
    expect(screen.getByRole("tab", { name: "Setup" })).toHaveAttribute("aria-selected", "true");
    expect(container.querySelector('[data-category-panel="setup"]')).not.toHaveAttribute("hidden");
    expect(container.querySelector('[data-category-panel="control"]')).toHaveAttribute("hidden");
    expect(window.location.hash).toBe("#setup");
    expect(window.history.length).toBe(before);
  });

  it("moves between categories from the keyboard", async () => {
    const user = userEvent.setup();
    render(<IotPage />);
    screen.getByRole("tab", { name: "Control" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Monitoring" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Monitoring" })).toHaveAttribute("aria-selected", "true");
  });

  it.each([
    ["#automation", "Automation"],
    ["#pairing", "Setup"],
    ["#telemetry", "Monitoring"],
    ["#layout-dashboard", "Fleets"],
  ])("opens the right category for %s, including the anchors this content used to have", async (hash, label) => {
    window.location.hash = hash;
    render(<IotPage />);
    expect(await screen.findByRole("tab", { name: label, selected: true })).toBeInTheDocument();
    window.location.hash = "";
  });
});

/* ------------------------------------------------------------------ hero and metadata */

describe("/iot: hero and metadata", () => {
  it("says what the module is not, above the fold", () => {
    render(<IotPage />);
    const hero = document.getElementById("iot-title")!.closest("section")!;
    const text = hero.textContent!;
    expect(text).toMatch(/React only, and experimental/);
    expect(text).toMatch(/no transport, no automation engine\s+and no video/);
    expect(text).toMatch(/simulation/i);
  });

  it("labels the hero device as a simulation and discloses it", () => {
    render(<IotPage />);
    const hero = document.getElementById("iot-title")!.closest("section")!;
    expect(within(hero).getByText("Simulation")).toBeInTheDocument();
    expect(hero.textContent).toContain(SIMULATION_DISCLOSURE);
  });

  it("keeps the canonical URL and describes the new truth", () => {
    expect(metadata.alternates?.canonical).toBe("/iot");
    expect(String(metadata.description)).toMatch(/React-only/);
    expect(String(metadata.description)).toMatch(/no transport/);
    expect(String(metadata.openGraph?.url)).toBe("/iot");
    expect(String((metadata.twitter as { title?: string }).title)).toMatch(/tell the truth about device state/);
  });
});

/* ------------------------------------------------------------------ environments */

describe("/iot: reference environments", () => {
  // Choosing a tab rewrites the hash, and the next render would read it back.
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("offers three environments as accessible tabs, one rendered at a time", () => {
    render(<IotPage />);
    const tabs = within(screen.getByRole("tablist", { name: "Reference environment" })).getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Smart space", "Agritech", "Operations"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    // Radix does not mount an inactive panel: the other two are not in the DOM.
    expect(document.querySelectorAll('[role="tabpanel"][data-state="active"]').length).toBeGreaterThanOrEqual(1);
  });

  it("carries the SIMULATION disclosure in every environment, not just the first", async () => {
    const user = userEvent.setup();
    render(<IotPage />);
    const list = screen.getByRole("tablist", { name: "Reference environment" });
    for (const env of IOT_ENVIRONMENTS) {
      await user.click(within(list).getByRole("tab", { name: env.label }));
      const panel = screen.getByRole("tabpanel", { name: env.label });
      // One disclosure per environment, and it is the example's own: the panel header does not repeat it.
      const disclosures = panel.querySelectorAll("[data-simulation-notice], [data-simulation-disclosure]");
      expect(disclosures, `${env.label} should carry exactly one simulation disclosure`).toHaveLength(1);
      expect(disclosures[0]!.textContent).toMatch(/Simulated/);
      expect(disclosures[0]!.textContent).toContain("no device is contacted");
      expect(SIMULATION_DISCLOSURE).toContain("no device is contacted");
    }
  });

  it("mounts the environment's real example only when it nears the viewport, replacing the placeholder", async () => {
    render(<IotPage />);
    const panel = screen.getByRole("tabpanel", { name: "Smart space" });
    // Before it is near: the server-rendered placeholder, hidden from assistive technology, and its notice.
    expect(panel.querySelector("[data-preview-placeholder]")).toHaveAttribute("aria-hidden", "true");
    expect(within(panel).queryByRole("switch")).toBeNull();
    intersect('[data-lazy-preview="smart-space-environment"]');
    await waitFor(() => expect(panel.querySelector("[data-preview-placeholder]")).toBeNull(), { timeout: LAZY_MOUNT_TIMEOUT });
    expect(panel.querySelector('[data-lazy-preview="smart-space-environment"]')).toHaveAttribute("data-mounted");
    // Still exactly one disclosure once the example has replaced the placeholder.
    expect(panel.querySelectorAll("[data-simulation-notice]")).toHaveLength(1);
  }, LAZY_MOUNT_TEST_TIMEOUT);

  it("does not render the same disclosure in the panel header as well as in the example", () => {
    render(<IotPage />);
    const panel = screen.getByRole("tabpanel", { name: "Smart space" });
    expect(panel.querySelector("[data-simulation-disclosure]")).toBeNull();
  });

  it("selects an environment from the URL hash, and opens the disclosure it sits in", async () => {
    window.location.hash = "#agritech";
    render(<IotPage />);
    const list = screen.getByRole("tablist", { name: "Reference environment" });
    expect(await within(list).findByRole("tab", { name: "Agritech" })).toHaveAttribute("aria-selected", "true");
    expect(list.closest("details")).toHaveProperty("open", true);
    window.location.hash = "";
  });

  /*
   * Phase 3D. Before: the section opened straight into a whole environment (4,403px at 1280, 4.9 screens), so the
   * explorer started 5.9 screens down. Now it says why the package spans domains first (the three questions, the
   * three environments and their place hierarchies), and operating one is a closed disclosure.
   */
  it("answers why the package spans environments without operating one", () => {
    render(<IotPage />);
    const section = document.getElementById("environments")!;
    const questions = within(section).getByRole("list", { name: "The questions every environment asks" });
    expect(within(questions).getAllByRole("listitem").map((li) => li.querySelector("p")!.textContent)).toEqual([
      "What did I ask for?",
      "What did the device confirm?",
      "How much should I trust this number?",
    ]);
    const cards = within(within(section).getByRole("list", { name: "Reference environments" })).getAllByRole("listitem");
    expect(cards).toHaveLength(IOT_ENVIRONMENTS.length);
    IOT_ENVIRONMENTS.forEach((env, i) => {
      expect(within(cards[i]!).getByRole("heading", { level: 3 })).toHaveTextContent(env.label);
      expect(cards[i]).toHaveTextContent(env.hierarchy);
      expect(cards[i]).toHaveTextContent(env.summary);
    });
    // The simulation disclosure is said before anything can be operated, not only inside the examples.
    expect(section.textContent).toMatch(/fabricated and scripted in your browser\. Nothing is measured, and no device is\s+contacted/);
  });

  it("keeps the operable environments behind one closed disclosure, before the explorer", () => {
    render(<IotPage />);
    const section = document.getElementById("environments")!;
    // The examples carry their own "Built from" disclosures; the section's own is the outermost one.
    const disclosures = [...section.querySelectorAll("details")].filter((d) => !d.parentElement!.closest("details"));
    expect(disclosures).toHaveLength(1);
    expect(disclosures[0]).toHaveProperty("open", false);
    expect(disclosures[0]!.querySelector("summary")).toHaveTextContent("Operate an environment");
    expect(within(disclosures[0] as HTMLElement).getByRole("tablist", { name: "Reference environment" })).toBeInTheDocument();
    // Still a section of its own, and still ahead of the explorer: not a second navigation system.
    expect(section.compareDocumentPosition(document.getElementById("explore")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect([...section.querySelectorAll('[role="tablist"]')].filter((list) => !list.closest("details"))).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ lazy previews */

describe("/iot: interactive examples load on demand", () => {
  const LAZY = [IOT_PAGE_EXAMPLES.stateHonesty, IOT_PAGE_EXAMPLES.telemetry, IOT_PAGE_EXAMPLES.alerts, IOT_PAGE_EXAMPLES.automation, IOT_PAGE_EXAMPLES.pairing, IOT_PAGE_EXAMPLES.deviceDetail];

  it("renders every section's example with its title, code and a placeholder before anything intersects", () => {
    const { container } = render(<IotPage />);
    for (const slug of LAZY) {
      const wrapper = container.querySelector(`[data-lazy-preview="${slug}"]`);
      expect(wrapper, `${slug} has no lazy preview wrapper`).not.toBeNull();
      expect(wrapper!.querySelector("[data-preview-placeholder]"), `${slug} placeholder`).not.toBeNull();
      expect(wrapper!.hasAttribute("data-mounted")).toBe(false);
      const example = IOT_EXAMPLES.find((e) => e.slug === slug)!;
      // The source is server-rendered and in the DOM whether or not the preview has mounted.
      expect(container.textContent).toContain(example.title);
      expect(container.textContent).toContain(example.path);
    }
    // Nothing interactive has been mounted for the sections below the fold.
    expect(screen.queryByRole("tablist", { name: /Pump 01 sections|sections$/ })).toBeNull();
  });

  it("mounts a section's real example when it nears the viewport", async () => {
    const { container } = render(<IotPage />);
    intersect('[data-lazy-preview="device-detail"]');
    expect(await screen.findByRole("article", { name: "Pump Station detail" }, { timeout: LAZY_MOUNT_TIMEOUT })).toBeInTheDocument();
    expect(container.querySelector('[data-lazy-preview="device-detail"] [data-preview-placeholder]')).toBeNull();
    // A neighbour that has not intersected stays a placeholder.
    expect(container.querySelector('[data-lazy-preview="pairing-flow"] [data-preview-placeholder]')).not.toBeNull();
  }, LAZY_MOUNT_TEST_TIMEOUT);

  it("keeps the placeholder out of the accessibility tree and free of animation", () => {
    const { container } = render(<IotPage />);
    for (const el of container.querySelectorAll("[data-preview-placeholder]")) {
      expect(el).toHaveAttribute("aria-hidden", "true");
      expect(el.className).not.toMatch(/animate-/);
      expect(el.textContent).toBe("");
    }
  });
});

/* ------------------------------------------------------------------ the diagram */

describe("/iot: architecture diagram", () => {
  it("is a named figure with an ordered list and a labelled provider list", () => {
    render(<IotPage />);
    const figure = screen.getByRole("figure", { name: /Where KinetixUI IoT sits/ });
    expect(within(figure).getAllByRole("listitem").length).toBeGreaterThanOrEqual(5);
    const providers = within(figure).getByRole("list", { name: /transports and providers your application might use/i });
    for (const name of ["MQTT", "BLE", "Matter", "REST", "WebSocket", "Vendor SDK", "Cloud service"]) {
      expect(within(providers).getByText(name)).toBeInTheDocument();
    }
  });

  it("states the boundary in words, not only in the drawing", () => {
    render(<IotPage />);
    const figure = screen.getByRole("figure", { name: /Where KinetixUI IoT sits/ });
    expect(figure.textContent).toContain("KinetixUI does not own the transport");
    expect(figure.textContent).toMatch(/Application adapter/);
    expect(figure.textContent).toMatch(/examples of what your application might use; KinetixUI ships none of them/);
  });
});

/* ------------------------------------------------------------------ claims */

/**
 * Sentence-scoped, with the denial required in the same sentence. This is the affirmative-pattern scan the brief
 * asks for: it does not ban the words (the page has to be able to say "no MQTT client"), it bans the words
 * used as a claim of support.
 */
function sentences(text: string): string[] {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/[{}`*]/g, " ")
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}
const NEGATED = /\b(no|not|never|nothing|without|none|neither|nor|cannot|does not|doesn't|isn't|are not)\b/i;

describe("/iot: no unsupported claims", () => {
  it("mentions no wearable, watch platform, or 'coming soon' anywhere on the page, its chrome or the docs", () => {
    const banned = /Apple Watch|watchOS|Wear OS|smartwatch|wearables?|coming soon/i;
    for (const [name, text] of Object.entries(SURFACES)) {
      expect(banned.exec(text)?.[0], `${name} mentions something banned`).toBeUndefined();
    }
  });

  it("never claims a transport or protocol is supported, outside a sentence that denies it", () => {
    const protocol = "(MQTT|BLE|Bluetooth|Matter|Zigbee|Thread|WebSocket|LoRaWAN|Modbus|REST|HTTP)";
    const claim = new RegExp(
      `\\b${protocol}\\s+(support|integration|adapter|client|bridge|connector|gateway)\\b|\\b(supports?|works with|integrates with|connects to|speaks|built-in|native)\\s+(\\w+\\s+){0,3}${protocol}\\b`,
      "i",
    );
    for (const [name, text] of Object.entries(SURFACES)) {
      for (const sentence of sentences(text)) {
        if (!claim.test(sentence)) continue;
        expect(NEGATED.test(sentence), `${name}: "${sentence}" reads as a support claim`).toBe(true);
      }
    }
  });

  it("never says it works with every device, and uses none of the banned superlatives", () => {
    for (const [name, text] of Object.entries(SURFACES)) {
      expect(text, name).not.toMatch(/next-generation|revolutionary|works with (every|any|all) device/i);
    }
  });

  it("never implies an automation engine, video, or a native platform exists", () => {
    for (const [name, text] of Object.entries(SURFACES)) {
      for (const sentence of sentences(text)) {
        if (/automation engine|\bvideo\b|live feed|SwiftUI|Jetpack Compose|Flutter|Angular/i.test(sentence)) {
          expect(NEGATED.test(sentence) || /\bonly\b/i.test(sentence), `${name}: "${sentence}" names something the module does not have without denying it`).toBe(true);
        }
      }
    }
  });
});
