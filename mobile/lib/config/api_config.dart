/// Customer app API only — staff use http://localhost:4000/admin/ in browser (separate).
class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE',
    defaultValue: 'http://127.0.0.1:4000',
  );

  static String get api => '$baseUrl/api';
}
