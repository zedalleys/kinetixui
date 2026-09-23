import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Testimonial" block shown on kinetixui.com/blocks as the Flutter implementation. This file is the source
// of truth: `pnpm gen:blocks` extracts the marked region into the website's generated snippet and
// `pnpm check:blocks` fails if they drift. The widget test below is what makes the snippet evidence rather
// than illustration — `flutter test` compiles and runs it, so a changed API breaks CI, not the documentation.
//
// kx-block:start
class TestimonialBlock extends StatelessWidget {
  const TestimonialBlock({super.key});

  @override
  Widget build(BuildContext context) {
    return const KinetixQuote(
      'Good design is as little design as possible.',
      author: 'Dieter Rams',
      authorTitle: 'Industrial Designer',
      avatar: KinetixAvatar(child: KinetixAvatarFallback('DR')),
    );
  }
}
// kx-block:end

void main() {
  testWidgets('renders the quote, its author and the avatar fallback', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: Center(child: TestimonialBlock())),
        ),
      ),
    );

    // textContaining: KinetixQuote wraps the text in typographic quotation marks, so find.text finds nothing
    expect(find.textContaining('Good design is as little design as possible.'), findsOneWidget);
    expect(find.text('Dieter Rams'), findsOneWidget);
    expect(find.text('DR'), findsOneWidget);
  });
}
