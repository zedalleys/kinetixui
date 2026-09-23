import { Card, CardContent, CardHeader, CardTitle, List, ListItem, Separator, Switch } from "@kinetixui/ui";

// kx-block:start
export function SettingsListBlock() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        <List>
          <ListItem
            title="Email"
            description="Product news and receipts"
            trailing={<Switch aria-label="Email notifications" defaultChecked />}
          />
          <ListItem
            title="Push"
            description="Activity on your projects"
            trailing={<Switch aria-label="Push notifications" defaultChecked />}
          />
          <ListItem title="SMS" description="Only critical alerts" trailing={<Switch aria-label="SMS notifications" />} />
        </List>
      </CardContent>
    </Card>
  );
}
// kx-block:end
