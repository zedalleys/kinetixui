// @kinetixui/ui — public entrypoint
export { Button, buttonVariants, type ButtonProps } from "./components/button";
export { Input, inputVariants, type InputProps } from "./components/input";
export { Textarea, textareaVariants, type TextareaProps } from "./components/textarea";
export { cn } from "./lib/utils";

/*
 * Remaining components — scaffold with the button.tsx / input.tsx method,
 * one file each:
 *   select.tsx      Figma 54855:13882   state: Default|Focus|Error|Disabled   (Radix Select)
 *   checkbox.tsx    Figma 54863:483     checked: false|true|Indeterminate · state · hasError   (Radix Checkbox)
 *   radio-group.tsx Figma 54863:536     checked · state · hasError   (Radix RadioGroup)
 *   switch.tsx      Figma 54855:13984   state · checked   (Radix Switch)
 *   badge.tsx       Figma 54855:13995   variant: Default|Secondary|Destructive|Outline|Subtle
 *   tag.tsx         Figma 54855:14021   variant: Default|Secondary|Destructive|Warning|Outline
 *   modal.tsx       Figma 54857:1322    type: Info|Confirmation|Warning|Destructive   (Radix Dialog)
 *
 * Field composition (Label + control + helper, colour tracks state) — wraps
 * Input / Textarea / Select to reproduce the Figma form-field components.
 */
