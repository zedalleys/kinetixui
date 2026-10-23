import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Boarding pass" block — see testimonial_block_test.dart for how block fixtures work.
//
// Flutter has no PassCard, so this is the same anatomy composed from the primitives it does have: a card, a
// fact grid, a dashed tear line, the supplied code and a footer. The shared contract is the anatomy and the
// semantics, not the component names.
//
// Every value is supplied: the block looks nothing up, converts no time zone and encodes nothing. The code
// is a fixed placeholder pattern on its own opaque white quiet zone — a real pass passes in the image the
// product or the issuer generated, and the block never inverts it for a dark theme because a scanner needs
// dark modules on light. The readable confirmation code is printed beneath it, so the pass still works when
// the code will not scan.
//
// The route is words ('Riyadh (RUH) to Cairo (CAI)'), not an arrow, so it reads correctly in both
// directions, and the layout uses directional padding so it mirrors in RTL. Gate, seat and group are
// emphasised because they are what a traveller looks for at a glance. Each field is one merged node, so
// 'Gate, C21' is announced together. The copy result goes into a live region that is always present —
// including when the clipboard refuses, so the block never claims a copy that did not happen.
//
// All data here is fictional, Kinetix Air included.
//
// kx-block:start
class BoardingField {
  const BoardingField(this.label, this.value, {this.emphasised = false});
  final String label;
  final String value;
  final bool emphasised;
}

const List<BoardingField> kBoardingFields = <BoardingField>[
  BoardingField('Passenger', 'Amira Haddad'),
  BoardingField('Flight', 'KX 1180'),
  BoardingField('Boards', '2 Apr, 06:15'),
  BoardingField('Gate', 'C21', emphasised: true),
  BoardingField('Seat', '9A', emphasised: true),
  BoardingField('Group', '3', emphasised: true),
];

const String kConfirmationCode = 'KX7F2Q9';

/// A stand-in for the code the product supplies: a fixed pattern, not an encoding of anything.
const List<String> kCodePattern = <String>[
  '###.#.###',
  '#.#...#.#',
  '###.#.###',
  '...#.#...',
  '#.##..##.',
  '..#.#.#..',
  '###.##.#.',
  '#.#..#.##',
  '###.#.#..',
];

const List<FontFeature> kPassTabularFigures = <FontFeature>[FontFeature.tabularFigures()];

class BoardingPassBlock extends StatefulWidget {
  const BoardingPassBlock({super.key});

  @override
  State<BoardingPassBlock> createState() => _BoardingPassBlockState();
}

class _BoardingPassBlockState extends State<BoardingPassBlock> {
  String _feedback = '';

  Future<void> _copy() async {
    String message;
    try {
      await Clipboard.setData(const ClipboardData(text: kConfirmationCode));
      message = 'Copied';
    } catch (_) {
      // Say so rather than pretend: the code is still selectable text.
      message = "Couldn't copy automatically. Select the code to copy it.";
    }
    if (!mounted) return;
    setState(() => _feedback = message);
  }

