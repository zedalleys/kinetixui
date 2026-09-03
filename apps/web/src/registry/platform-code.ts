/**
 * Cross-platform usage snippets for a component's "Code" tab.
 *
 * The `react` snippet is the canonical one and lives in the demo registry
 * (`demoRegistry[name].source`) — this map only carries the *other* platforms,
 * so there is one source of truth per language. A component with no entry here
 * shows only the React tab.
 *
 * Native snippets compose the platform's own primitives with the real
 * `@kinetixui/tokens` output:
 *   - Web    · CSS custom properties from `@kinetixui/tokens/css`
 *   - iOS    · `KinetixColor.color*` (SwiftUI, from `@kinetixui/tokens/ios`)
 *   - Android· `KinetixTheme.color*` (Compose, from `@kinetixui/tokens/android`)
 *   - Flutter· `KinetixTheme.color*` (from `@kinetixui/tokens/flutter`)
 * Radius is only emitted for Android (`R.dimen.radius_*`); elsewhere the token
 * value is inlined with a comment.
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
    swift: `Button("Button") { save() }
  .padding(.horizontal, 16).padding(.vertical, 10)
  .background(Color(KinetixColor.colorPrimary))
  .foregroundStyle(Color(KinetixColor.colorPrimaryForeground))
  .clipShape(RoundedRectangle(cornerRadius: 8)) // --radius`,
    kotlin: `Button(
  onClick = ::save,
  colors = ButtonDefaults.buttonColors(
    containerColor = KinetixTheme.colorPrimary,
    contentColor = KinetixTheme.colorPrimaryForeground,
  ),
  shape = RoundedCornerShape(dimensionResource(R.dimen.radius_lg)),
) { Text("Button") }`,
    dart: `FilledButton(
  onPressed: save,
  style: FilledButton.styleFrom(
    backgroundColor: KinetixTheme.colorPrimary,
    foregroundColor: KinetixTheme.colorPrimaryForeground,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(12)), // --radius
  ),
  child: const Text('Button'),
)`,
  },

  "badge-demo": {
    html: `<span class="kx-badge">Default</span>
<span class="kx-badge kx-badge--secondary">Secondary</span>
<!-- bg: var(--primary) / var(--secondary) · pill: var(--radius-full) -->`,
    swift: `Text("Default")
  .font(.caption).fontWeight(.medium)
  .padding(.horizontal, 10).padding(.vertical, 3)
  .background(Color(KinetixColor.colorPrimary))
  .foregroundStyle(Color(KinetixColor.colorPrimaryForeground))
  .clipShape(Capsule())`,
    kotlin: `Text(
  "Default",
  style = MaterialTheme.typography.labelSmall,
  color = KinetixTheme.colorPrimaryForeground,
  modifier = Modifier
    .background(KinetixTheme.colorPrimary, CircleShape)
    .padding(horizontal = 10.dp, vertical = 3.dp),
)`,
    dart: `Container(
  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
  decoration: const BoxDecoration(
    color: KinetixTheme.colorPrimary,
    borderRadius: BorderRadius.all(Radius.circular(9999)),
  ),
  child: Text('Default',
    style: TextStyle(fontSize: 12, color: KinetixTheme.colorPrimaryForeground)),
)`,
  },

  "alert-demo": {
    html: `<div class="kx-alert" role="alert">
  <strong>Heads up!</strong>
  <p>You can add components to your app using the CLI.</p>
</div>
<!-- border: var(--border) · text: var(--foreground) · radius: var(--radius-lg) -->`,
    swift: `VStack(alignment: .leading, spacing: 4) {
  Text("Heads up!").fontWeight(.medium)
  Text("You can add components to your app using the CLI.")
    .foregroundStyle(Color(KinetixColor.colorMutedForeground))
}
.padding(16)
.frame(maxWidth: .infinity, alignment: .leading)
.overlay(RoundedRectangle(cornerRadius: 12)
  .stroke(Color(KinetixColor.colorBorder)))`,
    kotlin: `Column(
  Modifier
    .fillMaxWidth()
    .border(1.dp, KinetixTheme.colorBorder, RoundedCornerShape(12.dp))
    .padding(16.dp),
) {
  Text("Heads up!", fontWeight = FontWeight.Medium)
  Text("You can add components to your app using the CLI.",
    color = KinetixTheme.colorMutedForeground)
}`,
    dart: `Container(
  width: double.infinity,
  padding: const EdgeInsets.all(16),
  decoration: BoxDecoration(
    border: Border.all(color: KinetixTheme.colorBorder),
    borderRadius: BorderRadius.circular(12),
  ),
  child: Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text('Heads up!', style: TextStyle(fontWeight: FontWeight.w500)),
      Text('You can add components to your app using the CLI.',
        style: TextStyle(color: KinetixTheme.colorMutedForeground)),
    ],
  ),
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
    swift: `VStack(alignment: .leading, spacing: 8) {
  Text("Create project").font(.headline)
  Text("Deploy your new project in one click.")
    .foregroundStyle(Color(KinetixColor.colorMutedForeground))
}
.padding(20)
.frame(maxWidth: .infinity, alignment: .leading)
.background(Color(KinetixColor.colorCard))
.overlay(RoundedRectangle(cornerRadius: 12)
  .stroke(Color(KinetixColor.colorBorder)))
.clipShape(RoundedRectangle(cornerRadius: 12))`,
    kotlin: `Card(
  colors = CardDefaults.cardColors(
    containerColor = KinetixTheme.colorCard,
    contentColor = KinetixTheme.colorCardForeground,
  ),
  border = BorderStroke(1.dp, KinetixTheme.colorBorder),
  shape = RoundedCornerShape(12.dp),
) {
  Column(Modifier.padding(20.dp)) {
    Text("Create project", style = MaterialTheme.typography.titleMedium)
    Text("Deploy your new project in one click.",
      color = KinetixTheme.colorMutedForeground)
  }
}`,
    dart: `Card(
  color: KinetixTheme.colorCard,
  shape: RoundedRectangleBorder(
    side: BorderSide(color: KinetixTheme.colorBorder),
    borderRadius: BorderRadius.circular(12),
  ),
  child: Padding(
    padding: const EdgeInsets.all(20),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Create project', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        Text('Deploy your new project in one click.',
          style: TextStyle(color: KinetixTheme.colorMutedForeground)),
      ],
    ),
  ),
)`,
  },

  "input-demo": {
    html: `<input type="email" class="kx-input" placeholder="you@example.com" />
<!-- border: var(--input) · ring: var(--ring) · radius: var(--radius) -->`,
    swift: `TextField("you@example.com", text: $email)
  .keyboardType(.emailAddress)
  .padding(.horizontal, 12).padding(.vertical, 10)
  .overlay(RoundedRectangle(cornerRadius: 8)
    .stroke(Color(KinetixColor.colorInput)))`,
    kotlin: `OutlinedTextField(
  value = email,
  onValueChange = { email = it },
  placeholder = { Text("you@example.com") },
  shape = RoundedCornerShape(8.dp),
  colors = OutlinedTextFieldDefaults.colors(
    unfocusedBorderColor = KinetixTheme.colorInput,
    focusedBorderColor = KinetixTheme.colorRing,
  ),
)`,
    dart: `TextField(
  keyboardType: TextInputType.emailAddress,
  decoration: InputDecoration(
    hintText: 'you@example.com',
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: BorderSide(color: KinetixTheme.colorInput),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: BorderSide(color: KinetixTheme.colorRing),
    ),
  ),
)`,
  },

  "textarea-demo": {
    html: `<textarea class="kx-textarea" rows="4" placeholder="Type your message…"></textarea>
<!-- border: var(--input) · min-height: 100px · radius: var(--radius) -->`,
    swift: `TextField("Type your message…", text: $message, axis: .vertical)
  .lineLimit(4...)
  .padding(12)
  .overlay(RoundedRectangle(cornerRadius: 8)
    .stroke(Color(KinetixColor.colorInput)))`,
    kotlin: `OutlinedTextField(
  value = message,
  onValueChange = { message = it },
  placeholder = { Text("Type your message…") },
  minLines = 4,
  shape = RoundedCornerShape(8.dp),
  colors = OutlinedTextFieldDefaults.colors(
    unfocusedBorderColor = KinetixTheme.colorInput,
    focusedBorderColor = KinetixTheme.colorRing,
  ),
)`,
    dart: `TextField(
  minLines: 4,
  maxLines: null,
  decoration: InputDecoration(
    hintText: 'Type your message…',
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: BorderSide(color: KinetixTheme.colorInput),
    ),
  ),
)`,
  },

  "switch-demo": {
    html: `<label class="kx-switch">
  <input type="checkbox" role="switch" />
  <span>Airplane mode</span>
</label>
<!-- track (on): var(--primary) · thumb: var(--background) -->`,
    swift: `Toggle("Airplane mode", isOn: $airplane)
  .tint(Color(KinetixColor.colorPrimary))`,
    kotlin: `Row(verticalAlignment = Alignment.CenterVertically) {
  Switch(
    checked = airplane,
    onCheckedChange = { airplane = it },
    colors = SwitchDefaults.colors(
      checkedTrackColor = KinetixTheme.colorPrimary,
      checkedThumbColor = KinetixTheme.colorBackground,
    ),
  )
  Text("Airplane mode")
}`,
    dart: `SwitchListTile(
  title: const Text('Airplane mode'),
  value: airplane,
  onChanged: (v) => setState(() => airplane = v),
  activeColor: KinetixTheme.colorPrimary,
)`,
  },

  "checkbox-demo": {
    html: `<label class="kx-checkbox">
  <input type="checkbox" checked />
  <span>Accept terms and conditions</span>
</label>
<!-- checked bg: var(--primary) · check: var(--primary-foreground) -->`,
    swift: `Toggle(isOn: $accepted) {
  Text("Accept terms and conditions")
}
.toggleStyle(.checkbox) // macOS; use a custom mark on iOS
.tint(Color(KinetixColor.colorPrimary))`,
    kotlin: `Row(verticalAlignment = Alignment.CenterVertically) {
  Checkbox(
    checked = accepted,
    onCheckedChange = { accepted = it },
    colors = CheckboxDefaults.colors(
      checkedColor = KinetixTheme.colorPrimary,
      checkmarkColor = KinetixTheme.colorPrimaryForeground,
    ),
  )
  Text("Accept terms and conditions")
}`,
    dart: `CheckboxListTile(
  title: const Text('Accept terms and conditions'),
  value: accepted,
  onChanged: (v) => setState(() => accepted = v ?? false),
  activeColor: KinetixTheme.colorPrimary,
  checkColor: KinetixTheme.colorPrimaryForeground,
)`,
  },

  "separator-demo": {
    html: `<hr class="kx-separator" />
<!-- color: var(--border) · 1px -->`,
    swift: `Divider().overlay(Color(KinetixColor.colorBorder))`,
    kotlin: `HorizontalDivider(color = KinetixTheme.colorBorder)`,
    dart: `Divider(color: KinetixTheme.colorBorder, height: 1)`,
  },

  "avatar-demo": {
    html: `<span class="kx-avatar"><span class="kx-avatar__fallback">KX</span></span>
<!-- fallback bg: var(--muted) · text: var(--muted-foreground) · circle -->`,
    swift: `Text("KX")
  .font(.subheadline).fontWeight(.medium)
  .frame(width: 40, height: 40)
  .background(Color(KinetixColor.colorMuted))
  .foregroundStyle(Color(KinetixColor.colorMutedForeground))
  .clipShape(Circle())`,
    kotlin: `Box(
  Modifier
    .size(40.dp)
    .background(KinetixTheme.colorMuted, CircleShape),
  contentAlignment = Alignment.Center,
) {
  Text("KX", color = KinetixTheme.colorMutedForeground)
}`,
    dart: `CircleAvatar(
  radius: 20,
  backgroundColor: KinetixTheme.colorMuted,
  child: Text('KX',
    style: TextStyle(color: KinetixTheme.colorMutedForeground)),
)`,
  },

  "label-demo": {
    html: `<label for="email" class="kx-label">Your email address</label>
<!-- text: var(--foreground) · 14px / medium -->`,
    swift: `Text("Your email address")
  .font(.subheadline).fontWeight(.medium)
  .foregroundStyle(Color(KinetixColor.colorForeground))`,
    kotlin: `Text(
  "Your email address",
  style = MaterialTheme.typography.labelLarge,
  color = KinetixTheme.colorForeground,
)`,
    dart: `Text('Your email address',
  style: TextStyle(
    fontSize: 14, fontWeight: FontWeight.w500,
    color: KinetixTheme.colorForeground))`,
  },

  "aspect-ratio-demo": {
    html: `<div class="kx-aspect" style="aspect-ratio: 16 / 9"></div>
<!-- bg: var(--muted) · radius: var(--radius) -->`,
    swift: `Color(KinetixColor.colorMuted)
  .aspectRatio(16 / 9, contentMode: .fit)
  .clipShape(RoundedRectangle(cornerRadius: 8)) // --radius`,
    kotlin: `Box(
  Modifier
    .fillMaxWidth()
    .aspectRatio(16f / 9f)
    .clip(RoundedCornerShape(8.dp))
    .background(KinetixTheme.colorMuted),
)`,
    dart: `AspectRatio(
  aspectRatio: 16 / 9,
  child: DecoratedBox(
    decoration: BoxDecoration(
      color: KinetixTheme.colorMuted,
      borderRadius: BorderRadius.circular(8),
    ),
  ),
)`,
  },

  "skeleton-demo": {
    html: `<div class="kx-skeleton" style="width: 200px; height: 16px"></div>
<!-- bg: var(--muted) · pulse animation · radius: var(--radius) -->`,
    swift: `RoundedRectangle(cornerRadius: 6)
  .fill(Color(KinetixColor.colorMuted))
  .frame(width: 200, height: 16)
  .redacted(reason: .placeholder)`,
    kotlin: `Box(
  Modifier
    .size(width = 200.dp, height = 16.dp)
    .clip(RoundedCornerShape(6.dp))
    .background(KinetixTheme.colorMuted),
) // wrap with a shimmer modifier for the pulse`,
    dart: `Container(
  width: 200,
  height: 16,
  decoration: BoxDecoration(
    color: KinetixTheme.colorMuted,
    borderRadius: BorderRadius.circular(6),
  ),
) // e.g. wrap in a Shimmer for the pulse`,
  },

  "spinner-demo": {
    html: `<span class="kx-spinner" role="status" aria-label="Loading"></span>
<!-- border-color: var(--primary) · spin animation -->`,
    swift: `ProgressView()
  .progressViewStyle(.circular)
  .tint(Color(KinetixColor.colorPrimary))`,
    kotlin: `CircularProgressIndicator(color = KinetixTheme.colorPrimary)`,
    dart: `CircularProgressIndicator(color: KinetixTheme.colorPrimary)`,
  },

  "progress-demo": {
    html: `<div class="kx-progress" role="progressbar" aria-valuenow="66">
  <div class="kx-progress__bar" style="width: 66%"></div>
</div>
<!-- track: var(--muted) · bar: var(--primary) -->`,
    swift: `ProgressView(value: 0.66)
  .tint(Color(KinetixColor.colorPrimary))`,
    kotlin: `LinearProgressIndicator(
  progress = { 0.66f },
  color = KinetixTheme.colorPrimary,
  trackColor = KinetixTheme.colorMuted,
)`,
    dart: `LinearProgressIndicator(
  value: 0.66,
  color: KinetixTheme.colorPrimary,
  backgroundColor: KinetixTheme.colorMuted,
)`,
  },

  "circular-progress-demo": {
    html: `<svg class="kx-circular-progress" viewBox="0 0 48 48" role="progressbar" aria-valuenow="66">
  <circle cx="24" cy="24" r="20" /><circle cx="24" cy="24" r="20" pathLength="100" />
</svg>
<!-- track: var(--muted) · arc: var(--primary) -->`,
    swift: `ProgressView(value: 0.66)
  .progressViewStyle(.circular)
  .tint(Color(KinetixColor.colorPrimary))`,
    kotlin: `CircularProgressIndicator(
  progress = { 0.66f },
  color = KinetixTheme.colorPrimary,
  trackColor = KinetixTheme.colorMuted,
)`,
    dart: `CircularProgressIndicator(
  value: 0.66,
  color: KinetixTheme.colorPrimary,
  backgroundColor: KinetixTheme.colorMuted,
)`,
  },

  "slider-demo": {
    html: `<input type="range" class="kx-slider" min="0" max="100" step="1" value="50" />
<!-- track: var(--muted) · range + thumb: var(--primary) -->`,
    swift: `Slider(value: $value, in: 0...100, step: 1)
  .tint(Color(KinetixColor.colorPrimary))`,
    kotlin: `Slider(
  value = value,
  onValueChange = { value = it },
  valueRange = 0f..100f,
  colors = SliderDefaults.colors(
    thumbColor = KinetixTheme.colorPrimary,
    activeTrackColor = KinetixTheme.colorPrimary,
    inactiveTrackColor = KinetixTheme.colorMuted,
  ),
)`,
    dart: `Slider(
  value: value,
  min: 0, max: 100, divisions: 100,
  onChanged: (v) => setState(() => value = v),
  activeColor: KinetixTheme.colorPrimary,
  inactiveColor: KinetixTheme.colorMuted,
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
    swift: `Picker("", selection: $tab) {
  Text("Account").tag(0)
  Text("Password").tag(1)
}
.pickerStyle(.segmented)`,
    kotlin: `TabRow(
  selectedTabIndex = tab,
  contentColor = KinetixTheme.colorPrimary,
) {
  Tab(selected = tab == 0, onClick = { tab = 0 }) { Text("Account") }
  Tab(selected = tab == 1, onClick = { tab = 1 }) { Text("Password") }
}`,
    dart: `DefaultTabController(
  length: 2,
  child: TabBar(
    labelColor: KinetixTheme.colorPrimary,
    indicatorColor: KinetixTheme.colorPrimary,
    tabs: const [Tab(text: 'Account'), Tab(text: 'Password')],
  ),
)`,
  },

  "tooltip-demo": {
    html: `<button aria-describedby="tt">Hover</button>
<div id="tt" role="tooltip" class="kx-tooltip">Add to library</div>
<!-- bg: var(--primary) · text: var(--primary-foreground) -->`,
    swift: `Button("Hover") {}
  .help("Add to library") // pointer / VoiceOver hint`,
    kotlin: `TooltipBox(
  positionProvider = TooltipDefaults.rememberPlainTooltipPositionProvider(),
  tooltip = { PlainTooltip { Text("Add to library") } },
  state = rememberTooltipState(),
) {
  Button(onClick = {}) { Text("Hover") }
}`,
    dart: `Tooltip(
  message: 'Add to library',
  child: OutlinedButton(onPressed: () {}, child: const Text('Hover')),
)`,
  },

  "radio-group-demo": {
    html: `<fieldset class="kx-radio-group">
  <label><input type="radio" name="density" value="comfortable" checked /> Comfortable</label>
  <label><input type="radio" name="density" value="compact" /> Compact</label>
</fieldset>
<!-- selected dot: var(--primary) -->`,
    swift: `Picker("Density", selection: $density) {
  Text("Default").tag("default")
  Text("Comfortable").tag("comfortable")
  Text("Compact").tag("compact")
}
.pickerStyle(.inline)`,
    kotlin: `Column(Modifier.selectableGroup()) {
  listOf("default", "comfortable", "compact").forEach { value ->
    Row(verticalAlignment = Alignment.CenterVertically) {
      RadioButton(
        selected = density == value,
        onClick = { density = value },
        colors = RadioButtonDefaults.colors(selectedColor = KinetixTheme.colorPrimary),
      )
      Text(value.replaceFirstChar { it.uppercase() })
    }
  }
}`,
    dart: `Column(
  children: ['default', 'comfortable', 'compact'].map((value) {
    return RadioListTile<String>(
      value: value,
      groupValue: density,
      onChanged: (v) => setState(() => density = v!),
      activeColor: KinetixTheme.colorPrimary,
      title: Text(value),
    );
  }).toList(),
)`,
  },

  "select-demo": {
    html: `<select class="kx-select">
  <option value="apple">Apple</option>
  <option value="banana">Banana</option>
</select>
<!-- border: var(--input) · focus ring: var(--ring) -->`,
    swift: `Picker("Fruit", selection: $fruit) {
  Text("Apple").tag("apple")
  Text("Banana").tag("banana")
  Text("Blueberry").tag("blueberry")
}
.pickerStyle(.menu)`,
    kotlin: `ExposedDropdownMenuBox(expanded = open, onExpandedChange = { open = it }) {
  OutlinedTextField(
    value = fruit, onValueChange = {}, readOnly = true,
    modifier = Modifier.menuAnchor(),
    colors = OutlinedTextFieldDefaults.colors(
      unfocusedBorderColor = KinetixTheme.colorInput,
      focusedBorderColor = KinetixTheme.colorRing,
    ),
  )
  ExposedDropdownMenu(expanded = open, onDismissRequest = { open = false }) {
    listOf("Apple", "Banana", "Blueberry").forEach {
      DropdownMenuItem(text = { Text(it) }, onClick = { fruit = it; open = false })
    }
  }
}`,
    dart: `DropdownButtonFormField<String>(
  value: fruit,
  decoration: InputDecoration(
    border: OutlineInputBorder(
      borderSide: BorderSide(color: KinetixTheme.colorInput)),
  ),
  items: const [
    DropdownMenuItem(value: 'apple', child: Text('Apple')),
    DropdownMenuItem(value: 'banana', child: Text('Banana')),
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
    swift: `.sheet(isPresented: $showEditProfile) {
  VStack(alignment: .leading, spacing: 16) {
    Text("Edit profile").font(.headline)
    TextField("Name", text: $name)
    Button("Save changes") { save() }
      .buttonStyle(.borderedProminent)
      .tint(Color(KinetixColor.colorPrimary))
  }
  .padding(24)
  .presentationDetents([.medium])
}`,
    kotlin: `AlertDialog(
  onDismissRequest = { open = false },
  containerColor = KinetixTheme.colorPopover,
  title = { Text("Edit profile") },
  text = {
    OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name") })
  },
  confirmButton = {
    TextButton(onClick = ::save) { Text("Save changes") }
  },
)`,
    dart: `showDialog(
  context: context,
  builder: (_) => AlertDialog(
    backgroundColor: KinetixTheme.colorPopover,
    title: const Text('Edit profile'),
    content: TextField(
      controller: nameController,
      decoration: const InputDecoration(labelText: 'Name'),
    ),
    actions: [
      FilledButton(onPressed: save, child: const Text('Save changes')),
    ],
  ),
)`,
  },

  "sheet-demo": {
    html: `<div class="kx-sheet" data-side="right">
  <h2>Edit profile</h2>
  <p>Make changes to your profile here.</p>
</div>
<!-- surface: var(--background) · slides from the edge -->`,
    swift: `.sheet(isPresented: $open) {
  VStack(alignment: .leading, spacing: 8) {
    Text("Edit profile").font(.headline)
    Text("Make changes to your profile here.")
      .foregroundStyle(Color(KinetixColor.colorMutedForeground))
  }
  .padding(24)
  .frame(maxWidth: .infinity, alignment: .leading)
  .presentationDetents([.medium, .large])
}`,
    kotlin: `ModalBottomSheet(
  onDismissRequest = { open = false },
  containerColor = KinetixTheme.colorBackground,
) {
  Column(Modifier.padding(24.dp)) {
    Text("Edit profile", style = MaterialTheme.typography.titleMedium)
    Text("Make changes to your profile here.",
      color = KinetixTheme.colorMutedForeground)
  }
}`,
    dart: `showModalBottomSheet(
  context: context,
  backgroundColor: KinetixTheme.colorBackground,
  builder: (_) => Padding(
    padding: const EdgeInsets.all(24),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Edit profile', style: TextStyle(fontWeight: FontWeight.w600)),
        Text('Make changes to your profile here.',
          style: TextStyle(color: KinetixTheme.colorMutedForeground)),
      ],
    ),
  ),
)`,
  },

  "accordion-demo": {
    html: `<details class="kx-accordion__item">
  <summary>Is it accessible?</summary>
  <div>Yes. It follows the WAI-ARIA design pattern.</div>
</details>
<!-- border: var(--border) · chevron rotates on open -->`,
    swift: `DisclosureGroup("Is it accessible?") {
  Text("Yes. It follows the WAI-ARIA design pattern.")
    .foregroundStyle(Color(KinetixColor.colorMutedForeground))
    .frame(maxWidth: .infinity, alignment: .leading)
}
.tint(Color(KinetixColor.colorForeground))`,
    kotlin: `Column {
  Row(
    Modifier.fillMaxWidth().clickable { open = !open },
    horizontalArrangement = Arrangement.SpaceBetween,
  ) {
    Text("Is it accessible?", fontWeight = FontWeight.Medium)
    Icon(Icons.Default.ExpandMore, null, Modifier.rotate(if (open) 180f else 0f))
  }
  AnimatedVisibility(open) {
    Text("Yes. It follows the WAI-ARIA design pattern.",
      color = KinetixTheme.colorMutedForeground)
  }
}`,
    dart: `ExpansionTile(
  title: const Text('Is it accessible?'),
  shape: Border.all(color: KinetixTheme.colorBorder),
  collapsedShape: Border.all(color: KinetixTheme.colorBorder),
  children: const [
    Padding(
      padding: EdgeInsets.all(16),
      child: Text('Yes. It follows the WAI-ARIA design pattern.'),
    ),
  ],
)`,
  },

  "collapsible-demo": {
    html: `<div class="kx-collapsible">
  <button aria-expanded="false">Toggle</button>
  <div hidden>@radix-ui/primitives</div>
</div>`,
    swift: `DisclosureGroup(isExpanded: $open) {
  Text("@radix-ui/primitives")
  Text("@stitches/react")
} label: {
  Text("@kinetixui starred 3 repositories")
}`,
    kotlin: `Column {
  Row(
    Modifier.fillMaxWidth(),
    horizontalArrangement = Arrangement.SpaceBetween,
  ) {
    Text("@kinetixui starred 3 repositories")
    TextButton(onClick = { open = !open }) { Text("Toggle") }
  }
  AnimatedVisibility(open) {
    Column { Text("@radix-ui/primitives"); Text("@stitches/react") }
  }
}`,
    dart: `Column(
  children: [
    Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text('@kinetixui starred 3 repositories'),
        TextButton(
          onPressed: () => setState(() => open = !open),
          child: const Text('Toggle'),
        ),
      ],
    ),
    if (open) ...const [Text('@radix-ui/primitives'), Text('@stitches/react')],
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
    swift: `HStack(spacing: 6) {
  Button("Home") {}.buttonStyle(.plain)
  Image(systemName: "chevron.right").font(.caption2)
  Button("Docs") {}.buttonStyle(.plain)
  Image(systemName: "chevron.right").font(.caption2)
  Text("Breadcrumb").fontWeight(.medium)
}
.foregroundStyle(Color(KinetixColor.colorMutedForeground))`,
    kotlin: `Row(
  verticalAlignment = Alignment.CenterVertically,
  horizontalArrangement = Arrangement.spacedBy(6.dp),
) {
  Text("Home", color = KinetixTheme.colorMutedForeground)
  Icon(Icons.Default.ChevronRight, null, Modifier.size(14.dp))
  Text("Docs", color = KinetixTheme.colorMutedForeground)
  Icon(Icons.Default.ChevronRight, null, Modifier.size(14.dp))
  Text("Breadcrumb", color = KinetixTheme.colorForeground)
}`,
    dart: `Row(
  children: [
    Text('Home', style: TextStyle(color: KinetixTheme.colorMutedForeground)),
    const Icon(Icons.chevron_right, size: 16),
    Text('Docs', style: TextStyle(color: KinetixTheme.colorMutedForeground)),
    const Icon(Icons.chevron_right, size: 16),
    Text('Breadcrumb', style: TextStyle(color: KinetixTheme.colorForeground)),
  ],
)`,
  },

  "tag-demo": {
    html: `<span class="kx-tag">design <button aria-label="Remove">×</button></span>
<!-- bg: var(--secondary) · text: var(--secondary-foreground) · pill -->`,
    swift: `HStack(spacing: 4) {
  Text("design")
  Button { remove() } label: { Image(systemName: "xmark").font(.caption2) }
}
.padding(.horizontal, 10).padding(.vertical, 4)
.background(Color(KinetixColor.colorSecondary))
.foregroundStyle(Color(KinetixColor.colorSecondaryForeground))
.clipShape(Capsule())`,
    kotlin: `InputChip(
  selected = false,
  onClick = {},
  label = { Text("design") },
  trailingIcon = {
    Icon(Icons.Default.Close, "Remove", Modifier.size(16.dp))
  },
  colors = InputChipDefaults.inputChipColors(
    containerColor = KinetixTheme.colorSecondary,
    labelColor = KinetixTheme.colorSecondaryForeground,
  ),
)`,
    dart: `Chip(
  label: const Text('design'),
  onDeleted: remove,
  deleteIcon: const Icon(Icons.close, size: 16),
  backgroundColor: KinetixTheme.colorSecondary,
  labelStyle: TextStyle(color: KinetixTheme.colorSecondaryForeground),
)`,
  },

  "toggle-demo": {
    html: `<button class="kx-toggle" aria-pressed="false" aria-label="Toggle italic">
  <svg><!-- italic icon --></svg>
</button>
<!-- pressed bg: var(--accent) · pressed text: var(--accent-foreground) -->`,
    swift: `Toggle(isOn: $italic) {
  Image(systemName: "italic")
}
.toggleStyle(.button)
.tint(Color(KinetixColor.colorAccent))`,
    kotlin: `FilledIconToggleButton(
  checked = italic,
  onCheckedChange = { italic = it },
  colors = IconButtonDefaults.filledIconToggleButtonColors(
    checkedContainerColor = KinetixTheme.colorAccent,
    checkedContentColor = KinetixTheme.colorAccentForeground,
  ),
) {
  Icon(Icons.Default.FormatItalic, "Toggle italic")
}`,
    dart: `IconButton.filledTonal(
  isSelected: italic,
  onPressed: () => setState(() => italic = !italic),
  icon: const Icon(Icons.format_italic),
  style: IconButton.styleFrom(
    backgroundColor: italic ? KinetixTheme.colorAccent : null,
    foregroundColor: italic ? KinetixTheme.colorAccentForeground : null,
  ),
)`,
  },

  "alert-dialog-demo": {
    html: `<div role="alertdialog" class="kx-alert-dialog" aria-labelledby="t" aria-describedby="d">
  <h2 id="t">Are you absolutely sure?</h2>
  <p id="d">This action cannot be undone.</p>
  <button>Cancel</button>
  <button class="kx-btn--destructive">Continue</button>
</div>`,
    swift: `.alert("Are you absolutely sure?", isPresented: $confirmDelete) {
  Button("Cancel", role: .cancel) {}
  Button("Continue", role: .destructive) { deleteAccount() }
} message: {
  Text("This action cannot be undone.")
}`,
    kotlin: `AlertDialog(
  onDismissRequest = { open = false },
  containerColor = KinetixTheme.colorPopover,
  title = { Text("Are you absolutely sure?") },
  text = { Text("This action cannot be undone.") },
  confirmButton = {
    TextButton(
      onClick = ::deleteAccount,
      colors = ButtonDefaults.textButtonColors(contentColor = KinetixTheme.colorDestructive),
    ) { Text("Continue") }
  },
  dismissButton = { TextButton(onClick = { open = false }) { Text("Cancel") } },
)`,
    dart: `showDialog(
  context: context,
  builder: (_) => AlertDialog(
    backgroundColor: KinetixTheme.colorPopover,
    title: const Text('Are you absolutely sure?'),
    content: const Text('This action cannot be undone.'),
    actions: [
      TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
      TextButton(
        onPressed: deleteAccount,
        style: TextButton.styleFrom(foregroundColor: KinetixTheme.colorDestructive),
        child: const Text('Continue'),
      ),
    ],
  ),
)`,
  },

  "modal-demo": {
    html: `<div role="dialog" class="kx-modal" aria-modal="true">
  <header><h2>Confirmation dialog</h2></header>
  <div class="kx-modal__body">Dialog description text.</div>
  <footer><button>Cancel</button><button class="kx-btn--primary">Confirm</button></footer>
</div>
<!-- surface: var(--popover) · header/footer divided by var(--border) -->`,
    swift: `.confirmationDialog("Confirmation dialog", isPresented: $open, titleVisibility: .visible) {
  Button("Confirm") { onAction() }
  Button("Cancel", role: .cancel) {}
} message: {
  Text("Dialog description text.")
}`,
    kotlin: `AlertDialog(
  onDismissRequest = { open = false },
  containerColor = KinetixTheme.colorPopover,
  title = { Text("Confirmation dialog") },
  text = { Text("Dialog description text.") },
  confirmButton = {
    Button(
      onClick = ::onAction,
      colors = ButtonDefaults.buttonColors(containerColor = KinetixTheme.colorPrimary),
    ) { Text("Confirm") }
  },
  dismissButton = { TextButton(onClick = { open = false }) { Text("Cancel") } },
)`,
    dart: `showDialog(
  context: context,
  builder: (_) => AlertDialog(
    backgroundColor: KinetixTheme.colorPopover,
    title: const Text('Confirmation dialog'),
    content: const Text('Dialog description text.'),
    actions: [
      TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
      FilledButton(onPressed: onAction, child: const Text('Confirm')),
    ],
  ),
)`,
  },

  "drawer-demo": {
    html: `<div class="kx-drawer" data-side="bottom">
  <div class="kx-drawer__handle"></div>
  <h2>Move goal</h2>
  <p>Set your daily activity goal.</p>
</div>
<!-- surface: var(--background) · drags from the bottom edge -->`,
    swift: `.sheet(isPresented: $open) {
  VStack(spacing: 8) {
    Capsule().fill(Color(KinetixColor.colorMuted)).frame(width: 40, height: 4)
    Text("Move goal").font(.headline)
    Text("Set your daily activity goal.")
      .foregroundStyle(Color(KinetixColor.colorMutedForeground))
  }
  .padding(24)
  .presentationDetents([.medium])
  .presentationDragIndicator(.visible)
}`,
    kotlin: `ModalBottomSheet(
  onDismissRequest = { open = false },
  containerColor = KinetixTheme.colorBackground,
) {
  Column(
    Modifier.padding(24.dp),
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    Text("Move goal", style = MaterialTheme.typography.titleMedium)
    Text("Set your daily activity goal.", color = KinetixTheme.colorMutedForeground)
  }
}`,
    dart: `showModalBottomSheet(
  context: context,
  showDragHandle: true,
  backgroundColor: KinetixTheme.colorBackground,
  builder: (_) => Padding(
    padding: const EdgeInsets.all(24),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text('Move goal', style: TextStyle(fontWeight: FontWeight.w600)),
        Text('Set your daily activity goal.',
          style: TextStyle(color: KinetixTheme.colorMutedForeground)),
      ],
    ),
  ),
)`,
  },

  "popover-demo": {
    html: `<div class="kx-popover" role="dialog">
  <p class="font-medium">Dimensions</p>
  <p>Set the dimensions for the layer.</p>
</div>
<!-- surface: var(--popover) · border: var(--border) -->`,
    swift: `Button("Open popover") { showPopover = true }
  .popover(isPresented: $showPopover) {
    VStack(alignment: .leading, spacing: 4) {
      Text("Dimensions").fontWeight(.medium)
      Text("Set the dimensions for the layer.")
        .foregroundStyle(Color(KinetixColor.colorMutedForeground))
    }
    .padding(16)
    .presentationCompactAdaptation(.popover)
  }`,
    kotlin: `Box {
  OutlinedButton(onClick = { open = true }) { Text("Open popover") }
  if (open) {
    Popup(onDismissRequest = { open = false }, alignment = Alignment.BottomStart) {
      Column(
        Modifier
          .background(KinetixTheme.colorPopover, RoundedCornerShape(8.dp))
          .border(1.dp, KinetixTheme.colorBorder, RoundedCornerShape(8.dp))
          .padding(16.dp),
      ) {
        Text("Dimensions", fontWeight = FontWeight.Medium)
        Text("Set the dimensions for the layer.", color = KinetixTheme.colorMutedForeground)
      }
    }
  }
}`,
    dart: `MenuAnchor(
  controller: menuController,
  menuChildren: [
    Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Dimensions', style: TextStyle(fontWeight: FontWeight.w500)),
          Text('Set the dimensions for the layer.',
            style: TextStyle(color: KinetixTheme.colorMutedForeground)),
        ],
      ),
    ),
  ],
  builder: (context, controller, _) => OutlinedButton(
    onPressed: controller.open,
    child: const Text('Open popover'),
  ),
)`,
  },

  "hover-card-demo": {
    html: `<a href="#" class="kx-hover-card__trigger">@kinetixui</a>
<div class="kx-hover-card" role="dialog">One token architecture, in motion across every platform.</div>
<!-- opens on hover (pointer); on touch it is a tap/long-press -->`,
    swift: `Text("@kinetixui")
  .foregroundStyle(Color(KinetixColor.colorPrimary))
  .popover(isPresented: $hovering) {           // pointer hover on iPadOS/macOS
    Text("One token architecture, in motion across every platform.")
      .padding(16)
      .presentationCompactAdaptation(.popover)
  }
  .onHover { hovering = $0 }`,
    kotlin: `// no hover on touch — use a long-press tooltip
TooltipBox(
  positionProvider = TooltipDefaults.rememberRichTooltipPositionProvider(),
  tooltip = {
    RichTooltip {
      Text("One token architecture, in motion across every platform.")
    }
  },
  state = rememberTooltipState(isPersistent = true),
) {
  Text("@kinetixui", color = KinetixTheme.colorPrimary)
}`,
    dart: `// no hover on touch — Tooltip triggers on long-press
Tooltip(
  message: 'One token architecture, in motion across every platform.',
  triggerMode: TooltipTriggerMode.longPress,
  child: Text('@kinetixui', style: TextStyle(color: KinetixTheme.colorPrimary)),
)`,
  },

  "dropdown-menu-demo": {
    html: `<div class="kx-dropdown-menu" role="menu">
  <span class="kx-dropdown-menu__label">My Account</span>
  <button role="menuitem">Profile</button>
  <button role="menuitem">Billing</button>
  <button role="menuitem">Team</button>
</div>`,
    swift: `Menu("Open") {
  Section("My Account") {
    Button("Profile") {}
    Button("Billing") {}
    Button("Team") {}
  }
}`,
    kotlin: `Box {
  OutlinedButton(onClick = { open = true }) { Text("Open") }
  DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
    Text("My Account", Modifier.padding(12.dp), style = MaterialTheme.typography.labelSmall)
    DropdownMenuItem(text = { Text("Profile") }, onClick = { open = false })
    DropdownMenuItem(text = { Text("Billing") }, onClick = { open = false })
    DropdownMenuItem(text = { Text("Team") }, onClick = { open = false })
  }
}`,
    dart: `PopupMenuButton<String>(
  child: const OutlinedButton(onPressed: null, child: Text('Open')),
  itemBuilder: (_) => const [
    PopupMenuItem(enabled: false, child: Text('My Account')),
    PopupMenuItem(value: 'profile', child: Text('Profile')),
    PopupMenuItem(value: 'billing', child: Text('Billing')),
    PopupMenuItem(value: 'team', child: Text('Team')),
  ],
  onSelected: (v) {},
)`,
  },

  "context-menu-demo": {
    html: `<div class="kx-context-menu__trigger">Right-click here</div>
<div class="kx-context-menu" role="menu">
  <button role="menuitem">Back</button>
  <button role="menuitem">Forward</button>
  <button role="menuitem">Reload</button>
</div>`,
    swift: `Text("Right-click here")
  .contextMenu {
    Button("Back") {}
    Button("Forward") {}
    Divider()
    Button("Reload") {}
  }`,
    kotlin: `Box {
  Text(
    "Right-click here",
    Modifier.pointerInput(Unit) {
      detectTapGestures(onLongPress = { open = true })
    },
  )
  DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
    DropdownMenuItem(text = { Text("Back") }, onClick = { open = false })
    DropdownMenuItem(text = { Text("Forward") }, onClick = { open = false })
    HorizontalDivider()
    DropdownMenuItem(text = { Text("Reload") }, onClick = { open = false })
  }
}`,
    dart: `GestureDetector(
  onSecondaryTapDown: (d) => showMenu(
    context: context,
    position: RelativeRect.fromLTRB(d.globalPosition.dx, d.globalPosition.dy, 0, 0),
    items: const [
      PopupMenuItem(value: 'back', child: Text('Back')),
      PopupMenuItem(value: 'forward', child: Text('Forward')),
      PopupMenuDivider(),
      PopupMenuItem(value: 'reload', child: Text('Reload')),
    ],
  ),
  child: const Text('Right-click here'),
)`,
  },

  "menubar-demo": {
    html: `<div class="kx-menubar" role="menubar">
  <button role="menuitem" aria-haspopup="true">File</button>
  <button role="menuitem" aria-haspopup="true">Edit</button>
</div>`,
    swift: `// SwiftUI app menu bar (macOS)
.commands {
  CommandMenu("File") {
    Button("New Tab") {}
    Button("New Window") {}
  }
  CommandMenu("Edit") {
    Button("Undo") {}
    Button("Redo") {}
  }
}`,
    kotlin: `Row {
  listOf("File" to fileOpen, "Edit" to editOpen).forEach { (label, state) ->
    Box {
      TextButton(onClick = { state.value = true }) { Text(label) }
      DropdownMenu(expanded = state.value, onDismissRequest = { state.value = false }) {
        DropdownMenuItem(text = { Text("New Tab") }, onClick = {})
        DropdownMenuItem(text = { Text("New Window") }, onClick = {})
      }
    }
  }
}`,
    dart: `MenuBar(
  children: [
    SubmenuButton(
      menuChildren: const [
        MenuItemButton(child: Text('New Tab')),
        MenuItemButton(child: Text('New Window')),
      ],
      child: const Text('File'),
    ),
    SubmenuButton(
      menuChildren: const [
        MenuItemButton(child: Text('Undo')),
        MenuItemButton(child: Text('Redo')),
      ],
      child: const Text('Edit'),
    ),
  ],
)`,
  },

  "list-demo": {
    html: `<ul class="kx-list">
  <li><span class="kx-list__title">Profile</span><span>Name, photo, and personal details</span></li>
  <li><span class="kx-list__title">Notifications</span></li>
</ul>
<!-- rows divided by var(--border) · icons var(--muted-foreground) -->`,
    swift: `List {
  ForEach(items) { item in
    HStack {
      Image(systemName: item.icon).foregroundStyle(Color(KinetixColor.colorMutedForeground))
      VStack(alignment: .leading) {
        Text(item.title)
        if let d = item.subtitle {
          Text(d).font(.caption).foregroundStyle(Color(KinetixColor.colorMutedForeground))
        }
      }
    }
  }
}`,
    kotlin: `LazyColumn {
  items(rows) { row ->
    ListItem(
      headlineContent = { Text(row.title) },
      supportingContent = row.subtitle?.let { { Text(it) } },
      leadingContent = { Icon(row.icon, null, tint = KinetixTheme.colorMutedForeground) },
      trailingContent = row.trailing,
    )
    HorizontalDivider(color = KinetixTheme.colorBorder)
  }
}`,
    dart: `ListView.separated(
  itemCount: rows.length,
  separatorBuilder: (_, __) => Divider(color: KinetixTheme.colorBorder, height: 1),
  itemBuilder: (_, i) => ListTile(
    leading: Icon(rows[i].icon, color: KinetixTheme.colorMutedForeground),
    title: Text(rows[i].title),
    subtitle: rows[i].subtitle == null ? null : Text(rows[i].subtitle!),
    trailing: rows[i].trailing,
    onTap: rows[i].onTap,
  ),
)`,
  },

  "scroll-area-demo": {
    html: `<div class="kx-scroll-area" style="height: 10rem; width: 14rem">
  <!-- content taller than the box; styled scrollbar -->
</div>`,
    swift: `ScrollView {
  VStack(alignment: .leading) {
    ForEach(0..<20) { Text("Tag \\($0 + 1)") }
  }
}
.frame(width: 224, height: 160)
.overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(KinetixColor.colorBorder)))`,
    kotlin: `Column(
  Modifier
    .size(width = 224.dp, height = 160.dp)
    .border(1.dp, KinetixTheme.colorBorder, RoundedCornerShape(8.dp))
    .verticalScroll(rememberScrollState())
    .padding(16.dp),
) {
  repeat(20) { Text("Tag \${it + 1}") }
}`,
    dart: `SizedBox(
  width: 224,
  height: 160,
  child: Scrollbar(
    child: ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 20,
      itemBuilder: (_, i) => Text('Tag \${i + 1}'),
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
    swift: `TabView(selection: $tab) {
  HomeView().tabItem { Label("Home", systemImage: "house") }.tag("home")
  SearchView().tabItem { Label("Search", systemImage: "magnifyingglass") }.tag("search")
  MailView().tabItem { Label("Mail", systemImage: "envelope") }.tag("mail").badge(3)
}
.tint(Color(KinetixColor.colorPrimary))`,
    kotlin: `NavigationBar(containerColor = KinetixTheme.colorBackground) {
  NavigationBarItem(
    selected = tab == "home", onClick = { tab = "home" },
    icon = { Icon(Icons.Default.Home, null) }, label = { Text("Home") },
    colors = NavigationBarItemDefaults.colors(selectedIconColor = KinetixTheme.colorPrimary),
  )
  NavigationBarItem(
    selected = tab == "mail", onClick = { tab = "mail" },
    icon = { BadgedBox(badge = { Badge { Text("3") } }) { Icon(Icons.Default.Email, null) } },
    label = { Text("Mail") },
  )
}`,
    dart: `NavigationBar(
  selectedIndex: index,
  onDestinationSelected: (i) => setState(() => index = i),
  indicatorColor: KinetixTheme.colorPrimary,
  destinations: const [
    NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Home'),
    NavigationDestination(icon: Icon(Icons.search), label: 'Search'),
    NavigationDestination(
      icon: Badge(label: Text('3'), child: Icon(Icons.mail_outline)), label: 'Mail'),
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
    swift: `NavigationStack {
  content
    .navigationTitle("Appointments")
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        Button { search() } label: { Image(systemName: "magnifyingglass") }
      }
    }
}`,
    kotlin: `TopAppBar(
  title = { Text("Appointments") },
  navigationIcon = {
    IconButton(onClick = ::back) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
  },
  actions = {
    IconButton(onClick = ::search) { Icon(Icons.Default.Search, "Search") }
  },
  colors = TopAppBarDefaults.topAppBarColors(
    containerColor = KinetixTheme.colorBackground,
    titleContentColor = KinetixTheme.colorForeground,
  ),
)`,
    dart: `AppBar(
  backgroundColor: KinetixTheme.colorBackground,
  foregroundColor: KinetixTheme.colorForeground,
  leading: BackButton(onPressed: back),
  title: const Text('Appointments'),
  actions: [IconButton(onPressed: search, icon: const Icon(Icons.search))],
)`,
  },

  "navigation-menu-demo": {
    html: `<nav class="kx-navigation-menu">
  <button aria-haspopup="true">Getting started</button>
  <div class="kx-navigation-menu__content" role="menu">
    <a href="#">Introduction</a><a href="#">Installation</a><a href="#">Theming</a>
  </div>
</nav>`,
    swift: `Menu("Getting started") {
  Button("Introduction") {}
  Button("Installation") {}
  Button("Theming") {}
}`,
    kotlin: `Box {
  TextButton(onClick = { open = true }) { Text("Getting started") }
  DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
    listOf("Introduction", "Installation", "Theming").forEach {
      DropdownMenuItem(text = { Text(it) }, onClick = { open = false })
    }
  }
}`,
    dart: `MenuAnchor(
  menuChildren: [
    for (final label in ['Introduction', 'Installation', 'Theming'])
      MenuItemButton(child: Text(label), onPressed: () {}),
  ],
  builder: (context, controller, _) => TextButton(
    onPressed: controller.open,
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
    swift: `NavigationSplitView {
  List(selection: $selection) {
    NavigationLink("Home", value: Screen.home)
    NavigationLink("Projects", value: Screen.projects)
  }
  .navigationTitle("KinetixUI")
} detail: {
  DetailView(for: selection)
}`,
    kotlin: `PermanentNavigationDrawer(
  drawerContent = {
    PermanentDrawerSheet(drawerContainerColor = KinetixTheme.colorSidebar) {
      NavigationDrawerItem(
        label = { Text("Home") }, selected = true, onClick = {},
        colors = NavigationDrawerItemDefaults.colors(
          selectedContainerColor = KinetixTheme.colorSidebarAccent),
      )
      NavigationDrawerItem(label = { Text("Projects") }, selected = false, onClick = {})
    }
  },
) {
  Scaffold(topBar = { TopAppBar(title = {}, navigationIcon = { /* SidebarTrigger */ }) }) { /* content */ }
}`,
    dart: `Row(
  children: [
    NavigationRail(
      backgroundColor: KinetixTheme.colorSidebar,
      selectedIndex: index,
      onDestinationSelected: (i) => setState(() => index = i),
      destinations: const [
        NavigationRailDestination(icon: Icon(Icons.home_outlined), label: Text('Home')),
        NavigationRailDestination(icon: Icon(Icons.folder_outlined), label: Text('Projects')),
      ],
    ),
    const VerticalDivider(width: 1),
    const Expanded(child: /* SidebarInset content */ SizedBox()),
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
    swift: `HStack(spacing: 0) {
  ForEach(Format.allCases, id: \\.self) { fmt in
    Toggle(isOn: binding(for: fmt)) { Image(systemName: fmt.icon) }
      .toggleStyle(.button)
  }
}
.tint(Color(KinetixColor.colorAccent))`,
    kotlin: `MultiChoiceSegmentedButtonRow {
  formats.forEachIndexed { i, fmt ->
    SegmentedButton(
      checked = fmt in selected,
      onCheckedChange = { toggle(fmt) },
      shape = SegmentedButtonDefaults.itemShape(i, formats.size),
      colors = SegmentedButtonDefaults.colors(
        activeContainerColor = KinetixTheme.colorAccent),
    ) { Icon(fmt.icon, null) }
  }
}`,
    dart: `SegmentedButton<Format>(
  multiSelectionEnabled: true,
  showSelectedIcon: false,
  selected: selected,
  onSelectionChanged: (s) => setState(() => selected = s),
  style: SegmentedButton.styleFrom(
    selectedBackgroundColor: KinetixTheme.colorAccent,
    selectedForegroundColor: KinetixTheme.colorAccentForeground,
  ),
  segments: const [
    ButtonSegment(value: Format.bold, icon: Icon(Icons.format_bold)),
    ButtonSegment(value: Format.italic, icon: Icon(Icons.format_italic)),
    ButtonSegment(value: Format.underline, icon: Icon(Icons.format_underlined)),
  ],
)`,
  },

  "table-demo": {
    html: `<table class="kx-table">
  <thead><tr><th>Invoice</th><th>Status</th><th>Amount</th></tr></thead>
  <tbody><tr><td>INV001</td><td>Paid</td><td>$250.00</td></tr></tbody>
</table>
<!-- header text: var(--muted-foreground) · rows divided by var(--border) -->`,
    swift: `Table(rows) {
  TableColumn("Invoice", value: \\.invoice)
  TableColumn("Status", value: \\.status)
  TableColumn("Amount", value: \\.amount)
}`,
    kotlin: `Column {
  Row(Modifier.fillMaxWidth()) {
    listOf("Invoice", "Status", "Amount").forEach {
      Text(it, Modifier.weight(1f), color = KinetixTheme.colorMutedForeground)
    }
  }
  rows.forEach { r ->
    Row(Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
      Text(r.invoice, Modifier.weight(1f))
      Text(r.status, Modifier.weight(1f))
      Text(r.amount, Modifier.weight(1f))
    }
    HorizontalDivider(color = KinetixTheme.colorBorder)
  }
}`,
    dart: `DataTable(
  headingTextStyle: TextStyle(color: KinetixTheme.colorMutedForeground),
  columns: const [
    DataColumn(label: Text('Invoice')),
    DataColumn(label: Text('Status')),
    DataColumn(label: Text('Amount')),
  ],
  rows: rows.map((r) => DataRow(cells: [
    DataCell(Text(r.invoice)), DataCell(Text(r.status)), DataCell(Text(r.amount)),
  ])).toList(),
)`,
  },

  "data-table-demo": {
    html: `<div class="kx-data-table">
  <table><!-- sortable headers, pagination controls --></table>
</div>`,
    swift: `Table(invoices, sortOrder: $sortOrder) {
  TableColumn("Invoice", value: \\.invoice)
  TableColumn("Status", value: \\.status)
  TableColumn("Amount", value: \\.amount)
}
.onChange(of: sortOrder) { invoices.sort(using: $1) }`,
    kotlin: `// LazyColumn + a header row; hoist sort/paging state yourself
LazyColumn {
  stickyHeader { DataTableHeader(columns, sortState, onSort = ::sortBy) }
  items(page) { row -> DataTableRow(row) }
  item { PaginationBar(page = pageIndex, onPage = ::goToPage) }
}`,
    dart: `PaginatedDataTable(
  header: const Text('Invoices'),
  rowsPerPage: 5,
  columns: const [
    DataColumn(label: Text('Invoice')),
    DataColumn(label: Text('Status')),
    DataColumn(label: Text('Amount'), numeric: true),
  ],
  source: InvoiceDataSource(invoices),
)`,
  },

  "stepper-demo": {
    html: `<ol class="kx-stepper">
  <li aria-current="step">Account</li>
  <li>Profile</li>
  <li>Review</li>
</ol>
<!-- current dot: var(--primary) · done: var(--primary) · todo: var(--muted) -->`,
    swift: `HStack(spacing: 8) {
  ForEach(Array(steps.enumerated()), id: \\.offset) { i, step in
    Circle()
      .fill(i <= current ? Color(KinetixColor.colorPrimary) : Color(KinetixColor.colorMuted))
      .frame(width: 20, height: 20)
    if i < steps.count - 1 {
      Rectangle().fill(Color(KinetixColor.colorMuted)).frame(height: 2)
    }
  }
}`,
    kotlin: `Row(verticalAlignment = Alignment.CenterVertically) {
  steps.forEachIndexed { i, _ ->
    Box(
      Modifier.size(20.dp).background(
        if (i <= current) KinetixTheme.colorPrimary else KinetixTheme.colorMuted,
        CircleShape,
      ),
    )
    if (i < steps.lastIndex) {
      HorizontalDivider(Modifier.weight(1f), color = KinetixTheme.colorMuted, thickness = 2.dp)
    }
  }
}`,
    dart: `Stepper(
  currentStep: current,
  onStepTapped: (i) => setState(() => current = i),
  steps: const [
    Step(title: Text('Account'), content: SizedBox()),
    Step(title: Text('Profile'), content: SizedBox()),
    Step(title: Text('Review'), content: SizedBox()),
  ],
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
    swift: `HStack(spacing: 4) {
  Button("‹") { page -= 1 }.disabled(page == 1)
  ForEach(1...totalPages, id: \\.self) { p in
    Button("\\(p)") { page = p }
      .buttonStyle(.bordered)
      .tint(p == page ? Color(KinetixColor.colorAccent) : .clear)
  }
  Button("›") { page += 1 }.disabled(page == totalPages)
}`,
    kotlin: `Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
  IconButton(onClick = { page-- }, enabled = page > 1) {
    Icon(Icons.AutoMirrored.Filled.ChevronLeft, "Previous")
  }
  (1..totalPages).forEach { p ->
    TextButton(
      onClick = { page = p },
      colors = ButtonDefaults.textButtonColors(
        containerColor = if (p == page) KinetixTheme.colorAccent else Color.Transparent),
    ) { Text("$p") }
  }
  IconButton(onClick = { page++ }, enabled = page < totalPages) {
    Icon(Icons.AutoMirrored.Filled.ChevronRight, "Next")
  }
}`,
    dart: `Row(
  mainAxisSize: MainAxisSize.min,
  children: [
    IconButton(onPressed: page > 1 ? () => setPage(page - 1) : null,
      icon: const Icon(Icons.chevron_left)),
    for (var p = 1; p <= totalPages; p++)
      TextButton(
        onPressed: () => setPage(p),
        style: TextButton.styleFrom(
          backgroundColor: p == page ? KinetixTheme.colorAccent : null),
        child: Text('$p'),
      ),
    IconButton(onPressed: page < totalPages ? () => setPage(page + 1) : null,
      icon: const Icon(Icons.chevron_right)),
  ],
)`,
  },

  "table-of-contents-demo": {
    html: `<nav class="kx-toc" aria-label="On this page">
  <a href="#overview">Overview</a>
  <a href="#props" aria-current="true" style="padding-left: 1rem">Props</a>
</nav>
<!-- active link: var(--foreground) · rest: var(--muted-foreground) -->`,
    swift: `VStack(alignment: .leading, spacing: 6) {
  ForEach(items) { item in
    Button(item.label) { scrollTo(item.id) }
      .buttonStyle(.plain)
      .padding(.leading, CGFloat((item.level - 1) * 12))
      .foregroundStyle(item.id == activeID
        ? Color(KinetixColor.colorForeground)
        : Color(KinetixColor.colorMutedForeground))
  }
}`,
    kotlin: `Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
  items.forEach { item ->
    Text(
      item.label,
      Modifier
        .padding(start = ((item.level - 1) * 12).dp)
        .clickable { scrollTo(item.id) },
      color = if (item.id == activeId) KinetixTheme.colorForeground
              else KinetixTheme.colorMutedForeground,
    )
  }
}`,
    dart: `Column(
  crossAxisAlignment: CrossAxisAlignment.start,
  children: items.map((item) {
    return Padding(
      padding: EdgeInsets.only(left: (item.level - 1) * 12.0),
      child: TextButton(
        onPressed: () => scrollTo(item.id),
        child: Text(item.label,
          style: TextStyle(
            color: item.id == activeId
              ? KinetixTheme.colorForeground
              : KinetixTheme.colorMutedForeground)),
      ),
    );
  }).toList(),
)`,
  },

  "footer-demo": {
    html: `<footer class="kx-footer">
  <div class="kx-footer__col"><h3>Product</h3><a href="#">Overview</a><a href="#">Pricing</a></div>
  <div class="kx-footer__bottom"><span>© 2026 Acme Inc.</span></div>
