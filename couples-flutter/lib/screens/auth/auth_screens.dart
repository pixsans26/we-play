import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../services/api_service.dart';
import '../../models/couple_profile.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../config/app_config.dart';

// ─── LOGIN SCREEN ───────────────────────────────────────────────────────────

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with TickerProviderStateMixin {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _loading = false;
  bool _showPassword = false;
  String? _error;
  late AnimationController _floatController;

  @override
  void initState() {
    super.initState();
    _floatController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _floatController.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (_emailCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Please enter your email address.');
      return;
    }
    if (_passCtrl.text.isEmpty) {
      setState(() => _error = 'Please enter your password.');
      return;
    }

    setState(() { _loading = true; _error = null; });
    try {
      final res = await http.post(
        Uri.parse('$kApiBaseUrl/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': _emailCtrl.text.trim(), 'password': _passCtrl.text}),
      );
      if (!mounted) return;
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final auth = context.read<AuthProvider>();
        await auth.setUser(
          uid: data['uid'] ?? data['user']?['uid'] ?? '',
          email: _emailCtrl.text.trim(),
          displayName: data['displayName'] ?? data['user']?['displayName'],
          sessionToken: data['token'] ?? data['sessionToken'],
        );
        ApiService.setToken(auth.sessionToken);
        
        // Fetch couple profile
        final cp = await ApiService.fetchCoupleProfile(auth.uid!);
        if (cp != null && mounted) {
          await auth.setCoupleProfile(CoupleProfile.fromJson(cp));
          final isA = cp['partnerAUid'] == auth.uid;
          await auth.setIsPartnerA(isA);
        }
        if (mounted) Navigator.of(context).pushReplacementNamed('/home');
      } else {
        final data = jsonDecode(res.body);
        setState(() => _error = data['error'] ?? 'Login failed');
      }
    } catch (e) {
      setState(() => _error = 'Network error. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _googleSignIn() {
    // Show mock login flow for Google sign-in
    setState(() => _loading = true);
    Future.delayed(const Duration(milliseconds: 1200), () async {
      if (!mounted) return;
      final auth = context.read<AuthProvider>();
      await auth.setUser(
        uid: 'google_local_user',
        email: 'google.user@example.com',
        displayName: 'Google User',
        sessionToken: 'mock_google_session_token',
      );
      ApiService.setToken('mock_google_session_token');
      setState(() => _loading = false);
      Navigator.of(context).pushReplacementNamed('/profile-setup');
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;
    final bgColors = isDark
        ? [const Color(0xFF150025), const Color(0xFF1A0038), const Color(0xFF0D001A)]
        : [const Color(0xFFFCE4F3), const Color(0xFFEDE0FF), const Color(0xFFDDD6FE)];

    final cardBg = isDark ? Colors.white.withOpacity(0.08) : Colors.white.withOpacity(0.75);

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: bgColors, begin: Alignment.topLeft, end: Alignment.bottomRight),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo Container
                  AnimatedBuilder(
                    animation: _floatController,
                    builder: (_, __) => Transform.translate(
                      offset: Offset(0, -8 * _floatController.value),
                      child: Column(
                        children: [
                          Container(
                            width: 120, height: 120,
                            decoration: BoxDecoration(
                              color: Colors.transparent,
                              borderRadius: BorderRadius.circular(24),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFFDB2777).withOpacity(0.35),
                                  blurRadius: 20,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: Image.asset(
                              'assets/images/adaptive-icon.png',
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                color: const Color(0xFFDB2777),
                                child: const Icon(Icons.favorite, color: Colors.white, size: 50),
                              ),
                            ),
                          ),
                          const SizedBox(height: 18),
                          Text(
                            'Welcome Back',
                            style: GoogleFonts.dynaPuff(
                              fontSize: 32,
                              fontWeight: FontWeight.w900,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Your love story continues ✨',
                            style: GoogleFonts.nunito(
                              fontSize: 15,
                              color: isDark ? Colors.white60 : Colors.black54,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 36),

                  // Glassmorphic Card Form
                  ClipRRect(
                    borderRadius: BorderRadius.circular(32),
                    child: BackdropFilter(
                      filter: ui.ImageFilter.blur(sigmaX: 15, sigmaY: 15),
                      child: Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: cardBg,
                          borderRadius: BorderRadius.circular(32),
                          border: Border.all(
                            color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.05),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (_error != null) ...[
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.red.withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: Colors.red.withOpacity(0.25)),
                                ),
                                child: Text(
                                  _error!,
                                  style: GoogleFonts.nunito(color: isDark ? const Color(0xFFFCA5A5) : Colors.red, fontSize: 13, fontWeight: FontWeight.w700),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                              const SizedBox(height: 16),
                            ],

                            // Email Address Field
                            _Label('EMAIL', isDark),
                            const SizedBox(height: 8),
                            _InputField(
                              controller: _emailCtrl,
                              hint: 'your@email.com',
                              icon: Icons.mail_outline_rounded,
                              isDark: isDark,
                              keyboardType: TextInputType.emailAddress,
                            ),
                            const SizedBox(height: 16),

                            // Password Field
                            _Label('PASSWORD', isDark),
                            const SizedBox(height: 8),
                            _InputField(
                              controller: _passCtrl,
                              hint: 'Enter your password',
                              icon: Icons.lock_open_rounded,
                              isDark: isDark,
                              obscureText: !_showPassword,
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                  color: isDark ? Colors.white38 : Colors.black38,
                                  size: 20,
                                ),
                                onPressed: () => setState(() => _showPassword = !_showPassword),
                              ),
                            ),
                            const SizedBox(height: 28),

                            // Submit Button
                            _GradientButton(
                              label: 'Log In',
                              isLoading: _loading,
                              onTap: _loading ? null : _login,
                            ),
                            const SizedBox(height: 16),

                            // Google Button
                            GestureDetector(
                              onTap: _loading ? null : _googleSignIn,
                              child: Container(
                                width: double.infinity,
                                height: 52,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(999),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.06),
                                      blurRadius: 10,
                                      offset: const Offset(0, 4),
                                    )
                                  ],
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                                                        const Icon(Icons.g_mobiledata_rounded, size: 36, color: Colors.black87),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Continue with Google',
                                      style: GoogleFonts.nunito(
                                        color: Colors.black87,
                                        fontSize: 16,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Route to signup
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        "Don't have an account? ",
                        style: GoogleFonts.nunito(
                          color: isDark ? Colors.white60 : Colors.black54,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      GestureDetector(
                        onTap: () => Navigator.of(context).pushNamed('/signup'),
                        child: Text(
                          'Sign Up',
                          style: GoogleFonts.dynaPuff(
                            color: const Color(0xFFF953C6),
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _Label(String label, bool isDark) => Text(
        label,
        style: GoogleFonts.nunito(
          color: isDark ? Colors.white60 : Colors.black54,
          fontSize: 12,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.5,
        ),
      );
}

// ─── SIGNUP SCREEN ──────────────────────────────────────────────────────────

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _confirmPassCtrl = TextEditingController();
  bool _loading = false;
  bool _showPassword = false;
  String? _nameError;
  String? _emailError;
  String? _passError;
  String? _confirmPassError;
  String? _generalError;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _confirmPassCtrl.dispose();
    super.dispose();
  }

  bool _validate() {
    setState(() {
      _nameError = null;
      _emailError = null;
      _passError = null;
      _confirmPassError = null;
      _generalError = null;
    });

    bool isValid = true;
    if (_nameCtrl.text.trim().isEmpty) {
      _nameError = 'Name is required';
      isValid = false;
    }
    final emailRegex = RegExp(r"^[a-zA-Z0-9.a-zA-Z0-9.!#$%&'*+-/=?^_`{|}~]+@[a-zA-Z0-9]+\.[a-zA-Z]+");
    if (_emailCtrl.text.trim().isEmpty) {
      _emailError = 'Email is required';
      isValid = false;
    } else if (!emailRegex.hasMatch(_emailCtrl.text.trim())) {
      _emailError = 'Enter a valid email address';
      isValid = false;
    }
    if (_passCtrl.text.isEmpty) {
      _passError = 'Password is required';
      isValid = false;
    } else if (_passCtrl.text.length < 8) {
      _passError = 'Password must be at least 8 characters';
      isValid = false;
    }
    if (_confirmPassCtrl.text.isEmpty) {
      _confirmPassError = 'Please confirm your password';
      isValid = false;
    } else if (_passCtrl.text != _confirmPassCtrl.text) {
      _confirmPassError = 'Passwords do not match';
      isValid = false;
    }
    return isValid;
  }

  Future<void> _signup() async {
    if (!_validate()) return;
    setState(() { _loading = true; _generalError = null; });
    try {
      final res = await http.post(
        Uri.parse('$kApiBaseUrl/api/auth/signup'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': _emailCtrl.text.trim(),
          'password': _passCtrl.text,
        }),
      );
      if (!mounted) return;
      if (res.statusCode == 200 || res.statusCode == 201) {
        final data = jsonDecode(res.body);
        final auth = context.read<AuthProvider>();
        await auth.setUser(
          uid: data['uid'] ?? data['user']?['uid'] ?? '',
          email: _emailCtrl.text.trim(),
          sessionToken: data['token'] ?? data['sessionToken'],
        );
        ApiService.setToken(auth.sessionToken);

        // Pre-save basic registration metadata to server appUsers registry
        await http.post(
          Uri.parse('$kApiBaseUrl/api/user/register'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'uid': auth.uid,
            'email': auth.email,
            'name': _nameCtrl.text.trim(),
          }),
        );

        if (mounted) {
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (context) => AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              title: Text('Account Created!', style: GoogleFonts.dynaPuff(fontWeight: FontWeight.w900)),
              content: Text('Your account was created successfully. Let\'s configure your profile details!', style: GoogleFonts.nunito()),
              actions: [
                TextButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                    Navigator.of(context).pushReplacementNamed('/profile-setup');
                  },
                  child: Text('OK', style: GoogleFonts.nunito(fontWeight: FontWeight.bold, color: const Color(0xFFDB2777))),
                )
              ],
            ),
          );
        }
      } else {
        final data = jsonDecode(res.body);
        setState(() => _generalError = data['error'] ?? 'Signup failed');
      }
    } catch (e) {
      setState(() => _generalError = 'Network error. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;
    final bgColors = isDark
        ? [const Color(0xFF150025), const Color(0xFF1A0038), const Color(0xFF0D001A)]
        : [const Color(0xFFFCE4F3), const Color(0xFFEDE0FF), const Color(0xFFDDD6FE)];

    final cardBg = isDark ? Colors.white.withOpacity(0.08) : Colors.white.withOpacity(0.75);

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: bgColors, begin: Alignment.topLeft, end: Alignment.bottomRight),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Header
                  Column(
                    children: [
                      Container(
                        width: 100, height: 100,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFDB2777).withOpacity(0.2),
                              blurRadius: 16,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Image.asset(
                          'assets/images/adaptive-icon.png',
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: const Color(0xFFDB2777),
                            child: const Icon(Icons.favorite, color: Colors.white, size: 40),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Create Account',
                        style: GoogleFonts.dynaPuff(
                          fontSize: 30,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                        ),
                      ),
                      Text(
                        'Start your journey together ❤️',
                        style: GoogleFonts.nunito(
                          fontSize: 14,
                          color: isDark ? Colors.white60 : Colors.black54,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),

                  // Glassmorphic Card
                  ClipRRect(
                    borderRadius: BorderRadius.circular(32),
                    child: BackdropFilter(
                      filter: ui.ImageFilter.blur(sigmaX: 15, sigmaY: 15),
                      child: Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: cardBg,
                          borderRadius: BorderRadius.circular(32),
                          border: Border.all(
                            color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.05),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (_generalError != null) ...[
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.red.withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: Colors.red.withOpacity(0.25)),
                                ),
                                child: Text(
                                  _generalError!,
                                  style: GoogleFonts.nunito(color: isDark ? const Color(0xFFFCA5A5) : Colors.red, fontSize: 13, fontWeight: FontWeight.w700),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                              const SizedBox(height: 16),
                            ],

                            // Name
                            _Label('NAME', isDark),
                            const SizedBox(height: 6),
                            _InputField(
                              controller: _nameCtrl,
                              hint: 'Your name',
                              icon: Icons.person_outline_rounded,
                              isDark: isDark,
                              errorText: _nameError,
                            ),
                            const SizedBox(height: 14),

                            // Email
                            _Label('EMAIL', isDark),
                            const SizedBox(height: 6),
                            _InputField(
                              controller: _emailCtrl,
                              hint: 'your@email.com',
                              icon: Icons.mail_outline_rounded,
                              isDark: isDark,
                              keyboardType: TextInputType.emailAddress,
                              errorText: _emailError,
                            ),
                            const SizedBox(height: 14),

                            // Password
                            _Label('PASSWORD', isDark),
                            const SizedBox(height: 6),
                            _InputField(
                              controller: _passCtrl,
                              hint: 'Min. 8 characters',
                              icon: Icons.lock_open_rounded,
                              isDark: isDark,
                              obscureText: !_showPassword,
                              errorText: _passError,
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                  color: isDark ? Colors.white38 : Colors.black38,
                                  size: 18,
                                ),
                                onPressed: () => setState(() => _showPassword = !_showPassword),
                              ),
                            ),
                            const SizedBox(height: 14),

                            // Confirm Password
                            _Label('CONFIRM PASSWORD', isDark),
                            const SizedBox(height: 6),
                            _InputField(
                              controller: _confirmPassCtrl,
                              hint: 'Re-enter password',
                              icon: Icons.security_rounded,
                              isDark: isDark,
                              obscureText: true,
                              errorText: _confirmPassError,
                            ),
                            const SizedBox(height: 24),

                            // Create Button
                            _GradientButton(
                              label: 'Create Account',
                              isLoading: _loading,
                              onTap: _loading ? null : _signup,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Route back to login
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        "Already have an account? ",
                        style: GoogleFonts.nunito(
                          color: isDark ? Colors.white60 : Colors.black54,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      GestureDetector(
                        onTap: () => Navigator.of(context).pop(),
                        child: Text(
                          'Log In',
                          style: GoogleFonts.dynaPuff(
                            color: const Color(0xFFF953C6),
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _Label(String label, bool isDark) => Text(
        label,
        style: GoogleFonts.nunito(
          color: isDark ? Colors.white60 : Colors.black54,
          fontSize: 12,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.5,
        ),
      );
}

// ─── Shared Input & Button Widgets ──────────────────────────────────────────

class _InputField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final IconData icon;
  final bool isDark;
  final bool obscureText;
  final TextInputType? keyboardType;
  final Widget? suffixIcon;
  final String? errorText;

  const _InputField({
    required this.controller,
    required this.hint,
    required this.icon,
    required this.isDark,
    this.obscureText = false,
    this.keyboardType,
    this.suffixIcon,
    this.errorText,
  });

  @override
  Widget build(BuildContext context) {
    final hasError = errorText != null;
    final inputBg = isDark ? Colors.white.withOpacity(0.08) : const Color(0x0F9333EA);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          decoration: BoxDecoration(
            color: inputBg,
            borderRadius: BorderRadius.circular(32),
            border: Border.all(
              color: hasError ? Colors.red : Colors.transparent,
              width: 1.5,
            ),
          ),
          child: TextField(
            controller: controller,
            obscureText: obscureText,
            keyboardType: keyboardType,
            style: GoogleFonts.nunito(
              color: isDark ? Colors.white : const Color(0xFF0F172A),
              fontWeight: FontWeight.w700,
            ),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: GoogleFonts.nunito(
                color: isDark ? Colors.white30 : Colors.black26,
                fontWeight: FontWeight.w700,
              ),
              prefixIcon: Icon(icon, color: isDark ? Colors.white38 : Colors.black26, size: 20),
              suffixIcon: suffixIcon,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
            ),
          ),
        ),
        if (hasError)
          Padding(
            padding: const EdgeInsets.only(top: 4, left: 16),
            child: Text(
              errorText!,
              style: GoogleFonts.nunito(color: const Color(0xFFFCA5A5), fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ),
      ],
    );
  }
}

class _GradientButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;
  final bool isLoading;

  const _GradientButton({required this.label, this.onTap, this.isLoading = false});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        height: 56,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: onTap != null
                ? [const Color(0xFFF953C6), const Color(0xFF7C3AED)]
                : [Colors.grey.shade400, Colors.grey.shade500],
          ),
          borderRadius: BorderRadius.circular(999),
          boxShadow: onTap != null
              ? [BoxShadow(color: const Color(0xFF7C3AED).withOpacity(0.35), blurRadius: 16, offset: const Offset(0, 6))]
              : [],
        ),
        child: Center(
          child: isLoading
              ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
              : Text(
                  label,
                  style: GoogleFonts.dynaPuff(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800),
                ),
        ),
      ),
    );
  }
}
