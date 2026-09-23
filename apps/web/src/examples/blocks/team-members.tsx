import { Avatar, AvatarFallback, Button, Card, CardContent, CardHeader, CardTitle, List, ListItem, Separator } from "@kinetixui/ui";

// kx-block:start
const TEAM = [
  { name: "Ada Lovelace", role: "Owner", initials: "AL" },
  { name: "Grace Hopper", role: "Admin", initials: "GH" },
  { name: "Alan Turing", role: "Member", initials: "AT" },
];

export function TeamMembersBlock() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Team</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        <List>
          {TEAM.map((m) => (
            <ListItem
              key={m.name}
              leading={
                <Avatar>
                  <AvatarFallback>{m.initials}</AvatarFallback>
                </Avatar>
              }
              title={m.name}
              description={m.role}
              trailing={
                <Button variant="Ghost" size="sm">
                  Remove
                </Button>
              }
            />
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
// kx-block:end
