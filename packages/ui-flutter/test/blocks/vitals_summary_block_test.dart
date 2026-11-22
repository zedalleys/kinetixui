import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Observations summary" block — see testimonial_block_test.dart for how block fixtures work.
//
// The same contract as the web versions: each reading's name bound to its value, the status as a WORD, the
// reference range printed in full, and freshness plus source stated in the header before the values.
//
// Two platform-specific obligations:
//
//   spoken units  'mmHg' and '°C' are read as letters by TalkBack and VoiceOver, so each reading is one
//                 `Semantics` node whose label spells the unit while the visible text keeps the symbol.
//                 A nurse reading wants the symbol; a nurse listening wants the word. The visible copy is
//                 wrapped in ExcludeSemantics, because otherwise the symbols would be announced as well.
//   not a table   this is a reading panel, not a data table, so it is not KinetixDataTable. A table would
//                 promise row and column navigation that means nothing where every row is the same pair.
//
// The block never decides what is abnormal. Ranges and the status word arrive as data, because 'normal' is
// the care team's, agronomist's or engineer's judgement.
//
// Directional padding throughout, so the panel mirrors in RTL without a direction flag.
//
// Every reading, person, device and facility below is invented. No real patient record and no clinical
// advice; the block fetches nothing.
//
// kx-block:start
class VitalReading {
  const VitalReading(
    this.label,
    this.value,
    this.unit,
    this.spokenUnit,
    this.range, {
    this.status = '',
  });

  final String label;
  final String value;

  /// The symbol, as it is shown.
  final String unit;

  /// The same unit in words, for a screen reader.
  final String spokenUnit;
  final String range;

  /// Empty when the reading is inside its range and needs no tag.
  final String status;

  /// The reading as it should be heard: spelled unit, the status word, then the range.
  String get spoken => <String>[
        label,
        '$value $spokenUnit',
        if (status.isNotEmpty) status,
        'reference $range',
      ].join(', ');
}

const List<VitalReading> kVitalReadings = <VitalReading>[
  VitalReading('Blood pressure', '148/92', 'mmHg', 'millimetres of mercury', '90/60 to 120/80',
      status: 'High'),
  VitalReading('Heart rate', '76', 'bpm', 'beats per minute', '60 to 100'),
  VitalReading('Temperature', '37.1', '°C', 'degrees Celsius', '36.1 to 37.2'),
  VitalReading('Oxygen saturation', '94', '%', 'percent', '95 to 100', status: 'Low'),
  VitalReading('Respiratory rate', '18', 'breaths/min', 'breaths per minute', '12 to 20'),
  VitalReading('Weight', '81.4', 'kg', 'kilograms', 'Recorded, not ranged'),
];

class VitalsSummaryBlock extends StatelessWidget {
  const VitalsSummaryBlock({super.key});

  @override
  Widget build(BuildContext context) {
    final int outside = kVitalReadings.where((VitalReading r) => r.status.isNotEmpty).length;

    return KinetixCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          KinetixCardHeader(
            children: <Widget>[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const <Widget>[
                        KinetixCardTitle('Observations'),
                        // Freshness and source before the values: a panel of stale numbers looks exactly
                        // like a live one.
                        KinetixCardDescription(
                          'Recorded 7 Apr 2026, 08:12 · Ward round, bedside monitor',
                        ),
                      ],
                    ),
                  ),
                  // Flexible, not bare: at 200% text this one tag is 361px wide against the 342px the
                  // card's padding leaves, so the Row overflowed by 19px and the word "Nurse-recorded"
                  // was clipped — the provenance of every number below it, lost. Flexible caps its width
                  // and lets the word wrap inside it.
                  const Flexible(
                    child: KinetixTag('Nurse-recorded', variant: KinetixTagVariant.secondary),
                  ),
                ],
              ),
            ],
          ),
          KinetixCardContent(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                for (final VitalReading reading in kVitalReadings) _ReadingRow(reading: reading),
                Text(
                  '$outside of ${kVitalReadings.length} outside their reference range. '
                  'Ranges are set by the care team.',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ReadingRow extends StatelessWidget {
  const _ReadingRow({required this.reading});
  final VitalReading reading;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      // The spoken form is not the visible form: the unit is spelled here and kept as a symbol on screen.
      label: reading.spoken,
      child: ExcludeSemantics(
        child: Padding(
          padding: const EdgeInsetsDirectional.only(bottom: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(reading.label),
              // Wrap, not Row: the reading and its status word are both inflexible, and at 200% text the
              // pair ran 93px past the card, which clipped the status away. The status word is the whole
              // point of the row — a number with its "High" cut off reads as a number in range. Wrapping
              // puts it on the line below instead of losing it.
              Wrap(
                spacing: 8,
                runSpacing: 4,
                crossAxisAlignment: WrapCrossAlignment.end,
                children: <Widget>[
                  Text('${reading.value} ${reading.unit}'),
                  // A word first. The tag's tone is the second channel, never the only one.
                  if (reading.status.isNotEmpty)
                    KinetixTag(reading.status, variant: KinetixTagVariant.warning),
                ],
              ),
              // Printed in full, so the judgement can be checked rather than trusted.
              Text('Reference: ${reading.range}'),
              const KinetixSeparator(),
            ],
          ),
        ),
      ),
    );
  }
}
// kx-block:end

