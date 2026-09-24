"use client";

import * as React from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
  Switch,
} from "@kinetixui/ui";

// kx-block:start
const SESSIONS = [
  { id: "mbp", device: "MacBook Pro", detail: "Chrome · Berlin · now", current: true },
  { id: "iphone", device: "iPhone 15", detail: "Safari · Berlin · 2 hours ago", current: false },
];

export function AccountSecurityBlock() {
  const [twoFactor, setTwoFactor] = React.useState(true);
  const twoFactorId = React.useId();

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>Keep your account safe.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-0.5">
            {/*
              The switch is named by this heading through aria-labelledby, so the accessible name is the
              visible name. A hard-coded aria-label would say it twice and drift the moment the copy changes.
            */}
            <span id={twoFactorId} className="text-sm font-medium">
              Two-factor authentication
            </span>
            <span className="text-xs text-muted-foreground">Required for every new sign-in.</span>
          </div>
          <Switch checked={twoFactor} onCheckedChange={setTwoFactor} aria-labelledby={twoFactorId} />
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-4">
          <div className="grid gap-0.5">
            <span className="text-sm font-medium">Recovery codes</span>
            <span className="text-xs text-muted-foreground">Single-use codes for when you lose your phone.</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="secondary">8 unused</Badge>
            <Button variant="Outline" size="sm">
              Regenerate
            </Button>
          </div>
        </div>

        <Separator />

        <section className="grid gap-3" aria-labelledby="sessions-heading">
          <h3 id="sessions-heading" className="text-sm font-medium">
            Active sessions
          </h3>
          <ul className="grid gap-3">
            {SESSIONS.map((session) => (
              <li key={session.id} className="flex items-center justify-between gap-4">
                <div className="grid gap-0.5">
                  <span className="text-sm">{session.device}</span>
                  <span className="text-xs text-muted-foreground">{session.detail}</span>
                </div>
                {session.current ? (
                  <Badge>This device</Badge>
                ) : (
                  /* The visible word stays "Revoke"; the announced name says which session. */
                  <Button variant="Ghost" size="sm" aria-label={`Revoke ${session.device}`}>
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </CardContent>
    </Card>
  );
}
// kx-block:end
