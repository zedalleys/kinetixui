# Precision Native M4 acceptance evidence

Scope: website PR #557 only. Canonical main was read at `414354baf082060543386c1ad11a211c9fdc9000`; the feature branch preserves its existing base `1ed36855`. The two upstream commits change DESIGN.md and Carousel, with no overlap in this follow-up. Nothing here merges, publishes, tags or deploys the site.

## Changes

- Motion Lab Tabs now follow the live document direction. RTL ArrowRight from Overview selects Settings; changing to LTR selects Activity. The new keyboard regression failed before the fix.
- The Motion Lab Slider root has a 44px minimum pointer target, while preserving its small visible thumb. Its earlier 6px root missed taps 18px from the track. The browser regression now uses synthesized touchscreen activation as well as keyboard endpoints/midpoints and bubble geometry. Vertical spacing is adjusted locally to keep the bubble close to the thumb; library Slider APIs are unchanged.
- The existing website number tween starts its clock at the target update. Consecutive frame-by-frame targets keep making progress; the new 60-frame test failed before this correction. No motion-engineering PR or public numeric API is changed.

The old Slider review was resolved with real-browser evidence, not merely its outdated flag: a browser-only negative control removes its direction prop and reproduces up to 624px of RTL bubble/thumb disagreement. The corrected implementation passes 80 geometry samples (the 90-sample record also includes 10 negative-control samples) over all eight widths, endpoints/midpoint, keyboard and pointer dragging. Its maximum 8px center difference is Radix's thumb edge compensation. The before image is explicitly a controlled reproduction, not a deployed-site capture.

## Verification

- Typecheck, production build and 2,710 website tests pass. ESLint exits0 with four pre-existing unused-variable warnings in unrelated test files.
- Real browser captures: 320,375,390,768,1024,1280,1440,1920px; both themes and both document directions. All initial/final rendered axe audits pass at normal text, with no horizontal overflow or JavaScript exceptions.
- 24 interaction cases across Chromium, Firefox and WebKit cover 390/1440px × LTR/RTL × reduce/no-preference. Navigation modal/search/popover focus returns, platform state/disabled state, real source copy, Tabs, slider, local validation, empty search, pending feedback and chart replay pass. The live browser specimen is React; other tabs show actual source and maturity limits, not emulated native views.
- 24 large-text direction states cover six widths × both themes at 200% text; no overflow. Both synthesized-touch directions activate the enlarged hit area, recover after drag cancellation, render a numeric midpoint, and snap on a live reduced-motion change.
- At 390px/200% a footer link partially under the sticky header produced a target-size snapshot in each theme. The measured full target is 159×34px; after bringing it fully into view the unsuppressed full-page axe audit passes. Both observations are preserved in touch-text-results.json. No product waiver or rule suppression was added.
- Repeated fresh contexts reached the public GitHub API rate limit for optional star counts. The header correctly falls back to the plain repository icon. These 403 responses are preserved separately from runtime errors; no credentials or product policy were changed.
- Existing home-systems gate passes its complete set: first-view CTA/install/beta fit, edge fade, lede contrast, overflow,200% headline words, source-panel height, implementation-map geometry and overlay hit testing. See home-systems.txt.
- Registry generation and check reach the committed fixed point. Manifest and verification checks pass. Protected logo/identity assets, Electric Indigo #6054F4, polygon source/generated geometry, animated hero and token sources have zero diff against current main.

## Performance conditions and limits

Three fresh Chromium contexts per profile, local production build on a shared host. Desktop 1440px unthrottled; mobile 390px with CPU 4x. CDP also requested 150ms/1.6Mbps, but the measured navigation TTFB remained local (about4ms), so effective network shaping is not established: these are CPU-throttled local diagnostics, not a 4G or field forecast. No Lighthouse score or field INP is claimed. Raw runs are retained.

Final sample medians: desktop LCP 100ms, CLS 0.000008, long-task-excess proxy 0ms; mobile LCP 1328ms, CLS 0.000112, long-task-excess proxy 89ms. Event Timing observations are 40–48ms. Automation click round-trip is recorded separately and is not INP. Self-hosted fonts load successfully; the production build still reports 476kB first-load JS at its rounded precision. Transferred-resource totals include visible-link prefetches and are not that build estimate.

The existing hero probe uses four-second windows. Running versus stopped root commit rates were 5.12/s versus 4.63/s, amid the page's separate typing demo. No per-frame React redraw was observed; facet, link and SVG child-list writes were 0 over 240 frames. Animated writes stay on glow/pulse attributes. Reduced motion and offscreen visibility stop the hero's running state.

A local address collision invalidated one exploratory WebKit attempt; it was discarded. WebKit's production HTTPS-upgrade policy also requires a local HTTPS preview. All eight successful WebKit cases use local TLS and the unchanged production headers; only the temporary local certificate is trusted by the test context. Physical Safari/iOS and screen-reader hardware remain untested.

## Owner review

Desktop/mobile composition, both themes, the retained logo/polygon and editorial hierarchy were visually inspected. Section crops hide sticky chrome only during capture; full-page and first-view captures retain the actual header. Full-page captures force deferred sections visible and start at the document top so the screenshot does not move sticky chrome into the middle of the page.

Owner approval is requested for the existing Precision Native presentation and these modest interaction refinements: RTL Tabs, enlarged slider hit area/spacing, and continuous numeric feedback. No new pricing, maturity or native-parity claim is introduced. Read current exact-head CI and Codex results on #557 before acceptance; previous receipts cannot carry across a head change. PR remains draft and requires separate visual acceptance and merge/deployment authorization.
