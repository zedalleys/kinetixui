import { Component, inject, signal } from '@angular/core';
import {
  KxButton,
  KxDialog,
  KxDialogContent,
  KxDialogHeader,
  KxDialogTitle,
  KxDialogTrigger,
  KxNotificationCenter,
  KxNotificationCenterContent,
  KxNotificationCenterTrigger,
  KxNotificationItem,
  KxSidebar,
  KxSidebarContent,
  KxSidebarFooter,
  KxSidebarGroup,
  KxSidebarGroupContent,
  KxSidebarGroupLabel,
  KxSidebarHeader,
  KxSidebarInput,
  KxSidebarInset,
  KxSidebarMenu,
  KxSidebarMenuButton,
  KxSidebarMenuItem,
  KxSidebarProvider,
  KxSidebarTrigger,
  KxToaster,
  KxToasterService,
  KxTour,
  type KxTourStep,
} from '../public-api';

/**
 * Wave C3's overlays, wired to state the page can read back — the subject of `scripts/angular-overlays.mjs` for
 * the toaster, the notification center, the tour and the sidebar (keyboard, pointer, timing, focus, RTL, 200%
 * text, motion, axe) and of `scripts/overlay-visual.mjs` / `scripts/navigation-visual.mjs`.
 *
 * behaviour.ts's conventions: one `<section data-kx-subject>` per subject (a gate sets `dir` on it for the
 * region cases), every value a subject changes bound into an `<output data-kx-out="…">`, and ids on what a gate
 * drives. The toasters run on 1.5s so the clock is measured in real time without making a gate slow. The tour
 * has a step whose target is far down the page (scrolled to), one against the viewport's inline end, one whose
 * target a button removes, and one whose target never exists; a second tour runs inside a dialog, for Escape.
 */
