import '../services/api_service.dart';

/// Public Cloudinary URLs from GET /api/mobile/media.
class HubMedia {
  static String logoUrl = '';
  static final Map<String, String> services = {};

  static Future<void> load(ApiService api) async {
    try {
      final json = await api.getJson('/mobile/media', auth: false);
      logoUrl = json['logo_url']?.toString().trim() ?? '';
      services.clear();
      final raw = json['services'];
      if (raw is Map) {
        raw.forEach((key, value) {
          final url = value?.toString().trim() ?? '';
          if (url.isNotEmpty) services[key.toString()] = url;
        });
      }
      if (logoUrl.isEmpty) {
        final branding = await api.getBranding();
        logoUrl = branding.logoUrl;
      }
    } catch (_) {}
  }

  static String serviceUrl(String id) => services[id] ?? '';
}
