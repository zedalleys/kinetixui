"use client";
import * as React from "react";
import Link from "next/link";
import { Button } from "@kinetixui/ui";
// The route's own stylesheet. `page.tsx` imports it too; without it here, a failure raised during
// the route's first render leaves this surface unstyled.
import "./studio.css";

/**
 * Route-scoped recovery for the Create Studio editor.
 *
 * Measured before this existed (M5.20, 1440x1000, a deliberate exception thrown from a component
 * adapter): a render exception replaced the whole workspace with the framework's generic
 * "Application error: a client-side exception has occurred" page. The persisted document was
 * never touched — the server still reported the same revision — but the editor offered no
 * explanation, no retry, and no way back.
 *
 * Every other error class the editor can reach is already handled in the editor itself: the
 * service answers with a code and a sentence (SESSION_REQUIRED, NOT_FOUND, PRODUCT_READ_ONLY,
 * REVISION_CONFLICT, IDENTITY_REWIND, SAVE_FAILED, PRODUCT_LIMIT_REACHED), the editor renders
 * those in its own alert region, and a corrupt browser draft is rejected by `migrateDocument`
 * before it can reach a render. This boundary is therefore only for the unexpected exception, and
 * it is deliberately one file on one route rather than an error framework.
 *
 * What it must not do: print a stack trace or the raw message (identical copy in development and
 * production, so the contract is testable), discard a stored draft, or retry a save. `reset()`
 * re-renders the route; it sends nothing.
 */
export default function StudioError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const heading = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => {
    // The workspace this replaced is gone, so focus is on <body>; a screen reader would otherwise
    // have nothing to read and a keyboard user would start from the top of the document.
    heading.current?.focus();
  }, []);
  React.useEffect(() => {
    // The message is useful to whoever is running the local server, and only to them.
    if (process.env.NODE_ENV === "development") console.error("Create Studio route error:", error);
  }, [error]);
  return (
    <section className="studio-recovery-surface" aria-label="Create Studio recovery">
      <h1 ref={heading} tabIndex={-1}>The editor stopped unexpectedly.</h1>
      <p role="alert">
        Something in the workspace failed to render, so Create Studio closed the editor rather than show you a
        half-drawn screen. Your last saved product on this computer has not been changed.
      </p>
      <p className="studio-muted">
        Any draft already stored by this browser is still there. Reopen the product and choose <strong>Recover
        draft</strong> to review it before saving. The change that caused this was not saved.
      </p>
      <div className="studio-recovery-actions">
        <Button onClick={reset}>Try the editor again</Button>
        {/* A DOCUMENT navigation, not `next/link`. Measured in M5.21: a soft navigation to the
            route the user is already on does not remount past this error boundary, so the
            recovery surface stayed on screen and this control did nothing at all — a label that
            promised a reload and delivered none. `scripts/create-studio-recovery-exit-controls.sh`
            is the control that catches it; nothing else can, because the two forms render the
            same DOM and differ only in outcome. */}
        <Button variant="Outline" asChild><a href="/create/studio">Reload Create Studio</a></Button>
        <Button variant="Ghost" asChild><Link href="/create">Back to the theme creator</Link></Button>
      </div>
      {error.digest ? <p className="studio-muted">Reference for the server log: {error.digest}</p> : null}
    </section>
  );
}
