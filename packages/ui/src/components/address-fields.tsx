"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { Field, FieldControl, FieldDescription, FieldLabel, FieldMessage } from "./field";
import { Input } from "./input";

/**
 * AddressFields — the fields of a postal address, in the order, wording and requiredness the CONSUMING app
 * decides, inside a named fieldset. It renders fields, not a `<form>`: it goes inside your checkout,
 * profile or booking form, next to everything else that form collects.
 *
 * There is no universal address. A Saudi national address has a building number, district and an
 * additional number; a Japanese one starts from the postal code and the prefecture; a UK one has no
 * "state"; many countries have no postal code at all. So this component owns no address model and no
 * postal database. Instead:
 *
 *   you list the fields   `fields` is an ordered array. Put the postal code first for Japan, leave the region
 *                         out for the UK, add a building number for Saudi Arabia — per country, from your own
 *                         data, by passing a different array
 *   labels are yours      every label, description and error is supplied, so it is localised by you
 *   required is explicit  `required` per field; optional fields show `optionalLabel` beside the label rather
 *                         than marking required ones with a bare asterisk
 *   autofill works        each known field name maps to its HTML `autocomplete` token (street → address-line1,
 *                         locality → address-level2, postalCode → postal-code, …), prefixed with `section`
 *                         ("shipping", "billing") so a browser can fill two addresses on one page. Any field
 *                         can override it
 *   any control           `render` swaps the default Input for your own control — a CountrySelect, a Select
 *                         of regions — and receives the id, value, change handler and error wiring
 *
 * Layout is a grid that is two columns from the `sm` breakpoint and one below it; `width: "half"` shares a
 * row, the default takes the full row. All of it is logical, so it mirrors under RTL.
 */
export type AddressFieldName =
  | "recipient"
  | "organization"
  | "country"
  | "administrativeArea"
  | "locality"
  | "district"
  | "street"
  | "building"
  | "additional"
  | "postalCode";

const AUTOCOMPLETE: Record<AddressFieldName, string> = {
  recipient: "name",
  organization: "organization",
  country: "country-name",
  administrativeArea: "address-level1",
  locality: "address-level2",
  district: "address-level3",
  street: "address-line1",
  building: "address-line2",
  additional: "address-line3",
  postalCode: "postal-code",
};

export interface AddressFieldRenderProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required: boolean;
  invalid: boolean;
  autoComplete: string;
  /** Wire this to your control's `aria-describedby`. */
  describedBy?: string;
}

export interface AddressFieldConfig {
  /** A known name (gets its autocomplete token) or your own key. */
  name: AddressFieldName | (string & {});
  label: string;
  required?: boolean;
  description?: React.ReactNode;
  /** Overrides the derived autocomplete token (without the section prefix). */
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  /** `half` shares a row from the `sm` breakpoint. Default `full`. */
  width?: "full" | "half";
  /** Replace the default Input. */
  render?: (props: AddressFieldRenderProps) => React.ReactNode;
}

export interface AddressFieldsProps extends Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, "onChange"> {
  /** The fieldset's legend — "Shipping address". */
  legend: React.ReactNode;
  fields: AddressFieldConfig[];
  value: Record<string, string>;
  onValueChange: (value: Record<string, string>) => void;
  /** Error message per field name. A field with a message is marked invalid. */
  errors?: Record<string, React.ReactNode>;
  /** Which address this is, for autofill: prefixes every token ("shipping address-line1"). */
  section?: "shipping" | "billing";
  /** Shown beside the label of a field that is not required. Default "(optional)". Pass "" to hide. */
  optionalLabel?: string;
}

const AddressFields = React.forwardRef<HTMLFieldSetElement, AddressFieldsProps>(
  (
    { className, legend, fields, value, onValueChange, errors, section, optionalLabel = "(optional)", ...props },
    ref,
  ) => {
    const id = React.useId();
    return (
      <fieldset ref={ref} className={cn("m-0 min-w-0 border-0 p-0 font-sans", className)} {...props}>
        <legend className="mb-3 p-0 text-title-sm font-semibold text-foreground">{legend}</legend>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          {fields.map((field) => {
            const required = field.required ?? false;
            const error = errors?.[field.name];
            const invalid = error != null && error !== false && error !== "";
            const token = field.autoComplete ?? AUTOCOMPLETE[field.name as AddressFieldName] ?? "on";
            const autoComplete = section && token !== "on" ? `${section} ${token}` : token;
            const fieldValue = value[field.name] ?? "";
            const onChange = (next: string) => onValueChange({ ...value, [field.name]: next });
            const wrapper = cn("min-w-0", field.width !== "half" && "sm:col-span-2");

            if (field.render) {
              const controlId = `${id}-${field.name}`;
              const messageId = `${controlId}-message`;
              return (
                <div key={field.name} className={cn("grid gap-1.5", wrapper)}>
                  {field.render({
                    id: controlId,
                    label: field.label,
                    value: fieldValue,
                    onChange,
                    required,
                    invalid,
                    autoComplete,
                    describedBy: invalid ? messageId : undefined,
                  })}
                  {invalid && (
                    <p id={messageId} className="text-body-sm text-destructive">
                      {error}
                    </p>
                  )}
                </div>
              );
            }

            return (
              <Field key={field.name} invalid={invalid} className={wrapper}>
                <FieldLabel>
                  {field.label}
                  {!required && optionalLabel && (
                    <>
                      {" "}
                      <span className="font-normal text-muted-foreground">{optionalLabel}</span>
                    </>
                  )}
                </FieldLabel>
                <FieldControl>
                  <Input
                    name={field.name}
                    value={fieldValue}
                    required={required}
                    autoComplete={autoComplete}
                    inputMode={field.inputMode}
                    onChange={(e) => onChange(e.target.value)}
                  />
                </FieldControl>
                {field.description && <FieldDescription>{field.description}</FieldDescription>}
                {invalid && <FieldMessage intent="error">{error}</FieldMessage>}
              </Field>
            );
          })}
        </div>
      </fieldset>
    );
  },
);
AddressFields.displayName = "AddressFields";

export { AddressFields };
