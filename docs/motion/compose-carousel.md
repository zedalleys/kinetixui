# Compose Carousel and live reduced motion

With Android's animator scale already at zero, a Carousel button reached the next page directly. Toggling the setting during an existing button scroll left 13 intermediate offsets over roughly 245 ms after the preference observer reported the change on the API 37 emulator.

Next and Previous read the existing live Android preference. A reduced start calls `scrollToPage`. For an active animated request, the pager reads a live duration scale on each frame. Zero finishes that request at its original destination. Normal motion continues to use the pager's animation and the ambient window scale. The setting applies to button navigation only. The native pager retains its gesture and cancellation behavior.

The native ledger records this as a spatial deviation. The pager uses its own normal timing and removes travel under reduction. No new catalogue role or consumer identity is needed.

The Compose tests measure intermediate page offsets before the setting changes, check forward and backward settlement, restore the setting while asserting that no old offsets recur, and drive a pointer swipe with reduction enabled.

On the API 37 emulator, the fixed pager settled 12 ms after the observer reported reduction when paging forward and 14 ms when paging backward. Both settled offsets stayed at zero after normal motion returned.
