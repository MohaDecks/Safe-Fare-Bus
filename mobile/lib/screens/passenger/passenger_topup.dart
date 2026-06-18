import 'package:flutter/material.dart';
import '../../config/api_config.dart';
import '../../services/api_service.dart';
import '../../utils/payment_feedback.dart';
import '../../widgets/payment_dialogs.dart';

class PassengerTopUp extends StatefulWidget {
  final ApiService api;
  final VoidCallback? onWalletChanged;

  const PassengerTopUp({super.key, required this.api, this.onWalletChanged});

  @override
  State<PassengerTopUp> createState() => PassengerTopUpState();
}

class PassengerTopUpState extends State<PassengerTopUp> {
  void refreshFromAdmin() => refreshData();

  Future<void> refreshData({bool silent = false}) => _loadProviders(silent: silent);

  final _amount = TextEditingController(text: '100');
  bool _loading = false;
  bool _loadingProviders = true;
  String? _loadError;
  List<Map<String, dynamic>> _providers = [];
  String? _selectedProviderId;

  @override
  void initState() {
    super.initState();
    _loadProviders();
  }

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  Future<void> _loadProviders({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loadingProviders = true;
        _loadError = null;
      });
    }
    try {
      final list = await widget.api.getList('/wallet/payment-providers');
      if (!mounted) return;
      final parsed = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      setState(() {
        _providers = parsed;
        _loadingProviders = false;
        if (parsed.isNotEmpty) {
          final stillValid = parsed.any((p) => p['id']?.toString() == _selectedProviderId);
          if (!stillValid) _selectedProviderId = parsed.first['id']?.toString();
        } else {
          _selectedProviderId = null;
        }
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      if (silent) return;
      setState(() {
        _loadingProviders = false;
        _loadError = e.message;
        _providers = [];
        _selectedProviderId = null;
      });
    } catch (e) {
      if (!mounted) return;
      if (silent) return;
      setState(() {
        _loadingProviders = false;
        _loadError = 'Cannot reach server. Start backend: npm run dev (port 4000)';
        _providers = [];
        _selectedProviderId = null;
      });
    }
  }

  String _logoUrl(Map<String, dynamic> p) {
    final url = p['logo_url']?.toString() ?? '';
    if (url.isEmpty) return '';
    if (url.startsWith('http')) return url;
    return '${ApiConfig.baseUrl}$url';
  }

  Color _brandColor(String slug) {
    switch (slug) {
      case 'telebirr':
        return const Color(0xFF00A651);
      case 'cbe-birr':
        return const Color(0xFF8B1538);
      case 'ebirr':
      case 'e-birr':
        return const Color(0xFF1565C0);
      case 'kaafi':
        return const Color(0xFFE65100);
      case 'coopay':
        return const Color(0xFF2E7D32);
      default:
        return Colors.deepPurple;
    }
  }

  Future<void> _topup() async {
    if (_selectedProviderId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Dooro shirkad lacag bixinta (radio)')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      final amount = double.parse(_amount.text);
      final res = await widget.api.postJson('/wallet/topup', {
        'amount_birr': amount,
        'payment_provider_id': _selectedProviderId,
      });
      if (!mounted) return;
      widget.onWalletChanged?.call();
      await PaymentFeedback.playSuccess();
      if (!mounted) return;
      await showTopUpSuccessDialog(
        context,
        addedBirr: (res['added_birr'] as num?) ?? amount,
        balanceBirr: (res['balance_birr'] as num?) ?? 0,
        provider: res['provider']?.toString(),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      await PaymentFeedback.playError();
      if (!mounted) return;
      if (isInsufficientBalanceError(e.message, data: e.data)) {
        await showInsufficientBalanceDialog(context, message: e.message);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _providerIcon(Map<String, dynamic> p) {
    final name = p['name']?.toString() ?? '';
    final slug = p['slug']?.toString() ?? '';
    final color = _brandColor(slug);
    final logo = _logoUrl(p);

    if (logo.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Image.network(
          logo,
          width: 48,
          height: 48,
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) => _fallbackIcon(name, color),
        ),
      );
    }
    return _fallbackIcon(name, color);
  }

  Widget _fallbackIcon(String name, Color color) {
    final initials = name.length >= 2 ? name.substring(0, 2).toUpperCase() : name.toUpperCase();
    return Container(
      width: 48,
      height: 48,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(initials, style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 14)),
    );
  }

  Widget _paymentOptionRow(Map<String, dynamic> p) {
    final id = p['id']?.toString() ?? '';
    final name = p['name']?.toString() ?? '';
    final selected = _selectedProviderId == id;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => setState(() => _selectedProviderId = id),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: selected ? Theme.of(context).colorScheme.primary : Colors.grey.shade300,
                width: selected ? 2.5 : 1,
              ),
            ),
            child: Row(
              children: [
                _providerIcon(p),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    name,
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                ),
                Radio<String>(
                  value: id,
                  groupValue: _selectedProviderId,
                  onChanged: (v) => setState(() => _selectedProviderId = v),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildProviderSection() {
    if (_loadingProviders) {
      return const SizedBox(
        height: 180,
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (_loadError != null) {
      return Card(
        color: Colors.red.shade50,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Text(_loadError!, textAlign: TextAlign.center, style: TextStyle(color: Colors.red.shade900)),
              const SizedBox(height: 10),
              FilledButton.tonal(onPressed: _loadProviders, child: const Text('Try again')),
            ],
          ),
        ),
      );
    }
    if (_providers.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              const Icon(Icons.payments_outlined, size: 44, color: Colors.grey),
              const SizedBox(height: 12),
              const Text(
                'Liiska ma jiro. Admin-ka ha ku daro top-up apps (web portal).',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              FilledButton.tonal(onPressed: _loadProviders, child: const Text('Reload list')),
            ],
          ),
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: _providers.map(_paymentOptionRow).toList(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Top up'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: () => refreshData()),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            color: Theme.of(context).colorScheme.primaryContainer,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'More payment options',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(
                  _loadingProviders
                      ? 'Loading from admin…'
                      : _providers.isEmpty
                          ? 'Dooro shirkad marka liiska soo baxo'
                          : '${_providers.length} apps — dooro mid (radio)',
                  style: TextStyle(color: Colors.grey.shade800, fontSize: 13),
                ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => refreshData(),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _buildProviderSection(),
                  const SizedBox(height: 24),
                  const Divider(thickness: 1),
                  const SizedBox(height: 8),
                  const Text('Amount', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _amount,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Amount (ETB)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    children: [50, 100, 200, 500]
                        .map(
                          (a) => ActionChip(
                            label: Text('ETB $a'),
                            onPressed: () => _amount.text = '$a',
                          ),
                        )
                        .toList(),
                  ),
                  const SizedBox(height: 80),
                ],
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: SizedBox(
                width: double.infinity,
                height: 50,
                child: FilledButton(
                  onPressed: (_loading || _providers.isEmpty || _selectedProviderId == null) ? null : _topup,
                  child: Text(_loading ? 'Processing…' : 'Top up now'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