</footer>
<!-- surface: var(--muted) · links: var(--muted-foreground) -->`,
    swift: `VStack(alignment: .leading, spacing: 16) {
  HStack(alignment: .top, spacing: 24) {
    ForEach(columns) { col in
      VStack(alignment: .leading, spacing: 6) {
        Text(col.title).fontWeight(.medium)
        ForEach(col.links) { link in
          Button(link.label) {}.buttonStyle(.plain)
            .foregroundStyle(Color(KinetixColor.colorMutedForeground))
        }
      }
    }
  }
  Divider()
  Text("© 2026 Acme Inc.").foregroundStyle(Color(KinetixColor.colorMutedForeground))
}
.padding(24)
.background(Color(KinetixColor.colorMuted))`,
    kotlin: `Column(
  Modifier.background(KinetixTheme.colorMuted).padding(24.dp),
  verticalArrangement = Arrangement.spacedBy(16.dp),
) {
  Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
    columns.forEach { col ->
      Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(col.title, fontWeight = FontWeight.Medium)
        col.links.forEach {
          Text(it.label, color = KinetixTheme.colorMutedForeground,
            modifier = Modifier.clickable { open(it.href) })
        }
      }
    }
  }
  HorizontalDivider(color = KinetixTheme.colorBorder)
  Text("© 2026 Acme Inc.", color = KinetixTheme.colorMutedForeground)
}`,
    dart: `Container(
  color: KinetixTheme.colorMuted,
  padding: const EdgeInsets.all(24),
  child: Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Wrap(
        spacing: 24,
        children: columns.map((col) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(col.title, style: const TextStyle(fontWeight: FontWeight.w500)),
            ...col.links.map((l) => TextButton(
              onPressed: () => open(l.href),
              child: Text(l.label,
                style: TextStyle(color: KinetixTheme.colorMutedForeground)),
            )),
          ],
        )).toList(),
      ),
      Divider(color: KinetixTheme.colorBorder),
      Text('© 2026 Acme Inc.',
        style: TextStyle(color: KinetixTheme.colorMutedForeground)),
    ],
  ),
)`,
  },

  "inform-demo": {
    html: `<div class="kx-inform" data-variant="success" role="status">
  Your changes have been saved.
  <button aria-label="Dismiss">×</button>
