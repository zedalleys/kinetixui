/**
 * Block metadata and derived coverage, read from the repository's own sources.
 *
 * `blocks.manifest.json` owns the metadata and the per-platform source paths; `block-parity.json` is generated
 * from it by `pnpm gen:blocks` and carries the counts, so nothing here — and nothing on the page — prints a
 * number anyone typed. Platform identity comes from `platform-parity.ts`, which comes from
 * `components.manifest.json`: the Block layer never declares a platform of its own.
 */
import manifest from "../../../../blocks.manifest.json";
import parity from "../../../../block-parity.json";
import { PLATFORMS, type Platform } from "./platform-parity";

export type BlockMeta = {
  slug: string;
  title: string;
  description: string;
  category: string;
  status: "beta" | "stable" | "deprecated";
  /** Extra classes the preview frame needs (a full-width block stretches rather than centring). */
  contentClassName?: string;
  /** The platforms this block really has source for, in the central platform order. */
  platforms: Platform[];
};

const raw = manifest.blocks as Record<
  string,
  { title: string; description: string; category: string; status: string; contentClassName?: string; sources: Record<string, string> }
>;

/**
 * Manifest order is the page order — deliberate, not alphabetical: the list opens with Sign in because that is
 * the block most people come to look at.
 */
export const blocks: BlockMeta[] = Object.entries(raw).map(([slug, b]) => ({
  slug,
  title: b.title,
  description: b.description,
  category: b.category,
  status: b.status as BlockMeta["status"],
  contentClassName: b.contentClassName,
  // filtered through PLATFORMS so the tab order follows the central definition, and an unknown key can never
  // reach the UI (check:block-source rejects one long before this, but the type stays honest either way)
  platforms: PLATFORMS.filter((p) => Boolean(b.sources[p])),
}));

export const blockTotal: number = parity.total;

/** platform → how many blocks implement it. Generated; a platform with none is present and zero, not absent. */
export const blockCoverage = parity.coverage as Record<Platform, number>;

/** The platforms that carry at least one block — used to describe coverage without implying the rest failed. */
export const platformsWithBlocks: Platform[] = PLATFORMS.filter((p) => (blockCoverage[p] ?? 0) > 0);
