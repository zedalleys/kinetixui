"use client";

import * as React from "react";
import { FilePlus, Link2, Plus, Search, X } from "lucide-react";
import { Button, Fab, Input, Popover, PopoverContent, PopoverTrigger, Slider } from "@kinetixui/ui";

/** Search keeps its label and focus while the workspace expands around it. Escape closes and restores focus. */
export function MotionSearch({ items }: { items: readonly string[] }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const trigger = React.useRef<HTMLButtonElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const id = React.useId();
  const matches = items.filter((item) => item.toLowerCase().includes(query.toLowerCase()));
  React.useEffect(() => { if (open) input.current?.focus(); }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  return <div className="kx-motion-search" data-open={open}>
    <div className="flex items-center gap-3">
      <Button ref={trigger} variant="Outline" size="icon" aria-label="Search components" aria-expanded={open} aria-controls={`${id}-results`} onClick={() => setOpen((v) => !v)}><Search aria-hidden="true" className="size-4" /></Button>
      {open ? <div className="kx-search-field flex min-w-0 flex-1 items-center gap-2">
        <label className="sr-only" htmlFor={`${id}-query`}>Filter example components</label>
        <Input ref={input} id={`${id}-query`} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") close(); }} placeholder="Find a component…" autoComplete="off" />
        <Button variant="Ghost" size="icon" aria-label="Close component search" onClick={close}><X aria-hidden="true" className="size-4" /></Button>
      </div> : <p className="text-sm text-muted-foreground">Find a component in this example.</p>}
    </div>
    <div id={`${id}-results`} hidden={!open} className="pt-4">
      <p role="status" className="text-sm text-muted-foreground">{matches.length ? `${matches.length} matching components` : "No matches. Try another name."}</p>
      <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">{matches.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  </div>;
}

/** A native popover owns dismissal/focus; actions remain ordinary buttons in document order. */
export function MotionSpeedDial({ onSelect }: { onSelect: (action: string) => void }) {
  const [open, setOpen] = React.useState(false);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Fab type="button" aria-label="Create an item" className="motion-reduce:transition-none"><Plus aria-hidden="true" className={`size-6 transition-transform duration-fast motion-reduce:transition-none ${open ? "rotate-45" : ""}`} /></Fab></PopoverTrigger>
    <PopoverContent side="top" align="end" className="w-56 max-w-[calc(100vw-2rem)] p-2" aria-label="Create an item">
      <div className="grid gap-1">
        <Button variant="Ghost" className="justify-start whitespace-normal" onClick={() => { onSelect("Document"); setOpen(false); }}><FilePlus aria-hidden="true" className="me-2 size-4" />New document</Button>
        <Button variant="Ghost" className="justify-start whitespace-normal" onClick={() => { onSelect("Link"); setOpen(false); }}><Link2 aria-hidden="true" className="me-2 size-4" />New link</Button>
      </div>
    </PopoverContent>
  </Popover>;
}

/** The bubble uses the slider's value and follows logical direction. Semantics stay on Radix's thumb. */
export function MotionRange({ value, onValueChange, labelId }: { value: number; onValueChange: (value: number) => void; labelId: string }) {
  return <div className="relative pb-1 pt-10">
    <div aria-hidden="true" className="kx-value-bubble absolute top-0 rounded-md bg-foreground px-2 py-1 text-xs tabular-nums text-background" style={{ insetInlineStart: `clamp(1rem, ${value}%, calc(100% - 1rem))` }}>{value}%</div>
    <Slider aria-labelledby={labelId} value={[value]} onValueChange={([v]) => onValueChange(v!)} max={100} step={1} />
  </div>;
}

/** Reveals existing data only on request; reduced motion shows the entire series immediately. */
export function MotionChart({ values, label }: { values: readonly number[]; label: string }) {
  const [take, setTake] = React.useState(0);
  return <div>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h4 className="font-medium">{label}</h4>
      <Button size="md" variant="Outline" onClick={() => setTake((v) => v + 1)}>Replay reveal</Button>
    </div>
    <div role="img" aria-label={`${label}: ${values.join(", ")}`} className="mt-6">
      <div key={take} aria-hidden="true" className="kx-chart-reveal flex h-24 items-end gap-3 border-b border-border">
        {values.map((value, i) => <div key={i} className="min-w-0 flex-1 bg-primary" style={{ height: `${Math.max(0, Math.min(100, value))}%` }} />)}
      </div>
    </div>
    <p className="mt-3 text-sm text-muted-foreground">Illustrative series: {values.join(" · ")}.</p>
  </div>;
}
