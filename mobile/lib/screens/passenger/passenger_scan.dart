import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../models/user.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/payment_feedback.dart';
import '../../widgets/app_card.dart';
import '../../widgets/payment_dialogs.dart';

class PassengerScan extends StatefulWidget {
  final ApiService api;
  final AppUser user;
  final VoidCallback? onWalletChanged;

  const PassengerScan({super.key, required this.api, required this.user, this.onWalletChanged});

  @override
  State<PassengerScan> createState() => _PassengerScanState();
}

class _PassengerScanState extends State<PassengerScan> {
  final _manual = TextEditingController();
  bool _loading = false;
  bool _scanLocked = false;
  bool _useCamera = true;
  String? _error;

  @override
  void dispose() {
    _manual.dispose();
    super.dispose();
  }

  Future<void> _pay(String token) async {
    final code = token.trim();
    if (code.isEmpty || _loading || _scanLocked) return;
    setState(() {
      _loading = true;
      _scanLocked = true;
      _error = null;
    });
    try {
      final res = await widget.api.postJson('/passenger/pay', {'qr_token': code});
      if (!mounted) return;
      widget.onWalletChanged?.call();
      await PaymentFeedback.playSuccess();
      if (!mounted) return;
      await showPaymentSuccessDialog(
        context,
        fareBirr: (res['fare_birr'] as num?) ?? 0,
        routeName: res['route_name']?.toString() ?? '',
        busPlate: res['bus_plate']?.toString() ?? '',
        balanceBirr: (res['balance_birr'] as num?) ?? 0,
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      await PaymentFeedback.playError();
      if (!mounted) return;
      if (isInsufficientBalanceError(e.message, data: e.data)) {
        await showInsufficientBalanceDialog(
          context,
          message: e.message,
          linkedToCompany: widget.user.paysViaCompany,
          corporateName: widget.user.corporateName,
        );
      } else {
        setState(() => _error = e.message);
      }
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
          _scanLocked = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Pay fare'),
      ),
      body: Stack(
        children: [
          ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
            children: [
              Text(
                'Choose payment method',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 4),
              Text(
                'Scan the QR code or enter it manually',
                style: theme.textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
              ),
              const SizedBox(height: 20),
              SegmentedButton<bool>(
                segments: const [
                  ButtonSegment(
                    value: true,
                    label: Text('Scan QR'),
                    icon: Icon(Icons.qr_code_scanner, size: 18),
                  ),
                  ButtonSegment(
                    value: false,
                    label: Text('Manual code'),
                    icon: Icon(Icons.keyboard, size: 18),
                  ),
                ],
                selected: {_useCamera},
                onSelectionChanged: (s) => setState(() {
                  _useCamera = s.first;
                  _error = null;
                }),
              ),
              const SizedBox(height: 20),
              if (_useCamera) ...[
                AppCard(
                  padding: EdgeInsets.zero,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(AppRadii.lg),
                    child: SizedBox(
                      height: 340,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          MobileScanner(
                            onDetect: (capture) {
                              final code = capture.barcodes.firstOrNull?.rawValue;
                              if (code != null && !_loading && !_scanLocked) _pay(code);
                            },
                          ),
                          Positioned(
                            left: 24,
                            right: 24,
                            top: 24,
                            bottom: 24,
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                border: Border.all(color: AppColors.primary, width: 2),
                                borderRadius: BorderRadius.circular(AppRadii.md),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                AppCard(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(AppRadii.sm),
                        ),
                        child: const Icon(Icons.center_focus_strong, color: AppColors.primary),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Text(
                          'Point your camera at the bus QR code. Payment is automatic.',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.textMuted,
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ] else ...[
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(AppRadii.sm),
                        ),
                        child: const Icon(Icons.pin, color: AppColors.primary, size: 28),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Enter payment code',
                        style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Type the code shown on the bus or parking screen.',
                        style: theme.textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
                      ),
                      const SizedBox(height: 20),
                      TextField(
                        controller: _manual,
                        textCapitalization: TextCapitalization.none,
                        autocorrect: false,
                        decoration: const InputDecoration(
                          labelText: 'Payment code',
                          hintText: 'Paste or type code',
                          prefixIcon: Icon(Icons.qr_code_2_outlined),
                        ),
                        onSubmitted: _loading ? null : _pay,
                      ),
                      const SizedBox(height: 20),
                      FilledButton.icon(
                        onPressed: _loading ? null : () => _pay(_manual.text),
                        icon: const Icon(Icons.payment_rounded),
                        label: const Text('Pay now'),
                      ),
                    ],
                  ),
                ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(AppRadii.sm),
                    border: Border.all(color: AppColors.error.withValues(alpha: 0.25)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: AppColors.error, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _error!,
                          style: theme.textTheme.bodySmall?.copyWith(color: AppColors.error, height: 1.35),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
          if (_loading)
            Container(
              color: Colors.black.withValues(alpha: 0.35),
              child: Center(
                child: AppCard(
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 28),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CircularProgressIndicator(color: AppColors.primary),
                      const SizedBox(height: 16),
                      Text(
                        'Processing payment…',
                        style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
