import { Alert, AlertDescription, AlertTitle } from "@kinetixui/ui";

// kx-block:start
export function AlertStackBlock() {
  return (
    <div className="grid w-full max-w-md gap-3">
      <Alert>
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>You can add components to your app using the CLI.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertTitle>Payment failed</AlertTitle>
        <AlertDescription>Update your billing details to keep your subscription active.</AlertDescription>
      </Alert>
      <Alert variant="success">
        <AlertTitle>Changes saved</AlertTitle>
      </Alert>
    </div>
  );
}
// kx-block:end
