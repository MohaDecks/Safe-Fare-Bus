import 'package:flutter/material.dart';
import '../../models/user.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import 'passenger_home.dart';
import 'passenger_history.dart';
import 'passenger_scan.dart';
import 'passenger_topup.dart';

/// The original Dirsha home — wallet, QR pay, top-up, trips.
class BusBookingShell extends StatefulWidget {
  final AppUser user;
  final ApiService api;
  final VoidCallback onLogout;
  final bool showBack;
  final VoidCallback? onClose;

  const BusBookingShell({
    super.key,
    required this.user,
    required this.api,
    required this.onLogout,
    this.showBack = false,
    this.onClose,
  });

  @override
  State<BusBookingShell> createState() => _BusBookingShellState();
}

class _BusBookingShellState extends State<BusBookingShell> {
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
        onBack: widget.showBack
            ? () {
                if (widget.onClose != null) {
                  widget.onClose!();
                } else {
                  Navigator.of(context).maybePop();
                }
              }
            : null,
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
            icon: Icon(Icons.home_outlined, color: _index == 0 ? AppColors.primary : null),
            selectedIcon: const Icon(Icons.home_rounded, color: AppColors.primary),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.qr_code_scanner_outlined, color: _index == 1 ? AppColors.primary : null),
            selectedIcon: const Icon(Icons.qr_code_scanner, color: AppColors.primary),
            label: 'Pay',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_wallet_outlined, color: _index == 2 ? AppColors.primary : null),
            selectedIcon: const Icon(Icons.account_balance_wallet, color: AppColors.primary),
            label: 'Top up',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined, color: _index == 3 ? AppColors.primary : null),
            selectedIcon: const Icon(Icons.receipt_long, color: AppColors.primary),
            label: 'Trips',
          ),
        ],
      ),
    );
  }
}
