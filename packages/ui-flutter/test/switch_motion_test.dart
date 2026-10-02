import 'package:flutter/semantics.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// kx-verify: reducedMotion

/// `KinetixSwitch`'s motion contract, and what the platform's "remove
/// animations" setting does to it.
///
/// ## What these measure
///
/// The rendered thumb position, not a duration variable. `flutter_test` renders
/// for real and lets a test drive the clock, so `pump(const Duration(
/// milliseconds: 50))` stops it halfway through a 100ms travel and the thumb's
/// actual offset inside the track is measured off the render tree.
///
/// Positions are expressed as the thumb's inset from the track's own leading
/// physical edge, so an assertion does not depend on where the control sits on
/// screen: 2.0 at one end (the track's 2px padding), 26.0 at the other
/// (48 − 2 − 20), and 24 of travel between them — the Figma spec all three
/// native ports and the React one share.
///
/// The thumb is located by the one property that distinguishes it from the
/// track — `BoxShape.circle` — rather than by a `Key` added for testing. There
/// is no test-only hook in the control.
///
/// ## Both directions, every time
///
/// Every case runs OFF → ON *and* ON → OFF. A switch is symmetric, which makes
/// it tempting to assume one direction proves the other; the disclosure slice
/// shipped a gate blind to every collapse on exactly that kind of assumption.

/// Hosts a switch under a chosen preference, direction and text scale.
///
/// Deliberately no `MaterialApp`: `KinetixSwitch` needs a `KinetixTheme`
/// ancestor and a `Directionality`, and nothing more. MaterialApp would install
/// its own `MediaQuery` over the one set here, discarding the very setting under
/// test — a mistake the disclosure suite made and CI caught.
Widget _host({
  required Widget child,
  bool reduce = false,
  TextDirection direction = TextDirection.ltr,
  double textScale = 1,
}) {
  return MediaQuery(
    data: MediaQueryData(disableAnimations: reduce, textScaler: TextScaler.linear(textScale)),
    child: Directionality(
      textDirection: direction,
      child: KinetixTheme(
        brightness: Brightness.light,
        child: Align(alignment: Alignment.topLeft, child: child),
      ),
    ),
  );
}

/// A switch that owns its own value, so a tap actually changes state.
class _Host extends StatefulWidget {
  const _Host({this.enabled = true, this.initial = false});
  final bool enabled;
  final bool initial;
  @override
  State<_Host> createState() => _HostState();
}

class _HostState extends State<_Host> {
  late bool value = widget.initial;
  @override
  Widget build(BuildContext context) {
    return KinetixSwitch(
      value: value,
      onChanged: widget.enabled ? (v) => setState(() => value = v) : null,
    );
  }
}

/// The thumb: the only round box in the control.
final Finder _thumb = find.byWidgetPredicate(
  (w) => w is Container && w.decoration is BoxDecoration && (w.decoration as BoxDecoration).shape == BoxShape.circle,
);

/// The thumb's inset from the track's leading physical edge.
double _inset(WidgetTester tester) =>
    tester.getTopLeft(_thumb).dx - tester.getTopLeft(find.byType(AnimatedContainer)).dx;

const double _start = 2; // the track's own padding
const double _end = 26; // 48 − 2 − 20

Future<void> _tap(WidgetTester tester) => tester.tap(find.byType(KinetixSwitch));

/// Advances to the midpoint of a 100ms travel.
Future<void> _halfway(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 50));
}

