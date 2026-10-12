import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  contentChildren,
  forwardRef,
  input,
  numberAttribute,
  output,
} from '@angular/core';
import { disclosureId } from './disclosure';
import { KxPopover, KxPopoverContent, KxPopoverTrigger } from './floating';

/**
 * Notification center: a bell that opens a list of read and unread notifications, with "Mark all read".
 *
 *   <kx-notification-center>
 *     <button kxNotificationCenterTrigger [unreadCount]="unread()"></button>
 *     <kx-notification-center-content showMarkAllRead (markAllRead)="readAll()">
 *       @for (n of notifications(); track n.id) {
 *         <kx-notification-item [title]="n.title" [description]="n.body" [time]="n.when" [unread]="n.unread"
 *                               pressable (select)="open(n)" />
 *       } @empty {
 *         <kx-empty>…</kx-empty>
 *       }
 *     </kx-notification-center-content>
 *   </kx-notification-center>
 *
 * React composes it from Popover and Button with no new open-state logic, and so does this: the root IS a popover
 * (`KxPopover`), the trigger IS a popover trigger, the content IS popover content — the C1 floating layer, its
 * stack, its Escape, its outside press and its focus return, with nothing of its own. What it adds is the
 * notification semantics on top:
 *
 *   trigger   an icon button named "Notifications" — "Notifications, 3 unread" while any are unread — with an
 *             unread dot that is decoration (the count is in the name)
 *   content   a dialog named by its "Notifications" heading (React's popover has no name), holding a
 *             `role="list"` of items
 *   item      the title, an optional description and time; `unread` draws the dot and the weight AND says
 *             "Unread" to assistive technology (React draws it only); `pressable` makes the row a real button
 *             that emits `(select)` — the item's open action
 *
 * ── The boundary, which is React's and is not settled ──────────────────────
 *
 * Read state is the CALLER's. The component has no store, no persistence and no item-level read API: React's
 * manifest entry is `beta` because "marking one notification read has no API" and there is "no empty-state
 * contract". This port copies that boundary instead of inventing one. Marking one read is what the caller does
 * in the item's `(select)`; marking all is `(markAllRead)`; the unread count is the caller's number. An empty
 * list is the caller's to fill (the example uses `KxEmpty`); the list role is dropped while there are no items,
 * so an empty center is not an empty list.
 *
 * This is also not the toast queue (toast-queue.ts): a toast is transient and forgets itself; a notification is
 * persistent and the caller remembers it. Nothing is shared between the two beyond the design tokens.
 */
@Component({
  selector: 'kx-notification-center',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-overlay-root' },
  providers: [{ provide: KxPopover, useExisting: forwardRef(() => KxNotificationCenter) }],
})
export class KxNotificationCenter extends KxPopover {}

/** The bell. A ghost icon button; put your own icon inside to replace the bell. */
@Component({
  selector: 'button[kxNotificationCenterTrigger]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [KxPopoverTrigger],
  template: `
    <ng-content><svg class="kx-notification-center__bell" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M10 2.5a5 5 0 0 0-5 5v3l-1.5 3h13L15 10.5v-3a5 5 0 0 0-5-5zM8 16a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg></ng-content>
    @if (unreadCount() > 0) {
      <span class="kx-notification-center__dot" aria-hidden="true"></span>
    }
  `,
  host: {
    class: 'kx-btn kx-btn--ghost kx-btn--icon kx-notification-center__trigger',
    '[attr.aria-label]': 'name()',
  },
})
export class KxNotificationCenterTrigger {
  /** How many notifications are unread: said in the trigger's name, and drawn as the dot. */
  readonly unreadCount = input(0, { transform: numberAttribute });
  /** The trigger's name. ", N unread" is added while any are unread. */
  readonly label = input('Notifications');
  /** The words that follow the count in the trigger's name. */
  readonly unreadLabel = input('unread');
  protected readonly name = computed(() => {
    const n = this.unreadCount();
    return n > 0 ? `${this.label()}, ${n} ${this.unreadLabel()}` : this.label();
  });
}

/**
 * One notification. Static text by default; `pressable` renders the row as a button that emits `(select)`.
 */
@Component({
  selector: 'kx-notification-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (pressable()) {
      <button type="button" class="kx-notification-item__row kx-notification-item__row--pressable" (click)="select.emit()">
        <ng-container *ngTemplateOutlet="row" />
      </button>
    } @else {
      <div class="kx-notification-item__row"><ng-container *ngTemplateOutlet="row" /></div>
    }
    <ng-template #row>
      <span class="kx-notification-item__dot" aria-hidden="true"></span>
      <span class="kx-notification-item__text">
        <span class="kx-notification-item__title">
          @if (unread()) {
            <span class="kx-sr-only">{{ unreadLabel() }}: </span>
          }{{ title() }}
        </span>
        @if (description()) {
          <span class="kx-notification-item__description">{{ description() }}</span>
        }
        @if (time()) {
          <span class="kx-notification-item__time">{{ time() }}</span>
        }
      </span>
    </ng-template>
  `,
  imports: [NgTemplateOutlet],
  host: {
    class: 'kx-notification-item',
    role: 'listitem',
    '[attr.data-unread]': 'unread() ? "" : null',
    // `title` is this component's input, not the element's tooltip
    '[attr.title]': 'null',
  },
})
export class KxNotificationItem {
  readonly title = input.required<string>();
  readonly description = input<string | undefined>(undefined);
  /** When it happened, as the reader should see it ("2 min ago"). */
  readonly time = input<string | undefined>(undefined);
  readonly unread = input(false, { transform: booleanAttribute });
  /** Said before the title of an unread item. */
  readonly unreadLabel = input('Unread');
  /** Render the row as a button that emits `(select)` — the item's open action. */
  readonly pressable = input(false, { transform: booleanAttribute });
  readonly select = output<void>();
}

/**
 * The surface: popover content named by its "Notifications" heading, with "Mark all read" when `showMarkAllRead`
 * is set (React shows it when `onMarkAllRead` is passed), and the list.
 */
@Component({
  selector: 'kx-notification-center-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="kx-notification-center__header">
      <h2 class="kx-notification-center__title" [id]="titleId">{{ heading() }}</h2>
      @if (showMarkAllRead()) {
        <button type="button" class="kx-notification-center__mark" (click)="markAllRead.emit()">{{ markAllReadLabel() }}</button>
      }
    </div>
    <div class="kx-notification-center__list" [attr.role]="items().length ? 'list' : null"><ng-content /></div>
  `,
  host: { class: 'kx-floating kx-popover kx-notification-center' },
})
export class KxNotificationCenterContent extends KxPopoverContent {
  protected readonly titleId = `${disclosureId('notifications')}-title`;
  /** The heading — and so the surface's name. */
  readonly heading = input('Notifications');
  override readonly labelledby = input<string | null>(this.titleId);
  override readonly align = input<'start' | 'center' | 'end'>('end');
  /** Show the "Mark all read" action. It emits `(markAllRead)`; marking is the caller's. */
  readonly showMarkAllRead = input(false, { transform: booleanAttribute });
  readonly markAllReadLabel = input('Mark all read');
  readonly markAllRead = output<void>();
  protected readonly items = contentChildren(KxNotificationItem);
}
