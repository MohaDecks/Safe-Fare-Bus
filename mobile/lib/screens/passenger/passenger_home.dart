import 'package:flutter/material.dart';
import '../../models/user.dart';
import '../../services/api_service.dart';

class PassengerHome extends StatefulWidget {
  final AppUser user;
  final ApiService api;
  final VoidCallback onLogout;

  const PassengerHome({super.key, required this.user, required this.api, required this.onLogout});

  @override
  State<PassengerHome> createState() => _PassengerHomeState();
}

class _PassengerHomeState extends State<PassengerHome> {
  double _balance = 0;
  List<dynamic> _txs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final w = await widget.api.getJson('/wallet');
      final txs = await widget.api.getList('/wallet/transactions');
      setState(() {
        _balance = (w['balance_birr'] as num?)?.toDouble() ?? 0;
        _txs = txs;
      });
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Wallet'),
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
                  if (widget.user.paysViaCompany && (widget.user.corporateName?.isNotEmpty ?? false)) ...[
                    const SizedBox(height: 8),
                    Material(
                      color: const Color(0xFFCCFBF1),
                      borderRadius: BorderRadius.circular(8),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        child: Text(
                          'Company: ${widget.user.corporateName} — fare paid from company wallet',
                          style: const TextStyle(color: Color(0xFF0F766E), fontWeight: FontWeight.w600, fontSize: 13),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  Card(
                    color: const Color(0xFF1E3A8A),
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.user.paysViaCompany ? 'Your wallet' : 'Balance',
                            style: const TextStyle(color: Colors.white70),
                          ),
                          Text(formatBirr(_balance), style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
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
