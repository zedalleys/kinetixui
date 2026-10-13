import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KinetixDirectionProvider } from "./components/direction-provider";
import { ResultState } from "./components/result-state";
import { ReferenceCode } from "./components/reference-code";
import { PriceBreakdown, PriceBreakdownLine, PriceBreakdownTotal } from "./components/price-breakdown";
import {
  PassCard,
  PassCardCode,
  PassCardDivider,
  PassCardField,
  PassCardFields,
  PassCardFooter,
  PassCardHeader,
  PassCardTitle,
} from "./components/pass-card";

/**
 * components-transactional.test.tsx — the Phase 1 transactional foundations (docs/BUSINESS-CAPABILITY-ROADMAP.md).
 *
 * Three passages, each claiming only what its own assertions prove. jsdom has no layout, so nothing here is
 * evidence about geometry: 200% text, phone width and the rendered RTL mirror are measured in Chromium by
 * scripts/large-text.mjs, and colour contrast by both axe passes over the stories.
 */

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const setClipboard = (value: unknown) =>
  Object.defineProperty(navigator, "clipboard", { value, configurable: true, writable: true });

// kx-verify: interaction

describe("ReferenceCode copy", () => {
  beforeEach(() => setClipboard(undefined));

  it("copies the exact value, reports it, calls onCopy and clears the confirmation", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    const onCopy = vi.fn();
    render(<ReferenceCode label="Booking reference" value="K7Q-2XP" onCopy={onCopy} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy Booking reference" }));
    });

    expect(writeText).toHaveBeenCalledWith("K7Q-2XP");
    expect(onCopy).toHaveBeenCalledWith("K7Q-2XP");
    expect(screen.getByRole("status")).toHaveTextContent("Copied");
    // The button keeps its name — only the status region changes.
    expect(screen.getByRole("button", { name: "Copy Booking reference" })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("when the clipboard is refused, selects the code and says so instead of pretending", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("NotAllowedError")) });
    const onCopy = vi.fn();
    render(<ReferenceCode label="Order number" value="ORD-2026-004519" onCopy={onCopy} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy Order number" }));
    });

    expect(onCopy).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(/couldn't copy/i);
    expect(window.getSelection()?.toString()).toBe("ORD-2026-004519");
  });

  it("with no Clipboard API at all (an insecure context) takes the same honest path", async () => {
    render(<ReferenceCode label="Ticket" value="0742 1189" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy Ticket" }));
    });
    expect(screen.getByRole("status")).toHaveTextContent(/couldn't copy/i);
    expect(window.getSelection()?.toString()).toBe("0742 1189");
  });

  it("copyable={false} renders the code with no button and no status region", () => {
    render(<ReferenceCode label="Ticket" value="0742 1189" copyable={false} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("0742 1189")).toHaveClass("select-all");
  });
});

