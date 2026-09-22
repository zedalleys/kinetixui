import { Button } from "@kinetixui/ui";
import { Inbox } from "lucide-react";

// kx-block:start
export function EmptyStateBlock() {
  return (
    <div className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
      <Inbox className="size-8 text-muted-foreground" />
      <h3 className="mt-2 font-medium">No messages yet</h3>
      <p className="text-sm text-muted-foreground">When someone messages you, it&apos;ll show up here.</p>
      <Button className="mt-4">Start a conversation</Button>
    </div>
  );
}
// kx-block:end
