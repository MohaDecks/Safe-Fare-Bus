import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../utils/phone_input.dart';

enum LoginMode { passenger, cashier, corporate }

class LoginScreen extends StatefulWidget {
  final ApiService api;
  final void Function(AppUser user, {required bool needsRegistration}) onVerified;
  final void Function(AppUser user) onCashierVerified;
  final void Function(AppUser user) onCorporateVerified;
  final String? bootMessage;

  const LoginScreen({
    super.key,
    required this.api,
    required this.onVerified,
    required this.onCashierVerified,
    required this.onCorporateVerified,
    this.bootMessage,
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
  String? _debugOtp;
  String? _phoneDisplay;

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
      _debugOtp = null;
    });
    try {
      final check = await widget.api.checkPassengerPhone(phone);
      _phoneExists = check['exists'] as bool? ?? false;
      _phoneDisplay = check['phone_display'] as String?;
      final res = await widget.api.sendPassengerOtp(phone);
      setState(() {
        _otpSent = true;
        _debugOtp = res['otp_debug'] as String?;
        _phoneExists = res['exists'] as bool? ?? _phoneExists;
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
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

  Future<void> _corporateLogin() async {
    final email = _email.text.trim();
    final pass = _password.text;
    if (email.isEmpty || pass.isEmpty) {
      setState(() => _error = 'Email and password required');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final res = await widget.api.corporateLogin(email, pass);
      await widget.api.setToken(res['access_token'] as String);
      widget.onCorporateVerified(AppUser.fromJson(res['user'] as Map<String, dynamic>));
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
      _debugOtp = null;
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
    final isCorporate = _mode == LoginMode.corporate;
    final isStaffLogin = _mode == LoginMode.cashier || isCorporate;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: const Color(0xFF7C3AED),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.directions_bus, color: Colors.white, size: 30),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'SafeFare',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Color(0xFF5B21B6)),
                  ),
                  const SizedBox(height: 16),
                  SegmentedButton<LoginMode>(
                    segments: const [
                      ButtonSegment(value: LoginMode.passenger, label: Text('Passenger')),
                      ButtonSegment(value: LoginMode.cashier, label: Text('Cashier')),
                      ButtonSegment(value: LoginMode.corporate, label: Text('Corporate')),
                    ],
                    selected: {_mode},
                    onSelectionChanged: (s) => _onModeChange(s.first),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    isPassenger
                        ? 'Lambarka → OTP → gal ama diiwaangeli'
                        : isCorporate
                            ? 'Login from admin — email & password only'
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
                              : 'New number — enter OTP, then register name & email',
                        ),
                        trailing: TextButton(onPressed: _loading ? null : _resetPhone, child: const Text('Change')),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _otp,
                        keyboardType: TextInputType.number,
                        maxLength: 6,
                        decoration: const InputDecoration(
                          labelText: 'OTP code',
                          border: OutlineInputBorder(),
                          counterText: '',
                        ),
                        onSubmitted: (_) => _loading ? null : _verifyOtp(),
                      ),
                      if (_debugOtp != null) ...[
                        const SizedBox(height: 8),
                        Material(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(8),
                          child: Padding(
                            padding: const EdgeInsets.all(10),
                            child: Text(
                              'Test OTP: $_debugOtp',
                              style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF92400E)),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ] else if (isStaffLogin) ...[
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
                      onSubmitted: (_) => _loading ? null : (isCorporate ? _corporateLogin() : _cashierLogin()),
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
                              : (isCorporate ? _corporateLogin : _cashierLogin)),
                      child: Text(
                        _loading
                            ? 'Please wait…'
                            : (isPassenger
                                ? (_otpSent ? 'Verify OTP' : 'Continue')
                                : (isCorporate ? 'Corporate sign in' : 'Cashier sign in')),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