void main() {
  // kx-verify-block: accessibility
  testWidgets('each reading is one node whose unit is spoken in words and whose status is a word',
      (WidgetTester tester) async {
    final SemanticsHandle handle = tester.ensureSemantics();
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: VitalsSummaryBlock())),
        ),
      ),
    );

    // The spoken form spells the unit rather than leaving 'mmHg' to be read as letters, and carries the
    // status word and the range with it — one node, not six loose strings.
    expect(
      find.bySemanticsLabel(
        'Blood pressure, 148/92 millimetres of mercury, High, reference 90/60 to 120/80',
      ),
      findsOneWidget,
    );
    // A reading inside its range carries no status word, and still spells its unit.
    expect(
      find.bySemanticsLabel('Temperature, 37.1 degrees Celsius, reference 36.1 to 37.2'),
      findsOneWidget,
    );
    // The visible text keeps the symbol, and is excluded from semantics so it is not announced twice.
    expect(find.text('37.1 °C'), findsOneWidget);

    handle.dispose();
  });

  // kx-verify-block: accessibility
  testWidgets('the count outside range is derived and the header states freshness and source',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: VitalsSummaryBlock())),
        ),
      ),
    );

    // Two of these six carry a status, and the sentence is derived from the data rather than typed.
    expect(
      find.text(
        '2 of 6 outside their reference range. Ranges are set by the care team.',
      ),
      findsOneWidget,
    );
    expect(
      find.text('Recorded 7 Apr 2026, 08:12 · Ward round, bedside monitor'),
      findsOneWidget,
    );
  });

  // kx-verify-block: accessibility
  testWidgets('nothing is clipped away at a phone width with 200% text',
      (WidgetTester tester) async {
    // WCAG 1.4.4. The default 800x600 test surface cannot see this class of defect at all: the sibling
    // booking block overflowed by 166px here while every one of its other tests passed. Capturing the
    // error details rather than only the exception means this red names the widget that caused it.
    tester.view.physicalSize = const Size(390, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final List<String> overflows = <String>[];
    final void Function(FlutterErrorDetails)? previousOnError = FlutterError.onError;
    FlutterError.onError = (FlutterErrorDetails details) => overflows.add(details.toString());
    try {
      await tester.pumpWidget(
        MaterialApp(
          home: KinetixTheme(
            brightness: Brightness.light,
            child: Builder(
              builder: (BuildContext context) => MediaQuery(
                data: MediaQuery.of(context).copyWith(textScaler: const TextScaler.linear(2.0)),
                child: const Scaffold(body: SingleChildScrollView(child: VitalsSummaryBlock())),
              ),
            ),
          ),
        ),
      );
    } finally {
      FlutterError.onError = previousOnError;
    }

    expect(overflows, isEmpty, reason: overflows.join('\n\n'));
    expect(tester.takeException(), isNull);
  });
}
