"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ChevronDown } from "lucide-react";
import { Button, Input, Spinner, Tabs, TabsContent, TabsList, TabsTrigger } from "@kinetixui/ui";
import { MotionChart, MotionRange, MotionSearch, MotionSpeedDial } from "./motion-patterns";
import { useDocumentDirection } from "@/lib/use-document-direction";
import { useAnimatedNumber } from "@/lib/use-animated-number";

/** User-driven state feedback with one bounded chart reveal on mount. No repeating choreography. */
export function MotionLab() {
  const dir = useDocumentDirection();
  const [amount, setAmount] = React.useState(64);
  const [expanded, setExpanded] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [action, setAction] = React.useState("Choose an action to try the speed dial.");
  const [pending, setPending] = React.useState(false);
  React.useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setPending(false), 900);
    return () => window.clearTimeout(timer);
  }, [pending]);
  const id = React.useId();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const error = submitted && !valid;

  return (
    <section id="motion" aria-labelledby={`${id}-title`} className="kx-motion-lab border-b border-border">
      <div className="mx-auto max-w-screen-2xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
        <div className="grid gap-8 lg-rem:grid-cols-2 lg-rem:items-end">
          <h2 id={`${id}-title`} className="max-w-xl text-balance font-display text-4xl font-semibold leading-tight tracking-[-0.03em] md:text-5xl">Motion with a reason.</h2>
          <p className="max-w-xl text-muted-foreground md:text-lg">A selection finds its place. A value catches up. A panel makes room. Try the details that connect an action to its result.</p>
        </div>
        <div className="mt-12 grid gap-12 lg-rem:grid-cols-2 lg-rem:gap-20">
          <div className="min-w-0">
            <Tabs dir={dir} defaultValue="overview">
              <TabsList aria-label="Motion example" motion="fluid">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="overview"><p className="py-6 text-sm text-muted-foreground">The indicator follows your selection. Arrow keys work here, too.</p></TabsContent>
              <TabsContent value="activity"><p className="py-6 text-sm text-muted-foreground">Each selection updates immediately. Motion never delays the action.</p></TabsContent>
              <TabsContent value="settings"><p className="py-6 text-sm text-muted-foreground">Your system&rsquo;s reduced-motion preference removes travel.</p></TabsContent>
            </Tabs>
            <div className="mt-4 border-y border-border py-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
                <label id={`${id}-amount`} className="font-medium">Preview intensity</label>
                <span className="font-display text-4xl tabular-nums" aria-hidden="true"><PreviewNumber value={amount} /><span className="ms-1 text-base text-muted-foreground">%</span></span>
              </div>
              <MotionRange labelId={`${id}-amount`} value={amount} onValueChange={setAmount} />
              <p className="mt-5 text-sm text-muted-foreground">Illustrative value. The numeric tween retargets when you move the slider again.</p>
            </div>
            <Button variant="Ghost" type="button" aria-expanded={expanded} aria-controls={`${id}-panel`} onClick={() => setExpanded((v) => !v)} className="kx-lab-disclosure whitespace-normal flex min-h-14 w-full items-center justify-between gap-4 py-4 text-start font-medium">
              What happens with reduced motion?
              <ChevronDown aria-hidden="true" className={`size-5 shrink-0 transition-transform duration-fast motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} />
            </Button>
            <div id={`${id}-panel`} hidden={!expanded} className="kx-lab-panel pb-6 text-sm leading-relaxed text-muted-foreground">Values arrive immediately, selection stays visible, and panels keep their content. The browser preview follows your system preference, including changes made while this page is open.</div>
          </div>
          <form noValidate onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="min-w-0 self-start border-t border-border pt-6">
            <h3 className="font-display text-2xl font-semibold">Feedback you can follow.</h3>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">Submit an address to try validation. This is a local demonstration; nothing is sent or saved.</p>
            <label htmlFor={`${id}-email`} className="mt-8 block text-sm font-medium">Email address</label>
            <Input id={`${id}-email`} type="email" autoComplete="off" value={email} onChange={(e) => { setEmail(e.target.value); setSubmitted(false); }} aria-invalid={error} aria-describedby={`${id}-feedback`} className="mt-3" placeholder="you@example.com" />
            <div id={`${id}-feedback`} aria-live="polite" className="min-h-16 py-3 text-sm">
              {error ? <p className="kx-lab-feedback text-destructive">Enter an email address such as you@example.com.</p> : submitted ? <p className="kx-lab-feedback flex items-center gap-2 text-foreground"><Check aria-hidden="true" className="size-4" />Address accepted for this demo.</p> : <p className="text-muted-foreground">Try an incomplete address to see the error state.</p>}
            </div>
            <Button type="submit">Check address</Button>
            <Link href="/docs/foundations#motion-roles" className="mt-10 flex min-h-10 items-center gap-2 text-sm font-medium text-primary underline underline-offset-4">Explore the motion contract <ArrowUpRight aria-hidden="true" className="size-4" /></Link>
          </form>
        </div>
        <div className="mt-16 grid gap-12 border-t border-border pt-10 lg-rem:grid-cols-2 lg-rem:gap-20">
          <div className="min-w-0">
            <h3 className="font-display text-2xl font-semibold">Room for the next action.</h3>
            <div className="mt-6"><MotionSearch items={["Button", "Switch", "Slider", "Tabs", "Card", "Popover"]} /></div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-6 border-t border-border pt-6">
              <p role="status" className="text-sm text-muted-foreground">{action}</p>
              <MotionSpeedDial onSelect={(next) => setAction(`${next} selected in this local demo.`)} />
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button className="max-w-full whitespace-normal" disabled={pending} aria-busy={pending} onClick={() => setPending(true)}>{pending ? <><Spinner className="me-2" />Working…</> : "Try pending feedback"}</Button>
              <span role="status" className="text-sm text-muted-foreground">{pending ? "Simulating a local task." : "Ready. No network request."}</span>
            </div>
          </div>
          <div className="min-w-0 self-center"><MotionChart label="Progressive data reveal" values={[35, 58, 46, 72, 64, 90]} /></div>
        </div>
      </div>
    </section>
  );
}

function PreviewNumber({ value }: { value: number }) {
  return <>{Math.round(useAnimatedNumber(value))}</>;
}
