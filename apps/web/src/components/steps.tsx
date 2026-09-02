import { cn } from "@/lib/utils";

export function Steps({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-12 ml-4 border-l border-border pl-8 [counter-reset:step] [&>h3]:step">{children}</div>
  );
}

export function Step({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("mt-8 scroll-m-20 text-base font-semibold tracking-tight", className)}>{children}</h3>;
}
