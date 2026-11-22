import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Appointment booking" block — see testimonial_block_test.dart for how block fixtures work.
//
// Flutter has no TimeSlotPicker, so the slots are a KinetixRadioGroup of KinetixRadioButtons. That is the
// same contract as the React version's Radix RadioGroup and the Angular version's native radios: one
// mutually-exclusive group, one choice. KinetixRadioButton already declares `inMutuallyExclusiveGroup` and
// `checked`, so the state is in the semantics tree rather than only in the tint.
//
// What this platform states for itself:
//
//   naming       KinetixRadioButton is `container: true`, so a sibling Text CANNOT name it (its own
//                documentation says so). The time is therefore passed as the radio's `label` and the
//                visible copy is wrapped in ExcludeSemantics, which is the pattern that widget asks for.
//                Without this a slot is announced as "radio button, checked" with no time at all.
//   unavailable  `onTap: null` disables it AND the word "Unavailable" is part of the label. A dimmed tile
//                with no word is announced only as "disabled".
//   announcement the outcome is a live region that is ALWAYS in the tree, holding text only once there is
//                an outcome. A live region inserted together with its first text often announces nothing,
//                which is the same trap the React, Angular and Compose versions each handle.
//
// Directional padding throughout, so the block mirrors in RTL without a direction flag.
//
// Times are shown exactly as supplied with the zone named; nothing here converts a time zone.
//
// Everything below is fictional: no real clinician, patient, facility or price.
//
// kx-block:start
class AppointmentSlot {
  const AppointmentSlot(this.value, this.label, {this.unavailable = false, this.note});
  final String value;
  final String label;
  final bool unavailable;
  final String? note;
}

class AppointmentPeriod {
  const AppointmentPeriod(this.label, this.slots);
  final String label;
  final List<AppointmentSlot> slots;
}

const List<AppointmentPeriod> kAppointmentPeriods = <AppointmentPeriod>[
  AppointmentPeriod('Morning', <AppointmentSlot>[
    AppointmentSlot('2026-04-07T09:00', '09:00'),
    AppointmentSlot('2026-04-07T09:30', '09:30', unavailable: true),
    AppointmentSlot('2026-04-07T10:15', '10:15'),
    AppointmentSlot('2026-04-07T11:00', '11:00', note: 'Last morning slot'),
  ]),
  AppointmentPeriod('Afternoon', <AppointmentSlot>[
    AppointmentSlot('2026-04-07T13:30', '13:30', unavailable: true),
    AppointmentSlot('2026-04-07T14:00', '14:00'),
    AppointmentSlot('2026-04-07T15:45', '15:45'),
  ]),
];

const List<(String, String, bool)> kAppointmentFacts = <(String, String, bool)>[
  ('Date', 'Tuesday 7 April 2026', false),
  ('Length', '25 minutes', false),
  ('Joining', 'Video link, sent after confirmation', false),
  (
    'Changes',
    'Free to move or cancel up to 24 hours before. After that a missed-visit fee applies.',
    true,
  ),
];

class AppointmentBookingBlock extends StatefulWidget {
  const AppointmentBookingBlock({super.key});

  @override
  State<AppointmentBookingBlock> createState() => _AppointmentBookingBlockState();
}

class _AppointmentBookingBlockState extends State<AppointmentBookingBlock> {
  String? _selected;
  String? _booked;

  String? get _bookedLabel {
    final String? booked = _booked;
    if (booked == null) return null;
    for (final AppointmentPeriod period in kAppointmentPeriods) {
      for (final AppointmentSlot slot in period.slots) {
        if (slot.value == booked) return slot.label;
      }
    }
    return booked;
  }

