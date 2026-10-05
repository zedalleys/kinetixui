import { Component, signal } from '@angular/core';
import {
  KxAlertDialog,
  KxAlertDialogAction,
  KxAlertDialogCancel,
  KxAlertDialogContent,
  KxBadge,
  KxButton,
  KxCard,
  KxCardContent,
  KxCardDescription,
  KxCardHeader,
  KxCardTitle,
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
  KxField,
  KxFieldDescription,
  KxFieldLabel,
  KxHoverCard,
  KxHoverCardContent,
  KxHoverCardTrigger,
  KxInput,
  KxNavigationBar,
  KxPopover,
  KxPopoverContent,
  KxPopoverTrigger,
  KxRadio,
  KxRadioGroup,
  KxSheet,
  KxSheetContent,
  KxSwitch,
  KxTooltip,
  KxTooltipContent,
  KxTooltipTrigger,
} from '../public-api';

/**
 * The overlay family inside the screens a product builds with it — rendered for review (light, dark, RTL,
 * RTL dark, 200% text, a phone width, and both) and put under axe OPEN by `scripts/angular-overlays.mjs`.
 *
 *   confirm    a destructive confirmation: a project card whose Delete opens an alert dialog
 *   settings   a phone settings screen: a navigation bar whose Filters opens a sheet from the inline end and
 *              whose Share opens a drawer from the bottom
 *   invite     a rich dialog: inviting a teammate, with a role popover (radio choices and a tooltip on its
 *              help button) and a hover card on an existing member's name
 */
