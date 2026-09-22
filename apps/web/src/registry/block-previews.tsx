/**
 * slug → the React fixture that renders that block's live preview.
 *
 * The same file is the snippet source (`pnpm gen:blocks` extracts its `kx-block` region), so the preview a
 * visitor sees and the code they copy are the same component — not two hand-maintained copies that can drift.
 * They did drift, before this: the old page showed `id="email"` while rendering `id="bl-email"`.
 *
 * This map is checked against blocks.manifest.json by `blocks.test.tsx`, so a block cannot ship without a
 * preview and a preview cannot linger after its block is gone.
 */
import type { ComponentType } from "react";
import { AlertStackBlock } from "@/examples/blocks/alert-stack";
import { CommentBoxBlock } from "@/examples/blocks/comment-box";
import { CtaBannerBlock } from "@/examples/blocks/cta-banner";
import { EmptyStateBlock } from "@/examples/blocks/empty-state";
import { PricingTierBlock } from "@/examples/blocks/pricing-tier";
import { SettingsListBlock } from "@/examples/blocks/settings-list";
import { SignInBlock } from "@/examples/blocks/sign-in";
import { StatCardsBlock } from "@/examples/blocks/stat-cards";
import { TableToolbarBlock } from "@/examples/blocks/table-toolbar";
import { TeamMembersBlock } from "@/examples/blocks/team-members";
import { TestimonialBlock } from "@/examples/blocks/testimonial";

export const blockPreviews: Record<string, ComponentType> = {
  "sign-in": SignInBlock,
  "stat-cards": StatCardsBlock,
  "pricing-tier": PricingTierBlock,
  "cta-banner": CtaBannerBlock,
  "table-toolbar": TableToolbarBlock,
  "settings-list": SettingsListBlock,
  "team-members": TeamMembersBlock,
  "comment-box": CommentBoxBlock,
  "empty-state": EmptyStateBlock,
  "alert-stack": AlertStackBlock,
  "testimonial": TestimonialBlock,
};
