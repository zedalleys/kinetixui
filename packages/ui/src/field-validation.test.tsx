import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Field, FieldControl, FieldDescription, FieldLabel, FieldMessage } from "./components/field";
import { AddressFields } from "./components/address-fields";
import { Input } from "./components/input";

/**
 * field-validation.test.tsx — Field's description/feedback contract.
 *
 * Two defects, measured on `main` 590368d before the fix:
 *
 *   1. `FieldControl` always set `aria-describedby="<id>-description <id>-message"`, while both
 *      parts are optional and usually conditional. A field with neither — the resting state of
 *      every `AddressFields` row without a description — named two ids that did not exist.
 *   2. `FieldMessage` carried no role, so an error that appears on blur, on submit or when an
 *      async check returns is announced to nobody: `aria-describedby` only speaks when focus
 *      next reaches the control.
 *
 * Each group ends with a negative control: the same assertion run against a local replica of the
 * pre-fix component. The control has to FAIL the assertion, otherwise the assertion proves nothing.
 * The replicas are test-local on purpose — nothing deliberately broken is committed to the library.
 */

function danglingIdrefs(root: ParentNode): string[] {
  const bad: string[] = [];
  for (const el of root.querySelectorAll("[aria-describedby]"))
    for (const id of (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean))
      if (!document.getElementById(id)) bad.push(`${el.tagName.toLowerCase()} -> ${id}`);
  return bad;
}

/** The pre-fix wiring, verbatim in behaviour: both ids, unconditionally, consumer value overwritten. */
const LegacyFieldContext = React.createContext({ id: "x-control", descriptionId: "x-description", messageId: "x-message", invalid: false });
function LegacyField({ invalid = false, children }: { invalid?: boolean; children: React.ReactNode }) {
  const id = React.useId();
  const value = React.useMemo(
    () => ({ id: `${id}-control`, descriptionId: `${id}-description`, messageId: `${id}-message`, invalid }),
    [id, invalid],
  );
  return <LegacyFieldContext.Provider value={value}>{children}</LegacyFieldContext.Provider>;
}
function LegacyControl(props: React.ComponentPropsWithoutRef<"input">) {
  const { id, descriptionId, messageId, invalid } = React.useContext(LegacyFieldContext);
  return <input id={id} aria-invalid={invalid || undefined} aria-describedby={`${descriptionId} ${messageId}`} {...props} />;
}

