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
  swift: "SwiftUI",
  kotlin: "Compose",
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
};
