import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  KxButton,
  KxCommand,
  KxCommandDialog,
  KxCommandEmpty,
  KxCommandGroup,
  KxCommandInput,
  KxCommandItem,
  KxCommandList,
  KxCommandSeparator,
  KxCommandShortcut,
  KxDialog,
  KxDialogClose,
  KxDialogContent,
  KxDialogHeader,
  KxDialogTitle,
  KxDialogTrigger,
  KxLabel,
  KxMultiSelect,
  KxPopover,
  KxPopoverContent,
  KxPopoverTrigger,
  KxSelect,
  KxSelectContent,
  KxSelectGroup,
  KxSelectItem,
  KxSelectLabel,
  KxSelectSeparator,
  KxSelectTrigger,
  KxSelectValue,
  type KxMultiSelectOption,
} from '../public-api';

/**
 * The listboxes — select, command, the combobox recipe and multi-select — wired to state the page can read back:
 * the subject of the listbox passes in `scripts/angular-collections.mjs` (keyboard, pointer, active descendant,
 * filtering, RTL, 200% text, motion, axe).
 *
 * collections.ts's conventions: each subject in its own `[data-kx-subject]` region, every value it changes bound
 * into an `<output data-kx-out="…">`, the elements a gate drives carry ids, and `?region=rtl|ltr` wraps the page
 * in a region of that direction for the four direction cases.
 *
 * Two selects and two commands share the page on purpose: generated ids must not collide between instances.
 * Two compositions are written the way an application writes them: a settings form with a select and a
 * multi-select inside a dialog, and a command palette in the command dialog.
 */