void main() {
  group('normal motion — the thumb travels', () {
    testWidgets('OFF → ON renders a real intermediate position', (tester) async {
      await tester.pumpWidget(_host(child: const _Host()));
      expect(_inset(tester), _start, reason: 'starts at the leading end');

      await _tap(tester);
      await _halfway(tester);
      final mid = _inset(tester);

      await tester.pumpAndSettle();
      expect(_inset(tester), _end, reason: 'ends at the trailing end');
      expect(mid, greaterThan(_start + 1), reason: 'a rendered midpoint, not a jump');
      expect(mid, lessThan(_end - 1), reason: 'strictly between the two ends');
    });

    testWidgets('ON → OFF renders a real intermediate position', (tester) async {
      await tester.pumpWidget(_host(child: const _Host(initial: true)));
      expect(_inset(tester), _end);

      await _tap(tester);
      await _halfway(tester);
      final mid = _inset(tester);

      await tester.pumpAndSettle();
      expect(_inset(tester), _start, reason: 'ends back at the leading end');
      expect(mid, lessThan(_end - 1), reason: 'a rendered midpoint on the way back');
      expect(mid, greaterThan(_start + 1), reason: 'strictly between the two ends');
    });
  });

  group('reduced motion — the thumb arrives', () {
    testWidgets('OFF → ON reaches the far end with no midpoint', (tester) async {
      await tester.pumpWidget(_host(reduce: true, child: const _Host()));
      expect(_inset(tester), _start);

      await _tap(tester);
      await _halfway(tester);
      // The same instant at which normal motion measured a midpoint.
      expect(_inset(tester), _end, reason: 'with animations off the thumb must arrive, not travel');

      await tester.pumpAndSettle();
      expect(_inset(tester), _end, reason: 'and the settled state must still be right');
    });

    testWidgets('ON → OFF reaches the near end with no midpoint', (tester) async {
      await tester.pumpWidget(_host(reduce: true, child: const _Host(initial: true)));
      expect(_inset(tester), _end);

      await _tap(tester);
      await _halfway(tester);
      expect(_inset(tester), _start, reason: 'turning off is suppressed too, not just turning on');

      await tester.pumpAndSettle();
      expect(_inset(tester), _start);
    });

    testWidgets('the state still changes — suppression is not removal', (tester) async {
      await tester.pumpWidget(_host(reduce: true, child: const _Host()));
      final before = _inset(tester);
      await _tap(tester);
      await tester.pumpAndSettle();
      expect(_inset(tester), isNot(before),
          reason: 'reduced motion removes the travel, never the state change');
    });
  });

  group('the duration comes from the tokens', () {
    Future<Duration> captured(WidgetTester tester, {required bool reduce}) async {
      late Duration d;
      await tester.pumpWidget(_host(
        reduce: reduce,
        child: Builder(builder: (c) {
          d = KinetixSwitchMotion.durationOf(c);
          return const SizedBox.shrink();
        }),
      ));
      return d;
    }

    testWidgets('normal motion runs for the canonical instant token', (tester) async {
      expect(await captured(tester, reduce: false), KinetixDuration.instant);
    });

    testWidgets('reduced motion reuses the one shared suppressed value', (tester) async {
      // Not its own constant: the package has one answer to "how long is no animation".
      final d = await captured(tester, reduce: true);
      expect(d, KinetixDisclosureMotion.suppressed);
      expect(d, greaterThan(Duration.zero),
          reason: 'shared with the disclosure family, whose AnimatedSize cannot take Duration.zero');
      expect(d.inMilliseconds, 0, reason: 'and still far inside one frame');
    });
  });

  group('accessibility', () {
    /// The `Semantics` the control declares, following `semantics_test.dart`.
    Finder declared() => find.descendant(
          of: find.byType(KinetixSwitch),
          matching: find.byWidgetPredicate((w) => w is Semantics && w.properties.toggled != null),
        );
    SemanticsProperties props(WidgetTester tester) => tester.widget<Semantics>(declared().first).properties;

    testWidgets('the toggled state survives OFF → ON with motion reduced', (tester) async {
      await tester.pumpWidget(_host(reduce: true, child: const _Host()));
      expect(props(tester).toggled, isFalse);
      await _tap(tester);
      await tester.pumpAndSettle();
      expect(props(tester).toggled, isTrue,
          reason: 'what assistive technology is told must not depend on the motion setting');
    });

    testWidgets('the toggled state survives ON → OFF with motion reduced', (tester) async {
      await tester.pumpWidget(_host(reduce: true, child: const _Host(initial: true)));
      expect(props(tester).toggled, isTrue);
      await _tap(tester);
      await tester.pumpAndSettle();
      expect(props(tester).toggled, isFalse);
    });
  });

  group('disabled', () {
    SemanticsProperties props(WidgetTester tester) => tester
        .widget<Semantics>(find
            .descendant(
              of: find.byType(KinetixSwitch),
              matching: find.byWidgetPredicate((w) => w is Semantics && w.properties.toggled != null),
            )
            .first)
        .properties;

    testWidgets('a disabled switch cannot be toggled and its thumb does not move', (tester) async {
      await tester.pumpWidget(_host(child: const _Host(enabled: false)));
      expect(_inset(tester), _start);

      await _tap(tester);
      await tester.pumpAndSettle();

      expect(_inset(tester), _start,
          reason: 'no movement, because movement here would claim a state change that did not happen');
      expect(props(tester).enabled, isFalse);
    });
  });

  group('RTL', () {
    testWidgets('the thumb starts at the reader\'s leading edge, which is mirrored', (tester) async {
      await tester.pumpWidget(_host(direction: TextDirection.rtl, child: const _Host()));
      // Physical coordinates: OFF in RTL sits at the far physical side, the mirror of LTR.
      expect(_inset(tester), _end,
          reason: 'AlignmentDirectional.centerStart is the right edge under RTL');
    });

    testWidgets('OFF → ON travels toward the trailing edge in RTL', (tester) async {
      await tester.pumpWidget(_host(direction: TextDirection.rtl, child: const _Host()));
      await _tap(tester);
      await _halfway(tester);
      final mid = _inset(tester);
      await tester.pumpAndSettle();

      expect(_inset(tester), _start, reason: 'ON in RTL is the physical left — the mirror of LTR');
      expect(mid, lessThan(_end - 1));
      expect(mid, greaterThan(_start + 1), reason: 'and it still travels, rather than jumping');
    });

    testWidgets('ON → OFF is still suppressed in RTL', (tester) async {
      await tester.pumpWidget(
        _host(reduce: true, direction: TextDirection.rtl, child: const _Host(initial: true)),
      );
      expect(_inset(tester), _start);
      await _tap(tester);
      await _halfway(tester);
      expect(_inset(tester), _end, reason: 'reduced motion must stay correct under RTL');
    });
  });

  group('large text', () {
    testWidgets('a 2x text scale leaves the control sized, aligned and operable', (tester) async {
      await tester.pumpWidget(_host(
        textScale: 2,
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [_Host(), SizedBox(width: 8), Text('Airplane mode')],
        ),
      ));

      // The control is a fixed 48x24 by design: it must not grow with the label, and it must not be
      // squeezed by it either.
      expect(tester.getSize(find.byType(AnimatedContainer)), const Size(48, 24));
      expect(_inset(tester), _start);

      await _tap(tester);
      await tester.pumpAndSettle();
      expect(_inset(tester), _end, reason: 'still operable beside a label at twice the size');
      expect(tester.takeException(), isNull, reason: 'and nothing overflowed');
    });

    testWidgets('a 2x text scale with motion reduced still lands correctly', (tester) async {
      await tester.pumpWidget(_host(
        textScale: 2,
        reduce: true,
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [_Host(), SizedBox(width: 8), Text('Airplane mode')],
        ),
      ));
      await _tap(tester);
      await _halfway(tester);
      expect(_inset(tester), _end);
    });
  });
}
