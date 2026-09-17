---
"@kinetixui/ui": minor
---

Add `MarkdownEditor` — a formatting toolbar over a plain text field (never `contenteditable`) with an optional rendered preview pane. Closes out the last item in the `COMPONENT-ADDITIONS.md` Tier 3 backlog. Shipped as "Markdown-mode" rather than a `contenteditable`-based WYSIWYG (Tiptap/Lexical): `contenteditable` has no native-platform analogue, which would have made this an eighth standing non-port. A markdown textarea is just a text buffer the toolbar inserts syntax into, so it ports cleanly to all four platforms instead.

Includes a small hand-rolled Markdown → HTML/native-view renderer covering exactly the syntax the toolbar produces (headings, bold, italic, links, inline/block code, bullet/numbered lists, blockquotes, paragraphs) — not a full CommonMark implementation, kept dependency-free and ported identically across platforms rather than pulling in a markdown parser, the same reasoning as `DiffViewer`'s hand-rolled LCS diff.

Ships on all four platforms. React, Compose, and Flutter insert/wrap syntax at the real cursor position (`selectionStart`/`TextFieldValue`/`TextEditingController.selection`); SwiftUI's `TextEditor` has no selection API before iOS 17, so its toolbar appends the snippet at the end of the text instead — a documented scope-down, not a silent one.
