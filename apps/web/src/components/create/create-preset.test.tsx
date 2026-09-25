import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CREATE_CONFIG } from "@/lib/create/config";
import { decodeIntoConfig, encodeConfig } from "@/lib/create/preset";
import { resolveTheme } from "@/lib/create/theme-adapter";
import { CreateWorkspace } from "./create-workspace";

/**
 * Sharing, loading, randomizing and resetting — as a person does them.
 *
 * The codec has its own tests; these are about the workspace honouring it: that a link carries the design
 * and not the viewer's mode, that a bad link does not take the page down with it, and that the URL is a
 * share artifact rather than something that grows a history entry per slider pixel.
 */

const sidebar = () => screen.getByRole("complementary", { name: "Configuration" });
const previewRoot = () => document.querySelector("[data-create-preview-root]") as HTMLElement;
const varOf = (token: string) => previewRoot().style.getPropertyValue(token);
const actions = () => screen.getByRole("group", { name: "Workspace actions" });
const action = (name: RegExp | string) => within(actions()).getByRole("button", { name });
const presetBanner = () => document.querySelector("[data-preset-status]") as HTMLElement | null;

let clipboard: string[];

function setup(writeText: (text: string) => Promise<void> = async (t) => void clipboard.push(t)) {
  const user = userEvent.setup();
  setClipboard(writeText);
  return user;
}

function setClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn(writeText) },
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  clipboard = [];
  // defineProperty, not Object.assign: jsdom exposes navigator.clipboard through a getter only, so an
  // assignment throws — and it throws inside beforeEach, which fails the test before it starts.
  setClipboard((text: string) => {
    clipboard.push(text);
    return Promise.resolve();
  });
  window.history.replaceState({}, "", "/create");
});

afterEach(() => {
  window.history.replaceState({}, "", "/create");
  vi.restoreAllMocks();
});

/** Put a preset in the address bar before mounting, the way a shared link arrives. */
function openWith(code: string) {
  window.history.replaceState({}, "", `/create?preset=${code}`);
  return render(<CreateWorkspace />);
}

/* ------------------------------------------------------------------ loading */

