import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KinetixDirectionProvider } from "./components/direction-provider";
import { AmountDisplay } from "./components/amount-display";
import { Timeline, type TimelineItem } from "./components/timeline";
import { NumberInput } from "./components/number-input";
import { GuestPicker, type GuestCategory } from "./components/guest-picker";
import { CountrySelect, type CountryOption } from "./components/country-select";
import { PhoneInput, type PhoneCountry, type PhoneValue } from "./components/phone-input";
import { DateRangeInput, type DateRangeValue } from "./components/date-range-input";
import { TimeSlotPicker, type TimeSlotGroup } from "./components/time-slot-picker";
import { AddressFields, type AddressFieldConfig } from "./components/address-fields";
import { Calendar } from "./components/calendar";

/**
 * components-business.test.tsx — the Phase 2 money, status and booking foundations
 * (docs/BUSINESS-CAPABILITY-ROADMAP.md).
 *
 * Three passages, each claiming only what its own assertions prove. jsdom has no layout, so nothing here is
 * evidence about geometry: 200% text, phone width and the rendered RTL mirror are measured in Chromium by
 * scripts/large-text.mjs, and colour contrast by both axe passes over the stories.
 */

afterEach(() => cleanup());

const COUNTRIES: CountryOption[] = [
  { code: "SA", name: "Saudi Arabia" },
  { code: "AE", name: "United Arab Emirates", keywords: ["UAE"] },
  { code: "GB", name: "United Kingdom", keywords: ["UK"] },
  { code: "US", name: "United States" },
];

const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "SA", name: "Saudi Arabia", callingCode: "966" },
  { code: "GB", name: "United Kingdom", callingCode: "44" },
  { code: "US", name: "United States", callingCode: "1" },
  { code: "CA", name: "Canada", callingCode: "1" },
  { code: "AG", name: "Antigua and Barbuda", callingCode: "1268" },
];

const GUESTS: GuestCategory[] = [
  { id: "adults", label: "Adults", description: "13 or older", min: 1 },
  { id: "children", label: "Children", description: "Ages 2–12" },
  { id: "infants", label: "Infants", description: "Under 2", max: 2 },
];

const SLOTS: TimeSlotGroup[] = [
  {
    label: "Morning",
    slots: [
      { value: "09:00", label: "09:00" },
      { value: "09:30", label: "09:30", unavailable: true },
      { value: "10:00", label: "10:00", note: "2 left" },
    ],
  },
  { label: "Afternoon", slots: [{ value: "14:00", label: "14:00" }] },
];

// kx-verify: interaction

function Phone({ initial, onRaw }: { initial: PhoneValue; onRaw: (raw: string, value: PhoneValue) => void }) {
  const [value, setValue] = React.useState(initial);
  return (
    <PhoneInput
      label="Mobile number"
      countries={PHONE_COUNTRIES}
      value={value}
      onValueChange={({ raw, ...next }) => {
        setValue(next);
        onRaw(raw, next);
      }}
    />
  );
}

