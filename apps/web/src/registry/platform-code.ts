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
};
