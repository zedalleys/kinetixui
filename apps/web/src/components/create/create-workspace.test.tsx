import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { hexToHslChannels } from "@/lib/color-math";
import { hexToOklch } from "@/lib/color/oklch";
import { SHIPPED_TOKENS } from "@/lib/create/theme-adapter";
import { CreateWorkspace } from "./create-workspace";

/**
 * Behaviour, not pixels.
 *
 * The questions worth asking of a visual theme builder: does the preview show what I chose, does the
 * theme stay inside the preview, does a manual value survive, and can I get back to the start. Nothing
 * here snapshots markup — a snapshot fails on every layout tweak while still passing if the preview
 * stopped applying the theme at all.
 */

const previewRoot = () => document.querySelector("[data-create-preview-root]") as HTMLElement;
const sidebar = () => screen.getByRole("complementary", { name: "Configuration" });
const cssPanel = () => within(sidebar()).getByRole("group", { name: "Generated CSS" });
const varOf = (token: string) => previewRoot().style.getPropertyValue(token);

/** Open the Advanced disclosure, which is collapsed by default on purpose. */
async function openAdvanced(user: ReturnType<typeof userEvent.setup>) {
  await user.click(within(sidebar()).getByText("Semantic colours and raw overrides"));
}

describe("first load", () => {
  it("shows the shipped Kinetix theme, fully populated, with nothing to copy", () => {
    render(<CreateWorkspace />);

    expect(previewRoot()).toBeTruthy();
    // Default config generates nothing, so the preview is the real library rather than an imitation.
    expect(varOf("--background")).not.toBe("");
    expect(cssPanel().textContent).toContain("Nothing to override");
    for (const b of screen.getAllByRole("button", { name: /Copy CSS/ })) expect(b).toBeDisabled();
  });

  it("opens with every Simple control set and visible, not hidden behind accordions", () => {
    render(<CreateWorkspace />);
    const panel = within(sidebar());

    expect(panel.getByRole("radio", { name: "Default style" })).toBeChecked();
    expect(panel.getByRole("radio", { name: "Kinetix neutral" })).toBeTruthy();
    expect(panel.getByRole("slider", { name: "Hue" })).toBeTruthy();
    expect(panel.getByLabelText("Hex")).toHaveValue("#1d4ed8");
    // Only Advanced is folded away (§51). <details> keeps its children mounted, so the claim is about
    // the disclosure being shut, not about the markup being absent.
    expect(sidebar().querySelector("details")).not.toHaveAttribute("open");
  });

  it("summarises contrast rather than listing twelve identical passes", () => {
    render(<CreateWorkspace />);
    expect(within(sidebar()).getByText(/pairs meet WCAG AA/)).toBeTruthy();
    expect(within(sidebar()).queryAllByText("Fail")).toHaveLength(0);
  });

  it("calls the preview what it is, and not a platform it is not", () => {
    render(<CreateWorkspace />);
    expect(screen.getByRole("heading", { name: "Kinetix theme preview" })).toBeTruthy();
    for (const platform of ["SwiftUI", "Compose", "Flutter", "Angular"]) {
      expect(document.body.textContent).not.toContain(`${platform} preview`);
    }
  });
});

describe("theme colour", () => {
  it("updates the preview when a hex is typed", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    const hex = within(sidebar()).getByLabelText("Hex");
    await user.clear(hex);
    await user.paste("#c2410c");

    // The action colour follows the theme colour, band-corrected for the mode — so not necessarily the
    // exact hue value typed, but unmistakably that hue.
    const action = hexToOklch(`#${rgbFromVar(varOf("--action"))}`);
    expect(action!.h).toBeCloseTo(hexToOklch("#c2410c")!.h, 0);
  });

  it("drives the picker sliders from the same value", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    const before = Number((within(sidebar()).getByRole("slider", { name: "Hue" }) as HTMLInputElement).value);
    const hex = within(sidebar()).getByLabelText("Hex");
    await user.clear(hex);
    await user.paste("#15803d");

    const after = Number((within(sidebar()).getByRole("slider", { name: "Hue" }) as HTMLInputElement).value);
    expect(after).not.toBe(before);
    expect(after).toBeCloseTo(hexToOklch("#15803d")!.h, -1);
  });

  it("does not corrupt the config while an incomplete hex is being typed", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    const before = varOf("--action");
    const hex = within(sidebar()).getByLabelText("Hex");
    await user.clear(hex);
    await user.type(hex, "#1d4");

    // The draft is shown, the colour is not changed, and the user is told why.
    expect(hex).toHaveValue("#1d4");
    expect(varOf("--action")).toBe(before);
    expect(within(sidebar()).getByRole("status").textContent).toMatch(/six-digit hex/);
  });

  it("exposes each channel as a real slider with a spoken value", () => {
    render(<CreateWorkspace />);

    for (const [name, text] of [["Hue", /degrees$/], ["Chroma", /percent$/], ["Lightness", /percent$/]] as const) {
      const slider = within(sidebar()).getByRole("slider", { name });
      expect(slider).toHaveAttribute("aria-valuetext", expect.stringMatching(text) as never);
      expect(slider).toHaveAttribute("type", "range");
    }
    // Native range inputs were chosen so arrow keys, Home/End and Page Up/Down come from the platform.
    // jsdom does not implement that, so the browser a11y gate is where it is exercised.
  });

  it("moves the theme when a channel changes", () => {
    render(<CreateWorkspace />);

    const before = varOf("--action");
    const hue = within(sidebar()).getByRole("slider", { name: "Hue" }) as HTMLInputElement;
    fireEvent.change(hue, { target: { value: "140" } });

    expect(varOf("--action")).not.toBe(before);
  });

  it("writes the change into the copied CSS", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    const hex = within(sidebar()).getByLabelText("Hex");
    await user.clear(hex);
    await user.paste("#7e22ce");

    expect(cssPanel().textContent).toContain("--action:");
    for (const b of screen.getAllByRole("button", { name: /Copy CSS/ })) expect(b).toBeEnabled();
  });
});

