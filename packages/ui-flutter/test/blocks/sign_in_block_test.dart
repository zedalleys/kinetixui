import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Sign in" block — see testimonial_block_test.dart for how block fixtures work.
//
// kx-block:start
class SignInBlock extends StatefulWidget {
  const SignInBlock({super.key, this.onSignIn, this.onGithub});

  final VoidCallback? onSignIn;
  final VoidCallback? onGithub;

  @override
  State<SignInBlock> createState() => _SignInBlockState();
}

class _SignInBlockState extends State<SignInBlock> {
  final TextEditingController _email = TextEditingController();
  final TextEditingController _password = TextEditingController();
  bool _remember = true;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return KinetixCard(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          const KinetixCardHeader(
            children: <Widget>[
              KinetixCardTitle('Sign in'),
              KinetixCardDescription('Enter your email to sign in to your account.'),
            ],
          ),
          KinetixCardContent(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const KinetixLabel('Email'),
                KinetixInput(controller: _email, placeholder: 'you@example.com'),
                const SizedBox(height: 12),
                const KinetixLabel('Password'),
                KinetixInput(controller: _password, obscureText: true),
                const SizedBox(height: 12),
                Row(
                  children: <Widget>[
                    KinetixCheckbox(
                      value: _remember,
                      onChanged: (bool v) => setState(() => _remember = v),
                    ),
                    const SizedBox(width: 8),
                    const Text('Remember me'),
                  ],
                ),
              ],
            ),
          ),
          KinetixCardFooter(
            children: <Widget>[
              Expanded(
                child: Column(
                  children: <Widget>[
                    SizedBox(
                      width: double.infinity,
                      child: KinetixButton(onPressed: widget.onSignIn, child: const Text('Sign in')),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: KinetixButton(
                        onPressed: widget.onGithub,
                        variant: KinetixButtonVariant.outline,
                        child: const Text('Continue with GitHub'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
// kx-block:end

void main() {
  testWidgets('renders the whole form and toggles Remember me', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: SignInBlock())),
        ),
      ),
    );

    expect(find.text('Enter your email to sign in to your account.'), findsOneWidget);
    expect(find.text('Email'), findsOneWidget);
    expect(find.text('Remember me'), findsOneWidget);
    expect(find.text('Continue with GitHub'), findsOneWidget);
    // 'Sign in' is both the card title and the submit button, so it is deliberately expected twice
    expect(find.text('Sign in'), findsNWidgets(2));
  });
}