describe("Field names only the parts that exist", () => {
  it("names nothing when neither a description nor a message is rendered", () => {
    const { container } = render(
      <Field>
        <FieldLabel>Email</FieldLabel>
        <FieldControl>
          <Input />
        </FieldControl>
      </Field>,
    );
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-describedby");
    expect(danglingIdrefs(container)).toEqual([]);
  });

  it("names the description alone, then adds the message when one appears", async () => {
    function Form({ invalid }: { invalid: boolean }) {
      return (
        <Field invalid={invalid}>
          <FieldLabel>Email</FieldLabel>
          <FieldControl>
            <Input />
          </FieldControl>
          <FieldDescription>We only use it for receipts.</FieldDescription>
          {invalid && <FieldMessage intent="error">Enter a valid email address.</FieldMessage>}
        </Field>
      );
    }
    const { container, rerender } = render(<Form invalid={false} />);
    const control = screen.getByLabelText("Email");
    const described = () => (control.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);

    expect(described()).toHaveLength(1);
    expect(document.getElementById(described()[0])).toHaveTextContent("We only use it for receipts.");
    expect(danglingIdrefs(container)).toEqual([]);

    rerender(<Form invalid />);
    expect(described()).toHaveLength(2);
    expect(described().map((id) => document.getElementById(id)?.textContent)).toEqual([
      "We only use it for receipts.",
      "Enter a valid email address.",
    ]);
    expect(danglingIdrefs(container)).toEqual([]);
  });

  it("ignores a FieldMessage with nothing to say", () => {
    const { container } = render(
      <Field>
        <FieldLabel>Email</FieldLabel>
        <FieldControl>
          <Input />
        </FieldControl>
        <FieldMessage intent="error">{undefined}</FieldMessage>
      </Field>,
    );
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-describedby");
    expect(danglingIdrefs(container)).toEqual([]);
  });

  it("finds a part nested below a direct child, and a part inside a fragment", () => {
    const { container } = render(
      <Field invalid>
        <FieldLabel>Email</FieldLabel>
        <FieldControl>
          <Input />
        </FieldControl>
        <>
          <FieldDescription>Helper.</FieldDescription>
        </>
        <div className="row">
          <FieldMessage intent="error">Nested error.</FieldMessage>
        </div>
      </Field>,
    );
    const described = (screen.getByLabelText("Email").getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
    expect(described.map((id) => document.getElementById(id)?.textContent)).toEqual(["Helper.", "Nested error."]);
    expect(danglingIdrefs(container)).toEqual([]);
  });

  it("keeps a describedby the consumer put on the control", () => {
    render(
      <>
        <p id="shared-hint">Use your work address.</p>
        <Field>
          <FieldLabel>Email</FieldLabel>
          <FieldControl aria-describedby="shared-hint">
            <Input />
          </FieldControl>
          <FieldDescription>We only use it for receipts.</FieldDescription>
        </Field>
      </>,
    );
    const described = (screen.getByLabelText("Email").getAttribute("aria-describedby") ?? "").split(/\s+/);
    expect(described.map((id) => document.getElementById(id)?.textContent)).toEqual([
      "Use your work address.",
      "We only use it for receipts.",
    ]);
  });

  it("AddressFields leaves no dangling idref in its resting state", () => {
    const { container } = render(
      <AddressFields
        legend="Shipping address"
        fields={[
          { name: "line1", label: "Address line 1", required: true },
          { name: "city", label: "City" },
        ]}
        value={{}}
        onValueChange={() => {}}
      />,
    );
    expect(danglingIdrefs(container)).toEqual([]);
  });

  it("negative control: the pre-fix wiring is caught by both assertions", () => {
    const bare = render(
      <LegacyField>
        <LegacyControl aria-label="Email" />
      </LegacyField>,
    );
    // the dangling-idref sweep sees the two ids that do not resolve …
    expect(danglingIdrefs(bare.container).length).toBe(2);
    bare.unmount();

    // … and, because the pre-fix component spread the consumer's props over its own attributes,
    // a consumer `aria-describedby` replaced the field's wiring outright rather than adding to it.
    render(
      <LegacyField>
        <LegacyControl aria-label="Phone" aria-describedby="shared-hint" />
      </LegacyField>,
    );
    expect(screen.getByLabelText("Phone").getAttribute("aria-describedby")).toBe("shared-hint");
  });
});

describe("Field announces a message that appears", () => {
  it("gives an error an assertive role and a confirmation a polite one", () => {
    render(
      <Field invalid>
        <FieldLabel>Email</FieldLabel>
        <FieldControl>
          <Input />
        </FieldControl>
        <FieldMessage intent="error">Enter a valid email address.</FieldMessage>
      </Field>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address.");

    render(
      <Field>
        <FieldLabel>Name</FieldLabel>
        <FieldControl>
          <Input />
        </FieldControl>
        <FieldMessage intent="success">Looks good.</FieldMessage>
      </Field>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Looks good.");
  });

  it("announces an error that arrives after the user has left the field", async () => {
    const user = userEvent.setup();
    function AsyncCheck() {
      const [error, setError] = React.useState("");
      return (
        <>
          <Field invalid={!!error}>
            <FieldLabel>Email</FieldLabel>
            <FieldControl>
              <Input onBlur={() => setError("That address is already registered.")} />
            </FieldControl>
            <FieldMessage intent="error">{error}</FieldMessage>
          </Field>
          <button type="button">Continue</button>
        </>
      );
    }
    render(<AsyncCheck />);
    await user.click(screen.getByLabelText("Email"));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    // focus has moved on, so aria-describedby will not be read; the inserted alert is the announcement
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("That address is already registered.");
  });

  it("lets a consumer override the role", () => {
    render(
      <Field invalid>
        <FieldLabel>Email</FieldLabel>
        <FieldControl>
          <Input />
        </FieldControl>
        <FieldMessage intent="error" role="status">
          Checking…
        </FieldMessage>
      </Field>,
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Checking…");
  });

  it("negative control: a roleless message is not announced", () => {
    render(
      <Field invalid>
        <FieldLabel>Email</FieldLabel>
        <FieldControl>
          <Input />
        </FieldControl>
        {/* the pre-fix element: same text, same id, no role */}
        <p>Enter a valid email address.</p>
      </Field>,
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
