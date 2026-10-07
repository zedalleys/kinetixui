"use client";

import * as React from "react";
import type { KinetixCapabilitySupport } from "../types/device-state";
import type { KinetixControlState, KinetixDeviceColor } from "../types/control";
import type { DescribeControlOutcomeOptions } from "../functions/control";
import { describeDeviceColor, findDeviceColorOption, previewDeviceColor } from "../functions/color";
import { isSameDeviceValue } from "../functions/commands";
import { cn } from "./cn";
import { ControlAnnouncer, ControlOutcomeNote, pendingMotion, SupportNote, useControlContract, type ControlContractProps } from "./control-outcome";
import { DeviceModeControl } from "./device-mode-control";
import { withDisplayName } from "./display-name";

/** A colour the product offers for this device. `label` is the name people read; `value` is the device's. */
export type DeviceColorOption = {
  /** Stable id for the option. Defaults to its index. */
  id?: string;
  label: string;
  value: KinetixDeviceColor;
};

/**
 * DeviceColorControl — a connected device's colour, without claiming the device changed before it did.
 *
 * **A device control, not a design-tool picker.** The product supplies the colours its device offers
 * (presets, white points); the control lets a person ask for one and shows what the device reports.
 * The choices are `DeviceModeControl` in its `tiles` presentation, so the radiogroup semantics, the
 * roving tab stop and the arrow keys are the mode control's own — each tile is a named radio, and the
 * swatch inside it is decoration beside the name.
 *
 * **Structured values.** Colours are compared with `isSameDeviceValue`, never by reference: a reported
 * `{ mode: "rgb", r: 255, g: 0, b: 0 }` matches the request for the same colour although it is a new
 * object. A reported colour that is none of the options is still shown and named by its value.
 *
 * **Strategy.** `confirmed` (default, as for every control) keeps the preview at the reported colour and
 * marks the request; `hybrid` previews the request as a target with a dashed edge and names what the
 * device still reports; `optimistic` previews the request outright and rolls back in words. Colour is a
 * good fit for `hybrid` — people expect to see the colour they picked — but the default is not changed
 * per control, so `confirmed` means the same everywhere.
 *
 * The device's colour is data, rendered as a fill; every border, focus ring, label and state mark
 * around it is on the token contract.
 */
export interface DeviceColorControlProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">, ControlContractProps<KinetixDeviceColor> {
  /** The colours to offer, in order. */
  options: readonly DeviceColorOption[];
  /** What the device last reported. Ignored when a `lifecycle` is passed. */
  value?: KinetixDeviceColor | null;
  /** What the user asked for, while unconfirmed. Ignored with a `lifecycle`. */
  requested?: KinetixDeviceColor | null;
  /** Accessible name for the control and its choices, e.g. "Desk lamp colour". */
  label: string;
  control?: KinetixControlState;
  /** From `resolveCapabilitySupport`. `read-only` shows the colour without choices; `unsupported` says so. */
  support?: KinetixCapabilitySupport;
  /** Called with the colour being requested. The component never assumes it succeeded. */
  onChange?: (next: KinetixDeviceColor) => void;
}

