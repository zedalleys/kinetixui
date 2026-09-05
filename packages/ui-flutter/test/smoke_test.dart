// Widget smoke tests — every Kinetix* widget must build (light + dark)
// inside a KinetixTheme without throwing. Catches layout / build-phase
// asserts that `flutter analyze` can't see (the analogue of the React
// components-smoke suite and the Compose/SwiftUI compile checks).

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

/// The inline widgets — everything that renders in normal layout flow.
List<Widget> inlineWidgets() => [
      KinetixButton(onPressed: () {}, child: const Text('Button')),
      const KinetixButton(onPressed: null, child: Text('Disabled')),
      for (final v in KinetixButtonVariant.values)
        KinetixButton(variant: v, onPressed: () {}, child: Text(v.name)),
      const KinetixBadge('Badge'),
      const KinetixTag('Tag'),
      KinetixTag('Removable', onRemove: () {}),
      const KinetixLabel('Label'),
      const KinetixSeparator(),
      const SizedBox(height: 20, width: 120, child: KinetixSkeleton()),
      const KinetixSpinner(),
      const KinetixProgress(value: 42),
      const KinetixCircularProgress(value: 42, showValue: true),
      KinetixCheckbox(value: true, onChanged: (_) {}),
      KinetixCheckbox(value: false, indeterminate: true, onChanged: (_) {}),
      KinetixSwitch(value: true, onChanged: (_) {}),
      KinetixToggle(pressed: true, onChanged: (_) {}, child: const Text('B')),
      KinetixSlider(value: 0.4, onChanged: (_) {}),
      const KinetixRating(value: 3),
      KinetixRating(value: 3, onChanged: (_) {}),
      KinetixRadioGroup(children: [
        KinetixRadioButton(selected: true, onTap: () {}),
        KinetixRadioButton(selected: false, onTap: () {}),
      ]),
      const KinetixInput(placeholder: 'you@example.com'),
      const KinetixTextarea(placeholder: 'Notes'),
      const KinetixNumberInput(value: 2, onChanged: _noopInt, min: 0, max: 10),
      const KinetixPasswordInput(placeholder: 'password'),
      KinetixField(invalid: true, children: const [
        KinetixFieldLabel('Email'),
        KinetixInput(placeholder: 'you@example.com'),
        KinetixFieldMessage('Required'),
      ]),
      KinetixCard(child: Column(children: const [
        KinetixCardHeader(children: [
          KinetixCardTitle('Title'),
          KinetixCardDescription('Description'),
        ]),
        KinetixCardContent(child: Text('Body')),
      ])),
      const KinetixAlert(variant: KinetixAlertVariant.success, children: [
        KinetixAlertTitle('Heads up'),
        KinetixAlertDescription('It worked.'),
      ]),
      KinetixAccordion(children: [
        KinetixAccordionItem(child: Column(children: [
          KinetixAccordionTrigger('Section', expanded: true, onTap: () {}),
          const KinetixAccordionContent(expanded: true, child: Text('inner')),
        ])),
      ]),
      const KinetixCollapsible(expanded: true, child: Text('shown')),
      KinetixTabsList(children: [
        KinetixTabsTrigger('One', selected: true, onTap: () {}),
        KinetixTabsTrigger('Two', selected: false, onTap: () {}),
      ]),
      const KinetixTabsContent(child: Text('tab body')),
      const KinetixAvatar(child: KinetixAvatarFallback('KZ')),
      const KinetixQuote('Ship it.', author: 'Team', authorTitle: 'KinetixUI'),
      const KinetixMetric(label: 'MRR', value: r'$12k', trend: KinetixMetricTrend.up, change: '+4%'),
      KinetixFab(onPressed: () {}, child: const Icon(Icons.add)),
      const KinetixStepper(
        current: 1,
        steps: [KinetixStep('One'), KinetixStep('Two'), KinetixStep('Three')],
      ),
      KinetixBreadcrumb(children: [
        KinetixBreadcrumbLink('Home', onTap: () {}),
        const KinetixBreadcrumbSeparator(),
        const KinetixBreadcrumbPage('Docs'),
      ]),
      KinetixPagination(children: [
        KinetixPaginationPrevious(onTap: () {}),
        KinetixPaginationItem('1', isActive: true, onTap: () {}),
        const KinetixPaginationEllipsis(),
        KinetixPaginationNext(onTap: () {}),
      ]),
      KinetixList(children: [
        KinetixListItem(title: 'Row', description: 'sub', onTap: () {}),
      ]),
      const KinetixScrollArea(child: SizedBox(height: 40, child: Text('scroll'))),
      KinetixTableOfContents(
        items: const [KinetixTocItem(id: 'a', label: 'A'), KinetixTocItem(id: 'b', label: 'B', level: 2)],
        active: 'a',
        onSelect: _noopString,
      ),
      KinetixFooter(children: [
        KinetixFooterColumn('Product', children: [KinetixFooterLink('Docs', onTap: () {})]),
        KinetixFooterBottom(children: const [Text('© KinetixUI')]),
      ]),
      const KinetixNavigationBar(title: 'Screen', infoText: '3 items'),
      KinetixTabBar(children: [
        KinetixTabBarItem(label: 'Home', icon: const Icon(Icons.home), isActive: true, onTap: () {}),
        KinetixTabBarItem(label: 'Search', icon: const Icon(Icons.search), badge: '2', onTap: () {}),
      ]),
      KinetixSelect<int>(
        value: 1,
        options: const [KinetixSelectOption(1, 'One'), KinetixSelectOption(2, 'Two')],
        onChanged: _noopInt,
      ),
      KinetixInputGroup(children: [
        const KinetixInputGroupText('https://'),
        const KinetixInputGroupField(placeholder: 'site'),
        KinetixInputGroupButton('Go', onTap: () {}),
      ]),
      const KinetixAspectRatio(ratio: 16 / 9, child: ColoredBox(color: Color(0xFF888888))),
      KinetixToggleGroup(children: [
        KinetixToggleGroupItem(pressed: true, onChanged: (_) {}, child: const Text('L')),
        KinetixToggleGroupItem(pressed: false, onChanged: (_) {}, child: const Text('R')),
      ]),
      KinetixInputOtp(value: '12', onChanged: _noopString),
      KinetixDataTable<_Row>(
        rows: const [_Row('Ada', 3), _Row('Linus', 1)],
        columns: [
          KinetixDataColumn(header: 'Name', cell: (r) => r.name, sortKey: (r) => r.name),
          KinetixDataColumn(header: 'Rank', cell: (r) => '${r.rank}'),
        ],
      ),
      const SizedBox(
        height: 220,
        child: KinetixCarousel(itemCount: 3, itemBuilder: _carouselItem),
      ),
      KinetixFileUpload(
        files: const [KinetixFileItem(name: 'a.png', status: KinetixFileStatus.done)],
        onBrowse: () {},
      ),
      KinetixAudioPlayer(
        title: 'Track',
        isPlaying: true,
        position: 30,
        duration: 180,
        onPlayPause: () {},
      ),
      const SizedBox(
        height: 120,
        child: KinetixResizablePanels(
          first: ColoredBox(color: Color(0xFF333333)),
          second: ColoredBox(color: Color(0xFF555555)),
        ),
      ),
      KinetixCodeBlock(code: 'const x = 1;', filename: 'main.ts'),
      SizedBox(
        height: 200,
        child: KinetixChart(const [
          KinetixChartPoint(label: 'Jan', value: 12),
          KinetixChartPoint(label: 'Feb', value: 20),
        ]),
      ),
    ];

