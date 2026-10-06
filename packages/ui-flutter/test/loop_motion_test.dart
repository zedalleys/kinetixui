import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// kx-verify: reducedMotion

/// The continuous-loop family on Flutter: Spinner, Skeleton, Marquee, TypingIndicator.
///
/// ## What these measure
///
/// Rendered values over time, not a duration variable. `flutter_test` renders for real and lets a test
/// drive the clock, so each case pumps a fraction of a period and reads what is on screen: the
/// spinner's rotation, the skeleton's opacity, a typing dot's offset, the marquee's translation. With
/// animations on those values change between frames. With `disableAnimations` they do not, and the
/// frame scheduler has nothing pending (`hasScheduledFrame`), which is the measurable form of "no loop
/// is running".
///
/// Deliberately no `MaterialApp`: it would install its own `MediaQuery` over the one set here and
/// discard the very setting under test.

Widget _host(Widget child,
    {bool reduce = false, TextDirection dir = TextDirection.ltr}) {
  return MediaQuery(
    data: MediaQueryData(disableAnimations: reduce),
    child: Directionality(
      textDirection: dir,
      child: KinetixTheme(
        brightness: Brightness.light,
        child: Align(alignment: Alignment.topLeft, child: child),
      ),
    ),
  );
}

double _spinnerTurns(WidgetTester t) {
  final finder = find.byType(RotationTransition);
  if (finder.evaluate().isEmpty) return 0;
  return t.widget<RotationTransition>(finder).turns.value;
}

double _skeletonOpacity(WidgetTester t) {
  final finder = find.byType(FadeTransition);
  if (finder.evaluate().isEmpty) return 1;
  return t.widget<FadeTransition>(finder).opacity.value;
}

