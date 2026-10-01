import { KEYBOARD, KEYBOARD_SOURCE } from "@/registry/keyboard.generated";

/**
 * The keyboard model for one component — but only the part that is actually proved.
 *
 * Before this, every component page answered "what keys does this respond to?" the same way: it did not.
 * The closest any came was a sentence handing the question to the primitive's own documentation
 * ("Keyboard and ARIA behaviour is inherited from Radix"), which is a true statement and a dead end for
 * someone deciding whether to adopt the component.
 *
 * Each line is generated from `components-keyboard.test.tsx` by `scripts/gen-keyboard.mjs`, so it is a
 * behaviour that runs in CI rather than a promise. The trade is deliberate: a component with a keyboard
 * test gets a keyboard section and one without gets none. Hand-writing a section for every component in
 * the catalogue would look more complete, mean less, and drift the first time a key changed.
 *
 * A server component holding no state, placed in the page body rather than in the metadata strip: the
 * strip is `"use client"`, so importing the generated table there would ship every component's keyboard
 * data to the browser on every docs page to render one component's worth of static markup. Here nothing
 * reaches the browser at all, and the heading above it lands in the table of contents like any other
 * section. `check:keyboard` fails if a component gains keyboard evidence without gaining this section.
 */
export function ComponentKeyboard({ slug }: { slug: string }) {
  const entries = KEYBOARD[slug];
  if (!entries?.length) return null;

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border">
      <p className="border-b border-border bg-muted/30 px-4 py-2.5 text-[13px] text-muted-foreground">
        {entries.length} behaviour{entries.length === 1 ? "" : "s"} asserted on every commit by{" "}
        <code className="text-foreground">{KEYBOARD_SOURCE}</code>. Listed because they are tested, not the
        other way round — if one stops being tested it stops appearing here.
      </p>
      <ul className="divide-y divide-border">
        {entries.map((e) => (
          <li key={e.behaviour} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <p className="m-0 min-w-0 text-[14px]">{e.behaviour}</p>
            {/*
              "Exercised", not "supported". The Checkbox test presses Enter precisely to prove it does NOT
              toggle, so a list headed "supported keys" would contradict the sentence beside it.
            */}
            <ul
              aria-label={`Keys exercised: ${e.behaviour}`}
              className="flex shrink-0 flex-wrap gap-1 sm:justify-end"
            >
              {e.keys.map((k) => (
                <li
                  key={k}
                  className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                >
                  {k}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
