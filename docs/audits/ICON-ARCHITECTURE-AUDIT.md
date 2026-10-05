# Icon architecture audit

Audited `main` at `5db94f09269637f85bfc489630694a05ed7e5eb8` (2026-10-05). Branch `claude/icon-architecture-2y56a2`.
User-facing guide: [/docs/icons](../../apps/web/src/app/docs/icons/page.mdx). Checked record: [`icons/mapping.json`](../../icons/mapping.json).

Engineering audits in this repository have lived at the root (`ACCESSIBILITY-AUDIT.md`, `CORE-AUDIT.md`); this one
is under `docs/audits/` because the brief named that path. Nothing else depends on the location.

## 1. Executive verdict

**Grade: B** (was **C** at the audited SHA).

The architecture the brief asks for (semantic role, then a platform-native default, then an overridable slot)
was already the intent on React, Angular, SwiftUI and Flutter: each draws from its platform's own icon source, and
nothing in the repository translates icon names between libraries. Three things kept it at C:

1. **Icon-only controls without a name on two native platforms.** On Jetpack Compose every component-owned icon
   was a Unicode character in a `Text`, so TalkBack read "multiplication sign" for a close button, and three of
   them (`🔔`, `⏪`, `⏩`) rendered as colour emoji that ignored the theme. On Flutter, close, back, remove, copy,
   password and media buttons were bare `GestureDetector`s with no name, and `Tag`'s remove and `NumberInput`'s
   steppers had a name but no action, so a screen reader could not press them.
2. **No way to bring your own icon** for the one component-owned icon a product team most often wants to change
   (the dismiss mark), on four of five platforms. Angular already had a projection slot.
3. **Directional icons that did not turn around** in right-to-left layouts on React and SwiftUI.