  @override
  Widget build(BuildContext context) {
    final String? bookedLabel = _bookedLabel;

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
                        KinetixCardTitle('Book an appointment'),
                        KinetixCardDescription('Dr Lina Okafor · Cardiology review'),
                      ],
                    ),
                  ),
                  // A word, not a colour.
                  const KinetixTag('Telehealth', variant: KinetixTagVariant.secondary),
                ],
              ),
            ],
          ),
          KinetixCardContent(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                KinetixDescriptionList(
                  children: kAppointmentFacts
                      .map(((String, String, bool) fact) => KinetixDescriptionListItem(
                            term: fact.$1,
                            layout: fact.$3
                                ? KinetixDescriptionListLayout.stacked
                                : KinetixDescriptionListLayout.row,
                            child: Text(fact.$2),
                          ))
                      .toList(),
                ),
                // Always in the tree, so the region exists before the text arrives. Empty until then, so
                // nothing is announced on first build.
                Semantics(
                  liveRegion: true,
                  child: Text(
                    bookedLabel == null
                        ? ''
                        : 'Appointment confirmed for Tuesday 7 April 2026 at $bookedLabel, '
                            'with Dr Lina Okafor.',
                  ),
                ),
                if (bookedLabel != null)
                  _Outcome(
                    label: bookedLabel,
                    onChooseAnother: () => setState(() {
                      _booked = null;
                      _selected = null;
                    }),
                  )
                else
                  ..._picker(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _picker() {
    return <Widget>[
      const Text('Available times'),
      // Shown, never converted: a time in the wrong zone is worse than one with no zone.
      const Text('Times in Riyadh (GMT+3)'),
      KinetixRadioGroup(
        label: 'Available times, times in Riyadh GMT+3',
        children: <Widget>[
          for (final AppointmentPeriod period in kAppointmentPeriods) ...<Widget>[
            Text(period.label),
            for (final AppointmentSlot slot in period.slots) _slot(slot),
          ],
        ],
      ),
      // Wrap, not Row. In a Row neither child is flexible, so Flutter measures both at their
      // unconstrained width; at 200% text on a phone that exceeds what KinetixCardContent's horizontal
      // padding leaves, the row overflows, and KinetixCard's Clip.antiAlias then clips the sentence that
      // explains why Confirm is disabled rather than letting it wrap. The reader is left with a dead
      // button and no reason. Wrap puts the sentence on its own line instead. The React and Angular
      // ports already wrap this row; Flutter did not. Found by Codex's exact-head review of e28bb73.
      Wrap(
        spacing: 12,
        runSpacing: 8,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: <Widget>[
          KinetixButton(
            // `null` is the disabled treatment, and the reason is written beside it rather than guessed.
            onPressed: _selected == null ? null : () => setState(() => _booked = _selected),
            child: const Text('Confirm appointment'),
          ),
          if (_selected == null) const Text('Choose a time to continue.'),
        ],
      ),
    ];
  }

  Widget _slot(AppointmentSlot slot) {
    // The radio is `container: true`, so its name must come from `label` — a neighbouring Text cannot
    // name it. The WORD "Unavailable" goes in the label too, not only into the dimming.
    final String name = <String?>[
      slot.label,
      if (slot.note != null) slot.note,
      if (slot.unavailable) 'Unavailable',
    ].whereType<String>().join(', ');

    return Padding(
      padding: const EdgeInsetsDirectional.only(bottom: 4),
      child: Row(
        children: <Widget>[
          KinetixRadioButton(
            selected: _selected == slot.value,
            onTap: slot.unavailable ? null : () => setState(() => _selected = slot.value),
            label: name,
          ),
          // Excluded, because the radio above already carries exactly these words as its name. Without
          // this the time would be announced twice.
          ExcludeSemantics(
            child: Padding(
              padding: const EdgeInsetsDirectional.only(start: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    slot.label,
                    style: TextStyle(
                      decoration: slot.unavailable ? TextDecoration.lineThrough : null,
                    ),
                  ),
                  if (slot.note != null) Text(slot.note!),
                  if (slot.unavailable) const Text('Unavailable'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Outcome extends StatelessWidget {
  const _Outcome({required this.label, required this.onChooseAnother});
  final String label;
  final VoidCallback onChooseAnother;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        const Text('Appointment confirmed'),
        Text(
          'Tuesday 7 April 2026 at $label, with Dr Lina Okafor. The video link is on its way.',
        ),
        const Text('Booking reference KX-4C19B'),
        KinetixButton(
          onPressed: onChooseAnother,
          variant: KinetixButtonVariant.outline,
          child: const Text('Choose another time'),
        ),
      ],
    );
  }
}
// kx-block:end

void main() {
  // kx-verify-block: accessibility
  testWidgets('an unavailable slot says so in its name and confirm explains why it is disabled',
      (WidgetTester tester) async {
    final SemanticsHandle handle = tester.ensureSemantics();
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: AppointmentBookingBlock())),
        ),
      ),
    );

    // The slot's name comes from the radio's own label, because the radio is its own container and a
    // neighbouring Text cannot name it.
    expect(find.bySemanticsLabel('09:00'), findsOneWidget);
    // The unavailable slot carries the word, so it is not conveyed by dimming alone.
    expect(find.bySemanticsLabel('09:30, Unavailable'), findsOneWidget);
    // The zone is stated, not converted.
    expect(find.text('Times in Riyadh (GMT+3)'), findsOneWidget);
    // The sentence that explains the disabled action is present.
    expect(find.text('Choose a time to continue.'), findsOneWidget);

    handle.dispose();
  });

  // kx-verify-block: interaction
  testWidgets('choosing a time then confirming reports the time that was taken',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: AppointmentBookingBlock())),
        ),
      ),
    );

    await tester.tap(find.bySemanticsLabel('10:15'));
    await tester.pumpAndSettle();
    // The block is taller than the 800x600 test surface, so Confirm sits below the fold of the
    // SingleChildScrollView and a bare tap() lands on nothing. Scrolling it into view first is what a
    // person does too; without it the warning is only a warning and the failure arrives later, at the
    // assertion, reading as if the outcome were wrong rather than the tap.
    await tester.ensureVisible(find.text('Confirm appointment'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Confirm appointment'));
    await tester.pumpAndSettle();

    // The outcome names the time that was chosen, not a slot id.
    expect(find.text('Appointment confirmed'), findsOneWidget);
    expect(
      find.text(
        'Tuesday 7 April 2026 at 10:15, with Dr Lina Okafor. The video link is on its way.',
      ),
      findsOneWidget,
    );

    // Returning to the picker clears the choice, so the block cannot show a stale confirmation.
    await tester.ensureVisible(find.text('Choose another time'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Choose another time'));
    await tester.pumpAndSettle();
    expect(find.text('Choose a time to continue.'), findsOneWidget);
  });

  // kx-verify-block: accessibility
  testWidgets('the reason Confirm is disabled survives a phone width at 200% text',
      (WidgetTester tester) async {
    // WCAG 1.4.4: at 200% text nothing may be lost. The confirmation row used to be a Row with no
    // flexible child, so the sentence explaining the disabled button was clipped away by the card's
    // own Clip.antiAlias and the reader got a dead button with no reason. The 800x600 default surface
    // cannot see this; a phone width with doubled text can.
    tester.view.physicalSize = const Size(390, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    // The exception alone says only "A RenderFlex overflowed by N pixels": it does not say WHICH one, and
    // this block has several horizontal rows. Capturing the details instead means a red here names the
    // widget that caused it, which is the difference between a gate and a puzzle.
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
                child: const Scaffold(body: SingleChildScrollView(child: AppointmentBookingBlock())),
              ),
            ),
          ),
        ),
      );
    } finally {
      FlutterError.onError = previousOnError;
    }

    // Nothing may overflow: an overflow at this width and scale means content is being clipped away.
    expect(overflows, isEmpty, reason: overflows.join('\n\n'));
    expect(tester.takeException(), isNull);
    final Finder reason = find.text('Choose a time to continue.');
    expect(reason, findsOneWidget);
    // Present is not enough: the words must be inside the surface, not clipped off its edge.
    final Rect box = tester.getRect(reason);
    expect(box.left, greaterThanOrEqualTo(0));
    expect(box.right, lessThanOrEqualTo(390));
    expect(box.width, greaterThan(0));
  });

  // The negative control for the test above, executed rather than described: the SAME two children in
  // the unwrapped Row this block used to have, at the same width and text scale. If this did not
  // overflow, the test above would be asserting nothing — it would pass for a layout that never had the
  // problem. This container has no Flutter toolchain, so CI is where both of these first run.
  testWidgets('control: the same row without wrapping does overflow at that width and scale',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(390, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: Builder(
            builder: (BuildContext context) => MediaQuery(
              data: MediaQuery.of(context).copyWith(textScaler: const TextScaler.linear(2.0)),
              child: const Scaffold(
                body: KinetixCard(
                  child: KinetixCardContent(
                    child: Row(
                      children: <Widget>[
                        KinetixButton(
                          onPressed: null,
                          child: Text('Confirm appointment'),
                        ),
                        Padding(
                          padding: EdgeInsetsDirectional.only(start: 12),
                          child: Text('Choose a time to continue.'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );

    final Object? thrown = tester.takeException();
    expect(thrown, isNotNull);
    expect(thrown.toString(), contains('overflowed'));
  });

}
