import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../services/api_service.dart';
import '../../models/couple_profile.dart';
import '../../config/app_config.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _nameACtrl = TextEditingController();
  final _nameBCtrl = TextEditingController();
  final _genderACtrl = TextEditingController();
  final _genderBCtrl = TextEditingController();
  final _likesACtrl = TextEditingController();
  final _likesBCtrl = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthProvider>();
    final cp = auth.coupleProfile;
    if (cp != null) {
      _nameACtrl.text = cp.partnerAName;
      _nameBCtrl.text = cp.partnerBName ?? '';
      _genderACtrl.text = cp.partnerAGender ?? '';
      _genderBCtrl.text = cp.partnerBGender ?? '';
      _likesACtrl.text = cp.whatALikes ?? '';
      _likesBCtrl.text = cp.whatBLikes ?? '';
    }
  }

  @override
  void dispose() {
    _nameACtrl.dispose();
    _nameBCtrl.dispose();
    _genderACtrl.dispose();
    _genderBCtrl.dispose();
    _likesACtrl.dispose();
    _likesBCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_nameACtrl.text.trim().isEmpty) {
      setState(() => _error = 'Partner A Name is required');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final auth = context.read<AuthProvider>();
      final cp = auth.coupleProfile!;
      
      final res = await ApiService.post('/api/couple', {
        'partnerAUid': cp.partnerAUid,
        'partnerBUid': cp.partnerBUid,
        'partnerAName': _nameACtrl.text.trim(),
        'partnerBName': _nameBCtrl.text.trim().isEmpty ? null : _nameBCtrl.text.trim(),
        'partnerAGender': _genderACtrl.text.trim().isEmpty ? null : _genderACtrl.text.trim(),
        'partnerBGender': _genderBCtrl.text.trim().isEmpty ? null : _genderBCtrl.text.trim(),
        'whatALikes': _likesACtrl.text.trim().isEmpty ? null : _likesACtrl.text.trim(),
        'whatBLikes': _likesBCtrl.text.trim().isEmpty ? null : _likesBCtrl.text.trim(),
      });

      if (!mounted) return;
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        await auth.setCoupleProfile(CoupleProfile.fromJson(data));
        Navigator.of(context).pop();
      } else {
        setState(() => _error = 'Failed to save changes');
      }
    } catch (_) {
      setState(() => _error = 'Network error');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;
    final auth = context.watch<AuthProvider>();
    final isPartnerA = auth.isPartnerA;

    final bgColors = isDark
        ? [const Color(0xFF150025), const Color(0xFF3B0764), const Color(0xFF4C1D95)]
        : [const Color(0xFFFDF2F8), const Color(0xFFFCE7F3), const Color(0xFFF5D0FE)];

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(gradient: LinearGradient(colors: bgColors, begin: Alignment.topCenter, end: Alignment.bottomCenter)),
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(22, 16, 22, 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    GestureDetector(
                      onTap: () => Navigator.of(context).pop(),
                      child: Container(
                        width: 44, height: 44,
                        decoration: BoxDecoration(
                          color: isDark ? Colors.white.withOpacity(0.12) : Colors.white,
                          borderRadius: BorderRadius.circular(22),
                          border: Border.all(color: isDark ? Colors.white12 : Colors.black.withOpacity(0.08)),
                        ),
                        child: Icon(Icons.close, color: isDark ? Colors.white : const Color(0xFF0F172A)),
                      ),
                    ),
                    Text(
                      'Edit Profile',
                      style: GoogleFonts.nunito(fontSize: 22, fontWeight: FontWeight.w900, color: isDark ? Colors.white : const Color(0xFF0F172A)),
                    ),
                    const SizedBox(width: 44),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 10),
                  child: Column(
                    children: [
                      // Partner A Block
                      _CardWrapper(
                        isDark: isDark,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isPartnerA ? 'PARTNER A (YOU)' : 'PARTNER A',
                              style: GoogleFonts.nunito(color: isDark ? Colors.white70 : Colors.black87, fontSize: 12, fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 16),
                            _Label('Name', isDark),
                            const SizedBox(height: 8),
                            _Field(controller: _nameACtrl, hint: 'Partner A Name', enabled: isPartnerA, isDark: isDark),
                            const SizedBox(height: 16),
                            _Label('Gender', isDark),
                            const SizedBox(height: 8),
                            _Field(controller: _genderACtrl, hint: 'Male / Female', enabled: isPartnerA, isDark: isDark),
                            const SizedBox(height: 16),
                            _Label('Likes (comma separated)', isDark),
                            const SizedBox(height: 8),
                            _Field(controller: _likesACtrl, hint: 'e.g. Movies, Music', enabled: isPartnerA, isDark: isDark),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Partner B Block
                      _CardWrapper(
                        isDark: isDark,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              !isPartnerA ? 'PARTNER B (YOU)' : 'PARTNER B',
                              style: GoogleFonts.nunito(color: isDark ? Colors.white70 : Colors.black87, fontSize: 12, fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 16),
                            _Label('Name', isDark),
                            const SizedBox(height: 8),
                            _Field(controller: _nameBCtrl, hint: 'Partner B Name', enabled: !isPartnerA, isDark: isDark),
                            const SizedBox(height: 16),
                            _Label('Gender', isDark),
                            const SizedBox(height: 8),
                            _Field(controller: _genderBCtrl, hint: 'Male / Female', enabled: !isPartnerA, isDark: isDark),
                            const SizedBox(height: 16),
                            _Label('Likes (comma separated)', isDark),
                            const SizedBox(height: 8),
                            _Field(controller: _likesBCtrl, hint: 'e.g. Cooking, Hiking', enabled: !isPartnerA, isDark: isDark),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      if (_error != null) ...[
                        Text(_error!, style: GoogleFonts.nunito(color: Colors.red, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 16),
                      ],

                      // Save button
                      GestureDetector(
                        onTap: _saving ? null : _save,
                        child: Container(
                          width: double.infinity,
                          height: 56,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(colors: [Color(0xFF9333EA), Color(0xFFDB2777)]),
                            borderRadius: BorderRadius.circular(999),
                            boxShadow: [BoxShadow(color: const Color(0xFFDB2777).withOpacity(0.4), blurRadius: 16, offset: const Offset(0, 6))],
                          ),
                          child: Center(
                            child: _saving
                                ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : Text('Save Profile', style: GoogleFonts.nunito(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900)),
                          ),
                        ),
                      ),
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _Label(String text, bool isDark) => Text(text, style: GoogleFonts.nunito(fontWeight: FontWeight.w700, color: isDark ? Colors.white60 : Colors.black45, fontSize: 13));

  Widget _Field({required TextEditingController controller, required String hint, required bool enabled, required bool isDark}) => Container(
    decoration: BoxDecoration(
      color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.04),
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: isDark ? Colors.white12 : Colors.black12),
    ),
    child: TextField(
      controller: controller,
      enabled: enabled,
      style: GoogleFonts.nunito(color: enabled ? (isDark ? Colors.white : const Color(0xFF0F172A)) : Colors.grey),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: GoogleFonts.nunito(color: isDark ? Colors.white30 : Colors.black26),
        border: InputBorder.none,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    ),
  );
}

class _CardWrapper extends StatelessWidget {
  final Widget child;
  final bool isDark;

  const _CardWrapper({required this.child, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withOpacity(0.05) : Colors.white.withOpacity(0.6),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.08)),
      ),
      child: child,
    );
  }
}
