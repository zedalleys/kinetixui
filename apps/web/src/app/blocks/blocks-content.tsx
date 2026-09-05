"use client";

import { ArrowUpRight, Check, DollarSign, Github, Inbox, Search, TrendingDown, Users } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  List,
  ListItem,
  Metric,
  Quote,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@kinetixui/ui";
import { Showcase } from "@/components/showcase";

export function BlocksContent() {
  return (
    <div className="mt-10 grid gap-12">
      {/* ---- sign in ---- */}
      <Showcase
        title="Sign in"
        description="Card + inputs + a primary and a provider button."
        code={`<Card className="w-full max-w-sm">
  <CardHeader>
    <CardTitle>Sign in</CardTitle>
    <CardDescription>Enter your email to sign in to your account.</CardDescription>
  </CardHeader>
  <CardContent className="grid gap-4">
    <div className="grid gap-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="password">Password</Label>
        <a href="#" className="text-xs text-primary underline-offset-4 hover:underline">Forgot?</a>
      </div>
      <Input id="password" type="password" />
    </div>
    <label className="flex items-center gap-2 text-sm">
      <Checkbox defaultChecked /> Remember me
    </label>
  </CardContent>
  <CardFooter className="flex-col gap-2">
    <Button className="w-full">Sign in</Button>
    <Button variant="Outline" className="w-full"><Github className="size-4" /> Continue with GitHub</Button>
  </CardFooter>
</Card>`}
      >
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your email to sign in to your account.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="bl-email">Email</Label>
              <Input id="bl-email" type="email" placeholder="you@example.com" />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bl-password">Password</Label>
                <a href="#" className="text-xs text-primary underline-offset-4 hover:underline">
                  Forgot?
                </a>
              </div>
              <Input id="bl-password" type="password" defaultValue="hunter2" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox defaultChecked /> Remember me
            </label>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button className="w-full">Sign in</Button>
            <Button variant="Outline" className="w-full">
              <Github className="size-4" /> Continue with GitHub
            </Button>
          </CardFooter>
        </Card>
      </Showcase>

      {/* ---- stat cards ---- */}
      <Showcase
        title="Stat cards"
        description="A row of Metric cards for a dashboard header."
        contentClassName="items-stretch"
        code={`<div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
  <Metric label="Revenue" value="$45,231" trend="up" change="12.5%" icon={<DollarSign />} />
  <Metric label="Active users" value="2,420" trend="up" change="8.1%" icon={<Users />} />
  <Metric label="Churn" value="1.2%" trend="down" change="0.3%" icon={<TrendingDown />} />
</div>`}
      >
        <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Revenue" value="$45,231" trend="up" change="12.5%" icon={<DollarSign />} />
          <Metric label="Active users" value="2,420" trend="up" change="8.1%" icon={<Users />} />
          <Metric label="Churn" value="1.2%" trend="down" change="0.3%" icon={<TrendingDown />} />
        </div>
      </Showcase>

      {/* ---- pricing ---- */}
      <Showcase
        title="Pricing tier"
        description="Card with a feature list and a CTA."
        code={`<Card className="w-full max-w-xs">
  <CardHeader>
    <Badge variant="subtle" className="w-fit">Most popular</Badge>
    <CardTitle className="mt-2">Pro</CardTitle>
    <CardDescription>For growing teams.</CardDescription>
    <p className="mt-2 text-3xl font-semibold">$29<span className="text-base font-normal text-muted-foreground">/mo</span></p>
  </CardHeader>
  <CardContent className="grid gap-2 text-sm">
    {["Unlimited projects", "Priority support", "Custom domains", "Analytics"].map((f) => (
      <span key={f} className="flex items-center gap-2"><Check className="size-4 text-primary" /> {f}</span>
    ))}
  </CardContent>
  <CardFooter><Button className="w-full">Upgrade to Pro</Button></CardFooter>
</Card>`}
      >
        <Card className="w-full max-w-xs">
          <CardHeader>
            <Badge variant="subtle" className="w-fit">
              Most popular
            </Badge>
            <CardTitle className="mt-2">Pro</CardTitle>
            <CardDescription>For growing teams.</CardDescription>
            <p className="mt-2 text-3xl font-semibold">
              $29<span className="text-base font-normal text-muted-foreground">/mo</span>
            </p>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {["Unlimited projects", "Priority support", "Custom domains", "Analytics"].map((f) => (
              <span key={f} className="flex items-center gap-2">
                <Check className="size-4 text-primary" /> {f}
              </span>
            ))}
          </CardContent>
          <CardFooter>
            <Button className="w-full">Upgrade to Pro</Button>
          </CardFooter>
        </Card>
      </Showcase>

      {/* ---- CTA banner ---- */}
      <Showcase
        title="CTA banner"
        description="Heading, sub-copy, and a primary / secondary action."
        contentClassName="items-stretch"
        code={`<div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-muted/40 p-8 sm:flex-row sm:items-center sm:justify-between">
  <div>
    <h3 className="text-xl font-semibold tracking-tight">Ship with one token architecture</h3>
    <p className="mt-1 text-sm text-muted-foreground">React, SwiftUI, Compose and Flutter from a single source.</p>
  </div>
  <div className="flex shrink-0 gap-2">
    <Button>Get started <ArrowUpRight className="size-4" /></Button>
    <Button variant="Outline">Read the docs</Button>
  </div>
</div>`}
      >
        <div className="flex w-full flex-col items-start gap-4 rounded-lg border border-border bg-muted/40 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Ship with one token architecture</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              React, SwiftUI, Compose and Flutter from a single source.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button>
              Get started <ArrowUpRight className="size-4" />
            </Button>
            <Button variant="Outline">Read the docs</Button>
          </div>
        </div>
      </Showcase>

      {/* ---- table toolbar ---- */}
      <Showcase
        title="Table + toolbar"
        description="Search, a filter Select, an action, and a Table."
        contentClassName="items-stretch"
        code={`<div className="w-full">
  <div className="flex items-center gap-2">
    <div className="relative flex-1">
      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input placeholder="Search invoices…" className="pl-8" />
    </div>
    <Select defaultValue="all">
      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All statuses</SelectItem>
        <SelectItem value="paid">Paid</SelectItem>
        <SelectItem value="pending">Pending</SelectItem>
      </SelectContent>
    </Select>
    <Button>Add invoice</Button>
  </div>
  <Table className="mt-4">…</Table>
</div>`}
      >
        <div className="w-full max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search invoices…" className="pl-8" />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Button>Add invoice</Button>
          </div>
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ["INV-001", "Paid", "$250.00"],
                ["INV-002", "Pending", "$150.00"],
                ["INV-003", "Paid", "$350.00"],
              ].map((r) => (
                <TableRow key={r[0]}>
                  <TableCell className="font-medium">{r[0]}</TableCell>
                  <TableCell>
                    <Badge variant={r[1] === "Paid" ? "subtle" : "outline"}>{r[1]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{r[2]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Showcase>

      {/* ---- settings list ---- */}
      <Showcase
        title="Settings list"
        description="List rows with a Switch per item."
        code={`<Card className="w-full max-w-sm">
  <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
  <CardContent className="p-0">
    <List>
      <ListItem title="Email" description="Product news and receipts" trailing={<Switch defaultChecked />} />
      <ListItem title="Push" description="Activity on your projects" trailing={<Switch defaultChecked />} />
      <ListItem title="SMS" description="Only critical alerts" trailing={<Switch />} />
    </List>
  </CardContent>
</Card>`}
      >
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
                trailing={<Switch defaultChecked />}
              />
              <ListItem
                title="Push"
                description="Activity on your projects"
                trailing={<Switch defaultChecked />}
              />
              <ListItem title="SMS" description="Only critical alerts" trailing={<Switch />} />
            </List>
          </CardContent>
        </Card>
      </Showcase>

      {/* ---- team members ---- */}
      <Showcase
        title="Team members"
        description="Avatar, name/role, and a per-row action."
        code={`<Card className="w-full max-w-sm">
  <CardHeader><CardTitle>Team</CardTitle></CardHeader>
  <CardContent className="p-0">
    <List>
      {team.map((m) => (
        <ListItem
          key={m.name}
          leading={<Avatar><AvatarFallback>{m.initials}</AvatarFallback></Avatar>}
          title={m.name}
          description={m.role}
          trailing={<Button variant="Ghost" size="sm">Remove</Button>}
        />
      ))}
    </List>
  </CardContent>
</Card>`}
      >
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Team</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <List>
              {[
                { name: "Ada Lovelace", role: "Owner", initials: "AL" },
                { name: "Grace Hopper", role: "Admin", initials: "GH" },
                { name: "Alan Turing", role: "Member", initials: "AT" },
              ].map((m) => (
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
      </Showcase>

      {/* ---- comment box ---- */}
      <Showcase
        title="Comment box"
        description="Avatar, Textarea, and a submit action."
        code={`<Card className="w-full max-w-md">
  <CardContent className="flex items-start gap-3 pt-6">
    <Avatar><AvatarFallback>ZF</AvatarFallback></Avatar>
    <div className="grid w-full gap-2">
      <Textarea placeholder="Add a comment…" />
      <Button className="ml-auto w-fit">Comment</Button>
    </div>
  </CardContent>
</Card>`}
      >
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
      </Showcase>

      {/* ---- empty state ---- */}
      <Showcase
        title="Empty state"
        description="Centered icon, heading, description, and a CTA."
        contentClassName="items-stretch"
        code={`<div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
  <Inbox className="size-8 text-muted-foreground" />
  <h3 className="mt-2 font-medium">No messages yet</h3>
  <p className="text-sm text-muted-foreground">When someone messages you, it'll show up here.</p>
  <Button className="mt-4">Start a conversation</Button>
</div>`}
      >
        <div className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <Inbox className="size-8 text-muted-foreground" />
          <h3 className="mt-2 font-medium">No messages yet</h3>
          <p className="text-sm text-muted-foreground">
            When someone messages you, it&apos;ll show up here.
          </p>
          <Button className="mt-4">Start a conversation</Button>
        </div>
      </Showcase>

      {/* ---- alert stack ---- */}
      <Showcase
        title="Alert stack"
        description="Default, destructive, and success variants."
        contentClassName="items-stretch"
        code={`<div className="grid w-full max-w-md gap-3">
  <Alert>
    <AlertTitle>Heads up</AlertTitle>
    <AlertDescription>You can add components to your app using the CLI.</AlertDescription>
  </Alert>
  <Alert variant="destructive">
    <AlertTitle>Payment failed</AlertTitle>
    <AlertDescription>Update your billing details to keep your subscription active.</AlertDescription>
  </Alert>
  <Alert variant="success">
    <AlertTitle>Changes saved</AlertTitle>
  </Alert>
</div>`}
      >
        <div className="grid w-full max-w-md gap-3">
          <Alert>
            <AlertTitle>Heads up</AlertTitle>
            <AlertDescription>You can add components to your app using the CLI.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>Payment failed</AlertTitle>
            <AlertDescription>
              Update your billing details to keep your subscription active.
            </AlertDescription>
          </Alert>
          <Alert variant="success">
            <AlertTitle>Changes saved</AlertTitle>
          </Alert>
        </div>
      </Showcase>

      {/* ---- testimonial ---- */}
      <Showcase
        title="Testimonial"
        description="Quote with an attributed author."
        code={`<Quote
  author="Dieter Rams"
  authorTitle="Industrial Designer"
  avatar={<Avatar><AvatarFallback>DR</AvatarFallback></Avatar>}
  className="max-w-md"
>
  Good design is as little design as possible.
</Quote>`}
      >
        <Quote
          author="Dieter Rams"
          authorTitle="Industrial Designer"
          avatar={
            <Avatar>
              <AvatarFallback>DR</AvatarFallback>
            </Avatar>
          }
          className="max-w-md"
        >
          Good design is as little design as possible.
        </Quote>
      </Showcase>
    </div>
  );
}