describe("the system controls", () => {
  it("neutral changes the surfaces and survives into the output", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    const before = varOf("--background");
    await user.click(within(sidebar()).getByRole("radio", { name: "Warm neutral" }));

    expect(varOf("--background")).not.toBe(before);
    expect(cssPanel().textContent).toContain("--background:");
  });

  it("radius changes the preview and survives into the output", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    await user.click(within(sidebar()).getByRole("radio", { name: "Rounded radius" }));

    expect(varOf("--radius-md")).toBe("12px");
    expect(cssPanel().textContent).toContain("--radius-md: 12px");
  });

  it("surface changes the elevation and survives into the output", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    await user.click(within(sidebar()).getByRole("radio", { name: "Flat surface" }));

    expect(varOf("--shadow-sm")).toBe("none");
    expect(cssPanel().textContent).toContain("--shadow-sm: none");
  });

  it("chart palette changes the series and survives into the output", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    const before = varOf("--chart-1");
    await user.click(within(sidebar()).getByRole("radio", { name: "Categorical chart palette" }));

    expect(varOf("--chart-1")).not.toBe(before);
    expect(cssPanel().textContent).toContain("--chart-1:");
  });

  it("a style applies its dimensions and then stops naming a preset", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    await user.click(within(sidebar()).getByRole("radio", { name: "Sharp style" }));
    expect(varOf("--radius-md")).toBe("0px");
    expect(within(sidebar()).getByRole("radio", { name: "Square radius" })).toBeChecked();

    // Changing a dimension the preset set must stick, not be reasserted.
    await user.click(within(sidebar()).getByRole("radio", { name: "Soft radius" }));
    expect(within(sidebar()).getByRole("radio", { name: "Sharp style" })).not.toBeChecked();
  });
});

describe("appearance", () => {
  it("changes the preview and leaves the workspace chrome alone", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    const light = varOf("--background");
    await user.click(within(sidebar()).getByRole("button", { name: "Dark" }));

    expect(varOf("--background")).not.toBe(light);
    expect(previewRoot().className).toContain("dark");
    // The page's own theme is the visitor's, not the preview's.
    expect(document.documentElement.className).not.toContain("dark");
  });

  it("keeps the configuration when switching — one config describes both", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    await user.click(within(sidebar()).getByRole("radio", { name: "Warm neutral" }));
    await user.click(within(sidebar()).getByRole("button", { name: "Dark" }));

    expect(within(sidebar()).getByRole("radio", { name: "Warm neutral" })).toBeChecked();
    // The copied CSS carries both appearances regardless of which one is on screen.
    expect(cssPanel().textContent).toContain(":root");
    expect(cssPanel().textContent).toContain(".dark");
  });
});

describe("scoping", () => {
  it("puts every custom property on the preview root and none on the document", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    await user.click(within(sidebar()).getByRole("radio", { name: "Cool neutral" }));

    expect(varOf("--background")).not.toBe("");
    // The failure this guards against makes the whole site unusable rather than the preview.
    expect(document.documentElement.style.getPropertyValue("--background")).toBe("");
    expect(document.body.style.getPropertyValue("--background")).toBe("");
  });

  it("carries a full theme class so the page's own appearance cannot leak in", () => {
    render(<CreateWorkspace />);
    expect(previewRoot().className).toContain("theme-light");
  });
});