</div>
<!-- success: var(--success) · warning: var(--warning) · error: var(--destructive) -->`,
    swift: `HStack {
  Image(systemName: "checkmark.circle.fill")
  Text("Your changes have been saved.")
  Spacer()
  Button { dismiss() } label: { Image(systemName: "xmark") }
}
.padding(12)
.background(Color(KinetixColor.colorSuccessContainer))
.foregroundStyle(Color(KinetixColor.colorSuccess))
.clipShape(RoundedRectangle(cornerRadius: 8))`,
    kotlin: `Row(
  Modifier
    .fillMaxWidth()
    .background(KinetixTheme.colorSemanticSuccessContainer, RoundedCornerShape(8.dp))
    .padding(12.dp),
  verticalAlignment = Alignment.CenterVertically,
) {
  Icon(Icons.Default.CheckCircle, null, tint = KinetixTheme.colorSuccess)
  Text("Your changes have been saved.", Modifier.weight(1f).padding(start = 8.dp))
  IconButton(onClick = ::dismiss) { Icon(Icons.Default.Close, "Dismiss") }
}`,
    dart: `MaterialBanner(
  backgroundColor: KinetixTheme.colorSemanticSuccessContainer,
  leading: Icon(Icons.check_circle, color: KinetixTheme.colorSuccess),
  content: const Text('Your changes have been saved.'),
  actions: [
    IconButton(onPressed: dismiss, icon: const Icon(Icons.close)),
  ],
)`,
  },

  "image-demo": {
    html: `<img class="kx-image" src="/photo.jpg" alt="" style="aspect-ratio: 1 / 1" />
