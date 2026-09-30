import { readFileSync } from "node:fs";
import path from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LazyPreview } from "./lazy-preview";

const fallback = (
  <div className="flex h-96 flex-col gap-4">
    <div aria-hidden="true" data-preview-placeholder="" className="min-h-24 flex-1 rounded-xl border border-dashed border-border bg-muted/40" />
  </div>
);

describe("LazyPreview placeholder", () => {
  it("says the preview is loading inside the reserved height, without adding any", () => {
    const { container } = render(<LazyPreview slug="device-detail" fallback={fallback} />);
    const waiting = container.querySelector<HTMLElement>("[data-preview-loading]")!;
    expect(waiting.textContent).toContain("Loading preview");
    // the reserved block is still the only thing taking height; the mark is laid over it
    expect(waiting.className).toContain("relative");
    expect(waiting.querySelector("[data-preview-placeholder]")).not.toBeNull();
    expect(waiting.lastElementChild!.className).toContain("absolute");
    expect(waiting.lastElementChild!.className).toContain("inset-0");
  });

  it("stays out of the accessibility tree: a dozen of these must not announce as they scroll past", () => {
    const { container } = render(<LazyPreview slug="device-detail" fallback={fallback} />);
    const mark = container.querySelector<HTMLElement>("[data-preview-loading] > span")!;
    expect(mark.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("[data-preview-loading] [role='status'], [data-preview-loading] [aria-live]")).toBeNull();
  });

  it("never announces a percentage, and carries a worded signal beside the pulse", () => {
    const src = readFileSync(path.join(import.meta.dirname, "lazy-preview.tsx"), "utf8");
    expect(src).not.toMatch(/progressbar|aria-valuenow|%\s*<|\bpercent\b/i);
    expect(src).toContain("motion-safe:animate-pulse");
    expect(src).toContain("motion-reduce:animate-none");
    // tokens only: no arbitrary values, no hex colours, no physical-direction utilities
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(code).not.toMatch(/\b(bg|text|p|m|w|h|gap|size|max-w|max-h)-\[|#[0-9a-fA-F]{3,8}\b/);
    expect(code).not.toMatch(/\b(ml|mr|pl|pr|left|right)-\d|text-(left|right)/);
  });
});
