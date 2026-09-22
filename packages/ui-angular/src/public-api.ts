/**
 * @kinetixui/angular — public API.
 *
 * This file is the package's contract, and `scripts/check-platform-source.mjs` reads it: a component may only
 * be declared as an Angular implementation in `components.manifest.json` if its symbol is exported here. That
 * is what stops the manifest, the website and the documentation from advertising an Angular component that
 * does not exist — the failure mode this package was created to end.
 *
 * Every export is a standalone directive or component: import the ones a template uses, nothing more. There is
 * no NgModule and no barrel module, so nothing is pulled in by association.
 */
export * from './lib/types';
export { KxButton } from './lib/button';
export {
  KxAlert,
  KxAlertDescription,
  KxAlertTitle,
  KxBadge,
  KxCard,
  KxCardContent,
  KxCardDescription,
  KxCardFooter,
  KxCardHeader,
  KxCardTitle,
  KxInput,
  KxLabel,
  KxProgress,
  KxSeparator,
} from './lib/primitives';
export { KxCheckbox, KxSwitch } from './lib/toggles';
export { KxTab, KxTabList, KxTabPanel, KxTabs } from './lib/tabs';
