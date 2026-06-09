import 'package:flutter/material.dart';
import '../../models/user.dart';
import '../../services/api_service.dart';

class CashierHome extends StatefulWidget {
  final AppUser user;
  final ApiService api;
  final VoidCallback onLogout;

  const CashierHome({super.key, required this.user, required this.api, required this.onLogout});

  @override
  State<CashierHome> createState() => _CashierHomeState();
}

class _CashierHomeState extends State<CashierHome> {
  bool _loading = true;
  Map<String, dynamic>? _dash;
  Map<String, dynamic>? _qr;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final dash = await widget.api.getJson('/cashier/dashboard');
      final qr = await widget.api.getJsonOrNull('/cashier/qr/active');
      if (mounted) {
        setState(() {
          _dash = dash;
          _qr = qr;
          _loading = false;
        });
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bus = _dash?['bus'] as Map<String, dynamic>?;
    final today = _dash?['today'] as Map<String, dynamic>? ?? {};
    final activeTrip = _dash?['active_trip'] as Map<String, dynamic>?;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Cashier'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
          IconButton(icon: const Icon(Icons.logout), onPressed: widget.onLogout),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text('Hi, ${widget.user.name}', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 4),
                  Text(widget.user.email, style: const TextStyle(color: Colors.black54)),
                  const SizedBox(height: 16),
                  if (bus == null)
                    const Card(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: Text('No bus assigned. Ask admin to assign you on Buses page.'),
                      ),
                    )
                  else ...[
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(bus['plate']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                            Text(bus['route_name']?.toString() ?? ''),
                            Text('Fare: ${formatBirr((bus['fare_birr'] as num?) ?? 0)}'),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: Card(
                            color: const Color(0xFF1E3A8A),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Today revenue', style: TextStyle(color: Colors.white70)),
                                  Text(
                                    formatBirr((today['revenue_birr'] as num?) ?? 0),
                                    style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Today trips'),
                                  Text(
                                    '${today['trips'] ?? 0}',
                                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (activeTrip != null) ...[
                      const SizedBox(height: 12),
                      Material(
                        color: const Color(0xFFDCFCE7),
                        borderRadius: BorderRadius.circular(8),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Text(
                            'Active trip: ${activeTrip['from_stop']} → ${activeTrip['to_stop']}',
                            style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF166534)),
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 20),
                    const Text('QR — passengers scan in app', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    if (_qr == null)
                      const Card(
                        child: Padding(
                          padding: EdgeInsets.all(20),
                          child: Text('No QR yet. Admin must generate in portal → QR Codes.'),
                        ),
                      )
                    else ...[
                      Center(
                        child: Image.network(
                          _qr!['qr_image']?.toString() ?? '',
                          width: 260,
                          height: 260,
                          errorBuilder: (_, __, ___) => const Icon(Icons.qr_code_2, size: 120),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Center(
                        child: Text(
                          formatBirr((_qr!['fare_birr'] as num?) ?? 0),
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                      ),
                      Center(
                        child: Text(
                          '${_qr!['scan_count'] ?? 0} passengers paid',
                          style: const TextStyle(color: Colors.black54),
                        ),
                      ),
                    ],
                  ],
                ],
              ),
            ),
    );
  }
}
