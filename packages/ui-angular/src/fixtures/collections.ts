import { Component, signal } from '@angular/core';
import {
  KxButton,
  KxContextMenu,
  KxContextMenuContent,
  KxContextMenuTrigger,
  KxDialog,
  KxDialogClose,
  KxDialogContent,
  KxDialogHeader,
  KxDialogTitle,
  KxDialogTrigger,
  KxDropdownMenu,
  KxDropdownMenuContent,
  KxDropdownMenuTrigger,
  KxMenuCheckboxItem,
  KxMenuGroup,
  KxMenuItem,
  KxMenuLabel,
  KxMenuRadioGroup,
  KxMenuRadioItem,
  KxMenuSeparator,
  KxMenuShortcut,
  KxMenuSub,
  KxMenuSubContent,
  KxMenuSubTrigger,
  KxMenubar,
  KxMenubarContent,
  KxMenubarMenu,
  KxMenubarTrigger,
  KxNavigationMenu,
  KxNavigationMenuContent,
  KxNavigationMenuIndicator,
  KxNavigationMenuItem,
  KxNavigationMenuLink,
  KxNavigationMenuList,
  KxNavigationMenuTrigger,
} from '../public-api';

/**
 * The menus — dropdown menu, context menu, menubar — wired to state the page can read back: the subject of
 * `scripts/angular-collections.mjs` (keyboard, pointer, submenus, RTL, 200% text, motion, axe) and of
 * `scripts/menu-visual.mjs`. The navigation menu (site navigation, not a menu) sits here too: its keyboard is the
 * collection core's and its panel is a floating surface, so it is measured beside the menus it must not be.
 *
 * behaviour.ts's conventions: each subject in its own `[data-kx-subject]` region, every value it changes bound
 * into an `<output data-kx-out="…">`, and the elements a gate drives carry ids. `?region=rtl|ltr` wraps the
 * whole page in a region of that direction, so the gate can run the four direction cases (page × region)
 * with `?dir=` on the same build.
 *
 * Two compositions are written the way an application writes them: an action menu on every row of a data
 * table, and a menu inside a dialog.
 */
