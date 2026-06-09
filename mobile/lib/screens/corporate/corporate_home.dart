import 'package:flutter/material.dart';
import '../../models/user.dart';
import '../../services/api_service.dart';
class CorporateHome extends StatefulWidget {
  final AppUser user;
  final ApiService api;
  final VoidCallback onLogout;

  const CorporateHome({super.key, required this.user, required this.api, required this.onLogout});

  @override
  State<CorporateHome> createState() => _CorporateHomeState();
}

class _CorporateHomeState extends State<CorporateHome> {
  Map<String, dynamic>? _dash;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final d = await widget.api.getJson('/corporate/dashboard');
      if (mounted) setState(() { _dash = d; _loading = false; });
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final company = _dash?['company_name'] ?? widget.user.corporateName ?? widget.user.name;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Corporate'),
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
                  Text(company, style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 4),
                  Text(widget.user.email, style: const TextStyle(color: Colors.black54)),
                  const SizedBox(height: 16),
                  Card(
                    color: const Color(0xFF0F766E),
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Company wallet', style: TextStyle(color: Colors.white70)),
                          Text(
                            formatBirr((_dash?['balance_birr'] as num?) ?? 0),
                            style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Employee bus fares are deducted from this wallet',
                            style: TextStyle(color: Colors.white70, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              children: [
                                const Text('Employees'),
                                Text('${_dash?['employees_total'] ?? 0}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              children: [
                                const Text('Registered'),
                                Text('${_dash?['employees_registered'] ?? 0}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  const Text('Top up company wallet', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  CorporateTopUpPanel(api: widget.api, onDone: _load),
                ],
              ),
            ),
    );
  }
}

/// Reuses top-up UI with corporate API paths.
class CorporateTopUpPanel extends StatefulWidget {
  final ApiService api;
  final VoidCallback onDone;

  const CorporateTopUpPanel({super.key, required this.api, required this.onDone});

  @override
  State<CorporateTopUpPanel> createState() => _CorporateTopUpPanelState();
}

class _CorporateTopUpPanelState extends State<CorporateTopUpPanel> {
  final _amount = TextEditingController(text: '500');
  List<Map<String, dynamic>> _providers = [];
  String? _selectedId;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _loadProviders();
  }

  Future<void> _loadProviders() async {
    try {
      final list = await widget.api.getList('/corporate/payment-providers');
      setState(() {
        _providers = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        if (_providers.isNotEmpty) _selectedId = _providers.first['id']?.toString();
      });
    } catch (_) {}
  }

  Future<void> _topup() async {
    final amt = double.tryParse(_amount.text);
    if (amt == null || amt <= 0 || _selectedId == null) return;
    setState(() => _loading = true);
    try {
      await widget.api.postJson('/corporate/topup', {
        'amount_birr': amt,
        'payment_provider_id': _selectedId,
      });
      widget.onDone();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Top-up successful')));
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_providers.isEmpty) {
      return const Text('No payment apps configured — ask bus admin.', style: TextStyle(color: Colors.black54));
    }
    return Column(
      children: [
        TextField(
          controller: _amount,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Amount (ETB)', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          value: _selectedId,
          decoration: const InputDecoration(labelText: 'Payment app', border: OutlineInputBorder()),
          items: _providers
              .map((p) => DropdownMenuItem(value: p['id']?.toString(), child: Text(p['name']?.toString() ?? '')))
              .toList(),
          onChanged: (v) => setState(() => _selectedId = v),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: _loading ? null : _topup,
          child: Text(_loading ? 'Please wait…' : 'Top up wallet'),
        ),
      ],
    );
  }
}
