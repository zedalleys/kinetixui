import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

const _upload = ValueKey('upload-progress');

Widget _host(double value, TextDirection direction) {
  return WidgetsApp(
    color: const Color(0xffffffff),
    builder: (context, _) => Directionality(
      textDirection: direction,
      child: KinetixTheme(
        child: Center(
          child: SizedBox(
            width: 200,
            child: Semantics(key: _upload, label: 'Upload', child: KinetixProgress(value: value)),
          ),
        ),
      ),
    ),
  );
}

void main() {
  final progress = find.byType(KinetixProgress);
  final fill = find.descendant(of: progress, matching: find.byType(FractionallySizedBox));

  for (final direction in TextDirection.values) {
    testWidgets('the fraction and accessible value agree in ${direction.name}', (tester) async {
      await tester.pumpWidget(_host(25.5, direction));
      final track = tester.getRect(progress);
      final painted = tester.getRect(fill);
      expect(painted.width, closeTo(51, 0.001));
      if (direction == TextDirection.rtl) {
        expect(painted.right, track.right);
      } else {
        expect(painted.left, track.left);
      }
      final semantics = tester.getSemantics(find.byKey(_upload)).getSemanticsData();
      expect(semantics.label, contains('Upload'));
      expect(semantics.value, '25.5%');

      await tester.pumpWidget(_host(150, direction));
      expect(tester.getSize(fill).width, 200);
      expect(tester.getSemantics(find.byKey(_upload)).getSemanticsData().value, '100%');
    });
  }

  testWidgets('an unknown non-finite value clears the fill and announced value', (tester) async {
    await tester.pumpWidget(_host(100, TextDirection.ltr));
    for (final unknown in [double.nan, double.infinity, double.negativeInfinity]) {
      await tester.pumpWidget(_host(unknown, TextDirection.ltr));
      expect(tester.getSize(fill).width, 0);
      expect(tester.getSemantics(find.byKey(_upload)).getSemanticsData().value, isEmpty);
    }
  });
}
