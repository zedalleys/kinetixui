import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Checkbox, Input, Label } from "@kinetixui/ui";
import { GithubIcon } from "@/components/github-button";

// kx-block:start
export function SignInBlock() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Enter your email to sign in to your account.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="signin-email">Email</Label>
          <Input id="signin-email" type="email" placeholder="you@example.com" />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="signin-password">Password</Label>
            <a href="#" className="text-xs text-primary underline-offset-4 hover:underline">
              Forgot?
            </a>
          </div>
          <Input id="signin-password" type="password" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox defaultChecked /> Remember me
        </label>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button className="w-full">Sign in</Button>
        <Button variant="Outline" className="w-full">
          <GithubIcon className="size-4" /> Continue with GitHub
        </Button>
      </CardFooter>
    </Card>
  );
}
// kx-block:end
