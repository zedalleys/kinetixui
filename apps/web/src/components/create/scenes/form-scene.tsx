"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  NativeSelect,
  Separator,
  Switch,
  Textarea,
} from "@kinetixui/ui";
import { CircleAlert } from "lucide-react";

/**
 * The second scene: a form.
 *
 * It exists because the dashboard cannot show what a theme does to input surfaces. Field borders, the
 * focus ring, a disabled control, an invalid field and the gap between `muted` and `background` are the
 * places a radius or neutral change is most visible and most likely to be wrong, and none of them appear
 * on a page of stat cards (§35).
 *
 * One more scene, not four. Mobile and Content would be tabs with nothing new to say about the controls
 * this PR ships.
 */
export function FormScene() {
  return (
    <div className="min-h-full bg-background p-4 text-foreground">
      <div className="mx-auto max-w-xl space-y-4">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Deployment settings</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Applies to every environment in this project.
          </p>
        </div>

        <Card>
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm">General</CardTitle>
            <CardDescription className="text-xs">Names are visible to everyone on the team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="create-form-name">Project name</Label>
              <Input id="create-form-name" defaultValue="acme-analytics" readOnly />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-form-region">Region</Label>
              <NativeSelect id="create-form-region" defaultValue="eu" disabled>
                <option value="eu">Europe (Frankfurt)</option>
                <option value="us">US East</option>
              </NativeSelect>
              <p className="text-xs text-muted-foreground">Disabled — a muted control on a muted surface.</p>
            </div>

            {/* An invalid field: the one place `destructive` appears on an input surface. */}
            <div className="space-y-2">
              <Label htmlFor="create-form-domain">Custom domain</Label>
              <Input
                id="create-form-domain"
                defaultValue="not a domain"
                aria-invalid
                aria-describedby="create-form-domain-error"
                readOnly
                className="border-destructive"
              />
              <p id="create-form-domain-error" className="text-xs text-destructive">
                Enter a hostname, without a protocol.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-form-notes">Release notes</Label>
              <Textarea id="create-form-notes" rows={3} placeholder="What changed in this release?" readOnly />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm">Checks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="flex items-start gap-3">
              <Checkbox id="create-form-required" defaultChecked />
              <div className="space-y-1">
                <Label htmlFor="create-form-required">Require passing checks</Label>
                <p className="text-xs text-muted-foreground">Blocks a deploy while CI is red.</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="create-form-preview">Preview deployments</Label>
                <p className="text-xs text-muted-foreground">One per pull request.</p>
              </div>
              <Switch id="create-form-preview" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Alert variant="info">
          <CircleAlert className="size-4" aria-hidden />
          <AlertTitle>Changes apply on the next deploy</AlertTitle>
          <AlertDescription>Nothing here restarts a running environment.</AlertDescription>
        </Alert>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="outline">Draft</Badge>
          <div className="flex gap-2">
            <Button size="sm" variant="Ghost">
              Cancel
            </Button>
            <Button size="sm" variant="Secondary">
              Save draft
            </Button>
            <Button size="sm">Save changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
