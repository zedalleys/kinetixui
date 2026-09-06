"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMITIVE, COMPONENT_CATEGORY } from "@/lib/component-registry";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 px-3.5 py-2">
      <dt className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 font-mono text-[12px]">{children}</dd>
    </div>
  );
}

/** Compact spec strip under a component-doc title. Auto-derived from the route. */
export function ComponentMeta() {
  const pathname = usePathname();
  const slug = pathname.startsWith("/docs/components/") ? pathname.split("/").pop()! : "";
  if (!slug) return null;

  return (
    <dl
      aria-label="Component metadata"
      className="my-6 divide-y divide-border rounded-lg border border-border bg-muted/20"
    >
      {COMPONENT_CATEGORY[slug] && <Row label="Category">{COMPONENT_CATEGORY[slug]}</Row>}
      {PRIMITIVE[slug] && <Row label="Built on">{PRIMITIVE[slug]}</Row>}
      <Row label="CLI">
        <span className="break-all">npx @kinetixui/cli add {slug}</span>
      </Row>
      <Row label="Registry">
        <a
          href={`/r/${slug}.json`}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2"
        >
          /r/{slug}.json
        </a>
      </Row>
      <Row label="A11y">
        <Link href="/docs/accessibility" className="text-primary underline underline-offset-2">
          audited in CI →
        </Link>
      </Row>
    </dl>
  );
}
