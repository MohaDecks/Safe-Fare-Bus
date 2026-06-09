import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class ApiException implements Exception {
  final String message;
  final int? status;
  ApiException(this.message, [this.status]);
  @override
  String toString() => message;
}

class ApiService {
  static const _tokenKey = 'sf_token';
  static const _timeout = Duration(seconds: 12);

  /// Quick check — app does not open admin portal.
  Future<void> ping() async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/api');
    try {
      final res = await http.get(uri).timeout(_timeout);
      if (res.statusCode >= 500) {
        throw ApiException('Server error');
      }
    } on TimeoutException {
      throw ApiException(
        'Cannot reach API at ${ApiConfig.baseUrl}. Run: cd backend && npm run dev',
      );
    }
  }

  Future<String?> getToken() async {
    final p = await SharedPreferences.getInstance();
    return p.getString(_tokenKey);
  }

  Future<void> setToken(String? token) async {
    final p = await SharedPreferences.getInstance();
    if (token == null) {
      await p.remove(_tokenKey);
    } else {
      await p.setString(_tokenKey, token);
    }
  }

  Future<http.Response> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool auth = true,
  }) async {
    final uri = Uri.parse('${ApiConfig.api}$path');
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (auth) {
      final token = await getToken();
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }
    http.Response res;
    try {
      switch (method) {
        case 'GET':
          res = await http.get(uri, headers: headers).timeout(_timeout);
          break;
        case 'POST':
          res = await http
              .post(uri, headers: headers, body: body != null ? jsonEncode(body) : null)
              .timeout(_timeout);
          break;
        case 'DELETE':
          res = await http.delete(uri, headers: headers).timeout(_timeout);
          break;
        default:
          throw ApiException('Unsupported method');
      }
    } on TimeoutException {
      throw ApiException(
        'Connection timed out. Is backend running at ${ApiConfig.baseUrl}?',
      );
    }
    if (res.statusCode >= 400) {
      String msg = 'Request failed';
      try {
        final j = jsonDecode(res.body) as Map<String, dynamic>;
        msg = j['detail']?.toString() ?? msg;
      } catch (_) {}
      throw ApiException(msg, res.statusCode);
    }
    return res;
  }

  Future<Map<String, dynamic>> getJson(String path, {bool auth = true}) async {
    final res = await _request('GET', path, auth: auth);
    if (res.body.isEmpty) return {};
    final decoded = jsonDecode(res.body);
    if (decoded == null) return {};
    return decoded as Map<String, dynamic>;
  }

  /// GET that may return JSON `null` (e.g. no active QR).
  Future<Map<String, dynamic>?> getJsonOrNull(String path) async {
    final res = await _request('GET', path);
    if (res.body.isEmpty || res.body == 'null') return null;
    final decoded = jsonDecode(res.body);
    if (decoded == null) return null;
    return decoded as Map<String, dynamic>;
  }

  Future<List<dynamic>> getList(String path) async {
    final res = await _request('GET', path);
    if (res.body.isEmpty) return [];
    final decoded = jsonDecode(res.body);
    if (decoded is List) return decoded;
    throw ApiException('Invalid response from server');
  }

  Future<Map<String, dynamic>> postJson(String path, Map<String, dynamic> body, {bool auth = true}) async {
    final res = await _request('POST', path, body: body, auth: auth);
    if (res.body.isEmpty) return {};
    final decoded = jsonDecode(res.body);
    if (decoded is Map<String, dynamic>) return decoded;
    return {};
  }

  Future<Map<String, dynamic>> checkPassengerPhone(String phone) async {
    return postJson('/auth/passenger/check-phone', {'phone': phone}, auth: false);
  }

  Future<Map<String, dynamic>> sendPassengerOtp(String phone) async {
    return postJson('/auth/passenger/send-otp', {'phone': phone}, auth: false);
  }

  Future<Map<String, dynamic>> verifyPassengerOtp(String phone, String otp) async {
    return postJson('/auth/passenger/verify-otp', {'phone': phone, 'otp': otp}, auth: false);
  }

  Future<Map<String, dynamic>> completePassengerRegistration(String name, String email) async {
    return postJson('/auth/passenger/complete-registration', {'name': name, 'email': email});
  }

  Future<Map<String, dynamic>> cashierLogin(String email, String password) async {
    return postJson('/auth/mobile/cashier-login', {'email': email, 'password': password}, auth: false);
  }

  Future<Map<String, dynamic>> corporateLogin(String email, String password) async {
    return postJson('/auth/mobile/corporate-login', {'email': email, 'password': password}, auth: false);
  }

  Future<void> delete(String path) async {
    await _request('DELETE', path);
  }

  Future<void> logout() => setToken(null);
}

String formatBirr(num n) => 'ETB ${n.toStringAsFixed(2)}';
