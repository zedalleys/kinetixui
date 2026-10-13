"use client";

import * as React from "react";
import { Download, Printer, Share2 } from "lucide-react";
import {
  AmountDisplay,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  DescriptionList,
  DescriptionListItem,
  PriceBreakdown,
  PriceBreakdownLine,
  PriceBreakdownTotal,
  ReferenceCode,
  Tag,
} from "@kinetixui/ui";

// kx-block:start
/**
 * One business-neutral receipt. A payment, booking, transfer, order or refund receipt is this block with
 * different words: the issuer, what was paid, how it is made up, how it was paid and the reference the
 * reader will quote. Amounts arrive formatted — the block computes nothing — and the actions are callbacks:
 * generating a PDF, printing and sharing are the product's, not the block's.
 */
export function ReceiptBlock({
  onDownload,
  onPrint,
  onShare,
}: {
  onDownload?: () => void;
  onPrint?: () => void;
  onShare?: () => void;
}) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle>Harbour Coffee Roasters</CardTitle>
          <CardDescription>Payment receipt</CardDescription>
        </div>
        {/* The status is a word, not a colour. */}
        <Tag>Paid</Tag>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="flex flex-col gap-1">
          <span className="text-label-md text-muted-foreground">Amount paid</span>
          <AmountDisplay value="162.75" currency="SAR" accessibleLabel="162.75 Saudi riyals" />
        </div>

        <ReferenceCode label="Receipt number" value="RCP-2026-004817" />

        <DescriptionList>
          <DescriptionListItem term="Date">
            <time dateTime="2026-03-14T09:42">14 Mar 2026, 09:42</time>
          </DescriptionListItem>
          <DescriptionListItem term="Paid with">Visa ending 4242</DescriptionListItem>
          <DescriptionListItem term="Paid to">Harbour Coffee Roasters, Riyadh</DescriptionListItem>
        </DescriptionList>

        <PriceBreakdown aria-label="Receipt summary">
          <PriceBreakdownLine label="Single-origin beans" description="2 × SAR 62.00" value="SAR 124.00" />
          <PriceBreakdownLine label="Pour-over filters" value="SAR 18.00" />
          <PriceBreakdownLine label="Member discount" description="10% on beans" value="−SAR 12.40" kind="deduction" />
          <PriceBreakdownLine label="VAT" description="15%" value="SAR 19.29" />
          <PriceBreakdownLine label="Rounding" value="+SAR 0.01" />
          <PriceBreakdownTotal label="Total paid" value="SAR 162.75" />
        </PriceBreakdown>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button variant="Outline" onClick={onDownload}>
          <Download aria-hidden />
          Download
        </Button>
        <Button variant="Outline" onClick={onPrint}>
          <Printer aria-hidden />
          Print
        </Button>
        <Button variant="Ghost" onClick={onShare}>
          <Share2 aria-hidden />
          Share
        </Button>
      </CardFooter>
    </Card>
  );
}
// kx-block:end
