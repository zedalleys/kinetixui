"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

/** Optional native ports of the same block, shown as sub-tabs of "code". */
export type NativeCode = { compose?: string; flutter?: string };

/**
 * Live example + copyable source, used by /blocks and /charts.
 * Simpler than <ComponentPreview> — one code string, no demo registry.
 * Pass `native` to add Compose / Flutter columns to the code tab.
 */
export function Showcase({
  title,
  description,
  code,
  native,
  children,
  className,
  contentClassName,
}: {
  title: string;
  description?: string;
  code: string;
  native?: NativeCode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const langs = React.useMemo(() => {
    const out = [{ key: "react", label: "React", value: code }];
    if (native?.compose) out.push({ key: "compose", label: "Compose", value: native.compose });
    if (native?.flutter) out.push({ key: "flutter", label: "Flutter", value: native.flutter });
    return out;
  }, [code, native]);

  const [lang, setLang] = React.useState("react");
  const active = langs.find((l) => l.key === lang) ?? langs[0];
  const multi = langs.length > 1;

  return (
    <section className={cn("scroll-mt-28", className)}>
      <h3 className="font-display text-lg font-semibold tracking-[-0.01em]">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}

      <div className="mt-3 overflow-hidden rounded-xl border border-border">
        <Tabs.Root defaultValue="preview">
          <Tabs.List className="flex items-center gap-1 bg-muted/30 px-2">
            {["preview", "code"].map((v) => (
              <Tabs.Trigger
                key={v}
                value={v}
                className={cn(
                  "-mb-px border-b-2 border-transparent px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors",
                  "hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground",
                )}
              >
                {v}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="preview">
            <div
              className={cn(
                "flex min-h-[280px] w-full items-center justify-center border-t border-border bg-background p-8",
                contentClassName,
              )}
            >
              {children}
            </div>
          </Tabs.Content>

          <Tabs.Content value="code">
            <div className="relative border-t border-border bg-muted/40">
              {multi && (
                <div className="flex items-center gap-1 border-b border-border/60 px-3 pt-1.5">
                  {langs.map((l) => (
                    <button
                      key={l.key}
                      type="button"
                      onClick={() => setLang(l.key)}
                      className={cn(
                        "-mb-px border-b-2 border-transparent px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors",
                        "hover:text-foreground",
                        l.key === active.key && "border-primary text-foreground",
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
              <CopyButton
                value={active.value}
                className={cn("absolute right-3 z-10", multi ? "top-11" : "top-3")}
              />
              <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
                <code>{active.value}</code>
              </pre>
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </section>
  );
}
