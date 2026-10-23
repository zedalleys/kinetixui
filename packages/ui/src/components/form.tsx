"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { cn } from "../lib/utils";
import { Label } from "./label";

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = { name: TName };

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => (
  <FormFieldContext.Provider value={{ name: props.name }}>
    <Controller {...props} />
  </FormFieldContext.Provider>
);

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext.name });
  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) throw new Error("useFormField should be used within <FormField>");

  const { id, required } = itemContext;
  return {
    id,
    required,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = { id: string; required: boolean };
const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The field must be filled in. Puts `aria-required` on the control and a marker beside the label,
   * the same contract `Field` has.
   *
   * It is declared rather than read off the form: with a resolver — zod, yup, valibot — the rules
   * live in the schema, and react-hook-form's `getFieldState` reports validity, not whether a value
   * is demanded. There is nothing to read, so saying it here is the honest version, and a schema and
   * a label that disagree is a review problem rather than a silent one.
   */
  required?: boolean;
}

const FormItem = React.forwardRef<HTMLDivElement, FormItemProps>(
  ({ className, required = false, ...props }, ref) => {
    const id = React.useId();
    const value = React.useMemo<FormItemContextValue>(() => ({ id, required }), [id, required]);
    return (
      <FormItemContext.Provider value={value}>
        <div
          ref={ref}
          data-required={required || undefined}
          className={cn("grid gap-2", className)}
          {...props}
        />
      </FormItemContext.Provider>
    );
  },
);
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, children, ...props }, ref) => {
  const { error, formItemId, required } = useFormField();
  return (
    <Label ref={ref} className={cn(error && "text-destructive", className)} htmlFor={formItemId} {...props}>
      {children}
      {required && (
        // Decoration — the control carries `aria-required`; see the note in `field.tsx`.
        <span aria-hidden="true" data-required-marker="" className="ms-0.5 text-destructive">
          *
        </span>
      )}
    </Label>
  );
});
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId, required } = useFormField();
  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!error}
      aria-required={required || undefined}
      {...props}
    />
  );
});
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { formDescriptionId } = useFormField();
    return <p ref={ref} id={formDescriptionId} className={cn("text-sm text-muted-foreground", className)} {...props} />;
  },
);
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    const { error, formMessageId } = useFormField();
    const body = error ? String(error?.message ?? "") : children;
    if (!body) return null;
    return (
      <p ref={ref} id={formMessageId} className={cn("text-sm font-medium text-destructive", className)} {...props}>
        {body}
      </p>
    );
  },
);
FormMessage.displayName = "FormMessage";

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};