const DeviceColorControl = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, DeviceColorControlProps>(
  ({ options, value, requested, label, control: controlProp, support = "supported", lifecycle, strategy, announce, onChange, className, ...props }, ref) => {
    const keyed = options.map((option, index) => ({ ...option, id: option.id ?? String(index) }));
    const nameOf = (color: unknown) => {
      const c = color as KinetixDeviceColor | null | undefined;
      const option = findDeviceColorOption(keyed, c);
      return option ? `${option.label} (${describeDeviceColor(c)})` : describeDeviceColor(c);
    };
    const sentence: DescribeControlOutcomeOptions = { formatValue: nameOf };
    const { presentation, control, announcement } = useControlContract<KinetixDeviceColor>(
      { lifecycle, strategy, announce, control: controlProp, reported: value, requested },
      sentence,
    );
    const reported = presentation.reportedValue ?? null;
    const asked = presentation.pending ? (presentation.pendingValue ?? null) : null;
    const pending = asked !== null && !isSameDeviceValue(asked, reported);
    const marked = pending && presentation.indicatePending;
    // Read off the presentation, never off the strategy's name.
    const shown = pending && presentation.valueSource === "requested" ? asked : reported;

    const reportedOption = findDeviceColorOption(keyed, reported);
    const askedOption = pending ? findDeviceColorOption(keyed, asked) : undefined;
    const descriptionId = React.useId();

    if (support === "unsupported") return <SupportNote nodeRef={ref} label={label} className={className} {...props} />;

    return (
      <div
        ref={ref}
        className={cn("flex min-w-0 flex-col gap-3", className)}
        data-strategy={presentation.strategy}
        data-pending={pending ? "" : undefined}
        // On the whole control as well as on the choices: a request for a colour that is none of the
        // options leaves the radiogroup with nothing to mark, and this still says it is unsettled.
        aria-busy={pending || undefined}
        {...props}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            data-color-preview=""
            className={cn(
              // The device's colour is content, like a photo: forced colours keep it rather than flatten it,
              // since the name and value beside it already carry the meaning.
              "size-12 shrink-0 rounded-full border-2 transition-colors duration-base ease-enter motion-reduce:transition-none forced-color-adjust-none",
              // A dashed edge is the "asked for, not confirmed" mark, the same grammar as the power knob.
              shown === null ? "border-dashed border-border bg-muted" : marked ? "border-dashed border-foreground" : "border-border",
            )}
            style={shown === null ? undefined : { backgroundColor: previewDeviceColor(shown) ?? undefined }}
          />
          <span className="flex min-w-0 flex-col">
            <span className="text-label-lg text-muted-foreground">{label}</span>
            <span
              data-color-shown=""
              data-value-source={shown === reported ? "reported" : "requested"}
              className={cn("break-words text-title-md", marked ? "text-muted-foreground" : "text-foreground")}
            >
              {shown === null ? "Not reported" : nameOf(shown)}
            </span>
            {marked ? (
              <span
                data-requested=""
                className={cn("inline-flex w-fit max-w-full items-center rounded-full border border-dashed border-primary bg-primary/10 px-2.5 py-0.5 text-label-md text-foreground", pendingMotion(control?.availability))}
              >
                <span className="min-w-0 break-words">
                  {shown === reported
                    ? `Requested ${nameOf(asked)}, not yet confirmed`
                    : `Requested, not yet confirmed. Device reports ${reported === null ? "unknown" : nameOf(reported)}`}
                </span>
              </span>
            ) : null}
            {control?.description && control.availability !== "ready" ? (
              <span id={descriptionId} className="break-words text-label-md text-muted-foreground">
                {control.description}
              </span>
            ) : null}
            {support === "read-only" ? <span className="text-label-md text-muted-foreground">Read only on this device</span> : null}
          </span>
        </div>

        {support === "supported" && keyed.length > 0 ? (
          <DeviceModeControl
            presentation="tiles"
            label={label}
            aria-describedby={control?.description && control.availability !== "ready" ? descriptionId : undefined}
            modes={keyed.map((option) => ({
              id: option.id,
              label: option.label,
              icon: (
                <span
                  className="size-6 rounded-full border border-border shadow-sm forced-color-adjust-none"
                  style={{ backgroundColor: previewDeviceColor(option.value) ?? undefined }}
                />
              ),
            }))}
            // The ids of the colours, not a second lifecycle: this control's presentation decided what
            // is pending, and the group draws exactly that under the same strategy.
            value={reportedOption?.id ?? null}
            requested={pending ? (askedOption?.id ?? null) : null}
            strategy={presentation.strategy}
            control={control}
            onSelect={(id) => {
              const option = keyed.find((o) => o.id === id);
              if (option) onChange?.(option.value);
            }}
          />
        ) : null}

        <ControlOutcomeNote presentation={presentation} sentence={sentence} />
        <ControlAnnouncer announcement={announcement} />
      </div>
    );
  },
), "DeviceColorControl");

export { DeviceColorControl };
