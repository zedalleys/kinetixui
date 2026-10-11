import type { Type } from '@angular/core';
import { BehaviourFixture } from './behaviour';
import { CardStates } from './card';
import { CollectionsFixture } from './collections';
import { CompositeStates } from './composite';
import { CompositionsFixture } from './compositions';
import { EntryStates } from './entry';
import { ListboxesFixture } from './listboxes';
import { NavigationFixture } from './navigation';
import { OverlayCompositionsFixture } from './overlay-compositions';
import { OverlaysFixture } from './overlays';
import { SelectionStates } from './selection';
import { UsageExamples } from './usage';

/**
 * The fixtures the browser harness (`browser/`) can mount, by the name a page asks for (`?fixture=<name>`).
 *
 * A fixture is an ordinary Angular component that renders the package's components in the states a gate
 * measures. None of this is exported from `public-api.ts`: fixtures are test subjects, not API, and
 * `check:platform-source` reads the public API to decide what the manifest may claim.
 */
export const FIXTURES: Record<string, Type<unknown>> = {
  behaviour: BehaviourFixture,
  card: CardStates,
  collections: CollectionsFixture,
  composite: CompositeStates,
  compositions: CompositionsFixture,
  entry: EntryStates,
  listboxes: ListboxesFixture,
  navigation: NavigationFixture,
  overlays: OverlaysFixture,
  'overlay-compositions': OverlayCompositionsFixture,
  selection: SelectionStates,
  usage: UsageExamples,
};
