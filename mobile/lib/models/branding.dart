class AppBranding {
  final String name;
  final String logoUrl;

  const AppBranding({required this.name, required this.logoUrl});

  factory AppBranding.fromJson(Map<String, dynamic> json) {
    return AppBranding(
      name: json['name']?.toString().trim() ?? defaultName,
      logoUrl: json['logo_url']?.toString().trim() ?? '',
    );
  }

  static const defaultName = 'Dirshay Bus';
  static const fallback = AppBranding(name: defaultName, logoUrl: '');
}
