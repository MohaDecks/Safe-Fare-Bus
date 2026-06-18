import 'package:flutter/material.dart';
import '../../models/user.dart';
import '../../services/api_service.dart';

class PassengerHome extends StatefulWidget {
  final AppUser user;
  final ApiService api;
  final VoidCallback onLogout;

  const PassengerHome({super.key, required this.user, required this.api, required this.onLogout});

  @override
  State<PassengerHome> createState() => PassengerHomeState();
}

class PassengerHomeState extends State<PassengerHome> {
  double _balance = 0;
  List<dynamic> _txs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> refreshData({bool silent = false}) => _load(silent: silent);

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    try {
      final w = await widget.api.getJson('/wallet');
      final txs = await widget.api.getList('/wallet/transactions');
      if (!mounted) return;
      setState(() {
        _balance = (w['balance_birr'] as num?)?.toDouble() ?? 0;
        _txs = txs;
      });
    } on ApiException catch (e) {
      if (mounted && !silent) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) {
        if (!silent) {
          setState(() => _loading = false);
        } else if (_loading) {
          setState(() => _loading = false);
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Wallet'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: () => refreshData()),
          IconButton(icon: const Icon(Icons.logout), onPressed: widget.onLogout),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => refreshData(),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text('Hi, ${widget.user.name}', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 12),
                  Card(
                    color: const Color(0xFF1E3A8A),
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Your wallet', style: TextStyle(color: Colors.white70)),
                          Text(
                            formatBirr(_balance),
                            style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
                          ),
                          const Padding(
                            padding: EdgeInsets.only(top: 6),
                            child: Text(
                              'Scan QR → fare deducted here',
                              style: TextStyle(color: Colors.white60, fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text('Recent', style: TextStyle(fontWeight: FontWeight.bold)),
                  ..._txs.take(5).map((t) {
                    final m = t as Map<String, dynamic>;
                    return ListTile(
                      title: Text(m['description']?.toString() ?? m['type']?.toString() ?? ''),
                      trailing: Text(formatBirr((m['amount_birr'] as num?) ?? 0)),
                    );
                  }),
                ],
              ),
            ),
    );
  }
}
