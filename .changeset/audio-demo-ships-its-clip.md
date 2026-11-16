---
"@kinetixui/ui": patch
---

The AudioPlayer demo ships its clip instead of fetching one from a third party. Both players in the
documentation and the generated story pointed at an MP3 on `soundhelix.com`, and the website's own
Content Security Policy is `default-src 'self'` with no `media-src`, so the browser refused the load:
measured on a production build, both `<audio>` elements reported `readyState` 0, `networkState` 3,
a null duration and MEDIA error 4 ("Media load rejected by URL safety check"), and pressing Play left
the player paused at zero. The documented player could not play, on every visit. The clip is now an
eight-second tone figure synthesised for this repository and served from `/audio/`, so it carries no
third-party rights and no outside host, and Storybook is given the same directory. The component's
API, props and markup are unchanged — only the demo's source and its title.
