import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

// A tiny demo registry with sentinel "source": if any of it reached an event, the assertions below would see it.
vi.mock("@/registry/demos", () => ({
  demoRegistry: { "button-demo": { component: () => <div>the demo</div>, source: "REACT_SOURCE_SENTINEL <Button />" } },
}));

import { CodePre } from "./code-pre";
import { ComponentPreview } from "./component-preview";
import { CopyButton } from "./copy-button";
import { HeroCommand } from "./hero-command";
import { analytics, sanitizeProps } from "@/lib/analytics";
import { PACKAGES } from "@/lib/packages";

const track = vi.spyOn(analytics, "track").mockImplementation(() => {});

const expectSanitary = () => {
  for (const [, props] of track.mock.calls) expect(sanitizeProps(props as object)).toEqual(props ?? {});
};

beforeEach(() => {
  track.mockClear();
  nav.pathname = "/";
  // HeroCommand's typing animation asks for reduced motion; `true` makes it static
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} }) as never;
});

describe("CopyButton", () => {
  it("calls onCopy after the clipboard write, with no arguments (the text can't leak)", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    render(<CopyButton value="the copied text" onCopy={onCopy} />);
    await user.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(onCopy).toHaveBeenCalledOnce());
    expect(onCopy).toHaveBeenCalledWith();
  });

  it("does not call onCopy when the clipboard write is blocked", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(new Error("denied"));
    render(<CopyButton value="x" onCopy={onCopy} />);
    await user.click(screen.getByRole("button", { name: "Copy" }));
    await new Promise((r) => setTimeout(r, 20));
    expect(onCopy).not.toHaveBeenCalled(); // and, now, no unhandled rejection either
  });

  it("still works with no callback (every other use of it)", async () => {
    const user = userEvent.setup();
    render(<CopyButton value="x" />);
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(track).not.toHaveBeenCalled();
  });
});

describe("HeroCommand (homepage CLI snippet)", () => {
  it("reports cli_command_copied once, from the hero, with the CLI package — and not the command", async () => {
    const user = userEvent.setup();
    render(<HeroCommand />);
    await user.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(track).toHaveBeenCalledOnce());
    expect(track.mock.calls).toEqual([["cli_command_copied", { source: "homepage_hero", package: PACKAGES.cli }]]);
    expect(JSON.stringify(track.mock.calls)).not.toContain("npx");
    expect(JSON.stringify(track.mock.calls)).not.toContain("button"); // the component typed in the snippet
    expectSanitary();
  });

  it("fires nothing on render", () => {
    render(<HeroCommand />);
    expect(track).not.toHaveBeenCalled();
  });
});

describe("CodePre (fenced code in the MDX docs)", () => {
  const fence = (text: string, language: string) => (
    <CodePre data-language={language}>
      <code>
        {text.split("\n").map((line, i) => (
          <span key={i} data-line="">
            {line}
          </span>
        ))}
      </code>
    </CodePre>
  );
  const copy = async (text: string, language: string) => {
    const user = userEvent.setup();
    render(fence(text, language));
    await user.click(screen.getByRole("button", { name: "Copy code" }));
    await new Promise((r) => setTimeout(r, 20));
  };

  it("reports a CLI command on the installation page — the event names the package, never the command", async () => {
    nav.pathname = "/docs/installation";
    await copy("npx @kinetixui/cli add button", "bash");
    expect(track.mock.calls).toEqual([["cli_command_copied", { source: "installation_page", package: PACKAGES.cli }]]);
    expect(JSON.stringify(track.mock.calls)).not.toContain("add button");
    expectSanitary();
  });

  it("reports an npm install command as install_command_copied", async () => {
    nav.pathname = "/docs/installation";
    await copy("npm i @kinetixui/ui", "bash");
    expect(track.mock.calls).toEqual([["install_command_copied", { source: "installation_page", package: PACKAGES.ui }]]);
  });

  it("reports component code with its component and platform, and never the code", async () => {
    nav.pathname = "/docs/components/button";
    await copy("SECRET_SNIPPET_BODY(<Button>x</Button>)", "tsx");
    expect(track.mock.calls).toEqual([["component_code_copied", { component: "button", platform: "react", source: "component_page" }]]);
    expect(JSON.stringify(track.mock.calls)).not.toContain("SECRET_SNIPPET_BODY");
    expectSanitary();
  });

  it("reports a Swift fence on a component page as swiftui", async () => {
    nav.pathname = "/docs/components/button";
    await copy("KinetixButton(action: save) {}", "swift");
    expect(track.mock.calls).toEqual([["component_code_copied", { component: "button", platform: "swiftui", source: "component_page" }]]);
  });

  it.each([
    ["theme CSS on a docs page", "/docs/theming", ":root { --primary: 1 2 3 }", "css"],
    ["tsx on a non-component docs page", "/docs/theming", "<Button />", "tsx"],
    ["an unrelated shell command", "/docs/installation", "npm run build", "bash"],
  ])("reports nothing for %s", async (_what, path, text, language) => {
    nav.pathname = path;
    await copy(text, language);
    expect(track).not.toHaveBeenCalled();
  });
});

