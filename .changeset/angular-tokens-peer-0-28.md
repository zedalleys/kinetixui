---
"@kinetixui/angular": patch
---

Support `@kinetixui/tokens` 0.28.x. The peer range becomes `>=0.24.0 <0.29.0`, widening the ceiling by one token minor while keeping the `0.24.0` floor, so consumers on tokens 0.24 through 0.28 are all still supported. Tokens 0.28.0 adds 25 token names and removes none, so nothing Angular reads has changed or disappeared. The bound stays closed rather than open-ended: compatibility with a future token minor is a claim to be evidenced per release, not assumed.
