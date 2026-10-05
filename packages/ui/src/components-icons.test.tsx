import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Banner } from "./components/banner";
import { Inform } from "./components/inform";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from "./components/breadcrumb";
import { NavigationBar } from "./components/navigation-bar";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "./components/pagination";
import { TreeItem, TreeView } from "./components/tree-view";
import { JsonViewer } from "./components/json-viewer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./components/accordion";
import { IconsDismissIconExample, IconsIconOnlyButtonExample } from "./usage/icons";

/**
 * components-icons.test.tsx — the icon contract (/docs/icons, docs/audits/ICON-ARCHITECTURE-AUDIT.md).
 *
 * Component logic in jsdom: which icon renders, whether a consumer's icon replaces it, what assistive
 * technology is told, and which class a directional glyph carries. jsdom does no layout, so the classes
 * prove intent only — which way a chevron actually points in a right-to-left page is measured on pixels
 * by `pnpm check:icon-direction`.
 */

/** A consumer's own icon: not lucide, not KinetixUI — any SVG a product team ships. */
const CompanyClose = () => (
  <svg data-testid="company-close" viewBox="0 0 24 24">
    <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" />
  </svg>
);

describe.each([
  ["Banner", Banner],
  ["Inform", Inform],
] as const)("%s dismiss icon", (_name, Component) => {
  it("renders lucide's X by default, hidden from assistive technology, inside a named button", () => {
    render(<Component onDismiss={() => {}}>Saved</Component>);
    const button = screen.getByRole("button", { name: "Dismiss" });
    const svg = button.querySelector("svg")!;
    expect(svg.classList.contains("lucide-x")).toBe(true);
    expect(svg.getAttribute("aria-hidden")).toBe("true");
  });

  it("replaces the default with the consumer's icon, keeping the name, the action and the size contract", async () => {
    const onDismiss = vi.fn();
    render(
      <Component onDismiss={onDismiss} dismissIcon={<CompanyClose />}>
        Saved
      </Component>,
    );
    const button = screen.getByRole("button", { name: "Dismiss" });
    expect(button.querySelector(".lucide-x")).toBeNull();
    expect(button.querySelector('[data-testid="company-close"]')).not.toBeNull();
    // The button sizes any SVG inside it, so the consumer's icon needs no size of its own.
    expect(button.className).toContain("[&_svg]:size-3.5");
    await userEvent.click(button);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("names the button from its label, not from the icon's own title", () => {
    render(
      <Component
        onDismiss={() => {}}
        dismissIcon={
          <svg role="img" aria-label="close-x-24">
            <title>close-x-24</title>
          </svg>
        }
      >
        Saved
      </Component>,
    );
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /close-x-24/ })).toBeNull();
  });

  it("renders no dismiss control, and so no icon, without onDismiss", () => {
    render(<Component dismissIcon={<CompanyClose />}>Saved</Component>);
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
    expect(screen.queryByTestId("company-close")).toBeNull();
  });
});

describe("directional icons", () => {
  const MIRROR = "rtl:-scale-x-100";

  it("mirrors Previous / Next, Back and the breadcrumb separator with the reading direction", () => {
    const { container } = render(
      <div dir="rtl">
        <NavigationBar title="Settings" onBack={() => {}} />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>Home</BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>Docs</BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>,
    );
    const back = screen.getByRole("button", { name: "Back" }).querySelector("svg")!;
    const previous = screen.getByRole("link", { name: "Go to previous page" }).querySelector("svg")!;
    const next = screen.getByRole("link", { name: "Go to next page" }).querySelector("svg")!;
    const separator = container.querySelector('li[role="presentation"] svg')!;
    for (const svg of [back, previous, next, separator]) {
      expect(svg.getAttribute("class")).toContain(MIRROR);
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("lets a breadcrumb separator be replaced, and leaves the replacement alone", () => {
    const { container } = render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>Home</BreadcrumbItem>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <BreadcrumbItem>Docs</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    const separator = container.querySelector('li[role="presentation"]')!;
    expect(separator.querySelector("svg")).toBeNull();
    expect(separator.textContent).toBe("/");
  });

  it("mirrors a collapsed disclosure chevron and only rotates an expanded one", () => {
    render(
      <TreeView defaultExpanded={["open"]}>
        <TreeItem value="open" label="Open">
          <TreeItem value="leaf" label="Leaf" />
        </TreeItem>
        <TreeItem value="shut" label="Shut">
          <TreeItem value="leaf2" label="Leaf 2" />
        </TreeItem>
      </TreeView>,
    );
    const chevron = (label: string) =>
      screen.getByRole("treeitem", { name: label }).querySelector("svg.lucide-chevron-right")!.getAttribute("class")!;
    // Mirroring then rotating a right-pointing chevron would point it up, so the expanded one only rotates.
    expect(chevron("Open")).toContain("rotate-90");
    expect(chevron("Open")).not.toContain(MIRROR);
    expect(chevron("Shut")).toContain(MIRROR);
    expect(chevron("Shut")).not.toContain("rotate-90");
  });

  it("applies the same rule to the JSON viewer's disclosure", () => {
    const { container } = render(<JsonViewer data={{ a: { b: 1 }, c: { d: 2 } }} expandDepth={0} />);
    const chevrons = [...container.querySelectorAll("svg.lucide-chevron-right")];
    expect(chevrons.length).toBeGreaterThan(0);
    for (const svg of chevrons) expect(svg.getAttribute("class")).toContain(MIRROR);
  });

  it("does not mirror an icon whose meaning is independent of direction", () => {
    render(
      <div dir="rtl">
        <Accordion type="single" collapsible>
          <AccordionItem value="a">
            <AccordionTrigger>Details</AccordionTrigger>
            <AccordionContent>Body</AccordionContent>
          </AccordionItem>
        </Accordion>
        <Banner onDismiss={() => {}}>Saved</Banner>
      </div>,
    );
    const down = screen.getByRole("button", { name: "Details" }).querySelector("svg")!;
    const close = screen.getByRole("button", { name: "Dismiss" }).querySelector("svg")!;
    expect(down.getAttribute("class")).not.toContain(MIRROR);
    expect(close.getAttribute("class")).not.toContain(MIRROR);
  });
});

describe("the /docs/icons example", () => {
  it("renders the snippet the docs page shows: default, another lucide icon, and an icon of the app's own", () => {
    render(<IconsDismissIconExample />);
    const buttons = screen.getAllByRole("button", { name: "Dismiss" });
    expect(buttons).toHaveLength(3);
    expect(buttons[0].querySelector(".lucide-x")).not.toBeNull();
    expect(buttons[1].querySelector(".lucide-circle-x")).not.toBeNull();
    expect(buttons[2].querySelector("svg[class*=lucide]")).toBeNull();
  });

  it("renders the icon-only button the docs page shows: named by its text, icon hidden, text visually hidden", () => {
    render(<IconsIconOnlyButtonExample />);
    const button = screen.getByRole("button", { name: "Delete draft" });
    expect(button.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
    // The label is in the DOM for assistive technology; size="icon" hides it visually.
    expect(button.className).toContain("[&>*:not(svg)]:sr-only");
  });
});
