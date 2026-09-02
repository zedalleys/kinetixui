import Link from "next/link";
import { Construction } from "lucide-react";

export function ComingSoon({ title, node }: { title: string; node: string }) {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">
        Not built yet. The Figma component (<code className="text-foreground">{node}</code>) is
        specced; the code follows the{" "}
        <Link href="/docs/components/button" className="font-medium text-primary underline underline-offset-4">
          Button
        </Link>{" "}
        method — <code className="text-foreground">get_design_context</code> on the node, map each
        state to semantic tokens, CVA matrix 1:1 with the Figma properties.
      </p>
      <div className="mt-8 flex items-center gap-3 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        <Construction className="size-5 text-primary" />
        Check the <Link href="/docs/changelog" className="text-primary underline underline-offset-4">changelog</Link> for progress.
      </div>
    </div>
  );
}
