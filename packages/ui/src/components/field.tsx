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
 *
 * `aria-describedby` names only the parts that are actually rendered. The description
 * and the message are both optional and are usually conditional — `{error && …}` is the
 * documented shape — so a fixed `"<id>-description <id>-message"` would point at elements
 * that do not exist for most of a field's life. Presence is resolved twice, deliberately:
 * at render time from `Field`'s own children, so server-rendered markup is already correct
 * and hydration does not change the attribute; and, for a part rendered deeper than a direct
 * child, by that part registering itself after mount. The render pass is what SSR gets; the
 * registration is what nesting gets. Either way an id is named only when its element is there.
 */

type PartKind = "description" | "message";

type FieldContextValue = {
  id: string;
  descriptionId: string;
  messageId: string;
  invalid: boolean;
  /** space-separated ids of the parts that exist, or undefined when none do */
  describedBy: string | undefined;
  /** a part rendered below a direct child of Field announces itself here */
  registerPart: (kind: PartKind) => () => void;
};

const FieldContext = React.createContext<FieldContextValue | null>(null);

function useField() {
  const ctx = React.useContext(FieldContext);
  if (!ctx) throw new Error("Field parts must be used within <Field>");
  return ctx;
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

/**
 * Which parts appear among `children`. One level of fragments is walked, because
 * `<>{description}{message}</>` is a natural way to group the two; anything deeper
 * registers itself instead.
 */
function partsInChildren(children: React.ReactNode, found: Set<PartKind> = new Set()): Set<PartKind> {
  for (const child of React.Children.toArray(children)) {
    if (!React.isValidElement(child)) continue;
    if (child.type === FieldDescription) found.add("description");
    // A FieldMessage with nothing to say renders null, so it is not there to be described by.
    else if (child.type === FieldMessage) {
      if ((child.props as { children?: React.ReactNode }).children) found.add("message");
    }
    else if (child.type === React.Fragment)
      partsInChildren((child.props as { children?: React.ReactNode }).children, found);
  }
  return found;
}

interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  invalid?: boolean;
}

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, invalid = false, children, ...props }, ref) => {
    const id = React.useId();
    // A counter, not a boolean: React can mount, unmount and remount the same part (StrictMode
    // does it on purpose), and a boolean would be left false by the first cleanup.
    const [registered, setRegistered] = React.useState<Record<PartKind, number>>({ description: 0, message: 0 });
    const registerPart = React.useCallback((kind: PartKind) => {
      setRegistered((prev) => ({ ...prev, [kind]: prev[kind] + 1 }));
      return () => setRegistered((prev) => ({ ...prev, [kind]: Math.max(0, prev[kind] - 1) }));
    }, []);

    const inChildren = partsInChildren(children);
    const has = (kind: PartKind) => inChildren.has(kind) || registered[kind] > 0;
    const descriptionId = `${id}-description`;
    const messageId = `${id}-message`;
    // Document order: the helper text precedes the feedback, so a screen reader reads them that way.
    const describedBy =
      [has("description") ? descriptionId : null, has("message") ? messageId : null].filter(Boolean).join(" ") ||
      undefined;

    const value = React.useMemo<FieldContextValue>(
      () => ({ id: `${id}-control`, descriptionId, messageId, invalid, describedBy, registerPart }),
      [id, descriptionId, messageId, invalid, describedBy, registerPart],
    );
    return (
      <FieldContext.Provider value={value}>
        <div ref={ref} data-invalid={invalid || undefined} className={cn("grid gap-1.5", className)} {...props}>
          {children}
        </div>
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
    const { id, describedBy, invalid } = useField();
    // `aria-describedby` is merged rather than overwritten, in both directions: a control that
    // already points at something of its own keeps it, and the field's own parts are appended.
    // Spreading `props` over the top would have silently dropped one side or the other.
    const described = [props["aria-describedby"], describedBy].filter(Boolean).join(" ") || undefined;
    return (
      <Slot
        ref={ref}
        id={id}
        aria-invalid={invalid || undefined}
        {...props}
        aria-describedby={described}
      />
    );
  },
);
FieldControl.displayName = "FieldControl";

const FieldDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { descriptionId, registerPart } = useField();
    useIsomorphicLayoutEffect(() => registerPart("description"), [registerPart]);
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
      info: "text-info",
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

/**
 * An inline message appears after the fact — on blur, on submit, when an async check comes back —
 * so it has to carry its own announcement. `aria-describedby` alone only speaks when focus next
 * reaches the control, which for a user who has already moved on is never. An element inserted
 * with `role="alert"` is announced on insertion; `role="status"` is its polite counterpart, which
 * is what a confirmation or a hint wants. Both are plain props, so a consumer can override either.
 */
const MESSAGE_ROLE = { error: "alert", warning: "alert", success: "status", info: "status" } as const;

interface FieldMessageProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof messageVariants> {
  /** hide the leading intent icon */
  hideIcon?: boolean;
}

const FieldMessage = React.forwardRef<HTMLParagraphElement, FieldMessageProps>(
  ({ className, intent = "error", hideIcon, children, ...props }, ref) => {
    const { messageId, registerPart } = useField();
    const empty = !children;
    useIsomorphicLayoutEffect(() => {
      if (empty) return;
      return registerPart("message");
    }, [registerPart, empty]);
    const Icon = INTENT_ICON[intent ?? "error"];
    if (empty) return null;
    return (
      <p
        ref={ref}
        id={messageId}
        role={MESSAGE_ROLE[intent ?? "error"]}
        className={cn(messageVariants({ intent }), className)}
        {...props}
      >
        {!hideIcon && <Icon />}
        <span>{children}</span>
      </p>
    );
  },
);
FieldMessage.displayName = "FieldMessage";

export { Field, FieldLabel, FieldControl, FieldDescription, FieldMessage, messageVariants };
