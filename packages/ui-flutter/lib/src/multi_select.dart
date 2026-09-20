import 'package:flutter/material.dart';

import 'app_text.dart';
import 'input.dart';
import 'popover.dart';
import 'tag.dart';
import 'theme.dart';

/// Mirrors `packages/ui/src/components/multi-select.tsx`: a
/// Combobox-like field that keeps multiple [KinetixTag] chips, with a
/// `creatable` free-entry mode. Built directly on [KinetixPopover] with
/// [KinetixInput] as the search field — no new text-entry mechanism.
/// Chips wrap onto multiple lines via [Wrap] — unlike the SwiftUI port,
/// which scrolls a single row, Flutter has a real flow-layout widget to
/// lean on. Filtering is a plain `contains` check — the web version's
/// `cmdk`-driven search has no Flutter equivalent to lean on.
class KinetixMultiSelectOption {
  const KinetixMultiSelectOption(this.value, this.label);

  final String value;
  final String label;
}

class KinetixMultiSelect extends StatefulWidget {
  const KinetixMultiSelect({
    super.key,
    required this.options,
    required this.selected,
    required this.onSelectedChange,
    this.placeholder = 'Select…',
    this.creatable = false,
  });

  final List<KinetixMultiSelectOption> options;
  final Set<String> selected;
  final ValueChanged<Set<String>> onSelectedChange;
  final String placeholder;
  final bool creatable;

  @override
  State<KinetixMultiSelect> createState() => _KinetixMultiSelectState();
}

class _KinetixMultiSelectState extends State<KinetixMultiSelect> {
  bool _open = false;
  final TextEditingController _controller = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _toggle(String value) {
    final next = Set<String>.from(widget.selected);
    if (next.contains(value)) {
      next.remove(value);
    } else {
      next.add(value);
    }
    widget.onSelectedChange(next);
  }

  String _labelFor(String value) {
    for (final option in widget.options) {
      if (option.value == value) return option.label;
    }
    return value;
  }

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final trimmed = _query.trim();
    final canCreate = widget.creatable &&
        trimmed.isNotEmpty &&
        !widget.options.any((o) => o.label.toLowerCase() == trimmed.toLowerCase());
    final visibleOptions = widget.creatable
        ? widget.options.where((o) => o.label.toLowerCase().contains(trimmed.toLowerCase())).toList()
        : widget.options;

    return KinetixPopover(
      visible: _open,
      onDismiss: () => setState(() => _open = false),
      anchor: GestureDetector(
        onTap: () => setState(() => _open = true),
        child: Container(
          constraints: const BoxConstraints(minHeight: 44),
          padding: const EdgeInsets.all(12), // spacing/3
          decoration: BoxDecoration(
            border: Border.all(color: c.border),
            borderRadius: BorderRadius.circular(4), // radius/sm
          ),
          child: Wrap(
            spacing: 6, // gap-1.5, off-scale — same call as KinetixBadge
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              if (widget.selected.isEmpty)
                Text(widget.placeholder, style: AppText.bodySm.copyWith(color: c.mutedForeground)),
              for (final value in widget.selected)
                KinetixTag(_labelFor(value), variant: KinetixTagVariant.secondary, onRemove: () => _toggle(value)),
            ],
          ),
        ),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minWidth: 240, maxHeight: 320),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            KinetixInput(
              controller: _controller,
              placeholder: 'Search…',
              onChanged: (v) => setState(() => _query = v),
            ),
            const SizedBox(height: 8), // spacing/2
            Flexible(
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (visibleOptions.isEmpty)
                      canCreate
                          ? GestureDetector(
                              onTap: () {
                                _toggle(trimmed);
                                _controller.clear();
                                setState(() => _query = '');
                              },
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                child: Text('Create "$trimmed"', style: AppText.bodySm.copyWith(color: c.foreground)),
                              ),
                            )
                          : Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              child: Text('No results.', style: AppText.bodySm.copyWith(color: c.mutedForeground)),
                            ),
                    for (final option in visibleOptions)
                      GestureDetector(
                        onTap: () => _toggle(option.value),
                        behavior: HitTestBehavior.opaque,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 16,
                                child: Text(
                                  widget.selected.contains(option.value) ? '✓' : '',
                                  style: TextStyle(color: c.action),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(option.label, style: AppText.bodySm.copyWith(color: c.foreground)),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
