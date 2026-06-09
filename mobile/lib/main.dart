import 'dart:async';
import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/passenger/passenger_shell.dart';
import 'screens/cashier/cashier_shell.dart';
import 'screens/corporate/corporate_shell.dart';
import 'config/api_config.dart';
import 'services/api_service.dart';
import 'models/user.dart';

void main() => runApp(const SafeFareApp());

class SafeFareApp extends StatelessWidget {
  const SafeFareApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SafeFare',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF7C3AED)),
        useMaterial3: true,
      ),
      home: const SplashGate(),
    );
  }
}

/// Passenger + cashier in one app (switch on login).
class SplashGate extends StatefulWidget {
  const SplashGate({super.key});

  @override
  State<SplashGate> createState() => _SplashGateState();
}

class _SplashGateState extends State<SplashGate> {
  final _api = ApiService();
  bool _loading = true;
  AppUser? _user;
  bool _needsRegistration = false;
  String? _bootMessage;

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    try {
      await _api.ping().timeout(const Duration(seconds: 8));
      final token = await _api.getToken();
      if (token != null) {
        final me = await _api.getJson('/auth/me').timeout(const Duration(seconds: 10));
        final user = AppUser.fromJson(me);
        if (user.isCorporate) {
          _user = user;
          _needsRegistration = false;
        } else if (user.isCashier) {
          _user = user;
          _needsRegistration = false;
        } else if (user.role == 'passenger') {
          _user = user;
          _needsRegistration = me['needs_registration'] == true || !user.profileComplete;
        } else {
          await _api.logout();
        }
      }
    } on TimeoutException {
      await _api.logout();
      _bootMessage = 'API ma jirto. Bilow backend: cd backend && npm run dev';
    } on ApiException catch (e) {
      await _api.logout();
      _bootMessage = e.message;
    } catch (_) {
      await _api.logout();
      _bootMessage = 'Cannot connect to ${ApiConfig.baseUrl}';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onVerified(AppUser user, {required bool needsRegistration}) {
    setState(() {
      _user = user;
      _needsRegistration = needsRegistration;
      _bootMessage = null;
    });
  }

  void _onCashierVerified(AppUser user) {
    setState(() {
      _user = user;
      _needsRegistration = false;
      _bootMessage = null;
    });
  }

  void _onCorporateVerified(AppUser user) {
    setState(() {
      _user = user;
      _needsRegistration = false;
      _bootMessage = null;
    });
  }

  void _onRegistrationDone(AppUser user) {
    setState(() {
      _user = user;
      _needsRegistration = false;
    });
  }

  Future<void> _onLogout() async {
    await _api.logout();
    if (mounted) {
      setState(() {
        _user = null;
        _needsRegistration = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('SafeFare', style: TextStyle(color: Colors.black54)),
            ],
          ),
        ),
      );
    }
    if (_user == null) {
      return LoginScreen(
        api: _api,
        onVerified: _onVerified,
        onCashierVerified: _onCashierVerified,
        onCorporateVerified: _onCorporateVerified,
        bootMessage: _bootMessage,
      );
    }
    if (_needsRegistration) {
      return RegisterScreen(api: _api, onComplete: _onRegistrationDone);
    }
    if (_user!.isCorporate) {
      return CorporateShell(user: _user!, api: _api, onLogout: _onLogout);
    }
    if (_user!.isCashier) {
      return CashierShell(user: _user!, api: _api, onLogout: _onLogout);
    }
    return PassengerShell(user: _user!, api: _api, onLogout: _onLogout);
  }
}
