import { Avatar, AvatarFallback, Button, Card, CardContent, Textarea } from "@kinetixui/ui";

// kx-block:start
export function CommentBoxBlock() {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="flex items-start gap-3 pt-6">
        <Avatar>
          <AvatarFallback>ZF</AvatarFallback>
        </Avatar>
        <div className="grid w-full gap-2">
          <Textarea placeholder="Add a comment…" />
          <Button className="ml-auto w-fit">Comment</Button>
        </div>
      </CardContent>
    </Card>
  );
}
// kx-block:end
