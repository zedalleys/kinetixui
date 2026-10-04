import { Component, signal } from '@angular/core';
import {
  KxAlertDialog,
  KxAlertDialogAction,
  KxAlertDialogCancel,
  KxAlertDialogContent,
  KxButton,
  KxDialog,
  KxDialogClose,
  KxDialogContent,
  KxDialogDescription,
  KxDialogFooter,
  KxDialogHeader,
  KxDialogTitle,
  KxDialogTrigger,
  KxDrawer,
  KxDrawerContent,
  KxHoverCard,
  KxHoverCardContent,
  KxHoverCardTrigger,
  KxInput,
  KxLabel,
  KxModal,
  KxPopover,
  KxPopoverAnchor,
  KxPopoverClose,
  KxPopoverContent,
  KxPopoverTrigger,
  KxSheet,
  KxSheetContent,
  KxTooltip,
  KxTooltipContent,
  KxTooltipTrigger,
  type KxSheetSide,
} from '../public-api';

/**
 * The overlay family, wired to state the page can read back — the subject of `scripts/angular-overlays.mjs`
 * (keyboard, nesting, focus, scroll lock, RTL, 200% text, motion, axe) and of `scripts/overlay-visual.mjs`.
 *
 * The conventions are behaviour.ts's: each subject sits in its own `[data-kx-subject]` region, every value it
 * changes is bound into an `<output data-kx-out="…">`, and the elements a gate drives carry ids. The nested
 * cases are written the way an application nests them — the inner surface declared inside the outer one's
 * content — because that is the case an overlay layer gets wrong: dialog → popover → tooltip, dialog →
 * tooltip, dialog → dialog, sheet → popover.
 *
 * The page is taller than the viewport on purpose: a modal's scroll lock is measured against a page that
 * really scrolls.
 */