/// Overlay widgets — need `visible: true` and a Stack host.
List<Widget> overlayWidgets() => [
      KinetixDialog(
        visible: true,
        onDismiss: () {},
        child: Column(children: const [
          KinetixDialogHeader(children: [
            KinetixDialogTitle('Confirm'),
            KinetixDialogDescription('Sure?'),
          ]),
        ]),
      ),
      const KinetixAlertDialog(visible: true, child: KinetixDialogTitle('Delete?')),
      KinetixModal(visible: true, onDismiss: () {}, title: 'Modal', child: const Text('body')),
      KinetixSheet(visible: true, onDismiss: () {}, child: const Text('sheet')),
      KinetixDrawer(visible: true, onDismiss: () {}, child: const Text('drawer')),
      const KinetixToaster(toast: KinetixToast('Saved', intent: KinetixToastIntent.success), onDismiss: _noop),
    ];

Widget _host(Widget child, Brightness brightness) => MaterialApp(
      theme: ThemeData(brightness: brightness),
      home: KinetixTheme(
        brightness: brightness,
        child: Scaffold(body: child),
      ),
    );

void main() {
  for (final brightness in Brightness.values) {
    testWidgets('inline widgets build — ${brightness.name}', (tester) async {
      await tester.pumpWidget(
        _host(
          SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: inlineWidgets()
                  .map((w) => Padding(padding: const EdgeInsets.all(6), child: w))
                  .toList(),
            ),
          ),
          brightness,
        ),
      );
      expect(tester.takeException(), isNull);
      expect(find.byType(KinetixButton), findsWidgets);
    });

    testWidgets('overlay widgets build — ${brightness.name}', (tester) async {
      for (final w in overlayWidgets()) {
        await tester.pumpWidget(_host(Stack(children: [const SizedBox.expand(), w]), brightness));
        expect(tester.takeException(), isNull, reason: w.runtimeType.toString());
      }
    });
  }
}

void _noop() {}
void _noopInt(int _) {}
void _noopString(String _) {}

Widget _carouselItem(BuildContext context, int i) => Center(child: Text('slide $i'));

class _Row {
  const _Row(this.name, this.rank);
  final String name;
  final int rank;
}