<!-- radius: var(--radius) · object-fit: cover · skeleton while loading -->`,
    swift: `AsyncImage(url: URL(string: src)) { image in
  image.resizable().scaledToFill()
} placeholder: {
  Color(KinetixColor.colorMuted)
}
.aspectRatio(1, contentMode: .fill)
.clipShape(RoundedRectangle(cornerRadius: 8)) // --radius`,
    kotlin: `AsyncImage(               // coil-compose
  model = src,
  contentDescription = null,
  contentScale = ContentScale.Crop,
  modifier = Modifier
    .aspectRatio(1f)
    .clip(RoundedCornerShape(8.dp))
    .background(KinetixTheme.colorMuted),
)`,
    dart: `ClipRRect(
  borderRadius: BorderRadius.circular(8),
  child: AspectRatio(
    aspectRatio: 1,
    child: Image.network(
      src, fit: BoxFit.cover,
      loadingBuilder: (_, child, p) =>
        p == null ? child : ColoredBox(color: KinetixTheme.colorMuted),
    ),
  ),
)`,
  },

  "quote-demo": {
    html: `<figure class="kx-quote">
  <blockquote>This is exactly the token workflow our team needed.</blockquote>
  <figcaption><img src="/amira.jpg" alt="" /> Amira K. · Product Designer</figcaption>
</figure>
<!-- accent bar: var(--border) · caption: var(--muted-foreground) -->`,
    swift: `VStack(alignment: .leading, spacing: 12) {
  Text("\\u{201C}This is exactly the token workflow our team needed.\\u{201D}")
    .font(.title3)
  HStack {
    Circle().fill(Color(KinetixColor.colorMuted)).frame(width: 32, height: 32)
    Text("Amira K.").fontWeight(.medium)
    Text("· Product Designer").foregroundStyle(Color(KinetixColor.colorMutedForeground))
  }
}
.padding(.leading, 16)
.overlay(Rectangle().fill(Color(KinetixColor.colorBorder)).frame(width: 2), alignment: .leading)`,
    kotlin: `Column(
  Modifier
    .drawBehind {
      drawRect(border, size = Size(2.dp.toPx(), size.height))
    }
    .padding(start = 16.dp),
  verticalArrangement = Arrangement.spacedBy(12.dp),
) {
  Text("\\u201CThis is exactly the token workflow our team needed.\\u201D",
    style = MaterialTheme.typography.titleMedium)
  Row(verticalAlignment = Alignment.CenterVertically) {
    Box(Modifier.size(32.dp).background(KinetixTheme.colorMuted, CircleShape))
    Text(" Amira K. ", fontWeight = FontWeight.Medium)
    Text("· Product Designer", color = KinetixTheme.colorMutedForeground)
  }
}`,
    dart: `Container(
  padding: const EdgeInsets.only(left: 16),
  decoration: BoxDecoration(
    border: Border(left: BorderSide(color: KinetixTheme.colorBorder, width: 2)),
  ),
  child: Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text('“This is exactly the token workflow our team needed.”',
        style: TextStyle(fontSize: 18)),
      const SizedBox(height: 12),
      Row(children: [
        CircleAvatar(radius: 16, backgroundColor: KinetixTheme.colorMuted),
        const Text(' Amira K. ', style: TextStyle(fontWeight: FontWeight.w500)),
        Text('· Product Designer',
          style: TextStyle(color: KinetixTheme.colorMutedForeground)),
      ]),
    ],
  ),
)`,
  },

  "metric-demo": {
    html: `<div class="kx-metric">
  <span class="kx-metric__label">Active users</span>
  <span class="kx-metric__value">2,420</span>
  <span class="kx-metric__trend" data-trend="up">▲ 12%</span>
</div>
<!-- up: var(--success) · down: var(--destructive) -->`,
    swift: `VStack(alignment: .leading, spacing: 4) {
  Text("Active users").font(.caption).foregroundStyle(Color(KinetixColor.colorMutedForeground))
  Text("2,420").font(.title.bold())
  Label("12%", systemImage: "arrow.up")
    .font(.caption)
    .foregroundStyle(Color(KinetixColor.colorSuccess))
}`,
    kotlin: `Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
  Text("Active users", style = MaterialTheme.typography.labelMedium,
    color = KinetixTheme.colorMutedForeground)
  Text("2,420", style = MaterialTheme.typography.headlineSmall)
  Row(verticalAlignment = Alignment.CenterVertically) {
    Icon(Icons.Default.ArrowUpward, null, Modifier.size(14.dp), tint = KinetixTheme.colorSuccess)
    Text("12%", color = KinetixTheme.colorSuccess, style = MaterialTheme.typography.labelSmall)
  }
}`,
    dart: `Column(
  crossAxisAlignment: CrossAxisAlignment.start,
  children: [
    Text('Active users', style: TextStyle(fontSize: 12, color: KinetixTheme.colorMutedForeground)),
    const Text('2,420', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
    Row(children: [
      Icon(Icons.arrow_upward, size: 14, color: KinetixTheme.colorSuccess),
      Text(' 12%', style: TextStyle(fontSize: 12, color: KinetixTheme.colorSuccess)),
    ]),
  ],
)`,
  },

  "code-block-demo": {
    html: `<figure class="kx-code-block">
  <figcaption>button.tsx</figcaption>
  <pre><code>export function Button() { … }</code></pre>
  <button class="kx-code-block__copy" aria-label="Copy"></button>
</figure>
<!-- surface: var(--muted) · filename bar divided by var(--border) -->`,
    swift: `VStack(alignment: .leading, spacing: 0) {
  HStack {
    Text("button.tsx").font(.caption)
    Spacer()
    Button { UIPasteboard.general.string = source } label: { Image(systemName: "doc.on.doc") }
  }
  .padding(8)
  Divider()
  ScrollView(.horizontal) {
    Text(source).font(.system(.footnote, design: .monospaced)).padding(12)
  }
}
.background(Color(KinetixColor.colorMuted))
.clipShape(RoundedRectangle(cornerRadius: 8))`,
    kotlin: `Column(
  Modifier
    .clip(RoundedCornerShape(8.dp))
    .background(KinetixTheme.colorMuted),
) {
  Row(Modifier.fillMaxWidth().padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
    Text("button.tsx", Modifier.weight(1f), style = MaterialTheme.typography.labelSmall)
    IconButton(onClick = { clipboard.setText(AnnotatedString(source)) }) {
      Icon(Icons.Default.ContentCopy, "Copy")
    }
  }
  HorizontalDivider(color = KinetixTheme.colorBorder)
  Text(source, Modifier.horizontalScroll(rememberScrollState()).padding(12.dp),
    fontFamily = FontFamily.Monospace, style = MaterialTheme.typography.bodySmall)
}`,
    dart: `Container(
  decoration: BoxDecoration(
    color: KinetixTheme.colorMuted,
    borderRadius: BorderRadius.circular(8),
  ),
  child: Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Row(children: [
        const Expanded(child: Padding(
          padding: EdgeInsets.all(8), child: Text('button.tsx', style: TextStyle(fontSize: 12)))),
        IconButton(
          onPressed: () => Clipboard.setData(ClipboardData(text: source)),
          icon: const Icon(Icons.copy, size: 16)),
      ]),
      Divider(color: KinetixTheme.colorBorder, height: 1),
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Text(source, style: const TextStyle(fontFamily: 'monospace', fontSize: 13)),
        ),
      ),
    ],
  ),
)`,
  },

  "password-input-demo": {
    html: `<div class="kx-password-input">
  <input type="password" placeholder="••••••••" />
  <button type="button" aria-label="Show password"></button>
</div>`,
    swift: `HStack {
  if reveal { TextField("Password", text: $password) }
  else { SecureField("Password", text: $password) }
  Button { reveal.toggle() } label: {
    Image(systemName: reveal ? "eye.slash" : "eye")
      .foregroundStyle(Color(KinetixColor.colorMutedForeground))
  }
}
.padding(.horizontal, 12).padding(.vertical, 10)
.overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(KinetixColor.colorInput)))`,
    kotlin: `OutlinedTextField(
  value = password,
  onValueChange = { password = it },
  placeholder = { Text("Password") },
  visualTransformation = if (reveal) VisualTransformation.None else PasswordVisualTransformation(),
  trailingIcon = {
    IconButton(onClick = { reveal = !reveal }) {
      Icon(if (reveal) Icons.Default.VisibilityOff else Icons.Default.Visibility, null,
        tint = KinetixTheme.colorMutedForeground)
    }
  },
  colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = KinetixTheme.colorInput),
)`,
    dart: `TextField(
  obscureText: !reveal,
  decoration: InputDecoration(
    hintText: 'Password',
    enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: KinetixTheme.colorInput)),
    suffixIcon: IconButton(
      onPressed: () => setState(() => reveal = !reveal),
      icon: Icon(reveal ? Icons.visibility_off : Icons.visibility,
        color: KinetixTheme.colorMutedForeground),
    ),
  ),
)`,
  },

  "number-input-demo": {
    html: `<div class="kx-number-input" role="spinbutton" aria-valuenow="2">
  <button aria-label="Decrement">−</button>
  <input type="text" inputmode="numeric" value="2" />
  <button aria-label="Increment">+</button>
</div>
<!-- border: var(--input) -->`,
    swift: `Stepper(value: $quantity, in: 0...10) {
  Text("\\(quantity)")
}`,
    kotlin: `Row(
  Modifier.border(1.dp, KinetixTheme.colorInput, RoundedCornerShape(8.dp)),
  verticalAlignment = Alignment.CenterVertically,
) {
  IconButton(onClick = { if (qty > min) qty-- }) { Icon(Icons.Default.Remove, "Decrement") }
  Text("$qty", Modifier.widthIn(min = 32.dp), textAlign = TextAlign.Center)
  IconButton(onClick = { if (qty < max) qty++ }) { Icon(Icons.Default.Add, "Increment") }
}`,
    dart: `Row(
  mainAxisSize: MainAxisSize.min,
  children: [
    IconButton(
      onPressed: qty > min ? () => setState(() => qty--) : null,
      icon: const Icon(Icons.remove)),
    SizedBox(width: 32, child: Text('$qty', textAlign: TextAlign.center)),
    IconButton(
      onPressed: qty < max ? () => setState(() => qty++) : null,
      icon: const Icon(Icons.add)),
  ],
)`,
  },

  "fab-demo": {
    html: `<button class="kx-fab" aria-label="Add">＋</button>
<button class="kx-fab kx-fab--extended">＋ New item</button>
<!-- bg: var(--primary) · fg: var(--primary-foreground) · elevated -->`,
    swift: `Button { addItem() } label: {
  Image(systemName: "plus")
    .padding(16)
    .background(Color(KinetixColor.colorPrimary))
    .foregroundStyle(Color(KinetixColor.colorPrimaryForeground))
    .clipShape(Circle())
    .shadow(radius: 4)
}`,
    kotlin: `FloatingActionButton(
  onClick = ::addItem,
  containerColor = KinetixTheme.colorPrimary,
  contentColor = KinetixTheme.colorPrimaryForeground,
) {
  Icon(Icons.Default.Add, "Add")
}

// extended
ExtendedFloatingActionButton(
  onClick = ::addItem,
  icon = { Icon(Icons.Default.Add, null) },
  text = { Text("New item") },
  containerColor = KinetixTheme.colorPrimary,
)`,
    dart: `FloatingActionButton(
  onPressed: addItem,
  backgroundColor: KinetixTheme.colorPrimary,
  foregroundColor: KinetixTheme.colorPrimaryForeground,
  child: const Icon(Icons.add),
)

// extended
FloatingActionButton.extended(
  onPressed: addItem,
  backgroundColor: KinetixTheme.colorPrimary,
  icon: const Icon(Icons.add),
  label: const Text('New item'),
)`,
  },

  "date-picker-demo": {
    html: `<div class="kx-date-picker">
  <label>Appointment date</label>
  <button aria-haspopup="dialog">Pick a date</button>
  <p class="kx-date-picker__helper">Choose a weekday</p>
</div>`,
    swift: `DatePicker(
  "Appointment date",
  selection: $date,
  displayedComponents: .date
)
.datePickerStyle(.compact)`,
    kotlin: `val state = rememberDatePickerState()
OutlinedButton(onClick = { open = true }) {
  Text(state.selectedDateMillis?.let(::formatDate) ?: "Pick a date")
}
if (open) {
  DatePickerDialog(
    onDismissRequest = { open = false },
    confirmButton = { TextButton(onClick = { open = false }) { Text("OK") } },
  ) { DatePicker(state = state) }
}`,
    dart: `OutlinedButton(
  onPressed: () async {
    final picked = await showDatePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      initialDate: date ?? DateTime.now(),
    );
    if (picked != null) setState(() => date = picked);
  },
  child: Text(date == null ? 'Pick a date' : formatDate(date!)),
)`,
  },

  "calendar-demo": {
    html: `<div class="kx-calendar" role="grid">
  <!-- month header + 7-column day grid; selected day bg: var(--primary) -->
</div>`,
    swift: `DatePicker("", selection: $date, displayedComponents: .date)
  .datePickerStyle(.graphical)
  .tint(Color(KinetixColor.colorPrimary))`,
    kotlin: `DatePicker(
  state = rememberDatePickerState(),
  showModeToggle = false,
  colors = DatePickerDefaults.colors(
    selectedDayContainerColor = KinetixTheme.colorPrimary,
    todayDateBorderColor = KinetixTheme.colorPrimary,
  ),
)`,
    dart: `CalendarDatePicker(
  initialDate: date ?? DateTime.now(),
  firstDate: DateTime(2020),
  lastDate: DateTime(2030),
  onDateChanged: (d) => setState(() => date = d),
)`,
  },

  "carousel-demo": {
    html: `<div class="kx-carousel" role="region" aria-roledescription="carousel">
  <div class="kx-carousel__content"><div class="kx-carousel__item">1</div>…</div>
  <button aria-label="Previous"></button><button aria-label="Next"></button>
</div>`,
    swift: `TabView {
  ForEach(1...5, id: \\.self) { n in
    Text("\\(n)").font(.largeTitle.bold())
      .frame(maxWidth: .infinity)
      .aspectRatio(1, contentMode: .fit)
      .background(Color(KinetixColor.colorMuted))
      .clipShape(RoundedRectangle(cornerRadius: 8))
  }
}
.tabViewStyle(.page)`,
    kotlin: `val pager = rememberPagerState(pageCount = { 5 })
HorizontalPager(state = pager) { page ->
  Box(
    Modifier
      .fillMaxWidth()
      .aspectRatio(1f)
      .background(KinetixTheme.colorMuted, RoundedCornerShape(8.dp)),
    contentAlignment = Alignment.Center,
  ) { Text("\${page + 1}", style = MaterialTheme.typography.displaySmall) }
}`,
    dart: `PageView.builder(
  itemCount: 5,
  controller: PageController(viewportFraction: 0.8),
  itemBuilder: (_, i) => Container(
    margin: const EdgeInsets.all(4),
    decoration: BoxDecoration(
      color: KinetixTheme.colorMuted,
      borderRadius: BorderRadius.circular(8),
    ),
    child: Center(
      child: Text('\${i + 1}',
        style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold))),
  ),
)`,
  },

  "chart-demo": {
    html: `<figure class="kx-chart" style="--color-desktop: var(--chart-1); --color-mobile: var(--chart-2)">
  <svg><!-- bars --></svg>
</figure>
<!-- series colors: var(--chart-1) … var(--chart-5) -->`,
    swift: `import Charts

Chart(data) {
  BarMark(x: .value("Month", $0.month), y: .value("Desktop", $0.desktop))
    .foregroundStyle(Color(KinetixColor.colorChart1))
  BarMark(x: .value("Month", $0.month), y: .value("Mobile", $0.mobile))
    .foregroundStyle(Color(KinetixColor.colorChart2))
}`,
    kotlin: `// Compose has no first-party charts — Vico maps the tokens cleanly:
CartesianChartHost(
  rememberCartesianChart(
    rememberColumnCartesianLayer(
      ColumnCartesianLayer.ColumnProvider.series(
        rememberLineComponent(KinetixTheme.colorChart1),
        rememberLineComponent(KinetixTheme.colorChart2),
      ),
    ),
    startAxis = rememberStartAxis(),
    bottomAxis = rememberBottomAxis(),
  ),
  modelProducer,
)`,
    dart: `// fl_chart, coloured from the KinetixTheme chart ramp:
BarChart(BarChartData(
  barGroups: data.map((d) => BarChartGroupData(x: d.x, barRods: [
    BarChartRodData(toY: d.desktop, color: KinetixTheme.colorChart1),
    BarChartRodData(toY: d.mobile, color: KinetixTheme.colorChart2),
  ])).toList(),
))`,
  },

  "combobox-demo": {
    html: `<div class="kx-combobox">
  <input role="combobox" aria-expanded="false" placeholder="Search framework…" />
  <ul role="listbox"><li role="option">Next.js</li>…</ul>
</div>`,
    swift: `Menu {
  ForEach(filtered, id: \\.self) { Button($0) { selection = $0 } }
} label: {
  Text(selection ?? "Select framework…")
}
.searchable(text: $query)   // in a NavigationStack list, or use a custom field`,
    kotlin: `ExposedDropdownMenuBox(expanded = open, onExpandedChange = { open = it }) {
  OutlinedTextField(
    value = query, onValueChange = { query = it; open = true },
    placeholder = { Text("Search framework…") },
    modifier = Modifier.menuAnchor(),
  )
  ExposedDropdownMenu(expanded = open, onDismissRequest = { open = false }) {
    frameworks.filter { it.contains(query, ignoreCase = true) }.forEach {
      DropdownMenuItem(text = { Text(it) }, onClick = { selection = it; open = false })
    }
  }
}`,
    dart: `Autocomplete<String>(
  optionsBuilder: (v) => frameworks.where(
    (f) => f.toLowerCase().contains(v.text.toLowerCase())),
  onSelected: (v) => selection = v,
  fieldViewBuilder: (context, controller, focus, onSubmit) => TextField(
    controller: controller,
    focusNode: focus,
    decoration: const InputDecoration(hintText: 'Search framework…'),
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
    swift: `.sheet(isPresented: $showCommand) {
  NavigationStack {
    List {
      Section("Suggestions") {
        ForEach(results) { item in
          Button(item.label) { run(item) }
        }
      }
    }
    .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always))
  }
  .presentationDetents([.medium, .large])
}`,
    kotlin: `ModalBottomSheet(onDismissRequest = { open = false }) {
  Column {
    OutlinedTextField(
      value = query, onValueChange = { query = it },
      placeholder = { Text("Type a command or search…") },
      modifier = Modifier.fillMaxWidth().padding(16.dp),
    )
    LazyColumn {
      item { Text("Suggestions", Modifier.padding(16.dp), style = MaterialTheme.typography.labelSmall) }
      items(results) { item ->
        ListItem(headlineContent = { Text(item.label) },
          modifier = Modifier.clickable { run(item) })
      }
    }
  }
}`,
    dart: `showModalBottomSheet(
  context: context,
  isScrollControlled: true,
  builder: (_) => Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      const Padding(
        padding: EdgeInsets.all(16),
        child: TextField(decoration: InputDecoration(hintText: 'Type a command or search…')),
      ),
      ...results.map((r) => ListTile(title: Text(r.label), onTap: () => run(r))),
    ],
  ),
)`,
  },

  "field-demo": {
    html: `<div class="kx-field" data-invalid="true">
  <label>Email</label>
  <input type="email" aria-invalid="true" />
  <p class="kx-field__description">We'll only use it to send receipts.</p>
  <p class="kx-field__message" data-intent="error">Enter a valid email address.</p>
