"use client";

import * as React from "react";
import {
  Avatar,
  AvatarFallback,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Separator,
  Textarea,
} from "@kinetixui/ui";

// kx-block:start
const VISIBILITY = [
  { value: "everyone", label: "Everyone", hint: "Anyone with the link can see your profile." },
  { value: "team", label: "Only my team", hint: "People in your workspace." },
  { value: "nobody", label: "Nobody", hint: "Your profile stays hidden." },
];

export function ProfileFormBlock() {
  const [visibility, setVisibility] = React.useState("team");

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>This is how you appear to other people.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback>ZF</AvatarFallback>
          </Avatar>
          <div className="grid gap-1">
            <Button variant="Outline" size="sm" className="w-fit">
              Change photo
            </Button>
            <p className="text-xs text-muted-foreground">JPG or PNG, up to 2&nbsp;MB.</p>
          </div>
        </div>
        <Field>
          <FieldLabel htmlFor="pf-name">Display name</FieldLabel>
          <Input id="pf-name" defaultValue="Ziad Fteha" autoComplete="name" />
        </Field>
        <Field>
          <FieldLabel htmlFor="pf-bio">Bio</FieldLabel>
          <Textarea id="pf-bio" rows={3} defaultValue="Building a five-platform design system." />
          <FieldDescription>Shown under your name. Plain text.</FieldDescription>
        </Field>
        <Separator />
        {/*
          A radio group, not a select: three mutually exclusive choices whose consequences differ, so they
          should all be readable at once rather than hidden behind a closed control.
        */}
        <fieldset className="grid gap-3">
          <legend className="mb-3 text-sm font-medium">Who can see your profile</legend>
          <RadioGroup value={visibility} onValueChange={setVisibility} className="grid gap-3">
            {VISIBILITY.map((option) => (
              <div key={option.value} className="flex items-start gap-3">
                <RadioGroupItem id={`pf-${option.value}`} value={option.value} className="mt-0.5" />
                <div className="grid gap-0.5">
                  <Label htmlFor={`pf-${option.value}`} className="font-normal">
                    {option.label}
                  </Label>
                  <span className="text-xs text-muted-foreground">{option.hint}</span>
                </div>
              </div>
            ))}
          </RadioGroup>
        </fieldset>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="Ghost">Cancel</Button>
        <Button>Save changes</Button>
      </CardFooter>
    </Card>
  );
}
// kx-block:end
