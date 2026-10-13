"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";

/**
 * PhoneInput — an international phone number: a country calling code and the number, in one field.
 *
 *   calling code   a real `<select>` (named "Country code" by default), so it has the platform's own
 *                  keyboard behaviour — type "sau" to jump to Saudi Arabia — and the native picker on a
 *                  phone. It shows "+966" compactly; the full option text ("Saudi Arabia (+966)") is what a
 *                  screen reader hears. The list is YOURS (`countries`): no calling-code table is bundled
 *   number         `type="tel"` with `inputMode="tel"` and `autoComplete="tel-national"`, so a phone shows
 *                  the dial pad and the browser can autofill. Typing is never reformatted under the caret;
 *                  letters are dropped, spaces, dashes, dots and brackets are kept as the reader typed them
 *   paste          pasting "+44 20 7946 0958" or "0044 20…" selects the matching calling code (the longest
 *                  one that matches, preferring the current country when two share a code, as +1 does) and
 *                  keeps the rest as the number
 *   two values     `national` is what is displayed, as typed; `raw` (reported with every change) is "+",
 *                  the calling code and the number's digits — a value to send to your verification
 *                  service, not proof that the number exists
 *   direction      the code and number together are a left-to-right string in every language, so the field
 *                  is `dir="ltr"` and reads "+966 50 123 4567" inside an Arabic form too, exactly as the same
 *                  number does in running Arabic text. The label above it follows the page
 *
 * It does NOT validate. Whether a number is possible, valid or reachable depends on numbering plans that
 * change, and the libraries that know them weigh hundreds of kilobytes; that belongs on your server or in
 * your form's validation, with the result shown through `invalid` and `aria-describedby`. Trunk prefixes
 * (the leading 0 many countries drop after the calling code, and Italy keeps) are not removed, for the same
 * reason.
 */
export interface PhoneCountry {
  /** Usually ISO 3166-1 alpha-2 ("SA"). */
  code: string;
  /** The display name, in the reader's language. */
  name: string;
  /** Digits only, without "+" — "966", "1", "44". */
  callingCode: string;
}

export interface PhoneValue {
  /** The selected country's `code`. */
  country: string;
  /** The number as displayed, without the calling code. */
  national: string;
}

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type"> {
  /** The field's visible label. */
  label: React.ReactNode;
  countries: PhoneCountry[];
  value: PhoneValue;
  /** `raw` is "+" + calling code + the number's digits ("" when there are no digits). */
  onValueChange: (value: PhoneValue & { raw: string }) => void;
  /** Accessible name of the calling-code select. Default "Country code". */
  countryLabel?: string;
  /** Marks both parts invalid; pair it with a visible message referenced by `aria-describedby`. */
  invalid?: boolean;
}

const DISALLOWED = /[^\d\s\-().]/g;
const digitsOf = (s: string) => s.replace(/\D/g, "");

function phoneRaw(callingCode: string | undefined, national: string) {
  const digits = digitsOf(national);
  return callingCode && digits ? `+${callingCode}${digits}` : "";
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      label,
      countries,
      value,
      onValueChange,
      countryLabel = "Country code",
      invalid,
      disabled,
      className,
      id: idProp,
      "aria-describedby": describedBy,
      onPaste: onPasteProp,
      ...props
    },
    ref,
  ) => {
    const generated = React.useId();
    const inputId = idProp ?? `${generated}-number`;
    const selected = countries.find((c) => c.code === value.country);

    const emit = (country: string, national: string) => {
      const c = countries.find((x) => x.code === country);
      onValueChange({ country, national, raw: phoneRaw(c?.callingCode, national) });
    };

    const onPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
      // A consumer's own handler runs first and can opt out with preventDefault; it never replaces this one.
      onPasteProp?.(event);
      if (event.defaultPrevented) return;
      const text = event.clipboardData.getData("text").trim();
      const international = text.startsWith("+") ? text.slice(1) : text.startsWith("00") ? text.slice(2) : null;
      if (international == null) return;
      const digits = digitsOf(international);
      // Longest calling code first; on a tie (+1 is shared), keep the country the reader already chose.
      const match = [...countries]
        .filter((c) => digits.startsWith(c.callingCode))
        .sort(
          (a, b) =>
            b.callingCode.length - a.callingCode.length ||
            Number(b.code === value.country) - Number(a.code === value.country),
        )[0];
      if (!match) return;
      event.preventDefault();
      emit(match.code, digits.slice(match.callingCode.length));
    };

    return (
      <div className={cn("flex min-w-0 flex-col gap-1.5 font-sans", className)}>
        <label htmlFor={inputId} className="text-label-md font-medium text-foreground">
          {label}
        </label>
        <InputGroup dir="ltr" data-slot="phone-input" className="rounded-md">
          {/*
            The select is the full-size, transparent layer over its own compact face, so the hit target,
            focus and native picker are the select's while the face shows only "+966".
          */}
          <div className="relative flex shrink-0 items-center self-stretch border-e border-input">
            <span aria-hidden className="pointer-events-none flex items-center gap-1 ps-3 pe-2 text-body-md tabular-nums text-foreground">
              {selected ? `+${selected.callingCode}` : "+"}
              <ChevronDown className="size-4 text-muted-foreground" />
            </span>
            <select
              aria-label={countryLabel}
              value={value.country}
              disabled={disabled}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              onChange={(e) => emit(e.target.value, value.national)}
              className="absolute inset-0 cursor-pointer appearance-none bg-transparent text-transparent opacity-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed [&_option]:text-foreground"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} (+{c.callingCode})
                </option>
              ))}
            </select>
          </div>
          <InputGroupInput
            ref={ref}
            id={inputId}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={value.national}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onPaste={onPaste}
            onChange={(e) => emit(value.country, e.target.value.replace(DISALLOWED, ""))}
            className="tabular-nums"
            {...props}
          />
        </InputGroup>
      </div>
    );
  },
);
PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