describe("opening a shared link", () => {
  it("restores the design and says so, without a modal", () => {
    const shared = { ...DEFAULT_CREATE_CONFIG, brand: "#c2410c", neutral: "warm" as const, radius: "soft" as const };
    openWith(encodeConfig(shared));

    expect(presetBanner()).toHaveAttribute("data-preset-status", "loaded");
    expect(presetBanner()).toHaveAttribute("role", "status");
    expect(presetBanner()!.textContent).toMatch(/Loaded a shared preset/);
    expect(within(sidebar()).getByRole("radio", { name: "Warm neutral" })).toBeChecked();
    expect(within(sidebar()).getByRole("radio", { name: "Soft radius" })).toBeChecked();
    expect(varOf("--radius-md")).toBe("20px");
  });

  it("resolves to exactly the theme the sender saw", () => {
    // The claim that matters: the link reproduces the design, not merely the form fields.
    const shared = { ...DEFAULT_CREATE_CONFIG, brand: "#7e22ce", neutral: "cool" as const, surface: "elevated" as const };
    openWith(encodeConfig(shared));

    const expected = resolveTheme(shared);
    expect(varOf("--action")).toBe(expected.style["--action"]);
    expect(varOf("--shadow-sm")).toBe(expected.style["--shadow-sm"]);
  });

  it("keeps the opener's own appearance rather than the sender's", () => {
    // `mode` is not in the preset. Someone sharing a link they happened to be viewing in dark mode
    // should not flip the recipient's workspace.
    const sharedFromDark = { ...DEFAULT_CREATE_CONFIG, mode: "dark" as const, brand: "#c2410c" };
    openWith(encodeConfig(sharedFromDark));

    expect(previewRoot().className).toContain("theme-light");
    expect(within(sidebar()).getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");
  });

  it("carries manual overrides, failing ones included", () => {
    const shared = { ...DEFAULT_CREATE_CONFIG, manualOverrides: { card: "#ffffff", "card-foreground": "#c9c9c9" } };
    openWith(encodeConfig(shared));

    expect(varOf("--card-foreground")).toBe("0 0% 79%");
    // Decoding must not quietly repair a choice the sender made — it is reported, as PR 2 established.
    expect(within(sidebar()).getByText(/do not\./)).toBeTruthy();
  });
});

describe("a link that cannot be read", () => {
  it.each([
    ["nonsense", "KX1_!!!!"],
    ["an unknown version", "KX9_eyJ2Ijo5fQ"],
    ["a bad colour", "KX1_eyJ2IjoxLCJicmFuZCI6InJlZCJ9"],
  ])("%s explains itself and falls back to the default", (_name, code) => {
    openWith(code);

    const banner = presetBanner()!;
    expect(banner).toHaveAttribute("data-preset-status", "error");
    expect(banner).toHaveAttribute("role", "alert");
    expect(banner.textContent).toMatch(/could not be read/);
    // Create still works: the default theme is rendered and every control is there.
    expect(previewRoot()).toBeTruthy();
    expect(varOf("--background")).not.toBe("");
    expect(within(sidebar()).getByRole("radio", { name: "Kinetix neutral" })).toBeChecked();
  });

  it("names the version when that is the problem", () => {
    openWith("KX9_eyJ2Ijo5fQ");
    expect(presetBanner()!.textContent).toMatch(/version 9/);
  });
});

/* ------------------------------------------------------------------ share */

describe("share", () => {
  it("copies a canonical link that decodes back to the same design", async () => {
    const user = setup();
    render(<CreateWorkspace />);

    await user.click(within(sidebar()).getByRole("radio", { name: "Warm neutral" }));
    await user.click(action("Share"));

    expect(clipboard).toHaveLength(1);
    expect(clipboard[0]).toContain("/create?preset=KX1_");

    const result = decodeIntoConfig(clipboard[0]);
    expect(result.ok && result.config.neutral).toBe("warm");
  });

  it("announces the copy rather than only changing a label", async () => {
    const user = setup();
    render(<CreateWorkspace />);
    await user.click(within(sidebar()).getByRole("radio", { name: "Cool neutral" }));
    await user.click(action("Share"));

    expect(within(actions()).getByText("Share link copied to clipboard")).toBeTruthy();
  });

  it("is offered only once there is a design to share", async () => {
    const user = setup();
    render(<CreateWorkspace />);

    expect(action("Share")).toBeDisabled();
    await user.click(within(sidebar()).getByRole("radio", { name: "Warm neutral" }));
    expect(action("Share")).toBeEnabled();
  });

  it("says so when the browser refuses the clipboard", async () => {
    const user = setup(() => Promise.reject(new Error("denied")));
    render(<CreateWorkspace />);

    await user.click(within(sidebar()).getByRole("radio", { name: "Warm neutral" }));
    await user.click(action("Share"));

    // Silence would read as success, which is the one outcome that loses the user's work.
    expect(await within(actions()).findAllByText(/blocked clipboard access/)).not.toHaveLength(0);
  });
});

describe("copy preset", () => {
  it("copies the bare code, not the link", async () => {
    const user = setup();
    render(<CreateWorkspace />);

    await user.click(within(sidebar()).getByRole("radio", { name: "Sharp style" }));
    await user.click(action(/Copy preset/));

    expect(clipboard[0].startsWith("KX1_")).toBe(true);
    expect(clipboard[0]).not.toContain("http");
  });

  it("is a different artifact from Copy CSS", async () => {
    const user = setup();
    render(<CreateWorkspace />);

    await user.click(within(sidebar()).getByRole("radio", { name: "Warm neutral" }));
    await user.click(action(/Copy preset/));
    await user.click(action(/Copy CSS/));

    expect(clipboard[0].startsWith("KX1_")).toBe(true);
    expect(clipboard[1]).toContain(":root {");
    expect(clipboard[1]).not.toContain("KX1_");
  });
});

/* ------------------------------------------------------------------ history */

describe("the address bar", () => {
  it("does not change while the design is being edited", async () => {
    const user = setup();
    render(<CreateWorkspace />);
    const before = window.location.search;

    await user.click(within(sidebar()).getByRole("radio", { name: "Warm neutral" }));
    await user.click(within(sidebar()).getByRole("radio", { name: "Soft radius" }));
    const hex = within(sidebar()).getByLabelText("Hex");
    await user.clear(hex);
    await user.paste("#c2410c");

    // Writing the URL per change would put a history entry behind every slider pixel and make Back
    // mean nothing.
    expect(window.location.search).toBe(before);
  });

  it("is updated by Share, without adding a history entry", async () => {
    const user = setup();
    const replace = vi.spyOn(window.history, "replaceState");
    const push = vi.spyOn(window.history, "pushState");
    render(<CreateWorkspace />);

    await user.click(within(sidebar()).getByRole("radio", { name: "Warm neutral" }));
    await user.click(action("Share"));

    expect(replace).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(window.location.search).toContain("preset=KX1_");
  });

  it("is cleared by Reset, so a stale link cannot come back on reload", async () => {
    const user = setup();
    openWith(encodeConfig({ ...DEFAULT_CREATE_CONFIG, neutral: "warm" as const }));

    await user.click(action("Reset"));

    expect(window.location.search).not.toContain("preset");
    expect(within(sidebar()).getByRole("radio", { name: "Kinetix neutral" })).toBeChecked();
  });
});

/* ------------------------------------------------------------------ randomize */

describe("randomize", () => {
  it("produces a different design that is still valid", async () => {
    const user = setup();
    render(<CreateWorkspace />);

    const before = varOf("--action");
    await user.click(action("Randomize"));

    expect(varOf("--action")).not.toBe(before);
    expect((within(sidebar()).getByLabelText("Hex") as HTMLInputElement).value).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("leaves no failing contrast pair", async () => {
    const user = setup();
    render(<CreateWorkspace />);

    for (let i = 0; i < 5; i++) {
      await user.click(action("Randomize"));
      expect(within(sidebar()).queryAllByText("Fail")).toHaveLength(0);
    }
  });

  it("creates no manual overrides", async () => {
    const user = setup();
    render(<CreateWorkspace />);

    await user.click(action("Randomize"));
    await user.click(within(sidebar()).getByText("Semantic colours and raw overrides"));

    expect(within(sidebar()).getByLabelText("All overrides, as text")).toHaveValue("");
  });

  it("can be shared like any other design", async () => {
    const user = setup();
    render(<CreateWorkspace />);

    await user.click(action("Randomize"));
    await user.click(action("Share"));

    expect(decodeIntoConfig(clipboard[0]).ok).toBe(true);
  });
});

/* ------------------------------------------------------------------ reset */

describe("reset", () => {
  it("returns everything, including a design that arrived by link", async () => {
    const user = setup();
    openWith(encodeConfig({ ...DEFAULT_CREATE_CONFIG, brand: "#7e22ce", neutral: "warm" as const, surface: "flat" as const }));

    await user.click(action("Reset"));

    expect(within(sidebar()).getByRole("radio", { name: "Kinetix neutral" })).toBeChecked();
    expect(within(sidebar()).getByLabelText("Hex")).toHaveValue("#1d4ed8");
    expect(varOf("--shadow-sm")).toBe("");
    expect(within(sidebar()).getByRole("group", { name: "Generated CSS" }).textContent).toContain("Nothing to override");
    expect(action("Reset")).toBeDisabled();
  });
});
