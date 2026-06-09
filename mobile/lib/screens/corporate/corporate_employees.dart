import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../utils/phone_input.dart';

class CorporateEmployees extends StatefulWidget {
  final ApiService api;

  const CorporateEmployees({super.key, required this.api});

  @override
  State<CorporateEmployees> createState() => _CorporateEmployeesState();
}

class _CorporateEmployeesState extends State<CorporateEmployees> {
  List<dynamic> _rows = [];
  bool _loading = true;
  final _phone = TextEditingController();
  final _name = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final list = await widget.api.getList('/corporate/employees');
      if (mounted) setState(() { _rows = list; _loading = false; });
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  Future<void> _add() async {
    final err = PhoneInput.validate(_phone.text);
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
      return;
    }
    try {
      await widget.api.postJson('/corporate/employees', {
        'phone': PhoneInput.digitsOnly(_phone.text),
        'name': _name.text.trim(),
      });
      _phone.clear();
      _name.clear();
      await _load();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Employee added')));
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<void> _remove(String id) async {
    try {
      await widget.api.delete('/corporate/employees/$id');
      await _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Employees'),
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _load)],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text(
                  'Add employee phone — they register in the passenger app and fares are paid from your company wallet.',
                  style: TextStyle(color: Colors.black54),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _phone,
                  keyboardType: TextInputType.number,
                  inputFormatters: PhoneInput.formatters,
                  maxLength: 10,
                  decoration: const InputDecoration(
                    labelText: 'Employee phone',
                    border: OutlineInputBorder(),
                    counterText: '',
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'Name (optional)', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                FilledButton.icon(onPressed: _add, icon: const Icon(Icons.person_add), label: const Text('Add employee')),
                const SizedBox(height: 24),
                const Text('Roster', style: TextStyle(fontWeight: FontWeight.bold)),
                if (_rows.isEmpty)
                  const Padding(padding: EdgeInsets.symmetric(vertical: 16), child: Text('No employees yet'))
                else
                  ..._rows.map((r) {
                    final m = r as Map<String, dynamic>;
                    final registered = m['registered'] == true;
                    return ListTile(
                      title: Text(m['name']?.toString().isNotEmpty == true ? m['name'].toString() : m['phone']?.toString() ?? ''),
                      subtitle: Text(registered ? 'Registered in app' : 'Waiting for app sign-up'),
                      trailing: registered
                          ? const Icon(Icons.check_circle, color: Colors.green)
                          : IconButton(icon: const Icon(Icons.delete_outline), onPressed: () => _remove(m['id']?.toString() ?? '')),
                    );
                  }),
              ],
            ),
    );
  }
}