describe("ResultState in-place updates", () => {
  it("announces a status change through a polite live region only when asked to", () => {
    const { rerender } = render(<ResultState status="pending" title="Transfer processing" announce />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("region", { name: "Transfer processing" })).toHaveAttribute("aria-busy", "true");

    rerender(<ResultState status="success" title="Transfer sent" announce />);
    // Same node, new words — the live region persists across the change, which is what gets it read.
    expect(screen.getByRole("status")).toBe(region);
    expect(region).toHaveTextContent("Transfer sent");
    expect(screen.getByRole("region", { name: "Transfer sent" })).not.toHaveAttribute("aria-busy");

    rerender(<ResultState status="success" title="Transfer sent" />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("renders the primary action before the secondary one", () => {
    render(
      <ResultState
        status="error"
        title="Payment declined"
        primaryAction={<button type="button">Try another card</button>}
        secondaryAction={<button type="button">Contact support</button>}
      />,
    );
    const [first, second] = screen.getAllByRole("button");
    expect(first).toHaveTextContent("Try another card");
    expect(second).toHaveTextContent("Contact support");
  });
});

// kx-verify: accessibility

describe("transactional semantics", () => {
  it("ResultState is a section named by its title, described by its description, with a named status mark", () => {
    const statuses = ["success", "error", "warning", "pending", "info", "partial"] as const;
    const names = ["Success", "Error", "Warning", "In progress", "Information", "Partially complete"];
    statuses.forEach((status, i) => {
      const { unmount } = render(
        <ResultState status={status} title={`Outcome ${status}`} description="What happens next." />,
      );
      const region = screen.getByRole("region", { name: `Outcome ${status}` });
      expect(region).toHaveAccessibleDescription("What happens next.");
      // The status is a word for assistive technology, never only an icon.
      expect(within(region).getByRole("img", { name: names[i] })).toBeInTheDocument();
      expect(within(region).getByRole("heading", { level: 2, name: `Outcome ${status}` })).toBeInTheDocument();
      unmount();
    });
  });

  it("ResultState takes a localised status label, a heading level, and keeps the label when media replaces the mark", () => {
    render(
      <ResultState
        status="success"
        statusLabel="Réussi"
        headingLevel={1}
        title="Paiement reçu"
        media={<img src="data:," alt="" />}
      />,
    );
    expect(screen.getByRole("img", { name: "Réussi" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Paiement reçu" })).toBeInTheDocument();
  });

  it("ReferenceCode is a named group whose copy button names the code it copies (label in name)", () => {
    render(
      <>
        <ReferenceCode label="Booking reference" value="K7Q2XP" />
        <ReferenceCode label="Order number" value="ORD-1" />
      </>,
    );
    expect(screen.getByRole("group", { name: "Booking reference" })).toBeInTheDocument();
    // Two codes on one page get two distinguishable buttons, each containing its visible word "Copy".
    expect(screen.getByRole("button", { name: "Copy Booking reference" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy Order number" })).toBeInTheDocument();
    expect(screen.getByText("K7Q2XP")).toHaveAttribute("translate", "no");
  });

  it("PriceBreakdown is a description list: each line a term and its amount, the total last", () => {
    render(
      <PriceBreakdown aria-label="Price summary">
        <PriceBreakdownLine label="Subtotal" value="€120.00" />
        <PriceBreakdownLine label="Discount" description="Code SPRING10" value="−€12.00" kind="deduction" />
        <PriceBreakdownTotal label="Total" value="€108.00" />
      </PriceBreakdown>,
    );
    const list = screen.getByLabelText("Price summary");
    expect(list.tagName).toBe("DL");
    const terms = within(list).getAllByRole("term").map((t) => t.textContent);
    const amounts = within(list).getAllByRole("definition").map((d) => d.textContent);
    expect(terms).toEqual(["Subtotal", "DiscountCode SPRING10", "Total"]);
    expect(amounts).toEqual(["€120.00", "−€12.00", "€108.00"]);
    // The deduction is marked in data and colour, and its sign is in the text — colour is never the only cue.
    const discount = within(list).getAllByRole("definition")[1];
    expect(discount.parentElement).toHaveAttribute("data-kind", "deduction");
    expect(discount.textContent).toMatch(/^−/);
  });

  it("PassCard is an article named by its title; its code is a named image with a readable caption", () => {
    render(
      <PassCard>
        <PassCardHeader>
          <PassCardTitle>Boarding pass</PassCardTitle>
        </PassCardHeader>
        <PassCardFields>
          <PassCardField label="Gate" emphasis>
            B12
          </PassCardField>
          <PassCardField label="Boards">
            <time dateTime="2026-03-14T09:40">14 Mar, 09:40</time>
          </PassCardField>
        </PassCardFields>
        <PassCardDivider />
        <PassCardCode label="Boarding pass QR code" value="K7Q2XP">
          <svg viewBox="0 0 1 1" />
        </PassCardCode>
        <PassCardFooter>Gate closes 20 minutes before departure.</PassCardFooter>
      </PassCard>,
    );
    const pass = screen.getByRole("article", { name: "Boarding pass" });
    expect(within(pass).getByRole("heading", { level: 3, name: "Boarding pass" })).toBeInTheDocument();
    expect(within(pass).getAllByRole("term").map((t) => t.textContent)).toEqual(["Gate", "Boards"]);
    expect(within(pass).getByRole("separator")).toBeInTheDocument();
    const figure = within(pass).getByRole("figure");
    expect(within(figure).getByRole("img", { name: "Boarding pass QR code" })).toBeInTheDocument();
    expect(figure).toHaveTextContent("K7Q2XP");
    expect(within(pass).getByText("14 Mar, 09:40")).toHaveAttribute("dateTime", "2026-03-14T09:40");
  });

  it("PassCard leaves an explicit aria-label alone", () => {
    render(
      <PassCard aria-label="Parking permit for KX 24 RTL">
        <PassCardTitle>Parking permit</PassCardTitle>
      </PassCard>,
    );
    expect(screen.getByRole("article", { name: "Parking permit for KX 24 RTL" })).not.toHaveAttribute("aria-labelledby");
  });
});

// kx-verify: rtl

describe("transactional foundations under RTL", () => {
  const rtl = (node: React.ReactNode) => <KinetixDirectionProvider dir="rtl">{node}</KinetixDirectionProvider>;

  it("PriceBreakdown puts amounts on the inline end with logical classes, so they mirror", () => {
    render(
      rtl(
        <div dir="rtl">
          <PriceBreakdown aria-label="ملخص السعر">
            <PriceBreakdownLine label="المجموع الفرعي" value="١٢٠٫٠٠ €" />
            <PriceBreakdownTotal label="الإجمالي" value="١٠٨٫٠٠ €" />
          </PriceBreakdown>
        </div>,
      ),
    );
    for (const amount of screen.getAllByRole("definition")) {
      expect(amount).toHaveClass("text-end", "ms-auto");
      expect(amount.className).not.toMatch(/\b(text-right|text-left|ml-auto|mr-auto)\b/);
    }
  });

  it("a start-aligned ResultState and its actions align to the inline start, not the left", () => {
    render(
      rtl(
        <div dir="rtl">
          <ResultState align="start" status="success" title="تم تأكيد الحجز" primaryAction={<button type="button">عرض</button>} />
        </div>,
      ),
    );
    const region = screen.getByRole("region", { name: "تم تأكيد الحجز" });
    expect(region).toHaveClass("text-start", "items-start");
    expect(region.querySelector("[data-slot=result-state-actions]")).toHaveClass("justify-start");
    expect(region.outerHTML).not.toMatch(/\b(text-left|text-right|left-|right-|ml-|mr-|pl-|pr-)/);
  });

  it("PassCard and ReferenceCode carry no physical-direction classes, so their layout follows dir", () => {
    const { container } = render(
      rtl(
        <div dir="rtl">
          <ReferenceCode label="رقم الحجز" value="K7Q2XP" />
          <PassCard>
            <PassCardHeader>
              <PassCardTitle>تصريح موقف</PassCardTitle>
            </PassCardHeader>
            <PassCardFields>
              <PassCardField label="الموقف">C-14</PassCardField>
            </PassCardFields>
            <PassCardDivider />
            <PassCardCode label="رمز التصريح" value="PRK-C14">
              <svg viewBox="0 0 1 1" />
            </PassCardCode>
            <PassCardFooter>اعرضه على لوحة القيادة.</PassCardFooter>
          </PassCard>
        </div>,
      ),
    );
    expect(screen.getByRole("article", { name: "تصريح موقف" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy رقم الحجز" })).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/\b(text-left|text-right|left-|right-|ml-|mr-|pl-|pr-|rounded-l|rounded-r|border-l|border-r)/);
  });
});
