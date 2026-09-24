import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { KxButton } from '../../lib/button';
import { KxCard, KxCardContent, KxCardDescription, KxCardFooter, KxCardHeader, KxCardTitle, KxLabel, KxProgress } from '../../lib/primitives';
import { KxCheckbox } from '../../lib/toggles';

/**
 * The "Onboarding checklist" block — see sign-in.ts for how block fixtures work.
 *
 * Counted, not measured: the bar announces "2 of 5 complete" through `valueText` rather than "40". The
 * percentage is a rendering of the number; the number is the thing a reader can act on.
 *
 * Each checkbox is named by a real `<label for>`, so the whole step is a click target and the accessible name
 * is the visible text. The completed treatment is a line through the label AND the checkbox's own checked
 * state — the strike-through alone would be invisible to a screen reader and to anyone who cannot see it.
 */
// kx-block:start
@Component({
  selector: 'app-onboarding-checklist-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxButton, KxCard, KxCardContent, KxCardDescription, KxCardFooter, KxCardHeader, KxCardTitle, KxCheckbox, KxLabel, KxProgress],
  template: `
    <kx-card>
      <kx-card-header>
        <kx-card-title>Get started</kx-card-title>
        <kx-card-description>{{ doneCount() }} of {{ steps.length }} done</kx-card-description>
      </kx-card-header>
      <kx-card-content class="body">
        <kx-progress [value]="percent()" [valueText]="doneCount() + ' of ' + steps.length + ' complete'" aria-label="Setup progress" />
        <ul>
          @for (step of steps; track step.id) {
            <li>
              <kx-checkbox [id]="'ob-' + step.id" [(checked)]="step.done" />
              <label kxLabel [for]="'ob-' + step.id" [class.done]="step.done()">{{ step.label }}</label>
            </li>
          }
        </ul>
      </kx-card-content>
      <kx-card-footer>
        <button kxButton variant="Ghost" size="sm">Skip setup</button>
      </kx-card-footer>
    </kx-card>
  `,
  styles: `
    :host { display: block; max-inline-size: 24rem; }
    .body { display: grid; gap: var(--spacing-4); }
    ul { display: grid; gap: var(--spacing-3); margin: 0; padding: 0; list-style: none; }
    li { display: flex; align-items: center; gap: var(--spacing-3); }
    label { font-weight: 400; }
    label.done { color: hsl(var(--muted-foreground)); text-decoration: line-through; }
  `,
})
export class OnboardingChecklistBlock {
  readonly steps = [
    { id: 'account', label: 'Create your account', done: signal(true) },
    { id: 'workspace', label: 'Name your workspace', done: signal(true) },
    { id: 'invite', label: 'Invite a teammate', done: signal(false) },
    { id: 'connect', label: 'Connect a repository', done: signal(false) },
    { id: 'deploy', label: 'Ship your first change', done: signal(false) },
  ];

  readonly doneCount = computed(() => this.steps.filter((step) => step.done()).length);
  readonly percent = computed(() => (this.doneCount() / this.steps.length) * 100);
}
// kx-block:end
