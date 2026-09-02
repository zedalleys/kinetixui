"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./button";
import { Dialog, DialogOverlay, DialogPortal, DialogTrigger } from "./dialog";

/**
 * Modal — reconciled 1:1 with the KinetixUI design source, node 54857:1322.
 * A structured dialog: header (title + close) · divider · body (description) ·
 * divider · right-aligned footer. `--radius-xl` corner, soft popup shadow.
 *
 * type:
 *   Info          → one primary action ("Got it")
 *   Confirmation  → Cancel + primary ("Confirm")
 *   Warning       → Cancel + primary ("Proceed")
 *   Destructive   → Cancel + destructive ("Delete")
 */
export type ModalType = "Info" | "Confirmation" | "Warning" | "Destructive";

const DEFAULT_ACTION: Record<ModalType, string> = {
  Info: "Got it",
  Confirmation: "Confirm",
  Warning: "Proceed",
  Destructive: "Delete",
};

export interface ModalProps {
  type?: ModalType;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** overrides the type's default action label */
  actionLabel?: string;
  cancelLabel?: string;
  onAction?: () => void;
  onCancel?: () => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

function Modal({
  type = "Info",
  title,
  description,
  actionLabel,
  cancelLabel = "Cancel",
  onAction,
  onCancel,
  open,
  defaultOpen,
  onOpenChange,
  trigger,
  children,
  className,
}: ModalProps) {
  const showCancel = type !== "Info";

  return (
    <Dialog open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex w-full max-w-[480px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-background font-sans",
            "shadow-[0_4px_24px_rgba(0,0,0,0.12)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            className,
          )}
        >
          <header className="flex items-center justify-between px-6 pb-3 pt-5">
            <DialogPrimitive.Title className="min-w-0 flex-1 text-[18px] font-semibold leading-6 text-foreground">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="rounded-sm opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </header>

          <div className="h-px w-full bg-border" />

          <div className="px-6 py-5">
            {description && (
              <DialogPrimitive.Description className="text-[14px] leading-5 tracking-[0.25px] text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            )}
            {children}
          </div>

          <div className="h-px w-full bg-border" />

          <footer className="flex items-center justify-end gap-3 px-6 py-4">
            {showCancel && (
              <DialogPrimitive.Close asChild>
                <Button variant="Outline" size="lg" onClick={onCancel}>
                  {cancelLabel}
                </Button>
              </DialogPrimitive.Close>
            )}
            <DialogPrimitive.Close asChild>
              <Button
                variant={type === "Destructive" ? "Destructive" : "Primary"}
                size="lg"
                onClick={onAction}
              >
                {actionLabel ?? DEFAULT_ACTION[type]}
              </Button>
            </DialogPrimitive.Close>
          </footer>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

export { Modal };
