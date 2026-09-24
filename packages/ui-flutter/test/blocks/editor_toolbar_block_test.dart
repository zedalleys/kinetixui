import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Editor toolbar" block — see testimonial_block_test.dart for how block fixtures work.
//
// Two kinds of choice, two controls: the mode is one-of-two and swaps the surface, so it is a segmented
// control; the marks combine, so they are a toggle group. The marks disable in Preview, because offering a
// formatting action when there is nothing to format is offering an action that cannot happen.
//
// kx-block:start
class EditorFormat {
  const EditorFormat(this.id, this.name, this.glyph, this.shortcut);
  final String id;
  final String name;
  final String glyph;
  final String shortcut;
}

const List<EditorFormat> kEditorFormats = <EditorFormat>[
  EditorFormat('bold', 'Bold', 'B', 'B'),
  EditorFormat('italic', 'Italic', 'I', 'I'),
  EditorFormat('code', 'Code', '</>', 'E'),
];

class EditorToolbarBlock extends StatefulWidget {
  const EditorToolbarBlock({super.key});

  @override
  State<EditorToolbarBlock> createState() => _EditorToolbarBlockState();
}

class _EditorToolbarBlockState extends State<EditorToolbarBlock> {
  String _mode = 'write';
  final Set<String> _marks = <String>{'bold'};

  @override
  Widget build(BuildContext context) {
    final bool editing = _mode == 'write';

    return Padding(
      padding: const EdgeInsets.all(8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Row(
            children: <Widget>[
              KinetixSegmentedControl(
                children: <Widget>[
                  KinetixSegmentedControlItem(
                    'Write',
                    selected: editing,
                    onTap: () => setState(() => _mode = 'write'),
                  ),
                  KinetixSegmentedControlItem(
                    'Preview',
                    selected: !editing,
                    onTap: () => setState(() => _mode = 'preview'),
                  ),
                ],
              ),
              const Spacer(),
              KinetixToggleGroup(
                children: kEditorFormats.map((EditorFormat format) {
                  final bool on = _marks.contains(format.id);
                  // The name is the announcement; the glyph is decoration. Without this, TalkBack reads the
                  // letter "B", which is not the name of anything.
                  return Semantics(
                    label: format.name,
                    excludeSemantics: true,
                    toggled: on,
                    enabled: editing,
                    child: KinetixToggleGroupItem(
                      pressed: on,
                      onChanged: editing
                          ? (bool value) => setState(() => value ? _marks.add(format.id) : _marks.remove(format.id))
                          : null,
                      child: Text(format.glyph),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: kEditorFormats.map((EditorFormat format) {
              return Padding(
                padding: const EdgeInsets.only(right: 16),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    KinetixFieldDescription(format.name),
                    const SizedBox(width: 6),
                    const KinetixKbd('⌘'),
                    const SizedBox(width: 2),
                    KinetixKbd(format.shortcut),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
// kx-block:end

void main() {
  testWidgets('formatting is named, and switches off with the editor', (WidgetTester tester) async {
    final SemanticsHandle handle = tester.ensureSemantics();
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: EditorToolbarBlock())),
        ),
      ),
    );

    expect(find.bySemanticsLabel('Bold'), findsOneWidget);

    await tester.tap(find.text('Preview'));
    await tester.pump();
    expect(tester.getSemantics(find.bySemanticsLabel('Bold')), isSemantics(hasEnabledState: true, isEnabled: false));

    handle.dispose();
  });
}
