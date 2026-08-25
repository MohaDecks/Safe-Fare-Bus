import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../utils/phone_input.dart';
import '../widgets/brand_logo.dart';

enum LoginMode { passenger, cashier }

class LoginScreen extends StatefulWidget {
  final ApiService api;
  final void Function(AppUser user, {required bool needsRegistration}) onVerified;
  final void Function(AppUser user) onCashierVerified;
  final String? bootMessage;
  final VoidCallback? onBack;

  const LoginScreen({
    super.key,
    required this.api,
    required this.onVerified,
    required this.onCashierVerified,
    this.bootMessage,
    this.onBack,
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
  final _otpFocus = FocusNode();

  @override
  void initState() {
    super.initState();
    _otp.addListener(_onOtpChanged);
    _otpFocus.addListener(_onOtpChanged);
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
    });
    try {
      final check = await widget.api.checkPassengerPhone(phone);
      _phoneExists = check['exists'] as bool? ?? false;
      _phoneDisplay = check['phone_display'] as String?;
      final res = await widget.api.sendPassengerOtp(phone);
      setState(() {
        _otpSent = true;
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
    final theme = Theme.of(context);
    const digitStyle = TextStyle(
      fontSize: 24,
      fontWeight: FontWeight.w700,
      color: AppColors.text,
      fontFeatures: [FontFeature.tabularFigures()],
    );
    final code = _otp.text;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Enter verification code',
          style: theme.textTheme.labelLarge?.copyWith(
            color: AppColors.textMuted,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: () => _otpFocus.requestFocus(),
          child: SizedBox(
            width: double.infinity,
            height: 56,
            child: Stack(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(6, (i) {
                    final hasDigit = i < code.length;
                    final isActive = _otpFocus.hasFocus && i == code.length;
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      width: 46,
                      height: 56,
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(AppRadii.sm),
                        border: Border.all(
                          color: isActive ? AppColors.primary : AppColors.border,
                          width: isActive ? 2 : 1,
                        ),
                        boxShadow: isActive ? AppShadows.card : null,
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
        const SizedBox(height: 8),
        Text(
          'We sent a 6-digit code to your phone',
          style: theme.textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
        ),
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
    });
  }

  void _onModeChange(LoginMode m) {
    setState(() {
      _mode = m;
      _error = null;
      _otpSent = false;
    });
  }

  Widget _errorBanner(String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppRadii.sm),
        border: Border.all(color: AppColors.error.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppColors.error, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(color: AppColors.error, fontSize: 13, height: 1.35),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isPassenger = _mode == LoginMode.passenger;
    final isCashier = _mode == LoginMode.cashier;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: widget.onBack == null
          ? null
          : AppBar(
              leading: IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: widget.onBack,
              ),
              title: const Text('Bus Booking'),
            ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 48),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(child: LocalBrandLogo(size: 80)),
                          const SizedBox(height: 12),
                          Text(
                            'Welcome to Dirsha',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: AppColors.text,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            isPassenger ? 'Sign in with your phone number' : 'Staff cashier sign in',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.textMuted),
                          ),
                          const SizedBox(height: 16),
                          SegmentedButton<LoginMode>(
                            showSelectedIcon: false,
                            segments: const [
                              ButtonSegment(
                                value: LoginMode.passenger,
                                label: Text('Passenger'),
                                icon: Icon(Icons.person_outline, size: 18),
                              ),
                              ButtonSegment(
                                value: LoginMode.cashier,
                                label: Text('Cashier'),
                                icon: Icon(Icons.badge_outlined, size: 18),
                              ),
                            ],
                            selected: {_mode},
                            onSelectionChanged: (s) => _onModeChange(s.first),
                          ),
                          if (widget.bootMessage != null) ...[
                            const SizedBox(height: 16),
                            _errorBanner(widget.bootMessage!),
                          ],
                          const SizedBox(height: 16),
                          if (isPassenger) ...[
                            if (!_otpSent) ...[
                              TextField(
                                controller: _phone,
                                keyboardType: TextInputType.number,
                                inputFormatters: PhoneInput.formatters,
                                maxLength: 10,
                                decoration: const InputDecoration(
                                  labelText: 'Phone number',
                                  hintText: '0912345678',
                                  helperText: '10 digits, starts with 0',
                                  prefixIcon: Icon(Icons.phone_outlined),
                                  counterText: '',
                                ),
                              ),
                            ] else ...[
                              Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(AppRadii.md),
                                  border: Border.all(color: AppColors.border),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 44,
                                      height: 44,
                                      decoration: BoxDecoration(
                                        color: AppColors.primary.withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(AppRadii.sm),
                                      ),
                                      child: const Icon(Icons.phone_android, color: AppColors.primary),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            _phoneDisplay ?? _phone.text,
                                            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                                          ),
                                          Text(
                                            _phoneExists == true
                                                ? 'Account found — enter OTP'
                                                : 'New number — verify then register',
                                            style: theme.textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
                                          ),
                                        ],
                                      ),
                                    ),
                                    TextButton(onPressed: _loading ? null : _resetPhone, child: const Text('Change')),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 20),
                              _buildOtpInput(),
                            ],
                          ] else if (isCashier) ...[
                            TextField(
                              controller: _email,
                              keyboardType: TextInputType.emailAddress,
                              decoration: const InputDecoration(
                                labelText: 'Email',
                                prefixIcon: Icon(Icons.email_outlined),
                              ),
                            ),
                            const SizedBox(height: 16),
                            TextField(
                              controller: _password,
                              obscureText: true,
                              decoration: const InputDecoration(
                                labelText: 'Password',
                                prefixIcon: Icon(Icons.lock_outline),
                              ),
                              onSubmitted: (_) => _loading ? null : _cashierLogin(),
                            ),
                          ],
                          if (_error != null) ...[
                            const SizedBox(height: 16),
                            _errorBanner(_error!),
                          ],
                          const SizedBox(height: 20),
                          FilledButton(
                            onPressed: _loading
                                ? null
                                : (isPassenger
                                    ? (_otpSent ? _verifyOtp : _checkPhoneAndSendOtp)
                                    : _cashierLogin),
                            child: _loading
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                  )
                                : Text(
                                    isPassenger
                                        ? (_otpSent ? 'Verify & continue' : 'Send OTP')
                                        : 'Sign in',
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
