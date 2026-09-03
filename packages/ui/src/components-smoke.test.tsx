import * as React from "react";
import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

/**
 * Every Storybook story is a real composition of a shipped component. Render
 * each one in jsdom and assert it mounts without throwing — a cheap regression
 * net across the whole library.
 */
const stories = import.meta.glob("./stories/*.stories.tsx", { eager: true }) as Record<
  string,
  Record<string, unknown>
>;

// Stories that can't render meaningfully in jsdom (need real layout / canvas).
const SKIP = new Set<string>([]);

afterEach(cleanup);

describe("component smoke", () => {
  const entries = Object.entries(stories).sort(([a], [b]) => a.localeCompare(b));
  expect(entries.length).toBeGreaterThan(60);

  for (const [path, mod] of entries) {
    const name = path.split("/").pop()!.replace(".stories.tsx", "");
    const meta = mod.default as { component?: React.ComponentType<unknown>; args?: Record<string, unknown> };

    const storyKey = ["Default", "Playground", "Variants", "States"].find(
      (k) => mod[k] && typeof mod[k] === "object",
    );
    const story = storyKey ? (mod[storyKey] as { render?: (...a: unknown[]) => React.ReactNode; args?: Record<string, unknown> }) : undefined;

    (SKIP.has(name) ? it.skip : it)(`${name} mounts`, () => {
      const args = { ...meta?.args, ...story?.args };
      const node =
        typeof story?.render === "function"
          ? story.render(args, { args } as never)
          : meta?.component
            ? React.createElement(meta.component, args)
            : null;

      expect(node, `${name}: no renderable story export`).not.toBeNull();
      const { container } = render(node as React.ReactElement);
      expect(container).toBeInTheDocument();
    });
  }
});
