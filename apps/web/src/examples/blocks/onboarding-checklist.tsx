"use client";

import * as React from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  Progress,
} from "@kinetixui/ui";

// kx-block:start
const STEPS = [
  { id: "account", label: "Create your account", done: true },
  { id: "workspace", label: "Name your workspace", done: true },
  { id: "invite", label: "Invite a teammate", done: false },
  { id: "connect", label: "Connect a repository", done: false },
  { id: "deploy", label: "Ship your first change", done: false },
];

export function OnboardingChecklistBlock() {
  const [done, setDone] = React.useState(() => new Set(STEPS.filter((step) => step.done).map((step) => step.id)));

  const toggle = (id: string) =>
    setDone((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Get started</CardTitle>
        <CardDescription>
          {done.size} of {STEPS.length} done
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {/*
          Counted, not measured: the bar announces "2 of 5 complete" rather than "40". A percentage is a
          rendering of the number, and the number is what a reader can act on.
        */}
        <Progress
          value={(done.size / STEPS.length) * 100}
          aria-label="Setup progress"
          aria-valuetext={`${done.size} of ${STEPS.length} complete`}
        />
        <ul className="grid gap-3">
          {STEPS.map((step) => (
            <li key={step.id} className="flex items-center gap-3">
              <Checkbox id={`ob-${step.id}`} checked={done.has(step.id)} onCheckedChange={() => toggle(step.id)} />
              <Label
                htmlFor={`ob-${step.id}`}
                className={done.has(step.id) ? "font-normal text-muted-foreground line-through" : "font-normal"}
              >
                {step.label}
              </Label>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button variant="Ghost" size="sm">
          Skip setup
        </Button>
      </CardFooter>
    </Card>
  );
}
// kx-block:end
