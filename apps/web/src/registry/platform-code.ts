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

  "button-variants": {
    html: `<button class="kx-btn kx-btn--primary kx-btn--md">Primary</button>
<button class="kx-btn kx-btn--secondary kx-btn--md">Secondary</button>
<button class="kx-btn kx-btn--outline kx-btn--md">Outline</button>
<button class="kx-btn kx-btn--destructive kx-btn--md">Destructive</button>
<button class="kx-btn kx-btn--ghost kx-btn--md">Ghost</button>
<button class="kx-btn kx-btn--link kx-btn--md">Link</button>`,
    swift: `HStack(spacing: 12) {
  KinetixButton(variant: .primary, action: {}) { Text("Primary") }
  KinetixButton(variant: .secondary, action: {}) { Text("Secondary") }
  KinetixButton(variant: .outline, action: {}) { Text("Outline") }
  KinetixButton(variant: .destructive, action: {}) { Text("Destructive") }
  KinetixButton(variant: .ghost, action: {}) { Text("Ghost") }
  KinetixButton(variant: .link, action: {}) { Text("Link") }
}`,
    kotlin: `Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
  KinetixButton(onClick = {}, variant = KinetixButtonVariant.Primary) { Text("Primary") }
  KinetixButton(onClick = {}, variant = KinetixButtonVariant.Secondary) { Text("Secondary") }
  KinetixButton(onClick = {}, variant = KinetixButtonVariant.Outline) { Text("Outline") }
  KinetixButton(onClick = {}, variant = KinetixButtonVariant.Destructive) { Text("Destructive") }
  KinetixButton(onClick = {}, variant = KinetixButtonVariant.Ghost) { Text("Ghost") }
  KinetixButton(onClick = {}, variant = KinetixButtonVariant.Link) { Text("Link") }
}`,
    dart: `Row(
  children: [
    KinetixButton(onPressed: () {}, variant: KinetixButtonVariant.primary, child: const Text('Primary')),
    const SizedBox(width: 12),
    KinetixButton(onPressed: () {}, variant: KinetixButtonVariant.secondary, child: const Text('Secondary')),
    const SizedBox(width: 12),
    KinetixButton(onPressed: () {}, variant: KinetixButtonVariant.outline, child: const Text('Outline')),
    const SizedBox(width: 12),
    KinetixButton(onPressed: () {}, variant: KinetixButtonVariant.destructive, child: const Text('Destructive')),
    const SizedBox(width: 12),
    KinetixButton(onPressed: () {}, variant: KinetixButtonVariant.ghost, child: const Text('Ghost')),
    const SizedBox(width: 12),
    KinetixButton(onPressed: () {}, variant: KinetixButtonVariant.link, child: const Text('Link')),
  ],
)`,
  },

  "button-sizes": {
    html: `<button class="kx-btn kx-btn--primary kx-btn--sm">Small</button>
<button class="kx-btn kx-btn--primary kx-btn--md">Medium</button>
<button class="kx-btn kx-btn--primary kx-btn--lg">Large</button>`,
    swift: `HStack(spacing: 12) {
  KinetixButton(size: .sm, action: {}) { Text("Small") }
  KinetixButton(size: .md, action: {}) { Text("Medium") }
  KinetixButton(size: .lg, action: {}) { Text("Large") }
}`,
    kotlin: `Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
  KinetixButton(onClick = {}, size = KinetixButtonSize.Sm) { Text("Small") }
  KinetixButton(onClick = {}, size = KinetixButtonSize.Md) { Text("Medium") }
  KinetixButton(onClick = {}, size = KinetixButtonSize.Lg) { Text("Large") }
}`,
    dart: `Row(
  children: [
    KinetixButton(onPressed: () {}, size: KinetixButtonSize.sm, child: const Text('Small')),
    const SizedBox(width: 12),
    KinetixButton(onPressed: () {}, size: KinetixButtonSize.md, child: const Text('Medium')),
    const SizedBox(width: 12),
    KinetixButton(onPressed: () {}, size: KinetixButtonSize.lg, child: const Text('Large')),
  ],
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

  "input-states": {
    html: `<input class="kx-input" placeholder="Default" />
<input class="kx-input" data-state="error" value="Not quite right" />
<input class="kx-input" placeholder="Disabled" disabled />`,
    swift: `VStack(spacing: 12) {
  KinetixInput(text: $defaultValue, placeholder: "Default")
  KinetixInput(text: $errorValue, isError: true)
  KinetixInput(text: .constant(""), placeholder: "Disabled")
    .disabled(true)
}`,
    kotlin: `Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
  KinetixInput(value = default, onValueChange = { default = it }, placeholder = "Default")
  KinetixInput(value = error, onValueChange = { error = it }, isError = true)
  KinetixInput(value = "", onValueChange = {}, placeholder = "Disabled", enabled = false)
}`,
    dart: `Column(
  children: [
    KinetixInput(controller: defaultController, placeholder: 'Default'),
    const SizedBox(height: 12),
    KinetixInput(controller: errorController, isError: true),
    const SizedBox(height: 12),
    const KinetixInput(placeholder: 'Disabled', enabled: false),
  ],
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

  "avatar-group-demo": {
    html: `<div class="kx-avatar-group">
  <span class="kx-avatar"><span class="kx-avatar__fallback">JD</span></span>
  <span class="kx-avatar"><span class="kx-avatar__fallback">AK</span></span>
  <span class="kx-avatar"><span class="kx-avatar__fallback">+2</span></span>
</div>
<!-- -space-x-2 overlap · each avatar ring-2 ring-background -->`,
    swift: `// AvatarGroup re-wraps its children — not idiomatic in SwiftUI.
// Compose it directly with negative HStack spacing:
HStack(spacing: -8) {
  KinetixAvatar { KinetixAvatarFallback("JD") }
    .overlay(Circle().stroke(colors.background, lineWidth: 2))
  KinetixAvatar { KinetixAvatarFallback("AK") }
    .overlay(Circle().stroke(colors.background, lineWidth: 2))
  KinetixAvatar { KinetixAvatarFallback("+2") }
    .overlay(Circle().stroke(colors.background, lineWidth: 2))
}`,
    kotlin: `// AvatarGroup re-wraps its children — not idiomatic in Compose.
// Compose it directly with negative Row spacing:
Row(horizontalArrangement = Arrangement.spacedBy((-8).dp)) {
  KinetixAvatar(Modifier.border(2.dp, colors.background, CircleShape)) { KinetixAvatarFallback("JD") }
  KinetixAvatar(Modifier.border(2.dp, colors.background, CircleShape)) { KinetixAvatarFallback("AK") }
  KinetixAvatar(Modifier.border(2.dp, colors.background, CircleShape)) { KinetixAvatarFallback("+2") }
}`,
    dart: `// AvatarGroup isn't ported — compose it directly with a negative-offset Row:
Row(
  children: [
    const KinetixAvatar(child: KinetixAvatarFallback('JD')),
    Transform.translate(offset: const Offset(-8, 0), child: const KinetixAvatar(child: KinetixAvatarFallback('AK'))),
    Transform.translate(offset: const Offset(-16, 0), child: const KinetixAvatar(child: KinetixAvatarFallback('+2'))),
  ],
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

  "app-bar-demo": {
    html: `<header class="kx-app-bar">
  <span class="kx-app-bar__brand">Acme</span>
  <nav class="kx-app-bar__nav" aria-label="Primary">
    <a href="/" class="kx-app-bar__link kx-app-bar__link--active">Overview</a>
    <a href="/reports" class="kx-app-bar__link">Reports</a>
  </nav>
  <div class="kx-app-bar__actions"><button class="kx-btn kx-btn--primary kx-btn--sm">New</button></div>
</header>
<!-- bg: var(--background) · border-bottom: var(--border) · active link bg: var(--accent) -->`,
    swift: `KinetixAppBar {
  Text("Acme")
} nav: {
  KinetixAppBarLink("Overview", active: true) { navigate("/") }
  KinetixAppBarLink("Reports") { navigate("/reports") }
} actions: {
  KinetixButton(action: create) { Text("New") }
}`,
    kotlin: `KinetixAppBar(
  brand = { Text("Acme") },
  nav = {
    KinetixAppBarLink("Overview", onClick = { navigate("/") }, active = true)
    KinetixAppBarLink("Reports", onClick = { navigate("/reports") })
  },
  actions = { KinetixButton(onClick = ::create) { Text("New") } },
)`,
    dart: `KinetixAppBar(
  brand: const Text('Acme'),
  nav: [
    KinetixAppBarLink('Overview', onTap: () => navigate('/'), active: true),
    KinetixAppBarLink('Reports', onTap: () => navigate('/reports')),
  ],
  actions: [
    KinetixButton(onPressed: create, child: const Text('New')),
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
    dart: `KinetixSidebar(
  visible: open,
  onDismiss: () => setState(() => open = false),
  header: const Text('Acme'),
  child: KinetixSidebarGroup(
    title: 'Platform',
    children: [
      KinetixSidebarMenuItem(
        label: 'Home',
        icon: const Icon(Icons.home_outlined),
        selected: screen == Screen.home,
        onTap: () => setState(() => screen = Screen.home),
      ),
      KinetixSidebarMenuItem(
        label: 'Projects',
        icon: const Icon(Icons.folder_outlined),
        selected: screen == Screen.projects,
        onTap: () => setState(() => screen = Screen.projects),
      ),
    ],
  ),
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

  "data-grid-demo": {
    html: `<div role="grid" style="overflow: auto; height: 280px;">
  <div role="row" style="position: sticky; top: 0; display: flex;"><!-- draggable, resizable, optionally sticky-pinned headers --></div>
  <div style="height: 80000px; position: relative;"><!-- only rows in view, plus overscan, are mounted --></div>
</div>
<!-- resize handle: pointerdown on a header's right edge; reorder: native HTML5 drag-and-drop on unpinned headers -->`,
    swift: `// Column resize/reorder/pin are web-only — no drag-a-column-border
// convention on iOS, and pinning needs a custom layout ScrollView doesn't
// give for free. Virtualization, tap-to-sort, and tap-to-edit all map
// directly onto SwiftUI, though.
KinetixDataGrid(
  columns: [
    .init(id: "id", header: "ID", width: 72, sortable: true) { "\\($0.id)" },
    .init(id: "name", header: "Name", sortable: true, editable: true, cellText: { $0.name }) { row, _, value in
      row.name = value
    },
    .init(id: "qty", header: "Qty", width: 100, sortable: true) { "\\($0.qty)" },
  ],
  rows: items
)`,
    kotlin: `// Column resize/reorder/pin are web-only — see the Swift tab. LazyColumn
// virtualization, tap-to-sort, and tap-to-edit (commits on IME "Done")
// all map directly onto Compose.
KinetixDataGrid(
  columns = listOf(
    KinetixDataGridColumn("id", "ID", width = 72.dp, sortable = true) { it.id.toString() },
    KinetixDataGridColumn("name", "Name", sortable = true, editable = true, cellText = { it.name },
      onCellEdit = { row, _, value -> updateName(row, value) }),
    KinetixDataGridColumn("qty", "Qty", width = 100.dp, sortable = true) { it.qty.toString() },
  ),
  data = items,
)`,
    dart: `// Column resize/reorder/pin are web-only — see the Swift tab.
// ListView.builder virtualization, tap-to-sort, and tap-to-edit (commits
// on the keyboard submit action) all map directly onto Flutter.
KinetixDataGrid<Item>(
  columns: [
    KinetixDataGridColumn(id: 'id', header: 'ID', width: 72, sortable: true, cellText: (r) => '\${r.id}'),
    KinetixDataGridColumn(
      id: 'name', header: 'Name', sortable: true, editable: true,
      cellText: (r) => r.name,
      onCellEdit: (row, index, value) => updateName(index, value),
    ),
    KinetixDataGridColumn(id: 'qty', header: 'Qty', width: 100, sortable: true, cellText: (r) => '\${r.qty}'),
  ],
  rows: items,
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

  "kbd-demo": {
    html: `<kbd class="kx-kbd">⏎</kbd>
<span class="kx-kbd-group">
  <kbd class="kx-kbd">⌘</kbd>
  <kbd class="kx-kbd">K</kbd>
</span>
<!-- border: var(--input) · bg: var(--muted) · text: var(--muted-foreground) -->`,
    swift: `HStack(spacing: 16) {
  KinetixKbd("⏎")
  KinetixKbdGroup {
    KinetixKbd("⌘")
    KinetixKbd("K")
  }
}`,
    kotlin: `Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
  KinetixKbd("⏎")
  KinetixKbdGroup {
    KinetixKbd("⌘")
    KinetixKbd("K")
  }
}`,
    dart: `Row(
  children: [
    const KinetixKbd('⏎'),
    const SizedBox(width: 16),
    const KinetixKbdGroup(children: [KinetixKbd('⌘'), KinetixKbd('K')]),
  ],
)`,
  },

  "json-viewer-demo": {
    html: `<div role="tree" class="kx-json-viewer">
  <div>{ <span class="text-muted-foreground">2 keys</span> }</div>
  <!-- expanded: each key/value row, string green (--success), number blue (--info), boolean amber (--warning) -->
</div>
<!-- copy button top-right writes JSON.stringify(data, null, 2) to the clipboard -->`,
    swift: `KinetixJsonViewer(value: .object([
  ("name", .string("kinetixui")),
  ("version", .string("0.11.0")),
  ("platforms", .array([.string("react"), .string("swiftui")])),
  ("stable", .bool(false)),
]))`,
    kotlin: `KinetixJsonViewer(
  value = mapOf(
    "name" to "kinetixui",
    "version" to "0.11.0",
    "platforms" to listOf("react", "compose"),
    "stable" to false,
  ),
)`,
    dart: `KinetixJsonViewer(
  data: {
    'name': 'kinetixui',
    'version': '0.11.0',
    'platforms': ['react', 'flutter'],
    'stable': false,
  },
)`,
  },

  "diff-viewer-demo": {
    html: `<div class="kx-diff-viewer" role="table">
  <div role="row" class="bg-destructive/10"><span>12</span><span></span><span>−</span><span>"version": "0.10.0",</span></div>
  <div role="row" class="bg-success/10"><span></span><span>12</span><span>+</span><span>"version": "0.11.0",</span></div>
</div>
<!-- hand-rolled LCS line diff — no package dependency, same DP table on every platform -->`,
    swift: `KinetixDiffViewer(
  oldText: before,
  newText: after,
  mode: .split
)`,
    kotlin: `KinetixDiffViewer(
  oldText = before,
  newText = after,
  mode = KinetixDiffMode.Split,
)`,
    dart: `KinetixDiffViewer(
  oldText: before,
  newText: after,
  mode: KinetixDiffMode.split,
)`,
  },

  "color-picker-demo": {
    html: `<div class="kx-color-picker">
  <div role="slider" aria-label="Saturation and value" class="kx-sv-square"></div>
  <div role="slider" aria-label="Hue" class="kx-hue-rail"></div>
  <div class="kx-hex-field">#<input value="3B82F6" /></div>
  <div class="kx-swatches"><!-- one button per swatch --></div>
</div>
<!-- hand-rolled 2D drag on the square; hue/alpha rails reuse @radix-ui/react-slider directly (not <Slider>, whose track styling is fixed) -->`,
    swift: `@State private var color = "#3b82f6"

KinetixColorPicker(
  value: color,
  onChange: { color = $0 },
  swatches: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"]
)`,
    kotlin: `var color by remember { mutableStateOf("#3b82f6") }

KinetixColorPicker(
  value = color,
  onChange = { color = it },
  swatches = listOf("#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"),
)`,
    dart: `String color = '#3b82f6';

KinetixColorPicker(
  value: color,
  onChanged: (v) => setState(() => color = v),
  swatches: const ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'],
)`,
  },

  "kanban-board-demo": {
    html: `<div role="group" class="kx-kanban-board">
  <div class="kx-kanban-column"><!-- droppable + sortable list of cards --></div>
  <div class="kx-kanban-column"></div>
  <div class="kx-kanban-column"></div>
</div>
<!-- built on @dnd-kit's "multiple containers" sortable pattern: onDragOver re-parents a card into the hovered column live, onDragEnd commits the within-column reorder -->`,
    swift: `// KanbanBoard is a standing non-port — built on @dnd-kit, which has no
// equivalent dependency in this package. Hand-rolling accessible pointer +
// touch + keyboard drag-and-drop with collision detection and live
// reordering from scratch is a much bigger lift than porting the
// component's own logic. Reach for SwiftUI's own drag primitives instead:
// .draggable(_:) on each card and .dropDestination(for:) on each column,
// composed by hand for the specific board.`,
    kotlin: `// KanbanBoard is a standing non-port — see the Swift tab. Compose has no
// @dnd-kit equivalent either. Reach for Compose's own drag gestures
// (detectDragGesturesAfterLongPress, or LazyColumn + a manual reorder
// state holder) composed by hand for the specific board instead.`,
    dart: `// KanbanBoard is a standing non-port — see the Swift tab. Flutter has no
// @dnd-kit equivalent either. Reach for Flutter's own Draggable/DragTarget
// widgets, composed by hand for the specific board, instead.`,
  },

  "markdown-editor-demo": {
    html: `<div class="kx-markdown-editor" role="toolbar" aria-label="Formatting">
  <button aria-label="Bold">B</button>
  <button aria-label="Italic">I</button>
  <!-- … Heading, Link, lists, code, quote … -->
  <button aria-label="Show preview"><svg><!-- eye icon --></svg></button>
</div>
<textarea class="kx-markdown-editor-textarea"></textarea>
<!-- never contenteditable — toolbar buttons wrap/insert markdown syntax at the textarea's selectionStart/selectionEnd -->`,
    swift: `@State private var text = "## Release notes\\n\\nShipped **MarkdownEditor**."

// SwiftUI's TextEditor has no selection API before iOS 17, so toolbar
// buttons append the snippet at the end of the text rather than at the
// cursor — a documented scope-down from the web/Compose/Flutter versions.
KinetixMarkdownEditor(value: text, onChange: { text = $0 })`,
    kotlin: `var text by remember { mutableStateOf("## Release notes\\n\\nShipped **MarkdownEditor**.") }

// BasicTextField's TextFieldValue carries the selection, so toolbar
// buttons insert/wrap syntax at the real cursor position.
KinetixMarkdownEditor(value = text, onChange = { text = it })`,
    dart: `String text = '## Release notes\\n\\nShipped **MarkdownEditor**.';

// TextEditingController.selection gives full cursor-range access, so
// toolbar buttons insert/wrap syntax at the real cursor position.
KinetixMarkdownEditor(
  value: text,
  onChanged: (v) => setState(() => text = v),
)`,
  },

  "empty-demo": {
    html: `<div class="kx-empty">
  <div class="kx-empty-media"><svg><!-- search icon --></svg></div>
  <p class="kx-empty-title">No results found</p>
  <p class="kx-empty-description">Try adjusting your search or filters.</p>
  <button class="kx-button kx-button--outline">Clear filters</button>
</div>
<!-- title: var(--foreground) · description: var(--muted-foreground) -->`,
    swift: `KinetixEmpty {
  KinetixEmptyHeader {
    KinetixEmptyMedia(variant: .icon) { Image(systemName: "magnifyingglass") }
    KinetixEmptyTitle("No results found")
    KinetixEmptyDescription("Try adjusting your search or filters.")
  }
  KinetixEmptyContent {
    KinetixButton(variant: .outline, size: .sm, action: clearFilters) { Text("Clear filters") }
  }
}`,
    kotlin: `KinetixEmpty {
  KinetixEmptyHeader {
    KinetixEmptyMedia(variant = KinetixEmptyMediaVariant.Icon) { Icon(Icons.Default.Search, null) }
    KinetixEmptyTitle("No results found")
    KinetixEmptyDescription("Try adjusting your search or filters.")
  }
  KinetixEmptyContent {
    KinetixButton(::clearFilters, variant = KinetixButtonVariant.Outline, size = KinetixButtonSize.Sm) {
      Text("Clear filters")
    }
  }
}`,
    dart: `KinetixEmpty(
  children: [
    KinetixEmptyHeader(
      children: [
        const KinetixEmptyMedia(
          variant: KinetixEmptyMediaVariant.icon,
          child: Icon(Icons.search),
        ),
        const KinetixEmptyTitle('No results found'),
        const KinetixEmptyDescription('Try adjusting your search or filters.'),
      ],
    ),
    KinetixEmptyContent(
      children: [
        KinetixButton(
          onPressed: clearFilters,
          variant: KinetixButtonVariant.outline,
          size: KinetixButtonSize.sm,
          child: const Text('Clear filters'),
        ),
      ],
    ),
  ],
)`,
  },

  "button-group-demo": {
    html: `<div class="kx-button-group" role="group" data-orientation="horizontal">
  <button class="kx-btn--outline kx-btn--icon" aria-label="Bold"><svg><!-- bold --></svg></button>
  <button class="kx-btn--outline kx-btn--icon" aria-label="Italic"><svg><!-- italic --></svg></button>
  <button class="kx-btn--outline kx-btn--icon" aria-label="Underline"><svg><!-- underline --></svg></button>
</div>
<!-- inner borders overlap 1px, inner corners squared off -->`,
    swift: `KinetixButtonGroup {
  KinetixButton(variant: .outline, size: .icon, action: {}) { Image(systemName: "bold") }
  KinetixButton(variant: .outline, size: .icon, action: {}) { Image(systemName: "italic") }
  KinetixButton(variant: .outline, size: .icon, action: {}) { Image(systemName: "underline") }
}`,
    kotlin: `KinetixButtonGroup {
  KinetixButton({}, variant = KinetixButtonVariant.Outline, size = KinetixButtonSize.Icon) {
    Icon(Icons.Default.FormatBold, null)
  }
  KinetixButton({}, variant = KinetixButtonVariant.Outline, size = KinetixButtonSize.Icon) {
    Icon(Icons.Default.FormatItalic, null)
  }
  KinetixButton({}, variant = KinetixButtonVariant.Outline, size = KinetixButtonSize.Icon) {
    Icon(Icons.Default.FormatUnderlined, null)
  }
}`,
    dart: `KinetixButtonGroup(
  children: [
    KinetixButton(onPressed: () {}, variant: KinetixButtonVariant.outline, size: KinetixButtonSize.icon, child: const Icon(Icons.format_bold)),
    KinetixButton(onPressed: () {}, variant: KinetixButtonVariant.outline, size: KinetixButtonSize.icon, child: const Icon(Icons.format_italic)),
    KinetixButton(onPressed: () {}, variant: KinetixButtonVariant.outline, size: KinetixButtonSize.icon, child: const Icon(Icons.format_underlined)),
  ],
)`,
  },

  "native-select-demo": {
    html: `<select class="kx-native-select">
  <option value="" disabled selected>Select a fruit…</option>
  <optgroup label="Citrus">
    <option value="orange">Orange</option>
    <option value="lemon">Lemon</option>
  </optgroup>
  <optgroup label="Stone fruit">
    <option value="peach">Peach</option>
    <option value="plum">Plum</option>
  </optgroup>
</select>
<!-- the browser's own <select> — for the OS-native picker instead of KinetixSelect's custom popover -->`,
    swift: `// NativeSelect is a web-only escape hatch to the browser's own <select>.
// KinetixSelect already wraps the platform's native picker (SwiftUI Menu) —
// use that instead.
KinetixSelect(selection: $fruit, options: fruitOptions, placeholder: "Select a fruit…")`,
    kotlin: `// NativeSelect is a web-only escape hatch to the browser's own <select>.
// KinetixSelect already wraps the platform's native picker (Material3 DropdownMenu) —
// use that instead.
KinetixDropdownMenu(/* ... */)`,
    dart: `// NativeSelect is a web-only escape hatch to the browser's own <select>.
// KinetixSelect already wraps the platform's native picker (MenuAnchor) —
// use that instead.
KinetixSelect<String>(value: fruit, options: fruitOptions, onChanged: (v) => setState(() => fruit = v))`,
  },

  "description-list-demo": {
    html: `<dl class="kx-description-list">
  <div class="kx-description-list__row">
    <dt>Category</dt>
    <dd>Data Display</dd>
  </div>
  <div class="kx-description-list__row">
    <dt>Built on</dt>
    <dd>Radix Avatar</dd>
  </div>
</dl>
<!-- shell: bg-muted/20 · border · divide-y · term: font-mono text-[10px] uppercase -->`,
    swift: `KinetixDescriptionList {
  KinetixDescriptionListItem(term: "Category") { Text("Data Display") }
  KinetixDescriptionListItem(term: "Built on") { Text("Radix Avatar") }
}`,
    kotlin: `KinetixDescriptionList {
  KinetixDescriptionListItem(term = "Category") { Text("Data Display") }
  KinetixDescriptionListItem(term = "Built on") { Text("Radix Avatar") }
}`,
    dart: `KinetixDescriptionList(
  children: [
    KinetixDescriptionListItem(term: 'Category', child: const Text('Data Display')),
    KinetixDescriptionListItem(term: 'Built on', child: const Text('Radix Avatar')),
  ],
)`,
  },

  "banner-demo": {
    html: `<div class="kx-banner kx-banner--information" role="banner">
  <svg><!-- info icon --></svg>
  <span>A new version of KinetixUI is available.</span>
  <button>Learn more</button>
</div>
<!-- full-bleed, no border-radius · border-b · bg-info/10 text-info -->`,
    swift: `KinetixBanner(
  "A new version of KinetixUI is available.",
  variant: .information,
  actionLabel: "Learn more",
  onAction: openChangelog
)`,
    kotlin: `KinetixBanner(
  text = "A new version of KinetixUI is available.",
  variant = KinetixBannerVariant.Information,
  actionLabel = "Learn more",
  onAction = ::openChangelog,
)`,
    dart: `KinetixBanner(
  'A new version of KinetixUI is available.',
  variant: KinetixBannerVariant.information,
  actionLabel: 'Learn more',
  onAction: openChangelog,
)`,
  },

  "segmented-control-demo": {
    html: `<div class="kx-segmented-control" role="radiogroup">
  <button role="radio" aria-checked="false">List</button>
  <button role="radio" aria-checked="true">Grid</button>
  <button role="radio" aria-checked="false">Board</button>
</div>
<!-- track: bg-muted rounded-lg p-1 · selected: bg-background shadow-sm -->`,
    swift: `KinetixSegmentedControl {
  KinetixSegmentedControlItem("List", isSelected: view == .list) { view = .list }
  KinetixSegmentedControlItem("Grid", isSelected: view == .grid) { view = .grid }
  KinetixSegmentedControlItem("Board", isSelected: view == .board) { view = .board }
}`,
    kotlin: `KinetixSegmentedControl {
  KinetixSegmentedControlItem("List", selected = view == View.List, onClick = { view = View.List })
  KinetixSegmentedControlItem("Grid", selected = view == View.Grid, onClick = { view = View.Grid })
  KinetixSegmentedControlItem("Board", selected = view == View.Board, onClick = { view = View.Board })
}`,
    dart: `KinetixSegmentedControl(
  children: [
    KinetixSegmentedControlItem('List', selected: view == View.list, onTap: () => setState(() => view = View.list)),
    KinetixSegmentedControlItem('Grid', selected: view == View.grid, onTap: () => setState(() => view = View.grid)),
    KinetixSegmentedControlItem('Board', selected: view == View.board, onTap: () => setState(() => view = View.board)),
  ],
)`,
  },

  "timeline-demo": {
    html: `<ol class="kx-timeline">
  <li>
    <span class="kx-timeline__dot"></span>
    <span class="kx-timeline__connector"></span>
    <time>2 hours ago</time>
    <p>Deployed to production</p>
  </li>
  <li>
    <span class="kx-timeline__dot"></span>
    <time>Yesterday</time>
    <p>Opened PR #100</p>
  </li>
</ol>
<!-- dot: bg-primary · connector: bg-border w-px -->`,
    swift: `KinetixTimeline(items: [
  KinetixTimelineItem(title: "Deployed to production", time: "2 hours ago", content: "v0.9.0 shipped."),
  KinetixTimelineItem(title: "Opened PR #100", time: "Yesterday"),
])`,
    kotlin: `KinetixTimeline(items = listOf(
  KinetixTimelineItem(title = "Deployed to production", time = "2 hours ago", content = "v0.9.0 shipped."),
  KinetixTimelineItem(title = "Opened PR #100", time = "Yesterday"),
))`,
    dart: `KinetixTimeline(items: const [
  KinetixTimelineItem('Deployed to production', time: '2 hours ago', content: 'v0.9.0 shipped.'),
  KinetixTimelineItem('Opened PR #100', time: 'Yesterday'),
])`,
  },

  "marquee-demo": {
    html: `<div class="kx-marquee" role="marquee">
  <div class="kx-marquee__track">
    <div class="kx-marquee__copy">React · SwiftUI · Jetpack Compose · Flutter</div>
    <div class="kx-marquee__copy" aria-hidden="true">React · SwiftUI · Jetpack Compose · Flutter</div>
  </div>
</div>
<!-- animate-marquee (Tailwind keyframe) · mask-image fade at both edges · motion-reduce:animate-none -->`,
    swift: `KinetixMarquee(durationSeconds: 18) {
  HStack(spacing: 16) {
    ForEach(platforms, id: \\.self) { p in
      Text(p).font(.kinetixBodySm).foregroundStyle(colors.mutedForeground)
    }
  }
}`,
    kotlin: `KinetixMarquee(durationMillis = 18000) {
  Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
    platforms.forEach { p ->
      Text(p, color = colors.mutedForeground, fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp)
    }
  }
}`,
    dart: `KinetixMarquee(
  duration: const Duration(seconds: 18),
  child: Row(
    children: [
      for (final p in platforms) Padding(padding: const EdgeInsets.only(right: 16), child: Text(p)),
    ],
  ),
)`,
  },

  "comparison-slider-demo": {
    html: `<div class="kx-comparison-slider" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
  <img class="kx-comparison-slider__before" src="/before.jpg" alt="" />
  <img class="kx-comparison-slider__after" src="/after.jpg" alt="" style="clip-path: inset(0 0 0 50%)" />
  <span class="kx-comparison-slider__handle"></span>
</div>
<!-- clip-path driven by a Radix Slider value · divider drawn separately, not Radix's own Range fill -->`,
    swift: `KinetixComparisonSlider(beforeLabel: "Before", afterLabel: "After") {
  Image("before").resizable().scaledToFill()
} after: {
  Image("after").resizable().scaledToFill()
}`,
    kotlin: `KinetixComparisonSlider(
  beforeLabel = "Before",
  afterLabel = "After",
  before = { Image(painterResource(R.drawable.before), null, Modifier.fillMaxSize()) },
  after = { Image(painterResource(R.drawable.after), null, Modifier.fillMaxSize()) },
)`,
    dart: `KinetixComparisonSlider(
  beforeLabel: 'Before',
  afterLabel: 'After',
  before: Image.asset('before.jpg', fit: BoxFit.cover),
  after: Image.asset('after.jpg', fit: BoxFit.cover),
)`,
  },

  "page-header-demo": {
    html: `<header class="kx-page-header">
  <nav class="kx-breadcrumb" aria-label="Breadcrumb">Projects / KinetixUI</nav>
  <div class="kx-page-header__row">
    <div>
      <h1>KinetixUI</h1>
      <p>One token architecture, in motion across every platform.</p>
    </div>
    <div class="kx-page-header__actions">
      <button class="kx-btn--outline">Settings</button>
      <button class="kx-btn--primary">Deploy</button>
    </div>
  </div>
</header>
<!-- border-b pb-6 · title: text-headline-sm · description: text-muted-foreground -->`,
    swift: `KinetixPageHeader(
  "KinetixUI",
  description: "One token architecture, in motion across every platform.",
  breadcrumb: { Text("Projects / KinetixUI").font(.kinetixBodySm) },
  actions: {
    KinetixButton(variant: .outline, size: .sm, action: {}) { Text("Settings") }
    KinetixButton(size: .sm, action: {}) { Text("Deploy") }
  }
)`,
    kotlin: `KinetixPageHeader(
  title = "KinetixUI",
  description = "One token architecture, in motion across every platform.",
  breadcrumb = { Text("Projects / KinetixUI") },
  actions = {
    KinetixButton({}, variant = KinetixButtonVariant.Outline, size = KinetixButtonSize.Sm) { Text("Settings") }
    KinetixButton({}, size = KinetixButtonSize.Sm) { Text("Deploy") }
  },
)`,
    dart: `KinetixPageHeader(
  'KinetixUI',
  description: 'One token architecture, in motion across every platform.',
  breadcrumb: const Text('Projects / KinetixUI'),
  actions: [
    KinetixButton(onPressed: () {}, variant: KinetixButtonVariant.outline, size: KinetixButtonSize.sm, child: const Text('Settings')),
    KinetixButton(onPressed: () {}, size: KinetixButtonSize.sm, child: const Text('Deploy')),
  ],
)`,
  },

  "notification-center-demo": {
    html: `<button class="kx-notification-trigger" aria-label="Notifications, 2 unread">
  <svg><!-- bell --></svg>
  <span class="kx-notification-trigger__dot"></span>
</button>
<div class="kx-popover" role="dialog">
  <header>Notifications <button>Mark all read</button></header>
  <div class="kx-notification-item kx-notification-item--unread">PR #106 merged · 2m ago</div>
  <div class="kx-notification-item kx-notification-item--unread">Deploy succeeded · 1h ago</div>
  <div class="kx-notification-item">Welcome to KinetixUI · 2d ago</div>
</div>
<!-- built directly on Popover — no new open-state logic -->`,
    swift: `@State private var open = false
@State private var unread = 2

KinetixNotificationCenter(isPresented: $open, onMarkAllRead: { unread = 0 }) {
  KinetixNotificationCenterTrigger(unreadCount: unread) { open = true }
} content: {
  KinetixNotificationItem("PR #106 merged", time: "2m ago", unread: unread > 0)
  KinetixNotificationItem("Deploy succeeded", time: "1h ago", unread: unread > 1)
  KinetixNotificationItem("Welcome to KinetixUI", time: "2d ago")
}`,
    kotlin: `var open by remember { mutableStateOf(false) }
var unread by remember { mutableStateOf(2) }

KinetixNotificationCenter(
  expanded = open,
  onDismissRequest = { open = false },
  onMarkAllRead = { unread = 0 },
  trigger = { KinetixNotificationCenterTrigger(onClick = { open = true }, unreadCount = unread) },
) {
  KinetixNotificationItem("PR #106 merged", time = "2m ago", unread = unread > 0)
  KinetixNotificationItem("Deploy succeeded", time = "1h ago", unread = unread > 1)
  KinetixNotificationItem("Welcome to KinetixUI", time = "2d ago")
}`,
    dart: `bool open = false;
int unread = 2;

KinetixNotificationCenter(
  visible: open,
  onDismiss: () => setState(() => open = false),
  onMarkAllRead: () => setState(() => unread = 0),
  anchor: KinetixNotificationCenterTrigger(
    onPressed: () => setState(() => open = true),
    unreadCount: unread,
  ),
  children: [
    KinetixNotificationItem('PR #106 merged', time: '2m ago', unread: unread > 0),
    KinetixNotificationItem('Deploy succeeded', time: '1h ago', unread: unread > 1),
    const KinetixNotificationItem('Welcome to KinetixUI', time: '2d ago'),
  ],
)`,
  },

  "tree-view-demo": {
    html: `<div role="tree">
  <div role="treeitem" aria-expanded="true" tabindex="0">
    <div>▾ src</div>
    <div role="group">
      <div role="treeitem" aria-expanded="true">
        <div>▾ components</div>
        <div role="group">
          <div role="treeitem" aria-selected="true">button.tsx</div>
          <div role="treeitem">badge.tsx</div>
        </div>
      </div>
      <div role="treeitem">index.ts</div>
    </div>
  </div>
  <div role="treeitem">README.md</div>
</div>
<!-- role=treeitem on each node's own container, not a separate row — keyboard nav walks the live DOM -->`,
    swift: `@State private var expanded: Set<String> = ["src", "src/components"]
@State private var selected: String? = "button.tsx"

KinetixTreeView(
  nodes: [
    KinetixTreeNode(value: "src", label: "src", children: [
      KinetixTreeNode(value: "src/components", label: "components", children: [
        KinetixTreeNode(value: "button.tsx", label: "button.tsx"),
        KinetixTreeNode(value: "badge.tsx", label: "badge.tsx"),
      ]),
      KinetixTreeNode(value: "index.ts", label: "index.ts"),
    ]),
    KinetixTreeNode(value: "readme", label: "README.md"),
  ],
  expanded: $expanded,
  selected: $selected
)`,
    kotlin: `var expanded by remember { mutableStateOf(setOf("src", "src/components")) }
var selected by remember { mutableStateOf<String?>("button.tsx") }

KinetixTreeView(
  nodes = listOf(
    KinetixTreeNode("src", "src", children = listOf(
      KinetixTreeNode("src/components", "components", children = listOf(
        KinetixTreeNode("button.tsx", "button.tsx"),
        KinetixTreeNode("badge.tsx", "badge.tsx"),
      )),
      KinetixTreeNode("index.ts", "index.ts"),
    )),
    KinetixTreeNode("readme", "README.md"),
  ),
  expanded = expanded,
  onExpandedChange = { expanded = it },
  selected = selected,
  onSelectedChange = { selected = it },
)`,
    dart: `Set<String> expanded = {'src', 'src/components'};
String? selected = 'button.tsx';

KinetixTreeView(
  nodes: const [
    KinetixTreeNode('src', 'src', children: [
      KinetixTreeNode('src/components', 'components', children: [
        KinetixTreeNode('button.tsx', 'button.tsx'),
        KinetixTreeNode('badge.tsx', 'badge.tsx'),
      ]),
      KinetixTreeNode('index.ts', 'index.ts'),
    ]),
    KinetixTreeNode('readme', 'README.md'),
  ],
  expanded: expanded,
  onExpandedChange: (v) => setState(() => expanded = v),
  selected: selected,
  onSelectedChange: (v) => setState(() => selected = v),
)`,
  },

  "multi-select-demo": {
    html: `<div class="kx-multi-select" role="combobox" aria-expanded="false">
  <span class="kx-tag kx-tag--secondary">React <button aria-label="Remove React">×</button></span>
  <span class="kx-tag kx-tag--secondary">SwiftUI <button aria-label="Remove SwiftUI">×</button></span>
</div>
<!-- Popover + Command recipe, wrapped as a real component — role=combobox on a div, not a button -->`,
    swift: `@State private var selected: Set<String> = ["react", "swiftui"]

KinetixMultiSelect(
  options: [
    KinetixMultiSelectOption(value: "react", label: "React"),
    KinetixMultiSelectOption(value: "swiftui", label: "SwiftUI"),
    KinetixMultiSelectOption(value: "compose", label: "Jetpack Compose"),
    KinetixMultiSelectOption(value: "flutter", label: "Flutter"),
  ],
  selected: $selected,
  placeholder: "Select platforms…"
)`,
    kotlin: `var selected by remember { mutableStateOf(setOf("react", "swiftui")) }

KinetixMultiSelect(
  options = listOf(
    KinetixMultiSelectOption("react", "React"),
    KinetixMultiSelectOption("swiftui", "SwiftUI"),
    KinetixMultiSelectOption("compose", "Jetpack Compose"),
    KinetixMultiSelectOption("flutter", "Flutter"),
  ),
  selected = selected,
  onSelectedChange = { selected = it },
  placeholder = "Select platforms…",
)`,
    dart: `Set<String> selected = {'react', 'swiftui'};

KinetixMultiSelect(
  options: const [
    KinetixMultiSelectOption('react', 'React'),
    KinetixMultiSelectOption('swiftui', 'SwiftUI'),
    KinetixMultiSelectOption('compose', 'Jetpack Compose'),
    KinetixMultiSelectOption('flutter', 'Flutter'),
  ],
  selected: selected,
  onSelectedChange: (v) => setState(() => selected = v),
  placeholder: 'Select platforms…',
)`,
  },

  "message-bubble-demo": {
    html: `<div class="kx-message-bubble kx-message-bubble--received">
  Hey, are we still on for tomorrow?
  <time>10:42 AM</time>
</div>
<div class="kx-message-bubble kx-message-bubble--sent">
  Yep! See you at 3.
  <time>10:43 AM</time> <span class="kx-status kx-status--read">✓✓</span>
</div>
<div class="kx-typing-indicator"><span></span><span></span><span></span></div>
<!-- grouped reduces the outer top corner's radius (rounded-tr-md / rounded-tl-md) -->`,
    swift: `KinetixMessageBubble("Hey, are we still on for tomorrow?", timestamp: "10:42 AM")
KinetixMessageBubble("Yep! See you at 3.", variant: .sent, timestamp: "10:43 AM", status: .read)
KinetixTypingIndicator()`,
    kotlin: `KinetixMessageBubble("Hey, are we still on for tomorrow?", timestamp = "10:42 AM")
KinetixMessageBubble(
  "Yep! See you at 3.",
  variant = KinetixMessageVariant.Sent,
  timestamp = "10:43 AM",
  status = KinetixMessageStatus.Read,
)
KinetixTypingIndicator()`,
    dart: `const KinetixMessageBubble('Hey, are we still on for tomorrow?', timestamp: '10:42 AM')
const KinetixMessageBubble(
  'Yep! See you at 3.',
  variant: KinetixMessageVariant.sent,
  timestamp: '10:43 AM',
  status: KinetixMessageStatus.read,
)
const KinetixTypingIndicator()`,
  },

  "tour-demo": {
    html: `<div class="kx-tour-spotlight" style="top: 40px; left: 120px; width: 96px; height: 32px; box-shadow: 0 0 0 9999px rgb(0 0 0 / 0.6)"></div>
<div class="kx-tour-card" role="dialog" aria-modal="true">
  <p>Save your work</p>
  <p>Changes save automatically, but you can force a save here.</p>
  <button>Skip</button> <button>Next</button>
</div>
<!-- spotlight is one positioned div with a 9999px box-shadow "hole" — no SVG mask needed -->`,
    swift: `// Tour is a standing non-port — a web-only escape hatch. Targeting an
// already-rendered arbitrary element needs a CSS-selector equivalent to
// query the live tree; SwiftUI has no such query, only ancestor-to-
// descendant preference reporting (a target would need to opt in via a
// PreferenceKey wrapper ahead of time, a materially different API shape
// from "point a selector at any element"). Reach for a sequence of
// KinetixPopover steps instead, each anchored to the view it explains.`,
    kotlin: `// Tour is a standing non-port — see the Swift tab. Compose has no
// live-tree query either, only a shared position registry a target
// opts into ahead of time (Modifier.onGloballyPositioned + a shared
// map). Reach for a sequence of KinetixDropdownMenu/KinetixPopover
// steps instead, each anchored to the composable it explains.`,
    dart: `// Tour is a standing non-port — see the Swift tab. Flutter has no live-
// tree query either, only a GlobalKey a target opts into ahead of time.
// Reach for a sequence of KinetixPopover steps instead, each anchored to
// the widget it explains.`,
  },

  "virtual-list-demo": {
    html: `<div role="list" style="overflow-y: auto; height: 280px;">
  <div style="height: 360000px; position: relative;">
    <!-- only the rows within the visible 280px, plus overscan, are ever in the DOM -->
    <div role="listitem" style="position: absolute; top: 0; height: 36px;">Row 1</div>
    <div role="listitem" style="position: absolute; top: 36px; height: 36px;">Row 2</div>
  </div>
</div>
<!-- itemHeight * items.length reserves scrollbar space; rows are absolutely positioned within it -->`,
    swift: `// SwiftUI's List already only instantiates rows near the viewport —
// no manual scroll-offset math to port.
KinetixVirtualList(rows, id: \\.id) { row in
  Text(row.label)
}`,
    kotlin: `// LazyColumn already only composes rows near the viewport — same
// "reuse the platform machinery" call as KinetixSlider/KinetixSelect.
KinetixVirtualList(data = rows, key = { it.id }) { row ->
  Text(row.label)
}`,
    dart: `// ListView.builder already only builds children near the viewport.
KinetixVirtualList<Row>(
  items: rows,
  itemExtent: 36,
  itemBuilder: (context, row, index) => Text(row.label),
)`,
  },
};
