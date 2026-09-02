import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ComponentPreview } from "@/components/component-preview";
import { Callout } from "@/components/callout";
import { Steps, Step } from "@/components/steps";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (p) => <h1 className="mt-2 scroll-m-20 text-3xl font-semibold tracking-tight" {...p} />,
    h2: (p) => (
      <h2
        className="mt-12 scroll-m-20 border-b border-border pb-2 text-xl font-semibold tracking-tight first:mt-0"
        {...p}
      />
    ),
    h3: (p) => <h3 className="mt-8 scroll-m-20 text-lg font-semibold tracking-tight" {...p} />,
    h4: (p) => <h4 className="mt-6 scroll-m-20 font-semibold tracking-tight" {...p} />,
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