describe("advanced", () => {
  it("still has the raw editor, and it still works", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);
    await openAdvanced(user);

    const raw = within(sidebar()).getByLabelText("All overrides, as text");
    await user.click(raw);
    await user.paste("action,#ff0000");

    expect(varOf("--action")).toBe("0 100% 50%");
    expect(cssPanel().textContent).toContain("--action: 0 100% 50%");
  });

  it("reports an invalid row without taking the preview down", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);
    await openAdvanced(user);

    const raw = within(sidebar()).getByLabelText("All overrides, as text");
    await user.click(raw);
    await user.paste("action,#ff0000\nbackground,nope");

    expect(within(sidebar()).getByRole("status").textContent).toMatch(/nope/);
    expect(varOf("--action")).toBe("0 100% 50%");
    expect(varOf("--background")).not.toBe("");
  });

  it("lets a manual value beat the generated one, and says which is which", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);
    await openAdvanced(user);

    const field = within(sidebar()).getByLabelText(/^Action/);
    await user.clear(field);
    await user.paste("#ff0000");

    expect(varOf("--action")).toBe("0 100% 50%");
    expect(within(sidebar()).getByLabelText(/^Action/).closest("div")?.textContent).toContain("manual");
  });

  it("keeps a manual value when the thing that generated it changes", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);
    await openAdvanced(user);

    const field = within(sidebar()).getByLabelText(/^Action/);
    await user.clear(field);
    await user.paste("#ff0000");

    const hex = within(sidebar()).getByLabelText("Hex");
    await user.clear(hex);
    await user.paste("#15803d");

    expect(varOf("--action")).toBe("0 100% 50%");
  });

  it("shows a contrast failure the user created rather than repairing it", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);
    await openAdvanced(user);

    const raw = within(sidebar()).getByLabelText("All overrides, as text");
    await user.click(raw);
    await user.paste("card,#ffffff\ncard-foreground,#c9c9c9");

    expect(within(sidebar()).getAllByText("Fail").length).toBeGreaterThan(0);
    expect(varOf("--card-foreground")).toBe("0 0% 79%");
    // Copy is not blocked by a failing manual override — a warning is shown instead (§75).
    for (const b of screen.getAllByRole("button", { name: /Copy CSS/ })) expect(b).toBeEnabled();
  });
});

describe("preview scenes", () => {
  it("switches between them without touching the design controls", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    expect(within(previewRoot()).getByRole("table")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Form" }));

    expect(within(previewRoot()).getByLabelText("Project name")).toBeTruthy();
    expect(within(sidebar()).getByRole("radio", { name: "Default style" })).toBeChecked();
  });

  it("builds both scenes from real Kinetix components", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    const dash = within(previewRoot());
    expect(dash.getByRole("button", { name: "New report" })).toBeTruthy();
    expect(dash.getByRole("button", { name: "Delete" })).toBeTruthy();
    expect(dash.getByRole("table")).toBeTruthy();
    expect(dash.getByRole("alert")).toBeTruthy();
    expect(dash.getByRole("progressbar")).toBeTruthy();
    expect(dash.getByRole("img", { name: /data series/ })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Form" }));
    const form = within(previewRoot());
    expect(form.getByRole("checkbox")).toBeTruthy();
    expect(form.getByRole("switch")).toBeTruthy();
    expect(form.getByRole("combobox")).toBeTruthy();
  });
});

describe("reset", () => {
  it("is offered only once there is something to reset", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    const reset = screen.getByRole("button", { name: "Reset" });
    expect(reset).toBeDisabled();

    await user.click(within(sidebar()).getByRole("radio", { name: "Warm neutral" }));
    expect(reset).toBeEnabled();
  });

  it("returns every dimension, including ones set in Advanced", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    await user.click(within(sidebar()).getByRole("radio", { name: "Warm neutral" }));
    await user.click(within(sidebar()).getByRole("radio", { name: "Sharp style" }));
    await user.click(within(sidebar()).getByRole("button", { name: "Dark" }));
    await openAdvanced(user);
    const raw = within(sidebar()).getByLabelText("All overrides, as text");
    await user.click(raw);
    await user.paste("action,#ff0000");

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(previewRoot().className).toContain("theme-light");
    expect(varOf("--background")).toBe(hslOf(SHIPPED_TOKENS.light.background));
    expect(varOf("--action")).toBe(hslOf(SHIPPED_TOKENS.light.action));
    expect(varOf("--radius-md")).toBe("");
    expect(cssPanel().textContent).toContain("Nothing to override");
  });
});

/* ------------------------------------------------------------------ helpers */

/** `"0 100% 50%"` → the hex the preview would render, so assertions can be written in hex. */
function rgbFromVar(channels: string): string {
  const [h, s, l] = channels.split(" ").map((p) => Number.parseFloat(p));
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const v = l / 100 - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * v).toString(16).padStart(2, "0");
  };
  return `${f(0)}${f(8)}${f(4)}`;
}

/** The HSL-channel string the preview writes for a hex — the same conversion the adapter uses. */
const hslOf = hexToHslChannels;
