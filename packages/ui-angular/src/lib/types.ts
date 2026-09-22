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