@Component({
  selector: 'kx-fixture',
  imports: [
    KxAlertDialog,
    KxAlertDialogAction,
    KxAlertDialogCancel,
    KxAlertDialogContent,
    KxButton,
    KxDialog,
    KxDialogClose,
    KxDialogContent,
    KxDialogDescription,
    KxDialogFooter,
    KxDialogHeader,
    KxDialogTitle,
    KxDialogTrigger,
    KxDrawer,
    KxDrawerContent,
    KxHoverCard,
    KxHoverCardContent,
    KxHoverCardTrigger,
    KxInput,
    KxLabel,
    KxModal,
    KxPopover,
    KxPopoverAnchor,
    KxPopoverClose,
    KxPopoverContent,
    KxPopoverTrigger,
    KxSheet,
    KxSheetContent,
    KxTooltip,
    KxTooltipContent,
    KxTooltipTrigger,
  ],
  template: `
    <div class="kx-overlays-fixture">
      <section data-kx-subject="dialog">
        <kx-dialog [(open)]="dialog" id="dlg">
          <button kxButton kxDialogTrigger variant="Outline" id="dlg-trigger">Edit profile</button>
          <dialog kxDialogContent id="dlg-content">
            <kx-dialog-header>
              <h2 kxDialogTitle>Edit profile</h2>
              <p kxDialogDescription>Changes are saved when you press Save.</p>
            </kx-dialog-header>
            <label kxLabel for="dlg-name">Display name</label>
            <input kxInput id="dlg-name" [value]="name()" (input)="name.set($any($event.target).value)" />
            <div class="kx-fixture-row">
              <kx-popover [(open)]="dialogPopover" id="dlg-pop">
                <button kxButton kxPopoverTrigger variant="Outline" size="sm" id="dlg-pop-trigger">Visibility</button>
                <kx-popover-content labelledby="dlg-pop-title" id="dlg-pop-content">
                  <p id="dlg-pop-title"><strong>Who can see your profile</strong></p>
                  <label kxLabel for="dlg-pop-input">Visible to</label>
                  <input kxInput id="dlg-pop-input" value="Workspace members" />
                  <kx-tooltip [openDelay]="200">
                    <button kxButton kxTooltipTrigger variant="Ghost" size="sm" id="dlg-pop-tip-trigger">What is a member?</button>
                    <kx-tooltip-content id="dlg-pop-tip">Anyone invited to this workspace</kx-tooltip-content>
                  </kx-tooltip>
                  <button kxButton kxPopoverClose variant="Outline" size="sm" id="dlg-pop-close">Done</button>
                </kx-popover-content>
              </kx-popover>
              <kx-tooltip [openDelay]="200">
                <button kxButton kxTooltipTrigger variant="Ghost" size="sm" id="dlg-tip-trigger" aria-label="Copy profile link">⧉</button>
                <kx-tooltip-content id="dlg-tip">Copies a link anyone in the workspace can open</kx-tooltip-content>
              </kx-tooltip>
              <kx-dialog [(open)]="innerDialog" id="dlg-inner">
                @if (!innerTriggerLost()) {
                  <button kxButton kxDialogTrigger variant="Outline" size="sm" id="dlg-inner-trigger">Advanced</button>
                }
                <dialog kxDialogContent id="dlg-inner-content">
                  <kx-dialog-header><h3 kxDialogTitle>Advanced settings</h3></kx-dialog-header>
                  <label kxLabel for="dlg-inner-input">Profile URL</label>
                  <input kxInput id="dlg-inner-input" value="kinetixui.com/ada" />
                  <kx-dialog-footer>
                    <button kxButton variant="Outline" type="button" id="dlg-inner-reset" (click)="loseInnerTrigger()">Reset</button>
                    <button kxButton kxDialogClose id="dlg-inner-done">Done</button>
                  </kx-dialog-footer>
                </dialog>
              </kx-dialog>
            </div>
            <kx-dialog-footer>
              <button kxButton kxDialogClose variant="Outline" id="dlg-cancel">Cancel</button>
              <button kxButton type="button" id="dlg-save" (click)="saves.set(saves() + 1); dialog.set(false)">Save</button>
            </kx-dialog-footer>
          </dialog>
        </kx-dialog>
        <button kxButton variant="Outline" id="dlg-programmatic" (click)="dialog.set(true)">Open elsewhere</button>
        <output data-kx-out="dialog">{{ dialog() }}</output>
        <output data-kx-out="dialog-popover">{{ dialogPopover() }}</output>
        <output data-kx-out="inner-dialog">{{ innerDialog() }}</output>
        <output data-kx-out="saves">{{ saves() }}</output>
      </section>

      <section data-kx-subject="alert-dialog">
        <kx-alert-dialog [(open)]="alert" id="ad">
          <button kxButton kxDialogTrigger variant="Destructive" id="ad-trigger">Delete project</button>
          <dialog kxAlertDialogContent id="ad-content">
            <kx-dialog-header>
              <h2 kxDialogTitle>Delete “Atlas”?</h2>
              <p kxDialogDescription>Its 214 files are removed for everyone. This cannot be undone.</p>
            </kx-dialog-header>
            <kx-dialog-footer>
              <button kxButton kxAlertDialogCancel variant="Outline" id="ad-cancel" (click)="answer.set('cancel')">Cancel</button>
              <button kxButton kxAlertDialogAction variant="Destructive" id="ad-action" (click)="answer.set('delete')">Delete project</button>
            </kx-dialog-footer>
          </dialog>
        </kx-alert-dialog>
        <output data-kx-out="alert">{{ alert() }}</output>
        <output data-kx-out="answer">{{ answer() }}</output>
      </section>

      <section data-kx-subject="modal">
        <kx-modal type="Destructive" title="Delete this view?" description="Saved filters in it are lost." [(open)]="modal" (action)="modalAction.set(modalAction() + 1)" (cancel)="modalCancel.set(modalCancel() + 1)" id="modal">
          <button kxButton kxDialogTrigger variant="Outline" id="modal-trigger">Delete view</button>
        </kx-modal>
        <kx-modal type="Info" title="Export started" description="We email you the file when it is ready." id="modal-info">
          <button kxButton kxDialogTrigger variant="Outline" id="modal-info-trigger">Export</button>
        </kx-modal>
        <output data-kx-out="modal">{{ modal() }}</output>
        <output data-kx-out="modal-action">{{ modalAction() }}</output>
        <output data-kx-out="modal-cancel">{{ modalCancel() }}</output>
      </section>

      <section data-kx-subject="sheet">
        @for (side of sides; track side) {
          <kx-sheet [id]="'sheet-' + side">
            <button kxButton kxDialogTrigger variant="Outline" [id]="'sheet-' + side + '-trigger'">Sheet {{ side }}</button>
            <dialog kxSheetContent [side]="side">
              <kx-dialog-header>
                <h2 kxDialogTitle>Filters</h2>
                <p kxDialogDescription>Narrow the list. Nothing changes until you apply.</p>
              </kx-dialog-header>
              <label kxLabel [for]="'sheet-' + side + '-input'">Owner</label>
              <input kxInput [id]="'sheet-' + side + '-input'" value="Anyone" />
              <kx-popover>
                <button kxButton kxPopoverTrigger variant="Outline" size="sm" [id]="'sheet-' + side + '-pop-trigger'">Date range</button>
                <kx-popover-content label="Date range">
                  <label kxLabel [for]="'sheet-' + side + '-pop-input'">From</label>
                  <input kxInput [id]="'sheet-' + side + '-pop-input'" value="2026-01-01" />
                </kx-popover-content>
              </kx-popover>
              <kx-dialog-footer><button kxButton kxDialogClose [id]="'sheet-' + side + '-apply'">Apply</button></kx-dialog-footer>
            </dialog>
          </kx-sheet>
        }
      </section>

      <section data-kx-subject="drawer">
        <kx-drawer [(open)]="drawer" id="drawer">
          <button kxButton kxDialogTrigger variant="Outline" id="drawer-trigger">Share</button>
          <dialog kxDrawerContent id="drawer-content">
            <kx-dialog-header>
              <h2 kxDialogTitle>Share “Q3 report”</h2>
              <p kxDialogDescription>People you add can view and comment.</p>
            </kx-dialog-header>
            <label kxLabel for="drawer-input">Email</label>
            <input kxInput id="drawer-input" type="email" />
            <kx-dialog-footer>
              <button kxButton kxDialogClose variant="Outline" id="drawer-cancel">Cancel</button>
              <button kxButton kxDialogClose id="drawer-send">Send invite</button>
            </kx-dialog-footer>
          </dialog>
        </kx-drawer>
        <output data-kx-out="drawer">{{ drawer() }}</output>
      </section>

      <section data-kx-subject="popover">
        <kx-popover [(open)]="popover" id="pop">
          <button kxButton kxPopoverTrigger variant="Outline" id="pop-trigger">Dimensions</button>
          <kx-popover-content labelledby="pop-title" align="start" id="pop-content">
            <p id="pop-title"><strong>Dimensions</strong></p>
            <label kxLabel for="pop-input">Width</label>
            <input kxInput id="pop-input" value="100%" />
            <button kxButton kxPopoverClose variant="Outline" size="sm" id="pop-close">Done</button>
          </kx-popover-content>
        </kx-popover>
        <a href="#after-popover" id="pop-after">After the popover</a>
        <output data-kx-out="popover">{{ popover() }}</output>

        <!-- the start-side popover at the inline start of the row and the end-side one at its inline end: each
             asks for the side that has no room, so each must flip -->
        <div class="kx-fixture-edges">
          <kx-popover id="pop-start">
            <button kxButton kxPopoverTrigger variant="Outline" size="sm" id="pop-start-trigger">Toward the start</button>
            <kx-popover-content side="start" label="Toward the start" id="pop-start-content">Asks for the inline start, where there is no room.</kx-popover-content>
          </kx-popover>
          <kx-popover id="pop-anchored">
            <span kxPopoverAnchor class="kx-fixture-anchor" id="pop-anchor">Anchor</span>
            <button kxButton kxPopoverTrigger variant="Outline" size="sm" id="pop-anchored-trigger">Anchored</button>
            <kx-popover-content align="end" label="Anchored" id="pop-anchored-content">Placed against the anchor, not the trigger.</kx-popover-content>
          </kx-popover>
          <kx-popover id="pop-end">
            <button kxButton kxPopoverTrigger variant="Outline" size="sm" id="pop-end-trigger">Toward the end</button>
            <kx-popover-content side="end" label="Toward the end" id="pop-end-content">Asks for the inline end, where there is no room.</kx-popover-content>
          </kx-popover>
        </div>

        <!-- an overflow clip AND a transform: a surface that escapes both is in the top layer, not in this box -->
        <div class="kx-fixture-clip" id="clip">
          <kx-popover id="pop-clipped">
            <button kxButton kxPopoverTrigger variant="Outline" size="sm" id="pop-clipped-trigger">Inside a clipped card</button>
            <kx-popover-content label="Escapes the clip" id="pop-clipped-content">This surface is wider and taller than the card that declares it.</kx-popover-content>
          </kx-popover>
        </div>

        <!-- a scroll container: the surface follows its trigger as it scrolls -->
        <div class="kx-fixture-scroller" id="scroller" tabindex="0" aria-label="Scrolling list">
          <div class="kx-fixture-scroller__pad"></div>
          <kx-popover id="pop-scroll">
            <button kxButton kxPopoverTrigger variant="Outline" size="sm" id="pop-scroll-trigger">In a scroller</button>
            <kx-popover-content label="Follows its trigger" id="pop-scroll-content">Follows its trigger.</kx-popover-content>
          </kx-popover>
          <div class="kx-fixture-scroller__pad"></div>
        </div>
      </section>

      <section data-kx-subject="tooltip">
        <kx-tooltip [(open)]="tooltip" id="tip">
          <button kxButton kxTooltipTrigger variant="Outline" size="icon" id="tip-trigger" aria-label="Copy link">⧉</button>
          <kx-tooltip-content id="tip-content">Copies a link anyone in the workspace can open</kx-tooltip-content>
        </kx-tooltip>
        <p id="tip-own-help">Saved to your library.</p>
        <kx-tooltip id="tip-described">
          <button kxButton kxTooltipTrigger variant="Outline" id="tip-described-trigger" aria-describedby="tip-own-help">Save</button>
          <kx-tooltip-content id="tip-described-content">Ctrl+S</kx-tooltip-content>
        </kx-tooltip>
        <button kxButton variant="Outline" id="tip-next">Next control</button>
        <output data-kx-out="tooltip">{{ tooltip() }}</output>
      </section>

      <section data-kx-subject="hover-card">
        <p>
          Written by
          <kx-hover-card [(open)]="hoverCard" id="hc">
            <a kxHoverCardTrigger href="#people-ada" id="hc-trigger">Ada Lovelace</a>
            <kx-hover-card-content id="hc-content">
              <p><strong>Ada Lovelace</strong></p>
              <p>Analyst. Wrote the first published algorithm.</p>
              <a href="#people-ada-posts" id="hc-link">12 posts</a>
            </kx-hover-card-content>
          </kx-hover-card>
          on 3 October.
        </p>
        <a href="#after-card" id="hc-after">After the card</a>
        <output data-kx-out="hover-card">{{ hoverCard() }}</output>
      </section>

      <section data-kx-subject="focus-return">
        <ul id="rows" tabindex="-1" aria-label="Saved views" #rowList>
          @for (row of rows(); track row) {
            <li>
              {{ row }}
              <kx-alert-dialog [returnFocus]="rowList">
                <button kxButton kxDialogTrigger variant="Ghost" size="sm" [id]="'row-' + row + '-delete'">Delete {{ row }}</button>
                <dialog kxAlertDialogContent>
                  <kx-dialog-header><h2 kxDialogTitle>Delete {{ row }}?</h2></kx-dialog-header>
                  <kx-dialog-footer>
                    <button kxButton kxAlertDialogCancel variant="Outline">Cancel</button>
                    <button kxButton kxAlertDialogAction variant="Destructive" [id]="'row-' + row + '-confirm'" (click)="remove(row)">Delete</button>
                  </kx-dialog-footer>
                </dialog>
              </kx-alert-dialog>
            </li>
          }
        </ul>
        <kx-dialog [(open)]="unrestorable" id="lost">
          @if (!triggerLost()) {
            <button kxButton kxDialogTrigger variant="Outline" id="lost-trigger">Lose the trigger</button>
          }
          <dialog kxDialogContent label="Trigger goes away">
            <p>Closing this removes the button that opened it, and there is no other target.</p>
            <button kxButton type="button" id="lost-close" (click)="loseTrigger()">Close</button>
          </dialog>
        </kx-dialog>
        <output data-kx-out="rows">{{ rows().join(',') }}</output>
      </section>

      <div class="kx-fixture-tall" aria-hidden="true"></div>
    </div>
  `,
  styles: `
    .kx-overlays-fixture { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--spacing-6); padding: 24px; font-family: var(--font-family-sans); color: hsl(var(--foreground)); }
    section { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-3); min-inline-size: 0; }
    .kx-fixture-row { display: flex; flex-wrap: wrap; gap: var(--spacing-2); align-items: center; }
    .kx-fixture-edges { display: flex; flex-wrap: wrap; justify-content: space-between; inline-size: 100%; gap: var(--spacing-2); }
    .kx-fixture-anchor { padding: var(--spacing-1) var(--spacing-2); border: 1px dashed hsl(var(--border)); }
    .kx-fixture-clip { overflow: hidden; transform: translateZ(0); inline-size: 12rem; max-inline-size: 100%; block-size: 4rem; padding: var(--spacing-2); border: 1px solid hsl(var(--border)); border-radius: var(--radius-surface); }
    .kx-fixture-scroller { overflow: auto; inline-size: 16rem; max-inline-size: 100%; block-size: 10rem; border: 1px solid hsl(var(--border)); }
    .kx-fixture-scroller__pad { block-size: 12rem; }
    .kx-fixture-tall { block-size: 150vh; }
    output { display: none; }
  `,
})
export class OverlaysFixture {
  readonly sides: KxSheetSide[] = ['start', 'end', 'top', 'bottom'];
  readonly dialog = signal(false);
  readonly dialogPopover = signal(false);
  readonly innerDialog = signal(false);
  readonly saves = signal(0);
  readonly name = signal('Ada');
  readonly alert = signal(false);
  readonly answer = signal('');
  readonly modal = signal(false);
  readonly modalAction = signal(0);
  readonly modalCancel = signal(0);
  readonly drawer = signal(false);
  readonly popover = signal(false);
  readonly tooltip = signal(false);
  readonly hoverCard = signal(false);
  readonly rows = signal(['Pipeline', 'Backlog', 'Archive']);
  readonly unrestorable = signal(false);
  readonly triggerLost = signal(false);
  readonly innerTriggerLost = signal(false);

  remove(row: string): void {
    this.rows.set(this.rows().filter((r) => r !== row));
  }
  loseTrigger(): void {
    // the trigger is removed in the same change that closes the dialog
    this.triggerLost.set(true);
    this.unrestorable.set(false);
  }
  loseInnerTrigger(): void {
    // a nested dialog whose trigger goes with it: focus belongs in the dialog underneath, not on the page
    this.innerTriggerLost.set(true);
    this.innerDialog.set(false);
  }
}
