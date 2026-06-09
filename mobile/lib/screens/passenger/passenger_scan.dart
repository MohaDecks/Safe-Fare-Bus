import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../services/api_service.dart';

class PassengerScan extends StatefulWidget {
  final ApiService api;

  const PassengerScan({super.key, required this.api});

  @override
  State<PassengerScan> createState() => _PassengerScanState();
}

class _PassengerScanState extends State<PassengerScan> {
  final _manual = TextEditingController();
  bool _loading = false;
  Map<String, dynamic>? _result;
  bool _useCamera = true;

  Future<void> _pay(String token) async {
    if (token.isEmpty) return;
    setState(() {
      _loading = true;
      _result = null;
    });
    try {
      final res = await widget.api.postJson('/passenger/pay', {'qr_token': token.trim()});
      setState(() => _result = res);
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_result != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Payment success')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.check_circle, color: Colors.green, size: 64),
              const SizedBox(height: 12),
              Text('Paid ${formatBirr((_result!['fare_birr'] as num?) ?? 0)}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              Text('${_result!['route_name']} · ${_result!['bus_plate']}'),
              Text('Balance: ${formatBirr((_result!['balance_birr'] as num?) ?? 0)}'),
              const SizedBox(height: 24),
              FilledButton(onPressed: () => setState(() => _result = null), child: const Text('Pay again')),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Pay fare')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                SegmentedButton<bool>(
                  segments: const [
                    ButtonSegment(value: true, label: Text('Scan QR')),
                    ButtonSegment(value: false, label: Text('Manual code')),
                  ],
                  selected: {_useCamera},
                  onSelectionChanged: (s) => setState(() => _useCamera = s.first),
                ),
                const SizedBox(height: 16),
                if (_useCamera)
                  SizedBox(
                    height: 280,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: MobileScanner(
                        onDetect: (capture) {
                          final code = capture.barcodes.firstOrNull?.rawValue;
                          if (code != null && !_loading) _pay(code);
                        },
                      ),
                    ),
                  )
                else ...[
                  TextField(
                    controller: _manual,
                    decoration: const InputDecoration(labelText: 'QR token', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(onPressed: () => _pay(_manual.text), child: const Text('Pay')),
                ],
              ],
            ),
    );
  }
}