function Guests({ maxTotal, onChange }: { maxTotal?: number; onChange?: (v: Record<string, number>) => void }) {
  const [value, setValue] = React.useState<Record<string, number>>({ adults: 2, children: 0, infants: 0 });
  return (
    <GuestPicker
      label="Guests"
      categories={GUESTS}
      value={value}
      maxTotal={maxTotal}
      totalHint="You can book up to 3 guests."
      onValueChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

function Range({ initial, onChange, ...rest }: { initial: DateRangeValue; onChange?: (v: DateRangeValue) => void } & Partial<React.ComponentProps<typeof DateRangeInput>>) {
  const [value, setValue] = React.useState(initial);
  return (
    <DateRangeInput
      label="Stay"
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
      locale="en-GB"
      {...rest}
    />
  );
}

describe("Phase 2 behaviour", () => {
  it("NumberInput keeps focus on a stepper at its bound, ignores the press and announces each step", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <NumberInput
        aria-label="Tickets"
        defaultValue={1}
        min={0}
        max={2}
        incrementLabel="Add a ticket"
        decrementLabel="Remove a ticket"
        formatAnnouncement={(n) => `${n} tickets`}
        onChange={onChange}
      />,
    );
    const add = screen.getByRole("button", { name: "Add a ticket" });
    await user.click(add);
    expect(onChange).toHaveBeenLastCalledWith(2);
    expect(screen.getByRole("status")).toHaveTextContent("2 tickets");
    // At max the button is unavailable but still focused — a `disabled` button would have dropped focus.
    expect(add).toHaveAttribute("aria-disabled", "true");
    expect(add).not.toBeDisabled();
    expect(add).toHaveFocus();
    await user.click(add);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("spinbutton", { name: "Tickets" })).toHaveValue(2);
    // The same holds at the minimum, pressing Remove down to 0.
    const remove = screen.getByRole("button", { name: "Remove a ticket" });
    await user.click(remove);
    await user.click(remove);
    expect(screen.getByRole("status")).toHaveTextContent("0 tickets");
    expect(remove).toHaveAttribute("aria-disabled", "true");
    expect(remove).not.toBeDisabled();
    expect(remove).toHaveFocus();
    await user.click(remove);
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("GuestPicker steps each consumer category, summarises it and enforces the total cap", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Guests maxTotal={3} onChange={onChange} />);
    const trigger = screen.getByRole("button", { name: "Guests Adults: 2" });
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Guests" });
    await user.click(within(dialog).getByRole("button", { name: "Increase Children" }));
    expect(onChange).toHaveBeenLastCalledWith({ adults: 2, children: 1, infants: 0 });
    expect(screen.getByRole("button", { name: "Guests Adults: 2, Children: 1" })).toBeInTheDocument();
    // The total is 3 = maxTotal: every increment is unavailable, and the hint is announced.
    for (const name of ["Increase Adults", "Increase Children", "Increase Infants"]) {
      expect(within(dialog).getByRole("button", { name })).toHaveAttribute("aria-disabled", "true");
    }
    expect(within(dialog).getAllByRole("status").some((s) => s.textContent === "You can book up to 3 guests.")).toBe(true);
    // Adults has min 1: two decrements stop at 1.
    await user.click(within(dialog).getByRole("button", { name: "Decrease Adults" }));
    await user.click(within(dialog).getByRole("button", { name: "Decrease Adults" }));
    expect(onChange).toHaveBeenLastCalledWith({ adults: 1, children: 1, infants: 0 });
  });

  it("CountrySelect searches by name, code and keyword, reports the code and submits it", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(
      <CountrySelect label="Country" countries={COUNTRIES} onValueChange={onValueChange} name="country" showCode />,
    );
    await user.click(screen.getByRole("button", { name: "Country Select a country" }));
    const search = await screen.findByRole("combobox", { name: "Search countries" });
    await user.type(search, "uae");
    // cmdk ranks the keyword match first.
    expect(screen.getAllByRole("option")[0]).toHaveTextContent("United Arab EmiratesAE");
    await user.clear(search);
    await user.type(search, "saud");
    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("SA");

    // Controlled: the trigger shows the chosen name and the hidden input carries the code.
    cleanup();
    const { container: c2 } = render(<CountrySelect label="Country" countries={COUNTRIES} value="GB" name="country" />);
    expect(screen.getByRole("button", { name: "Country United Kingdom" })).toBeInTheDocument();
    expect(c2.querySelector("input[type=hidden][name=country]")).toHaveValue("GB");
    expect(container).toBeTruthy();
  });

  it("PhoneInput keeps the displayed number as typed and reports raw digits with the calling code", async () => {
    const user = userEvent.setup();
    const onRaw = vi.fn();
    render(<Phone initial={{ country: "SA", national: "" }} onRaw={onRaw} />);
    const input = screen.getByRole("textbox", { name: "Mobile number" });
    await user.type(input, "50 12a3-45");
    expect(input).toHaveValue("50 123-45");
    expect(onRaw).toHaveBeenLastCalledWith("+9665012345", { country: "SA", national: "50 123-45" });
    // Changing the country keeps the number.
    await user.selectOptions(screen.getByRole("combobox", { name: "Country code" }), "GB");
    expect(onRaw).toHaveBeenLastCalledWith("+445012345", { country: "GB", national: "50 123-45" });
  });

  it("PhoneInput paste picks the longest matching calling code and keeps the chosen country on a shared code", () => {
    const onRaw = vi.fn();
    render(<Phone initial={{ country: "CA", national: "" }} onRaw={onRaw} />);
    const input = screen.getByRole("textbox", { name: "Mobile number" });
    const paste = (text: string) => fireEvent.paste(input, { clipboardData: { getData: () => text } });

    paste("+1 (416) 555-0100");
    expect(onRaw).toHaveBeenLastCalledWith("+14165550100", { country: "CA", national: "4165550100" });
    paste("+1 268 464 1234");
    expect(onRaw).toHaveBeenLastCalledWith("+12684641234", { country: "AG", national: "4641234" });
    paste("0044 20 7946 0958");
    expect(onRaw).toHaveBeenLastCalledWith("+442079460958", { country: "GB", national: "2079460958" });
    expect(screen.getByRole("combobox", { name: "Country code" })).toHaveValue("GB");
  });

  it("DateRangeInput reports calendar dates as ISO strings, respects min and shows an open end", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Range initial={{}} min="2026-03-10" max="2026-03-31" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Stay Select dates" }));
    const grid = await screen.findByRole("grid");
    // Before `min` is disabled; picking 14 then 16 March gives a range of plain dates, no time, no zone.
    expect(within(grid).getByRole("button", { name: /9 March 2026|March 9/ })).toBeDisabled();
    await user.click(within(grid).getByRole("button", { name: /14 March 2026|March 14/ }));
    expect(onChange).toHaveBeenLastCalledWith({ start: "2026-03-14", end: undefined });
    await user.click(within(grid).getByRole("button", { name: /16 March 2026|March 16/ }));
    expect(onChange).toHaveBeenLastCalledWith({ start: "2026-03-14", end: "2026-03-16" });
    expect(screen.getByRole("button", { name: "Stay 14 Mar 2026 – 16 Mar 2026" })).toBeInTheDocument();

    cleanup();
    render(<Range initial={{ start: "2026-03-14" }} openEndLabel="open" />);
    expect(screen.getByRole("button", { name: "Stay 14 Mar 2026 – open" })).toBeInTheDocument();
  });

  it("TimeSlotPicker moves with the arrow keys across periods, skips unavailable slots and selects", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TimeSlotPicker label="Pickup time" groups={SLOTS} onValueChange={onValueChange} />);
    await user.tab();
    expect(screen.getByRole("radio", { name: "09:00" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: /^10:00/ })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "14:00" })).toHaveFocus();
    await user.keyboard(" ");
    expect(onValueChange).toHaveBeenLastCalledWith("14:00");
    expect(screen.getByRole("radio", { name: "14:00" })).toBeChecked();
  });

  it("TimeSlotPicker shows its empty message instead of a grid of unavailable tiles", () => {
    render(
      <TimeSlotPicker
        label="Pickup time"
        groups={[{ slots: [{ value: "a", label: "09:00", unavailable: true }] }]}
        emptyMessage="Fully booked today."
      />,
    );
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Fully booked today.");
  });

  it("AddressFields renders the consumer's order, autofill tokens, requiredness, errors and custom controls", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const fields: AddressFieldConfig[] = [
      { name: "postalCode", label: "Postal code", required: true, width: "half", inputMode: "numeric" },
      { name: "administrativeArea", label: "Prefecture", required: true, width: "half" },
      { name: "locality", label: "City", required: true },
      { name: "street", label: "Street address", required: true },
      { name: "building", label: "Building" },
      {
        name: "country",
        label: "Country",
        render: ({ id, label, value, onChange, autoComplete }) => (
          <select id={id} aria-label={label} value={value} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)}>
            <option value="JP">Japan</option>
            <option value="SA">Saudi Arabia</option>
          </select>
        ),
      },
    ];
    render(
      <AddressFields
        legend="Shipping address"
        section="shipping"
        fields={fields}
        value={{ country: "JP" }}
        onValueChange={onValueChange}
        errors={{ postalCode: "Enter a 7-digit postal code." }}
      />,
    );
    const group = screen.getByRole("group", { name: "Shipping address" });
    const inputs = within(group).getAllByRole("textbox");
    expect(inputs.map((i) => i.getAttribute("name"))).toEqual(["postalCode", "administrativeArea", "locality", "street", "building"]);
    expect(inputs.map((i) => i.getAttribute("autocomplete"))).toEqual([
      "shipping postal-code",
      "shipping address-level1",
      "shipping address-level2",
      "shipping address-line1",
      "shipping address-line2",
    ]);
    const postal = screen.getByRole("textbox", { name: "Postal code" });
    expect(postal).toBeRequired();
    expect(postal).toHaveAttribute("aria-invalid", "true");
    expect(postal).toHaveAccessibleDescription("Enter a 7-digit postal code.");
    expect(screen.getByRole("textbox", { name: "Building (optional)" })).not.toBeRequired();
    await user.type(screen.getByRole("textbox", { name: "City" }), "K");
    expect(onValueChange).toHaveBeenLastCalledWith({ country: "JP", locality: "K" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Country" }), "SA");
    expect(onValueChange).toHaveBeenLastCalledWith({ country: "SA" });
    expect(screen.getByRole("combobox", { name: "Country" })).toHaveAttribute("autocomplete", "shipping country-name");
  });
});

