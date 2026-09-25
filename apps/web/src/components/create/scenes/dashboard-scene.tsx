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
  Input,
  Label,
  Metric,
  Progress,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kinetixui/ui";
import { CircleAlert, LayoutGrid, Settings, Users } from "lucide-react";

/**
 * The default preview scene: a small application built from real @kinetixui/ui components.
 *
 * Every element here earns its place by exercising a token the user can change — surface (`background`,
 * `card`), text hierarchy (`foreground`, `muted-foreground`), `border`, the action colour on a filled
 * button, `accent` on the selected nav row, `input` on the form field, and the status colours on the
 * badges and the alert. Nothing is a hand-drawn stand-in: if a change to `--border` does not show up
 * here, it does not show up in the library either, and that is worth finding out in the builder.
 *
 * It is a plain presentational component with no props, so a second scene is a sibling file and an entry
 * in the scene map — not a change to this one.
 */
export function DashboardScene() {
  return (
    <div className="flex min-h-full flex-col bg-background text-foreground">
      {/* app bar */}
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded bg-primary text-primary-foreground">
            <LayoutGrid className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-medium">Acme Analytics</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="subtle">Preview</Badge>
          <Button size="sm" variant="Ghost" aria-label="Settings">
            <Settings className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col sm:flex-row">
        {/* sidebar — `accent` on the selected row, `muted-foreground` on the rest */}
        <nav aria-label="Preview sections" className="shrink-0 border-border sm:w-40 sm:border-e">
          <ul className="flex flex-wrap gap-1 p-2 sm:block sm:space-y-1">
            {[
              { label: "Overview", active: true },
              { label: "Reports", active: false },
              { label: "Members", active: false },
              { label: "Settings", active: false },
            ].map((item) => (
              <li key={item.label}>
                <span
                  aria-current={item.active ? "page" : undefined}
                  className={
                    item.active
                      ? "block whitespace-nowrap rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground"
                      : "block whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground"
                  }
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1 space-y-4 p-4">
          {/* page header */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">Overview</h3>
              <p className="text-sm text-muted-foreground">Last 30 days across all workspaces.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Every action role side by side: this is where a theme change is judged. */}
              <Button size="sm" variant="Ghost">
                Cancel
              </Button>
              <Button size="sm" variant="Outline">
                Export
              </Button>
              <Button size="sm" variant="Secondary">
                Duplicate
              </Button>
              <Button size="sm" variant="Destructive">
                Delete
              </Button>
              <Button size="sm">New report</Button>
            </div>
          </div>

          {/* stats */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <Metric label="Active users" value="8,420" trend="up" change="12%" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Metric label="Sessions" value="31,904" trend="up" change="4%" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Metric label="Error rate" value="0.42%" trend="down" change="0.1%" />
              </CardContent>
            </Card>
          </div>

          <Alert variant="warning">
            <CircleAlert className="size-4" aria-hidden />
            <AlertTitle>Ingest lagging</AlertTitle>
            <AlertDescription>Two sources are behind by more than an hour.</AlertDescription>
          </Alert>

          <Card>
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-sm">Traffic by source</CardTitle>
              <CardDescription className="text-xs">Series colours, drawn from the chart tokens.</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex h-24 items-end gap-2" role="img" aria-label="Five data series, shown as coloured bars">
                {[
                  { token: "bg-chart-1", height: "h-full", label: "Direct" },
                  { token: "bg-chart-2", height: "h-4/5", label: "Search" },
                  { token: "bg-chart-3", height: "h-3/5", label: "Social" },
                  { token: "bg-chart-4", height: "h-2/5", label: "Email" },
                  { token: "bg-chart-5", height: "h-1/4", label: "Referral" },
                ].map((s) => (
                  <div key={s.label} className="flex h-full flex-1 flex-col justify-end gap-2">
                    <div className={`${s.token} ${s.height} w-full rounded-sm`} />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {["Direct", "Search", "Social", "Email", "Referral"].map((label, i) => (
                  <span key={label} className="inline-flex items-center gap-1.5">
                    <span className={`bg-chart-${i + 1} size-2 rounded-sm`} aria-hidden />
                    {label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* table — borders, muted header, status badges */}
            <Card>
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm">Recent runs</CardTitle>
                <CardDescription className="text-xs">Scheduled exports.</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { name: "Weekly summary", status: "Done", variant: "subtle" as const },
                      { name: "Retention", status: "Running", variant: "default" as const },
                      { name: "Billing", status: "Failed", variant: "destructive" as const },
                    ].map((row) => (
                      <TableRow key={row.name}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>
                          <Badge variant={row.variant}>{row.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* form + progress — input borders, labels, secondary action */}
            <Card>
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm">Invite a teammate</CardTitle>
                <CardDescription className="text-xs">They get read access by default.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  <Label htmlFor="create-preview-email">Email</Label>
                  <Input id="create-preview-email" placeholder="you@example.com" readOnly />
                </div>
                <div className="flex gap-2">
                  <Button size="sm">Send invite</Button>
                  <Button size="sm" variant="Secondary">
                    Copy link
                  </Button>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-3.5" aria-hidden />
                      Seats used
                    </span>
                    <span>18 / 25</span>
                  </div>
                  <Progress value={72} aria-label="Seats used" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
