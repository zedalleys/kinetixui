/**
 * A workflow's platform readiness, as the /use-cases pages show it. Server-rendered, no client state.
 *
 * Two views of the same computed data (lib/workflow-readiness.ts), never a hand-typed status:
 *
 *   the summary table   per platform: how many of the workflow's parts exist there, the weakest evidence among its
 *                       components and, separately, among its blocks (a missing part is the weakest of all),
 *                       and whether the whole workflow can be built there (only when every stage ships in full and
 *                       every part exists, so today it never says yes).
 *   the parts table     per part and platform: the evidence level in words, behind a native disclosure.
 *
 * Levels are always words. There is no tick, dot or colour that carries meaning on its own.
 */
import Link from "next/link";
import { blockTitle, componentTitle, linkClass } from "@/components/discovery-parts";
import { PLATFORM_DEFINITIONS } from "@/lib/platform-parity";
import type { Workflow } from "@/lib/business-discovery";
import {
  blockEvidence,
  componentEvidence,
  blockEvidenceNote,
  EVIDENCE_LEVEL_LABEL,
  EVIDENCE_LEVEL_MEANING,
  EVIDENCE_LEVELS,
  implementedLine,
  workflowReadiness,
  type EvidenceLevel,
} from "@/lib/workflow-readiness";
import { cn } from "@/lib/utils";

function Level({ level }: { level: EvidenceLevel }) {
  return (
    <span
      data-evidence-level={level}
      className={cn("whitespace-nowrap", level === "runtime" || level === "build" ? "text-foreground" : "text-muted-foreground")}
    >
      {EVIDENCE_LEVEL_LABEL[level]}
    </span>
  );
}

/** The ladder in words, once per page, so each table can stay terse. */
export function EvidenceLevelLegend() {
  return (
    <dl className="mt-4 grid gap-x-6 gap-y-2 text-body-sm sm:grid-cols-2">
      {[...EVIDENCE_LEVELS].reverse().map((l) => (
        <div key={l} className="min-w-0">
          <dt className="font-medium">{EVIDENCE_LEVEL_LABEL[l]}</dt>
          <dd className="text-muted-foreground">{EVIDENCE_LEVEL_MEANING[l]}</dd>
        </div>
      ))}
    </dl>
  );
}

export function WorkflowReadiness({ workflow }: { workflow: Workflow }) {
  const rows = workflowReadiness(workflow);
  if (rows[0]!.total === 0) return null;
  const parts = rows[0]!.parts;
  const hasBlocks = parts.some((p) => p.kind === "block");
  const label = (kind: "component" | "block", slug: string) => (kind === "block" ? `${blockTitle(slug)} (block)` : componentTitle(slug));

  return (
    <div className="mt-5" data-workflow-readiness={workflow.id}>
      <h4 className="text-body-sm font-medium">Platform readiness</h4>
      <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground">
        Over the {rows[0]!.total} components and blocks the shipping stages use. Each evidence column is the weakest part of
        that kind on that platform, never an average, and a part missing there counts as not implemented. A block is
        runtime verified only when its interaction and accessibility were observed in a real browser or on a device;
        headless tests are listed with it and keep it below runtime verified. A component counts tests wherever they ran,
        so each one says whether its tests ran in a browser or headless. A platform missing any part cannot build the
        whole workflow.
      </p>
      {/* a phone cannot fit four columns at 200% text: the table scrolls in its own region, the page does not */}
      <div role="region" aria-label={`${workflow.title}: platform readiness`} tabIndex={0} className="mt-3 overflow-x-auto rounded-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <table className="w-full min-w-[40rem] text-start text-body-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 text-start font-medium">Platform</th>
              <th scope="col" className="px-3 py-2 text-start font-medium">Implementation</th>
              <th scope="col" className="px-3 py-2 text-start font-medium">Weakest component</th>
              {hasBlocks && <th scope="col" className="px-3 py-2 text-start font-medium">Weakest block</th>}
              <th scope="col" className="px-3 py-2 text-start font-medium">Whole workflow</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.platform} data-platform={r.platform}>
                <th scope="row" className="px-3 py-2 text-start font-medium">{PLATFORM_DEFINITIONS[r.platform].label}</th>
                <td className="px-3 py-2">{implementedLine(r)}</td>
                <td className="px-3 py-2">
                  {r.weakestComponent ? <Level level={r.weakestComponent} /> : <span className="text-muted-foreground">No components</span>}
                </td>
                {hasBlocks && (
                  <td className="px-3 py-2">
                    {r.weakestBlock && <Level level={r.weakestBlock} />}
                  </td>
                )}
                <td className="px-3 py-2" data-complete={r.complete}>
                  {r.complete ? "Can be built" : r.implemented < r.total ? "Not yet: parts missing" : "Not yet: stages not shipped"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* A native <details>: keyboard operable and announced as a disclosure without any client code. */}
      <details className="group mt-3 rounded-lg border border-border">
        <summary className="cursor-pointer px-3 py-2 text-body-sm font-medium hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Evidence for each part
        </summary>
        <div role="region" aria-label={`${workflow.title}: evidence for each part`} tabIndex={0} className="overflow-x-auto border-t border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <table className="w-full min-w-[44rem] text-body-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 text-start font-medium">Part</th>
                {rows.map((r) => (
                  <th key={r.platform} scope="col" className="px-3 py-2 text-start font-medium">
                    {PLATFORM_DEFINITIONS[r.platform].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {parts.map((p, i) => (
                <tr key={`${p.kind}:${p.slug}`} data-part={`${p.kind}:${p.slug}`}>
                  <th scope="row" className="px-3 py-2 text-start font-normal">
                    <Link href={p.kind === "block" ? `/blocks#${p.slug}` : `/docs/components/${p.slug}`} className={linkClass}>
                      {label(p.kind, p.slug)}
                    </Link>
                  </th>
                  {rows.map((r) => {
                    const note = blockEvidenceNote(p.kind === "block" ? blockEvidence(p.slug, r.platform) : componentEvidence(p.slug, r.platform));
                    return (
                      <td key={r.platform} className="px-3 py-2 align-top" data-platform={r.platform}>
                        <Level level={r.parts[i]!.level} />
                        {note && (
                          <span
                            className="mt-0.5 block text-label-md text-muted-foreground"
                            {...(p.kind === "block" ? { "data-block-evidence": "" } : { "data-component-evidence": "" })}
                          >
                            {note}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