  @override
  Widget build(BuildContext context) {
    final Color muted = KinetixTheme.of(context).mutedForeground;

    return KinetixCard(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const KinetixCardHeader(
            children: <Widget>[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        KinetixCardTitle('Boarding pass'),
                        SizedBox(height: 6),
                        KinetixCardDescription('Kinetix Air · Riyadh (RUH) to Cairo (CAI)'),
                      ],
                    ),
                  ),
                  SizedBox(width: 12),
                  // A word, not a colour.
                  KinetixTag('Boarding', variant: KinetixTagVariant.secondary),
                ],
              ),
            ],
          ),
          KinetixCardContent(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                // Two rows of three: the fields wrap rather than truncate when the text scales.
                for (final List<BoardingField> row in <List<BoardingField>>[
                  kBoardingFields.sublist(0, 3),
                  kBoardingFields.sublist(3),
                ])
                  Padding(
                    padding: const EdgeInsetsDirectional.only(bottom: 16),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        for (final BoardingField field in row)
                          Expanded(child: _FieldCell(field)),
                      ],
                    ),
                  ),
                // The tear line between the pass and its stub.
                const KinetixSeparator(),
                const SizedBox(height: 16),
                Center(
                  child: Column(
                    children: <Widget>[
                      const _CodeImage(),
                      const SizedBox(height: 8),
                      Text('Confirmation code', style: TextStyle(color: muted, fontSize: 12)),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: <Widget>[
                          const Flexible(
                            child: SelectableText(
                              kConfirmationCode,
                              style: TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w600),
                            ),
                          ),
                          const SizedBox(width: 12),
                          // Named after what it copies; onTap keeps the action reachable through the
                          // semantics node.
                          Semantics(
                            label: 'Copy confirmation code',
                            button: true,
                            excludeSemantics: true,
                            onTap: _copy,
                            child: KinetixButton(
                              onPressed: _copy,
                              variant: KinetixButtonVariant.outline,
                              size: KinetixButtonSize.sm,
                              child: const Text('Copy'),
                            ),
                          ),
                        ],
                      ),
                      // Always present, so the result is announced when it arrives.
                      Semantics(
                        liveRegion: true,
                        child: Text(_feedback, style: TextStyle(color: muted, fontSize: 12)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          KinetixCardFooter(
            children: <Widget>[
              Text(
                'The gate closes 20 minutes before departure.',
                style: TextStyle(color: muted, fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _FieldCell extends StatelessWidget {
  const _FieldCell(this.field);
  final BoardingField field;

  @override
  Widget build(BuildContext context) {
    final Color muted = KinetixTheme.of(context).mutedForeground;
    // One node: 'Gate, C21'.
    return MergeSemantics(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(field.label, style: TextStyle(color: muted, fontSize: 12)),
          const SizedBox(height: 2),
          Text(
            field.value,
            style: TextStyle(
              fontSize: field.emphasised ? 22 : 15,
              fontWeight: field.emphasised ? FontWeight.w600 : FontWeight.w500,
              fontFeatures: kPassTabularFigures,
            ),
          ),
        ],
      ),
    );
  }
}

class _CodeImage extends StatelessWidget {
  const _CodeImage();

  @override
  Widget build(BuildContext context) {
    // Named once, as one element: the modules themselves carry no meaning.
    return Semantics(
      label: 'Boarding pass QR code',
      image: true,
      excludeSemantics: true,
      child: Container(
        color: Colors.white,
        padding: const EdgeInsets.all(8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            for (final String row in kCodePattern)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  for (final String cell in row.split(''))
                    Container(
                      width: 12,
                      height: 12,
                      color: cell == '#' ? Colors.black : Colors.white,
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
// kx-block:end

void main() {
  // kx-verify-block: accessibility
  testWidgets('the status is a word, each field is one node, and the code image is named',
      (WidgetTester tester) async {
    final SemanticsHandle handle = tester.ensureSemantics();
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: BoardingPassBlock())),
        ),
      ),
    );

    expect(find.text('Boarding'), findsOneWidget);
    expect(find.bySemanticsLabel('Boarding pass QR code'), findsOneWidget);
    expect(find.bySemanticsLabel('Copy confirmation code'), findsOneWidget);
    expect(find.text(kConfirmationCode), findsOneWidget);
    // The label and its value are one merged node, so they are announced together.
    expect(tester.getSemantics(find.text('Gate')).label, contains('C21'));
    expect(tester.getSemantics(find.text('Seat')).label, contains('9A'));

    handle.dispose();
  });

  // kx-verify-block: interaction
  testWidgets('copying the confirmation code announces its own result', (WidgetTester tester) async {
    final List<MethodCall> clipboardCalls = <MethodCall>[];
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform,
        (MethodCall call) async {
      if (call.method == 'Clipboard.setData') clipboardCalls.add(call);
      return null;
    });
    addTearDown(() => tester.binding.defaultBinaryMessenger
        .setMockMethodCallHandler(SystemChannels.platform, null));

    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: BoardingPassBlock())),
        ),
      ),
    );

    await tester.tap(find.bySemanticsLabel('Copy confirmation code'));
    await tester.pumpAndSettle();

    expect(clipboardCalls, hasLength(1));
    expect((clipboardCalls.single.arguments as Map<Object?, Object?>)['text'], kConfirmationCode);
    // The block says what happened rather than staying silent.
    expect(find.text('Copied'), findsOneWidget);
  });
}
