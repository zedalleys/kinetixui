import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KxAvatar, KxAvatarFallback, KxQuote } from '../../lib/display';

/**
 * The "Testimonial" block — see sign-in.ts for how block fixtures work.
 *
 * `kx-quote` renders a real figure / blockquote / figcaption, so the attribution is structurally attached to
 * what it attributes and the quotation marks stay decorative. The avatar goes in the quote's own projection
 * slot rather than beside it, which is what keeps that relationship in the markup rather than only in the
 * layout.
 */
// kx-block:start
@Component({
  selector: 'app-testimonial-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxAvatar, KxAvatarFallback, KxQuote],
  template: `
    <kx-quote author="Dieter Rams" authorTitle="Industrial Designer">
      Good design is as little design as possible.
      <kx-avatar kxQuoteAvatar>
        <kx-avatar-fallback>DR</kx-avatar-fallback>
      </kx-avatar>
    </kx-quote>
  `,
})
export class TestimonialBlock {}
// kx-block:end
