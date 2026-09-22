"use client";

// kx-flagship:start
import * as React from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Switch } from "@kinetixui/ui";

export function PreferencesPanel() {
  const [productUpdates, setProductUpdates] = React.useState(true);
  const [securityAlerts, setSecurityAlerts] = React.useState(true);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Notifications</CardTitle>
          <Badge variant="secondary">Synced</Badge>
        </div>
        <CardDescription>Choose what you hear about.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">Product updates</span>
          <Switch checked={productUpdates} onCheckedChange={setProductUpdates} aria-label="Product updates" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">Security alerts</span>
          <Switch checked={securityAlerts} onCheckedChange={setSecurityAlerts} aria-label="Security alerts" />
        </div>
        <Button className="w-full">Save preferences</Button>
      </CardContent>
    </Card>
  );
}
// kx-flagship:end
