import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Button, Input, Textarea } from "@strata/ui";
import { docsNav } from "@/lib/site";

export const metadata: Metadata = {
  title: "Components",
  description: "Every component in the Strata registry.",
};

const previews: Record<string, React.ReactNode> = {
  Button: (
    <div className="flex flex-wrap gap-2">
      <Button size="sm">Button</Button>
      <Button size="sm" variant="Outline">Outline</Button>
    </div>
  ),
  Input: <Input placeholder="you@example.com" />,
  Textarea: <Textarea placeholder="Message…" rows={2} />,
};

export default function ComponentsPage() {
  const items = docsNav.find((g) => g.title === "Components")!.items;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Components</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Built from Figma, styled against the token contract, distributed through the shadcn registry.
        {" "}
        {items.filter((i) => !i.disabled).length} of {items.length} shipped.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.disabled ? "#" : item.href}
            aria-disabled={item.disabled}
            className={
              "group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors " +
              (item.disabled ? "pointer-events-none opacity-50" : "hover:border-primary/40")
            }
          >
            <div className="flex min-h-[80px] items-center">
              {previews[item.title] ?? (
                <span className="text-sm text-muted-foreground">{item.label ?? "Coming soon"}</span>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-medium">{item.title}</span>
              {!item.disabled && (
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
