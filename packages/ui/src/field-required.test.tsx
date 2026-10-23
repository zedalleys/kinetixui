import * as React from "react";
import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { Checkbox } from "./components/checkbox";
import { Field, FieldControl, FieldDescription, FieldLabel, FieldMessage } from "./components/field";
import { Form, FormControl, FormField, FormItem, FormLabel } from "./components/form";
import { Input } from "./components/input";
import { RadioGroup, RadioGroupItem } from "./components/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/select";
import { Switch } from "./components/switch";

/**
 * field-required.test.tsx — GAP-6: a field that must be filled in says so to a screen reader.
 *
 * Before this, `aria-required` appeared exactly once in the repository, in an assertion in
 * `switch-motion.test.tsx` where a caller had passed `required` through by hand. `Field` and `Form`
 * wired `id`, `aria-describedby` and `aria-invalid` and had no notion of a required field at all,
 * so the requirement could only ever be an asterisk somebody typed into the label text.
 *
 * What these tests claim is what the DOM carries. jsdom computes the attributes, not the speech:
 * that `aria-required="true"` reaches the control is a fact about the accessibility tree, and what
 * a screen reader does with it is not measured here or anywhere else in this package.
 */

function getControl(name: string) {
  return screen.getByRole("textbox", { name });
}

describe("Field — required", () => {
  it("puts aria-required on the control", () => {
    render(
      <Field required>
        <FieldLabel>Email</FieldLabel>
        <FieldControl>
          <Input />
        </FieldControl>
      </Field>,
    );
    expect(getControl("Email")).toHaveAttribute("aria-required", "true");
  });

  it("marks the label visually, without announcing it twice", () => {
    render(
      <Field required>
        <FieldLabel>Email</FieldLabel>
        <FieldControl>
          <Input />
        </FieldControl>
      </Field>,
    );
    const marker = document.querySelector("[data-required-marker]");
    expect(marker).not.toBeNull();
    // Decoration: the control already carries the state, so the marker must not reach the tree.
    expect(marker).toHaveAttribute("aria-hidden", "true");
    // And the asterisk must not become part of the field's name.
    expect(getControl("Email")).toBeInTheDocument();
  });

  it("renders exactly what it did before when required is not mentioned", () => {
    const { container } = render(
      <Field>
        <FieldLabel>Email</FieldLabel>
        <FieldControl>
          <Input />
        </FieldControl>
        <FieldDescription>We will never share it.</FieldDescription>
      </Field>,
    );
    expect(getControl("Email")).not.toHaveAttribute("aria-required");
    expect(container.querySelector("[data-required-marker]")).toBeNull();
    expect(container.querySelector("[data-required]")).toBeNull();
  });

  it("required and invalid are independent", () => {
    render(
      <Field required invalid>
        <FieldLabel>Email</FieldLabel>
        <FieldControl>
          <Input />
        </FieldControl>
        <FieldMessage>Enter an email address.</FieldMessage>
      </Field>,
    );
    const control = getControl("Email");
    expect(control).toHaveAttribute("aria-required", "true");
    expect(control).toHaveAttribute("aria-invalid", "true");
  });

  it("reaches a control that is not an input, which is the case the native attribute cannot serve", () => {
    render(
      <Field required>
        <FieldLabel>Accept the terms</FieldLabel>
        <FieldControl>
          <Checkbox />
        </FieldControl>
      </Field>,
    );
    // A Radix checkbox is a <button>. `required` on a button means nothing; `aria-required` is the
    // only channel, which is why the contract is written in ARIA rather than in the DOM attribute.
    expect(screen.getByRole("checkbox", { name: "Accept the terms" })).toHaveAttribute(
      "aria-required",
      "true",
    );
  });
});

function RhfHost({ required }: { required?: boolean }) {
  const form = useForm({ defaultValues: { email: "" } });
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem required={required}>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
          </FormItem>
        )}
      />
    </Form>
  );
}

describe("Form — required", () => {
  it("puts aria-required on the control and a marker beside the label", () => {
    render(<RhfHost required />);
    expect(getControl("Email")).toHaveAttribute("aria-required", "true");
    expect(document.querySelector("[data-required-marker]")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders exactly what it did before when required is not mentioned", () => {
    const { container } = render(<RhfHost />);
    expect(getControl("Email")).not.toHaveAttribute("aria-required");
    expect(container.querySelector("[data-required-marker]")).toBeNull();
  });
});

/**
 * The four controls that carry the state themselves.
 *
 * Radix's Checkbox, Switch, Select and RadioGroup translate their own `required` prop into
 * `aria-required`, so these components need no code — but nothing in this repository proved it, and
 * a dependency upgrade that dropped it would have been invisible. `check:required-semantics` counts
 * a control as covered only when an assertion like these exists, so deleting one fails the gate as
 * well as the test.
 */
describe("the controls that emit aria-required themselves", () => {
  it("Checkbox", () => {
    render(<Checkbox required aria-label="Accept" />);
    expect(screen.getByRole("checkbox", { name: "Accept" })).toHaveAttribute("aria-required", "true");
  });

  it("Switch", () => {
    render(<Switch required aria-label="Accept" />);
    expect(screen.getByRole("switch", { name: "Accept" })).toHaveAttribute("aria-required", "true");
  });

  it("RadioGroup — on the group, which is where ARIA puts it for a radio set", () => {
    render(
      <RadioGroup required aria-label="Size">
        <RadioGroupItem value="s" aria-label="Small" />
      </RadioGroup>,
    );
    expect(screen.getByRole("radiogroup", { name: "Size" })).toHaveAttribute("aria-required", "true");
    // Deliberately not on the item: one radio of a set is not individually required, the set is.
    expect(screen.getByRole("radio", { name: "Small" })).not.toHaveAttribute("aria-required");
  });

  it("Select — on the trigger, which is the combobox", () => {
    render(
      <Select required>
        <SelectTrigger aria-label="Size">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="s">Small</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByRole("combobox", { name: "Size" })).toHaveAttribute("aria-required", "true");
  });
});
