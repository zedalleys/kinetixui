import type { Type } from '@angular/core';
import { BehaviourFixture } from './behaviour';
import { CardStates } from './card';
import { CompositeStates } from './composite';
import { CompositionsFixture } from './compositions';
import { EntryStates } from './entry';
import { NavigationFixture } from './navigation';
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
  composite: CompositeStates,
  compositions: CompositionsFixture,
  entry: EntryStates,
  navigation: NavigationFixture,
  selection: SelectionStates,
  usage: UsageExamples,
};
