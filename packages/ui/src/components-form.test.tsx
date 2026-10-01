import * as React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { useForm } from "react-hook-form";
import { KinetixDirectionProvider } from "./components/direction-provider";
import { Input } from "./components/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./components/input-otp";
import { Label } from "./components/label";
import { MultiSelect } from "./components/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/select";
import { Slider } from "./components/slider";
import { Textarea } from "./components/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./components/form";

/**
 * components-form.test.tsx — the form family's state contract and its behaviour under RTL.
 *
 * The keyboard half lives in `components-keyboard.test.tsx`, because that file is what
 * `scripts/gen-keyboard.mjs` turns into each component's published keyboard model. What is here is
 * everything else a form control has to get right and nothing was asserting: which of `value` and
 * `defaultValue` owns the state, that a handler fires once with the requested value, that disabled and
 * read-only differ in the way they are supposed to differ, and that an invalid field is wired to the
 * message that explains it.
 *
 * jsdom has no layout, so direction assertions here are about the contract — the rendered class is the
 * logical one, and direction-dependent key handling mirrors. Geometry is the browser pass's job:
 * `scripts/large-text.mjs` measures these controls, and the InputOTP mirror below was found by measuring
 * it rather than by reading it.
 *
 * kx-verify: interaction
 */

beforeAll(() => {
  // `input-otp` polls document.elementFromPoint to track the caret's slot; jsdom has no such method, and
  // unstubbed it throws from a timer after the test that triggered it has already passed.
  (document as unknown as { elementFromPoint: () => Element | null }).elementFromPoint = () => null;
});

const OPTIONS = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
];

describe("Input and Textarea state", () => {
  it("keep their own value when uncontrolled, and restore it on form reset", async () => {
    const user = userEvent.setup();
    render(
      <form>
        <Input aria-label="Nickname" defaultValue="start" />
        <button type="reset">Reset</button>
      </form>,
    );
    const field = screen.getByLabelText("Nickname") as HTMLInputElement;
    await user.clear(field);
    await user.type(field, "typed");
    expect(field.value).toBe("typed");

    // `defaultValue` is the form's reset value, which is the whole reason to prefer it over state here.
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(field.value).toBe("start");
  });

  it("stay controlled when given a value, and take an external update", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Controlled() {
      const [value, setValue] = React.useState("a");
      return (
        <>
          <Input
            aria-label="Code"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setValue(e.target.value);
            }}
          />
          <button onClick={() => setValue("from outside")}>Set</button>
        </>
      );
    }
    render(<Controlled />);
    const field = screen.getByLabelText("Code") as HTMLInputElement;
    await user.type(field, "b");
    expect(onChange).toHaveBeenCalledExactlyOnceWith("ab");
    expect(field.value).toBe("ab");

    await user.click(screen.getByRole("button", { name: "Set" }));
    expect(field.value).toBe("from outside");
  });

  it("distinguish disabled from read-only: one is out of reach, the other is readable but not editable", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Input aria-label="Disabled" disabled defaultValue="d" />
        <Textarea aria-label="Read-only" readOnly defaultValue="r" />
      </>,
    );
    const disabled = screen.getByLabelText("Disabled") as HTMLInputElement;
    const readOnly = screen.getByLabelText("Read-only") as HTMLTextAreaElement;
    expect(disabled).toBeDisabled();
    expect(readOnly).not.toBeDisabled();
    expect(readOnly).toHaveAttribute("readonly");

    await user.type(disabled, "x");
    await user.type(readOnly, "x");
    expect(disabled.value).toBe("d");
    expect(readOnly.value).toBe("r");
  });

  it("marks itself invalid from the design-source Error state, and not otherwise", () => {
    const { rerender } = render(<Input aria-label="Email" />);
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid", "true");
    rerender(<Input aria-label="Email" state="Error" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    // An explicit prop still wins: `state` is a design-source variant, not an override of the consumer.
    rerender(<Input aria-label="Email" state="Error" aria-invalid={false} />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "false");
  });

  it("pins the native disabled attribute when the design-source state says Disabled", () => {
    render(<Input aria-label="Pinned" state="Disabled" />);
    // Not just an opacity class: a field that only looks disabled is still typeable.
    expect(screen.getByLabelText("Pinned")).toBeDisabled();
  });
});

describe("InputOTP layout", () => {
  it("lets its slots wrap rather than push the page sideways", () => {
    render(
      <InputOTP maxLength={6} aria-label="One-time code">
        <InputOTPGroup data-testid="group">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <InputOTPSlot key={i} index={i} />
          ))}
        </InputOTPGroup>
      </InputOTP>,
    );
    // Measured at 390px with the root font size doubled: six 72px slots made a 432px row and the document
    // gained 106px of horizontal scrolling. jsdom cannot see that; what it can hold is the class that
    // fixes it, so the geometry check in scripts/large-text.mjs and this assertion fail together.
    expect(screen.getByTestId("group")).toHaveClass("flex-wrap");
  });
});

