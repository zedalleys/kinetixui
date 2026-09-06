/**
 * Cross-platform usage snippets for a component's "Code" tab.
 *
 * The `react` snippet is the canonical one and lives in the demo registry
 * (`demoRegistry[name].source`) — this map only carries the *other* platforms,
 * so there is one source of truth per language. A component with no entry here
 * shows only the React tab.
 *
 * `swift` / `kotlin` / `dart` call the real native component libraries:
 *   - iOS     · `KinetixUI` (SwiftUI) — `packages/ui-swiftui`, see /docs/swiftui
 *   - Android · `com.kinetixui:ui-compose` (Jetpack Compose) — see /docs/compose
 *   - Flutter · `kinetix_ui` — `packages/ui-flutter`, see /docs/flutter
 * Each mirrors the React API 1:1. Wrap a screen in `KinetixTheme { … }`
 * (SwiftUI / Compose) or `KinetixTheme(child: …)` (Flutter) once; these
 * snippets assume that and show just the component. State the component
 * owns (a `@State` / `remember` / a `TextEditingController`) is elided.
 * `html` stays a hand-rolled token-driven rendition — there is no HTML
 * component package.
 *
 * The three standing non-ports (`Form`, `NavigationMenu`, `Combobox`) are
 * shown as the composition the native libraries expect instead.
 */

export type Platform = "react" | "html" | "swift" | "kotlin" | "dart";

export const PLATFORM_LABEL: Record<Platform, string> = {
  react: "React",
  html: "HTML",
  swift: "iOS", // SwiftUI
  kotlin: "Android", // Jetpack Compose
  dart: "Flutter",
};

export const PLATFORM_LANG: Record<Platform, string> = {
  react: "tsx",
  html: "html",
  swift: "swift",
  kotlin: "kotlin",
  dart: "dart",
};

/** Ordered — React first, then the rest as tabs. */
export const PLATFORM_ORDER: Platform[] = ["react", "html", "swift", "kotlin", "dart"];

type Entry = Partial<Record<Exclude<Platform, "react">, string>>;

