import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../models/user.dart';
import '../../services/api_service.dart';
import '../../utils/payment_feedback.dart';
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
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
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
    return Scaffold(
      appBar: AppBar(title: const Text('Pay fare')),
      body: Stack(
        children: [
          ListView(
            padding: const EdgeInsets.all(16),
            children: [
              SegmentedButton<bool>(
                segments: const [
                  ButtonSegment(value: true, label: Text('Scan QR'), icon: Icon(Icons.qr_code_scanner)),
                  ButtonSegment(value: false, label: Text('Manual code'), icon: Icon(Icons.edit)),
                ],
                selected: {_useCamera},
                onSelectionChanged: (s) => setState(() => _useCamera = s.first),
              ),
              const SizedBox(height: 16),
              if (_useCamera)
                SizedBox(
                  height: 320,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: MobileScanner(
                      onDetect: (capture) {
                        final code = capture.barcodes.firstOrNull?.rawValue;
                        if (code != null && !_loading && !_scanLocked) _pay(code);
                      },
                    ),
                  ),
                )
              else ...[
                const Text(
                  'Enter the code shown on the bus QR screen.',
                  style: TextStyle(color: Colors.black54, fontSize: 13),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _manual,
                  textCapitalization: TextCapitalization.none,
                  autocorrect: false,
                  decoration: const InputDecoration(
                    labelText: 'QR token',
                    border: OutlineInputBorder(),
                  ),
                  onSubmitted: _loading ? null : _pay,
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 48,
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _loading ? null : () => _pay(_manual.text),
                    icon: const Icon(Icons.payment),
                    label: const Text('Pay'),
                  ),
                ),
              ],
            ],
          ),
          if (_loading)
            Container(
              color: Colors.black26,
              child: const Center(child: CircularProgressIndicator()),
            ),
        ],
      ),
    );
  }
}
