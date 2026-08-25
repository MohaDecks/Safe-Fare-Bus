import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';
import 'webview_platform_init.dart' if (dart.library.html) 'webview_platform_init_web.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/public_marketplace_screen.dart';
import 'screens/passenger/bus_booking_shell.dart';
import 'screens/cashier/cashier_shell.dart';
import 'config/api_config.dart';
import 'services/api_service.dart';
import 'models/user.dart';
import 'theme/app_theme.dart';
import 'widgets/brand_logo.dart';
import 'services/hub_media.dart';

void main() {
  runZonedGuarded(() {
    final binding = WidgetsFlutterBinding.ensureInitialized();
    FlutterNativeSplash.preserve(widgetsBinding: binding);
    initWebViewPlatform();
    FlutterError.onError = (details) {
      if (kDebugMode) {
        FlutterError.dumpErrorToConsole(details);
      }
    };
    runApp(const DirshaApp());
  }, (error, stack) {
    if (kDebugMode) {
      debugPrint('Dirsha crash: $error\n$stack');
    }
  });
}

class DirshaApp extends StatelessWidget {
  const DirshaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Dirsha',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      home: const SplashGate(),
    );
  }
}

class SplashGate extends StatefulWidget {
  const SplashGate({super.key});

  @override
  State<SplashGate> createState() => _SplashGateState();
}

class _SplashGateState extends State<SplashGate> {
  final _api = ApiService();
  bool _splashDone = false;
  bool _logoReady = false;
  AppUser? _user;
  bool _needsRegistration = false;
  String? _bootMessage;
  bool _showLogin = false;
  bool _enteredBus = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _showLogoSplash());
    _boot();
  }

  Future<void> _showLogoSplash() async {
    if (!mounted) return;
    try {
      await precacheLocalBrandLogo(context);
    } catch (_) {}
    if (!mounted) return;
    try {
      FlutterNativeSplash.remove();
    } catch (_) {}
    if (mounted) setState(() => _logoReady = true);
  }

  Future<void> _boot() async {
    final bootFuture = _runBoot();
    final minWait = Future<void>.delayed(const Duration(milliseconds: 1200));
    await Future.wait([bootFuture, minWait]);
    if (mounted) setState(() => _splashDone = true);
  }

  Future<void> _runBoot() async {
    try {
      await _api.ping().timeout(const Duration(seconds: 8));
      await HubMedia.load(_api);
      if (mounted) setState(() {});
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
      _showLogin = false;
      _enteredBus = true;
    });
  }

  void _onCashierVerified(AppUser user) {
    setState(() {
      _user = user;
      _needsRegistration = false;
      _bootMessage = null;
      _showLogin = false;
      _enteredBus = false;
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
        _showLogin = false;
        _enteredBus = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_splashDone) {
      final logoSize = MediaQuery.sizeOf(context).width * 0.62;
      return Scaffold(
        backgroundColor: AppColors.primary,
        body: Center(
          child: _logoReady
              ? CircularBrandLogo(size: logoSize)
              : const SizedBox(
                  width: 32,
                  height: 32,
                  child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                ),
        ),
      );
    }
    if (_user == null && _showLogin) {
      return LoginScreen(
        api: _api,
        onVerified: _onVerified,
        onCashierVerified: _onCashierVerified,
        bootMessage: _bootMessage,
        onBack: () => setState(() => _showLogin = false),
      );
    }
    if (_needsRegistration) {
      return RegisterScreen(api: _api, onComplete: _onRegistrationDone);
    }
    if (_user != null && _user!.isCashier) {
      return CashierShell(user: _user!, api: _api, onLogout: _onLogout);
    }
    if (_enteredBus && _user != null) {
      return BusBookingShell(
        user: _user!,
        api: _api,
        onLogout: _onLogout,
        showBack: true,
        onClose: () => setState(() => _enteredBus = false),
      );
    }
    return PublicMarketplaceScreen(
      api: _api,
      onBusBooking: () {
        if (_user != null) {
          setState(() => _enteredBus = true);
        } else {
          setState(() => _showLogin = true);
        }
      },
      onOpenLogin: () => setState(() => _showLogin = true),
    );
  }
}
