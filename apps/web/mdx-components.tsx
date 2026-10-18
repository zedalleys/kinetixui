import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { ComponentPreview } from "@/components/component-preview";
import { UsageExampleTabs } from "@/components/usage-example-tabs";
import { ComponentApi } from "@/components/component-api";
import { ComponentKeyboard } from "@/components/component-keyboard";
import { ComponentMeta } from "@/components/component-meta";
import { NpmLinks } from "@/components/npm-links";
import { Callout } from "@/components/callout";
import { DocsH2, DocsH3, DocsH4 } from "@/components/docs-heading";
import { ComponentGuide, ComponentIntro } from "@/components/component-guide";
import { FurtherReading, GuideCta, GuideFooter, GuideStatus } from "@/components/guide-parts";
import { FirstUseNextSteps } from "@/components/first-use-next-steps";
import { Steps, Step } from "@/components/steps";
import { CodePre } from "@/components/code-pre";
import { TokenTable } from "@/components/token-table";
import { TokenAcrossPlatforms } from "@/components/token-evidence";
import { ThemePreview } from "@/components/theme-preview";
import {
  ComponentGapsTable,
  ComponentTotalInline,
  PlatformVerificationTable,
  PlatformWaveTable,
  VerificationLadderTable,
  ElevationTable,
  MotionTable,
  MotionRolesTable,
  NonPortCountInline,
  NonPortNamesInline,
  NotSupportedTable,
  PlatformComponentList,
  PlatformAvailability,
  PlatformAtAGlance,
  PlatformCountInline,
  PlatformMaturityInline,
  PlatformSupportTable,
  PlatformUnitsTable,
  RadiusRolesTable,
  RadiusTable,
  SpacingTable,
  StatusSummary,
} from "@/components/foundations-tables";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (p) => (
      <h1
        className="mb-3 mt-2 scroll-mt-28 font-display text-4xl font-bold tracking-[-0.02em]"
        {...p}
      />
    ),
    h2: DocsH2,
    h3: DocsH3,
    h4: DocsH4,
    p: (p) => <p className="leading-relaxed [&:not(:first-child)]:mt-5" {...p} />,
    ul: (p) => <ul className="my-5 ml-6 list-disc [&>li]:mt-2" {...p} />,
    ol: (p) => <ol className="my-5 ml-6 list-decimal [&>li]:mt-2" {...p} />,
    a: ({ href = "", ...p }) => (
      <Link href={href} className="font-medium text-primary underline underline-offset-4" {...p} />
    ),
    hr: (p) => <hr className="my-8 border-border" {...p} />,
    table: (p) => (
      // scrolls sideways on a phone, so it must be keyboard-focusable and named (axe scrollable-region-focusable)
      <div
        role="group"
        aria-label="Scrollable table"
        tabIndex={0}
        className="my-6 w-full overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <table className="w-full border-collapse text-sm" {...p} />
      </div>
    ),
    th: (p) => <th className="border border-border px-4 py-2 text-left font-semibold" {...p} />,
    td: (p) => <td className="border border-border px-4 py-2" {...p} />,
    pre: CodePre,
    ComponentPreview,
    UsageExampleTabs,
    ComponentApi,
    ComponentKeyboard,
    ComponentMeta,
    ComponentIntro,
    ComponentGuide,
    GuideStatus,
    GuideCta,
    GuideFooter,
    FurtherReading,
    FirstUseNextSteps,
    NpmLinks,
    Callout,
    Steps,
    Step,
    TokenTable,
    TokenAcrossPlatforms,
    ThemePreview,
    ComponentGapsTable,
    ComponentTotalInline,
    PlatformVerificationTable,
    PlatformWaveTable,
    VerificationLadderTable,
    ElevationTable,
    MotionTable,
    MotionRolesTable,
    NonPortCountInline,
    NonPortNamesInline,
    NotSupportedTable,
    PlatformComponentList,
  PlatformAvailability,
  PlatformAtAGlance,
  PlatformCountInline,
  PlatformMaturityInline,
    PlatformSupportTable,
    PlatformUnitsTable,
    RadiusRolesTable,
    RadiusTable,
    SpacingTable,
    StatusSummary,
    ...components,
  };
}
