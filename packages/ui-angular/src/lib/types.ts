/**
 * The shared design contract, in Angular's type system.
 *
 * These unions are the same variant and size names the React, SwiftUI, Jetpack Compose and Flutter
 * implementations use. That is what "parity" means in KinetixUI: the contract and the tokens are shared, the
 * implementation is idiomatic per platform. Renaming one of these values is a cross-platform change, not an
 * Angular one.
 */

/** Button fills. Capitalised to match the design source's own Variant property, as every other platform does. */
export type KxButtonVariant = 'Primary' | 'Secondary' | 'Outline' | 'Destructive' | 'Ghost' | 'Link';
export type KxButtonSize = 'sm' | 'md' | 'lg' | 'icon';
/** Corner style — matches the design source's Corners property. */
export type KxCorners = 'sharp' | 'default' | 'pill';

export type KxBadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning';
export type KxAlertVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info';
export type KxOrientation = 'horizontal' | 'vertical';

/* ── display ────────────────────────────────────────────────────────────── */

export type KxSpinnerSize = 'sm' | 'md' | 'lg';
export type KxSpinnerVariant = 'default' | 'muted' | 'onColor';
export type KxTagVariant = 'default' | 'secondary' | 'destructive' | 'warning' | 'outline';
/** Direction of change on a metric. `neutral` is "measured, and flat" — not "unknown". */
export type KxTrend = 'up' | 'down' | 'neutral';
export type KxEmptyMediaVariant = 'default' | 'icon';

/* ── forms ──────────────────────────────────────────────────────────────── */

export type KxToggleVariant = 'default' | 'outline';
export type KxToggleSize = 'sm' | 'md' | 'lg';
/** Tone of the text under a field. `error` is the only one that also sets `aria-invalid` on the control. */
export type KxFieldMessageVariant = 'error' | 'success' | 'warning' | 'info';

/* ── content ────────────────────────────────────────────────────────────── */

/**
 * Intent for the two notice surfaces, Banner and Inform. The same five names the React implementation
 * uses, so a design decision made once reads the same on both platforms. `action` is not an intent in the
 * severity sense — it is the inverted, high-contrast promo treatment.
 */
export type KxInformVariant = 'information' | 'warning' | 'success' | 'error' | 'action';

/** Floating action button fills. Capitalised to match the design source's Variant property, as Button does. */
export type KxFabVariant = 'Primary' | 'Secondary';
export type KxFabSize = 'default' | 'sm';

/** `row` sets term and value side by side; `stacked` puts the value under a full-width term. */
export type KxDescriptionListLayout = 'row' | 'stacked';

/** Named aspect ratios Image accepts, alongside any explicit number. */
export type KxImageRatio = '1:1' | '3:2' | '4:3' | '3:4' | '3:1' | '16:9';

/** A marker tone on a Timeline item. */
export type KxTimelineStatus = 'default' | 'active' | 'success' | 'error';
