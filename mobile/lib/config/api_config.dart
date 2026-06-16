import 'package:flutter/foundation.dart';

/// Customer app API — staff portal is separate (browser /admin/).
class ApiConfig {
  /// Production server (release APK / App Store)
  static const String productionBase = 'http://dirshay.com';

  /// Override at build time: --dart-define=API_BASE=http://...
  static const String _envOverride = String.fromEnvironment('API_BASE', defaultValue: '');

  static String get baseUrl {
    if (_envOverride.isNotEmpty) return _envOverride;
    if (kReleaseMode) return productionBase;
    return _localDevBase;
  }

  /// Debug / flutter run — local backend
  static String get _localDevBase {
    if (kIsWeb) return 'http://127.0.0.1:4000';
    // Android emulator → host machine; iOS sim / desktop → localhost
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:4000';
    }
    return 'http://127.0.0.1:4000';
  }

  static String get api => '$baseUrl/api';

  static bool get isProduction => kReleaseMode && _envOverride.isEmpty;
}
