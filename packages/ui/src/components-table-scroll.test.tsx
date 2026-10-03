import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "./components/table";

/**
 * components-table-scroll.test.tsx — Table's scroll container becomes keyboard reachable exactly when it
 * can actually scroll, and stays out of the tab order when it cannot.
 *
 * WHAT IS MOCKED, AND WHY IT HAS TO BE
 *
 * jsdom does no layout: every element reports `scrollWidth === clientWidth === 0`, so the real condition
 * this component branches on cannot occur here. Two things are therefore faked, and nothing else:
 *
 *   geometry        `scrollWidth` / `clientWidth` are defined per element, so a table can be declared
 *                   wider than its wrapper. This is the input to the decision, not the decision.
 *   ResizeObserver  the global stub in test/setup.ts silently does nothing, so it can never deliver a
 *                   second measurement. It is replaced with one that records its callbacks and lets a
 *                   test fire them, which is how the "dimensions changed" case is exercised at all.
 *
 * So what these tests prove is the COMPONENT'S CONTRACT: given an overflowing measurement, the wrapper
 * becomes focusable and named; given a fitting one, it does not; and a later measurement is acted on.
 * They do not and cannot prove that a real browser decides a real table overflows — that is what the
 * `check:a11y-site` and `check:a11y-browser` gates measure in Chromium, at 320px and at 200% text, and
 * the axe rule `scrollable-region-focusable` is the assertion there.
 */

type ROCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;
const callbacks: ROCallback[] = [];
let realRO: typeof ResizeObserver;

/** Re-measure everything, the way a real resize or a text-size change would. */
const resize = () => {
  for (const cb of callbacks) cb([], {} as ResizeObserver);
};

/** Declare a layout jsdom will never compute for us. */
function setGeometry(el: Element, { scrollWidth, clientWidth }: { scrollWidth: number; clientWidth: number }) {
  Object.defineProperty(el, "scrollWidth", { value: scrollWidth, configurable: true });
  Object.defineProperty(el, "clientWidth", { value: clientWidth, configurable: true });
}

