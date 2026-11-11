/**
 * Read the `<Command op="…" />` blocks out of an MDX page's source.
 *
 * The site's guards used to assert on fence text: "this page contains a line starting `npm i `", "this page
 * contains `kinetixui preset compose`". Once a command is rendered from `pm-commands.ts` rather than typed
 * into the page, that text is not in the source any more — the operation id is. A guard that kept reading for
 * the old string would not be protecting anything; it would be asserting that the migration had not happened.
 *
 * So the guards now read the page the way the page is written, and resolve each block through the same
 * `renderCommand` the browser uses. A page claiming an install therefore has to claim one the contract can
 * actually produce, which is a stronger check than the substring it replaces.
 *
 * Source-text parsing rather than MDX compilation on purpose: these are guards over what is *written*, and a
 * compiled page would also show commands composed at runtime, which is a different question.
 */
import {
  renderCommand,
  type OperationId,
  type PackageManager,
  type RenderParams,
  type RenderedCommand,
} from "./pm-commands";

export interface CommandBlockRef {
  readonly op: OperationId;
  readonly params: RenderParams;
  /** The attribute text as written, for a failure message that points at the real line. */
  readonly source: string;
}

const attr = (attrs: string, name: string) => new RegExp(`${name}="([^"]+)"`).exec(attrs)?.[1];

/** Every `<Command … />` in an MDX source, in document order. */
export function parseCommandBlocks(mdx: string): CommandBlockRef[] {
  return Array.from(mdx.matchAll(/<Command\s([^>]*?)\/>/g), (m) => {
    const attrs = m[1];
    const list = /components=\{\[([^\]]*)\]\}/.exec(attrs)?.[1];
    return {
      op: attr(attrs, "op") as OperationId,
      params: {
        components: list ? Array.from(list.matchAll(/"([^"]+)"/g), (c) => c[1]) : undefined,
        component: attr(attrs, "component"),
        theme: attr(attrs, "theme"),
        path: attr(attrs, "path"),
        symbol: attr(attrs, "symbol"),
        output: attr(attrs, "output"),
      },
      source: m[0],
    };
  });
}

/** Every command an MDX page shows, resolved for one package manager. */
export function commandsOnPage(mdx: string, pm: PackageManager = "npm"): RenderedCommand[] {
  return parseCommandBlocks(mdx).map((b) => renderCommand(b.op, pm, b.params));
}

/** The command strings an MDX page shows, for one package manager. */
export function commandStringsOnPage(mdx: string, pm: PackageManager = "npm"): string[] {
  return commandsOnPage(mdx, pm).map((c) => c.command);
}
