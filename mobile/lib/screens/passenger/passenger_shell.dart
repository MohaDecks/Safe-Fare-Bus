import 'package:flutter/material.dart';
import '../../models/user.dart';
import '../../services/api_service.dart';
import 'passenger_home.dart';
import 'passenger_scan.dart';
import 'passenger_topup.dart';
import 'passenger_history.dart';

class PassengerShell extends StatefulWidget {
  final AppUser user;
  final ApiService api;
  final VoidCallback onLogout;

  const PassengerShell({super.key, required this.user, required this.api, required this.onLogout});

  @override
  State<PassengerShell> createState() => _PassengerShellState();
}

class _PassengerShellState extends State<PassengerShell> {
  int _index = 0;
  final _homeKey = GlobalKey<PassengerHomeState>();
  final _historyKey = GlobalKey<PassengerHistoryState>();
  final _topUpKey = GlobalKey<PassengerTopUpState>();

  void _selectTab(int index) {
    if (index == _index) return;
    setState(() => _index = index);
  }

  void _refreshWalletData() {
    _homeKey.currentState?.refreshData(silent: true);
    _historyKey.currentState?.refreshData(silent: true);
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      PassengerHome(
        key: _homeKey,
        user: widget.user,
        api: widget.api,
        onLogout: widget.onLogout,
        onNavigate: _selectTab,
      ),
      PassengerScan(api: widget.api, user: widget.user, onWalletChanged: _refreshWalletData),
      PassengerTopUp(key: _topUpKey, api: widget.api, onWalletChanged: _refreshWalletData),
      PassengerHistory(key: _historyKey, api: widget.api),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _selectTab,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: [
          NavigationDestination(
            icon: _NavIcon(icon: Icons.home_outlined, selected: _index == 0),
            selectedIcon: _NavIcon(icon: Icons.home_rounded, selected: true),
            label: 'Home',
          ),
          NavigationDestination(
            icon: _NavIcon(icon: Icons.qr_code_scanner_outlined, selected: _index == 1),
            selectedIcon: _NavIcon(icon: Icons.qr_code_scanner, selected: true),
            label: 'Pay',
          ),
          NavigationDestination(
            icon: _NavIcon(icon: Icons.account_balance_wallet_outlined, selected: _index == 2),
            selectedIcon: _NavIcon(icon: Icons.account_balance_wallet, selected: true),
            label: 'Top up',
          ),
          NavigationDestination(
            icon: _NavIcon(icon: Icons.receipt_long_outlined, selected: _index == 3),
            selectedIcon: _NavIcon(icon: Icons.receipt_long, selected: true),
            label: 'Trips',
          ),
        ],
      ),
    );
  }
}

class _NavIcon extends StatelessWidget {
  final IconData icon;
  final bool selected;

  const _NavIcon({required this.icon, required this.selected});

  @override
  Widget build(BuildContext context) {
    return AnimatedScale(
      scale: selected ? 1.08 : 1,
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOutBack,
      child: Icon(icon),
    );
  }
}