beforeEach(() => {
  callbacks.length = 0;
  realRO = window.ResizeObserver;
  window.ResizeObserver = class {
    constructor(cb: ROCallback) {
      callbacks.push(cb);
    }
    observe() {}
    unobserve() {}
    disconnect() {
      const i = callbacks.indexOf(this.cb);
      if (i >= 0) callbacks.splice(i, 1);
    }
    declare cb: ROCallback;
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  window.ResizeObserver = realRO;
});

/** The wrapper is the scroll container: the element that owns `overflow-auto`. */
const wrapperOf = (table: HTMLElement) => table.closest("div.overflow-auto") as HTMLElement;

function Fixture({ caption }: { caption?: string } = {}) {
  return (
    <Table>
      {caption ? <TableCaption>{caption}</TableCaption> : null}
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>INV-001</TableCell>
          <TableCell>Paid</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

describe("Table keeps its semantics", () => {
  it("still renders a real table, not a div with a role", () => {
    render(<Fixture />);
    const table = screen.getByRole("table");
    expect(table.tagName).toBe("TABLE");
    // The semantics a screen reader navigates by are the element's own, not ARIA stand-ins.
    expect(table).not.toHaveAttribute("role");
    expect(screen.getByRole("columnheader", { name: "Invoice" }).tagName).toBe("TH");
    expect(screen.getByRole("cell", { name: "INV-001" }).tagName).toBe("TD");
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("puts a caption inside the table, where the table owns it", () => {
    render(<Fixture caption="Q3 invoices" />);
    const caption = screen.getByText("Q3 invoices");
    expect(caption.tagName).toBe("CAPTION");
    expect(caption.parentElement?.tagName).toBe("TABLE");
  });
});

describe("the scroll container is reachable only when it scrolls", () => {
  it("adds no tab stop when the table fits", async () => {
    render(<Fixture />);
    const wrapper = wrapperOf(screen.getByRole("table"));
    setGeometry(wrapper, { scrollWidth: 400, clientWidth: 400 });
    resize();
    await waitFor(() => expect(wrapper).not.toHaveAttribute("tabindex"));
    expect(wrapper).not.toHaveAttribute("role");
    expect(wrapper).not.toHaveAttribute("aria-labelledby");
  });

  it("ignores a sub-pixel difference rather than minting a useless focus stop", async () => {
    render(<Fixture />);
    const wrapper = wrapperOf(screen.getByRole("table"));
    // Rounding routinely produces a fraction of a pixel on a table that cannot actually scroll.
    setGeometry(wrapper, { scrollWidth: 400.6, clientWidth: 400 });
    resize();
    await waitFor(() => expect(wrapper).not.toHaveAttribute("tabindex"));
  });

  it("becomes focusable when the table is wider than the container", async () => {
    render(<Fixture />);
    const wrapper = wrapperOf(screen.getByRole("table"));
    setGeometry(wrapper, { scrollWidth: 900, clientWidth: 400 });
    resize();
    await waitFor(() => expect(wrapper).toHaveAttribute("tabindex", "0"));
  });

  it("acts on a later measurement, so a resize or a text-size change is not missed", async () => {
    render(<Fixture />);
    const wrapper = wrapperOf(screen.getByRole("table"));
    setGeometry(wrapper, { scrollWidth: 400, clientWidth: 400 });
    resize();
    await waitFor(() => expect(wrapper).not.toHaveAttribute("tabindex"));

    // The reader doubles their text size: the table grows, the wrapper does not.
    setGeometry(wrapper, { scrollWidth: 820, clientWidth: 400 });
    resize();
    await waitFor(() => expect(wrapper).toHaveAttribute("tabindex", "0"));

    // …and back again, so the state is not one-way.
    setGeometry(wrapper, { scrollWidth: 400, clientWidth: 400 });
    resize();
    await waitFor(() => expect(wrapper).not.toHaveAttribute("tabindex"));
  });

  it("is reachable by Tab once scrollable, and does not trap focus", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">before</button>
        <Fixture />
        <button type="button">after</button>
      </>,
    );
    const wrapper = wrapperOf(screen.getByRole("table"));
    setGeometry(wrapper, { scrollWidth: 900, clientWidth: 400 });
    resize();
    await waitFor(() => expect(wrapper).toHaveAttribute("tabindex", "0"));

    await user.tab();
    expect(screen.getByRole("button", { name: "before" })).toHaveFocus();
    await user.tab();
    expect(wrapper).toHaveFocus();
    // Focus order continues past it rather than being captured.
    await user.tab();
    expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
  });

  it("stops being a tab stop again when it no longer scrolls", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">before</button>
        <Fixture />
        <button type="button">after</button>
      </>,
    );
    const wrapper = wrapperOf(screen.getByRole("table"));
    setGeometry(wrapper, { scrollWidth: 400, clientWidth: 400 });
    resize();
    await waitFor(() => expect(wrapper).not.toHaveAttribute("tabindex"));

    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
  });
});

describe("the scroll container is named by the table's own caption", () => {
  it("points aria-labelledby at the caption when there is one", async () => {
    render(<Fixture caption="Q3 invoices" />);
    const wrapper = wrapperOf(screen.getByRole("table"));
    setGeometry(wrapper, { scrollWidth: 900, clientWidth: 400 });
    resize();
    await waitFor(() => expect(wrapper).toHaveAttribute("tabindex", "0"));

    const caption = screen.getByText("Q3 invoices");
    expect(caption.id).toBeTruthy();
    expect(wrapper).toHaveAttribute("aria-labelledby", caption.id);
    // `group`, not `region`: a landmark per table would clutter the landmark list.
    expect(wrapper).toHaveAttribute("role", "group");
    expect(wrapper).toHaveAccessibleName("Q3 invoices");
  });

  it("invents no name when the table has no caption", async () => {
    render(<Fixture />);
    const wrapper = wrapperOf(screen.getByRole("table"));
    setGeometry(wrapper, { scrollWidth: 900, clientWidth: 400 });
    resize();
    await waitFor(() => expect(wrapper).toHaveAttribute("tabindex", "0"));
    // Reachable, but not announced as a generic "scrollable table" region it cannot describe.
    expect(wrapper).not.toHaveAttribute("role");
    expect(wrapper).not.toHaveAttribute("aria-labelledby");
  });

  it("lets a caller's own caption id win", async () => {
    render(
      <Table>
        <TableCaption id="mine">Q3 invoices</TableCaption>
        <TableBody>
          <TableRow>
            <TableCell>INV-001</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const wrapper = wrapperOf(screen.getByRole("table"));
    setGeometry(wrapper, { scrollWidth: 900, clientWidth: 400 });
    resize();
    await waitFor(() => expect(wrapper).toHaveAttribute("aria-labelledby", "mine"));
    expect(screen.getByText("Q3 invoices").id).toBe("mine");
  });

  it("gives two tables on one page distinct caption ids", () => {
    render(
      <>
        <Fixture caption="First" />
        <Fixture caption="Second" />
      </>,
    );
    const a = screen.getByText("First").id;
    const b = screen.getByText("Second").id;
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a).not.toBe(b);
  });
});

describe("the existing public contract is unchanged", () => {
  it("still forwards className to the table, not the wrapper", () => {
    render(
      <Table className="my-table">
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const table = screen.getByRole("table");
    expect(table).toHaveClass("my-table");
    // The wrapper keeps owning the scrolling, and does not absorb the caller's class.
    expect(wrapperOf(table)).not.toHaveClass("my-table");
    expect(wrapperOf(table)).toHaveClass("overflow-auto");
  });

  it("still forwards the ref to the table element", () => {
    const ref = React.createRef<HTMLTableElement>();
    render(
      <Table ref={ref}>
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(ref.current).toBeInstanceOf(HTMLTableElement);
    expect(ref.current).toBe(screen.getByRole("table"));
  });

  it("still spreads arbitrary props onto the table", () => {
    render(
      <Table aria-label="Invoices" data-testid="t">
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const table = screen.getByRole("table", { name: "Invoices" });
    expect(table).toHaveAttribute("data-testid", "t");
  });

  it("carries the library's focus ring rather than a new one", () => {
    render(<Fixture />);
    expect(wrapperOf(screen.getByRole("table")).className).toContain("focus-visible:ring-ring");
  });
});