void main() {
  group('spec', () {
    test('loop periods mirror the web keyframes', () {
      expect(
          KinetixLoopMotion.spinnerPeriod, const Duration(milliseconds: 800));
      expect(KinetixLoopMotion.skeletonHalfCycle, const Duration(seconds: 1));
      expect(
          KinetixLoopMotion.typingPeriod, const Duration(milliseconds: 1200));
      expect(
          KinetixLoopMotion.typingStagger, const Duration(milliseconds: 150));
    });

    test('typing dots rest at the muted opacity token', () {
      expect(KinetixLoopMotion.restingDotOpacity, KinetixOpacity.muted);
    });
  });

  group('spinner', () {
    testWidgets('rotates with normal motion', (t) async {
      await t.pumpWidget(_host(const KinetixSpinner()));
      await t.pump(const Duration(milliseconds: 200));
      final a = _spinnerTurns(t);
      await t.pump(const Duration(milliseconds: 200));
      expect(_spinnerTurns(t), isNot(a), reason: 'the arc must be turning');
    });

    testWidgets('does not rotate with reduced motion and schedules no frames',
        (t) async {
      await t.pumpWidget(_host(const KinetixSpinner(), reduce: true));
      await t.pump(const Duration(milliseconds: 200));
      expect(_spinnerTurns(t), 0);
      await t.pump(const Duration(milliseconds: 200));
      expect(_spinnerTurns(t), 0);
      expect(t.binding.hasScheduledFrame, isFalse,
          reason: 'a stopped loop must not keep the clock busy');
    });

    testWidgets('still says Loading in both modes', (t) async {
      for (final reduce in [false, true]) {
        await t.pumpWidget(_host(const KinetixSpinner(label: 'Loading results'),
            reduce: reduce));
        expect(find.bySemanticsLabel('Loading results'), findsOneWidget,
            reason: 'reduce=$reduce');
      }
    });

    testWidgets('follows the setting when it changes while mounted', (t) async {
      await t.pumpWidget(_host(const KinetixSpinner()));
      await t.pump(const Duration(milliseconds: 100));
      await t.pumpWidget(_host(const KinetixSpinner(), reduce: true));
      await t.pump(const Duration(milliseconds: 100));
      expect(_spinnerTurns(t), 0);
      expect(t.binding.hasScheduledFrame, isFalse);
    });
  });

  group('skeleton', () {
    testWidgets('pulses with normal motion', (t) async {
      await t.pumpWidget(_host(
          const SizedBox(width: 80, height: 12, child: KinetixSkeleton())));
      await t.pump(const Duration(milliseconds: 500));
      expect(_skeletonOpacity(t), lessThan(1));
    });

    testWidgets(
        'rests at full opacity with reduced motion and still renders the block',
        (t) async {
      await t.pumpWidget(_host(
          const SizedBox(width: 80, height: 12, child: KinetixSkeleton()),
          reduce: true));
      await t.pump(const Duration(milliseconds: 500));
      expect(_skeletonOpacity(t), 1);
      expect(find.byType(KinetixSkeleton), findsOneWidget);
      expect(t.getSize(find.byType(KinetixSkeleton)), const Size(80, 12));
      expect(t.binding.hasScheduledFrame, isFalse);
    });
  });

  group('typing indicator', () {
    testWidgets('dots move with normal motion', (t) async {
      await t.pumpWidget(_host(const KinetixTypingIndicator()));
      double dotY() => t
          .widgetList<Transform>(find.byType(Transform))
          .first
          .transform
          .getTranslation()
          .y;
      await t.pump(const Duration(milliseconds: 100));
      final before = dotY();
      await t.pump(const Duration(milliseconds: 100));
      expect(dotY(), isNot(before), reason: 'the dot must be bouncing');
    });

    testWidgets('dots rest at the muted opacity with reduced motion',
        (t) async {
      await t.pumpWidget(_host(const KinetixTypingIndicator(), reduce: true));
      final before = t.getTopLeft(find.byType(Opacity).first);
      await t.pump(const Duration(milliseconds: 180));
      expect(t.getTopLeft(find.byType(Opacity).first), before);
      for (final o in t.widgetList<Opacity>(find.byType(Opacity))) {
        expect(o.opacity, KinetixOpacity.muted);
      }
      expect(t.binding.hasScheduledFrame, isFalse);
    });

    testWidgets('still says Typing in both modes', (t) async {
      for (final reduce in [false, true]) {
        await t
            .pumpWidget(_host(const KinetixTypingIndicator(), reduce: reduce));
        expect(find.bySemanticsLabel('Typing'), findsOneWidget,
            reason: 'reduce=$reduce');
      }
    });
  });

  group('marquee', () {
    const items = Row(mainAxisSize: MainAxisSize.min, children: [
      SizedBox(width: 300, height: 20),
      SizedBox(width: 300, height: 20)
    ]);

    testWidgets('translates by itself with normal motion', (t) async {
      // The ticker's own row is wider than its viewport by design, so debug mode reports a RenderFlex
      // overflow every frame. That is pre-existing and not what is under test; everything else still fails.
      final original = FlutterError.onError;
      FlutterError.onError = (d) {
        if (!d.exceptionAsString().contains('overflowed')) original?.call(d);
      };
      addTearDown(() => FlutterError.onError = original);
      await t.pumpWidget(_host(
          const SizedBox(width: 200, child: KinetixMarquee(child: items))));
      await t.pump();
      final a = t.getTopLeft(find.byType(Row).first);
      await t.pump(const Duration(seconds: 4));
      expect(t.getTopLeft(find.byType(Row).first), isNot(a));
      expect(find.byType(SingleChildScrollView), findsNothing);
    });

    testWidgets(
        'becomes a hand-scrolled row with reduced motion: no drift, every item reachable',
        (t) async {
      await t.pumpWidget(_host(
          const SizedBox(width: 200, child: KinetixMarquee(child: items)),
          reduce: true));
      await t.pump();
      final scroll = find.byType(SingleChildScrollView);
      expect(scroll, findsOneWidget);
      final a = t.getTopLeft(find.byType(Row).first);
      await t.pump(const Duration(seconds: 4));
      expect(t.getTopLeft(find.byType(Row).first), a,
          reason: 'it must not drift on its own');
      expect(t.binding.hasScheduledFrame, isFalse);
      // The far end is reachable by the reader's own scroll.
      final position =
          t.state<ScrollableState>(find.byType(Scrollable)).position;
      expect(position.maxScrollExtent, greaterThan(0));
    });

    testWidgets('the hand-scrolled form works under RTL too', (t) async {
      await t.pumpWidget(
        _host(const SizedBox(width: 200, child: KinetixMarquee(child: items)),
            reduce: true, dir: TextDirection.rtl),
      );
      await t.pump();
      expect(find.byType(SingleChildScrollView), findsOneWidget);
    });
  });
}
