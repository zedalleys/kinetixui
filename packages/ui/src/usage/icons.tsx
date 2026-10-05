/**
 * The React icon examples /docs/icons shows. Each `kx-usage:<key>` region is extracted by `pnpm gen:usage`,
 * so the snippet on the page is code `tsc` type-checks against the real props, and components-icons.test.tsx
 * renders it. Not exported from the package: an example, not API.
 */
import * as React from "react";
import { CircleX, Trash2 } from "lucide-react";
import { Banner } from "../components/banner";
import { Button } from "../components/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/tooltip";

/** Stands in for an application's own icon component: any SVG, no lucide, no KinetixUI. */
function CompanyCloseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconsDismissIconExample({ onDismiss = () => {} }: { onDismiss?: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      {/* kx-usage:icons-dismiss-icon */}
      {/* Default: lucide's X */}
      <Banner onDismiss={onDismiss}>Changes saved.</Banner>

      {/* Another lucide icon */}
      <Banner onDismiss={onDismiss} dismissIcon={<CircleX />}>
        Changes saved.
      </Banner>

      {/* Your own icon: sized to 14px, coloured by the banner, named "Dismiss" */}
      <Banner onDismiss={onDismiss} dismissIcon={<CompanyCloseIcon />}>
        Changes saved.
      </Banner>
      {/* kx-usage:end */}
    </div>
  );
}

export function IconsIconOnlyButtonExample({ onDelete = () => {} }: { onDelete?: () => void }) {
  return (
    <TooltipProvider>
      {/* kx-usage:icons-icon-only-button */}
      <Tooltip>
        <TooltipTrigger asChild>
          {/* size="icon" keeps the svg visible and turns the text into the button's
              screen-reader-only name: "Delete draft, button" */}
          <Button size="icon" variant="Ghost" onClick={onDelete}>
            <Trash2 />
            <span>Delete draft</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete draft</TooltipContent>
      </Tooltip>
      {/* kx-usage:end */}
    </TooltipProvider>
  );
}
