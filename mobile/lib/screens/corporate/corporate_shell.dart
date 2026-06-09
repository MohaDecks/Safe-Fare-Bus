import 'package:flutter/material.dart';
import '../../models/user.dart';
import '../../services/api_service.dart';
import 'corporate_home.dart';
import 'corporate_employees.dart';

class CorporateShell extends StatefulWidget {
  final AppUser user;
  final ApiService api;
  final VoidCallback onLogout;

  const CorporateShell({super.key, required this.user, required this.api, required this.onLogout});

  @override
  State<CorporateShell> createState() => _CorporateShellState();
}

class _CorporateShellState extends State<CorporateShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      CorporateHome(user: widget.user, api: widget.api, onLogout: widget.onLogout),
      CorporateEmployees(api: widget.api),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.business), label: 'Company'),
          NavigationDestination(icon: Icon(Icons.groups), label: 'Employees'),
        ],
      ),
    );
  }
}
