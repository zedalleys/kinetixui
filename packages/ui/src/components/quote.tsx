"use client";

import * as React from "react";
import { cn } from "../lib/utils";

/**
 * Quote — a blockquote with an optional attributed author (name, title,
 * avatar slot).
 */
export interface QuoteProps extends React.HTMLAttributes<HTMLElement> {
  author?: React.ReactNode;
  authorTitle?: React.ReactNode;
  avatar?: React.ReactNode;
}

const Quote = React.forwardRef<HTMLElement, QuoteProps>(
  ({ className, author, authorTitle, avatar, children, ...props }, ref) => (
    <figure ref={ref} className={cn("flex flex-col gap-4 font-sans", className)} {...props}>
      <blockquote className="text-title-md font-medium text-foreground">&ldquo;{children}&rdquo;</blockquote>
      {(author || authorTitle) && (
        <figcaption className="flex items-center gap-3">
          {avatar}
          <div>
            {author && <p className="text-body-md font-medium text-foreground">{author}</p>}
            {authorTitle && <p className="text-body-sm text-muted-foreground">{authorTitle}</p>}
          </div>
        </figcaption>
      )}
    </figure>
  ),
);
Quote.displayName = "Quote";

export { Quote };
