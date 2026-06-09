import 'package:flutter/material.dart';
import '../../services/api_service.dart';

class CashierTrip extends StatefulWidget {
  final ApiService api;

  const CashierTrip({super.key, required this.api});

  @override
  State<CashierTrip> createState() => _CashierTripState();
}

class _CashierTripState extends State<CashierTrip> {
  bool _loading = true;
  Map<String, dynamic>? _active;
  Map<String, dynamic>? _bus;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final bus = await widget.api.getJson('/cashier/my-bus');
      final active = await widget.api.getJsonOrNull('/cashier/trip/active');
      if (mounted) {
        setState(() {
          _bus = bus;
          _active = active;
          _loading = false;
        });
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _bus = null;
          _loading = false;
        });
        if (e.status != 404) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
        }
      }
    }
  }

  Future<void> _action(String path) async {
    setState(() => _loading = true);
    try {
      await widget.api.postJson(path, {});
      await _load();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Updated')));
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final route = _bus?['route_name']?.toString() ?? '';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Trip'),
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _load)],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _bus == null
              ? const Center(child: Text('No bus assigned'))
              : Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(route, style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 8),
                      const Text(
                        'Mark when the bus leaves and when it arrives. Return trip swaps destination automatically.',
                        style: TextStyle(color: Colors.black54),
                      ),
                      const SizedBox(height: 24),
                      if (_active != null) ...[
                        Card(
                          color: const Color(0xFFEFF6FF),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Current trip', style: TextStyle(fontWeight: FontWeight.bold)),
                                const SizedBox(height: 8),
                                Text(
                                  '${_active!['from_stop']} → ${_active!['to_stop']}',
                                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                                ),
                                Text(
                                  _active!['direction'] == 'return' ? 'Return leg' : 'Outbound',
                                  style: const TextStyle(color: Colors.black54),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        FilledButton.icon(
                          onPressed: () => _action('/cashier/trip/complete'),
                          icon: const Icon(Icons.flag),
                          label: const Text('End trip — arrived at destination'),
                        ),
                      ] else ...[
                        const Text('No active trip', style: TextStyle(fontWeight: FontWeight.w600)),
                        const SizedBox(height: 16),
                        FilledButton.icon(
                          onPressed: () => _action('/cashier/trip/start'),
                          icon: const Icon(Icons.play_arrow),
                          label: const Text('Start trip (outbound)'),
                        ),
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          onPressed: () => _action('/cashier/trip/return'),
                          icon: const Icon(Icons.swap_horiz),
                          label: const Text('Start return trip'),
                        ),
                      ],
                    ],
                  ),
                ),
    );
  }
}
