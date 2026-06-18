import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'webview_platform_init.dart' if (dart.library.html) 'webview_platform_init_web.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/passenger/passenger_shell.dart';
import 'screens/cashier/cashier_shell.dart';
import 'config/api_config.dart';
import 'services/api_service.dart';
import 'models/user.dart';
import 'models/branding.dart';

void main() {
  runZonedGuarded(() {
    WidgetsFlutterBinding.ensureInitialized();
    initWebViewPlatform();
    FlutterError.onError = (details) {
      if (kDebugMode) {
        FlutterError.dumpErrorToConsole(details);
      }
    };
    runApp(const SafeFareApp());
  }, (error, stack) {
    if (kDebugMode) {
      debugPrint('SafeFare crash: $error\n$stack');
    }
  });
}

class SafeFareApp extends StatelessWidget {
  const SafeFareApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Dirshay Bus',
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
  bool _splashDone = false;
  AppUser? _user;
  bool _needsRegistration = false;
  String? _bootMessage;
  AppBranding _branding = AppBranding.fallback;

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    final bootFuture = _runBoot();
    final splashFuture = Future<void>.delayed(const Duration(milliseconds: 1800));
    await Future.wait([bootFuture, splashFuture]);
    if (mounted) setState(() => _splashDone = true);
  }

  Future<void> _runBoot() async {
    try {
      await _api.ping().timeout(const Duration(seconds: 8));
      final branding = await _api.getBranding();
      if (mounted) setState(() => _branding = branding);
      final token = await _api.getToken();
      if (token != null) {
        final me = await _api.getJson('/auth/me').timeout(const Duration(seconds: 10));
        final user = AppUser.fromJson(me);
        if (user.isCorporate) {
          await _api.logout();
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
    } catch (e) {
      await _api.logout();
      _bootMessage = 'Cannot connect to ${ApiConfig.baseUrl}. Hubi server-ka iyo internet.';
      if (kDebugMode) debugPrint('Boot error: $e');
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
    if (!_splashDone) {
      return SplashScreen(branding: _branding);
    }
    if (_user == null) {
      return LoginScreen(
        api: _api,
        branding: _branding,
        onVerified: _onVerified,
        onCashierVerified: _onCashierVerified,
        bootMessage: _bootMessage,
      );
    }
    if (_needsRegistration) {
      return RegisterScreen(api: _api, onComplete: _onRegistrationDone);
    }
    if (_user!.isCashier) {
      return CashierShell(user: _user!, api: _api, onLogout: _onLogout);
    }
    return PassengerShell(user: _user!, api: _api, onLogout: _onLogout);
  }
}
