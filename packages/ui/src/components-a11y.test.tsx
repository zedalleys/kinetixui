import * as React from "react";
import axe from "axe-core";
import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

/**
 * Rendered accessibility pass: mount every story in jsdom and run axe-core over
 * the resulting DOM. This catches what the static contrast/token checks can't —
 * missing accessible names, invalid ARIA, bad roles, duplicate ids, label
 * association. jsdom has no layout or stylesheet, so `color-contrast` (covered
 * by `pnpm check:contrast`) and page-level rules are off.
 *
 * KNOWN lists violations that are tolerated, keyed `story:rule`. It is empty: every story
 * is clean. A new violation fails; if you must baseline one, a later fix fails until the
 * entry is deleted, so the list can only shrink.
 */
const stories = import.meta.glob("./stories/*.stories.tsx", { eager: true }) as Record<
  string,
  Record<string, unknown>
>;

const KNOWN = new Set<string>([]);

afterEach(cleanup);

async function violationsFor(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      "color-contrast": { enabled: false },
      region: { enabled: false },
      "landmark-one-main": { enabled: false },
      "page-has-heading-one": { enabled: false },
    },
  });
  return results.violations.map((v) => v.id);
}

describe("component a11y (axe)", () => {
  const entries = Object.entries(stories).sort(([a], [b]) => a.localeCompare(b));

  for (const [path, mod] of entries) {
    const name = path.split("/").pop()!.replace(".stories.tsx", "");
    const meta = mod.default as { component?: React.ComponentType<unknown>; args?: Record<string, unknown> };
    const storyKey = ["Default", "Playground", "Variants", "States"].find(
      (k) => mod[k] && typeof mod[k] === "object",
    );
    const story = storyKey
      ? (mod[storyKey] as { render?: (...a: unknown[]) => React.ReactNode; args?: Record<string, unknown> })
      : undefined;

    it(`${name} has no new axe violations`, async () => {
      const args = { ...meta?.args, ...story?.args };
      const node =
        typeof story?.render === "function"
          ? story.render(args, { args } as never)
          : meta?.component
            ? React.createElement(meta.component, args)
            : null;
      if (node === null) return;

      const { container } = render(node as React.ReactElement);
      const found = new Set((await violationsFor(container)).map((id) => `${name}:${id}`));
      const fresh = [...found].filter((k) => !KNOWN.has(k));
      const stale = [...KNOWN].filter((k) => k.startsWith(`${name}:`) && !found.has(k));
      expect(fresh, `new axe violations (story:rule)`).toEqual([]);
      expect(stale, `fixed — remove from KNOWN`).toEqual([]);
    });
  }
});
