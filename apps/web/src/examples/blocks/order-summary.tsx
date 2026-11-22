"use client";

import * as React from "react";
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  FieldLabel,
  Input,
  NumberInput,
  Separator,
} from "@kinetixui/ui";

// kx-block:start
const ITEMS = [
  { id: "tee", name: "Kinetix T-shirt", unit: 28, qty: 2 },
  { id: "stickers", name: "Sticker pack", unit: 6, qty: 1 },
];

const money = (cents: number) => `$${cents.toFixed(2)}`;

export function OrderSummaryBlock() {
  const [quantities, setQuantities] = React.useState<Record<string, number>>(
    Object.fromEntries(ITEMS.map((item) => [item.id, item.qty])),
  );

  const subtotal = ITEMS.reduce((total, item) => total + item.unit * quantities[item.id], 0);
  const shipping = subtotal > 50 || subtotal === 0 ? 0 : 5;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Order summary</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ul className="grid gap-4">
          {/*
            `flex-wrap` on each row below is load-bearing at large text, not tidiness. The row was a fixed
            one-line flex: at 200% text the name took its share and the stepper was squeezed to 161px
            against the 178px its own two buttons and field need, so the wrapper's `overflow-hidden` cut
            17px off and the quantity digit no longer fitted its field. A person at 200% text could not
            read the quantity they had chosen — WCAG 1.4.4. Wrapping lets the stepper drop to its own line
            rather than be compressed below its minimum. Found by this milestone's new 200%-text clipping
            check, after Codex pointed out that check only looked at ancestors, never inside the block.
          */}
          {ITEMS.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid min-w-0 gap-0.5">
                <span className="text-sm">{item.name}</span>
                <span className="text-xs text-muted-foreground">{money(item.unit)} each</span>
              </div>
              {/*
                Named per item, not just "Quantity". Two steppers that both announce "Quantity" leave a
                screen-reader user changing the count of something they cannot identify.
              */}
              <NumberInput
                aria-label={`Quantity, ${item.name}`}
                value={quantities[item.id]}
                min={0}
                max={99}
                onChange={(next) => setQuantities((previous) => ({ ...previous, [item.id]: next }))}
              />
            </li>
          ))}
        </ul>

        <Separator />

        <Field>
          <FieldLabel htmlFor="os-promo">Promo code</FieldLabel>
          <div className="flex gap-2">
            <Input id="os-promo" placeholder="KINETIX10" className="flex-1" />
            <Button variant="Outline">Apply</Button>
          </div>
        </Field>

        <Separator />

        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums">{money(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            {/* "Free" is a word, so it is written as one rather than left as $0.00 to be inferred. */}
            <dd className="tabular-nums">{shipping === 0 ? "Free" : money(shipping)}</dd>
          </div>
          <div className="flex justify-between font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums">{money(subtotal + shipping)}</dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter>
        <Button className="w-full" disabled={subtotal === 0}>
          Place order
        </Button>
      </CardFooter>
    </Card>
  );
}
// kx-block:end
