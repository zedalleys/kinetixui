import type * as React from "react";
import { Reveal } from "@/components/reveal";
import { SectionHead } from "@/components/section-head";
import { cn } from "@/lib/utils";

/**
 * One section of the /iot page: the same chrome the page always had (hairline head, h2, lede), as a landmark.
 *
 * Each section is a `<section>` named by its own heading (`aria-labelledby`), so the page reads as a list of
 * regions in a screen reader's landmarks menu rather than one undifferentiated `main`. The `id` is the
 * in-page anchor the "On this page" nav links to; `scroll-mt-16` keeps the heading clear of the sticky header.
 *
 * A server component. The only client code inside is `Reveal`, which the whole site already ships.
 */
export function LabSection({
  id,
  index,
  label,
  meta,
  title,
  lede,
  tone = "base",
  children,
  className,
}: {
  id: string;
  index: string;
  label: string;
  meta?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  tone?: "base" | "muted";
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("scroll-mt-16 border-b border-border", tone === "muted" && "bg-muted/20", className)}
    >
      <div className="kx-edges relative mx-auto max-w-screen-2xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <Reveal>
          <SectionHead index={index} label={label} meta={meta} />
          <h2
            id={`${id}-title`}
            className="mt-6 max-w-2xl text-balance font-display text-3xl font-semibold tracking-[-0.02em] md:text-4xl"
          >
            {title}
          </h2>
          {lede ? <div className="mt-4 grid max-w-2xl gap-4 text-muted-foreground">{lede}</div> : null}
        </Reveal>
        {children}
      </div>
    </section>
  );
}
