"use client";

import * as React from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  Separator,
  Slider,
  Tag,
} from "@kinetixui/ui";

// kx-block:start
const TOGGLES = [
  { id: "stock", label: "In stock" },
  { id: "sale", label: "On sale" },
  { id: "shipping", label: "Free shipping" },
];

export function FilterPanelBlock() {
  const [price, setPrice] = React.useState(250);
  const [active, setActive] = React.useState<string[]>(["stock"]);
  const priceId = React.useId();

  const toggle = (id: string) =>
    setActive((previous) => (previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id]));

  return (
    <Card className="w-full max-w-xs">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>Filters</CardTitle>
        <Button variant="Ghost" size="sm" onClick={() => setActive([])} disabled={active.length === 0}>
          Clear all
        </Button>
      </CardHeader>
      <CardContent className="grid gap-5">
        {active.length > 0 && (
          /*
            The tags name what they remove, not just "Remove" — a row of dismiss buttons that all announce
            the same word tells a screen-reader user which control they are on but not what it does.
          */
          <ul className="flex flex-wrap gap-2" aria-label="Active filters">
            {TOGGLES.filter((option) => active.includes(option.id)).map((option) => (
              <li key={option.id}>
                <Tag variant="secondary" onRemove={() => toggle(option.id)}>
                  {option.label}
                </Tag>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-3">
          <div className="flex items-baseline justify-between">
            {/* The number is visible, so the control does not depend on a tooltip nobody can reach. */}
            <Label id={priceId}>Maximum price</Label>
            <span className="text-sm tabular-nums text-muted-foreground">${price}</span>
          </div>
          <Slider
            value={[price]}
            onValueChange={([next]) => setPrice(next)}
            min={0}
            max={500}
            step={10}
            aria-labelledby={priceId}
          />
        </div>

        <Separator />

        <fieldset className="grid gap-3">
          <legend className="mb-3 text-sm font-medium">Availability</legend>
          {TOGGLES.map((option) => (
            <div key={option.id} className="flex items-center gap-3">
              <Checkbox
                id={`fp-${option.id}`}
                checked={active.includes(option.id)}
                onCheckedChange={() => toggle(option.id)}
              />
              <Label htmlFor={`fp-${option.id}`} className="font-normal">
                {option.label}
              </Label>
            </div>
          ))}
        </fieldset>
      </CardContent>
    </Card>
  );
}
// kx-block:end
