---
"@kinetixui/ui": patch
---

The Image story's demo artwork is served from the repository instead of picsum.photos. The published story carried
a third-party image URL, so the story rendered three blank frames wherever that host was unreachable — and in the
docs site the same references made the Image page the only one fetching an outside subresource, which timed the
accessibility gate's navigation out whenever the host was slow. The artwork is now three committed SVGs drawn with
KinetixUI primitive token colours; the component's API, the demo's layout and its alt semantics are unchanged.