describe("Label", () => {
  it("names the control it points at, and the one it wraps", () => {
    render(
      <>
        <Label htmlFor="explicit">Explicit</Label>
        <Input id="explicit" />
        <Label>
          Wrapping
          <Input />
        </Label>
      </>,
    );
    expect(screen.getByLabelText("Explicit")).toHaveAttribute("id", "explicit");
    expect(screen.getByLabelText("Wrapping")).toBeInstanceOf(HTMLInputElement);
  });
});

describe("Form validation", () => {
  function Example() {
    const form = useForm({ defaultValues: { email: "" } });
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(() => {})}>
          <FormField
            name="email"
            rules={{ required: "Email is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>We never share it.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <button type="submit">Save</button>
        </form>
      </Form>
    );
  }

  it("associates the label, the description and — once it fails — the message with the control", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const field = screen.getByLabelText("Email");
    expect(field).toHaveAttribute("aria-invalid", "false");
    const describedBefore = field.getAttribute("aria-describedby") ?? "";
    expect(describedBefore).toBe(screen.getByText("We never share it.").id);

    await user.click(screen.getByRole("button", { name: "Save" }));
    const message = await screen.findByText("Email is required");
    expect(field).toHaveAttribute("aria-invalid", "true");
    // Both, in order: the help text does not disappear because an error arrived.
    expect(field.getAttribute("aria-describedby")?.split(" ")).toEqual([describedBefore, message.id]);
  });

  it("moves focus to the failing control, which is what makes the message heard", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Email is required");
    // There is no live region here, and deliberately so: react-hook-form focuses the first invalid
    // field, and a focused control is announced with its description — which now carries the message.
    // A `role="alert"` on top of that would read the same sentence twice.
    expect(screen.getByLabelText("Email")).toHaveFocus();
  });

  it("renders no message element at all while the field is valid", () => {
    render(<Example />);
    expect(screen.queryByText("Email is required")).toBeNull();
  });
});

describe("Select state", () => {
  it("stays on the controlled value until the consumer changes it, reporting the request once", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Select value="apple" onValueChange={onValueChange}>
        <SelectTrigger aria-label="Fruit">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>,
    );
    // Opened from the keyboard: Radix's Select tracks pointer type and does not open from a synthetic
    // click in jsdom. Enter reaches the same open/select code path.
    await user.tab();
    await user.keyboard("{Enter}");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("banana");
    // Controlled means controlled: the trigger must not move on its own.
    expect(screen.getByRole("combobox", { name: "Fruit" })).toHaveTextContent("Apple");
  });

  it("keeps its own selection when uncontrolled", async () => {
    const user = userEvent.setup();
    render(
      <Select defaultValue="apple">
        <SelectTrigger aria-label="Fruit">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>,
    );
    await user.tab();
    await user.keyboard("{Enter}");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Fruit" })).toHaveTextContent("Banana"));
  });
});

describe("MultiSelect state", () => {
  it("shows only the controlled value, and asks for the full next selection", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<MultiSelect aria-label="Fruit" options={OPTIONS} value={["apple"]} onValueChange={onValueChange} />);
    const combobox = screen.getByRole("combobox", { name: "Fruit" });
    expect(within(combobox).getByText("Apple")).toBeInTheDocument();

    await user.click(combobox);
    await user.click(await screen.findByRole("option", { name: "Banana" }));
    // The whole array, not a delta — and once.
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(["apple", "banana"]);
    expect(within(screen.getByRole("combobox", { name: "Fruit" })).queryByText("Banana")).toBeNull();
  });

  it("adds and removes its own chips when uncontrolled", async () => {
    const user = userEvent.setup();
    render(<MultiSelect aria-label="Fruit" options={OPTIONS} defaultValue={["apple"]} />);
    const chips = () => within(screen.getByRole("combobox", { name: "Fruit" }));
    expect(chips().getByText("Apple")).toBeInTheDocument();

    await user.click(chips().getByRole("button", { name: "Remove Apple" }));
    expect(chips().queryByText("Apple")).toBeNull();
    expect(screen.getByText("Select…")).toBeInTheDocument();
  });
});

// kx-verify: interaction, rtl