All three are fixed on this branch, additively. What keeps it from A: 24 Unicode glyphs remain on Compose, most of
them the only state cue of a menu or tree row, which need state semantics before they can become decorative
icons; Compose and SwiftUI changes are compiled only in CI (no Android SDK or Swift toolchain here); and the
site's preview RTL toggle still changes the whole page's direction (PR #300 §27, being fixed in its own thread).

## 2. Current architecture (after this branch)

| Platform | Default source | How a component draws it | Replacement |
| --- | --- | --- | --- |
| React | `lucide-react` 1.48 (a dependency of `@kinetixui/ui`) | named imports, tree-shaken; lucide sets `aria-hidden` itself | `ReactNode` props (`dismissIcon`, `icon`), `children` (Breadcrumb separator) |
| Angular | inline SVG in templates (no dependency), plus `‹`/`›` text in Breadcrumb, Pagination and the back link | `aria-hidden` SVG inside a named control (`closeLabel`, `removeLabel`, `completedLabel` inputs) | content projection with a fallback: `[kxDismissIcon]`, `[kxCopyIcon]` |
| SwiftUI | SF Symbols | `Image(systemName:)` inside a labelled `Button` | `@ViewBuilder` closures (`dismissIcon:`) |
| Compose | Material icons, as `internal object KinetixIcons` (Material's own path data drawn with material3 `Icon`) | `KinetixIcon` (decorative) inside `KinetixIconControl` (named, `Role.Button`, sized box, `LocalContentColor`) | `@Composable () -> Unit` slots (`dismissIcon`) |
| Flutter | Material `Icons` | `Icon` inside the internal `IconControl` (named, button, tap action, `IconTheme`, tight box) | `Widget?` parameters (`dismissIcon`) |

The ownership split the brief describes is now how the slot code is written on every platform: the component
owns the box (size), the colour (inherited), the name (the control's label, never the icon's) and the direction
rule; the application owns the artwork.

No universal `icon="search"` API exists or was added. The repository already had the cross-platform record it
needs, `icons/mapping.json`, which is documentation checked against source (`pnpm check:icons`), not a runtime
mapping. That is the right shape: it catches drift without promising that five libraries share names.

## 3. Icon inventory

Method: a scan of every component source (not only the obvious files) per platform, kept as evidence in
`/mnt/project-files/icon-architecture/inventory-{before,after}.json`. A reference is one icon name (or inline
SVG, or glyph) used by one component file.

| Platform | References at 5db94f0 | Component files | After |
| --- | --- | --- | --- |
| React | 96 (93 lucide, 3 inline SVG) | 46 | 96 |
| Angular | 19 (14 inline SVG, 5 `‹`/`›` glyphs) | 7 | 19 |
| SwiftUI | 42 SF Symbol sites | 29 | 42 (5 changed to direction-aware or labelled) |
| Compose | 47 Unicode glyphs, 0 icons | 26 | 23 vectors, 24 glyphs |
| Flutter | 55 Material `Icons` | 29 | 55 |
| **Total** | **259** | | |

Classification, by the brief's categories:

| Category | Where |
| --- | --- |
| PLATFORM DEFAULT | React lucide, SwiftUI SF Symbols, Flutter `Icons`, Compose `KinetixIcons` (Material paths): the large majority |
| KINETIXUI DEFAULT (replaceable) | Banner and Inform dismiss on all five; CodeBlock copy on Angular; Breadcrumb separator on React (`children`) and SwiftUI (symbol parameter); Compose Breadcrumb separator (a `text` parameter, see §8) |
| CONSUMER SLOT | `icon` on Metric, Timeline, TreeItem, TabBar items, Sidebar items, Inform's action; `Button` children everywhere |
| DECORATIVE | checkbox/radio marks, accordion and select chevrons, status icons beside text; hidden from assistive technology on every platform after this branch |
| SEMANTIC | Field and Toaster status icons (always beside the message text); DataGrid/DataTable sort arrows; Compose state glyphs (§8) |
| CUSTOM DRAWN, JUSTIFIED | React `chart.tsx` legend marks and `circular-progress.tsx` ring; radio dots (`CircleShape`, `Circle()`, `BoxShape.circle`); Angular's inline SVGs (they avoid an icon dependency in a package that has none) |
| CUSTOM DRAWN, QUESTIONABLE | none found |
| UNICODE GLYPH | 47 on Compose at the audited SHA (24 remain); 5 on Angular, deliberate (§9) |
| HARD-CODED, NOT REPLACEABLE | dialog/sheet/modal close, accordion and select chevrons, checkbox marks, stepper check, tag remove, pagination and navigation chevrons, on every platform |

## 4. Semantic-role matrix

Component-owned defaults only. "Replaceable" means a supported slot exists.

| Role | React | Angular | SwiftUI | Compose | Flutter | RTL | Replaceable |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dismiss (Banner, Inform) | `X` | SVG | `xmark` | `Close` | `Icons.close` | fixed | yes, all five |
| Close (Dialog, Sheet) | `X` | SVG | `xmark` | `Close` | `Icons.close` | fixed | no |
| Remove (Tag, FileUpload) | `X` | SVG | `xmark` | `Close` | `Icons.close` | fixed | no |
| Back | `ChevronLeft` | `‹` | `chevron.backward` | `ChevronStart` | `Icons.chevron_left` | mirrors | no |
| Previous / next page | `ChevronLeft` / `ChevronRight` | `‹` / `›` | `chevron.backward` / `.forward` | `ChevronStart` / `End` | `chevron_left` / `right` | mirrors | no |
| Breadcrumb separator | `ChevronRight` | `›` | `chevron.forward` | `›` (text) | `Icons.chevron_right` | mirrors | React, SwiftUI, Compose (text) |
| Collapsed disclosure (Tree, JSON) | `ChevronRight` | not ported | `chevron.forward` | `▸` (text) | `Icons.chevron_right` | mirrors (not on Compose) | no |
| Expanded disclosure, accordion, select | `ChevronDown` | SVG | `chevron.down` | `ExpandMore` | `keyboard_arrow_down` | fixed | no |
| Checked | `Check` | SVG | `checkmark` | `Check` | `Icons.check` | fixed | no |
| Indeterminate, decrease | `Minus` | SVG | `minus` | `Remove` | `Icons.remove` | fixed | no |
| Increase | `Plus` | n/a | `plus` | `Add` | `Icons.add` | fixed | no |
| Notifications | `Bell` | not ported | `bell` | `Notifications` | `notifications_outlined` | fixed | no |
| Media transport | `SkipBack`, `Play`, … | not ported | `backward.fill`, `gobackward.10`, … | `SkipPrevious`, `FastRewind`, … | `skip_previous`, `replay_10`, … | fixed (time, not reading direction) | no |
| Copy | `Copy` | SVG | `doc.on.doc` | not ported | `Icons.copy` | fixed | Angular only |

## 5. Platform comparison

The same role reads as the same action everywhere; the shapes differ by design. Two real mismatches remain:
`Resizable`'s grip is vertical dots on React and a horizontal ellipsis on SwiftUI and Flutter (recorded in
mapping.json since its first version), and Compose's disclosure rows still use text glyphs. The SwiftUI
AudioPlayer's "previous/next track" buttons use `backward.fill`/`forward.fill` (which read as rewind) where
`backward.end.fill` is the conventional symbol; noted, not changed, because it changes the artwork users see.

## 6. Default-icon findings

- Every platform has a sensible default for every component-owned role; none requires the consumer to supply one.
- Removing a default is not offered and should not be: every component-owned icon either is the only visible
  sign of a control (close, back, steppers) or carries state (checkmarks, disclosure). The dismiss slot replaces,
  never removes; the control exists only when the action is handled.
- `icons/mapping.json` and the old /docs/icons made false claims at the audited SHA: Compose Dialog, Tag and
  Pagination icons were recorded as "absent" (glyphs existed), Inform was recorded as not ported on Flutter and
  SwiftUI (it is), and the page said Compose's glyphs were a settled approach. Corrected.

## 7. Customization and slot findings

- **Missing:** Banner and Inform dismiss could not be replaced on React, SwiftUI, Compose or Flutter. Added
  additively: `dismissIcon?: ReactNode`; a second SwiftUI initializer with a `@ViewBuilder dismissIcon`;
  `dismissIcon: (@Composable () -> Unit)? = null`; `Widget? dismissIcon`. Angular's existing `[kxDismissIcon]`
  slot projected an SVG at the browser default 300×150 because nothing sized it; it is now 14×14 (and
  `[kxCopyIcon]` 16×16).
- **Slot naming:** `dismissIcon` on every platform, matching Angular's `kxDismissIcon`. Consumer-supplied icon
  props elsewhere are all `icon`. No inconsistency worth a rename.
- **Your own library:** verified by tests on each platform that an icon from outside the default source works:
  a non-lucide SVG component (React), a projected SVG (Angular), `Image(systemName:)` and an asset `Image`
  (SwiftUI, compiled in CI), any composable including a vector of the app's own (Compose), `CupertinoIcons` and
  an arbitrary widget (Flutter).
- **Not added, deliberately:** Dialog close and Accordion chevron slots. They are the next candidates, but no
  repository evidence (issue, consumer code) asks for them yet, and each adds API on five platforms.

## 8. Compose: Unicode and custom drawing

The brief's ten questions, answered for the 47 glyphs at the audited SHA:

1. **Role.** Close/dismiss/remove (`×` ×5), back/previous/next (`‹` `›` ×5), expand (`▾` ×2), check/minus
   (`✓` `−` ×4), notifications (`🔔`), media (`⏮ ⏪ ⏩ ⏭ ▶ ⏸` ×7), and state or content glyphs (the 24 listed in
   `icons/mapping.json` `composeGlyphs`, each with its reason).
2. **Decoration?** The first group were the only content of icon-only controls, so not decoration: they were the
   control's name.
3. **Native Material icon appropriate?** Yes for all 23 replaced.
4. **Existing slot?** None.
5. **Should it have one?** Banner and Inform dismiss: yes, added. The others: not yet (§7).
6. **Custom drawing justified?** No custom drawing was involved; `CircleShape` radio dots are justified.
7. **Typography-dependent?** Yes, every one: the shape comes from whichever font the device resolves.
8. **Reliable across devices?** No. `🔔`, `⏪`, `⏩` have emoji presentation and render as colour emoji on
   Android, ignoring tint and the disabled alpha.
9. **RTL?** `‹`/`›` are Bidi_Mirrored and did turn around; `▸` does not, so Tree and JSON rows point the wrong way
   in RTL (still open, recorded as an `rtlException`).
10. **Accessibility?** TalkBack read the character name ("multiplication sign") or nothing useful.

**Dependency decision.** `androidx.compose.material:material-icons-core` is not on the module's classpath
(material3 stopped bringing it in). Rather than add a frozen artifact for 15 paths, `KinetixIcons.kt` builds the
15 icons from Material's own path data (Apache 2.0) with `ImageVector.Builder`, drawn by material3's `Icon`. Users
see the Material icon a Compose developer expects; the module gains no dependency; the vectors are `internal`.

**What remains (24).** Ratcheted by `pnpm check:icons`: a new glyph fails, and a removed one fails until its
entry is deleted. Most are the only state cue of a row (DropdownMenu `✓` `●`, MultiSelect and Select item `✓`,
Tree and JSON `▸`/`⌄`), and turning them into decorative icons first would remove the state from TalkBack; they
need `toggleableState`/`selected`/expanded semantics first. Others are content (DiffViewer `−`, Markdown preview
bullets), text that reads correctly (Metric `↑ 12%`), or a public `String` parameter (Breadcrumb separator).

## 9. Angular findings

Angular was the most mature port. Icon-only controls are named through inputs (`closeLabel`, `removeLabel`,
`menuLabel`, `completedLabel` for visually hidden step text), SVGs are `aria-hidden` and `focusable="false"`, and
Banner, Inform and CodeBlock already projected replacement icons with fallback content. One defect: projected
icons were unsized (above). The `‹`/`›` text in Breadcrumb, Pagination and the back link is deliberate: those
characters are Bidi_Mirrored, so the browser turns them around in RTL, which `check:angular-browser` already
verifies. Angular has no tree, JSON viewer, notification centre or audio player, so those rows are "not ported".

## 10. RTL findings

| Icon | Should | At 5db94f0 | After |
| --- | --- | --- | --- |
| Back, previous, next | mirror | React and SwiftUI did not; Compose, Flutter, Angular did (glyph bidi or `matchTextDirection`) | all five |
| Breadcrumb separator | mirror | React and SwiftUI did not | all five |
| Collapsed disclosure | mirror | React and SwiftUI did not; Compose does not | React, SwiftUI, Flutter; Compose open |
| Expanded disclosure | point down, both directions | correct | correct (React: rotate only, never mirror-then-rotate, which would point up) |
| Close, check, minus, accordion | not mirror | correct | correct, tested |
| Media transport | not mirror (time, not page direction) | correct | correct, tested |

React uses the repository's existing convention, `rtl:-scale-x-100` (Tailwind's `rtl:` matches any ancestor
`dir`). SwiftUI moved to `chevron.backward`/`chevron.forward`, which flip with `layoutDirection`; TreeView and
JsonViewer rotate by ±90° according to the environment's direction. Compose uses `autoMirror` vectors.