export const platformCode: Record<string, Entry> = {
  "button-demo": {
    html: `<button class="kx-btn kx-btn--primary kx-btn--md">Button</button>
<!-- bg: var(--primary) · fg: var(--primary-foreground) · radius: var(--radius) -->`,
    swift: `KinetixButton(action: save) {
  Text("Button")
}`,
    kotlin: `KinetixButton(onClick = ::save) {
  Text("Button")
}`,
    dart: `KinetixButton(
  onPressed: save,
  child: const Text('Button'),
)`,
  },

  "badge-demo": {
    html: `<span class="kx-badge">Default</span>
<span class="kx-badge kx-badge--secondary">Secondary</span>
<!-- bg: var(--primary) / var(--secondary) · pill: var(--radius-full) -->`,
    swift: `HStack(spacing: 8) {
  KinetixBadge("Default")
  KinetixBadge("Secondary", variant: .secondary)
}`,
    kotlin: `Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
  KinetixBadge("Default")
  KinetixBadge("Secondary", variant = KinetixBadgeVariant.Secondary)
}`,
    dart: `Row(
  children: const [
    KinetixBadge('Default'),
    SizedBox(width: 8),
    KinetixBadge('Secondary', variant: KinetixBadgeVariant.secondary),
  ],
)`,
  },

  "alert-demo": {
    html: `<div class="kx-alert" role="alert">
  <strong>Heads up!</strong>
  <p>You can add components to your app using the CLI.</p>
</div>
<!-- border: var(--border) · text: var(--foreground) · radius: var(--radius-lg) -->`,
    swift: `KinetixAlert {
  KinetixAlertTitle("Heads up!")
  KinetixAlertDescription("You can add components to your app using the CLI.")
}`,
    kotlin: `KinetixAlert {
  KinetixAlertTitle("Heads up!")
  KinetixAlertDescription("You can add components to your app using the CLI.")
}`,
    dart: `KinetixAlert(
  children: const [
    KinetixAlertTitle('Heads up!'),
    KinetixAlertDescription('You can add components to your app using the CLI.'),
  ],
)`,
  },

  "card-demo": {
    html: `<div class="kx-card">
  <div class="kx-card__header">
    <h3>Create project</h3>
    <p>Deploy your new project in one click.</p>
  </div>
  <div class="kx-card__content">…</div>
</div>
<!-- bg: var(--card) · fg: var(--card-foreground) · border: var(--border) -->`,
    swift: `KinetixCard {
  KinetixCardHeader {
    KinetixCardTitle("Create project")
    KinetixCardDescription("Deploy your new project in one click.")
  }
  KinetixCardContent {
    Text("…")
  }
}`,
    kotlin: `KinetixCard {
  KinetixCardHeader {
    KinetixCardTitle("Create project")
    KinetixCardDescription("Deploy your new project in one click.")
  }
  KinetixCardContent {
    Text("…")
  }
}`,
    dart: `KinetixCard(
  child: Column(
    mainAxisSize: MainAxisSize.min,
    children: const [
      KinetixCardHeader(children: [
        KinetixCardTitle('Create project'),
        KinetixCardDescription('Deploy your new project in one click.'),
      ]),
      KinetixCardContent(child: Text('…')),
    ],
  ),
)`,
  },

  "input-demo": {
    html: `<input type="email" class="kx-input" placeholder="you@example.com" />
<!-- border: var(--input) · ring: var(--ring) · radius: var(--radius) -->`,
    swift: `KinetixInput(text: $email, placeholder: "you@example.com")`,
    kotlin: `KinetixInput(
  value = email,
  onValueChange = { email = it },
  placeholder = "you@example.com",
  keyboardType = KeyboardType.Email,
)`,
    dart: `KinetixInput(
  controller: emailController,
  placeholder: 'you@example.com',
)`,
  },

  "textarea-demo": {
    html: `<textarea class="kx-textarea" rows="4" placeholder="Type your message…"></textarea>
<!-- border: var(--input) · min-height: 100px · radius: var(--radius) -->`,
    swift: `KinetixTextarea(text: $message, placeholder: "Type your message…")`,
    kotlin: `KinetixTextarea(
  value = message,
  onValueChange = { message = it },
  placeholder = "Type your message…",
)`,
    dart: `KinetixTextarea(
  controller: messageController,
  placeholder: 'Type your message…',
)`,
  },

  "switch-demo": {
    html: `<label class="kx-switch">
  <input type="checkbox" role="switch" />
  <span>Airplane mode</span>
</label>
<!-- track (on): var(--primary) · thumb: var(--background) -->`,
    swift: `HStack {
  KinetixSwitch(isOn: $airplane)
  Text("Airplane mode")
}`,
    kotlin: `Row(verticalAlignment = Alignment.CenterVertically) {
  KinetixSwitch(checked = airplane, onCheckedChange = { airplane = it })
  Text("  Airplane mode")
}`,
    dart: `Row(
  children: [
    KinetixSwitch(
      value: airplane,
      onChanged: (v) => setState(() => airplane = v),
    ),
    const SizedBox(width: 8),
    const Text('Airplane mode'),
  ],
)`,
  },

  "checkbox-demo": {
    html: `<label class="kx-checkbox">
  <input type="checkbox" checked />
  <span>Accept terms and conditions</span>
</label>
<!-- checked bg: var(--primary) · check: var(--primary-foreground) -->`,
    swift: `HStack {
  KinetixCheckbox(isOn: $accepted)
  Text("Accept terms and conditions")
}`,
    kotlin: `Row(verticalAlignment = Alignment.CenterVertically) {
  KinetixCheckbox(checked = accepted, onCheckedChange = { accepted = it })
  Text("  Accept terms and conditions")
}`,
    dart: `Row(
  children: [
    KinetixCheckbox(
      value: accepted,
      onChanged: (v) => setState(() => accepted = v),
    ),
    const SizedBox(width: 8),
    const Text('Accept terms and conditions'),
  ],
)`,
  },

  "separator-demo": {
    html: `<hr class="kx-separator" />
<!-- color: var(--border) · 1px -->`,
    swift: `KinetixSeparator()`,
    kotlin: `KinetixSeparator()`,
    dart: `const KinetixSeparator()`,
  },

  "avatar-demo": {
    html: `<span class="kx-avatar"><span class="kx-avatar__fallback">KX</span></span>
<!-- fallback bg: var(--muted) · text: var(--muted-foreground) · circle -->`,
    swift: `KinetixAvatar {
  KinetixAvatarFallback("KX")
}`,
    kotlin: `KinetixAvatar {
  KinetixAvatarFallback("KX")
}`,
    dart: `const KinetixAvatar(
  child: KinetixAvatarFallback('KX'),
)`,
  },

  "label-demo": {
    html: `<label for="email" class="kx-label">Your email address</label>
<!-- text: var(--foreground) · 14px / medium -->`,
    swift: `KinetixLabel("Your email address")`,
    kotlin: `KinetixLabel("Your email address")`,
    dart: `const KinetixLabel('Your email address')`,
  },

  "aspect-ratio-demo": {
    html: `<div class="kx-aspect" style="aspect-ratio: 16 / 9"></div>
<!-- bg: var(--muted) · radius: var(--radius) -->`,
    swift: `KinetixAspectRatio(16.0 / 9.0) {
  Color(.gray)
}`,
    kotlin: `KinetixAspectRatio(ratio = 16f / 9f) {
  Box(Modifier.fillMaxSize().background(KinetixColorScheme.current.muted))
}`,
    dart: `KinetixAspectRatio(
  ratio: 16 / 9,
  child: ColoredBox(color: KinetixTheme.of(context).muted),
)`,
  },

  "skeleton-demo": {
    html: `<div class="kx-skeleton" style="width: 200px; height: 16px"></div>
<!-- bg: var(--muted) · pulse animation · radius: var(--radius) -->`,
    swift: `KinetixSkeleton()
  .frame(width: 200, height: 16)`,
    kotlin: `KinetixSkeleton(Modifier.size(width = 200.dp, height = 16.dp))`,
    dart: `const KinetixSkeleton(width: 200, height: 16)`,
  },

  "spinner-demo": {
    html: `<span class="kx-spinner" role="status" aria-label="Loading"></span>
<!-- border-color: var(--primary) · spin animation -->`,
    swift: `KinetixSpinner()`,
    kotlin: `KinetixSpinner()`,
    dart: `const KinetixSpinner()`,
  },

  "progress-demo": {
    html: `<div class="kx-progress" role="progressbar" aria-valuenow="66">
  <div class="kx-progress__bar" style="width: 66%"></div>
</div>
<!-- track: var(--muted) · bar: var(--primary) -->`,
    swift: `KinetixProgress(value: 0.66)`,
    kotlin: `KinetixProgress(value = 0.66f)`,
    dart: `const KinetixProgress(value: 0.66)`,
  },

  "circular-progress-demo": {
    html: `<svg class="kx-circular-progress" viewBox="0 0 48 48" role="progressbar" aria-valuenow="66">
  <circle cx="24" cy="24" r="20" /><circle cx="24" cy="24" r="20" pathLength="100" />
</svg>
<!-- track: var(--muted) · arc: var(--primary) -->`,
    swift: `KinetixCircularProgress(value: 0.66, showValue: true)`,
    kotlin: `KinetixCircularProgress(value = 0.66f, showValue = true)`,
    dart: `const KinetixCircularProgress(value: 0.66, showValue: true)`,
  },

  "slider-demo": {
    html: `<input type="range" class="kx-slider" min="0" max="100" step="1" value="50" />
<!-- track: var(--muted) · range + thumb: var(--primary) -->`,
    swift: `KinetixSlider(value: $value, in: 0...100, step: 1)`,
    kotlin: `KinetixSlider(
  value = value,
  onValueChange = { value = it },
  valueRange = 0f..100f,
)`,
    dart: `KinetixSlider(
  value: value,
  min: 0,
  max: 100,
  onChanged: (v) => setState(() => value = v),
)`,
  },

  "tabs-demo": {
    html: `<div class="kx-tabs">
  <div role="tablist">
    <button role="tab" aria-selected="true">Account</button>
    <button role="tab">Password</button>
  </div>
  <div role="tabpanel">Make changes to your account here.</div>
</div>
<!-- active indicator: var(--primary) -->`,
    swift: `KinetixTabsList {
  KinetixTabsTrigger("Account", isSelected: tab == 0) { tab = 0 }
  KinetixTabsTrigger("Password", isSelected: tab == 1) { tab = 1 }
}
KinetixTabsContent {
  if tab == 0 { Text("Make changes to your account here.") }
}`,
    kotlin: `KinetixTabsList {
  KinetixTabsTrigger("Account", selected = tab == 0, onClick = { tab = 0 })
  KinetixTabsTrigger("Password", selected = tab == 1, onClick = { tab = 1 })
}
KinetixTabsContent {
  if (tab == 0) Text("Make changes to your account here.")
}`,
    dart: `Column(
  children: [
    KinetixTabsList(children: [
      KinetixTabsTrigger('Account', selected: tab == 0, onTap: () => setState(() => tab = 0)),
      KinetixTabsTrigger('Password', selected: tab == 1, onTap: () => setState(() => tab = 1)),
    ]),
    if (tab == 0)
      const KinetixTabsContent(child: Text('Make changes to your account here.')),
  ],
)`,
  },

  "tooltip-demo": {
    html: `<button aria-describedby="tt">Hover</button>
<div id="tt" role="tooltip" class="kx-tooltip">Add to library</div>
<!-- bg: var(--primary) · text: var(--primary-foreground) -->`,
    swift: `KinetixTooltip("Add to library") {
  KinetixButton(variant: .outline, action: {}) { Text("Hover") }
}`,
    kotlin: `KinetixTooltip("Add to library") {
  KinetixButton(onClick = {}, variant = KinetixButtonVariant.Outline) { Text("Hover") }
}`,
    dart: `KinetixTooltip(
  message: 'Add to library',
  child: KinetixButton(
    onPressed: () {},
    variant: KinetixButtonVariant.outline,
    child: const Text('Hover'),
  ),
)`,
  },

  "radio-group-demo": {
    html: `<fieldset class="kx-radio-group">
  <label><input type="radio" name="density" value="comfortable" checked /> Comfortable</label>
  <label><input type="radio" name="density" value="compact" /> Compact</label>
</fieldset>
<!-- selected dot: var(--primary) -->`,
    swift: `KinetixRadioGroup {
  ForEach(["default", "comfortable", "compact"], id: \\.self) { value in
    HStack {
      KinetixRadioButton(isSelected: density == value) { density = value }
      Text(value.capitalized)
    }
  }
}`,
    kotlin: `KinetixRadioGroup {
  listOf("default", "comfortable", "compact").forEach { value ->
    Row(verticalAlignment = Alignment.CenterVertically) {
      KinetixRadioButton(selected = density == value, onClick = { density = value })
      Text("  " + value.replaceFirstChar { it.uppercase() })
    }
  }
}`,
    dart: `KinetixRadioGroup(
  children: [
    for (final value in const ['default', 'comfortable', 'compact'])
      Row(children: [
        KinetixRadioButton(
          selected: density == value,
          onTap: () => setState(() => density = value),
        ),
        const SizedBox(width: 8),
        Text(value),
      ]),
  ],
)`,
  },

  "select-demo": {
    html: `<select class="kx-select">
  <option value="apple">Apple</option>
  <option value="banana">Banana</option>
</select>
<!-- border: var(--input) · focus ring: var(--ring) -->`,
    swift: `KinetixSelect(
  selection: $fruit,
  options: [
    .init(value: "apple", label: "Apple"),
    .init(value: "banana", label: "Banana"),
    .init(value: "blueberry", label: "Blueberry"),
  ],
)`,
    kotlin: `KinetixDropdownMenu(
  visible = open,
  onDismissRequest = { open = false },
  anchor = { KinetixSelectTrigger(text = fruit, onClick = { open = true }) },
) {
  listOf("Apple", "Banana", "Blueberry").forEach { option ->
    KinetixSelectItem(option, selected = option == fruit, onClick = { fruit = option; open = false })
  }
}`,
    dart: `KinetixSelect<String>(
  value: fruit,
  options: const [
    KinetixSelectOption('apple', 'Apple'),
    KinetixSelectOption('banana', 'Banana'),
    KinetixSelectOption('blueberry', 'Blueberry'),
  ],
  onChanged: (v) => setState(() => fruit = v),
)`,
  },

  "dialog-demo": {
    html: `<dialog class="kx-dialog">
  <h2>Edit profile</h2>
  <p>Make changes to your profile here.</p>
  <button>Save changes</button>
</dialog>
<!-- surface: var(--popover) · overlay: black/50 -->`,
    swift: `KinetixDialog(isPresented: $open) {
  KinetixDialogHeader {
    KinetixDialogTitle("Edit profile")
    KinetixDialogDescription("Make changes to your profile here.")
  }
  KinetixInput(text: $name, placeholder: "Name")
  KinetixDialogFooter {
    KinetixButton(action: save) { Text("Save changes") }
  }
}`,
    kotlin: `KinetixDialog(visible = open, onDismissRequest = { open = false }) {
  KinetixDialogHeader {
    KinetixDialogTitle("Edit profile")
    KinetixDialogDescription("Make changes to your profile here.")
  }
  KinetixInput(value = name, onValueChange = { name = it }, placeholder = "Name")
  KinetixDialogFooter {
    KinetixButton(onClick = ::save) { Text("Save changes") }
  }
}`,
    dart: `KinetixDialog(
  visible: open,
  onDismiss: () => setState(() => open = false),
  child: Column(mainAxisSize: MainAxisSize.min, children: [
    const KinetixDialogHeader(children: [
      KinetixDialogTitle('Edit profile'),
      KinetixDialogDescription('Make changes to your profile here.'),
    ]),
    KinetixInput(controller: nameController, placeholder: 'Name'),
    KinetixDialogFooter(children: [
      KinetixButton(onPressed: save, child: const Text('Save changes')),
    ]),
  ]),
)`,
  },

  "sheet-demo": {
    html: `<div class="kx-sheet" data-side="right">
  <h2>Edit profile</h2>
  <p>Make changes to your profile here.</p>
</div>
<!-- surface: var(--background) · slides from the edge -->`,
    swift: `KinetixSheet(isPresented: $open) {
  KinetixSheetHeader {
    KinetixSheetTitle("Edit profile")
    KinetixSheetDescription("Make changes to your profile here.")
  }
}`,
    kotlin: `KinetixSheet(visible = open, onDismissRequest = { open = false }) {
  KinetixSheetHeader {
    KinetixSheetTitle("Edit profile")
    KinetixSheetDescription("Make changes to your profile here.")
  }
}`,
    dart: `KinetixSheet(
  visible: open,
  onDismiss: () => setState(() => open = false),
  child: Column(mainAxisSize: MainAxisSize.min, children: const [
    KinetixDialogHeader(children: [
      KinetixDialogTitle('Edit profile'),
      KinetixDialogDescription('Make changes to your profile here.'),
    ]),
  ]),
)`,
  },

  "accordion-demo": {
    html: `<details class="kx-accordion__item">
  <summary>Is it accessible?</summary>
  <div>Yes. It follows the WAI-ARIA design pattern.</div>
</details>
<!-- border: var(--border) · chevron rotates on open -->`,
    swift: `KinetixAccordion {
  KinetixAccordionItem {
    KinetixAccordionTrigger("Is it accessible?", isExpanded: open) { open.toggle() }
    KinetixAccordionContent(isExpanded: open) {
      Text("Yes. It follows the WAI-ARIA design pattern.")
    }
  }
}`,
    kotlin: `KinetixAccordion {
  KinetixAccordionItem {
    KinetixAccordionTrigger("Is it accessible?", expanded = open, onClick = { open = !open })
    KinetixAccordionContent(expanded = open) {
      Text("Yes. It follows the WAI-ARIA design pattern.")
    }
  }
}`,
    dart: `KinetixAccordion(
  children: [
    KinetixAccordionItem(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        KinetixAccordionTrigger(
          'Is it accessible?',
          expanded: open,
          onTap: () => setState(() => open = !open),
        ),
        KinetixAccordionContent(
          expanded: open,
          child: const Text('Yes. It follows the WAI-ARIA design pattern.'),
        ),
      ]),
    ),
  ],
)`,
  },

  "collapsible-demo": {
    html: `<div class="kx-collapsible">
  <button aria-expanded="false">Toggle</button>
  <div hidden>@radix-ui/primitives</div>
</div>`,
    swift: `VStack(alignment: .leading) {
  HStack {
    Text("@kinetixui starred 3 repositories")
    Spacer()
    KinetixButton(variant: .ghost, size: .sm, action: { open.toggle() }) { Text("Toggle") }
  }
  KinetixCollapsible(isExpanded: open) {
    Text("@radix-ui/primitives")
    Text("@stitches/react")
  }
}`,
    kotlin: `Column {
  Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
    Text("@kinetixui starred 3 repositories")
    KinetixButton(onClick = { open = !open }, variant = KinetixButtonVariant.Ghost,
      size = KinetixButtonSize.Sm) { Text("Toggle") }
  }
  KinetixCollapsible(expanded = open) {
    Column { Text("@radix-ui/primitives"); Text("@stitches/react") }
  }
}`,
    dart: `Column(
  children: [
    Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text('@kinetixui starred 3 repositories'),
        KinetixButton(
          onPressed: () => setState(() => open = !open),
          variant: KinetixButtonVariant.ghost,
          size: KinetixButtonSize.sm,
          child: const Text('Toggle'),
        ),
      ],
    ),
    KinetixCollapsible(
      expanded: open,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [Text('@radix-ui/primitives'), Text('@stitches/react')],
      ),
    ),
  ],
)`,
  },

  "breadcrumb-demo": {
    html: `<nav class="kx-breadcrumb" aria-label="Breadcrumb">
  <a href="/">Home</a> <span>/</span>
  <a href="/docs">Docs</a> <span>/</span>
  <span aria-current="page">Breadcrumb</span>
</nav>
<!-- links: var(--muted-foreground) · current: var(--foreground) -->`,
    swift: `KinetixBreadcrumb {
  KinetixBreadcrumbLink("Home") { navigate("/") }
  KinetixBreadcrumbSeparator()
  KinetixBreadcrumbLink("Docs") { navigate("/docs") }
  KinetixBreadcrumbSeparator()
  KinetixBreadcrumbPage("Breadcrumb")
}`,
    kotlin: `KinetixBreadcrumb {
  KinetixBreadcrumbLink("Home", onClick = { navigate("/") })
  KinetixBreadcrumbSeparator()
  KinetixBreadcrumbLink("Docs", onClick = { navigate("/docs") })
  KinetixBreadcrumbSeparator()
  KinetixBreadcrumbPage("Breadcrumb")
}`,
    dart: `KinetixBreadcrumb(
  children: [
    KinetixBreadcrumbLink('Home', onTap: () => navigate('/')),
    const KinetixBreadcrumbSeparator(),
    KinetixBreadcrumbLink('Docs', onTap: () => navigate('/docs')),
    const KinetixBreadcrumbSeparator(),
    const KinetixBreadcrumbPage('Breadcrumb'),
  ],
)`,
  },

  "tag-demo": {
    html: `<span class="kx-tag">design <button aria-label="Remove">×</button></span>
<!-- bg: var(--secondary) · text: var(--secondary-foreground) · pill -->`,
    swift: `KinetixTag("design", variant: .secondary, onRemove: { remove() })`,
    kotlin: `KinetixTag("design", variant = KinetixTagVariant.Secondary, onRemove = ::remove)`,
    dart: `KinetixTag(
  'design',
  variant: KinetixTagVariant.secondary,
  onRemove: remove,
)`,
  },

  "toggle-demo": {
    html: `<button class="kx-toggle" aria-pressed="false" aria-label="Toggle italic">
  <svg><!-- italic icon --></svg>
</button>
<!-- pressed bg: var(--accent) · pressed text: var(--accent-foreground) -->`,
    swift: `KinetixToggle(isOn: $italic) {
  Image(systemName: "italic")
}`,
    kotlin: `KinetixToggle(pressed = italic, onPressedChange = { italic = it }) {
  Icon(Icons.Default.FormatItalic, "Toggle italic")
}`,
    dart: `KinetixToggle(
  pressed: italic,
  onChanged: (v) => setState(() => italic = v),
  child: const Icon(Icons.format_italic),
)`,
  },

  "alert-dialog-demo": {
    html: `<div role="alertdialog" class="kx-alert-dialog" aria-labelledby="t" aria-describedby="d">
  <h2 id="t">Are you absolutely sure?</h2>
  <p id="d">This action cannot be undone.</p>
  <button>Cancel</button>
  <button class="kx-btn--destructive">Continue</button>
</div>`,
    swift: `KinetixAlertDialog(isPresented: $open) {
  KinetixDialogTitle("Are you absolutely sure?")
  KinetixDialogDescription("This action cannot be undone.")
  KinetixDialogFooter {
    KinetixAlertDialogCancel { open = false }
    KinetixAlertDialogAction("Continue", action: deleteAccount)
  }
}`,
    kotlin: `KinetixAlertDialog(visible = open, onDismissRequest = { open = false }) {
  KinetixDialogTitle("Are you absolutely sure?")
  KinetixDialogDescription("This action cannot be undone.")
  KinetixDialogFooter {
    KinetixAlertDialogCancel("Cancel", onClick = { open = false })
    KinetixAlertDialogAction("Continue", onClick = ::deleteAccount)
  }
}`,
    dart: `KinetixAlertDialog(
  visible: open,
  child: Column(mainAxisSize: MainAxisSize.min, children: [
    const KinetixDialogTitle('Are you absolutely sure?'),
    const KinetixDialogDescription('This action cannot be undone.'),
    KinetixDialogFooter(children: [
      KinetixAlertDialogCancel(onPressed: () => setState(() => open = false)),
      KinetixAlertDialogAction('Continue', onPressed: deleteAccount),
    ]),
  ]),
)`,
  },

  "modal-demo": {
    html: `<div role="dialog" class="kx-modal" aria-modal="true">
  <header><h2>Confirmation dialog</h2></header>
  <div class="kx-modal__body">Dialog description text.</div>
  <footer><button>Cancel</button><button class="kx-btn--primary">Confirm</button></footer>
</div>
<!-- surface: var(--popover) · header/footer divided by var(--border) -->`,
    swift: `KinetixModal(isPresented: $open, title: "Confirmation dialog") {
  Text("Dialog description text.")
}`,
    kotlin: `KinetixModal(
  visible = open,
  onDismissRequest = { open = false },
  title = "Confirmation dialog",
  type = KinetixModalType.Confirmation,
  description = "Dialog description text.",
  onAction = ::onConfirm,
)`,
    dart: `KinetixModal(
  visible: open,
  onDismiss: () => setState(() => open = false),
  title: 'Confirmation dialog',
  child: const Text('Dialog description text.'),
)`,
  },

  "drawer-demo": {
    html: `<div class="kx-drawer" data-side="bottom">
  <div class="kx-drawer__handle"></div>
  <h2>Move goal</h2>
  <p>Set your daily activity goal.</p>
</div>
<!-- surface: var(--background) · drags from the bottom edge -->`,
    swift: `KinetixDrawer(isPresented: $open) {
  KinetixDrawerHeader {
    KinetixDrawerTitle("Move goal")
    KinetixDrawerDescription("Set your daily activity goal.")
  }
}`,
    kotlin: `KinetixDrawer(visible = open, onDismissRequest = { open = false }) {
  KinetixDrawerHeader {
    KinetixDrawerTitle("Move goal")
    KinetixDrawerDescription("Set your daily activity goal.")
  }
}`,
    dart: `KinetixDrawer(
  visible: open,
  onDismiss: () => setState(() => open = false),
  child: Column(mainAxisSize: MainAxisSize.min, children: const [
    KinetixDialogHeader(children: [
      KinetixDialogTitle('Move goal'),
      KinetixDialogDescription('Set your daily activity goal.'),
    ]),
  ]),
)`,
  },

  "popover-demo": {
    html: `<div class="kx-popover" role="dialog">
  <p class="font-medium">Dimensions</p>
  <p>Set the dimensions for the layer.</p>
</div>
<!-- surface: var(--popover) · border: var(--border) -->`,
    swift: `KinetixPopover(isPresented: $open) {
  KinetixButton(variant: .outline, action: { open = true }) { Text("Open popover") }
} content: {
  VStack(alignment: .leading, spacing: 4) {
    Text("Dimensions").font(.kinetixLabelLg)
    Text("Set the dimensions for the layer.").foregroundStyle(.secondary)
  }
}`,
    kotlin: `KinetixPopover(
  visible = open,
  onDismissRequest = { open = false },
  anchor = {
    KinetixButton(onClick = { open = true }, variant = KinetixButtonVariant.Outline) {
      Text("Open popover")
    }
  },
) {
  Column {
    Text("Dimensions", fontWeight = FontWeight.Medium)
    Text("Set the dimensions for the layer.", color = KinetixColorScheme.current.mutedForeground)
  }
}`,
    dart: `KinetixPopover(
  visible: open,
  onDismiss: () => setState(() => open = false),
  anchor: KinetixButton(
    onPressed: () => setState(() => open = true),
    variant: KinetixButtonVariant.outline,
    child: const Text('Open popover'),
  ),
  child: Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    mainAxisSize: MainAxisSize.min,
    children: const [
      Text('Dimensions', style: TextStyle(fontWeight: FontWeight.w500)),
      Text('Set the dimensions for the layer.'),
    ],
  ),
)`,
  },

  "hover-card-demo": {
    html: `<a href="#" class="kx-hover-card__trigger">@kinetixui</a>
<div class="kx-hover-card" role="dialog">One token architecture, in motion across every platform.</div>
<!-- opens on hover (pointer); on touch it is a tap/long-press -->`,
    swift: `KinetixHoverCard(isPresented: $open) {
  Text("@kinetixui").foregroundStyle(Color.kinetixPrimary)
} content: {
  Text("One token architecture, in motion across every platform.")
}`,
    kotlin: `KinetixHoverCard(
  visible = open,
  onDismissRequest = { open = false },
  anchor = { Text("@kinetixui", color = KinetixColorScheme.current.primary) },
) {
  Text("One token architecture, in motion across every platform.")
}`,
    dart: `KinetixHoverCard(
  visible: open,
  onDismiss: () => setState(() => open = false),
  anchor: GestureDetector(
    onTap: () => setState(() => open = true),
    child: Text('@kinetixui', style: TextStyle(color: KinetixTheme.of(context).primary)),
  ),
  child: const Text('One token architecture, in motion across every platform.'),
)`,
  },

  "dropdown-menu-demo": {
    html: `<div class="kx-dropdown-menu" role="menu">
  <span class="kx-dropdown-menu__label">My Account</span>
  <button role="menuitem">Profile</button>
  <button role="menuitem">Billing</button>
  <button role="menuitem">Team</button>
</div>`,
    swift: `KinetixDropdownMenu {
  KinetixMenuLabel("My Account")
  KinetixMenuItem("Profile") {}
  KinetixMenuItem("Billing") {}
  KinetixMenuItem("Team") {}
} label: {
  KinetixButton(variant: .outline, action: {}) { Text("Open") }
}`,
    kotlin: `KinetixDropdownMenu(
  visible = open,
  onDismissRequest = { open = false },
  anchor = {
    KinetixButton(onClick = { open = true }, variant = KinetixButtonVariant.Outline) { Text("Open") }
  },
) {
  KinetixDropdownMenuLabel("My Account")
  KinetixDropdownMenuItem("Profile", onClick = { open = false })
  KinetixDropdownMenuItem("Billing", onClick = { open = false })
  KinetixDropdownMenuItem("Team", onClick = { open = false })
}`,
    dart: `KinetixDropdownMenu(
  menuChildren: [
    const KinetixMenuLabel('My Account'),
    KinetixMenuItem('Profile', onPressed: () {}),
    KinetixMenuItem('Billing', onPressed: () {}),
    KinetixMenuItem('Team', onPressed: () {}),
  ],
  child: KinetixButton(
    onPressed: () {},
    variant: KinetixButtonVariant.outline,
    child: const Text('Open'),
  ),
)`,
  },

  "context-menu-demo": {
    html: `<div class="kx-context-menu__trigger">Right-click here</div>
<div class="kx-context-menu" role="menu">
  <button role="menuitem">Back</button>
  <button role="menuitem">Forward</button>
  <button role="menuitem">Reload</button>
</div>`,
    swift: `KinetixContextMenu {
  Text("Right-click here")
} menu: {
  KinetixMenuItem("Back") {}
  KinetixMenuItem("Forward") {}
  KinetixMenuSeparator()
  KinetixMenuItem("Reload") {}
}`,
    kotlin: `KinetixContextMenu(
  menuContent = {
    KinetixDropdownMenuItem("Back", onClick = {})
    KinetixDropdownMenuItem("Forward", onClick = {})
    KinetixDropdownMenuSeparator()
    KinetixDropdownMenuItem("Reload", onClick = {})
  },
) {
  Text("Right-click here")
}`,
    dart: `KinetixContextMenu(
  menuChildren: [
    KinetixMenuItem('Back', onPressed: () {}),
    KinetixMenuItem('Forward', onPressed: () {}),
    const KinetixMenuSeparator(),
    KinetixMenuItem('Reload', onPressed: () {}),
  ],
  child: const Text('Right-click here'),
)`,
  },

  "menubar-demo": {
    html: `<div class="kx-menubar" role="menubar">
  <button role="menuitem" aria-haspopup="true">File</button>
  <button role="menuitem" aria-haspopup="true">Edit</button>
</div>`,
    swift: `KinetixMenubar {
  KinetixMenubarMenu("File") {
    KinetixMenuItem("New Tab") {}
    KinetixMenuItem("New Window") {}
  }
  KinetixMenubarMenu("Edit") {
    KinetixMenuItem("Undo") {}
    KinetixMenuItem("Redo") {}
  }
}`,
    kotlin: `KinetixMenubar {
  KinetixMenubarMenu(
    "File", visible = fileOpen,
    onDismissRequest = { fileOpen = false }, onTriggerClick = { fileOpen = true },
  ) {
    KinetixDropdownMenuItem("New Tab", onClick = {})
    KinetixDropdownMenuItem("New Window", onClick = {})
  }
  KinetixMenubarMenu(
    "Edit", visible = editOpen,
    onDismissRequest = { editOpen = false }, onTriggerClick = { editOpen = true },
  ) {
    KinetixDropdownMenuItem("Undo", onClick = {})
    KinetixDropdownMenuItem("Redo", onClick = {})
  }
}`,
    dart: `KinetixMenubar(
  children: [
    KinetixMenubarMenu('File', menuChildren: [
      KinetixMenuItem('New Tab', onPressed: () {}),
      KinetixMenuItem('New Window', onPressed: () {}),
    ]),
    KinetixMenubarMenu('Edit', menuChildren: [
      KinetixMenuItem('Undo', onPressed: () {}),
      KinetixMenuItem('Redo', onPressed: () {}),
    ]),
  ],
)`,
  },

  "list-demo": {
    html: `<ul class="kx-list">
  <li><span class="kx-list__title">Profile</span><span>Name, photo, and personal details</span></li>
  <li><span class="kx-list__title">Notifications</span></li>
</ul>
<!-- rows divided by var(--border) · icons var(--muted-foreground) -->`,
    swift: `KinetixList {
  KinetixListItem(title: "Profile", description: "Name, photo, and personal details") {
    Image(systemName: "person")
  } trailing: {
    Image(systemName: "chevron.right")
  }
  KinetixListItem(title: "Notifications") {
    Image(systemName: "bell")
  } trailing: { EmptyView() }
}`,
    kotlin: `KinetixList {
  KinetixListItem(
    title = "Profile",
    description = "Name, photo, and personal details",
    leading = { Icon(Icons.Default.Person, null) },
  )
  KinetixListItem(
    title = "Notifications",
    leading = { Icon(Icons.Default.Notifications, null) },
  )
}`,
    dart: `KinetixList(
  children: const [
    KinetixListItem(
      title: 'Profile',
      description: 'Name, photo, and personal details',
      leading: Icon(Icons.person_outline),
    ),
    KinetixListItem(
      title: 'Notifications',
      leading: Icon(Icons.notifications_outlined),
    ),
  ],
)`,
  },

  "scroll-area-demo": {
    html: `<div class="kx-scroll-area" style="height: 10rem; width: 14rem">
  <!-- content taller than the box; styled scrollbar -->
</div>`,
    swift: `KinetixScrollArea {
  VStack(alignment: .leading) {
    ForEach(1...20, id: \\.self) { Text("Tag \\($0)") }
  }
}
.frame(width: 224, height: 160)`,
    kotlin: `KinetixScrollArea(Modifier.size(width = 224.dp, height = 160.dp)) {
  Column {
    (1..20).forEach { Text("Tag $it") }
  }
}`,
    dart: `SizedBox(
  width: 224,
  height: 160,
  child: KinetixScrollArea(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [for (var i = 1; i <= 20; i++) Text('Tag $i')],
    ),
  ),
)`,
  },

  "tab-bar-demo": {
    html: `<nav class="kx-tab-bar" role="tablist">
  <button role="tab" aria-selected="true">Home</button>
  <button role="tab">Search</button>
  <button role="tab">Mail<span class="kx-badge">3</span></button>
</nav>
<!-- active tint: var(--primary) -->`,
    swift: `KinetixTabBar {
  KinetixTabBarItem(label: "Home", isActive: tab == 0) { tab = 0 } icon: {
    Image(systemName: "house")
  }
  KinetixTabBarItem(label: "Search", isActive: tab == 1) { tab = 1 } icon: {
    Image(systemName: "magnifyingglass")
  }
  KinetixTabBarItem(label: "Mail", isActive: tab == 2, badge: "3") { tab = 2 } icon: {
    Image(systemName: "envelope")
  }
}`,
    kotlin: `KinetixTabBar {
  KinetixTabBarItem("Home", isActive = tab == 0, onClick = { tab = 0 }) {
    Icon(Icons.Default.Home, null)
  }
  KinetixTabBarItem("Search", isActive = tab == 1, onClick = { tab = 1 }) {
    Icon(Icons.Default.Search, null)
  }
  KinetixTabBarItem("Mail", isActive = tab == 2, badge = "3", onClick = { tab = 2 }) {
    Icon(Icons.Default.Email, null)
  }
}`,
    dart: `KinetixTabBar(
  children: [
    KinetixTabBarItem(
      label: 'Home', icon: const Icon(Icons.home_outlined),
      isActive: tab == 0, onTap: () => setState(() => tab = 0),
    ),
    KinetixTabBarItem(
      label: 'Search', icon: const Icon(Icons.search),
      isActive: tab == 1, onTap: () => setState(() => tab = 1),
    ),
    KinetixTabBarItem(
      label: 'Mail', icon: const Icon(Icons.mail_outline), badge: '3',
      isActive: tab == 2, onTap: () => setState(() => tab = 2),
    ),
  ],
)`,
  },

  "navigation-bar-demo": {
    html: `<header class="kx-navigation-bar">
  <button aria-label="Back">‹</button>
  <h1>Appointments</h1><span>3 upcoming</span>
  <button aria-label="Search">🔍</button>
</header>
<!-- surface: var(--background) · title: var(--foreground) -->`,
    swift: `KinetixNavigationBar(title: "Appointments", infoText: "3 upcoming") {
  KinetixNavigationBackButton(action: back)
} actions: {
  Button(action: search) { Image(systemName: "magnifyingglass") }
}`,
    kotlin: `KinetixNavigationBar(
  title = "Appointments",
  infoText = "3 upcoming",
  onBack = ::back,
  actions = {
    IconButton(onClick = ::search) { Icon(Icons.Default.Search, "Search") }
  },
)`,
    dart: `KinetixNavigationBar(
  title: 'Appointments',
  infoText: '3 upcoming',
  leading: KinetixNavigationBackButton(onTap: back),
  actions: IconButton(onPressed: search, icon: const Icon(Icons.search)),
)`,
  },

  "navigation-menu-demo": {
    html: `<nav class="kx-navigation-menu">
  <button aria-haspopup="true">Getting started</button>
  <div class="kx-navigation-menu__content" role="menu">
    <a href="#">Introduction</a><a href="#">Installation</a><a href="#">Theming</a>
  </div>
</nav>`,
    swift: `// NavigationMenu is a pointer-hover mega-menu — no touch idiom, so it
// isn't ported. Reach for KinetixDropdownMenu:
KinetixDropdownMenu {
  KinetixMenuItem("Introduction") {}
  KinetixMenuItem("Installation") {}
  KinetixMenuItem("Theming") {}
} label: {
  KinetixButton(variant: .ghost, action: {}) { Text("Getting started") }
}`,
    kotlin: `// NavigationMenu isn't ported (hover mega-menu, no touch idiom).
// Use KinetixDropdownMenu:
KinetixDropdownMenu(
  visible = open,
  onDismissRequest = { open = false },
  anchor = {
    KinetixButton(onClick = { open = true }, variant = KinetixButtonVariant.Ghost) {
      Text("Getting started")
    }
  },
) {
  listOf("Introduction", "Installation", "Theming").forEach {
    KinetixDropdownMenuItem(it, onClick = { open = false })
  }
}`,
    dart: `// NavigationMenu isn't ported (hover mega-menu, no touch idiom).
// Use KinetixDropdownMenu:
KinetixDropdownMenu(
  menuChildren: [
    for (final label in const ['Introduction', 'Installation', 'Theming'])
      KinetixMenuItem(label, onPressed: () {}),
  ],
  child: KinetixButton(
    onPressed: () {},
    variant: KinetixButtonVariant.ghost,
    child: const Text('Getting started'),
  ),
)`,
  },

  "sidebar-demo": {
    html: `<div class="kx-sidebar-provider">
  <aside class="kx-sidebar"><!-- SidebarHeader / SidebarContent / SidebarMenu --></aside>
  <main class="kx-sidebar-inset"><button class="kx-sidebar-trigger">☰</button></main>
</div>
<!-- themed from the --sidebar-* tokens -->`,
    swift: `KinetixSidebar(isOpen: $open) {
  KinetixSidebarItem("Home", systemImage: "house", isActive: screen == .home) { screen = .home }
  KinetixSidebarItem("Projects", systemImage: "folder", isActive: screen == .projects) {
    screen = .projects
  }
}`,
    kotlin: `val drawerState = rememberDrawerState(DrawerValue.Closed)
KinetixSidebar(
  drawerState = drawerState,
  drawerContent = {
    KinetixSidebarGroup(title = "Platform") {
      KinetixSidebarMenuItem("Home", selected = screen == "home", onClick = { screen = "home" })
      KinetixSidebarMenuItem("Projects", selected = screen == "projects",
        onClick = { screen = "projects" })
    }
  },
) {
  // main content
}`,
    dart: `// Flutter has no KinetixSidebar (desktop/web split-nav pattern).
// Compose it from NavigationRail themed off the --sidebar-* tokens:
Row(
  children: [
    NavigationRail(
      backgroundColor: KinetixTheme.of(context).background,
      selectedIndex: index,
      onDestinationSelected: (i) => setState(() => index = i),
      destinations: const [
        NavigationRailDestination(icon: Icon(Icons.home_outlined), label: Text('Home')),
        NavigationRailDestination(icon: Icon(Icons.folder_outlined), label: Text('Projects')),
      ],
    ),
    const KinetixSeparator(axis: KinetixSeparatorAxis.vertical),
    const Expanded(child: SizedBox()),
  ],
)`,
  },

  "toggle-group-demo": {
    html: `<div class="kx-toggle-group" role="group">
  <button aria-pressed="false" aria-label="Bold">B</button>
  <button aria-pressed="false" aria-label="Italic">I</button>
  <button aria-pressed="false" aria-label="Underline">U</button>
</div>
<!-- pressed bg: var(--accent) -->`,
    swift: `KinetixToggleGroup {
  KinetixToggleGroupItem(isOn: $bold) { Image(systemName: "bold") }
  KinetixToggleGroupItem(isOn: $italic) { Image(systemName: "italic") }
  KinetixToggleGroupItem(isOn: $underline) { Image(systemName: "underline") }
}`,
    kotlin: `KinetixToggleGroup {
  KinetixToggleGroupItem(pressed = bold, onPressedChange = { bold = it }) {
    Icon(Icons.Default.FormatBold, "Bold")
  }
  KinetixToggleGroupItem(pressed = italic, onPressedChange = { italic = it }) {
    Icon(Icons.Default.FormatItalic, "Italic")
  }
  KinetixToggleGroupItem(pressed = underline, onPressedChange = { underline = it }) {
    Icon(Icons.Default.FormatUnderlined, "Underline")
  }
}`,
    dart: `KinetixToggleGroup(
  children: [
    KinetixToggleGroupItem(
      pressed: bold, onChanged: (v) => setState(() => bold = v),
      child: const Icon(Icons.format_bold),
    ),
    KinetixToggleGroupItem(
      pressed: italic, onChanged: (v) => setState(() => italic = v),
      child: const Icon(Icons.format_italic),
    ),
    KinetixToggleGroupItem(
      pressed: underline, onChanged: (v) => setState(() => underline = v),
      child: const Icon(Icons.format_underlined),
    ),
  ],
)`,
  },

  "table-demo": {
    html: `<table class="kx-table">
  <thead><tr><th>Invoice</th><th>Status</th><th>Amount</th></tr></thead>
  <tbody><tr><td>INV001</td><td>Paid</td><td>$250.00</td></tr></tbody>
</table>
<!-- header text: var(--muted-foreground) · rows divided by var(--border) -->`,
    swift: `KinetixTable {
  KinetixTableHeader {
    KinetixTableRow(isHeader: true) {
      KinetixTableHead("Invoice"); KinetixTableHead("Status"); KinetixTableHead("Amount")
    }
  }
  KinetixTableBody {
    ForEach(rows) { r in
      KinetixTableRow {
        KinetixTableCell { Text(r.invoice) }
        KinetixTableCell { Text(r.status) }
        KinetixTableCell { Text(r.amount) }
      }
    }
  }
}`,
    kotlin: `KinetixTable {
  KinetixTableHeader {
    KinetixTableRow {
      KinetixTableHead("Invoice"); KinetixTableHead("Status"); KinetixTableHead("Amount")
    }
  }
  KinetixTableBody {
    rows.forEach { r ->
      KinetixTableRow {
        KinetixTableCell(r.invoice); KinetixTableCell(r.status); KinetixTableCell(r.amount)
      }
    }
  }
}`,
    dart: `KinetixTable(
  children: [
    const KinetixTableRow(isHeader: true, cells: [
      KinetixTableHead('Invoice'), KinetixTableHead('Status'), KinetixTableHead('Amount'),
    ]),
    for (final r in rows)
      KinetixTableRow(cells: [
        KinetixTableCell(child: Text(r.invoice)),
        KinetixTableCell(child: Text(r.status)),
        KinetixTableCell(child: Text(r.amount)),
      ]),
  ],
)`,
  },

  "data-table-demo": {
    html: `<div class="kx-data-table">
  <table><!-- sortable headers, pagination controls --></table>
</div>`,
    swift: `KinetixDataTable(
  columns: [
    .init(header: "Invoice", sortKey: { $0.invoice }) { $0.invoice },
    .init(header: "Status") { $0.status },
    .init(header: "Amount") { $0.amount },
  ],
  rows: invoices,
  pageSize: 5,
)`,
    kotlin: `KinetixDataTable(
  columns = listOf(
    KinetixDataColumn("Invoice", sortKey = { it.invoice }) { it.invoice },
    KinetixDataColumn("Status") { it.status },
    KinetixDataColumn("Amount") { it.amount },
  ),
  rows = invoices,
  pageSize = 5,
)`,
    dart: `KinetixDataTable<Invoice>(
  columns: [
    KinetixDataColumn(header: 'Invoice', sortKey: (r) => r.invoice, cell: (r) => Text(r.invoice)),
    KinetixDataColumn(header: 'Status', cell: (r) => Text(r.status)),
    KinetixDataColumn(header: 'Amount', cell: (r) => Text(r.amount)),
  ],
  rows: invoices,
  pageSize: 5,
)`,
  },

  "stepper-demo": {
    html: `<ol class="kx-stepper">
  <li aria-current="step">Account</li>
  <li>Profile</li>
  <li>Review</li>
</ol>
<!-- current dot: var(--primary) · done: var(--primary) · todo: var(--muted) -->`,
    swift: `KinetixStepper(
  steps: [
    .init(label: "Account"),
    .init(label: "Profile"),
    .init(label: "Review"),
  ],
  current: current,
)`,
    kotlin: `KinetixStepper(
  steps = listOf(
    KinetixStep("Account"),
    KinetixStep("Profile"),
    KinetixStep("Review"),
  ),
  current = current,
)`,
    dart: `KinetixStepper(
  steps: const [
    KinetixStep('Account'),
    KinetixStep('Profile'),
    KinetixStep('Review'),
  ],
  current: current,
)`,
  },

  "pagination-demo": {
    html: `<nav class="kx-pagination" aria-label="Pagination">
  <a href="#">Previous</a>
  <a href="#">1</a><a href="#" aria-current="page">2</a><a href="#">3</a>
  <span>…</span>
  <a href="#">Next</a>
</nav>
<!-- current bg: var(--accent) -->`,
    swift: `KinetixPagination {
  KinetixPaginationPrevious { page -= 1 }
  ForEach(1...totalPages, id: \\.self) { p in
    KinetixPaginationItem("\\(p)", isActive: p == page) { page = p }
  }
  KinetixPaginationEllipsis()
  KinetixPaginationNext { page += 1 }
}`,
    kotlin: `KinetixPagination {
  KinetixPaginationContent {
    KinetixPaginationPrevious(onClick = { page-- })
    (1..totalPages).forEach { p ->
      KinetixPaginationLink("$p", onClick = { page = p }, isActive = p == page)
    }
    KinetixPaginationNext(onClick = { page++ })
  }
}`,
    dart: `KinetixPagination(
  children: [
    KinetixPaginationPrevious(onTap: () => setPage(page - 1)),
    for (var p = 1; p <= totalPages; p++)
      KinetixPaginationItem('$p', isActive: p == page, onTap: () => setPage(p)),
    const KinetixPaginationEllipsis(),
    KinetixPaginationNext(onTap: () => setPage(page + 1)),
  ],
)`,
  },

  "table-of-contents-demo": {
    html: `<nav class="kx-toc" aria-label="On this page">
  <a href="#overview">Overview</a>
  <a href="#props" aria-current="true" style="padding-left: 1rem">Props</a>
</nav>
<!-- active link: var(--foreground) · rest: var(--muted-foreground) -->`,
    swift: `KinetixTableOfContents(
  items: [
    .init(id: "overview", label: "Overview"),
    .init(id: "props", label: "Props", level: 2),
  ],
  active: activeID,
  onSelect: { scrollTo($0) },
)`,
    kotlin: `KinetixTableOfContents(
  items = listOf(
    KinetixTocItem("overview", "Overview"),
    KinetixTocItem("props", "Props", level = 2),
  ),
  activeId = activeId,
  onItemClick = ::scrollTo,
)`,
    dart: `KinetixTableOfContents(
  items: const [
    KinetixTocItem(id: 'overview', label: 'Overview'),
    KinetixTocItem(id: 'props', label: 'Props', level: 2),
  ],
  active: activeId,
  onSelect: scrollTo,
)`,
  },

  "footer-demo": {
    html: `<footer class="kx-footer">
  <div class="kx-footer__col"><h3>Product</h3><a href="#">Overview</a><a href="#">Pricing</a></div>
  <div class="kx-footer__bottom"><span>© 2026 Acme Inc.</span></div>
</footer>
<!-- surface: var(--muted) · links: var(--muted-foreground) -->`,
    swift: `KinetixFooter {
  KinetixFooterColumn("Product") {
    KinetixFooterLink("Overview") {}
    KinetixFooterLink("Pricing") {}
  }
  KinetixFooterBottom {
    Text("© 2026 Acme Inc.")
  }
}`,
    kotlin: `KinetixFooter {
  KinetixFooterColumn("Product") {
    KinetixFooterLink("Overview", onClick = {})
    KinetixFooterLink("Pricing", onClick = {})
  }
  KinetixFooterBottom {
    Text("© 2026 Acme Inc.")
  }
}`,
    dart: `KinetixFooter(
  children: [
    KinetixFooterColumn('Product', children: [
      KinetixFooterLink('Overview', onTap: () {}),
      KinetixFooterLink('Pricing', onTap: () {}),
    ]),
    const KinetixFooterBottom(children: [Text('© 2026 Acme Inc.')]),
  ],
)`,
  },

  "inform-demo": {
    html: `<div class="kx-inform" data-variant="success" role="status">
  Your changes have been saved.
  <button aria-label="Dismiss">×</button>
</div>
<!-- success: var(--success) · warning: var(--warning) · error: var(--destructive) -->`,
    swift: `KinetixInform(
  "Your changes have been saved.",
  variant: .success,
  onDismiss: { dismiss() },
)`,
    kotlin: `KinetixInform(
  text = "Your changes have been saved.",
  variant = KinetixInformVariant.Success,
  onDismiss = ::dismiss,
)`,
    dart: `KinetixInform(
  'Your changes have been saved.',
  variant: KinetixInformVariant.success,
  onDismiss: dismiss,
)`,
  },

  "image-demo": {
    html: `<img class="kx-image" src="/photo.jpg" alt="" style="aspect-ratio: 1 / 1" />
<!-- radius: var(--radius) · object-fit: cover · skeleton while loading -->`,
    swift: `KinetixImage(url: URL(string: src), ratio: .square)`,
    kotlin: `KinetixImage(ratio = KinetixImageRatio.Square) {
  AsyncImage(model = src, contentDescription = null, contentScale = ContentScale.Crop)
}`,
    dart: `KinetixImage(url: src, ratio: KinetixImageRatio.square)`,
  },

  "quote-demo": {
    html: `<figure class="kx-quote">
  <blockquote>This is exactly the token workflow our team needed.</blockquote>
  <figcaption><img src="/amira.jpg" alt="" /> Amira K. · Product Designer</figcaption>
</figure>
<!-- accent bar: var(--border) · caption: var(--muted-foreground) -->`,
    swift: `KinetixQuote(
  "This is exactly the token workflow our team needed.",
  author: "Amira K.",
  authorTitle: "Product Designer",
) {
  KinetixAvatar { KinetixAvatarFallback("AK") }
}`,
    kotlin: `KinetixQuote(
  text = "This is exactly the token workflow our team needed.",
  author = "Amira K.",
  authorTitle = "Product Designer",
  avatar = { KinetixAvatar { KinetixAvatarFallback("AK") } },
)`,
    dart: `const KinetixQuote(
  'This is exactly the token workflow our team needed.',
  author: 'Amira K.',
  authorTitle: 'Product Designer',
  avatar: KinetixAvatar(child: KinetixAvatarFallback('AK')),
)`,
  },

  "metric-demo": {
    html: `<div class="kx-metric">
  <span class="kx-metric__label">Active users</span>
  <span class="kx-metric__value">2,420</span>
  <span class="kx-metric__trend" data-trend="up">▲ 12%</span>
</div>
<!-- up: var(--success) · down: var(--destructive) -->`,
    swift: `KinetixMetric(label: "Active users", value: "2,420", trend: .up, change: "12%") {
  Image(systemName: "person.2")
}`,
    kotlin: `KinetixMetric(
  label = "Active users",
  value = "2,420",
  trend = KinetixMetricTrend.Up,
  change = "12%",
  icon = { Icon(Icons.Default.Group, null) },
)`,
    dart: `const KinetixMetric(
  label: 'Active users',
  value: '2,420',
  trend: KinetixMetricTrend.up,
  change: '12%',
  icon: Icon(Icons.group_outlined, size: 16),
)`,
  },

  "code-block-demo": {
    html: `<figure class="kx-code-block">
  <figcaption>button.tsx</figcaption>
  <pre><code>export function Button() { … }</code></pre>
  <button class="kx-code-block__copy" aria-label="Copy"></button>
</figure>
<!-- surface: var(--muted) · filename bar divided by var(--border) -->`,
    swift: `KinetixCodeBlock(
  code: "export function Button() { … }",
  filename: "button.tsx",
)`,
    kotlin: `KinetixCodeBlock(
  code = "export function Button() { … }",
  filename = "button.tsx",
)`,
    dart: `KinetixCodeBlock(
  code: 'export function Button() { … }',
  filename: 'button.tsx',
)`,
  },

  "password-input-demo": {
    html: `<div class="kx-password-input">
  <input type="password" placeholder="••••••••" />
  <button type="button" aria-label="Show password"></button>
</div>`,
    swift: `KinetixPasswordInput(text: $password, placeholder: "Password")`,
    kotlin: `KinetixPasswordInput(
  value = password,
  onValueChange = { password = it },
  placeholder = "Password",
)`,
    dart: `KinetixPasswordInput(
  controller: passwordController,
  placeholder: 'Password',
)`,
  },

  "number-input-demo": {
    html: `<div class="kx-number-input" role="spinbutton" aria-valuenow="2">
  <button aria-label="Decrement">−</button>
  <input type="text" inputmode="numeric" value="2" />
  <button aria-label="Increment">+</button>
</div>
<!-- border: var(--input) -->`,
    swift: `KinetixNumberInput(value: $quantity, in: 0...10)`,
    kotlin: `KinetixNumberInput(
  value = quantity,
  onValueChange = { quantity = it },
  min = 0,
  max = 10,
)`,
    dart: `KinetixNumberInput(
  value: quantity,
  onChanged: (v) => setState(() => quantity = v),
  min: 0,
  max: 10,
)`,
  },

  "fab-demo": {
    html: `<button class="kx-fab" aria-label="Add">＋</button>
<button class="kx-fab kx-fab--extended">＋ New item</button>
<!-- bg: var(--primary) · fg: var(--primary-foreground) · elevated -->`,
    swift: `KinetixFab(action: addItem) {
  Image(systemName: "plus")
}

// extended
KinetixFab(extended: true, action: addItem) {
  Label("New item", systemImage: "plus")
}`,
    kotlin: `KinetixFab(onClick = ::addItem) {
  Icon(Icons.Default.Add, "Add")
}

// extended
KinetixFab(onClick = ::addItem, extended = true) {
  Row { Icon(Icons.Default.Add, null); Text("  New item") }
}`,
    dart: `KinetixFab(
  onPressed: addItem,
  child: const Icon(Icons.add),
)

// extended
KinetixFab(
  onPressed: addItem,
  extended: true,
  child: const Text('New item'),
)`,
  },

  "date-picker-demo": {
    html: `<div class="kx-date-picker">
  <label>Appointment date</label>
  <button aria-haspopup="dialog">Pick a date</button>
  <p class="kx-date-picker__helper">Choose a weekday</p>
</div>`,
    swift: `KinetixDatePicker("Appointment date", selection: $date)`,
    kotlin: `KinetixDatePicker(
  state = rememberDatePickerState(),
  label = "Appointment date",
  helperText = "Choose a weekday",
)`,
    dart: `KinetixDatePicker(
  selectedDate: date,
  onChanged: (d) => setState(() => date = d),
)`,
  },

  "calendar-demo": {
    html: `<div class="kx-calendar" role="grid">
  <!-- month header + 7-column day grid; selected day bg: var(--primary) -->
</div>`,
    swift: `KinetixCalendar(selection: $date)`,
    kotlin: `KinetixCalendar(state = rememberDatePickerState())`,
    dart: `KinetixCalendar(
  selectedDate: date,
  onChanged: (d) => setState(() => date = d),
)`,
  },

  "carousel-demo": {
    html: `<div class="kx-carousel" role="region" aria-roledescription="carousel">
  <div class="kx-carousel__content"><div class="kx-carousel__item">1</div>…</div>
  <button aria-label="Previous"></button><button aria-label="Next"></button>
</div>`,
    swift: `KinetixCarousel(selection: $page, count: 5) { i in
  Text("\\(i + 1)")
    .font(.largeTitle.bold())
    .frame(maxWidth: .infinity)
    .aspectRatio(1, contentMode: .fit)
}`,
    kotlin: `val pager = rememberPagerState(pageCount = { 5 })
KinetixCarousel(pagerState = pager) { page ->
  Box(Modifier.fillMaxWidth().aspectRatio(1f), contentAlignment = Alignment.Center) {
    Text("\${page + 1}", style = MaterialTheme.typography.displaySmall)
  }
}`,
    dart: `KinetixCarousel(
  itemCount: 5,
  itemBuilder: (_, i) => Center(
    child: Text('\${i + 1}', style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold)),
  ),
)`,
  },

  "chart-demo": {
    html: `<figure class="kx-chart" style="--color-desktop: var(--chart-1); --color-mobile: var(--chart-2)">
  <svg><!-- bars --></svg>
</figure>
<!-- series colors: var(--chart-1) … var(--chart-5) -->`,
    swift: `// KinetixChart wraps the system Charts framework.
KinetixChart(
  [
    KinetixChartPoint(label: "Jan", value: 186, series: "Desktop"),
    KinetixChartPoint(label: "Jan", value: 80, series: "Mobile"),
    // …
  ],
  kind: .bar,
  showLegend: true,
)`,
    kotlin: `// KinetixChart is a hand-drawn CustomPaint bar chart over the
// --chart-1…5 palette (no charting dependency). Line/area are a follow-up.
KinetixChart(
  points = listOf(
    KinetixChartPoint("Jan", 186f, seriesIndex = 0),
    KinetixChartPoint("Jan", 80f, seriesIndex = 1),
    // …
  ),
)`,
    dart: `// KinetixChart is a hand-drawn CustomPaint bar chart over the
// --chart-1…5 palette (the package takes no charting dependency).
const KinetixChart([
  KinetixChartPoint(label: 'Jan', value: 186, seriesIndex: 0),
  KinetixChartPoint(label: 'Jan', value: 80, seriesIndex: 1),
  // …
])`,
  },

  "combobox-demo": {
    html: `<div class="kx-combobox">
  <input role="combobox" aria-expanded="false" placeholder="Search framework…" />
  <ul role="listbox"><li role="option">Next.js</li>…</ul>
</div>`,
    swift: `// Combobox is a recipe, not a component — compose KinetixPopover + a
// filtered list, or reach for KinetixSelect for a fixed set.
KinetixPopover(isPresented: $open) {
  KinetixInput(text: $query, placeholder: "Search framework…")
} content: {
  KinetixList {
    ForEach(frameworks.filter { $0.localizedCaseInsensitiveContains(query) }, id: \\.self) { f in
      KinetixListItem(title: f, onSelect: { selection = f; open = false }) {
        EmptyView()
      } trailing: { EmptyView() }
    }
  }
}`,
    kotlin: `// Combobox is a recipe — KinetixPopover/KinetixDropdownMenu + a filtered list.
KinetixDropdownMenu(
  visible = open,
  onDismissRequest = { open = false },
  anchor = { KinetixInput(query, { query = it; open = true }, placeholder = "Search framework…") },
) {
  frameworks.filter { it.contains(query, ignoreCase = true) }.forEach {
    KinetixSelectItem(it, selected = it == selection, onClick = { selection = it; open = false })
  }
}`,
    dart: `// Combobox is a recipe — KinetixPopover + a filtered KinetixList.
KinetixPopover(
  visible: open,
  onDismiss: () => setState(() => open = false),
  anchor: KinetixInput(controller: queryController, placeholder: 'Search framework…'),
  child: KinetixList(
    children: [
      for (final f in frameworks.where(
          (f) => f.toLowerCase().contains(query.toLowerCase())))
        KinetixListItem(title: f, onTap: () => select(f)),
    ],
  ),
)`,
  },

  "command-demo": {
    html: `<div class="kx-command" role="dialog">
  <input placeholder="Type a command or search…" />
  <ul role="listbox">
    <li class="kx-command__group">Suggestions</li>
    <li role="option">Calendar</li>
  </ul>
</div>
<!-- ⌘K palette; there is no native equivalent — compose a searchable sheet -->`,
    swift: `KinetixCommandDialog(isPresented: $open, query: $query) {
  KinetixCommandGroup("Suggestions") {
    KinetixCommandItem("Calendar", systemImage: "calendar") { run(.calendar) }
    KinetixCommandItem("Search", systemImage: "magnifyingglass") { run(.search) }
  }
}`,
    kotlin: `KinetixCommandDialog(
  visible = open,
  onDismissRequest = { open = false },
  query = query,
  onQueryChange = { query = it },
) {
  KinetixCommandGroup(heading = "Suggestions") {
    KinetixCommandItem("Calendar", onClick = { run(Command.Calendar) })
    KinetixCommandItem("Search", onClick = { run(Command.Search) })
  }
}`,
    dart: `KinetixCommandDialog(
  visible: open,
  onDismiss: () => setState(() => open = false),
  controller: queryController,
  children: [
    KinetixCommandGroup('Suggestions', children: [
      KinetixCommandItem('Calendar', icon: const Icon(Icons.calendar_today), onPressed: () {}),
      KinetixCommandItem('Search', icon: const Icon(Icons.search), onPressed: () {}),
    ]),
  ],
)`,
  },

  "field-demo": {
    html: `<div class="kx-field" data-invalid="true">
  <label>Email</label>
  <input type="email" aria-invalid="true" />
  <p class="kx-field__description">We'll only use it to send receipts.</p>
  <p class="kx-field__message" data-intent="error">Enter a valid email address.</p>
</div>`,
    swift: `KinetixField(invalid: invalid) {
  KinetixFieldLabel("Email")
  KinetixInput(text: $email, isError: invalid, placeholder: "you@example.com")
  KinetixFieldDescription("We'll only use it to send receipts.")
  if invalid {
    KinetixFieldMessage("Enter a valid email address.")
  }
}`,
    kotlin: `KinetixField(invalid = invalid) {
  KinetixFieldLabel("Email")
  KinetixInput(email, { email = it }, isError = invalid, placeholder = "you@example.com")
  KinetixFieldDescription("We'll only use it to send receipts.")
  if (invalid) {
    KinetixFieldMessage("Enter a valid email address.")
  }
}`,
    dart: `KinetixField(
  invalid: invalid,
  children: [
    const KinetixFieldLabel('Email'),
    KinetixInput(controller: emailController, isError: invalid),
    const KinetixFieldDescription("We'll only use it to send receipts."),
    if (invalid) const KinetixFieldMessage('Enter a valid email address.'),
  ],
)`,
  },

  "form-demo": {
    html: `<form class="kx-form">
  <label for="username">Username</label>
  <input id="username" />
  <p class="kx-form__description">This is your public display name.</p>
  <button type="submit" class="kx-btn--primary">Submit</button>
</form>`,
    swift: `// There is no Form context port — KinetixField is the equivalent.
VStack(spacing: 16) {
  KinetixField {
    KinetixFieldLabel("Username")
    KinetixInput(text: $username)
    KinetixFieldDescription("This is your public display name.")
  }
  KinetixButton(action: submit) { Text("Submit") }
}`,
    kotlin: `// No Form context port — KinetixField is the equivalent.
Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
  KinetixField {
    KinetixFieldLabel("Username")
    KinetixInput(username, { username = it })
    KinetixFieldDescription("This is your public display name.")
  }
  KinetixButton(onClick = ::submit) { Text("Submit") }
}`,
    dart: `// No Form context port — KinetixField is the equivalent.
Column(
  crossAxisAlignment: CrossAxisAlignment.start,
  children: [
    KinetixField(children: [
      const KinetixFieldLabel('Username'),
      KinetixInput(controller: usernameController),
      const KinetixFieldDescription('This is your public display name.'),
    ]),
    const SizedBox(height: 16),
    KinetixButton(onPressed: submit, child: const Text('Submit')),
  ],
)`,
  },

  "input-group-demo": {
    html: `<div class="kx-input-group">
  <span class="kx-input-group__text">https://</span>
  <input placeholder="kinetixui.com" />
</div>
<!-- addon bg: var(--muted) · border: var(--input) -->`,
    swift: `KinetixInputGroup {
  KinetixInputGroupText("https://")
  KinetixInputGroupInput(text: $url, placeholder: "kinetixui.com")
}`,
    kotlin: `KinetixInputGroup {
  KinetixInputGroupText("https://")
  KinetixInput(url, { url = it }, Modifier.weight(1f), placeholder = "kinetixui.com")
}`,
    dart: `KinetixInputGroup(
  children: [
    const KinetixInputGroupText('https://'),
    KinetixInputGroupField(
      controller: urlController,
      placeholder: 'kinetixui.com',
    ),
  ],
)`,
  },

  "input-otp-demo": {
    html: `<div class="kx-input-otp" role="group" aria-label="One-time code">
  <input maxlength="1" /><input maxlength="1" /><input maxlength="1" />
  <input maxlength="1" /><input maxlength="1" /><input maxlength="1" />
</div>
<!-- active slot ring: var(--ring) -->`,
    swift: `KinetixInputOtp(text: $code, length: 6)`,
    kotlin: `KinetixInputOtp(
  value = code,
  onValueChange = { code = it },
  length = 6,
)`,
    dart: `KinetixInputOtp(
  value: code,
  onChanged: (v) => setState(() => code = v),
  length: 6,
)`,
  },

  "file-upload-demo": {
    html: `<div class="kx-file-upload">
  <button>Choose files</button><span>PDF, PNG up to 5 MB</span>
  <ul class="kx-file-upload__list"><li>passport-scan.pdf<button aria-label="Remove"></button></li></ul>
</div>`,
    swift: `KinetixFileUpload(
  files: files,
  onBrowse: { showImporter = true },
  onRemove: { files.removeAll { $0.id == $0.id } },
)`,
    kotlin: `KinetixFileUpload(
  onBrowse = { picker.launch("application/pdf") },
  helperText = "PDF, PNG up to 5 MB",
  files = files,
  onRemove = { id -> files = files.filterNot { it.id == id } },
)`,
    dart: `KinetixFileUpload(
  files: files,
  prompt: 'PDF, PNG up to 5 MB',
  onBrowse: pickFiles,
  onRemove: (f) => setState(() => files.remove(f)),
)`,
  },

  "resizable-demo": {
    html: `<div class="kx-resizable" data-direction="horizontal">
  <div class="kx-resizable__panel">One</div>
  <div class="kx-resizable__handle" role="separator" aria-orientation="vertical"></div>
  <div class="kx-resizable__panel">Two</div>
</div>
<!-- desktop / web split-pane pattern -->`,
    swift: `KinetixResizablePanels {
  Text("One")
} second: {
  Text("Two")
}`,
    kotlin: `KinetixResizablePanels(
  first = { Text("One") },
  second = { Text("Two") },
)`,
    dart: `const KinetixResizablePanels(
  first: Text('One'),
  second: Text('Two'),
)`,
  },

  "sonner-demo": {
    html: `<div class="kx-toaster" aria-live="polite">
  <div class="kx-toast">
    <strong>Event created</strong>
    <span>Sunday, December 03 at 9:00 AM</span>
  </div>
</div>`,
    swift: `// Place once near the root, driven by an optional binding:
KinetixToaster(toast: $toast)

// then anywhere:
toast = KinetixToast("Event created — Sunday, December 03 at 9:00 AM")`,
    kotlin: `val hostState = remember { SnackbarHostState() }
KinetixToaster(hostState = hostState)

// then anywhere:
scope.launch {
  hostState.showSnackbar("Event created — Sunday, December 03 at 9:00 AM")
}`,
    dart: `KinetixToaster(
  toast: toast,
  onDismiss: () => setState(() => toast = null),
)

// then anywhere:
setState(() => toast = const KinetixToast('Event created — Sunday, December 03 at 9:00 AM'));`,
  },

  "rating-demo": {
    html: `<div class="kx-rating" role="radiogroup" aria-label="Rating">
  <button role="radio" aria-checked="true" aria-label="1 star">★</button>
  <button role="radio" aria-label="2 stars">★</button>
</div>
<!-- filled star: var(--primary) · empty: var(--muted) -->`,
    swift: `KinetixRating(value: rating, onChange: { rating = $0 })`,
    kotlin: `KinetixRating(
  value = rating,
  onValueChange = { rating = it },
)`,
    dart: `KinetixRating(
  value: rating,
  onChanged: (v) => setState(() => rating = v),
)`,
  },

  "audio-player-demo": {
    html: `<figure class="kx-audio-player">
  <audio src="/audio/song.mp3"></audio>
  <button aria-label="Play"></button>
  <input type="range" class="kx-audio-player__seek" />
  <span>SoundHelix Song 1 · Artist</span>
</figure>`,
    swift: `KinetixAudioPlayer(
  title: "SoundHelix Song 1",
  subtitle: "Artist",
  isPlaying: isPlaying,
  position: $position,
  duration: duration,
  onPlayPause: togglePlayback,
  onSkip: { player.seek(to: $0) },
)`,
    kotlin: `KinetixAudioPlayer(
  isPlaying = player.isPlaying,
  positionMs = position,
  durationMs = duration,
  onPlayPause = { if (player.isPlaying) player.pause() else player.play() },
  onSeek = { player.seekTo(it) },
  title = "SoundHelix Song 1",
  artist = "Artist",
)`,
    dart: `KinetixAudioPlayer(
  title: 'SoundHelix Song 1',
  subtitle: 'Artist',
  isPlaying: player.playing,
  position: position,
  duration: duration,
  onPlayPause: () => player.playing ? player.pause() : player.play(),
  onSeek: (d) => player.seek(d),
)`,
  },
};