describe("The form family under RTL", () => {
  const rtl = (node: React.ReactNode) => <KinetixDirectionProvider dir="rtl">{node}</KinetixDirectionProvider>;

  it("moves <Slider> with the arrow that points the way the track now runs", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(rtl(<Slider aria-label="Volume" defaultValue={[50]} max={100} onValueChange={onValueChange} />));
    await user.tab();
    expect(screen.getByRole("slider", { name: "Volume" })).toHaveFocus();

    // Under RTL the track's high end is on the left, so Arrow right must *decrease* — the arrow follows
    // what the user sees, not the axis. This is Radix reading KinetixDirectionProvider: it is a React
    // context, so a `dir` attribute in the DOM alone would mirror the pixels and not the keys.
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith([49]);
    await user.keyboard("{ArrowLeft}");
    expect(onValueChange).toHaveBeenLastCalledWith([50]);

    // Home and End name the ends of the range, not the sides of the screen, so they do not mirror.
    await user.keyboard("{Home}");
    expect(onValueChange).toHaveBeenLastCalledWith([0]);
    await user.keyboard("{End}");
    expect(onValueChange).toHaveBeenLastCalledWith([100]);
  });

  it("gives <InputOTP> slots logical borders, so the group's ends are its ends in either direction", () => {
    render(
      rtl(
        <InputOTP maxLength={3} aria-label="One-time code">
          <InputOTPGroup>
            {[0, 1, 2].map((i) => (
              <InputOTPSlot key={i} index={i} data-testid={`slot-${i}`} />
            ))}
          </InputOTPGroup>
        </InputOTP>,
      ),
    );
    const slot = screen.getByTestId("slot-0");
    // The slots are a flex row, so RTL reverses them and the first slot moves to the right-hand end.
    // With a physical divider and a physical radius the rounded corners and the open edge stayed on the
    // left: measured in Chromium, both radii landed on the group's *inner* edges, the divider after the
    // first slot doubled to 2px, and the left-hand outer edge had no border at all.
    //
    // Each slot is bordered on every side and pulled back a pixel, rather than sharing one neighbour's
    // divider, so that a row which wraps is still closed at the end it starts from — see the comment in
    // input-otp.tsx, and the geometry check in scripts/large-text.mjs.
    expect(slot).toHaveClass("border", "[&:not(:first-child)]:-ms-px", "first:rounded-s-md", "last:rounded-e-md");
    expect(slot.className).not.toMatch(/\bborder-[rl]\b|\brounded-[lr]-|\bborder-[ye]\b/);
  });

  it("aligns <MultiSelect>'s create row and its search icon to the inline start", async () => {
    const user = userEvent.setup();
    render(rtl(<MultiSelect aria-label="Fruit" options={OPTIONS} creatable />));
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    const search = await screen.findByPlaceholderText("Search…");
    // CommandInput's magnifier sat at `mr-2`, which under RTL is a gap on the far side of the icon and
    // none between the icon and the field it belongs to.
    const icon = search.closest("[cmdk-input-wrapper]")?.querySelector("svg");
    expect(icon).toHaveClass("me-2");
    expect(icon?.getAttribute("class")).not.toMatch(/\bmr-2\b/);

    await user.type(search, "Durian");
    const create = await screen.findByRole("button", { name: /Durian/ });
    expect(create).toHaveClass("text-start");
    expect(create.className).not.toMatch(/\btext-left\b/);
  });

  it("hangs <MultiSelect>'s chip remove control off the inline end", async () => {
    render(rtl(<MultiSelect aria-label="Fruit" options={OPTIONS} defaultValue={["apple"]} />));
    // Tag's "x" is positioned by flex order, but its own margins were physical: a 2px nudge toward the
    // right-hand edge of a chip whose end is on the left.
    const remove = screen.getByRole("button", { name: "Remove Apple" });
    expect(remove).toHaveClass("-me-0.5", "ms-0.5");
    expect(remove.className).not.toMatch(/-mr-0\.5|\bml-0\.5\b/);
  });

  it("keeps <Select>'s tick gutter and label padding on the inline start", async () => {
    const user = userEvent.setup();
    render(
      rtl(
        <Select>
          <SelectTrigger aria-label="Fruit">
            <SelectValue placeholder="Pick one" />
          </SelectTrigger>
          <SelectContent>
            {OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      ),
    );
    await user.tab();
    await user.keyboard("{Enter}");
    const option = await screen.findByRole("option", { name: "Apple" });
    expect(option).toHaveClass("ps-8", "pe-2");
    expect(option.className).not.toMatch(/\bpl-8\b|\bpr-2\b/);
  });

  it("leaves <Input> and <Textarea> to the browser's own bidi handling", async () => {
    const user = userEvent.setup();
    render(
      rtl(
        <>
          <Input aria-label="عنوان" placeholder="اكتب هنا" />
          <Textarea aria-label="ملاحظات" />
        </>,
      ),
    );
    const field = screen.getByLabelText("عنوان") as HTMLInputElement;
    // Both are single symmetric `px-3` boxes with no adornment and no `text-left`, so there is nothing
    // to mirror: direction, caret and placeholder alignment are inherited, which is the correct answer
    // for a field that may hold Arabic, Latin or both. Pinned so an adornment cannot be added later
    // without a direction decision.
    for (const el of [field, screen.getByLabelText("ملاحظات")]) {
      expect(el.className).not.toMatch(/\bp[lr]-\d|\bm[lr]-\d|\btext-(?:left|right)\b|\bborder-[lr]\b/);
    }
    await user.type(field, "مرحبا abc");
    expect(field.value).toBe("مرحبا abc");
  });
});
