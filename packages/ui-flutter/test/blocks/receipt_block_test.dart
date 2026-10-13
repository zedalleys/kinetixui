import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Receipt" block — see testimonial_block_test.dart for how block fixtures work.
//
// One business-neutral receipt. A payment, booking, transfer, order or refund receipt is this block with
// different words. Amounts arrive formatted — the block computes nothing — and Download, Print and Share are
// callbacks: generating a PDF, printing and sharing are the product's, not the block's.
//
// The status is a word ("Paid"), not a colour. The amount is spoken as "162.75 Saudi riyals" rather than
// letter by letter. The receipt number is selectable, the copy button says what it copies, and the result
// goes into a live region that is always present — including when the clipboard refuses, so the block never
// claims a copy that did not happen.
//
// Each breakdown row is one merged node, so a label and its amount are announced together. Amounts sit at
// the end of the row (spaceBetween follows the text direction) in tabular figures, and the discount's minus
// sign is in the text.
//
// kx-block:start
class ReceiptLine {
  const ReceiptLine(this.label, this.amount, {this.note});
  final String label;
  final String amount;
  final String? note;
}

const List<ReceiptLine> kReceiptLines = <ReceiptLine>[
  ReceiptLine('Single-origin beans', 'SAR 124.00', note: '2 × SAR 62.00'),
  ReceiptLine('Pour-over filters', 'SAR 18.00'),
  ReceiptLine('Member discount', '−SAR 12.40', note: '10% on beans'),
  ReceiptLine('VAT', 'SAR 19.29', note: '15%'),
  ReceiptLine('Rounding', '+SAR 0.01'),
];

const String kReceiptNumber = 'RCP-2026-004817';

const List<FontFeature> kTabularFigures = <FontFeature>[FontFeature.tabularFigures()];

class ReceiptBlock extends StatefulWidget {
  const ReceiptBlock({super.key, this.onDownload, this.onPrint, this.onShare});

  final VoidCallback? onDownload;
  final VoidCallback? onPrint;
  final VoidCallback? onShare;

  @override
  State<ReceiptBlock> createState() => _ReceiptBlockState();
}

class _ReceiptBlockState extends State<ReceiptBlock> {
  String _feedback = '';

  Future<void> _copy() async {
    String message;
    try {
      await Clipboard.setData(const ClipboardData(text: kReceiptNumber));
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
                        KinetixCardTitle('Harbour Coffee Roasters'),
                        SizedBox(height: 6),
                        KinetixCardDescription('Payment receipt'),
                      ],
                    ),
                  ),
                  SizedBox(width: 12),
                  // The status is a word, not a colour.
                  KinetixTag('Paid'),
                ],
              ),
            ],
          ),
          KinetixCardContent(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text('Amount paid', style: TextStyle(color: muted)),
                const SizedBox(height: 4),
                Semantics(
                  label: '162.75 Saudi riyals',
                  excludeSemantics: true,
                  child: const Text(
                    'SAR 162.75',
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.w600, fontFeatures: kTabularFigures),
                  ),
                ),
                const SizedBox(height: 20),
                Text('Receipt number', style: TextStyle(color: muted)),
                const SizedBox(height: 4),
                Row(
                  children: <Widget>[
                    const Flexible(
                      child: SelectableText(
                        kReceiptNumber,
                        style: TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w600),
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Named after what it copies; onTap keeps the action reachable through the semantics node.
                    Semantics(
                      label: 'Copy receipt number',
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
                const SizedBox(height: 20),
                const KinetixDescriptionList(
                  children: <Widget>[
                    KinetixDescriptionListItem(term: 'Date', child: Text('14 Mar 2026, 09:42')),
                    KinetixDescriptionListItem(term: 'Paid with', child: Text('Visa ending 4242')),
                    KinetixDescriptionListItem(
                      term: 'Paid to',
                      showDivider: false,
                      child: Text('Harbour Coffee Roasters, Riyadh'),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                const KinetixSeparator(),
                const SizedBox(height: 16),
                ...kReceiptLines.map((ReceiptLine line) => _BreakdownRow(line.label, line.amount, note: line.note)),
                const KinetixSeparator(),
                const SizedBox(height: 8),
                const _BreakdownRow('Total paid', 'SAR 162.75', emphasised: true),
              ],
            ),
          ),
          KinetixCardFooter(
            children: <Widget>[
              KinetixButton(
                onPressed: widget.onDownload ?? () {},
                variant: KinetixButtonVariant.outline,
                child: const Text('Download'),
              ),
              KinetixButton(
                onPressed: widget.onPrint ?? () {},
                variant: KinetixButtonVariant.outline,
                child: const Text('Print'),
              ),
              KinetixButton(
                onPressed: widget.onShare ?? () {},
                variant: KinetixButtonVariant.ghost,
                child: const Text('Share'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _BreakdownRow extends StatelessWidget {
  const _BreakdownRow(this.label, this.amount, {this.note, this.emphasised = false});
  final String label;
  final String amount;
  final String? note;
  final bool emphasised;

  @override
  Widget build(BuildContext context) {
    final Color muted = KinetixTheme.of(context).mutedForeground;
    final FontWeight weight = emphasised ? FontWeight.w600 : FontWeight.w400;
    final String? note = this.note;
    // One element: "Member discount, 10% on beans, −SAR 12.40", not unrelated strings at opposite ends.
    return MergeSemantics(
      child: Padding(
        padding: const EdgeInsetsDirectional.only(bottom: 8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(label, style: TextStyle(fontWeight: weight)),
                  if (note != null) Text(note, style: TextStyle(color: muted, fontSize: 12)),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Text(
              amount,
              textAlign: TextAlign.end,
              style: TextStyle(fontWeight: weight, fontFeatures: kTabularFigures),
            ),
          ],
        ),
      ),
    );
  }
}
// kx-block:end

void main() {
  testWidgets('the status is a word, the amount is spoken, and each breakdown row is one node',
      (WidgetTester tester) async {
    final SemanticsHandle handle = tester.ensureSemantics();
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: ReceiptBlock())),
        ),
      ),
    );

    expect(find.text('Paid'), findsOneWidget);
    expect(find.bySemanticsLabel('162.75 Saudi riyals'), findsOneWidget);
    expect(find.bySemanticsLabel('Copy receipt number'), findsOneWidget);
    expect(find.text(kReceiptNumber), findsOneWidget);
    // The label and its amount are one merged node, so they are announced together.
    expect(tester.getSemantics(find.text('Total paid')).label, contains('SAR 162.75'));
    expect(tester.getSemantics(find.text('Member discount')).label, contains('−SAR 12.40'));

    handle.dispose();
  });
}
