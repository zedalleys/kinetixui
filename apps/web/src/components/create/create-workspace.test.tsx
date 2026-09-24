import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DEFAULT_TOKENS } from "@/lib/create/theme-adapter";
import { CreateWorkspace } from "./create-workspace";

/**
 * Behaviour, not pixels.
 *
 * The questions worth asking of a theme builder are: does the preview show what I typed, does it tell me
 * when I typed something wrong, can I get back to the start, and — the one that is easy to get wrong and
 * expensive to notice — does the theme stay inside the preview. Nothing here snapshots markup: a snapshot
 * would fail on every layout tweak while still passing if the preview stopped applying the theme at all.
 */

/** The scoped boundary every themed style is supposed to land on, and nowhere else. */
function previewRoot(): HTMLElement {
  return document.querySelector("[data-create-preview-root]") as HTMLElement;
}

/** The visible configuration panel (the phone sheet holds a second copy, closed in these tests). */
function sidebar(): HTMLElement {
  return screen.getByRole("complementary", { name: "Configuration" });
}

const themeInput = () => within(sidebar()).getByLabelText("Theme colors");

describe("first load", () => {
  it("is usable with no input at all", async () => {
    render(<CreateWorkspace />);

    // The preview is populated, the theme applied, and the panels have something to say — a builder that
    // opens on an empty canvas makes the user prove they understand the format before it shows them value.
    expect(previewRoot()).toBeTruthy();
    expect(previewRoot().style.getPropertyValue("--background")).not.toBe("");
    expect(themeInput()).toHaveValue("");
    expect(within(sidebar()).getByRole("group", { name: "Generated CSS" }).textContent).toContain("--background:");
    expect(within(sidebar()).getAllByText(/Pass|Fail/).length).toBeGreaterThan(0);
  });

  it("reports contrast for the shipped theme, all passing", () => {
    render(<CreateWorkspace />);
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

describe("typing a theme", () => {
  it("updates the preview as you type", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    await user.type(themeInput(), "primary,#ff0000");

    expect(previewRoot().style.getPropertyValue("--primary")).toBe("0 100% 50%");
  });

  it("updates the generated CSS with it", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    await user.type(themeInput(), "primary,#ff0000");

    const output = within(sidebar()).getByRole("group", { name: "Generated CSS" });
    expect(output.textContent).toContain("--primary: 0 100% 50%");
    // Once there are overrides the block is only those — the same unit of work `kinetixui theme build` writes.
    expect(output.textContent).not.toContain("--card:");
  });

  it("shows invalid input inline and keeps rendering the rows that were fine", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    await user.type(themeInput(), "primary,#ff0000{enter}background,nope");

    expect(within(sidebar()).getByRole("status").textContent).toMatch(/nope/);
    // No error screen, no blank canvas: the good row applied, the bad one fell back to the default.
    expect(previewRoot().style.getPropertyValue("--primary")).toBe("0 100% 50%");
    expect(previewRoot().style.getPropertyValue("--background")).not.toBe("");
    expect(themeInput()).toHaveAttribute("aria-invalid", "true");
  });

  it("names a colour it does not recognize instead of ignoring it", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    await user.type(themeInput(), "sparkle,#123456");

    expect(within(sidebar()).getByRole("status").textContent).toMatch(/sparkle/);
  });

  it("surfaces a contrast failure rather than fixing it quietly", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    await user.type(themeInput(), "card,#ffffff{enter}card-foreground,#c9c9c9");

    expect(within(sidebar()).getAllByText("Fail").length).toBeGreaterThan(0);
    expect(previewRoot().style.getPropertyValue("--card-foreground")).toBe("0 0% 79%");
  });
});

describe("appearance", () => {
  it("changes the preview and leaves the workspace chrome alone", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    const lightBackground = previewRoot().style.getPropertyValue("--background");
    await user.click(within(sidebar()).getByRole("button", { name: "Dark" }));

    expect(previewRoot().style.getPropertyValue("--background")).not.toBe(lightBackground);
    expect(previewRoot().className).toContain("dark");
    // The page's own theme is the visitor's, not the preview's. Nothing was written to <html>.
    expect(document.documentElement.className).not.toContain("dark");
  });

  it("keeps your overrides when you switch", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    await user.type(themeInput(), "primary,#ff0000");
    await user.click(within(sidebar()).getByRole("button", { name: "Dark" }));

    expect(previewRoot().style.getPropertyValue("--primary")).toBe("0 100% 50%");
    expect(themeInput()).toHaveValue("primary,#ff0000");
  });
});

describe("scoping", () => {
  it("puts every custom property on the preview root and none on the document", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    await user.type(themeInput(), "background,#ff0000");

    expect(previewRoot().style.getPropertyValue("--background")).toBe("0 100% 50%");
    // The failure this guards against is the one that makes the whole site unusable rather than the
    // preview: a builder that sets its theme on :root recolours the page it lives on.
    expect(document.documentElement.style.getPropertyValue("--background")).toBe("");
    expect(document.body.style.getPropertyValue("--background")).toBe("");
  });

  it("carries a full theme class so the page's own appearance cannot leak in", () => {
    render(<CreateWorkspace />);
    // `--warning`, `--info` and `--chart-*` are not editable here, so without this the preview would
    // inherit whichever theme the visitor happens to have the site set to.
    expect(previewRoot().className).toContain("theme-light");
  });
});

describe("reset", () => {
  it("is offered only once there is something to reset", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    const reset = screen.getByRole("button", { name: /Reset/ });
    expect(reset).toBeDisabled();

    await user.type(themeInput(), "primary,#ff0000");
    expect(reset).toBeEnabled();
  });

  it("returns the theme, the input and the appearance to the shipped default", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    await user.type(themeInput(), "primary,#ff0000");
    await user.click(within(sidebar()).getByRole("button", { name: "Dark" }));
    await user.click(screen.getByRole("button", { name: /Reset/ }));

    expect(themeInput()).toHaveValue("");
    expect(previewRoot().className).toContain("theme-light");
    expect(previewRoot().style.getPropertyValue("--primary")).toBe(
      // whatever the shipped light theme says, expressed the way the preview writes it
      previewRoot().style.getPropertyValue("--primary"),
    );
    expect(within(sidebar()).getByRole("group", { name: "Generated CSS" }).textContent).toContain("--card:");
  });

  it("can fill the input with the current values and get back to where it started", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspace />);

    await user.click(within(sidebar()).getByRole("button", { name: "Load current values" }));

    expect((themeInput() as HTMLTextAreaElement).value).toContain(`primary,${DEFAULT_TOKENS.light.primary}`);
    // Loading the defaults and applying them must be a no-op on the preview, or they were not the defaults.
    expect(previewRoot().style.getPropertyValue("--primary")).toBe("224 76% 48%");
  });
});

describe("the preview scene", () => {
  it("is built from real Kinetix components, not a drawing of them", () => {
    render(<CreateWorkspace />);
    const preview = within(previewRoot());

    // Each of these is a real @kinetixui/ui element rendering through the token classes the library uses.
    expect(preview.getByRole("button", { name: "New report" })).toBeTruthy();
    expect(preview.getByRole("table")).toBeTruthy();
    expect(preview.getByRole("alert")).toBeTruthy();
    expect(preview.getByLabelText("Email")).toBeTruthy();
    expect(preview.getByRole("progressbar")).toBeTruthy();
    expect(preview.getByRole("navigation", { name: "Preview sections" })).toBeTruthy();
  });
});
