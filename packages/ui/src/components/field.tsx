"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";
import { Label } from "./label";

/**
 * Field — the label + control + description + feedback composition, matching the
 * KinetixUI design source's input anatomy (label above, helper / feedback below,
 * label & message colour tracking the invalid state). Framework-agnostic: for
 * React Hook Form, use `Form` / `FormField` instead.
 *
 * <Field invalid={!!error}>
 *   <FieldLabel>Email</FieldLabel>
 *   <FieldControl><Input type="email" /></FieldControl>
 *   <FieldDescription>We'll never share it.</FieldDescription>
 *   {error && <FieldMessage intent="error">{error}</FieldMessage>}
 * </Field>
 */

type FieldContextValue = { id: string; descriptionId: string; messageId: string; invalid: boolean };
const FieldContext = React.createContext<FieldContextValue | null>(null);

function useField() {
  const ctx = React.useContext(FieldContext);
  if (!ctx) throw new Error("Field parts must be used within <Field>");
  return ctx;
}

interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  invalid?: boolean;
}

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, invalid = false, ...props }, ref) => {
    const id = React.useId();
    const value = React.useMemo<FieldContextValue>(
      () => ({ id: `${id}-control`, descriptionId: `${id}-description`, messageId: `${id}-message`, invalid }),
      [id, invalid],
    );
    return (
      <FieldContext.Provider value={value}>
        <div ref={ref} data-invalid={invalid || undefined} className={cn("grid gap-1.5", className)} {...props} />
      </FieldContext.Provider>
    );
  },
);
Field.displayName = "Field";

const FieldLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => {
  const { id, invalid } = useField();
  return <Label ref={ref} htmlFor={id} className={cn(invalid && "text-destructive", className)} {...props} />;
});
FieldLabel.displayName = "FieldLabel";

/** wraps a single form control (Input, Textarea, Select…) and wires a11y attrs */
const FieldControl = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<typeof Slot>>(
  ({ ...props }, ref) => {
    const { id, descriptionId, messageId, invalid } = useField();
    return (
      <Slot
        ref={ref}
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={`${descriptionId} ${messageId}`}
        {...props}
      />
    );
  },
);
FieldControl.displayName = "FieldControl";

const FieldDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { descriptionId } = useField();
    return <p ref={ref} id={descriptionId} className={cn("text-body-sm text-muted-foreground", className)} {...props} />;
  },
);
FieldDescription.displayName = "FieldDescription";

const messageVariants = cva("flex items-center gap-1.5 text-body-sm [&>svg]:size-3.5 [&>svg]:shrink-0", {
  variants: {
    intent: {
      error: "text-destructive",
      warning: "text-warning",
      success: "text-success",
      info: "text-muted-foreground",
    },
  },
  defaultVariants: { intent: "error" },
});

const INTENT_ICON = {
  error: CircleAlert,
  warning: TriangleAlert,
  success: CircleCheck,
  info: Info,
} as const;

interface FieldMessageProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof messageVariants> {
  /** hide the leading intent icon */
  hideIcon?: boolean;
}

const FieldMessage = React.forwardRef<HTMLParagraphElement, FieldMessageProps>(
  ({ className, intent = "error", hideIcon, children, ...props }, ref) => {
    const { messageId } = useField();
    const Icon = INTENT_ICON[intent ?? "error"];
    if (!children) return null;
    return (
      <p ref={ref} id={messageId} className={cn(messageVariants({ intent }), className)} {...props}>
        {!hideIcon && <Icon />}
        <span>{children}</span>
      </p>
    );
  },
);
FieldMessage.displayName = "FieldMessage";

export { Field, FieldLabel, FieldControl, FieldDescription, FieldMessage, messageVariants };
