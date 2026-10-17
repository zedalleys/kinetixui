import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/tabs";
import { Toggle } from "./components/toggle";
import { SegmentedControl, SegmentedControlItem } from "./components/segmented-control";

describe("navigation and filter semantics", () => {
  it.each(["ltr", "rtl"] as const)("skips disabled tabs and uses reading-order keys in %s", async (dir) => {
    render(
      <Tabs defaultValue="a" dir={dir}>
        <TabsList aria-label="Sections">
          <TabsTrigger value="a">One</TabsTrigger>
          <TabsTrigger value="b" disabled>
            Two
          </TabsTrigger>
          <TabsTrigger value="c">Three</TabsTrigger>
        </TabsList>
        <TabsContent value="a">First panel</TabsContent>
        <TabsContent value="c">Third panel</TabsContent>
      </Tabs>,
    );
    const user = userEvent.setup();
    await user.tab();
    await user.keyboard(dir === "rtl" ? "{ArrowLeft}" : "{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Three" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Three" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Third panel");
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "One" })).toHaveFocus();
  });
  it("supports manual activation without selecting on focus", async () => {
    render(
      <Tabs defaultValue="a" activationMode="manual">
        <TabsList>
          <TabsTrigger value="a">One</TabsTrigger>
          <TabsTrigger value="b">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="a">First</TabsContent>
        <TabsContent value="b">Second</TabsContent>
      </Tabs>,
    );
    const user = userEvent.setup();
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("aria-selected", "true");
  });
  it("keeps the TabsList asChild contract, with the indicator inside the consumer's element", async () => {
    render(
      <Tabs defaultValue="a">
        <TabsList asChild aria-label="Sections">
          <nav>
            <TabsTrigger value="a">One</TabsTrigger>
            <TabsTrigger value="b">Two</TabsTrigger>
          </nav>
        </TabsList>
        <TabsContent value="a">First</TabsContent>
        <TabsContent value="b">Second</TabsContent>
      </Tabs>,
    );
    const list = screen.getByRole("tablist", { name: "Sections" });
    expect(list.tagName).toBe("NAV");
    expect(list).toHaveAttribute("data-kx-tabs-list");
    expect(list.querySelector(":scope > [data-kx-tabs-bar]")).toHaveAttribute("aria-hidden", "true");
    await userEvent.setup().click(screen.getByRole("tab", { name: "Two" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Second");
  });
  it("keeps icon-bearing chips named by text and keyboard-toggleable", async () => {
    render(
      <Toggle variant="pill" leadingIcon={<svg role="img" aria-label="Redundant logo" />}>
        React 98
      </Toggle>,
    );
    const chip = screen.getByRole("button", { name: "React 98" });
    expect(screen.queryByRole("img")).toBeNull();
    const user = userEvent.setup();
    await user.tab();
    await user.keyboard(" ");
    expect(chip).toHaveAttribute("aria-pressed", "true");
  });
  it("keeps local modes as a radio group", () => {
    render(
      <SegmentedControl defaultValue="preview" aria-label="View">
        <SegmentedControlItem value="preview">Preview</SegmentedControlItem>
        <SegmentedControlItem value="code">Code</SegmentedControlItem>
      </SegmentedControl>,
    );
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByRole("radio", { name: "Preview" })).toHaveAttribute("aria-checked", "true");
  });
});