</div>`,
    swift: `VStack(alignment: .leading, spacing: 6) {
  Text("Email").fontWeight(.medium)
  TextField("you@example.com", text: $email)
    .overlay(RoundedRectangle(cornerRadius: 8)
      .stroke(invalid ? Color(KinetixColor.colorDestructive) : Color(KinetixColor.colorInput)))
  Text(invalid ? "Enter a valid email address." : "We'll only use it to send receipts.")
    .font(.caption)
    .foregroundStyle(invalid ? Color(KinetixColor.colorDestructive) : Color(KinetixColor.colorMutedForeground))
}`,
    kotlin: `Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
  OutlinedTextField(
    value = email, onValueChange = { email = it },
    label = { Text("Email") },
    isError = invalid,
    supportingText = {
      Text(if (invalid) "Enter a valid email address."
           else "We'll only use it to send receipts.")
    },
    colors = OutlinedTextFieldDefaults.colors(
      errorBorderColor = KinetixTheme.colorDestructive,
      unfocusedBorderColor = KinetixTheme.colorInput,
    ),
  )
}`,
    dart: `TextField(
  onChanged: (v) => setState(() => invalid = !v.contains('@')),
  decoration: InputDecoration(
    labelText: 'Email',
    helperText: "We'll only use it to send receipts.",
    errorText: invalid ? 'Enter a valid email address.' : null,
    enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: KinetixTheme.colorInput)),
    errorBorder: OutlineInputBorder(borderSide: BorderSide(color: KinetixTheme.colorDestructive)),
  ),
)`,
  },

  "form-demo": {
    html: `<form class="kx-form">
  <label for="username">Username</label>
  <input id="username" />
  <p class="kx-form__description">This is your public display name.</p>
  <button type="submit" class="kx-btn--primary">Submit</button>
