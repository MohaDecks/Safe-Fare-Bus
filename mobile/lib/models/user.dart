class AppUser {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? phone;
  final String? companyId;
  final bool profileComplete;
  final String? portalHome;
  final String? corporateName;
  final bool paysViaCompany;

  AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.phone,
    this.companyId,
    this.profileComplete = true,
    this.portalHome,
    this.corporateName,
    this.paysViaCompany = false,
  });

  bool get isCashier => portalHome == 'qr' || role.toLowerCase() == 'cashier';
  bool get isCorporate => portalHome == 'corporate' || role.toLowerCase() == 'corporate';

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: j['id'] as String,
        name: j['name'] as String,
        email: j['email'] as String,
        role: j['role'] as String,
        phone: j['phone'] as String?,
        companyId: j['company_id'] as String?,
        profileComplete: j['profile_complete'] as bool? ?? j['needs_registration'] != true,
        portalHome: j['portal_home'] as String?,
        corporateName: (j['corporate_name'] ?? j['company_name']) as String?,
        paysViaCompany: j['pays_via_company'] == true,
      );
}