@Component({
  selector: 'kx-fixture',
  imports: [
    KxButton,
    KxDialog,
    KxDialogContent,
    KxDialogHeader,
    KxDialogTitle,
    KxDialogTrigger,
    KxNotificationCenter,
    KxNotificationCenterContent,
    KxNotificationCenterTrigger,
    KxNotificationItem,
    KxSidebar,
    KxSidebarContent,
    KxSidebarFooter,
    KxSidebarGroup,
    KxSidebarGroupContent,
    KxSidebarGroupLabel,
    KxSidebarHeader,
    KxSidebarInput,
    KxSidebarInset,
    KxSidebarMenu,
    KxSidebarMenuButton,
    KxSidebarMenuItem,
    KxSidebarProvider,
    KxSidebarTrigger,
    KxToaster,
    KxTour,
  ],
  template: `
    <h1 class="kx-sr-only">Notifications, tour and sidebar</h1>

    <section data-kx-subject="toaster" id="toasts">
      <h2>Toasts</h2>
      <div class="row">
        <button kxButton variant="Outline" id="toast-show" (click)="show()">Show</button>
        <button kxButton variant="Outline" id="toast-success" (click)="success()">Success</button>
        <button kxButton variant="Outline" id="toast-error" (click)="error()">Error</button>
        <button kxButton variant="Outline" id="toast-keep" (click)="keep()">Keep open</button>
        <button kxButton variant="Outline" id="toast-many" (click)="many()">Five</button>
        <button kxButton variant="Outline" id="toast-update" (click)="upload()">Upload</button>
        <button kxButton variant="Outline" id="toast-forever" (click)="forever()">Forever</button>
        <button kxButton variant="Outline" id="toast-panel" (click)="panel()">Panel toast</button>
        <button kxButton variant="Outline" id="toast-dismiss-all" (click)="toast.dismiss()">Dismiss all</button>
      </div>
      <p>dismissed <output data-kx-out="dismissed">{{ dismissed() }}</output>, expired <output data-kx-out="expired">{{ expired() }}</output>, actions <output data-kx-out="actions">{{ actions() }}</output></p>
      <div id="toaster-main"><kx-toaster [duration]="1500" closeButton /></div>
      <div id="toaster-panel"><kx-toaster id="panel" position="top-start" [duration]="1500" label="Panel notifications" /></div>
    </section>

    <section data-kx-subject="notification-center" id="nc">
      <h2>Notification center</h2>
      <div class="row end">
        <kx-notification-center [(open)]="ncOpen">
          <button kxNotificationCenterTrigger id="nc-trigger" [unreadCount]="unread()"></button>
          <kx-notification-center-content id="nc-content" showMarkAllRead (markAllRead)="unread.set(0)">
            <kx-notification-item id="nc-item-1" title="PR #106 merged" description="feat(ui): add PageHeader" time="2m ago" [unread]="unread() > 0" pressable (select)="selected.set('pr')" />
            <kx-notification-item id="nc-item-2" title="Deploy succeeded" description="v0.11.0 is live" time="1h ago" [unread]="unread() > 1" pressable (select)="selected.set('deploy')" />
            <kx-notification-item id="nc-item-3" title="Welcome to KinetixUI" time="2d ago" />
          </kx-notification-center-content>
        </kx-notification-center>
      </div>
      <p>open <output data-kx-out="nc-open">{{ ncOpen }}</output>, unread <output data-kx-out="nc-unread">{{ unread() }}</output>, selected <output data-kx-out="nc-selected">{{ selected() }}</output></p>
    </section>

    <section data-kx-subject="tour" id="tour-region">
      <h2>Tour</h2>
      <div class="row">
        <button kxButton id="tour-start" (click)="startTour()">Start tour</button>
        <button kxButton variant="Outline" id="tour-a">Save</button>
        <button kxButton variant="Outline" id="tour-remove-c" (click)="showC.set(!showC())">Toggle archive</button>
        @if (showC()) {
          <button kxButton variant="Outline" id="tour-c">Archive</button>
        }
        <button kxButton variant="Outline" id="tour-b" class="push-end">Share</button>
      </div>
      <p>open <output data-kx-out="tour-open">{{ tourOpen }}</output>, step <output data-kx-out="tour-step">{{ tourStep }}</output></p>
      <kx-tour id="tour" [steps]="steps" [(open)]="tourOpen" [(stepIndex)]="tourStep" />

      <kx-dialog id="tour-dialog">
        <button kxButton variant="Outline" kxDialogTrigger id="tour-dialog-trigger">Open settings</button>
        <dialog kxDialogContent id="tour-dialog-content">
          <kx-dialog-header><h2 kxDialogTitle>Settings</h2></kx-dialog-header>
          <button kxButton variant="Outline" id="tour-in-dialog-target">Theme</button>
          <button kxButton id="tour-in-dialog-start" (click)="innerOpen = true">Explain</button>
          <kx-tour id="tour-inner" [steps]="innerSteps" [(open)]="innerOpen" />
        </dialog>
      </kx-dialog>
      <p>inner tour open <output data-kx-out="tour-inner-open">{{ innerOpen }}</output></p>
      <div class="far"><button kxButton variant="Outline" id="tour-low">Help</button></div>
    </section>

    <section data-kx-subject="sidebar" id="sidebar-region">
      <h2>Sidebar</h2>
      <div class="frame" id="sb-frame">
        <kx-sidebar-provider [(open)]="sidebarOpen">
          <kx-sidebar id="sb">
            <kx-sidebar-header><strong>Acme</strong><input kxSidebarInput id="sb-search" aria-label="Search the workspace" /></kx-sidebar-header>
            <kx-sidebar-content>
              <kx-sidebar-group>
                <h3 kxSidebarGroupLabel>Platform</h3>
                <kx-sidebar-group-content>
                  <ul kxSidebarMenu>
                    <li kxSidebarMenuItem><a kxSidebarMenuButton id="sb-home" href="#sb-main" [active]="true"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="1.5" /></svg><span>Home</span></a></li>
                    <li kxSidebarMenuItem><a kxSidebarMenuButton id="sb-projects" href="#sb-frame"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="3" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5" /></svg><span>Projects</span></a></li>
                  </ul>
                </kx-sidebar-group-content>
              </kx-sidebar-group>
            </kx-sidebar-content>
            <kx-sidebar-footer><button kxSidebarMenuButton id="sb-signout"><span>Sign out</span></button></kx-sidebar-footer>
          </kx-sidebar>
          <main kxSidebarInset id="sb-main">
            <button kxSidebarTrigger id="sb-trigger"></button>
            <p>Page content</p>
            <button kxButton variant="Outline" id="sb-after">After</button>
          </main>
        </kx-sidebar-provider>
      </div>
      <p>open <output data-kx-out="sb-open">{{ sidebarOpen }}</output></p>
    </section>
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: var(--spacing-8); max-inline-size: 60rem; }
    h2 { margin: 0 0 var(--spacing-2); font: var(--text-title-sm); }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-2); }
    .end { justify-content: flex-end; }
    .push-end { margin-inline-start: auto; }
    .far { margin-block-start: 1600px; }
    /* the frame contains the sidebar's fixed panel: a transform makes it the panel's containing block */
    .frame { block-size: 22rem; overflow: hidden; border: 1px solid hsl(var(--border)); transform: translateZ(0); }
  `,
})
export class NotificationsFixture {
  protected readonly toast = inject(KxToasterService);
  protected readonly dismissed = signal(0);
  protected readonly expired = signal(0);
  protected readonly actions = signal(0);
  private uploads = 0;

