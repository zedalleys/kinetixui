# Refreshed branch evidence — 11 November 2026

Captured from the production build after refresh to main `66f5c26c72c4523e9528ef1e3762e1961be5482a`. The website implementation source is unchanged by the refresh; upstream Field and SegmentedControl fixes are included.

Fresh local verification: production build/typecheck; 2,703 website tests; eight browser viewport/theme/text-size cases, each with zero axe AA violations, zero runtime errors, LTR/RTL overflow checks and identical platform-panel heights. Browser cases include 320px at 200% text in both themes. The JSON records those eight cases. Screenshots use reduced-motion rest states and the real sticky header.

The exact brand-mark/identity assets, #6054F4 identity definition, polygon geometry, animated hero implementation, brand stylesheet and token sources have zero diff against current main. Both website and Storybook Vercel configurations suppress automatic deployments for the two review branch names.

The earlier independent visual review returned ship for this homepage surface; that historical review does not stand in for a current-head Codex receipt or remote CI. Native views do not run in these browser captures. The numeric library PR supplies separate native test evidence and preserves the nine existing ledger entries. No full native parity is claimed.

## RTL slider follow-up — 11 November 2026

The Motion Lab slider now receives the live document direction through the existing direction hook. The focused suite passes 3 tests, including LTR → RTL → LTR changes; removing the direction prop makes that regression test fail. Production build/typecheck passes. The eight-case browser matrix was rerun on this fix: all 32 bubble/thumb geometry checks pass (20% and 80%, LTR and RTL in every case), with zero axe violations, runtime errors or horizontal overflow. The geometry allowance is half the thumb width plus 2px for Radix’s edge compensation. Layout is sampled after two animation frames. `motion-1440-rtl.png` shows the fixed 20% RTL state from this production build; earlier screenshots remain historical captures as described above.
