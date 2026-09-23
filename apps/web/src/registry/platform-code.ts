/**
 * Cross-platform usage snippets for a component's "Code" tab.
 *
 * The `react` snippet is the canonical one and lives in the demo registry
 * (`demoRegistry[name].source`) — this map only carries the *other* platforms,
 * so there is one source of truth per language. A component with no entry here
 * shows only the React tab.
 *
 * There are no Angular entries here and there never will be: every Angular example comes from a template in
 * `packages/ui-angular/src/usage` that the Angular compiler type-checks, extracted by `pnpm gen:usage`.
 * `check:platform-code` rejects a hand-written Angular snippet outright.
 *
 * `swift` / `kotlin` / `dart` call the real native component libraries:
 *   - iOS     · `KinetixUI` (SwiftUI) — `packages/ui-swiftui`, see /docs/swiftui
 *   - Android · `com.kinetixui:ui-compose` (Jetpack Compose) — see /docs/compose
 *   - Flutter · `kinetix_ui` — `packages/ui-flutter`, see /docs/flutter
 * Each mirrors the React API 1:1. Wrap a screen in `KinetixTheme { … }`
 * (SwiftUI / Compose) or `KinetixTheme(child: …)` (Flutter) once; these
 * snippets assume that and show just the component. State the component
 * owns (a `@State` / `remember` / a `TextEditingController`) is elided.
 * There is deliberately no "HTML" tab: there is no HTML component package or
 * `kx-*` class API, so an HTML example would document something that does not
 * exist. On the web, use React (`@kinetixui/ui`) or the registry
 * (`npx @kinetixui/cli add <component>`).
 *
 * The standing non-ports are shown as the composition the native libraries expect instead. Which ones those
 * are, and why, is `platformGuidance` in `components.manifest.json` — the page reads it to label the tab, and
 * `check:platform-code` fails on a snippet for an unsupported platform that has no declaration.
 */

import type { CodeTab } from "@/lib/platform-tabs";

type Entry = Partial<Record<Exclude<CodeTab, "react" | "angular">, string>>;

export const platformCode: Record<string, Entry> = {

  "button-variants": {
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


  "alert-demo": {
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


  "checkbox-demo": {
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
    swift: `KinetixSeparator()`,
    kotlin: `KinetixSeparator()`,
    dart: `const KinetixSeparator()`,
  },

  "avatar-demo": {
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
    swift: `KinetixLabel("Your email address")`,
    kotlin: `KinetixLabel("Your email address")`,
    dart: `const KinetixLabel('Your email address')`,
  },

  "aspect-ratio-demo": {
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
    swift: `KinetixSkeleton()
  .frame(width: 200, height: 16)`,
    kotlin: `KinetixSkeleton(Modifier.size(width = 200.dp, height = 16.dp))`,
    dart: `const KinetixSkeleton(width: 200, height: 16)`,
  },

  "spinner-demo": {
    swift: `KinetixSpinner()`,
    kotlin: `KinetixSpinner()`,
    dart: `const KinetixSpinner()`,
  },

  "progress-demo": {
    swift: `KinetixProgress(value: 0.66)`,
    kotlin: `KinetixProgress(value = 0.66f)`,
    dart: `const KinetixProgress(value: 0.66)`,
  },

  "circular-progress-demo": {
    swift: `KinetixCircularProgress(value: 0.66, showValue: true)`,
    kotlin: `KinetixCircularProgress(value = 0.66f, showValue = true)`,
    dart: `const KinetixCircularProgress(value: 0.66, showValue: true)`,
  },

  "slider-demo": {
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
    swift: `KinetixTag("design", variant: .secondary, onRemove: { remove() })`,
    kotlin: `KinetixTag("design", variant = KinetixTagVariant.Secondary, onRemove = ::remove)`,
    dart: `KinetixTag(
  'design',
  variant: KinetixTagVariant.secondary,
  onRemove: remove,
)`,
  },

  "toggle-demo": {
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
    KinetixColumn("Invoice", cell = { it.invoice }, sortKey = { it.invoice }),
    KinetixColumn("Status", cell = { it.status }),
    KinetixColumn("Amount", cell = { it.amount }),
  ),
  data = invoices,
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
    swift: `KinetixImage(url: URL(string: src), ratio: .square)`,
    kotlin: `KinetixImage(ratio = KinetixImageRatio.Square) {
  AsyncImage(model = src, contentDescription = null, contentScale = ContentScale.Crop)
}`,
    dart: `KinetixImage(url: src, ratio: KinetixImageRatio.square)`,
  },

  "quote-demo": {
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
    swift: `KinetixCalendar(selection: $date)`,
    kotlin: `KinetixCalendar(state = rememberDatePickerState())`,
    dart: `KinetixCalendar(
  selectedDate: date,
  onChanged: (d) => setState(() => date = d),
)`,
  },

  "carousel-demo": {
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
    dart: `// KinetixChart is a hand-drawn CustomPaint bar chart over the
// --chart-1…5 palette (the package takes no charting dependency).
const KinetixChart([
  KinetixChartPoint(label: 'Jan', value: 186, seriesIndex: 0),
  KinetixChartPoint(label: 'Jan', value: 80, seriesIndex: 1),
  // …
])`,
  },

  "combobox-demo": {
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