</form>`,
    swift: `Form {
  Section {
    TextField("Username", text: $username)
    Text("This is your public display name.")
      .font(.caption).foregroundStyle(Color(KinetixColor.colorMutedForeground))
  }
  Button("Submit") { submit() }
    .buttonStyle(.borderedProminent)
    .tint(Color(KinetixColor.colorPrimary))
}`,
    kotlin: `Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
  OutlinedTextField(
    value = username, onValueChange = { username = it },
    label = { Text("Username") },
    supportingText = { Text("This is your public display name.") },
    isError = error != null,
  )
  Button(
    onClick = ::submit,
    colors = ButtonDefaults.buttonColors(containerColor = KinetixTheme.colorPrimary),
  ) { Text("Submit") }
}`,
    dart: `Form(
  key: formKey,
  child: Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      TextFormField(
        decoration: const InputDecoration(
          labelText: 'Username',
          helperText: 'This is your public display name.',
        ),
        validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
      ),
      const SizedBox(height: 16),
      FilledButton(
        onPressed: () { if (formKey.currentState!.validate()) submit(); },
        child: const Text('Submit'),
      ),
    ],
  ),
)`,
  },

  "input-group-demo": {
    html: `<div class="kx-input-group">
  <span class="kx-input-group__text">https://</span>
  <input placeholder="kinetixui.com" />
