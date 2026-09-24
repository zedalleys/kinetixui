import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Filter panel" block — see testimonial_block_test.dart for how block fixtures work.
//
// The active filters appear as tags AND as ticked rows: the tags are the fast way to undo one thing, the
// rows are the full set. Both drive ONE piece of state — two lists that can disagree is the classic bug in
// this pattern, so the block does not have two.
//
// kx-block:start
class FilterOption {
  const FilterOption(this.id, this.label);
  final String id;
  final String label;
}

const List<FilterOption> kFilterOptions = <FilterOption>[
  FilterOption('stock', 'In stock'),
  FilterOption('sale', 'On sale'),
  FilterOption('shipping', 'Free shipping'),
];

class FilterPanelBlock extends StatefulWidget {
  const FilterPanelBlock({super.key});

  @override
  State<FilterPanelBlock> createState() => _FilterPanelBlockState();
}

class _FilterPanelBlockState extends State<FilterPanelBlock> {
  double _price = 250;
  final Set<String> _active = <String>{'stock'};

  void _toggle(String id) => setState(() => _active.contains(id) ? _active.remove(id) : _active.add(id));

  @override
  Widget build(BuildContext context) {
    final List<FilterOption> activeOptions =
        kFilterOptions.where((FilterOption o) => _active.contains(o.id)).toList();

    return KinetixCard(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          KinetixCardHeader(
            children: <Widget>[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: <Widget>[
                  const KinetixCardTitle('Filters'),
                  KinetixButton(
                    onPressed: _active.isEmpty ? null : () => setState(_active.clear),
                    variant: KinetixButtonVariant.ghost,
                    size: KinetixButtonSize.sm,
                    child: const Text('Clear all'),
                  ),
                ],
              ),
            ],
          ),
          KinetixCardContent(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                if (activeOptions.isNotEmpty)
                  Wrap(
                    spacing: 8,
                    children: activeOptions
                        .map((FilterOption o) => KinetixTag(
                              o.label,
                              variant: KinetixTagVariant.secondary,
                              onRemove: () => _toggle(o.id),
                            ))
                        .toList(),
                  ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: <Widget>[
                    const KinetixLabel('Maximum price'),
                    // Visible, not a bubble on the thumb: a value that only exists while dragging cannot be
                    // read by anyone who is not dragging.
                    KinetixLabel('\$${_price.round()}'),
                  ],
                ),
                const SizedBox(height: 12),
                Semantics(
                  label: 'Maximum price',
                  value: '\$${_price.round()}',
                  child: KinetixSlider(
                    value: _price,
                    onChanged: (double v) => setState(() => _price = v),
                    max: 500,
                  ),
                ),
                const SizedBox(height: 20),
                const KinetixSeparator(),
                const SizedBox(height: 20),
                const KinetixLabel('Availability'),
                const SizedBox(height: 12),
                ...kFilterOptions.map((FilterOption option) {
                  final bool on = _active.contains(option.id);
                  return MergeSemantics(
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        children: <Widget>[
                          KinetixCheckbox(value: on, onChanged: (_) => _toggle(option.id)),
                          const SizedBox(width: 12),
                          Expanded(child: Text(option.label)),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
// kx-block:end

void main() {
  testWidgets('a tag says what it removes, and removing it unticks the row', (WidgetTester tester) async {
    final SemanticsHandle handle = tester.ensureSemantics();
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: FilterPanelBlock())),
        ),
      ),
    );

    expect(find.bySemanticsLabel('Remove In stock'), findsOneWidget);

    await tester.ensureVisible(find.bySemanticsLabel('Remove In stock'));
    await tester.pumpAndSettle();
    await tester.tap(find.bySemanticsLabel('Remove In stock'));
    await tester.pump();

    // One piece of state: dismissing the tag is the same operation as unticking the row.
    expect(find.bySemanticsLabel('Remove In stock'), findsNothing);
    expect(tester.getSemantics(find.text('In stock')), isSemantics(isChecked: false, hasCheckedState: true));

    handle.dispose();
  });
}