describe("ComponentPreview (component page: code tabs and platform switcher)", () => {
  const open = async () => {
    const user = userEvent.setup();
    nav.pathname = "/docs/components/button";
    render(<ComponentPreview name="button-demo" />);
    await user.click(screen.getByRole("tab", { name: "code" }));
    return user;
  };

  it("fires nothing when it renders — the default React tab is not a selection", async () => {
    await open();
    expect(track).not.toHaveBeenCalled();
  });

  it("reports an explicit platform switch once, with component, platform and where", async () => {
    const user = await open();
    await user.click(screen.getByRole("tab", { name: "Android" }));
    expect(track.mock.calls).toEqual([["platform_selected", { platform: "compose", component: "button", source: "component_page", location: "platform_tabs" }]]);
    expectSanitary();
  });

  it("does not fire again when the already-selected platform is clicked", async () => {
    const user = await open();
    await user.click(screen.getByRole("tab", { name: "Android" }));
    await user.click(screen.getByRole("tab", { name: "Android" }));
    await user.click(screen.getByRole("tab", { name: "Android" }));
    expect(track).toHaveBeenCalledOnce();
  });

  it("does not fire for clicking the default (React) tab while it is already selected", async () => {
    const user = await open();
    await user.click(screen.getByRole("tab", { name: "React" }));
    expect(track).not.toHaveBeenCalled();
  });

  it("reports each switch between platforms as its own selection", async () => {
    const user = await open();
    await user.click(screen.getByRole("tab", { name: "iOS" }));
    await user.click(screen.getByRole("tab", { name: "Flutter" }));
    await user.click(screen.getByRole("tab", { name: "React" }));
    expect(track.mock.calls.map((c) => (c[1] as { platform: string }).platform)).toEqual(["swiftui", "flutter", "react"]);
  });

  it("reports the copied platform's snippet with component + platform, never the source", async () => {
    const user = await open();
    await user.click(screen.getByRole("button", { name: "Copy" })); // the React tab is showing
    await waitFor(() => expect(track).toHaveBeenCalledOnce());
    expect(track.mock.calls).toEqual([["component_code_copied", { component: "button", platform: "react", source: "component_page" }]]);

    track.mockClear();
    await user.click(screen.getByRole("tab", { name: "iOS" }));
    track.mockClear(); // drop platform_selected; this assertion is about the copy
    await user.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(track).toHaveBeenCalledOnce());
    expect(track.mock.calls).toEqual([["component_code_copied", { component: "button", platform: "swiftui", source: "component_page" }]]);

    const payload = JSON.stringify(track.mock.calls);
    expect(payload).not.toContain("REACT_SOURCE_SENTINEL");
    expect(payload).not.toContain("KinetixButton");
    expectSanitary();
  });

  it("reports nothing when the demo is shown somewhere that isn't a component page (no known component)", async () => {
    const user = userEvent.setup();
    nav.pathname = "/some/other/page";
    render(<ComponentPreview name="button-demo" />);
    await user.click(screen.getByRole("tab", { name: "code" }));
    await user.click(screen.getByRole("tab", { name: "iOS" }));
    await user.click(screen.getByRole("button", { name: "Copy" }));
    await new Promise((r) => setTimeout(r, 20));
    expect(track).not.toHaveBeenCalled();
  });
});