</div>
<!-- addon bg: var(--muted) · border: var(--input) -->`,
    swift: `HStack(spacing: 0) {
  Text("https://")
    .padding(.horizontal, 10).padding(.vertical, 10)
    .background(Color(KinetixColor.colorMuted))
  TextField("kinetixui.com", text: $url)
    .padding(.horizontal, 10)
}
.overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(KinetixColor.colorInput)))`,
    kotlin: `OutlinedTextField(
  value = url,
  onValueChange = { url = it },
  placeholder = { Text("kinetixui.com") },
  prefix = { Text("https://", color = KinetixTheme.colorMutedForeground) },
  colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = KinetixTheme.colorInput),
)`,
    dart: `TextField(
  decoration: InputDecoration(
    hintText: 'kinetixui.com',
    prefixIcon: Container(
      alignment: Alignment.center,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      color: KinetixTheme.colorMuted,
      child: const Text('https://'),
    ),
    prefixIconConstraints: const BoxConstraints(minWidth: 0),
    border: OutlineInputBorder(borderSide: BorderSide(color: KinetixTheme.colorInput)),
  ),
)`,
  },

  "input-otp-demo": {
    html: `<div class="kx-input-otp" role="group" aria-label="One-time code">
  <input maxlength="1" /><input maxlength="1" /><input maxlength="1" />
  <input maxlength="1" /><input maxlength="1" /><input maxlength="1" />
