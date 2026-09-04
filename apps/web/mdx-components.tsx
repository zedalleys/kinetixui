import type { MDXComponents } from "mdx/types";
import type { ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ComponentPreview } from "@/components/component-preview";
import { Callout } from "@/components/callout";
import { Steps, Step } from "@/components/steps";

/** Heading with a hover-revealed `#` permalink (id comes from rehype-slug). */
function heading(Tag: "h2" | "h3" | "h4") {
  return function Heading({ id, children, className, ...p }: ComponentPropsWithoutRef<"h2">) {
    return (
      <Tag id={id} className={cn("group scroll-mt-28", className)} {...p}>
        {children}
        {id ? (
          <a
            href={`#${id}`}
            data-heading-anchor
            aria-label="Permalink to this section"
            className="ml-2 text-muted-foreground no-underline opacity-0 transition-opacity hover:text-primary focus-visible:opacity-100 group-hover:opacity-100"
          >
            #
          </a>
        ) : null}
      </Tag>
    );
  };
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (p) => <h1 className="mt-2 scroll-mt-28 text-3xl font-semibold tracking-tight" {...p} />,
    h2: heading("h2"),
    h3: heading("h3"),
    h4: heading("h4"),
    p: (p) => <p className="leading-7 [&:not(:first-child)]:mt-5" {...p} />,
    ul: (p) => <ul className="my-5 ml-6 list-disc [&>li]:mt-2" {...p} />,
    ol: (p) => <ol className="my-5 ml-6 list-decimal [&>li]:mt-2" {...p} />,
    a: ({ href = "", ...p }) => (
      <Link href={href} className="font-medium text-primary underline underline-offset-4" {...p} />
    ),
    hr: (p) => <hr className="my-8 border-border" {...p} />,
    table: (p) => (
      <div className="my-6 w-full overflow-x-auto">
        <table className="w-full border-collapse text-sm" {...p} />
      </div>
    ),
    th: (p) => <th className="border border-border px-4 py-2 text-left font-semibold" {...p} />,
    td: (p) => <td className="border border-border px-4 py-2" {...p} />,
    pre: ({ className, ...p }) => (
      <pre className={cn("my-4 rounded-lg border border-border bg-muted/40 text-[13px]", className)} {...p} />
    ),
    ComponentPreview,
    Callout,
    Steps,
    Step,
    ...components,
  };
}
