import { Button, Card, CardContent, CardFooter, CardHeader, CardTitle, Skeleton, Spinner } from "@kinetixui/ui";

// kx-block:start
export function LoadingStateBlock() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      {/*
        A skeleton is a picture of nothing. It communicates "wait" to someone who can see the shapes and
        absolutely nothing to anyone who cannot, so the region says so out loud: aria-busy marks it as
        pending, and the live region gives a screen reader something to announce. Without this the card is
        simply silent until the data lands.
      */}
      <CardContent aria-busy="true" aria-live="polite" className="grid gap-4">
        <span className="sr-only">Loading activity</span>
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-3">
            {/* The shapes match what replaces them, so nothing moves when the data arrives. */}
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <Button variant="Outline" className="w-full" disabled>
          {/* aria-hidden on the spinner: the button already says "Loading", twice is noise. */}
          <Spinner aria-hidden="true" className="size-4" />
          Loading
        </Button>
      </CardFooter>
    </Card>
  );
}
// kx-block:end
