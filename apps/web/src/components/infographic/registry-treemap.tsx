"use client";

import * as React from "react";
import { Treemap } from "recharts";
import { ChartContainer, type ChartConfig } from "@kinetixui/ui";
import { categoryOf } from "@/lib/component-taxonomy";
import { componentDocs, CATEGORY_ORDER } from "@/lib/site";

const slugOf = (href: string) => href.split("/").pop() ?? "";

const data = CATEGORY_ORDER.map((cat, i) => ({
  name: cat,
  size: componentDocs.filter((c) => categoryOf(slugOf(c.href)) === cat).length,
  fill: `hsl(var(--chart-${(i % 8) + 1}))`,
}));

// The chart's accessible description names its two largest groups, and it named them from memory until CAT-2
// renamed `Form Inputs` to `Forms & Inputs`: the label went on telling assistive technology about a category
// the chart no longer draws, which is worse than a stale comment because it is the only description a reader
// who cannot see the treemap gets. Read off the same data the rectangles are drawn from, so the sentence
// cannot disagree with the picture.
const largest = [...data].sort((a, b) => b.size - a.size).map((d) => d.name);

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
        <text x={x + 8} y={y + 20} className="fill-background font-mono" style={{ fontSize: "0.75rem" }}>
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
      label={`The ${componentDocs.length} catalogue entries by category — ${largest[0]} and ${largest[1]} are the largest groups.`}
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