**Measured, not assumed.** `pnpm check:icon-direction` (new) renders the Storybook stories in LTR and then RTL,
with `dir` set on the story's own root (it asserts `<html dir>` is untouched), and reads which way each chevron's
ink points: NavigationBar back, Pagination previous/next, Breadcrumb separator, JsonViewer collapsed and
expanded, TreeView expanded, Accordion. 24 checks pass.

**Preview isolation (§16 of the brief).** Testing reproduced the known leak: the site's preview RTL toggle sets
`<html dir>` (apps/web `preview-environment.tsx`, PR #300 §27, P1), so the whole page goes RTL. It is not an icon
defect and nothing here works around it; the fix (Slice 1A) is authorised in its own thread and owns
`preview-environment.tsx` and the overlay direction handling, which this branch does not touch. The direction
gate deliberately scopes `dir` to the story root so it does not depend on that behaviour.

## 11. Accessibility findings

| Platform | Icon-only controls named | Decorative icons hidden | Consumer icon contract |
| --- | --- | --- | --- |
| React | yes (`aria-label`), already | yes (lucide), already | slot icon is inside the named button; the button keeps its label even if the icon has a `<title>` (tested) |
| Angular | yes, already | yes, already | projected content sits inside the named button |
| SwiftUI | mostly; dismiss, bell and audio relied on implicit symbol names | yes | `.accessibilityLabel("Dismiss")` on the button, so a custom view needs no label |
| Compose | **no** (glyph names) | **no** (glyphs were read) | `KinetixIconControl` names the button; pass `contentDescription = null` |
| Flutter | **no**; Tag and NumberInput not activatable | partly | `IconControl` excludes the child's semantics and names the button |

Fixed: Compose Dialog close, Banner/Inform dismiss, FileUpload remove, NavigationBar back, Carousel previous/next,
NotificationCenter ("Notifications, 3 unread"), AudioPlayer transport. Flutter Banner/Inform dismiss, Dialog close,
FileUpload remove, back, password toggle ("Show password" / "Hide password", the action it will take), CodeBlock
copy, AudioPlayer transport, Tag remove and NumberInput steppers (tap action). SwiftUI dismiss, bell (with
unread count) and transport labels.

Open: Flutter `Rating` stars and the `TreeView` expand chevron are unnamed tap targets (found late; they need
rating and expanded-state semantics, not just a label). React's Banner/Inform dismiss target is about 18 px
(14 px icon, 2 px padding); acceptable under WCAG 2.2's spacing exception in practice, but small.
`PaginationEllipsis` wraps its "More pages" `sr-only` text in an `aria-hidden` span, so the text is never read.

## 12. Sizing and spacing findings

Sizing is owned by the component on every platform, from component-level values rather than a separate icon
scale: React `Button` sizes any SVG child to 18 px (`[&_svg]:size-[18px]`) and pads `size="icon"` to a 42 px
square; dismiss marks are 14 px; Compose and Flutter controls set the icon box explicitly (14, 16, 18, 20, 24).
No new scale was introduced. The slots now enforce the size instead of documenting it: React
`[&_svg]:size-3.5`, Angular CSS on `[kxDismissIcon]`, SwiftUI `.frame(width: 14, height: 14)`, Compose a sized
`Box` with `propagateMinConstraints`, Flutter a tight `SizedBox.square` plus `IconTheme`. Spacing around icons uses
spacing tokens where the surrounding layout does; the remaining literals (`p-0.5`, `6.dp`, `EdgeInsets.all(8)`) are
touch-target padding that pre-dates this audit and is platform-specific; left alone.

## 13. State and colour findings

Icons inherit colour on every platform: `currentColor` (React, Angular), the button's foreground style (SwiftUI),
`LocalContentColor` (Compose, provided by `KinetixIconControl`), `IconTheme` (Flutter, provided by `IconControl`).
Disabled controls dim the icon with the control (Compose transport controls tested disabled). The defect was the
Compose emoji glyphs, which ignored tint, dark theme and disabled alpha; gone. A consumer icon drawn with a fixed
colour will not follow state; the guide says so.

## 14. Dependency findings

No dependency added or removed. `lucide-react` is the only icon package in the repository (a dependency of
`@kinetixui/ui`, tree-shaken by named imports; ISC licence). Angular, SwiftUI and Flutter need no package. Compose
uses material3, already a dependency, with Material path data in-module (above). There are no duplicate icon
packages.

## 15. Documentation findings

At the audited SHA /docs/icons existed but described the current state as intended architecture ("Compose: plain
Unicode glyphs") and carried the false "absent" claims. Rewritten as the canonical guide: philosophy, a platform
table, compiled examples for all five platforms (extracted from each platform's tested source by `gen:usage`, so
they cannot drift), what the slot owns, a role table with RTL rules, icon-only controls, RTL, "don't", and links.
It answers the brief's nine questions in its first two sections. The Banner and Inform component pages now name
their `dismissIcon` API per platform and link to the guide; the RTL page links to the guide's RTL section. The
page was already in the docs navigation (Foundations, `apps/web/src/lib/site.ts`).

## 16. Test coverage

| Platform | Tests | Covers |
| --- | --- | --- |
| React | `components-icons.test.tsx` (15) | default renders and is hidden; custom replaces; arbitrary SVG works; size contract; name from label not icon; click; no control without `onDismiss`; directional classes; non-directional not mirrored; both docs examples render |
| React (pixels) | `check:icon-direction` (24 checks, Playwright on Storybook) | which way each directional icon actually points in LTR and RTL; `<html dir>` untouched |
| Angular | `content.spec.ts` (dismiss slot), `angular-browser` fixture | projected icon replaces the default and renders 14×14 in a real browser |
| Flutter | `icon_contract_test.dart` (16), usage test | names, roles, semantic tap actions, slot replacement with Cupertino and arbitrary widgets, 14×14 box, inherited colour, back mirrors, dismiss does not |
| Compose | `IconContractTest.kt` (9), usage test | named buttons, no glyph left to read, 14 dp slot box, disabled transport, `autoMirror` only on directional icons |
| SwiftUI | usage example compiled by `swift test` in CI | the dismiss slot API with an SF Symbol and an asset image |
| All | `check:icons` | recorded icons still in source; direction rule; Compose glyph ratchet; no emoji in component string literals |

Not covered by automation: preview isolation (owned by the Slice 1A fix), and on-device rendering for Compose and
SwiftUI.

## 17. Negative controls

Each sabotage was applied, the gate run, and the change restored.

| Sabotage | Gate | Result |
| --- | --- | --- |
| Flutter `Tag` back to its original `GestureDetector` | `icon_contract_test` | fails: "missing actions: [tap]" |
| Flutter `NumberInput` without `onTap` on its `Semantics` | `icon_contract_test` | fails |
| `IconControl` without `onTap` on its `Semantics` | `icon_contract_test` | 9 failures |
| Compose: `"×"` and `"🔔"` added to `Tag.kt`, a `composeGlyphs` entry deleted, SwiftUI Pagination back to `chevron.left` (and its record) | `check:icons` | 5 failures: unlisted glyphs, emoji, direction rule |
| RTL class removed from Pagination's chevrons | unit test; `check:icon-direction` (after rebuilding Storybook) | unit test fails; direction gate fails 2 checks: "Previous points left, expected right", "Next points right, expected left" |
| Angular slot sizing CSS removed | `check:angular-browser` | fails: "sized by the slot, not by the icon (14×14)", measured 0×0 |

Logs: `/mnt/project-files/icon-architecture/negative-controls/`.

## 18. Findings by severity

**P0: 0.**

**P1: 5** (4 fixed, 1 owned elsewhere)
1. Compose icon-only controls named by a Unicode character or not at all. Fixed.
2. Flutter icon-only controls with no name. Fixed.
3. Flutter Tag remove and NumberInput steppers could not be activated by a screen reader. Fixed.
4. Banner and Inform dismiss icon could not be replaced on React, SwiftUI, Compose or Flutter. Fixed (additive).
5. Preview RTL toggle changes `<html dir>` for the whole site. PR #300 §27; fix authorised in its own thread.

**P2: 9** (6 fixed, 3 open)
1. Compose rendered component-owned icons as Unicode text, three as colour emoji. 23 of 47 fixed; 24 open, ratcheted.
2. React directional icons did not mirror. Fixed.
3. SwiftUI used `chevron.left`/`.right`. Fixed.
4. SwiftUI dismiss, bell and transport buttons relied on implicit symbol names. Fixed.
5. Angular projected icons rendered at 300×150. Fixed.
6. `icons/mapping.json` and /docs/icons made false or stale claims. Fixed.
7. Compose state glyphs are a row's only state cue, and `▸` does not mirror. Open.
8. Flutter Rating stars and TreeView chevron are unnamed tap targets. Open.
9. React JsonViewer: in RTL the copy button overlaps the root chevron (physical `paddingLeft`). Open, layout.

**P3: 5** (all open)
1. Resizable grip shape differs (vertical dots vs ellipsis).
2. SwiftUI previous/next track use `backward.fill`/`forward.fill`.
3. React Banner/Inform dismiss target about 18 px.
4. `PaginationEllipsis` hides its own `sr-only` text.
5. Dialog close and Accordion chevron have no slot (next candidates).

## 19. Changes made

- **React:** `dismissIcon` on Banner and Inform; `rtl:-scale-x-100` on NavigationBar back, Pagination
  previous/next, Breadcrumb separator, collapsed TreeView and JsonViewer chevrons; `usage/icons.tsx` examples.
- **Angular:** slot sizing for `[kxDismissIcon]`/`[kxCopyIcon]`; fixture, browser assertion and usage example.
- **SwiftUI:** `dismissIcon` view builder on Banner and Inform; `chevron.backward`/`.forward`; direction-aware
  disclosure rotation; labels on dismiss, bell and transport buttons; usage example.
- **Compose:** `KinetixIcons`, `KinetixIcon`, `KinetixIconControl` (internal); 23 glyphs replaced across 14
  components; `dismissIcon` on Banner and Inform; named controls; KDoc updated; tests and usage example.
- **Flutter:** internal `IconControl`; named controls in 10 components with tap actions; `dismissIcon` on Banner
  and Inform; tests and usage example.
- **Gates:** `check:icons` gains the direction rule, the Compose glyph ratchet and the emoji ban;
  `check:icon-direction` added to the a11y-browser workflow; `gen:usage` extracts React regions.
- **Docs:** /docs/icons rewritten; `UsageExampleTabs` component; Banner, Inform and RTL pages link to it.

No public API was renamed or removed. All new parameters are optional with the previous behaviour as default.

## 20. Remaining limitations

- Compose and SwiftUI changes were not compiled here: the Android SDK host is blocked and there is no Swift
  toolchain on Linux. CI (`native-compose.yml`: assemble, Robolectric tests, lint; `native-swiftui.yml`: `swift
  build` and `swift test` on macOS) is the first compile. No simulator or device verification was done on any
  native platform; Flutter was verified with `flutter analyze` and widget tests only.
- The 24 Compose glyphs (§8) and the open P2/P3 items above.
- Preview isolation is the Slice 1A fix's, not this branch's.

## 21. Recommended future architecture

Keep the model: platform-native defaults, `dismissIcon`-style slots where a product team has a reason to swap,
and the component owning size, colour, name and direction. Next, in order:

1. Give Compose menu, select, multi-select, tree and JSON rows real state semantics, then replace their glyphs
   with `KinetixIcons` (the ratchet will shrink to content glyphs only).
2. Fix the Flutter Rating and TreeView controls' semantics.
3. Add slots only when asked: Dialog/Sheet close and Accordion chevron are the likely first two, named
   `closeIcon` and `chevronIcon` (or `kxCloseIcon` on Angular) to match `dismissIcon`.
4. Do not add a name-based icon API or a shared icon set. `icons/mapping.json` plus `check:icons` is the
   cross-platform contract, and it is cheaper to keep true than a runtime registry.