@Component({
  selector: 'kx-fixture',
  imports: [
    ReactiveFormsModule,
    KxButton,
    KxCommand,
    KxCommandDialog,
    KxCommandEmpty,
    KxCommandGroup,
    KxCommandInput,
    KxCommandItem,
    KxCommandList,
    KxCommandSeparator,
    KxCommandShortcut,
    KxDialog,
    KxDialogClose,
    KxDialogContent,
    KxDialogHeader,
    KxDialogTitle,
    KxDialogTrigger,
    KxLabel,
    KxMultiSelect,
    KxPopover,
    KxPopoverContent,
    KxPopoverTrigger,
    KxSelect,
    KxSelectContent,
    KxSelectGroup,
    KxSelectItem,
    KxSelectLabel,
    KxSelectSeparator,
    KxSelectTrigger,
    KxSelectValue,
  ],
  template: `
    <div class="kx-listboxes-fixture" id="region" [attr.dir]="region">
      <section data-kx-subject="select">
        <button kxButton variant="Outline" id="sel-before">Before the select</button>
        <div class="kx-fixture-field">
          <label kxLabel for="sel-trigger">Fruit</label>
          <kx-select [formControl]="fruit" [(open)]="selOpen">
            <button kxSelectTrigger id="sel-trigger"><kx-select-value placeholder="Select a fruit" /></button>
            <kx-select-content id="sel-content">
              <kx-select-group id="sel-group">
                <kx-select-label id="sel-label">Fruit</kx-select-label>
                <kx-select-item value="apple" id="sel-apple">Apple</kx-select-item>
                <kx-select-item value="apricot" id="sel-apricot">Apricot</kx-select-item>
                <kx-select-item value="banana" id="sel-banana">Banana</kx-select-item>
                <kx-select-item value="blueberry" disabled id="sel-blueberry">Blueberry</kx-select-item>
                <kx-select-item value="cherry" id="sel-cherry">Cherry</kx-select-item>
              </kx-select-group>
              <kx-select-separator id="sel-separator" />
              <kx-select-group>
                <kx-select-label>Imported</kx-select-label>
                <kx-select-item value="dragonfruit" id="sel-dragonfruit">Dragon fruit (pitaya), imported weekly in limited quantities from growers abroad</kx-select-item>
                <kx-select-item value="elderberry" id="sel-elderberry">Elderberry</kx-select-item>
                <kx-select-item value="zucchini" disabled id="sel-zucchini">Zucchini</kx-select-item>
              </kx-select-group>
            </kx-select-content>
          </kx-select>
        </div>
        <a href="#after-select" id="sel-after">After the select</a>
        <div class="kx-fixture-field">
          <label kxLabel for="sel2-trigger">Size</label>
          <kx-select [(value)]="size">
            <button kxSelectTrigger id="sel2-trigger"><kx-select-value placeholder="Choose a size" /></button>
            <kx-select-content id="sel2-content">
              <kx-select-item value="s">Small</kx-select-item>
              <kx-select-item value="m">Medium</kx-select-item>
              <kx-select-item value="l">Large</kx-select-item>
            </kx-select-content>
          </kx-select>
        </div>
        <!-- a disabled select whose open state the page also drives: it must never be open while disabled -->
        <div class="kx-fixture-field">
          <label kxLabel for="lock-trigger">Locked</label>
          <kx-select [(value)]="lockValue" [(open)]="lockOpen" [disabled]="lockOff()">
            <button kxSelectTrigger id="lock-trigger"><kx-select-value placeholder="Locked" /></button>
            <kx-select-content id="lock-content">
              <kx-select-item value="one" id="lock-one">One</kx-select-item>
              <kx-select-item value="two" id="lock-two">Two</kx-select-item>
            </kx-select-content>
          </kx-select>
          <button kxButton variant="outline" type="button" id="lock-open" (click)="lockOpen.set(true)">Open the locked select</button>
          <button kxButton variant="outline" type="button" id="lock-toggle" (click)="lockOff.set(!lockOff())">Toggle disabled</button>
        </div>
        <output data-kx-out="lock-open">{{ lockOpen() }}</output>
        <output data-kx-out="lock">{{ lockValue() ?? '' }}</output>
        <output data-kx-out="fruit">{{ fruit.value ?? '' }}</output>
        <output data-kx-out="fruit-touched">{{ fruit.touched }}</output>
        <output data-kx-out="sel-open">{{ selOpen() }}</output>
        <output data-kx-out="size">{{ size() ?? '' }}</output>
      </section>

      <section data-kx-subject="command">
        <kx-command label="Commands" [(search)]="search" id="cmd">
          <input kxCommandInput id="cmd-input" placeholder="Type a command or search…" />
          <kx-command-list id="cmd-list">
            <kx-command-empty id="cmd-empty">No results found.</kx-command-empty>
            <kx-command-group heading="Suggestions" id="cmd-suggestions">
              <kx-command-item value="calendar" id="cmd-calendar" (select)="ran.set($event)">Calendar</kx-command-item>
              <kx-command-item value="emoji" [keywords]="['smiley']" id="cmd-emoji" (select)="ran.set($event)">Search emoji</kx-command-item>
              <kx-command-item value="launch" disabled id="cmd-launch" (select)="ran.set($event)">Launch</kx-command-item>
              <kx-command-item value="calculator" id="cmd-calculator" (select)="ran.set($event)">Calculator</kx-command-item>
            </kx-command-group>
            <kx-command-separator id="cmd-separator" />
            <kx-command-group heading="Settings" id="cmd-settings">
              <kx-command-item value="profile" id="cmd-profile" (select)="ran.set($event)">Profile <kx-command-shortcut>Ctrl+P</kx-command-shortcut></kx-command-item>
              <kx-command-item value="billing" id="cmd-billing" (select)="ran.set($event)">Billing <kx-command-shortcut>Ctrl+B</kx-command-shortcut></kx-command-item>
              @if (extra()) {
                <kx-command-item value="extra" id="cmd-extra" (select)="ran.set($event)">Extra settings</kx-command-item>
              }
            </kx-command-group>
          </kx-command-list>
        </kx-command>
        <button kxButton variant="Outline" id="cmd-toggle-extra" (click)="extra.set(!extra())">Toggle extra</button>
        <output data-kx-out="ran">{{ ran() }}</output>
        <output data-kx-out="search">{{ search() }}</output>
      </section>

      <section data-kx-subject="combobox">
        <kx-popover [(open)]="cbOpen">
          <button kxButton variant="Outline" kxPopoverTrigger id="cb-trigger" class="kx-fixture-combobox">{{ cbLabel() }}</button>
          <kx-popover-content side="bottom" align="start" label="Frameworks" id="cb-content">
            <kx-command label="Frameworks" id="cb-command">
              <input kxCommandInput id="cb-input" placeholder="Search framework…" />
              <kx-command-list id="cb-list">
                <kx-command-empty>No framework found.</kx-command-empty>
                <kx-command-group>
                  @for (f of frameworks; track f.value) {
                    <kx-command-item [value]="f.value" [id]="'cb-' + f.value" [disabled]="!!f.disabled" (select)="chooseFramework($event)">{{ f.label }}</kx-command-item>
                  }
                </kx-command-group>
              </kx-command-list>
            </kx-command>
          </kx-popover-content>
        </kx-popover>
        <output data-kx-out="cb">{{ framework() ?? '' }}</output>
        <output data-kx-out="cb-open">{{ cbOpen() }}</output>
      </section>

      <section data-kx-subject="multi">
        <div class="kx-fixture-field kx-fixture-wide">
          <label kxLabel for="ms-input">Labels</label>
          <kx-multi-select inputId="ms-input" id="ms" [options]="labels" [formControl]="chosen" placeholder="Add labels…" [(open)]="msOpen" />
        </div>
        <div class="kx-fixture-field kx-fixture-wide">
          <label kxLabel for="ms2-input">Tags</label>
          <kx-multi-select inputId="ms2-input" id="ms2" [options]="tags" [(value)]="tagValues" creatable placeholder="Add tags…" />
        </div>
        <div class="kx-fixture-field">
          <label kxLabel for="ms-lock-input">Locked tags</label>
          <kx-multi-select inputId="ms-lock-input" id="ms-lock" [options]="labels" [(value)]="lockTags" [(open)]="msLockOpen" [disabled]="true" />
          <button kxButton variant="outline" type="button" id="ms-lock-open" (click)="msLockOpen.set(true)">Open the locked tags</button>
        </div>
        <output data-kx-out="ms-lock-open">{{ msLockOpen() }}</output>
        <output data-kx-out="ms-lock">{{ lockTags().join(',') }}</output>
        <output data-kx-out="ms">{{ chosen.value.join(',') }}</output>
        <output data-kx-out="ms-touched">{{ chosen.touched }}</output>
        <output data-kx-out="ms-open">{{ msOpen() }}</output>
        <output data-kx-out="ms2">{{ tagValues().join(',') }}</output>
      </section>

      <section data-kx-subject="dialog">
        <kx-dialog [(open)]="dialog">
          <button kxButton variant="Outline" kxDialogTrigger id="dlg-trigger">Edit settings</button>
          <dialog kxDialogContent id="dlg-content">
            <kx-dialog-header><h2 kxDialogTitle>Settings</h2></kx-dialog-header>
            <div class="kx-fixture-field">
              <label kxLabel for="dlg-sel-trigger">Theme</label>
              <kx-select [(value)]="theme" [(open)]="dlgSelOpen">
                <button kxSelectTrigger id="dlg-sel-trigger"><kx-select-value placeholder="Choose a theme" /></button>
                <kx-select-content id="dlg-sel-content">
                  <kx-select-item value="light" id="dlg-sel-light">Light</kx-select-item>
                  <kx-select-item value="dark" id="dlg-sel-dark">Dark</kx-select-item>
                  <kx-select-item value="system" id="dlg-sel-system">System</kx-select-item>
                </kx-select-content>
              </kx-select>
            </div>
            <div class="kx-fixture-field">
              <label kxLabel for="dlg-ms-input">Notify me about</label>
              <kx-multi-select inputId="dlg-ms-input" id="dlg-ms" [options]="topics" [(value)]="topicValues" [(open)]="dlgMsOpen" />
            </div>
            <button kxButton kxDialogClose id="dlg-done">Done</button>
          </dialog>
        </kx-dialog>
        <output data-kx-out="dialog">{{ dialog() }}</output>
        <output data-kx-out="dlg-sel-open">{{ dlgSelOpen() }}</output>
        <output data-kx-out="dlg-ms-open">{{ dlgMsOpen() }}</output>
        <output data-kx-out="theme">{{ theme() ?? '' }}</output>
      </section>

      <section data-kx-subject="palette">
        <button kxButton variant="Outline" id="pal-open" (click)="palette.set(true)">Open command palette</button>
        <kx-command-dialog [(open)]="palette" label="Command palette" id="pal-dialog">
          <kx-command label="Commands" id="pal-command">
            <input kxCommandInput id="pal-input" placeholder="Search commands…" />
            <kx-command-list id="pal-list">
              <kx-command-empty>No commands found.</kx-command-empty>
              <kx-command-group heading="Navigation">
                <kx-command-item value="home" id="pal-home" (select)="runPalette($event)">Go home</kx-command-item>
                <kx-command-item value="inbox" id="pal-inbox" (select)="runPalette($event)">Open inbox</kx-command-item>
              </kx-command-group>
            </kx-command-list>
          </kx-command>
        </kx-command-dialog>
        <output data-kx-out="palette">{{ palette() }}</output>
        <output data-kx-out="palette-ran">{{ paletteRan() }}</output>
      </section>
    </div>
  `,
  styles: `
    .kx-listboxes-fixture { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--spacing-6); padding: 24px; font-family: var(--font-family-sans); color: hsl(var(--foreground)); }
    section { display: flex; flex-wrap: wrap; align-items: end; gap: var(--spacing-3); min-inline-size: 0; }
    .kx-fixture-field { display: grid; gap: var(--spacing-2); inline-size: min(16rem, 100%); }
    .kx-fixture-wide { inline-size: min(24rem, 100%); }
    .kx-fixture-combobox { inline-size: min(15rem, 100%); justify-content: space-between; }
    kx-command#cmd { max-inline-size: 26rem; }
    output { display: none; }
  `,
})
export class ListboxesFixture {
  readonly region = new URLSearchParams(globalThis.location?.search ?? '').get('region');
  readonly fruit = new FormControl<string | null>(null);
  readonly selOpen = signal(false);
  readonly size = signal<string | null>('m');
  readonly lockValue = signal<string | null>('two');
  readonly lockOpen = signal(false);
  readonly lockOff = signal(true);
  readonly lockTags = signal<string[]>([]);
  readonly msLockOpen = signal(false);
  readonly search = signal('');
  readonly ran = signal('');
  readonly extra = signal(true);
  readonly cbOpen = signal(false);
  readonly framework = signal<string | null>(null);
  readonly frameworks = [
    { value: 'next', label: 'Next.js' },
    { value: 'sveltekit', label: 'SvelteKit' },
    { value: 'nuxt', label: 'Nuxt', disabled: true },
    { value: 'remix', label: 'Remix' },
    { value: 'astro', label: 'Astro' },
  ];
  readonly labels: KxMultiSelectOption[] = [
    { value: 'bug', label: 'Bug' },
    { value: 'design', label: 'Design' },
    { value: 'docs', label: 'Documentation' },
    { value: 'blocked', label: 'Blocked', disabled: true },
    { value: 'research', label: 'Research' },
    { value: 'a11y', label: 'Accessibility' },
  ];
  readonly chosen = new FormControl<string[]>(['design', 'docs'], { nonNullable: true });
  readonly msOpen = signal(false);
  readonly tags: KxMultiSelectOption[] = [
    { value: 'urgent', label: 'Urgent' },
    { value: 'later', label: 'Later' },
  ];
  readonly tagValues = signal<string[]>([]);
  readonly dialog = signal(false);
  readonly theme = signal<string | null>('system');
  readonly dlgSelOpen = signal(false);
  readonly topics: KxMultiSelectOption[] = [
    { value: 'mentions', label: 'Mentions' },
    { value: 'replies', label: 'Replies' },
    { value: 'releases', label: 'Releases' },
  ];
  readonly topicValues = signal<string[]>(['mentions']);
  readonly dlgMsOpen = signal(false);
  readonly palette = signal(false);
  readonly paletteRan = signal('');

  cbLabel(): string {
    return this.frameworks.find((f) => f.value === this.framework())?.label ?? 'Select framework…';
  }
  chooseFramework(value: string): void {
    this.framework.set(value === this.framework() ? null : value);
    this.cbOpen.set(false);
  }
  runPalette(value: string): void {
    this.paletteRan.set(value);
    this.palette.set(false);
  }
}
