import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Shipment tracking" block — see testimonial_block_test.dart for how block fixtures work.
//
// The same contract as the web versions: the consignment's facts, the tracking number the reader will
// quote, the ask stated once, and a history whose exception is visible as an exception.
//
// TWO REAL DIVERGENCES, written down rather than papered over. Both are limits of this platform's
// Timeline, not of the block, and both are recorded in M5.26's five-platform matrix:
//
//   no status      KinetixTimelineItem is title, time and content and nothing else — there is no status
//                  rung here, where React's Timeline has six. Each event's state is therefore carried by
//                  WORDS in its own content ('Needs attention'), which is what WCAG 1.4.1 asks for anyway
//                  and what the web versions also do on top of their markers.
//   no per-event   KinetixTimeline takes a list of value objects, not widgets, so nothing can be placed
//   action         inside one event. React puts 'Choose a new date' on the attempt that needs it; here the
//                  action sits directly under the Inform that states the ask, keeping it with its reason.
//
// Neither is fixed here: widening a published component's API is a change of its own.
//
// Directional padding throughout, so the block mirrors in RTL without a direction flag.
//
// Every time is shown exactly as supplied with its zone named. Nothing here converts a time zone: a parcel
// scanned at 18:40 local is a different fact from 18:40 in the reader's zone.
//
// No real carrier, consignment, address or person. Events arrive as data; the block tracks nothing.
//
// kx-block:start
const String kTrackingNumber = 'KXF-7731-2048';

const List<KinetixTimelineItem> kShipmentEvents = <KinetixTimelineItem>[
  KinetixTimelineItem('Collected', time: '2 Apr, 09:04', content: 'Kinetix Freight depot, Jeddah'),
  KinetixTimelineItem('In transit', time: '3 Apr, 21:17', content: 'Departed sorting hub, Riyadh'),
  KinetixTimelineItem('Out for delivery', time: '5 Apr, 07:52', content: 'On vehicle KX-418'),
  // The state is in the words, because this platform's timeline has no status — see the note above.
  KinetixTimelineItem(
    'Delivery attempted',
    time: '5 Apr, 18:40',
    content: 'Needs attention. Nobody available to sign. The parcel is back at the Riyadh depot.',
  ),
  KinetixTimelineItem(
    'Delivery',
    time: 'Awaiting a date',
    content: 'Signature required on arrival.',
  ),
];

const List<(String, String)> kShipmentFacts = <(String, String)>[
  ('To', 'Rahma Suleiman, Al Olaya, Riyadh'),
  ('Service', 'Next day, signature required'),
  ('Times', 'Shown in Riyadh time (GMT+3)'),
];

class ShipmentTrackingBlock extends StatelessWidget {
  const ShipmentTrackingBlock({super.key, this.onChooseDate});

  final VoidCallback? onChooseDate;

  @override
  Widget build(BuildContext context) {
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
                        KinetixCardTitle('Track consignment'),
                        KinetixCardDescription('Kinetix Freight · 2 parcels, 4.6 kg'),
                      ],
                    ),
                  ),
                  // A word. The tone is the second channel.
                  const KinetixTag('Delayed', variant: KinetixTagVariant.warning),
                ],
              ),
            ],
          ),
          KinetixCardContent(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                KinetixDescriptionList(
                  children: kShipmentFacts
                      .map(((String, String) fact) => KinetixDescriptionListItem(
                            term: fact.$1,
                            child: Text(fact.$2),
                          ))
                      .toList(),
                ),
                // The label and the number are one node, so they are announced as a pair rather than as
                // a stray caption followed by a stray code.
                Semantics(
                  container: true,
                  label: 'Tracking number $kTrackingNumber',
                  child: ExcludeSemantics(
                    child: Padding(
                      padding: const EdgeInsetsDirectional.only(top: 12, bottom: 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const <Widget>[
                          Text('Tracking number'),
                          // The one thing a person reads out to support, so it can be selected rather
                          // than transcribed off the screen.
                          SelectableText(kTrackingNumber),
                        ],
                      ),
                    ),
                  ),
                ),
                // The ask, once. Not a restatement of the status tag: that says what the consignment is,
                // this says what the reader has to do.
                const KinetixInform(
                  'Delivery needs a new date. The depot holds the parcels for 5 working days.',
                  variant: KinetixInformVariant.warning,
                ),
                Padding(
                  padding: const EdgeInsetsDirectional.only(top: 8, bottom: 20),
                  // Kept with its reason, because it cannot be placed inside the event itself.
                  child: KinetixButton(
                    onPressed: onChooseDate ?? () {},
                    size: KinetixButtonSize.sm,
                    child: const Text('Choose a new date'),
                  ),
                ),
                const KinetixTimeline(items: kShipmentEvents),
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
  // kx-verify-block: accessibility
  testWidgets('the exception states its state in words and the ask is separate from the status',
      (WidgetTester tester) async {
    final SemanticsHandle handle = tester.ensureSemantics();
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: ShipmentTrackingBlock())),
        ),
      ),
    );

    // The status is a word, so it does not depend on the tag's colour.
    expect(find.text('Delayed'), findsOneWidget);
    // The exception carries its state in its own content, since this platform's timeline has no status.
    expect(
      find.text(
        'Needs attention. Nobody available to sign. The parcel is back at the Riyadh depot.',
      ),
      findsOneWidget,
    );
    // The ask is its own sentence, not a second copy of the status.
    expect(
      find.text('Delivery needs a new date. The depot holds the parcels for 5 working days.'),
      findsOneWidget,
    );
    // The tracking number is named with its value, as one node.
    expect(find.bySemanticsLabel('Tracking number $kTrackingNumber'), findsOneWidget);
    // The undelivered step is still present: nothing has been cancelled.
    expect(find.text('Signature required on arrival.'), findsOneWidget);

    handle.dispose();
  });

  // kx-verify-block: interaction
  testWidgets('the action on the exception is reachable and reports being pressed',
      (WidgetTester tester) async {
    int pressed = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: Scaffold(
            body: SingleChildScrollView(
              child: ShipmentTrackingBlock(onChooseDate: () => pressed++),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Choose a new date'));
    await tester.pumpAndSettle();
    expect(pressed, 1);
  });
}