  ncOpen = false;
  protected readonly unread = signal(2);
  protected readonly selected = signal('');

  tourOpen = false;
  tourStep = 0;
  innerOpen = false;
  protected readonly showC = signal(true);
  readonly steps: KxTourStep[] = [
    { target: '#tour-a', title: 'Save your work', content: 'Changes save automatically, but you can force a save here.' },
    { target: '#tour-b', title: 'Invite others', content: 'Share this project with your team.' },
    { target: '#tour-c', title: 'Archive', content: 'Archived projects leave your list but keep their history.' },
    { target: '#tour-low', title: 'Get help', content: 'Guides and support live here.' },
    { target: '#tour-nowhere', title: 'Coming soon', content: 'This step points at something not on the page.' },
  ];
  readonly innerSteps: KxTourStep[] = [{ target: '#tour-in-dialog-target', title: 'Theme', content: 'Light, dark or the system’s.' }];

  sidebarOpen = true;

  private readonly hooks = { onDismiss: () => this.dismissed.update((n) => n + 1), onAutoClose: () => this.expired.update((n) => n + 1) };

  show(): void {
    this.toast.show('Event created', { description: 'Sunday, December 03 at 9:00 AM', ...this.hooks });
  }
  success(): void {
    this.toast.success('Profile saved', this.hooks);
  }
  error(): void {
    this.toast.error('Upload failed', {
      description: 'The connection dropped.',
      action: { label: 'Retry', onClick: () => this.actions.update((n) => n + 1) },
      cancel: { label: 'Dismiss', onClick: () => {} },
      ...this.hooks,
    });
  }
  keep(): void {
    this.toast.info('Draft kept', {
      action: {
        label: 'Pin',
        onClick: (event) => {
          event.preventDefault();
          this.actions.update((n) => n + 1);
        },
      },
      ...this.hooks,
    });
  }
  many(): void {
    for (let i = 1; i <= 5; i++) this.toast.show(`Message ${i}`, this.hooks);
  }
  upload(): void {
    this.uploads++;
    if (this.uploads % 2) this.toast.show('Uploading…', { id: 'upload', ...this.hooks });
    else this.toast.success('Uploaded', { id: 'upload', ...this.hooks });
  }
  forever(): void {
    this.toast.warning('Offline', { duration: Infinity, ...this.hooks });
  }
  panel(): void {
    this.toast.show('Saved to the panel', { toasterId: 'panel', ...this.hooks });
  }
  startTour(): void {
    this.tourStep = 0;
    this.tourOpen = true;
  }
}
