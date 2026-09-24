"use client";

import * as React from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Label,
  PasswordInput,
  Progress,
} from "@kinetixui/ui";

// kx-block:start
/**
 * Four independent signals rather than one length rule. A meter that only counts characters rewards a long
 * common word, which is the thing a dictionary attack is best at; counting variety rewards the thing it is
 * worst at. The rules are data so the hint can name what is still missing instead of saying "weak".
 */
const RULES = [
  { label: "12 characters", met: (p: string) => p.length >= 12 },
  { label: "an upper and a lower case letter", met: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "a number", met: (p: string) => /\d/.test(p) },
  { label: "a symbol", met: (p: string) => /[^A-Za-z0-9]/.test(p) },
];
const STRENGTH = ["Too weak", "Weak", "Fair", "Good", "Strong"];

export function CreateAccountBlock() {
  const [password, setPassword] = React.useState("");
  const [accepted, setAccepted] = React.useState(false);
  const missing = RULES.filter((rule) => !rule.met(password));
  const met = RULES.length - missing.length;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Free for 14 days. No card required.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Field>
          <FieldLabel htmlFor="ca-email">Email</FieldLabel>
          <Input id="ca-email" type="email" autoComplete="email" placeholder="you@example.com" />
        </Field>
        <Field>
          <FieldLabel htmlFor="ca-password">Password</FieldLabel>
          <PasswordInput
            id="ca-password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {/*
            aria-valuetext carries the word, not the percentage: "Fair" is the thing being communicated, and
            "50" is an implementation detail nobody needs read aloud.
          */}
          <Progress
            className="h-1"
            value={(met / RULES.length) * 100}
            aria-label="Password strength"
            aria-valuetext={STRENGTH[met]}
          />
          <FieldDescription>
            {missing.length === 0 ? "Strong password." : `Still needs ${missing.map((rule) => rule.label).join(", ")}.`}
          </FieldDescription>
        </Field>
        <div className="flex items-start gap-2">
          <Checkbox id="ca-terms" checked={accepted} onCheckedChange={(value) => setAccepted(value === true)} />
          <Label htmlFor="ca-terms" className="text-sm font-normal leading-snug text-muted-foreground">
            I agree to the terms of service and the privacy policy.
          </Label>
        </div>
        <Button className="w-full" disabled={!accepted || missing.length > 0}>
          Create account
        </Button>
      </CardContent>
    </Card>
  );
}
// kx-block:end
