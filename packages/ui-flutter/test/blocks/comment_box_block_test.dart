import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Comment box" block — see testimonial_block_test.dart for how block fixtures work.
//
// kx-block:start
class CommentBoxBlock extends StatefulWidget {
  const CommentBoxBlock({super.key, this.onSubmit});

  final void Function(String)? onSubmit;

  @override
  State<CommentBoxBlock> createState() => _CommentBoxBlockState();
}

class _CommentBoxBlockState extends State<CommentBoxBlock> {
  final TextEditingController _body = TextEditingController();

  @override
  void dispose() {
    _body.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return KinetixCard(
      child: KinetixCardContent(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const KinetixAvatar(child: KinetixAvatarFallback('ZF')),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: <Widget>[
                  KinetixTextarea(controller: _body, placeholder: 'Add a comment…'),
                  const SizedBox(height: 8),
                  KinetixButton(
                    onPressed: widget.onSubmit == null ? null : () => widget.onSubmit!(_body.text),
                    child: const Text('Comment'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
// kx-block:end

void main() {
  testWidgets('renders the avatar, the placeholder and the submit action', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: CommentBoxBlock())),
        ),
      ),
    );

    expect(find.text('ZF'), findsOneWidget);
    expect(find.text('Add a comment…'), findsOneWidget);
    expect(find.text('Comment'), findsOneWidget);
  });
}