// kx-verify: accessibility

describe("Phase 2 semantics", () => {
  it("AmountDisplay speaks its sign as a word and does not rely on colour", () => {
    render(
      <>
        <AmountDisplay data-testid="refund" value="25.00" currency="SAR" sign="negative" tone="positive" />
        <AmountDisplay data-testid="delta" value="14.2%" sign="positive" signLabels={{ positive: "زيادة" }} />
        <AmountDisplay data-testid="label" value="1,250.00" currency="SAR" accessibleLabel="1,250 Saudi riyals" />
      </>,
    );
    const refund = screen.getByTestId("refund");
    // A real minus glyph is visible, and a spoken word precedes it for readers that skip U+2212.
    expect(refund.textContent).toBe("minus \u2212SAR\u00a025.00");
    expect(refund.querySelector(".sr-only")).toHaveTextContent("minus");
    expect(refund).toHaveAttribute("data-tone", "positive");
    expect(screen.getByTestId("delta").querySelector(".sr-only")).toHaveTextContent("زيادة");
    // A replacement label hides the visible run from the accessibility tree, so the value is read once.
    const labelled = screen.getByTestId("label");
    expect(labelled.querySelector("[aria-hidden=true]")?.textContent).toBe("SAR\u00a01,250.00");
    expect(labelled.querySelector(".sr-only")).toHaveTextContent("1,250 Saudi riyals");
    expect(labelled).toHaveClass("tabular-nums");
  });

  it("Timeline states each status in words, marks the current step and stays silent without statuses", () => {
    const items: TimelineItem[] = [
      { title: "Order placed", status: "complete", time: "12 Mar" },
      { title: "Payment retry", status: "warning", statusLabel: "Action needed" },
      { title: "Out for delivery", status: "current" },
      { title: "Delivered", status: "pending" },
    ];
    const { container } = render(<Timeline aria-label="Order history" items={items} statusLabels={{ pending: "Not yet" }} />);
    const list = screen.getByRole("list", { name: "Order history" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows.map((r) => r.querySelector(".sr-only")?.textContent)).toEqual([
      "Completed, ",
      "Action needed, ",
      "Current, ",
      "Not yet, ",
    ]);
    expect(rows[2]).toHaveAttribute("aria-current", "step");
    // Each status has its own marker shape, hidden from assistive technology (the words carry the state).
    expect([...container.querySelectorAll("[data-status][aria-hidden]")].map((m) => m.getAttribute("data-status"))).toEqual([
      "complete",
      "warning",
      "current",
      "pending",
    ]);

    cleanup();
    render(<Timeline items={[{ title: "Created" }, { title: "Shipped" }]} />);
    expect(document.querySelector(".sr-only")).toBeNull();
    expect(document.querySelector("[aria-current]")).toBeNull();
  });

  it("TimeSlotPicker is a named radio group with labelled periods, a described time zone and spoken unavailability", () => {
    render(<TimeSlotPicker label="Pickup time" groups={SLOTS} timeZoneLabel="Times in Riyadh (GMT+3)" />);
    const group = screen.getByRole("radiogroup", { name: "Pickup time" });
    expect(group).toHaveAccessibleDescription("Times in Riyadh (GMT+3)");
    expect(within(group).getByRole("group", { name: "Morning" })).toBeInTheDocument();
    const closed = screen.getByRole("radio", { name: "09:30, Unavailable" });
    expect(closed).toBeDisabled();
    expect(screen.getByRole("radio", { name: "10:00, 2 left" })).toBeEnabled();
  });

  it("field triggers are named by their label plus their current value", () => {
    render(
      <>
        <GuestPicker label="Travellers" categories={GUESTS} value={{ adults: 1 }} onValueChange={() => {}} />
        <CountrySelect label="Country" countries={COUNTRIES} value="SA" />
        <DateRangeInput label="Dates" value={{ start: "2026-03-14", end: "2026-03-16" }} onValueChange={() => {}} locale="en-GB" />
        <PhoneInput label="Phone" countries={PHONE_COUNTRIES} value={{ country: "SA", national: "" }} onValueChange={() => {}} />
      </>,
    );
    expect(screen.getByRole("button", { name: "Travellers Adults: 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Country Saudi Arabia" })).toHaveAttribute("aria-haspopup", "listbox");
    expect(screen.getByRole("button", { name: "Dates 14 Mar 2026 – 16 Mar 2026" })).toBeInTheDocument();
    const phone = screen.getByRole("textbox", { name: "Phone" });
    expect(phone).toHaveAttribute("type", "tel");
    expect(phone).toHaveAttribute("autocomplete", "tel-national");
    // The code select's option text is the full country name, which is what a screen reader hears.
    expect(screen.getByRole("combobox", { name: "Country code" })).toHaveDisplayValue("Saudi Arabia (+966)");
  });
});

// kx-verify: rtl

describe("Phase 2 foundations under RTL", () => {
  const rtl = (node: React.ReactNode) => (
    <KinetixDirectionProvider dir="rtl">
      <div dir="rtl">{node}</div>
    </KinetixDirectionProvider>
  );
  const PHYSICAL =
    /\b(text-left|text-right|left-\d|right-\d|ml-\S|mr-\S|pl-\d|pr-\d|rounded-[lr]\b|rounded-[lr]-|border-[lr]\b|border-[lr]-\d|space-x-)/;

  it("PhoneInput is one left-to-right run inside an Arabic form, with its label following the page", () => {
    render(
      rtl(
        <PhoneInput label="رقم الجوال" countries={PHONE_COUNTRIES} value={{ country: "SA", national: "50 123 4567" }} onValueChange={() => {}} />,
      ),
    );
    const input = screen.getByRole("textbox", { name: "رقم الجوال" });
    expect(input.closest("[data-slot=phone-input]")).toHaveAttribute("dir", "ltr");
    expect(screen.getByText("رقم الجوال").closest("[dir=ltr]")).toBeNull();
  });

  it("AmountDisplay is its own bidi run, so a Latin or an Arabic amount keeps its order inside RTL text", () => {
    render(
      rtl(
        <p>
          المبلغ <AmountDisplay data-testid="a" value="25.00" currency="SAR" sign="negative" /> و{" "}
          <AmountDisplay data-testid="b" value="١٬٢٥٠" currency="ر.س" currencyPosition="after" />
        </p>,
      ),
    );
    for (const id of ["a", "b"]) {
      expect(screen.getByTestId(id).querySelector("[dir]")).toHaveAttribute("dir", "auto");
    }
  });

  it("Timeline places alternating content with logical alignment, never text-right", () => {
    const { container } = render(
      rtl(<Timeline alternating items={[{ title: "أ", status: "complete" }, { title: "ب", status: "current", action: <button type="button">تتبع</button> }]} />),
    );
    const bodies = container.querySelectorAll("li > div.pb-6");
    expect(bodies[1]).toHaveClass("text-end");
    expect(container.innerHTML).not.toMatch(PHYSICAL);
  });

  it("Calendar mirrors its navigation and swaps the chevrons inside an RTL provider", () => {
    const { container } = render(rtl(<Calendar mode="range" defaultMonth={new Date(2026, 2, 1)} />));
    const previous = screen.getByRole("button", { name: /previous/i });
    const next = screen.getByRole("button", { name: /next/i });
    expect(previous).toHaveClass("start-1");
    expect(next).toHaveClass("end-1");
    // react-day-picker receives dir="rtl": "previous" points right (toward the inline start) and the arrow
    // keys follow the mirrored grid.
    expect(previous.querySelector("svg")).toHaveClass("lucide-chevron-right");
    expect(next.querySelector("svg")).toHaveClass("lucide-chevron-left");
    expect(container.innerHTML).not.toMatch(PHYSICAL);
  });

  it("the Phase 2 fields carry no physical-direction classes, so their layout follows dir", async () => {
    const { container } = render(
      rtl(
        <>
          <GuestPicker label="الضيوف" categories={GUESTS} value={{ adults: 2 }} onValueChange={() => {}} open />
          <CountrySelect label="الدولة" countries={COUNTRIES} value="SA" showCode />
          <DateRangeInput label="الإقامة" value={{ start: "2026-03-14" }} onValueChange={() => {}} />
          <TimeSlotPicker label="وقت الاستلام" groups={SLOTS} />
          <AddressFields
            legend="عنوان الشحن"
            fields={[{ name: "district", label: "الحي", width: "half" }, { name: "street", label: "الشارع", required: true }]}
            value={{}}
            onValueChange={() => {}}
          />
          <AmountDisplay value="1,250.00" currency="SAR" />
        </>,
      ),
    );
    await act(async () => {});
    expect(container.innerHTML).not.toMatch(PHYSICAL);
    // The open GuestPicker panel is portaled; it is held to the same rule.
    expect(screen.getByRole("dialog", { name: "الضيوف" }).innerHTML).not.toMatch(PHYSICAL);
  });
});
