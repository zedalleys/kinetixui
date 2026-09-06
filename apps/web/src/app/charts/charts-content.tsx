"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Funnel,
  FunnelChart,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ReferenceArea,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Treemap,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@kinetixui/ui";
import { Showcase } from "@/components/showcase";

const months = [
  { month: "Jan", desktop: 186, mobile: 80 },
  { month: "Feb", desktop: 305, mobile: 200 },
  { month: "Mar", desktop: 237, mobile: 120 },
  { month: "Apr", desktop: 173, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "Jun", desktop: 264, mobile: 240 },
];

const pairConfig = {
  desktop: { label: "Desktop", color: "hsl(var(--chart-1))" },
  mobile: { label: "Mobile", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const browsers = [
  { browser: "Chrome", visitors: 275, fill: "hsl(var(--chart-1))" },
  { browser: "Safari", visitors: 200, fill: "hsl(var(--chart-2))" },
  { browser: "Firefox", visitors: 187, fill: "hsl(var(--chart-3))" },
  { browser: "Edge", visitors: 173, fill: "hsl(var(--chart-4))" },
  { browser: "Other", visitors: 90, fill: "hsl(var(--chart-5))" },
];
const browserConfig = {
  visitors: { label: "Visitors" },
  Chrome: { label: "Chrome", color: "hsl(var(--chart-1))" },
  Safari: { label: "Safari", color: "hsl(var(--chart-2))" },
  Firefox: { label: "Firefox", color: "hsl(var(--chart-3))" },
  Edge: { label: "Edge", color: "hsl(var(--chart-4))" },
  Other: { label: "Other", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

const skills = [
  { axis: "Design", A: 120 },
  { axis: "Dev", A: 98 },
  { axis: "Docs", A: 86 },
  { axis: "QA", A: 99 },
  { axis: "Infra", A: 85 },
  { axis: "DX", A: 110 },
];

const traffic = [
  { day: "Mon", visits: 220, signups: 40 },
  { day: "Tue", visits: 280, signups: 55 },
  { day: "Wed", visits: 250, signups: 48 },
  { day: "Thu", visits: 320, signups: 70 },
  { day: "Fri", visits: 300, signups: 62 },
  { day: "Sat", visits: 180, signups: 30 },
  { day: "Sun", visits: 160, signups: 26 },
];

const scatter = [
  { size: 3, latency: 42 },
  { size: 7, latency: 55 },
  { size: 12, latency: 61 },
  { size: 18, latency: 78 },
  { size: 24, latency: 84 },
  { size: 31, latency: 110 },
  { size: 40, latency: 132 },
];

const spark = months.map((m) => ({ month: m.month, v: m.desktop }));

const box = "h-[280px] w-full";

/* ---- data for the extended recipes ----------------------------------- */
const funnel = [
  { stage: "Visited", value: 5200, fill: "hsl(var(--chart-1))" },
  { stage: "Signed up", value: 3100, fill: "hsl(var(--chart-2))" },
  { stage: "Activated", value: 1700, fill: "hsl(var(--chart-3))" },
  { stage: "Subscribed", value: 920, fill: "hsl(var(--chart-4))" },
  { stage: "Renewed", value: 610, fill: "hsl(var(--chart-5))" },
];

const treemap = [
  { name: "@kinetixui/ui", size: 4200 },
  { name: "tokens", size: 1800 },
  { name: "docs", size: 2600 },
  { name: "cli", size: 900 },
  { name: "charts", size: 700 },
  { name: "compose", size: 1100 },
];

// waterfall: running total with an invisible "base" bar + a visible delta bar
const waterfallRaw = [
  { name: "Open", delta: 1200 },
  { name: "Q1", delta: 420 },
  { name: "Q2", delta: -180 },
  { name: "Q3", delta: 310 },
  { name: "Q4", delta: -140 },
];
let _wfRun = 0;
const waterfall = waterfallRaw.map((d, i) => {
  const start = i === 0 ? 0 : _wfRun;
  _wfRun = start + d.delta;
  return {
    name: d.name,
    base: Math.min(start, _wfRun),
    delta: Math.abs(d.delta),
    up: d.delta >= 0,
    total: _wfRun,
  };
});

// histogram: bucket a set of response-time samples into 20ms bins
const samples = [
  12, 18, 22, 25, 28, 30, 31, 33, 35, 36, 38, 40, 41, 43, 44, 45, 47, 48, 50, 52, 55, 58, 60, 63, 66,
  70, 74, 78, 85, 92, 105, 120,
];
const histogram = Array.from({ length: 7 }, (_, i) => {
  const lo = i * 20;
  return { bin: `${lo}–${lo + 20}`, count: samples.filter((s) => s >= lo && s < lo + 20).length };
});

const kpis = [
  { label: "MRR", value: "$48.2k", delta: 12.4, spark: [31, 34, 33, 38, 40, 44, 48] },
  { label: "Active users", value: "9,310", delta: 4.1, spark: [82, 84, 83, 88, 90, 92, 93] },
  { label: "Churn", value: "1.8%", delta: -0.3, spark: [24, 23, 22, 22, 21, 20, 18] },
  { label: "p95 latency", value: "132 ms", delta: -6.0, spark: [180, 172, 168, 150, 141, 138, 132] },
];

// heatmap: activity by weekday (rows) × hour-block (cols)
const heatDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const heatCols = ["00", "04", "08", "12", "16", "20"];
const heat = heatDays.map((day, r) =>
  heatCols.map((_, c) => Math.round(20 + 80 * Math.abs(Math.sin((r + 1) * (c + 1) * 0.7)))),
);
const heatMax = Math.max(...heat.flat());

export function ChartsContent() {
  return (
    <div className="mt-10 grid gap-12">
      <Showcase
        title="Bar"
        description="Grouped bars, one series per --chart token."
        contentClassName="block p-4"
        code={`const config = {
  desktop: { label: "Desktop", color: "hsl(var(--chart-1))" },
  mobile: { label: "Mobile", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig

<ChartContainer
  config={config}
  className="min-h-[260px] w-full"
  label="Website visits by month — desktop vs mobile, Jan to Jun. Both trend up; desktop leads every month."
>
  <BarChart accessibilityLayer data={months}>
    <CartesianGrid vertical={false} />
    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
    <ChartTooltip content={<ChartTooltipContent />} />
    <ChartLegend content={<ChartLegendContent />} />
    <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} isAnimationActive={false} />
    <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} isAnimationActive={false} />
  </BarChart>
</ChartContainer>`}
      >
        <ChartContainer
          config={pairConfig}
          className={box}
          label="Website visits by month — desktop vs mobile, Jan to Jun. Both trend up; desktop leads every month."
        >
          <BarChart accessibilityLayer data={months}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} isAnimationActive={false} />
            <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </Showcase>

      <Showcase
        title="Line"
        description="Same data, connected points with dots."
        contentClassName="block p-4"
        code={`<ChartContainer config={config} className="min-h-[260px] w-full">
  <LineChart accessibilityLayer data={months} margin={{ left: 12, right: 12 }}>
    <CartesianGrid vertical={false} />
    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Line dataKey="desktop" stroke="var(--color-desktop)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
    <Line dataKey="mobile" stroke="var(--color-mobile)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
  </LineChart>
</ChartContainer>`}
      >
        <ChartContainer config={pairConfig} className={box}>
          <LineChart accessibilityLayer data={months} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line dataKey="desktop" stroke="var(--color-desktop)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
            <Line dataKey="mobile" stroke="var(--color-mobile)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
          </LineChart>
        </ChartContainer>
      </Showcase>

      <Showcase
        title="Area (stacked)"
        description="Stacked areas with a soft fill."
        contentClassName="block p-4"
        code={`<ChartContainer config={config} className="min-h-[260px] w-full">
  <AreaChart accessibilityLayer data={months} margin={{ left: 12, right: 12 }}>
    <CartesianGrid vertical={false} />
    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Area dataKey="mobile" type="natural" stackId="a"
      stroke="var(--color-mobile)" fill="var(--color-mobile)" fillOpacity={0.3}
              isAnimationActive={false} />
    <Area dataKey="desktop" type="natural" stackId="a"
      stroke="var(--color-desktop)" fill="var(--color-desktop)" fillOpacity={0.3}
              isAnimationActive={false} />
  </AreaChart>
</ChartContainer>`}
      >
        <ChartContainer config={pairConfig} className={box}>
          <AreaChart accessibilityLayer data={months} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              dataKey="mobile"
              type="natural"
              stackId="a"
              stroke="var(--color-mobile)"
              fill="var(--color-mobile)"
              fillOpacity={0.3}
              isAnimationActive={false}
            />
            <Area
              dataKey="desktop"
              type="natural"
              stackId="a"
              stroke="var(--color-desktop)"
              fill="var(--color-desktop)"
              fillOpacity={0.3}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </Showcase>

      <Showcase
        title="Donut"
        description="Category share, one colour per slice, with a legend."
        contentClassName="block p-4"
        code={`const data = [
  { browser: "Chrome", visitors: 275, fill: "hsl(var(--chart-1))" },
  { browser: "Safari", visitors: 200, fill: "hsl(var(--chart-2))" },
  // …
]

<ChartContainer config={config} className="mx-auto h-[260px] w-[260px]">
  <PieChart>
    <ChartTooltip content={<ChartTooltipContent nameKey="browser" />} />
    <Pie data={data} dataKey="visitors" nameKey="browser" innerRadius={55} strokeWidth={2} isAnimationActive={false}>
      {data.map((d) => <Cell key={d.browser} fill={d.fill} />)}
    </Pie>
    <ChartLegend content={<ChartLegendContent nameKey="browser" />} />
  </PieChart>
</ChartContainer>`}
      >
        <ChartContainer config={browserConfig} className="mx-auto h-[260px] w-[260px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="browser" />} />
            <Pie data={browsers} dataKey="visitors" nameKey="browser" innerRadius={55} strokeWidth={2} isAnimationActive={false}>
              {browsers.map((d) => (
                <Cell key={d.browser} fill={d.fill} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="browser" />} className="-translate-y-2" />
          </PieChart>
        </ChartContainer>
      </Showcase>

      <Showcase
        title="Horizontal bar"
        description={'Ranked categories — swap the axes with layout="vertical".'}
        contentClassName="block p-4"
        code={`<ChartContainer config={config} className="min-h-[260px] w-full">
  <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 8 }}>
    <CartesianGrid horizontal={false} />
    <YAxis dataKey="browser" type="category" tickLine={false} axisLine={false} width={64} />
    <XAxis type="number" hide />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Bar dataKey="visitors" radius={4} isAnimationActive={false}>
      {data.map((d) => <Cell key={d.browser} fill={d.fill} />)}
    </Bar>
  </BarChart>
</ChartContainer>`}
      >
        <ChartContainer config={browserConfig} className={box}>
          <BarChart accessibilityLayer data={browsers} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid horizontal={false} />
            <YAxis dataKey="browser" type="category" tickLine={false} axisLine={false} width={64} />
            <XAxis type="number" hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="visitors" radius={4} isAnimationActive={false}>
              {browsers.map((d) => (
                <Cell key={d.browser} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </Showcase>

      <Showcase
        title="Radar"
        description="A single series across several axes."
        contentClassName="block p-4"
        code={`const config = { A: { label: "Team", color: "hsl(var(--chart-1))" } } satisfies ChartConfig

<ChartContainer config={config} className="mx-auto h-[260px] w-[260px]">
  <RadarChart data={data}>
    <PolarGrid />
    <PolarAngleAxis dataKey="axis" />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Radar dataKey="A" stroke="var(--color-A)" fill="var(--color-A)" fillOpacity={0.3} isAnimationActive={false} />
  </RadarChart>
</ChartContainer>`}
      >
        <ChartContainer
          config={{ A: { label: "Team", color: "hsl(var(--chart-1))" } } satisfies ChartConfig}
          className="mx-auto h-[260px] w-[260px]"
        >
          <RadarChart data={skills}>
            <PolarGrid />
            <PolarAngleAxis dataKey="axis" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Radar dataKey="A" stroke="var(--color-A)" fill="var(--color-A)" fillOpacity={0.3} isAnimationActive={false} />
          </RadarChart>
        </ChartContainer>
      </Showcase>

      <Showcase
        title="Stacked bar"
        description="One bar per category, series stacked with a shared stackId."
        contentClassName="block p-4"
        code={`<ChartContainer config={config} className="min-h-[260px] w-full">
  <BarChart accessibilityLayer data={months}>
    <CartesianGrid vertical={false} />
    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
    <ChartTooltip content={<ChartTooltipContent />} />
    <ChartLegend content={<ChartLegendContent />} />
    <Bar dataKey="desktop" stackId="a" fill="var(--color-desktop)" radius={[0, 0, 4, 4]} isAnimationActive={false} />
    <Bar dataKey="mobile"  stackId="a" fill="var(--color-mobile)"  radius={[4, 4, 0, 0]} isAnimationActive={false} />
  </BarChart>
</ChartContainer>`}
      >
        <ChartContainer config={pairConfig} className={box}>
          <BarChart accessibilityLayer data={months}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="desktop" stackId="a" fill="var(--color-desktop)" radius={[0, 0, 4, 4]} isAnimationActive={false} />
            <Bar dataKey="mobile" stackId="a" fill="var(--color-mobile)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </Showcase>

      <Showcase
        title="Composed (bar + line)"
        description="Two encodings on one plot — bars for volume, a line for the rate."
        contentClassName="block p-4"
        code={`const config = {
  visits:  { label: "Visits",  color: "hsl(var(--chart-1))" },
  signups: { label: "Signups", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig

<ChartContainer config={config} className="min-h-[260px] w-full">
  <ComposedChart accessibilityLayer data={traffic}>
    <CartesianGrid vertical={false} />
    <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
    <ChartTooltip content={<ChartTooltipContent />} />
    <ChartLegend content={<ChartLegendContent />} />
    <Bar dataKey="visits" fill="var(--color-visits)" radius={4} isAnimationActive={false} />
    <Line dataKey="signups" stroke="var(--color-signups)" strokeWidth={2} dot={false} isAnimationActive={false} />
  </ComposedChart>
</ChartContainer>`}
      >
        <ChartContainer
          config={
            {
              visits: { label: "Visits", color: "hsl(var(--chart-1))" },
              signups: { label: "Signups", color: "hsl(var(--chart-3))" },
            } satisfies ChartConfig
          }
          className={box}
        >
          <ComposedChart accessibilityLayer data={traffic}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="visits" fill="var(--color-visits)" radius={4} isAnimationActive={false} />
            <Line dataKey="signups" stroke="var(--color-signups)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ChartContainer>
      </Showcase>

      <Showcase
        title="Step line"
        description={'A staircase for stepwise data — type="step".'}
        contentClassName="block p-4"
        code={`<ChartContainer config={config} className="min-h-[260px] w-full">
  <LineChart accessibilityLayer data={months} margin={{ left: 12, right: 12 }}>
    <CartesianGrid vertical={false} />
    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Line dataKey="desktop" type="step" stroke="var(--color-desktop)" strokeWidth={2} dot={false} isAnimationActive={false} />
  </LineChart>
</ChartContainer>`}
      >
        <ChartContainer config={pairConfig} className={box}>
          <LineChart accessibilityLayer data={months} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line dataKey="desktop" type="step" stroke="var(--color-desktop)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ChartContainer>
      </Showcase>

      <Showcase
        title="Sparkline"
        description="Axis-less, grid-less mini trend — drop it in a Card or a Metric."
        contentClassName="block p-4"
        code={`<ChartContainer config={{ v: { color: "hsl(var(--chart-1))" } }} className="h-16 w-full">
  <AreaChart data={data} margin={{ top: 4, bottom: 4, left: 0, right: 0 }}>
    <Area dataKey="v" type="monotone" stroke="var(--color-v)" fill="var(--color-v)" fillOpacity={0.15}
      strokeWidth={2} isAnimationActive={false} />
  </AreaChart>
</ChartContainer>`}
      >
        <ChartContainer
          config={{ v: { label: "Value", color: "hsl(var(--chart-1))" } } satisfies ChartConfig}
          className="h-16 w-full"
        >
          <AreaChart data={spark} margin={{ top: 4, bottom: 4, left: 0, right: 0 }}>
            <Area
              dataKey="v"
              type="monotone"
              stroke="var(--color-v)"
              fill="var(--color-v)"
              fillOpacity={0.15}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </Showcase>

      <Showcase
        title="Pie (with labels)"
        description="Full pie, value labels on each slice."
        contentClassName="block p-4"
        code={`<ChartContainer config={config} className="mx-auto h-[260px] w-[260px]">
  <PieChart>
    <ChartTooltip content={<ChartTooltipContent nameKey="browser" />} />
    <Pie data={data} dataKey="visitors" nameKey="browser" strokeWidth={2} isAnimationActive={false}>
      {data.map((d) => <Cell key={d.browser} fill={d.fill} />)}
      <LabelList dataKey="visitors" className="fill-background" fontSize={11} />
    </Pie>
  </PieChart>
</ChartContainer>`}
      >
        <ChartContainer config={browserConfig} className="mx-auto h-[260px] w-[260px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="browser" />} />
            <Pie data={browsers} dataKey="visitors" nameKey="browser" strokeWidth={2} isAnimationActive={false}>
              {browsers.map((d) => (
                <Cell key={d.browser} fill={d.fill} />
              ))}
              <LabelList dataKey="visitors" className="fill-background" fontSize={11} />
            </Pie>
          </PieChart>
        </ChartContainer>
      </Showcase>

      <Showcase
        title="Radial bar"
        description="Concentric arcs — a circular take on a ranked bar chart."
        contentClassName="block p-4"
        code={`<ChartContainer config={config} className="mx-auto h-[260px] w-[260px]">
  <RadialBarChart data={data} innerRadius={30} outerRadius={110} startAngle={90} endAngle={-270}>
    <PolarRadiusAxis tick={false} axisLine={false} />
    <ChartTooltip content={<ChartTooltipContent nameKey="browser" />} />
    <RadialBar dataKey="visitors" background cornerRadius={4} isAnimationActive={false}>
      {data.map((d) => <Cell key={d.browser} fill={d.fill} />)}
    </RadialBar>
  </RadialBarChart>
</ChartContainer>`}
      >
        <ChartContainer config={browserConfig} className="mx-auto h-[260px] w-[260px]">
          <RadialBarChart data={browsers} innerRadius={30} outerRadius={110} startAngle={90} endAngle={-270}>
            <PolarRadiusAxis tick={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent nameKey="browser" />} />
            <RadialBar dataKey="visitors" background cornerRadius={4} isAnimationActive={false}>
              {browsers.map((d) => (
                <Cell key={d.browser} fill={d.fill} />
              ))}
            </RadialBar>
          </RadialBarChart>
        </ChartContainer>
      </Showcase>

      <Showcase
        title="Scatter"
        description="Two continuous axes — one point per observation."
        contentClassName="block p-4"
        code={`const config = { latency: { label: "Latency (ms)", color: "hsl(var(--chart-1))" } } satisfies ChartConfig

<ChartContainer config={config} className="min-h-[260px] w-full">
  <ScatterChart accessibilityLayer margin={{ left: 8, right: 12 }}>
    <CartesianGrid />
    <XAxis type="number" dataKey="size" name="Payload (KB)" tickLine={false} axisLine={false} />
    <YAxis type="number" dataKey="latency" name="Latency (ms)" tickLine={false} axisLine={false} />
    <ZAxis range={[60, 60]} />
    <ChartTooltip content={<ChartTooltipContent />} cursor={{ strokeDasharray: "3 3" }} />
    <Scatter data={data} fill="var(--color-latency)" isAnimationActive={false} />
  </ScatterChart>
</ChartContainer>`}
      >
        <ChartContainer
          config={{ latency: { label: "Latency (ms)", color: "hsl(var(--chart-1))" } } satisfies ChartConfig}
          className={box}
        >
          <ScatterChart accessibilityLayer margin={{ left: 8, right: 12 }}>
            <CartesianGrid />
            <XAxis type="number" dataKey="size" name="Payload (KB)" tickLine={false} axisLine={false} />
            <YAxis type="number" dataKey="latency" name="Latency (ms)" tickLine={false} axisLine={false} />
            <ZAxis range={[60, 60]} />
            <ChartTooltip content={<ChartTooltipContent />} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={scatter} fill="var(--color-latency)" isAnimationActive={false} />
          </ScatterChart>
        </ChartContainer>
      </Showcase>

      {/* ---- extended recipes -------------------------------------------- */}

      <Showcase
        title="KPI tiles"
        description="Headline number + period delta + a bare sparkline. The dashboard workhorse."
        contentClassName="block p-4"
        code={`{kpis.map((k) => (
  <div key={k.label} className="rounded-lg border border-border p-3">
    <p className="text-xs text-muted-foreground">{k.label}</p>
    <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{k.value}</p>
    <p className={k.delta >= 0 ? "text-success" : "text-destructive"}>
      {k.delta >= 0 ? "▲" : "▼"} {Math.abs(k.delta)}%
    </p>
    <ChartContainer config={{ v: { color: "hsl(var(--chart-1))" } }} className="mt-2 h-8 w-full">
      <AreaChart data={k.spark.map((v, i) => ({ i, v }))}>
        <Area dataKey="v" type="monotone" stroke="var(--color-v)"
          fill="var(--color-v)" fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} />
      </AreaChart>
    </ChartContainer>
  </div>
))}`}
      >
        <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{k.value}</p>
              <p
                className={cn(
                  "mt-0.5 font-mono text-[11px] tabular-nums",
                  k.delta >= 0 ? "text-success" : "text-destructive",
                )}
              >
                {k.delta >= 0 ? "▲" : "▼"} {Math.abs(k.delta)}%
              </p>
              <ChartContainer
                config={{ v: { label: k.label, color: "hsl(var(--chart-1))" } } satisfies ChartConfig}
                className="mt-2 h-8 w-full"
                label={`${k.label} trend, last 7 periods`}
              >
                <AreaChart data={k.spark.map((v, i) => ({ i, v }))}>
                  <Area
                    dataKey="v"
                    type="monotone"
                    stroke="var(--color-v)"
                    fill="var(--color-v)"
                    fillOpacity={0.15}
                    strokeWidth={1.5}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          ))}
        </div>
      </Showcase>

      <Showcase
        title="Funnel"
        description="Stage-to-stage drop-off. Each band is one --chart token."
        contentClassName="block p-4"
        code={`<ChartContainer config={config} className="min-h-[260px] w-full">
  <FunnelChart>
    <ChartTooltip content={<ChartTooltipContent nameKey="stage" />} />
    <Funnel dataKey="value" data={data} isAnimationActive={false}>
      <LabelList dataKey="stage" position="right" className="fill-foreground" fontSize={12} />
    </Funnel>
  </FunnelChart>
</ChartContainer>`}
      >
        <ChartContainer
          config={{ value: { label: "Users" } } satisfies ChartConfig}
          className={box}
          label="Conversion funnel — 5,200 visited down to 610 renewed, the steepest drop between visited and signed up."
        >
          <FunnelChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="stage" />} />
            <Funnel dataKey="value" data={funnel} isAnimationActive={false}>
              <LabelList
                dataKey="stage"
                position="right"
                className="fill-foreground"
                fontSize={12}
                stroke="none"
              />
            </Funnel>
          </FunnelChart>
        </ChartContainer>
      </Showcase>

      <Showcase
        title="Gauge"
        description="One value against a 0–100 range — a radial bar with a centred read-out."
        contentClassName="block p-4"
        code={`<div className="relative mx-auto h-[220px] w-[220px]">
  <ChartContainer config={config} className="h-full w-full">
    <RadialBarChart data={[{ name: "score", value: 72, fill: "hsl(var(--chart-1))" }]}
      startAngle={220} endAngle={-40} innerRadius={80} outerRadius={110}>
      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
      <RadialBar dataKey="value" background cornerRadius={8} isAnimationActive={false} />
    </RadialBarChart>
  </ChartContainer>
  <span className="absolute inset-0 grid place-items-center font-mono text-3xl font-semibold">72</span>
</div>`}
      >
        <div className="relative mx-auto h-[220px] w-[220px]">
          <ChartContainer
            config={{ value: { label: "Score", color: "hsl(var(--chart-1))" } } satisfies ChartConfig}
            className="h-full w-full"
            label="Health score gauge — 72 out of 100"
          >
            <RadialBarChart
              data={[{ name: "score", value: 72, fill: "hsl(var(--chart-1))" }]}
              startAngle={220}
              endAngle={-40}
              innerRadius={80}
              outerRadius={110}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" background cornerRadius={8} isAnimationActive={false} />
            </RadialBarChart>
          </ChartContainer>
          <span className="pointer-events-none absolute inset-0 grid place-items-center font-mono text-3xl font-semibold tabular-nums">
            72
          </span>
        </div>
      </Showcase>

      <Showcase
        title="Treemap"
        description="Part-to-whole by area — good for bundle size, spend, storage."
        contentClassName="block p-4"
        code={`<ChartContainer config={{}} className="min-h-[260px] w-full">
  <Treemap data={data} dataKey="size" nameKey="name" stroke="hsl(var(--background))"
    fill="hsl(var(--chart-1))" isAnimationActive={false} />
</ChartContainer>`}
      >
        <ChartContainer
          config={{} satisfies ChartConfig}
          className={box}
          label="Workspace size by package — @kinetixui/ui is the largest at ~4,200, then docs, then tokens."
        >
          <Treemap
            data={treemap}
            dataKey="size"
            nameKey="name"
            stroke="hsl(var(--background))"
            fill="hsl(var(--chart-1))"
            isAnimationActive={false}
          />
        </ChartContainer>
      </Showcase>

      <Showcase
        title="Waterfall"
        description="Running total with up / down steps — a P&L bridge. Invisible base bar + a coloured delta."
        contentClassName="block p-4"
        code={`// precompute: base = min(runningStart, runningEnd), delta = |change|, up = change >= 0
<ChartContainer config={config} className="min-h-[260px] w-full">
  <BarChart accessibilityLayer data={waterfall}>
    <CartesianGrid vertical={false} />
    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
    <Bar dataKey="delta" stackId="w" radius={2} isAnimationActive={false}>
      {waterfall.map((d, i) => (
        <Cell key={i} fill={d.up ? "hsl(var(--chart-2))" : "hsl(var(--chart-4))"} />
      ))}
    </Bar>
  </BarChart>
</ChartContainer>`}
      >
        <ChartContainer
          config={{ delta: { label: "Change" } } satisfies ChartConfig}
          className={box}
          label="Balance bridge — opens at 1,200, net positive across the year, ending near 1,610."
        >
          <BarChart accessibilityLayer data={waterfall}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
            <Bar dataKey="delta" stackId="w" radius={2} isAnimationActive={false}>
              {waterfall.map((d, i) => (
                <Cell key={i} fill={d.up ? "hsl(var(--chart-2))" : "hsl(var(--chart-4))"} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </Showcase>

      <Showcase
        title="Bullet"
        description="Actual vs target vs qualitative bands — a compact KPI row. ReferenceArea bands + a target line."
        contentClassName="block p-4"
        code={`<ChartContainer config={config} className="h-20 w-full">
  <BarChart layout="vertical" data={[{ name: "Revenue", value: 82 }]}
    margin={{ left: 8, right: 12 }}>
    <XAxis type="number" domain={[0, 100]} hide />
    <YAxis type="category" dataKey="name" hide />
    <ReferenceArea x1={0} x2={55} fill="hsl(var(--muted-foreground))" fillOpacity={0.12} />
    <ReferenceArea x1={55} x2={80} fill="hsl(var(--muted-foreground))" fillOpacity={0.2} />
    <Bar dataKey="value" barSize={10} radius={2} fill="hsl(var(--chart-1))" isAnimationActive={false} />
    <ReferenceLine x={90} stroke="hsl(var(--foreground))" strokeWidth={2} />
  </BarChart>
</ChartContainer>`}
      >
        <ChartContainer
          config={{ value: { label: "Revenue" } } satisfies ChartConfig}
          className="h-20 w-full"
          label="Revenue vs target — at 82 against a target of 90, inside the top qualitative band."
        >
          <BarChart layout="vertical" data={[{ name: "Revenue", value: 82 }]} margin={{ left: 8, right: 12 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis type="category" dataKey="name" hide />
            <ReferenceArea x1={0} x2={55} fill="hsl(var(--muted-foreground))" fillOpacity={0.12} />
            <ReferenceArea x1={55} x2={80} fill="hsl(var(--muted-foreground))" fillOpacity={0.2} />
            <Bar dataKey="value" barSize={10} radius={2} fill="hsl(var(--chart-1))" isAnimationActive={false} />
            <ReferenceLine x={90} stroke="hsl(var(--foreground))" strokeWidth={2} />
          </BarChart>
        </ChartContainer>
      </Showcase>

      <Showcase
        title="Histogram"
        description="Distribution of one variable — bin the samples, then it's a bar chart."
        contentClassName="block p-4"
        code={`const histogram = Array.from({ length: 7 }, (_, i) => {
  const lo = i * 20
  return { bin: \`\${lo}–\${lo + 20}\`, count: samples.filter((s) => s >= lo && s < lo + 20).length }
})

<ChartContainer config={config} className="min-h-[260px] w-full">
  <BarChart accessibilityLayer data={histogram}>
    <CartesianGrid vertical={false} />
    <XAxis dataKey="bin" tickLine={false} axisLine={false} tickMargin={8} />
    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} isAnimationActive={false} />
  </BarChart>
</ChartContainer>`}
      >
        <ChartContainer
          config={{ count: { label: "Samples" } } satisfies ChartConfig}
          className={box}
          label="Response-time distribution — most samples fall in the 20–60 ms bins, with a thin tail past 100 ms."
        >
          <BarChart accessibilityLayer data={histogram}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="bin" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </Showcase>

      <Showcase
        title="Reference lines & bands"
        description="Annotate a series — a target line and an SLA band via ReferenceLine / ReferenceArea."
        contentClassName="block p-4"
        code={`<ChartContainer config={config} className="min-h-[260px] w-full">
  <LineChart accessibilityLayer data={months} margin={{ left: 12, right: 12 }}>
    <CartesianGrid vertical={false} />
    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
    <ReferenceArea y1={150} y2={250} fill="hsl(var(--chart-2))" fillOpacity={0.1} />
    <ReferenceLine y={200} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4"
      label={{ value: "target", position: "insideTopRight", fontSize: 11 }} />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Line dataKey="desktop" stroke="var(--color-desktop)" strokeWidth={2} dot={false} isAnimationActive={false} />
  </LineChart>
</ChartContainer>`}
      >
        <ChartContainer
          config={pairConfig}
          className={box}
          label="Desktop visits against a target of 200 and a 150–250 acceptable band; the series crosses above target from March."
        >
          <LineChart accessibilityLayer data={months} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
            <ReferenceArea y1={150} y2={250} fill="hsl(var(--chart-2))" fillOpacity={0.1} />
            <ReferenceLine
              y={200}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              label={{ value: "target", position: "insideTopRight", fontSize: 11 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              dataKey="desktop"
              stroke="var(--color-desktop)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
      </Showcase>

      <Showcase
        title="Heatmap"
        description="A value grid — no Recharts primitive, just a CSS grid tinted by --chart-1."
        contentClassName="block p-4"
        code={`<div className="grid gap-1" style={{ gridTemplateColumns: \`auto repeat(\${cols.length}, 1fr)\` }}>
  {days.map((day, r) => (
    <Fragment key={day}>
      <span className="pr-2 text-right font-mono text-[11px] text-muted-foreground">{day}</span>
      {cols.map((_, c) => (
        <div key={c} className="aspect-square rounded-[3px]"
          style={{ background: \`color-mix(in srgb, hsl(var(--chart-1)) \${(heat[r][c] / max) * 100}%, transparent)\` }} />
      ))}
    </Fragment>
  ))}
</div>`}
      >
        <div
          className="w-full max-w-md"
          role="img"
          aria-label="Activity heatmap by weekday and hour block — busiest mid-week around midday."
        >
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `auto repeat(${heatCols.length}, 1fr)` }}
          >
            {heatDays.map((day, r) => (
              <React.Fragment key={day}>
                <span className="self-center pr-2 text-right font-mono text-[11px] text-muted-foreground">
                  {day}
                </span>
                {heatCols.map((_, c) => (
                  <div
                    key={c}
                    className="aspect-square rounded-[3px] border border-border/40"
                    style={{
                      background: `color-mix(in srgb, hsl(var(--chart-1)) ${Math.round(
                        (heat[r][c] / heatMax) * 100,
                      )}%, transparent)`,
                    }}
                    title={`${day} ${heatCols[c]}:00 — ${heat[r][c]}`}
                  />
                ))}
              </React.Fragment>
            ))}
            <span />
            {heatCols.map((h) => (
              <span key={h} className="text-center font-mono text-[10px] text-muted-foreground">
                {h}
              </span>
            ))}
          </div>
        </div>
      </Showcase>
    </div>
  );
}
