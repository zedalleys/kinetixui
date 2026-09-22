import { Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@kinetixui/ui";
import { Check } from "lucide-react";

// kx-block:start
const FEATURES = ["Unlimited projects", "Priority support", "Custom domains", "Analytics"];

export function PricingTierBlock() {
  return (
    <Card className="w-full max-w-xs">
      <CardHeader>
        <Badge variant="subtle" className="w-fit">
          Most popular
        </Badge>
        <CardTitle className="mt-2">Pro</CardTitle>
        <CardDescription>For growing teams.</CardDescription>
        <p className="mt-2 text-3xl font-semibold">
          $29<span className="text-base font-normal text-muted-foreground">/mo</span>
        </p>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        {FEATURES.map((f) => (
          <span key={f} className="flex items-center gap-2">
            <Check className="size-4 text-primary" /> {f}
          </span>
        ))}
      </CardContent>
      <CardFooter>
        <Button className="w-full">Upgrade to Pro</Button>
      </CardFooter>
    </Card>
  );
}
// kx-block:end
