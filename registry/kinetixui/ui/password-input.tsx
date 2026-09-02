"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

/**
 * PasswordInput — an InputGroup recipe: a password field with a show / hide
 * toggle. Forwards its ref to the underlying <input>.
 */
const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">
>(({ className, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);
  return (
    <InputGroup className={className}>
      <InputGroupInput ref={ref} type={visible ? "text" : "password"} {...props} />
      <InputGroupAddon align="end">
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          className={cn("rounded-[2px] outline-none transition-colors hover:text-foreground focus-visible:text-foreground")}
        >
          {visible ? <EyeOff /> : <Eye />}
        </button>
      </InputGroupAddon>
    </InputGroup>
  );
});
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
