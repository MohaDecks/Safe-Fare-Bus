import 'dart:ui' show FontFeature;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../config/api_config.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../utils/phone_input.dart';
import '../widgets/brand_logo.dart';
import '../widgets/service_hover_tile.dart';
import '../models/branding.dart';
import 'service_webview_screen.dart';

enum LoginMode { passenger, cashier }

class LoginScreen extends StatefulWidget {
  final ApiService api;
  final void Function(AppUser user, {required bool needsRegistration}) onVerified;
  final void Function(AppUser user) onCashierVerified;
  final String? bootMessage;
  final AppBranding branding;

  const LoginScreen({
    super.key,
    required this.api,
    required this.onVerified,
    required this.onCashierVerified,
    this.bootMessage,
    this.branding = AppBranding.fallback,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  LoginMode _mode = LoginMode.passenger;
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;
  bool? _phoneExists;
  bool _otpSent = false;
  String? _phoneDisplay;
  String? _generatedOtp;
  final _otpFocus = FocusNode();
  List<Map<String, dynamic>> _appServices = [];
  bool _loadingServices = true;

  @override
  void initState() {
    super.initState();
    _otp.addListener(_onOtpChanged);
    _otpFocus.addListener(_onOtpChanged);
    _loadAppServices();
  }

  Future<void> _loadAppServices() async {
    try {
      final list = await widget.api.getList('/mobile/app-services', auth: false);
      if (!mounted) return;
      setState(() {
        _appServices = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        _loadingServices = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingServices = false);
    }
  }

  String _serviceIconUrl(Map<String, dynamic> s) {
    final url = s['icon_url']?.toString() ?? '';
    if (url.isEmpty) return '';
    if (url.startsWith('http')) return url;
    return '${ApiConfig.baseUrl}$url';
  }

  void _openServiceLink(Map<String, dynamic> service) {
    final raw = service['link_url']?.toString() ?? '';
    if (raw.isEmpty) return;
    final name = service['name']?.toString() ?? 'Service';
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ServiceWebViewScreen(title: name, url: raw),
      ),
    );
  }

  @override
  void dispose() {
    _otp.removeListener(_onOtpChanged);
    _otpFocus.removeListener(_onOtpChanged);
    _otpFocus.dispose();
    _phone.dispose();
    _otp.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  void _onOtpChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _checkPhoneAndSendOtp() async {
    final phoneErr = PhoneInput.validate(_phone.text);
    if (phoneErr != null) {
      setState(() => _error = phoneErr);
      return;
    }
    final phone = PhoneInput.digitsOnly(_phone.text);
    setState(() {
      _loading = true;
      _error = null;
      _otp.clear();
      _generatedOtp = null;
    });
    try {
      final check = await widget.api.checkPassengerPhone(phone);
      _phoneExists = check['exists'] as bool? ?? false;
      _phoneDisplay = check['phone_display'] as String?;
      final res = await widget.api.sendPassengerOtp(phone);
      setState(() {
        _otpSent = true;
        _generatedOtp = res['otp_in_app'] as String? ?? res['otp_debug'] as String?;
        _phoneExists = res['exists'] as bool? ?? _phoneExists;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _otpFocus.requestFocus();
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _buildOtpInput() {
    const digitStyle = TextStyle(
      fontFamily: 'monospace',
      fontSize: 22,
      fontWeight: FontWeight.w600,
      color: Color(0xFF1E293B),
      fontFeatures: [FontFeature.tabularFigures()],
    );
    final code = _otp.text;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('OTP code', style: TextStyle(fontSize: 12, color: Colors.black54)),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: () => _otpFocus.requestFocus(),
          child: SizedBox(
            width: double.infinity,
            height: 52,
            child: Stack(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(6, (i) {
                    final hasDigit = i < code.length;
                    final isActive = _otpFocus.hasFocus && i == code.length;
                    return Container(
                      width: 44,
                      height: 52,
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isActive ? Colors.black45 : const Color(0xFFE2E8F0),
                          width: isActive ? 1.5 : 1,
                        ),
                      ),
                      child: Text(hasDigit ? code[i] : '', style: digitStyle),
                    );
                  }),
                ),
                Positioned.fill(
                  child: Opacity(
                    opacity: 0.01,
                    child: TextField(
                      controller: _otp,
                      focusNode: _otpFocus,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      decoration: const InputDecoration(
                        border: InputBorder.none,
                        counterText: '',
                      ),
                      onSubmitted: (_) => _loading ? null : _verifyOtp(),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (_generatedOtp != null) ...[
          const SizedBox(height: 10),
          Center(
            child: Text(
              'Generated OTP: $_generatedOtp',
              style: const TextStyle(
                fontSize: 12,
                color: Colors.black54,
                fontFamily: 'monospace',
                fontFeatures: [FontFeature.tabularFigures()],
              ),
            ),
          ),
        ],
      ],
    );
  }

  Future<void> _verifyOtp() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final phone = PhoneInput.digitsOnly(_phone.text);
      final res = await widget.api.verifyPassengerOtp(phone, _otp.text.trim());
      await widget.api.setToken(res['access_token'] as String);
      final user = AppUser.fromJson(res['user'] as Map<String, dynamic>);
      final needsReg = res['needs_registration'] == true;
      widget.onVerified(user, needsRegistration: needsReg);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _cashierLogin() async {
    final email = _email.text.trim();
    final pass = _password.text;
    if (email.isEmpty || pass.isEmpty) {
      setState(() => _error = 'Email and password required');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await widget.api.cashierLogin(email, pass);
      await widget.api.setToken(res['access_token'] as String);
      final user = AppUser.fromJson(res['user'] as Map<String, dynamic>);
      widget.onCashierVerified(user);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _resetPhone() {
    setState(() {
      _otpSent = false;
      _phoneExists = null;
      _otp.clear();
      _generatedOtp = null;
    });
  }

  void _onModeChange(LoginMode m) {
    setState(() {
      _mode = m;
      _error = null;
      _otpSent = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isPassenger = _mode == LoginMode.passenger;
    final isCashier = _mode == LoginMode.cashier;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 48),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                children: [
                  BrandLogo(branding: widget.branding, height: 96, maxWidth: 240),
                  const SizedBox(height: 20),
                  SegmentedButton<LoginMode>(
                    showSelectedIcon: false,
                    style: SegmentedButton.styleFrom(
                      textStyle: const TextStyle(fontSize: 12),
                      visualDensity: VisualDensity.compact,
                    ),
                    segments: const [
                      ButtonSegment(value: LoginMode.passenger, label: Text('Passenger')),
                      ButtonSegment(value: LoginMode.cashier, label: Text('Cashier')),
                    ],
                    selected: {_mode},
                    onSelectionChanged: (s) => _onModeChange(s.first),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    isPassenger
                        ? 'Lambarka → OTP → gal ama diiwaangeli'
                        : 'Cashier login — email & password from admin',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.black54, height: 1.4),
                  ),
                  if (widget.bootMessage != null) ...[
                    const SizedBox(height: 12),
                    Material(
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(8),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Text(
                          widget.bootMessage!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Color(0xFF991B1B), fontSize: 13),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  if (isPassenger) ...[
                    if (!_otpSent) ...[
                      TextField(
                        controller: _phone,
                        keyboardType: TextInputType.number,
                        inputFormatters: PhoneInput.formatters,
                        maxLength: 10,
                        decoration: const InputDecoration(
                          labelText: 'Phone number *',
                          hintText: '0912345678',
                          helperText: '10 digits, starts with 0',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.phone),
                          counterText: '',
                        ),
                      ),
                    ] else ...[
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(_phoneDisplay ?? _phone.text, style: const TextStyle(fontWeight: FontWeight.w600)),
                        subtitle: Text(
                          _phoneExists == true
                              ? 'Account found — enter OTP to sign in'
                              : 'New number — enter OTP, then register your name',
                        ),
                        trailing: TextButton(onPressed: _loading ? null : _resetPhone, child: const Text('Change')),
                      ),
                      const SizedBox(height: 8),
                      _buildOtpInput(),
                    ],
                  ] else if (isCashier) ...[
                    TextField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.email),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _password,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: 'Password',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.lock),
                      ),
                      onSubmitted: (_) => _loading ? null : _cashierLogin(),
                    ),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(_error!, style: const TextStyle(color: Colors.red), textAlign: TextAlign.center),
                  ],
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: FilledButton(
                      onPressed: _loading
                          ? null
                          : (isPassenger
                              ? (_otpSent ? _verifyOtp : _checkPhoneAndSendOtp)
                              : _cashierLogin),
                      child: Text(
                        _loading
                            ? 'Please wait…'
                            : (isPassenger
                                ? (_otpSent ? 'Verify OTP' : 'Continue')
                                : 'Cashier sign in'),
                      ),
                    ),
                  ),
                  if (_loadingServices || _appServices.isNotEmpty) ...[
                    const SizedBox(height: 28),
                    const Divider(),
                    const SizedBox(height: 16),
                    const Text(
                      'Services',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.black54),
                    ),
                    const SizedBox(height: 12),
                    if (_loadingServices)
                      const Center(child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2)))
                    else
                      Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        alignment: WrapAlignment.center,
                        children: _appServices.map((s) {
                          final iconUrl = _serviceIconUrl(s);
                          final name = s['name']?.toString() ?? 'Service';
                          return ServiceHoverTile(
                            name: name,
                            iconUrl: iconUrl,
                            onTap: () => _openServiceLink(s),
                          );
                        }).toList(),
                      ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