</div>
<!-- active slot ring: var(--ring) -->`,
    swift: `HStack(spacing: 8) {
  ForEach(0..<6, id: \\.self) { i in
    Text(code.count > i ? String(Array(code)[i]) : "")
      .frame(width: 40, height: 48)
      .overlay(RoundedRectangle(cornerRadius: 8)
        .stroke(i == code.count ? Color(KinetixColor.colorRing) : Color(KinetixColor.colorInput)))
  }
}
.overlay(TextField("", text: $code).keyboardType(.numberPad).opacity(0.01))`,
    kotlin: `BasicTextField(
  value = code,
  onValueChange = { if (it.length <= 6) code = it },
  keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
  decorationBox = {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
      repeat(6) { i ->
        Box(
          Modifier
            .size(width = 40.dp, height = 48.dp)
            .border(
              1.dp,
              if (i == code.length) KinetixTheme.colorRing else KinetixTheme.colorInput,
              RoundedCornerShape(8.dp),
            ),
          contentAlignment = Alignment.Center,
        ) { Text(code.getOrNull(i)?.toString() ?: "") }
      }
    }
  },
)`,
    dart: `// package: pinput
Pinput(
  length: 6,
  onCompleted: (pin) => verify(pin),
  defaultPinTheme: PinTheme(
    width: 40, height: 48,
    decoration: BoxDecoration(
      border: Border.all(color: KinetixTheme.colorInput),
      borderRadius: BorderRadius.circular(8),
    ),
  ),
  focusedPinTheme: PinTheme(
    width: 40, height: 48,
    decoration: BoxDecoration(
      border: Border.all(color: KinetixTheme.colorRing),
      borderRadius: BorderRadius.circular(8),
    ),
  ),
)`,
  },

  "file-upload-demo": {
    html: `<div class="kx-file-upload">
  <button>Choose files</button><span>PDF, PNG up to 5 MB</span>
  <ul class="kx-file-upload__list"><li>passport-scan.pdf<button aria-label="Remove"></button></li></ul>
</div>`,
    swift: `Button("Choose files") { showImporter = true }
  .fileImporter(isPresented: $showImporter, allowedContentTypes: [.pdf, .png], allowsMultipleSelection: true) {
    if case .success(let urls) = $0 { files.append(contentsOf: urls) }
  }
// then list files with a remove button per row`,
    kotlin: `val picker = rememberLauncherForActivityResult(
  ActivityResultContracts.GetMultipleContents(),
) { uris -> files = files + uris }

OutlinedButton(onClick = { picker.launch("application/pdf") }) { Text("Choose files") }
Text("PDF, PNG up to 5 MB", color = KinetixTheme.colorMutedForeground)
files.forEach { uri ->
  ListItem(
    headlineContent = { Text(uri.lastPathSegment ?: "file") },
    trailingContent = {
      IconButton(onClick = { files = files - uri }) { Icon(Icons.Default.Close, "Remove") }
    },
  )
}`,
    dart: `// package: file_picker
OutlinedButton(
  onPressed: () async {
    final result = await FilePicker.platform.pickFiles(
      allowMultiple: true, type: FileType.custom, allowedExtensions: ['pdf', 'png']);
    if (result != null) setState(() => files.addAll(result.files));
  },
  child: const Text('Choose files'),
)
// then a ListView of files with an IconButton(Icons.close) to remove`,
  },

  "resizable-demo": {
    html: `<div class="kx-resizable" data-direction="horizontal">
  <div class="kx-resizable__panel">One</div>
  <div class="kx-resizable__handle" role="separator" aria-orientation="vertical"></div>
  <div class="kx-resizable__panel">Two</div>
</div>
<!-- desktop / web split-pane pattern -->`,
    swift: `// no native split-pane on iOS — a draggable divider:
HStack(spacing: 0) {
  PaneOne().frame(width: leftWidth)
  Rectangle().fill(Color(KinetixColor.colorBorder)).frame(width: 6)
    .gesture(DragGesture().onChanged { leftWidth += $0.translation.width })
  PaneTwo()
}`,
    kotlin: `// no first-party split-pane — drag a Box divider and hoist the weight:
Row(Modifier.fillMaxWidth()) {
  Box(Modifier.weight(leftWeight)) { PaneOne() }
  Box(
    Modifier
      .width(6.dp)
      .fillMaxHeight()
      .background(KinetixTheme.colorBorder)
      .pointerInput(Unit) {
        detectHorizontalDragGestures { _, drag -> leftWeight += drag / totalWidth }
      },
  )
  Box(Modifier.weight(1f - leftWeight)) { PaneTwo() }
}`,
    dart: `// package: multi_split_view
MultiSplitView(
  axis: Axis.horizontal,
  children: const [PaneOne(), PaneTwo()],
  dividerBuilder: (_, __, ___, ____, _____, ______) =>
    Container(color: KinetixTheme.colorBorder, width: 6),
)`,
  },

  "sonner-demo": {
    html: `<div class="kx-toaster" aria-live="polite">
  <div class="kx-toast">
    <strong>Event created</strong>
    <span>Sunday, December 03 at 9:00 AM</span>
  </div>
</div>`,
    swift: `// SwiftUI has no toast — overlay a transient view:
.overlay(alignment: .bottom) {
  if let toast {
    VStack(alignment: .leading) {
      Text(toast.title).fontWeight(.medium)
      Text(toast.description).font(.caption)
        .foregroundStyle(Color(KinetixColor.colorMutedForeground))
    }
    .padding()
    .background(Color(KinetixColor.colorPopover), in: RoundedRectangle(cornerRadius: 12))
    .shadow(radius: 8)
    .transition(.move(edge: .bottom).combined(with: .opacity))
    .task { try? await Task.sleep(for: .seconds(4)); self.toast = nil }
  }
}`,
    kotlin: `val snackbarHostState = remember { SnackbarHostState() }
Scaffold(snackbarHost = { SnackbarHost(snackbarHostState) }) { /* content */ }

// anywhere:
scope.launch {
  snackbarHostState.showSnackbar("Event created — Sunday, December 03 at 9:00 AM")
}`,
    dart: `ScaffoldMessenger.of(context).showSnackBar(
  SnackBar(
    backgroundColor: KinetixTheme.colorPopover,
    content: const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('Event created', style: TextStyle(fontWeight: FontWeight.w500)),
        Text('Sunday, December 03 at 9:00 AM'),
      ],
    ),
  ),
)`,
  },

  "rating-demo": {
    html: `<div class="kx-rating" role="radiogroup" aria-label="Rating">
  <button role="radio" aria-checked="true" aria-label="1 star">★</button>
  <button role="radio" aria-label="2 stars">★</button>
</div>
<!-- filled star: var(--primary) · empty: var(--muted) -->`,
    swift: `HStack(spacing: 4) {
  ForEach(1...5, id: \\.self) { i in
    Image(systemName: i <= value ? "star.fill" : "star")
      .foregroundStyle(i <= value ? Color(KinetixColor.colorPrimary) : Color(KinetixColor.colorMuted))
      .onTapGesture { value = i }
  }
}`,
    kotlin: `Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
  (1..5).forEach { i ->
    Icon(
      if (i <= value) Icons.Default.Star else Icons.Default.StarBorder,
      contentDescription = "$i stars",
      tint = if (i <= value) KinetixTheme.colorPrimary else KinetixTheme.colorMuted,
      modifier = Modifier.clickable { value = i },
    )
  }
}`,
    dart: `Row(
  mainAxisSize: MainAxisSize.min,
  children: List.generate(5, (i) => IconButton(
    onPressed: () => setState(() => value = i + 1),
    icon: Icon(
      i < value ? Icons.star : Icons.star_border,
      color: i < value ? KinetixTheme.colorPrimary : KinetixTheme.colorMuted,
    ),
  )),
)`,
  },

  "audio-player-demo": {
    html: `<figure class="kx-audio-player">
  <audio src="/audio/song.mp3"></audio>
  <button aria-label="Play"></button>
  <input type="range" class="kx-audio-player__seek" />
  <span>SoundHelix Song 1 · Artist</span>
</figure>`,
    swift: `// AVFoundation
private let player = AVPlayer(url: URL(string: src)!)

HStack {
  Button { playing ? player.pause() : player.play(); playing.toggle() } label: {
    Image(systemName: playing ? "pause.fill" : "play.fill")
  }
  Slider(value: $progress, in: 0...duration) { editing in if !editing { seek(progress) } }
    .tint(Color(KinetixColor.colorPrimary))
  Text("SoundHelix Song 1")
}`,
    kotlin: `// Media3 ExoPlayer
val player = remember { ExoPlayer.Builder(context).build().apply {
  setMediaItem(MediaItem.fromUri(src)); prepare()
} }

Row(verticalAlignment = Alignment.CenterVertically) {
  IconButton(onClick = { if (player.isPlaying) player.pause() else player.play() }) {
    Icon(if (player.isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow, null)
  }
  Slider(
    value = position, onValueChange = { player.seekTo(it.toLong()) },
    valueRange = 0f..duration,
    colors = SliderDefaults.colors(activeTrackColor = KinetixTheme.colorPrimary),
  )
}`,
    dart: `// package: just_audio
final player = AudioPlayer()..setUrl(src);

Row(children: [
  IconButton(
    onPressed: () => player.playing ? player.pause() : player.play(),
    icon: Icon(player.playing ? Icons.pause : Icons.play_arrow),
  ),
  Expanded(child: Slider(
    value: position.inSeconds.toDouble(),
    max: duration.inSeconds.toDouble(),
    onChanged: (v) => player.seek(Duration(seconds: v.toInt())),
    activeColor: KinetixTheme.colorPrimary,
  )),
]),`,
  },
};