@Component({
  selector: 'kx-fixture',
  imports: [
    KxAlertDialog, KxAlertDialogAction, KxAlertDialogCancel, KxAlertDialogContent,
    KxBadge, KxButton, KxCard, KxCardContent, KxCardDescription, KxCardHeader, KxCardTitle,
    KxDialog, KxDialogClose, KxDialogContent, KxDialogDescription, KxDialogFooter, KxDialogHeader, KxDialogTitle, KxDialogTrigger,
    KxDrawer, KxDrawerContent, KxField, KxFieldDescription, KxFieldLabel, KxInput, KxNavigationBar,
    KxHoverCard, KxHoverCardContent, KxHoverCardTrigger, KxPopover, KxPopoverContent, KxPopoverTrigger,
    KxRadio, KxRadioGroup, KxSheet, KxSheetContent, KxSwitch, KxTooltip, KxTooltipContent, KxTooltipTrigger,
  ],
  styles: `
    :host { display: block; }
    .page { display: grid; grid-template-columns: minmax(0, 1fr); gap: 32px; padding: 24px; max-inline-size: 64rem; margin-inline: auto; font-family: var(--font-family-sans); color: hsl(var(--foreground)); }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr)); gap: 16px; }
    .card-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-block-start: 16px; }
    .meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; color: hsl(var(--muted-foreground)); }
    .phone { inline-size: 390px; max-inline-size: 100%; border: 1px solid hsl(var(--border)); border-radius: var(--radius-lg); overflow: hidden; }
    .phone-body { display: grid; gap: 12px; padding: 16px; }
    .row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
    .members { display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; }
    .role { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    p { margin: 0; }
  `,
  template: `
    <div class="page">
      <!-- ── destructive confirmation ─────────────────────────────────────── -->
      <section data-kx-composition="confirm" aria-label="Projects">
        <div class="cards">
          <kx-card>
            <kx-card-header>
              <kx-card-title>Atlas</kx-card-title>
              <kx-card-description>Customer research, 214 files</kx-card-description>
            </kx-card-header>
            <kx-card-content>
              <div class="meta"><kx-badge variant="secondary">Shared</kx-badge><span>Edited 2 hours ago</span></div>
              <div class="card-actions">
                <button kxButton variant="Outline" size="sm" type="button">Open</button>
                <kx-alert-dialog [(open)]="confirming">
                  <button kxButton kxDialogTrigger variant="Destructive" size="sm" id="cmp-delete">Delete</button>
                  <dialog kxAlertDialogContent>
                    <kx-dialog-header>
                      <h2 kxDialogTitle>Delete “Atlas” for everyone?</h2>
                      <p kxDialogDescription>Its 214 files and every comment on them are removed for the 12 people it is shared with. This cannot be undone.</p>
                    </kx-dialog-header>
                    <kx-dialog-footer>
                      <button kxButton kxAlertDialogCancel variant="Outline">Keep project</button>
                      <button kxButton kxAlertDialogAction variant="Destructive" (click)="deleted.set(true)">Delete project</button>
                    </kx-dialog-footer>
                  </dialog>
                </kx-alert-dialog>
              </div>
            </kx-card-content>
          </kx-card>
        </div>
      </section>

      <!-- ── mobile settings: app bar → sheet / drawer ─────────────────────── -->
      <section data-kx-composition="settings" aria-label="Notification settings">
        <div class="phone">
          <header kxNavigationBar title="Notifications" backButton [level]="2">
            <kx-sheet kxNavigationBarActions>
              <button kxButton kxDialogTrigger variant="Ghost" size="sm" id="cmp-filters">Filters</button>
              <dialog kxSheetContent side="end">
                <kx-dialog-header>
                  <h2 kxDialogTitle>Filter notifications</h2>
                  <p kxDialogDescription>Choose what reaches you. Changes apply when you press Apply.</p>
                </kx-dialog-header>
                <div class="row"><span id="cmp-mentions">Mentions</span><kx-switch [(checked)]="mentions" aria-labelledby="cmp-mentions" /></div>
                <div class="row"><span id="cmp-comments">Comments on my reports</span><kx-switch [(checked)]="comments" aria-labelledby="cmp-comments" /></div>
                <kx-dialog-footer>
                  <button kxButton kxDialogClose variant="Outline">Cancel</button>
                  <button kxButton kxDialogClose>Apply</button>
                </kx-dialog-footer>
              </dialog>
            </kx-sheet>
            <kx-drawer kxNavigationBarActions>
              <button kxButton kxDialogTrigger variant="Ghost" size="sm" id="cmp-share">Share</button>
              <dialog kxDrawerContent>
                <kx-dialog-header>
                  <h2 kxDialogTitle>Share these settings</h2>
                  <p kxDialogDescription>Teammates you choose start with the same notification rules.</p>
                </kx-dialog-header>
                <kx-field>
                  <label kxFieldLabel for="cmp-share-email">Email</label>
                  <input kxInput id="cmp-share-email" type="email" placeholder="name@company.com" />
                </kx-field>
                <kx-dialog-footer>
                  <button kxButton kxDialogClose variant="Outline">Cancel</button>
                  <button kxButton kxDialogClose>Send</button>
                </kx-dialog-footer>
              </dialog>
            </kx-drawer>
          </header>
          <div class="phone-body">
            <div class="row"><span>Daily summary</span><span>8:00</span></div>
            <div class="row"><span>Quiet hours</span><span>22:00 – 7:00</span></div>
          </div>
        </div>
      </section>

      <!-- ── rich overlay: dialog → popover → tooltip, and a hover card ───── -->
      <section data-kx-composition="invite" aria-label="Team">
        <kx-dialog [(open)]="inviting">
          <button kxButton kxDialogTrigger id="cmp-invite">Invite teammate</button>
          <dialog kxDialogContent>
            <kx-dialog-header>
              <h2 kxDialogTitle>Invite a teammate</h2>
              <p kxDialogDescription>They get an email with a link that works for seven days.</p>
            </kx-dialog-header>
            <kx-field>
              <label kxFieldLabel for="cmp-invite-email">Email</label>
              <input kxInput id="cmp-invite-email" type="email" placeholder="name@company.com" />
              <p kxFieldDescription>Use their work address.</p>
            </kx-field>
            <div class="role">
              <span>Role: {{ role() }}</span>
              <kx-popover>
                <button kxButton kxPopoverTrigger variant="Outline" size="sm" id="cmp-role-trigger">Change role</button>
                <kx-popover-content labelledby="cmp-role-title" align="start">
                  <p id="cmp-role-title"><strong>Role</strong></p>
                  <kx-radio-group [(value)]="role" aria-labelledby="cmp-role-title">
                    <kx-radio value="Member">Member</kx-radio>
                    <kx-radio value="Admin">Admin</kx-radio>
                  </kx-radio-group>
                  <kx-tooltip [openDelay]="300">
                    <button kxButton kxTooltipTrigger variant="Link" size="sm" id="cmp-role-help">What can admins do?</button>
                    <kx-tooltip-content>Admins add and remove members and manage billing</kx-tooltip-content>
                  </kx-tooltip>
                </kx-popover-content>
              </kx-popover>
            </div>
            <p>Already here:</p>
            <ul class="members">
              <li>
                <kx-hover-card>
                  <a kxHoverCardTrigger href="#people-grace" id="cmp-member">Grace Hopper</a>
                  <kx-hover-card-content>
                    <p><strong>Grace Hopper</strong> · Admin</p>
                    <p>Joined in March. Owns the billing reports.</p>
                    <a href="#people-grace-reports">8 reports</a>
                  </kx-hover-card-content>
                </kx-hover-card>
              </li>
            </ul>
            <kx-dialog-footer>
              <button kxButton kxDialogClose variant="Outline">Cancel</button>
              <button kxButton kxDialogClose>Send invite</button>
            </kx-dialog-footer>
          </dialog>
        </kx-dialog>
      </section>
    </div>
  `,
})
export class OverlayCompositionsFixture {
  readonly confirming = signal(false);
  readonly deleted = signal(false);
  readonly mentions = signal(true);
  readonly comments = signal(false);
  readonly inviting = signal(false);
  readonly role = signal('Member');
}
