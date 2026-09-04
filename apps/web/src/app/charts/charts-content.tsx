"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
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

const box = "h-[280px] w-full";

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

<ChartContainer config={config} className="min-h-[260px] w-full">
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
        <ChartContainer config={pairConfig} className={box}>
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
    </div>
  );
}
