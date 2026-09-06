"use client";

import * as React from "react";
import { Treemap } from "recharts";
import { ChartContainer, type ChartConfig } from "@kinetixui/ui";
import { componentDocs, COMPONENT_CATEGORY, CATEGORY_ORDER } from "@/lib/site";

const slugOf = (href: string) => href.split("/").pop() ?? "";

const data = CATEGORY_ORDER.map((cat, i) => ({
  name: cat,
  size: componentDocs.filter((c) => (COMPONENT_CATEGORY[slugOf(c.href)] ?? "Data Display") === cat)
    .length,
  fill: `hsl(var(--chart-${(i % 8) + 1}))`,
}));

type NodeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  name?: string;
  value?: number;
};

function Node({ x = 0, y = 0, width = 0, height = 0, index = 0, name, value }: NodeProps) {
  if (width < 2 || height < 2) return <g />;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={data[index]?.fill ?? "hsl(var(--chart-1))"}
        stroke="hsl(var(--background))"
        strokeWidth={2}
      />
      {width > 78 && height > 34 ? (
        <text x={x + 8} y={y + 20} className="fill-background font-mono" style={{ fontSize: 11 }}>
          {name} · {value}
        </text>
      ) : null}
    </g>
  );
}

export function RegistryTreemap() {
  return (
    <ChartContainer
      config={{} satisfies ChartConfig}
      className="mt-5 h-[280px] w-full"
      label={`The ${componentDocs.length} components by category — Form Inputs and Data Display are the largest groups.`}
    >
      <Treemap
        data={data}
        dataKey="size"
        nameKey="name"
        isAnimationActive={false}
        content={<Node />}
      />
    </ChartContainer>
  );
}
