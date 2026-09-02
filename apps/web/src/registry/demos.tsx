"use client";

import { Button, Input, Textarea } from "@kinetixui/ui";

/* Live demos used by <ComponentPreview name="…" />. Keep each self-contained. */

export function ButtonDemo() {
  return <Button>Button</Button>;
}

export function ButtonVariants() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="Primary">Primary</Button>
      <Button variant="Secondary">Secondary</Button>
      <Button variant="Outline">Outline</Button>
      <Button variant="Destructive">Destructive</Button>
      <Button variant="Ghost">Ghost</Button>
      <Button variant="Link">Link</Button>
    </div>
  );
}

export function ButtonSizes() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  );
}

export function InputDemo() {
  return (
    <div className="w-full max-w-sm">
      <Input placeholder="you@example.com" type="email" />
    </div>
  );
}

export function InputStates() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <Input placeholder="Default" />
      <Input placeholder="Error" state="Error" defaultValue="Not quite right" />
      <Input placeholder="Disabled" state="Disabled" />
    </div>
  );
}

export function TextareaDemo() {
  return (
    <div className="w-full max-w-sm">
      <Textarea placeholder="Type your message…" />
    </div>
  );
}

export const demoRegistry: Record<
  string,
  { component: React.ComponentType; source: string }
> = {
  "button-demo": {
    component: ButtonDemo,
    source: `import { Button } from "@kinetixui/ui"

export function ButtonDemo() {
  return <Button>Button</Button>
}`,
  },
  "button-variants": {
    component: ButtonVariants,
    source: `import { Button } from "@kinetixui/ui"

export function ButtonVariants() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="Primary">Primary</Button>
      <Button variant="Secondary">Secondary</Button>
      <Button variant="Outline">Outline</Button>
      <Button variant="Destructive">Destructive</Button>
      <Button variant="Ghost">Ghost</Button>
      <Button variant="Link">Link</Button>
    </div>
  )
}`,
  },
  "button-sizes": {
    component: ButtonSizes,
    source: `import { Button } from "@kinetixui/ui"

export function ButtonSizes() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  )
}`,
  },
  "input-demo": {
    component: InputDemo,
    source: `import { Input } from "@kinetixui/ui"

export function InputDemo() {
  return <Input placeholder="you@example.com" type="email" />
}`,
  },
  "input-states": {
    component: InputStates,
    source: `import { Input } from "@kinetixui/ui"

export function InputStates() {
  return (
    <div className="flex flex-col gap-3">
      <Input placeholder="Default" />
      <Input placeholder="Error" state="Error" defaultValue="Not quite right" />
      <Input placeholder="Disabled" state="Disabled" />
    </div>
  )
}`,
  },
  "textarea-demo": {
    component: TextareaDemo,
    source: `import { Textarea } from "@kinetixui/ui"

export function TextareaDemo() {
  return <Textarea placeholder="Type your message…" />
}`,
  },
};
