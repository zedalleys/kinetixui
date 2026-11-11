import 'package:flutter/material.dart';

import 'dialog.dart';
import 'app_text.dart';
import 'theme.dart';
import 'kinetix_sheet_motion.dart';
import 'package:flutter/services.dart';

/// Mirrors `packages/ui/src/components/sheet.tsx`. Collapsed to **bottom
/// only** — the idiomatic mobile pattern and the only edge with a clean
/// primitive, the same scope cut the other ports made. Place it in a
/// top-level `Stack`, driven by `visible`.
///
/// Keep this widget mounted while setting `visible: false` so exit can finish.
/// Entry/exit retain one controller; reversals preserve position. The modal
/// barrier blocks pointers and background semantics through the exit, and focus
/// returns to the original control after removal. No drag API is introduced.
///
/// Header / Title / Description / Footer are the KinetixDialog* parts.
class KinetixSheet extends StatefulWidget {
  const KinetixSheet({
    super.key,
    required this.visible,
    required this.onDismiss,
    required this.child,
  });

  final bool visible;
  final VoidCallback onDismiss;
  final Widget child;

  @override
  State<KinetixSheet> createState() => _KinetixSheetState();
}

class _KinetixSheetState extends State<KinetixSheet>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    animationBehavior: AnimationBehavior.preserve,
  )..addStatusListener(_statusChanged);
  late final CurvedAnimation _motion = CurvedAnimation(
    parent: _controller,
    curve: KinetixSheetMotion.curve,
  );
  final _focusScope = FocusScopeNode(
    debugLabel: 'KinetixSheet',
    traversalEdgeBehavior: TraversalEdgeBehavior.closedLoop,
    directionalTraversalEdgeBehavior: TraversalEdgeBehavior.closedLoop,
  );
  FocusNode? _previousFocus;
  bool _reduceMotion = false;
  bool _initialized = false;
  int _focusEpoch = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduce = KinetixSheetMotion.reduceMotionOf(context);
    if (!_initialized || reduce != _reduceMotion) {
      _reduceMotion = reduce;
      if (!_initialized && widget.visible) _enterFocus();
      _initialized = true;
      _animate();
    }
  }

  @override
  void didUpdateWidget(KinetixSheet oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.visible != oldWidget.visible) {
      ++_focusEpoch; // Invalidate a focus request from a superseded opening.
      if (widget.visible) _enterFocus();
      _animate();
    }
  }

  void _animate() {
    _controller.duration = KinetixSheetMotion.enterDuration(_reduceMotion);
    _controller.reverseDuration =
        KinetixSheetMotion.exitDuration(_reduceMotion);
    // Keep the current position on reversal; never restart from either endpoint.
    if (widget.visible) {
      _controller.forward();
    } else {
      _controller.reverse();
    }
  }

  void _enterFocus() {
    // A reversal belongs to the same presentation and retains its original trigger.
    _previousFocus ??= FocusManager.instance.primaryFocus;
    final epoch = _focusEpoch;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && widget.visible && epoch == _focusEpoch) {
        _focusScope.requestFocus();
        _focusScope.nextFocus();
      }
    });
  }

  void _statusChanged(AnimationStatus status) {
    if (status != AnimationStatus.dismissed || widget.visible) return;
    final epoch = _focusEpoch;
    final previous = _previousFocus;
    _previousFocus = null;
    // Focus restoration waits until the exiting surface has left the tree.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted &&
          !widget.visible &&
          epoch == _focusEpoch &&
          previous?.context != null &&
          previous!.canRequestFocus) {
        previous.requestFocus();
      }
    });
  }

  @override
  void dispose() {
    ++_focusEpoch;
    if (_focusScope.hasFocus && _previousFocus?.context != null) {
      _previousFocus!.requestFocus();
    }
    _motion.dispose();
    _controller.dispose();
    _focusScope.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        if (!widget.visible && _controller.isDismissed) {
          return const SizedBox.shrink();
        }
        return BlockSemantics(
          child: PopScope(
            canPop: false,
            onPopInvokedWithResult: (didPop, result) {
              if (!didPop && widget.visible) widget.onDismiss();
            },
            child: FocusScope(
              node: _focusScope,
              onKeyEvent: (node, event) {
                if (event is KeyDownEvent &&
                    event.logicalKey == LogicalKeyboardKey.escape) {
                  if (widget.visible) widget.onDismiss();
                  return KeyEventResult.handled;
                }
                return KeyEventResult.ignored;
              },
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Positioned.fill(
                    child: ModalBarrier(
                      color: Color.lerp(
                          c.scrim.withValues(alpha: 0), c.scrim, _motion.value),
                      onDismiss: () {
                        if (widget.visible) widget.onDismiss();
                      },
                      semanticsLabel: MaterialLocalizations.of(context)
                          .modalBarrierDismissLabel,
                    ),
                  ),
                  Align(
                    alignment: Alignment.bottomCenter,
                    child: FractionalTranslation(
                      translation: Offset(0, 1 - _motion.value),
                      child: Semantics(
                        scopesRoute: true,
                        explicitChildNodes: true,
                        child: Material(
                          color: c.background,
                          borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(16)),
                          clipBehavior: Clip.antiAlias,
                          elevation: 8,
                          child: SafeArea(
                            top: false,
                            child: SingleChildScrollView(
                              padding: const EdgeInsets.all(24),
                              child: SizedBox(
                                width: double.infinity,
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Center(
                                      child: Container(
                                        width: 36,
                                        height: 4,
                                        decoration: BoxDecoration(
                                          color: c.border,
                                          borderRadius:
                                              BorderRadius.circular(9999),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    DefaultTextStyle.merge(
                                      style: AppText.bodyMd
                                          .copyWith(color: c.foreground),
                                      child: widget.child,
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
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

// The Dialog header parts double as the Sheet header parts (identical on the web).
typedef KinetixSheetHeader = KinetixDialogHeader;
typedef KinetixSheetFooter = KinetixDialogFooter;
typedef KinetixSheetTitle = KinetixDialogTitle;
typedef KinetixSheetDescription = KinetixDialogDescription;
