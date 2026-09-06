/**
 * Shown while a component's MDX page streams in — a click on a /components card
 * lands here immediately instead of on a dead frame (noticeable in dev, where
 * the route compiles on first open; and on a cold/slow network in prod). Mirrors
 * the rough shape of a component doc: title, lead, live preview, code block.
 */
function Bar({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-muted ${className}`} />;
}

export default function ComponentDocLoading() {
  return (
    <>
      <p role="status" className="sr-only">
        Loading component…
      </p>
      <div className="animate-pulse" aria-hidden>
        {/* title + lead */}
        <Bar className="h-8 w-1/2" />
        <Bar className="mt-4 h-4 w-11/12" />
        <Bar className="mt-2 h-4 w-2/3" />

        {/* install line */}
        <Bar className="mt-8 h-10 w-full max-w-md" />

        {/* live preview frame */}
        <div className="mt-8 rounded-xl border border-border">
          <div className="flex h-64 items-center justify-center border-b border-border bg-muted/20">
            <Bar className="h-24 w-40" />
          </div>
          <div className="flex gap-2 p-3">
            <Bar className="h-7 w-16" />
            <Bar className="h-7 w-16" />
          </div>
        </div>

        {/* code block */}
        <Bar className="mt-6 h-40 w-full" />

        {/* prose */}
        <Bar className="mt-8 h-4 w-full" />
        <Bar className="mt-2 h-4 w-10/12" />
        <Bar className="mt-2 h-4 w-9/12" />
      </div>
    </>
  );
}
