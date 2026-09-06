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
        native={{
          compose: `KinetixCard(Modifier.width(360.dp)) {
  KinetixCardHeader {
    KinetixCardTitle("Sign in")
    KinetixCardDescription("Enter your email to sign in to your account.")
  }
  KinetixCardContent {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
      KinetixLabel("Email")
      KinetixInput(email, { email = it }, placeholder = "you@example.com")
      KinetixLabel("Password")
      KinetixInput(pw, { pw = it }, visualTransformation = PasswordVisualTransformation())
      Row(verticalAlignment = Alignment.CenterVertically) {
        KinetixCheckbox(remember, { remember = it })
        Spacer(Modifier.width(8.dp)); Text("Remember me")
      }
    }
  }
  KinetixCardFooter {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
      KinetixButton(::signIn, Modifier.fillMaxWidth()) { Text("Sign in") }
      KinetixButton(::github, Modifier.fillMaxWidth(), variant = KinetixButtonVariant.Outline) {
        Text("Continue with GitHub")
      }
    }
  }
}`,
          flutter: `KinetixCard(
  child: Column(mainAxisSize: MainAxisSize.min, children: [
    const KinetixCardHeader(children: [
      KinetixCardTitle('Sign in'),
      KinetixCardDescription('Enter your email to sign in to your account.'),
    ]),
    KinetixCardContent(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const KinetixLabel('Email'),
        KinetixInput(controller: email, placeholder: 'you@example.com'),
        const SizedBox(height: 12),
        const KinetixLabel('Password'),
        KinetixInput(controller: password, obscureText: true),
        const SizedBox(height: 12),
        Row(children: [
          KinetixCheckbox(value: remember, onChanged: (v) => setState(() => remember = v)),
          const SizedBox(width: 8),
          const Text('Remember me'),
        ]),
      ]),
    ),
    KinetixCardFooter(children: [
      Expanded(
        child: Column(children: [
          SizedBox(width: double.infinity,
            child: KinetixButton(onPressed: signIn, child: const Text('Sign in'))),
          const SizedBox(height: 8),
          SizedBox(width: double.infinity,
            child: KinetixButton(onPressed: github,
              variant: KinetixButtonVariant.outline,
              child: const Text('Continue with GitHub'))),
        ]),
      ),
    ]),
  ]),
)`,
        }}
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
        native={{
          compose: `Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
  KinetixMetric(
    label = "Revenue", value = "$45,231",
    trend = KinetixMetricTrend.Up, change = "12.5%",
    icon = { Icon(Icons.Default.AttachMoney, null) },
    modifier = Modifier.weight(1f),
  )
  KinetixMetric(
    label = "Active users", value = "2,420",
    trend = KinetixMetricTrend.Up, change = "8.1%",
    icon = { Icon(Icons.Default.Group, null) },
    modifier = Modifier.weight(1f),
  )
  KinetixMetric(
    label = "Churn", value = "1.2%",
    trend = KinetixMetricTrend.Down, change = "0.3%",
    icon = { Icon(Icons.Default.TrendingDown, null) },
    modifier = Modifier.weight(1f),
  )
}`,
          flutter: `Row(
  children: [
    Expanded(
      child: KinetixMetric(
        label: 'Revenue', value: r'$45,231',
        trend: KinetixMetricTrend.up, change: '12.5%',
        icon: const Icon(Icons.attach_money, size: 16),
      ),
    ),
    const SizedBox(width: 16),
    Expanded(
      child: KinetixMetric(
        label: 'Active users', value: '2,420',
        trend: KinetixMetricTrend.up, change: '8.1%',
        icon: const Icon(Icons.group_outlined, size: 16),
      ),
    ),
    const SizedBox(width: 16),
    Expanded(
      child: KinetixMetric(
        label: 'Churn', value: '1.2%',
        trend: KinetixMetricTrend.down, change: '0.3%',
        icon: const Icon(Icons.trending_down, size: 16),
      ),
    ),
  ],
)`,
        }}
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
        native={{
          compose: `KinetixCard(Modifier.width(300.dp)) {
  KinetixCardHeader {
    KinetixBadge("Most popular", variant = KinetixBadgeVariant.Subtle)
    KinetixCardTitle("Pro")
    KinetixCardDescription("For growing teams.")
    Text("$29", fontSize = 30.sp, fontWeight = FontWeight.SemiBold)
  }
  KinetixCardContent {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
      listOf("Unlimited projects", "Priority support", "Custom domains", "Analytics").forEach {
        Row(verticalAlignment = Alignment.CenterVertically) {
          Icon(Icons.Default.Check, null, tint = KinetixColorScheme.current.primary)
          Spacer(Modifier.width(8.dp)); Text(it)
        }
      }
    }
  }
  KinetixCardFooter {
    KinetixButton(::upgrade, Modifier.fillMaxWidth()) { Text("Upgrade to Pro") }
  }
}`,
          flutter: `KinetixCard(
  child: Column(mainAxisSize: MainAxisSize.min, children: [
    const KinetixCardHeader(children: [
      KinetixBadge('Most popular', variant: KinetixBadgeVariant.subtle),
      KinetixCardTitle('Pro'),
      KinetixCardDescription('For growing teams.'),
      Text('\\\$29', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w600)),
    ]),
    KinetixCardContent(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final f in const ['Unlimited projects', 'Priority support',
              'Custom domains', 'Analytics'])
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(children: [
                Icon(Icons.check, size: 16, color: KinetixTheme.of(context).primary),
                const SizedBox(width: 8),
                Text(f),
              ]),
            ),
        ],
      ),
    ),
    KinetixCardFooter(children: [
      Expanded(
        child: KinetixButton(onPressed: upgrade, child: const Text('Upgrade to Pro')),
      ),
    ]),
  ]),
)`,
        }}
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
        native={{
          compose: `val colors = KinetixColorScheme.current
Row(
  Modifier
    .fillMaxWidth()
    .border(1.dp, colors.border, RoundedCornerShape(12.dp))
    .background(colors.muted.copy(alpha = 0.4f))
    .padding(32.dp),
  horizontalArrangement = Arrangement.SpaceBetween,
  verticalAlignment = Alignment.CenterVertically,
) {
  Column {
    Text("Ship with one token architecture",
      fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
    Text("React, SwiftUI, Compose and Flutter from a single source.",
      color = colors.mutedForeground, fontSize = 14.sp)
  }
  Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
    KinetixButton(::start) { Text("Get started"); Icon(Icons.Default.NorthEast, null) }
    KinetixButton(::docs, variant = KinetixButtonVariant.Outline) { Text("Read the docs") }
  }
}`,
          flutter: `final c = KinetixTheme.of(context);
Container(
  padding: const EdgeInsets.all(32),
  decoration: BoxDecoration(
    color: c.muted.withValues(alpha: 0.4),
    border: Border.all(color: c.border),
    borderRadius: BorderRadius.circular(12),
  ),
  child: Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Ship with one token architecture',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
          Text('React, SwiftUI, Compose and Flutter from a single source.',
            style: TextStyle(fontSize: 14, color: c.mutedForeground)),
        ],
      ),
      Row(children: [
        KinetixButton(onPressed: start, child: const Text('Get started')),
        const SizedBox(width: 8),
        KinetixButton(onPressed: docs,
          variant: KinetixButtonVariant.outline, child: const Text('Read the docs')),
      ]),
    ],
  ),
)`,
        }}
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
        native={{
          compose: `Column {
  Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
    KinetixInput(query, { query = it }, Modifier.weight(1f), placeholder = "Search invoices…")
    KinetixDropdownMenu(
      visible = open, onDismissRequest = { open = false },
      anchor = { KinetixSelectTrigger(status, { open = true }, Modifier.width(144.dp)) },
    ) {
      statuses.forEach { KinetixSelectItem(it, it == status, { status = it; open = false }) }
    }
    KinetixButton(::add) { Text("Add invoice") }
  }
  KinetixTable(Modifier.padding(top = 16.dp)) {
    KinetixTableHeader {
      KinetixTableRow {
        KinetixTableHead("Invoice"); KinetixTableHead("Status"); KinetixTableHead("Amount")
      }
    }
    KinetixTableBody {
      rows.forEach { r ->
        KinetixTableRow {
          KinetixTableCell(r.id)
          KinetixTableCell(r.status)
          KinetixTableCell(r.amount)
        }
      }
    }
  }
}`,
          flutter: `Column(
  crossAxisAlignment: CrossAxisAlignment.start,
  children: [
    Row(children: [
      Expanded(child: KinetixInput(controller: query, placeholder: 'Search invoices…')),
      const SizedBox(width: 8),
      SizedBox(
        width: 144,
        child: KinetixSelect<String>(
          value: status,
          options: const [
            KinetixSelectOption('all', 'All statuses'),
            KinetixSelectOption('paid', 'Paid'),
            KinetixSelectOption('pending', 'Pending'),
          ],
          onChanged: (v) => setState(() => status = v),
        ),
      ),
      const SizedBox(width: 8),
      KinetixButton(onPressed: add, child: const Text('Add invoice')),
    ]),
    const SizedBox(height: 16),
    KinetixTable(children: [
      const KinetixTableRow(isHeader: true, cells: [
        KinetixTableHead('Invoice'), KinetixTableHead('Status'), KinetixTableHead('Amount'),
      ]),
      for (final r in rows)
        KinetixTableRow(cells: [
          KinetixTableCell(child: Text(r.id)),
          KinetixTableCell(child: KinetixBadge(r.status,
            variant: r.paid ? KinetixBadgeVariant.subtle : KinetixBadgeVariant.outline)),
          KinetixTableCell(child: Text(r.amount)),
        ]),
    ]),
  ],
)`,
        }}
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
        native={{
          compose: `KinetixCard(Modifier.width(360.dp)) {
  KinetixCardHeader { KinetixCardTitle("Notifications") }
  KinetixSeparator()
  KinetixList {
    KinetixListItem("Email", description = "Product news and receipts",
      trailing = { KinetixSwitch(email, { email = it }) })
    KinetixListItem("Push", description = "Activity on your projects",
      trailing = { KinetixSwitch(push, { push = it }) })
    KinetixListItem("SMS", description = "Only critical alerts",
      trailing = { KinetixSwitch(sms, { sms = it }) })
  }
}`,
          flutter: `KinetixCard(
  child: Column(mainAxisSize: MainAxisSize.min, children: [
    const KinetixCardHeader(children: [KinetixCardTitle('Notifications')]),
    const KinetixSeparator(),
    KinetixList(children: [
      KinetixListItem(title: 'Email', description: 'Product news and receipts',
        trailing: KinetixSwitch(value: email, onChanged: (v) => setState(() => email = v))),
      KinetixListItem(title: 'Push', description: 'Activity on your projects',
        trailing: KinetixSwitch(value: push, onChanged: (v) => setState(() => push = v))),
      KinetixListItem(title: 'SMS', description: 'Only critical alerts',
        trailing: KinetixSwitch(value: sms, onChanged: (v) => setState(() => sms = v))),
    ]),
  ]),
)`,
        }}
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
        native={{
          compose: `KinetixCard(Modifier.width(360.dp)) {
  KinetixCardHeader { KinetixCardTitle("Team") }
  KinetixSeparator()
  KinetixList {
    team.forEach { m ->
      KinetixListItem(
        title = m.name, description = m.role,
        leading = { KinetixAvatar { KinetixAvatarFallback(m.initials) } },
        trailing = {
          KinetixButton({ remove(m) }, variant = KinetixButtonVariant.Ghost,
            size = KinetixButtonSize.Sm) { Text("Remove") }
        },
      )
    }
  }
}`,
          flutter: `KinetixCard(
  child: Column(mainAxisSize: MainAxisSize.min, children: [
    const KinetixCardHeader(children: [KinetixCardTitle('Team')]),
    const KinetixSeparator(),
    KinetixList(children: [
      for (final m in team)
        KinetixListItem(
          title: m.name,
          description: m.role,
          leading: KinetixAvatar(child: KinetixAvatarFallback(m.initials)),
          trailing: KinetixButton(
            onPressed: () => remove(m),
            variant: KinetixButtonVariant.ghost,
            size: KinetixButtonSize.sm,
            child: const Text('Remove'),
          ),
        ),
    ]),
  ]),
)`,
        }}
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
        native={{
          compose: `KinetixCard(Modifier.width(420.dp)) {
  KinetixCardContent {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
      KinetixAvatar { KinetixAvatarFallback("ZF") }
      Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        KinetixTextarea(body, { body = it }, placeholder = "Add a comment…")
        KinetixButton(::submit, Modifier.align(Alignment.End)) { Text("Comment") }
      }
    }
  }
}`,
          flutter: `KinetixCard(
  child: KinetixCardContent(
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const KinetixAvatar(child: KinetixAvatarFallback('ZF')),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              KinetixTextarea(controller: body, placeholder: 'Add a comment…'),
              const SizedBox(height: 8),
              KinetixButton(onPressed: submit, child: const Text('Comment')),
            ],
          ),
        ),
      ],
    ),
  ),
)`,
        }}
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
        native={{
          compose: `val colors = KinetixColorScheme.current
Column(
  Modifier
    .fillMaxWidth()
    // dashed rule: drawBehind { drawRoundRect(pathEffect = dashPathEffect(…)) }
    .border(1.dp, colors.border, RoundedCornerShape(12.dp))
    .padding(vertical = 64.dp),
  horizontalAlignment = Alignment.CenterHorizontally,
  verticalArrangement = Arrangement.spacedBy(8.dp),
) {
  Icon(Icons.Default.Inbox, null, Modifier.size(32.dp), tint = colors.mutedForeground)
  Text("No messages yet", fontWeight = FontWeight.Medium)
  Text("When someone messages you, it'll show up here.",
    color = colors.mutedForeground, fontSize = 14.sp)
  KinetixButton(::start, Modifier.padding(top = 16.dp)) { Text("Start a conversation") }
}`,
          flutter: `final c = KinetixTheme.of(context);
Container(
  padding: const EdgeInsets.symmetric(vertical: 64),
  decoration: BoxDecoration(
    // dashed rule: paint a CustomPainter border, or the dotted_border package
    border: Border.all(color: c.border),
    borderRadius: BorderRadius.circular(12),
  ),
  child: Column(
    children: [
      Icon(Icons.inbox_outlined, size: 32, color: c.mutedForeground),
      const SizedBox(height: 8),
      const Text('No messages yet', style: TextStyle(fontWeight: FontWeight.w500)),
      Text("When someone messages you, it'll show up here.",
        style: TextStyle(fontSize: 14, color: c.mutedForeground)),
      const SizedBox(height: 16),
      KinetixButton(onPressed: start, child: const Text('Start a conversation')),
    ],
  ),
)`,
        }}
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
        native={{
          compose: `Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
  KinetixAlert {
    KinetixAlertTitle("Heads up")
    KinetixAlertDescription("You can add components to your app using the CLI.")
  }
  KinetixAlert(variant = KinetixAlertVariant.Destructive) {
    KinetixAlertTitle("Payment failed")
    KinetixAlertDescription("Update your billing details to keep your subscription active.")
  }
  KinetixAlert(variant = KinetixAlertVariant.Success) {
    KinetixAlertTitle("Changes saved")
  }
}`,
          flutter: `Column(
  children: const [
    KinetixAlert(children: [
      KinetixAlertTitle('Heads up'),
      KinetixAlertDescription('You can add components to your app using the CLI.'),
    ]),
    SizedBox(height: 12),
    KinetixAlert(
      variant: KinetixAlertVariant.destructive,
      children: [
        KinetixAlertTitle('Payment failed'),
        KinetixAlertDescription('Update your billing details to keep your subscription active.'),
      ],
    ),
    SizedBox(height: 12),
    KinetixAlert(
      variant: KinetixAlertVariant.success,
      children: [KinetixAlertTitle('Changes saved')],
    ),
  ],
)`,
        }}
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
        native={{
          compose: `KinetixQuote(
  text = "Good design is as little design as possible.",
  author = "Dieter Rams",
  authorTitle = "Industrial Designer",
  avatar = { KinetixAvatar { KinetixAvatarFallback("DR") } },
  modifier = Modifier.width(420.dp),
)`,
          flutter: `const KinetixQuote(
  'Good design is as little design as possible.',
  author: 'Dieter Rams',
  authorTitle: 'Industrial Designer',
  avatar: KinetixAvatar(child: KinetixAvatarFallback('DR')),
)`,
        }}
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