@Component({
  selector: 'kx-fixture',
  imports: [
    KxButton,
    KxContextMenu,
    KxContextMenuContent,
    KxContextMenuTrigger,
    KxDialog,
    KxDialogClose,
    KxDialogContent,
    KxDialogHeader,
    KxDialogTitle,
    KxDialogTrigger,
    KxDropdownMenu,
    KxDropdownMenuContent,
    KxDropdownMenuTrigger,
    KxMenuCheckboxItem,
    KxMenuGroup,
    KxMenuItem,
    KxMenuLabel,
    KxMenuRadioGroup,
    KxMenuRadioItem,
    KxMenuSeparator,
    KxMenuShortcut,
    KxMenuSub,
    KxMenuSubContent,
    KxMenuSubTrigger,
    KxMenubar,
    KxMenubarContent,
    KxMenubarMenu,
    KxMenubarTrigger,
    KxNavigationMenu,
    KxNavigationMenuContent,
    KxNavigationMenuIndicator,
    KxNavigationMenuItem,
    KxNavigationMenuLink,
    KxNavigationMenuList,
    KxNavigationMenuTrigger,
  ],
  template: `
    <div class="kx-collections-fixture" id="region" [attr.dir]="region">
      <section data-kx-subject="dropdown">
        <button kxButton variant="Outline" id="dd-before">Before the menu</button>
        <kx-dropdown-menu [(open)]="dd">
          <button kxButton variant="Outline" kxDropdownMenuTrigger id="dd-trigger">Options</button>
          <kx-dropdown-menu-content align="start" id="dd-content">
            <kx-menu-group id="dd-group">
              <kx-menu-label id="dd-label">Document</kx-menu-label>
              <button kxMenuItem id="dd-rename" (select)="pick('rename')">Rename <kx-menu-shortcut id="dd-shortcut">F2</kx-menu-shortcut></button>
              <button kxMenuItem id="dd-duplicate" (select)="pick('duplicate')">Duplicate <kx-menu-shortcut>Ctrl+D</kx-menu-shortcut></button>
              <button kxMenuItem disabled id="dd-archive" (select)="pick('archive')">Archive</button>
              <button kxMenuItem id="dd-download" (select)="pick('download')">Download</button>
              <kx-menu-sub [(open)]="ddSub">
                <button kxMenuSubTrigger id="dd-sub-trigger">Share</button>
                <kx-menu-sub-content id="dd-sub-content">
                  <button kxMenuItem id="dd-sub-email" (select)="pick('email')">Email link</button>
                  <button kxMenuItem id="dd-sub-copy" (select)="pick('copy')">Copy link</button>
                  <kx-menu-sub [(open)]="ddSub2">
                    <button kxMenuSubTrigger id="dd-sub2-trigger">Post to</button>
                    <kx-menu-sub-content id="dd-sub2-content">
                      <button kxMenuItem id="dd-sub2-team" (select)="pick('team')">Team channel</button>
                      <button kxMenuItem id="dd-sub2-blog" (select)="pick('blog')">Company blog</button>
                    </kx-menu-sub-content>
                  </kx-menu-sub>
                </kx-menu-sub-content>
              </kx-menu-sub>
            </kx-menu-group>
            <kx-menu-separator id="dd-separator" />
            <kx-menu-checkbox-item [(checked)]="ruler" id="dd-ruler">Show ruler</kx-menu-checkbox-item>
            <kx-menu-radio-group [(value)]="density" id="dd-density">
              <kx-menu-label inset>Density</kx-menu-label>
              <kx-menu-radio-item value="compact" id="dd-compact">Compact</kx-menu-radio-item>
              <kx-menu-radio-item value="comfortable" id="dd-comfortable">Comfortable</kx-menu-radio-item>
            </kx-menu-radio-group>
            <kx-menu-separator />
            <button kxMenuItem variant="destructive" id="dd-delete" (select)="pick('delete')">Delete document</button>
          </kx-dropdown-menu-content>
        </kx-dropdown-menu>
        <a href="#after-dropdown" id="dd-after">After the menu</a>
        <output data-kx-out="dd">{{ dd() }}</output>
        <output data-kx-out="dd-sub">{{ ddSub() }}</output>
        <output data-kx-out="dd-sub2">{{ ddSub2() }}</output>
        <output data-kx-out="picked">{{ picked() }}</output>
        <output data-kx-out="picks">{{ picks() }}</output>
        <output data-kx-out="ruler">{{ ruler() }}</output>
        <output data-kx-out="density">{{ density() }}</output>
      </section>

      <section data-kx-subject="context">
        <kx-context-menu [(open)]="ctx">
          <div kxContextMenuTrigger class="kx-fixture-canvas" id="ctx-region" tabindex="0" role="group" aria-label="Canvas">
            <span>Canvas</span>
            <button kxButton variant="Outline" size="sm" id="ctx-shape">Shape</button>
          </div>
          <kx-context-menu-content label="Canvas actions" id="ctx-content">
            <button kxMenuItem id="ctx-paste" (select)="pick('paste')">Paste <kx-menu-shortcut>Ctrl+V</kx-menu-shortcut></button>
            <button kxMenuItem disabled id="ctx-group">Group</button>
            <button kxMenuItem id="ctx-select" (select)="pick('select-all')">Select all</button>
            <kx-menu-sub [(open)]="ctxSub">
              <button kxMenuSubTrigger id="ctx-sub-trigger">Arrange</button>
              <kx-menu-sub-content id="ctx-sub-content">
                <button kxMenuItem id="ctx-sub-front" (select)="pick('front')">Bring to front</button>
                <button kxMenuItem id="ctx-sub-back" (select)="pick('back')">Send to back</button>
              </kx-menu-sub-content>
            </kx-menu-sub>
            <kx-menu-separator />
            <kx-menu-checkbox-item [(checked)]="guides" id="ctx-guides">Show guides</kx-menu-checkbox-item>
          </kx-context-menu-content>
        </kx-context-menu>
        <output data-kx-out="ctx">{{ ctx() }}</output>
        <output data-kx-out="ctx-sub">{{ ctxSub() }}</output>
        <output data-kx-out="guides">{{ guides() }}</output>
      </section>

      <section data-kx-subject="menubar">
        <kx-menubar aria-label="Editor" [(value)]="bar" id="mb">
          <kx-menubar-menu value="file">
            <button kxMenubarTrigger id="mb-file">File</button>
            <kx-menubar-content id="mb-file-content">
              <button kxMenuItem id="mb-new" (select)="pick('new')">New tab <kx-menu-shortcut>Ctrl+T</kx-menu-shortcut></button>
              <button kxMenuItem id="mb-window" (select)="pick('window')">New window</button>
              <kx-menu-sub>
                <button kxMenuSubTrigger id="mb-share-trigger">Share</button>
                <kx-menu-sub-content id="mb-share-content">
                  <button kxMenuItem id="mb-share-email" (select)="pick('mb-email')">Email link</button>
                  <button kxMenuItem id="mb-share-messages" (select)="pick('mb-messages')">Messages</button>
                </kx-menu-sub-content>
              </kx-menu-sub>
              <kx-menu-separator />
              <button kxMenuItem id="mb-print" (select)="pick('print')">Print</button>
            </kx-menubar-content>
          </kx-menubar-menu>
          <kx-menubar-menu value="edit">
            <button kxMenubarTrigger id="mb-edit">Edit</button>
            <kx-menubar-content id="mb-edit-content">
              <button kxMenuItem id="mb-undo" (select)="pick('undo')">Undo</button>
              <button kxMenuItem disabled id="mb-redo">Redo</button>
              <button kxMenuItem id="mb-cut" (select)="pick('cut')">Cut</button>
            </kx-menubar-content>
          </kx-menubar-menu>
          <kx-menubar-menu value="view">
            <button kxMenubarTrigger id="mb-view">View</button>
            <kx-menubar-content id="mb-view-content">
              <kx-menu-checkbox-item [(checked)]="bookmarks" id="mb-bookmarks">Show bookmarks</kx-menu-checkbox-item>
              <kx-menu-radio-group [(value)]="zoom">
                <kx-menu-label inset>Zoom</kx-menu-label>
                <kx-menu-radio-item value="100" id="mb-zoom-100">100%</kx-menu-radio-item>
                <kx-menu-radio-item value="125" id="mb-zoom-125">125%</kx-menu-radio-item>
              </kx-menu-radio-group>
            </kx-menubar-content>
          </kx-menubar-menu>
        </kx-menubar>
        <output data-kx-out="bar">{{ bar() ?? '' }}</output>
        <output data-kx-out="bookmarks">{{ bookmarks() }}</output>
        <output data-kx-out="zoom">{{ zoom() }}</output>
      </section>

      <section data-kx-subject="navigation-menu" id="nm-region">
        <button kxButton variant="Outline" id="nm-before">Before</button>
        <nav kxNavigationMenu [(value)]="nav" id="nm" aria-label="Site">
          <ul kxNavigationMenuList>
            <li kxNavigationMenuItem value="products">
              <button kxNavigationMenuTrigger id="nm-products">Products</button>
              <kx-navigation-menu-content id="nm-products-content">
                <ul class="kx-fixture-links">
                  <li><a kxNavigationMenuLink id="nm-analytics" href="#analytics" (click)="pick('analytics')">Analytics</a></li>
                  <li><a kxNavigationMenuLink id="nm-billing" href="#billing" [active]="true">Billing</a></li>
                  <li><a kxNavigationMenuLink id="nm-security" href="#security">Security</a></li>
                </ul>
              </kx-navigation-menu-content>
            </li>
            <li kxNavigationMenuItem value="resources">
              <button kxNavigationMenuTrigger id="nm-resources">Resources</button>
              <kx-navigation-menu-content id="nm-resources-content">
                <ul class="kx-fixture-links">
                  <li><a kxNavigationMenuLink id="nm-docs" href="#docs">Documentation</a></li>
                  <li><a kxNavigationMenuLink id="nm-blog" href="#blog">Blog</a></li>
                </ul>
              </kx-navigation-menu-content>
            </li>
            <li kxNavigationMenuItem><a kxNavigationMenuLink id="nm-pricing" href="#pricing">Pricing</a></li>
          </ul>
          <kx-navigation-menu-indicator id="nm-indicator" />
        </nav>
        <button kxButton variant="Outline" id="nm-after">After</button>
        <output data-kx-out="nav">{{ nav() ?? '' }}</output>
      </section>

      <section data-kx-subject="table" class="kx-fixture-table-wrap">
        <table class="kx-fixture-table" aria-label="Invoices">
          <thead><tr><th scope="col">Invoice</th><th scope="col">Amount</th><th scope="col"><span class="kx-fixture-sr">Actions</span></th></tr></thead>
          <tbody>
            @for (row of rows(); track row.id) {
              <tr>
                <td>{{ row.id }}</td>
                <td>{{ row.amount }}</td>
                <td>
                  <kx-dropdown-menu>
                    <button kxButton variant="Ghost" size="sm" kxDropdownMenuTrigger [id]="'row-' + row.id + '-actions'" [attr.aria-label]="'Actions for ' + row.id">⋯</button>
                    <kx-dropdown-menu-content align="end">
                      <button kxMenuItem (select)="pick('view-' + row.id)">View invoice</button>
                      <button kxMenuItem (select)="pick('send-' + row.id)">Send reminder</button>
                      <kx-menu-separator />
                      <button kxMenuItem variant="destructive" [id]="'row-' + row.id + '-void'" (select)="remove(row.id)">Void invoice</button>
                    </kx-dropdown-menu-content>
                  </kx-dropdown-menu>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <output data-kx-out="rows">{{ rowIds() }}</output>
      </section>

      <section data-kx-subject="dialog">
        <kx-dialog [(open)]="dialog">
          <button kxButton variant="Outline" kxDialogTrigger id="dlg-trigger">Edit layout</button>
          <dialog kxDialogContent id="dlg-content">
            <kx-dialog-header><h2 kxDialogTitle>Edit layout</h2></kx-dialog-header>
            <kx-dropdown-menu [(open)]="dialogMenu">
              <button kxButton variant="Outline" kxDropdownMenuTrigger id="dlg-menu-trigger">Insert</button>
              <kx-dropdown-menu-content align="start" id="dlg-menu-content">
                <button kxMenuItem id="dlg-menu-heading" (select)="pick('heading')">Heading</button>
                <button kxMenuItem id="dlg-menu-image" (select)="pick('image')">Image</button>
                <kx-menu-sub>
                  <button kxMenuSubTrigger id="dlg-menu-sub-trigger">Embed</button>
                  <kx-menu-sub-content id="dlg-menu-sub-content">
                    <button kxMenuItem id="dlg-menu-video" (select)="pick('video')">Video</button>
                    <button kxMenuItem id="dlg-menu-map" (select)="pick('map')">Map</button>
                  </kx-menu-sub-content>
                </kx-menu-sub>
              </kx-dropdown-menu-content>
            </kx-dropdown-menu>
            <button kxButton kxDialogClose id="dlg-done">Done</button>
          </dialog>
        </kx-dialog>
        <output data-kx-out="dialog">{{ dialog() }}</output>
        <output data-kx-out="dialog-menu">{{ dialogMenu() }}</output>
      </section>
    </div>
  `,
  styles: `
    .kx-collections-fixture { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--spacing-6); padding: 24px; font-family: var(--font-family-sans); color: hsl(var(--foreground)); }
    section { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-3); min-inline-size: 0; }
    .kx-fixture-canvas { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--spacing-2); inline-size: 100%; min-block-size: 10rem; border: 1px dashed hsl(var(--border)); border-radius: var(--radius-surface); }
    .kx-fixture-table-wrap { overflow-x: auto; }
    .kx-fixture-table { border-collapse: collapse; inline-size: 100%; }
    .kx-fixture-table :is(th, td) { padding: var(--spacing-2); border-block-end: 1px solid hsl(var(--border)); text-align: start; }
    .kx-fixture-sr { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    .kx-fixture-links { display: grid; gap: var(--spacing-1); inline-size: 16rem; max-inline-size: 100%; }
    output { display: none; }
  `,
})
export class CollectionsFixture {
  readonly region = new URLSearchParams(globalThis.location?.search ?? '').get('region');
  readonly dd = signal(false);
  readonly ddSub = signal(false);
  readonly ddSub2 = signal(false);
  readonly picked = signal('');
  readonly picks = signal(0);
  readonly ruler = signal(true);
  readonly density = signal('comfortable');
  readonly ctx = signal(false);
  readonly ctxSub = signal(false);
  readonly guides = signal(false);
  readonly bar = signal<string | null>(null);
  readonly nav = signal<string | null>(null);
  readonly bookmarks = signal(true);
  readonly zoom = signal('100');
  readonly dialog = signal(false);
  readonly dialogMenu = signal(false);
  readonly rows = signal([
    { id: 'INV-001', amount: '€250.00' },
    { id: 'INV-002', amount: '€150.00' },
    { id: 'INV-003', amount: '€350.00' },
  ]);

  pick(what: string): void {
    this.picked.set(what);
    this.picks.set(this.picks() + 1);
  }
  rowIds(): string {
    return this.rows()
      .map((r) => r.id)
      .join(',');
  }
  remove(id: string): void {
    this.pick(`void-${id}`);
    this.rows.set(this.rows().filter((r) => r.id !== id));
  }
}
