import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../services/api_service.dart';
import '../../models/couple_profile.dart';
import '../../config/app_config.dart';

class ProfileSetupScreen extends StatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  State<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends State<ProfileSetupScreen> {
  int _step = 1;
  bool _loading = false;
  String? _error;

  // Fields
  final _nameCtrl = TextEditingController();
  final _inviteCodeCtrl = TextEditingController();
  String _selectedGender = 'Male';
  int _selectedAge = 25;
  String? _selectedAvatar;
  final List<String> _selectedChips = [];

  final List<String> _presetAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
  ];

  final List<String> _preferenceChips = [
    "Romantic Dates", "Spicy Challenges", "Foreplay", "Roleplay", "Deep Conversations",
    "Massage & Spa", "Adventures", "Kinky", "Gentle Romance", "Weekend Getaways",
    "Pillow Talk", "Surprises"
  ];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _inviteCodeCtrl.dispose();
    super.dispose();
  }

  void _nextStep() {
    setState(() => _error = null);
    if (_step == 1) {
      if (_nameCtrl.text.trim().isEmpty) {
        setState(() => _error = 'Please enter your name');
        return;
      }
      setState(() => _step = 2);
    } else if (_step == 2) {
      setState(() => _step = 3);
    } else if (_step == 3) {
      setState(() => _step = 4);
    } else if (_step == 4) {
      _submit();
    }
  }

  void _prevStep() {
    if (_step > 1) {
      setState(() {
        _error = null;
        _step--;
      });
    }
  }

  Future<void> _submit() async {
    setState(() { _loading = true; _error = null; });
    try {
      final auth = context.read<AuthProvider>();

      // Register user details
      await http.post(
        Uri.parse('$kApiBaseUrl/api/user/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'uid': auth.uid,
          'email': auth.email,
          'name': _nameCtrl.text.trim(),
          'age': _selectedAge,
          'gender': _selectedGender,
          'avatar': _selectedAvatar,
          'whatLikes': _selectedChips.join(', '),
        }),
      );

      // Join code if entered
      if (_inviteCodeCtrl.text.trim().isNotEmpty) {
        final code = _inviteCodeCtrl.text.trim().toUpperCase();
        final joinResult = await ApiService.joinCouple(
          uid: auth.uid!,
          inviteCode: code,
          sessionToken: auth.sessionToken ?? '',
        );
        if (joinResult != null && joinResult['error'] == null) {
          await auth.setCoupleProfile(CoupleProfile.fromJson(joinResult));
          await auth.setIsPartnerA(false);
          setState(() => _step = 5);
        } else {
          setState(() => _error = joinResult?['error'] ?? 'Failed to join couple with that code');
        }
      } else {
        // Create new couple record
        final res = await ApiService.post('/api/couple/create', {
          'uid': auth.uid,
          'name': _nameCtrl.text.trim(),
          'age': _selectedAge,
          'gender': _selectedGender,
          'avatar': _selectedAvatar,
          'whatLikes': _selectedChips.join(', '),
        });

        if (res.statusCode == 200 || res.statusCode == 201) {
          final data = jsonDecode(res.body);
          await auth.setCoupleProfile(CoupleProfile.fromJson(data));
          await auth.setIsPartnerA(true);
          setState(() => _step = 5);
        } else {
          final data = jsonDecode(res.body);
          setState(() => _error = data['error'] ?? 'Profile setup failed');
        }
      }
    } catch (e) {
      setState(() => _error = 'Network error during setup: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _finish() {
    Navigator.of(context).pushReplacementNamed('/home');
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;

    final bgColors = isDark
        ? [const Color(0xFF150025), const Color(0xFF3B0764), const Color(0xFF4C1D95)]
        : [const Color(0xFFFDF2F8), const Color(0xFFFCE7F3), const Color(0xFFF5D0FE)];

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: bgColors, begin: Alignment.topCenter, end: Alignment.bottomCenter),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header with progress indicators
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        if (_step > 1 && _step < 5)
                          IconButton(
                            icon: Icon(Icons.arrow_back, color: isDark ? Colors.white : const Color(0xFF0F172A)),
                            onPressed: _prevStep,
                          )
                        else
                          const SizedBox(width: 48),
                        Text(
                          'Step $_step of 5',
                          style: GoogleFonts.nunito(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: isDark ? Colors.white60 : Colors.black45,
                          ),
                        ),
                        const SizedBox(width: 48),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: List.generate(5, (index) {
                        final isActive = index < _step;
                        return Expanded(
                          child: Container(
                            height: 6,
                            margin: const EdgeInsets.symmetric(horizontal: 3),
                            decoration: BoxDecoration(
                              color: isActive ? const Color(0xFFDB2777) : (isDark ? Colors.white24 : Colors.black12),
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                        );
                      }),
                    ),
                  ],
                ),
              ),

              // Main Stepped Screen Area
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    children: [
                      const SizedBox(height: 12),
                      _buildStepTitle(isDark),
                      const SizedBox(height: 32),
                      if (_error != null) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(color: Colors.red.withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
                          child: Text(_error!, style: GoogleFonts.nunito(color: Colors.red, fontWeight: FontWeight.w700)),
                        ),
                        const SizedBox(height: 20),
                      ],
                      _buildStepContent(isDark),
                    ],
                  ),
                ),
              ),

              // Bottom Button Row
              Padding(
                padding: const EdgeInsets.all(24),
                child: _step < 5
                    ? GestureDetector(
                        onTap: _loading ? null : _nextStep,
                        child: Container(
                          width: double.infinity,
                          height: 56,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(colors: [Color(0xFF9333EA), Color(0xFFDB2777)]),
                            borderRadius: BorderRadius.circular(999),
                            boxShadow: [BoxShadow(color: const Color(0xFFDB2777).withOpacity(0.3), blurRadius: 16, offset: const Offset(0, 6))],
                          ),
                          child: Center(
                            child: _loading
                                ? const CircularProgressIndicator(color: Colors.white)
                                : Text(
                                    _step == 4 ? 'Create My Profile 🎉' : 'Continue',
                                    style: GoogleFonts.nunito(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800),
                                  ),
                          ),
                        ),
                      )
                    : GestureDetector(
                        onTap: _finish,
                        child: Container(
                          width: double.infinity,
                          height: 56,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(colors: [Color(0xFF9333EA), Color(0xFFDB2777)]),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Center(
                            child: Text(
                              'Start Playing ♥',
                              style: GoogleFonts.nunito(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800),
                            ),
                          ),
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStepTitle(bool isDark) {
    String title = '';
    String subtitle = '';
    switch (_step) {
      case 1:
        title = "What's your name?";
        subtitle = "Let's get to know you first.";
        break;
      case 2:
        title = "How old are you?";
        subtitle = "You must be 18 or older to play.";
        break;
      case 3:
        title = "Pick an Avatar";
        subtitle = "Show off your personality.";
        break;
      case 4:
        title = "Your Interests";
        subtitle = "What do you enjoy doing?";
        break;
      case 5:
        title = "Profile Ready! 💕";
        subtitle = "Link up with your partner or share invite code.";
        break;
    }

    return Column(
      children: [
        Text(
          title,
          textAlign: TextAlign.center,
          style: GoogleFonts.nunito(
            fontSize: 28,
            fontWeight: FontWeight.w900,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          subtitle,
          textAlign: TextAlign.center,
          style: GoogleFonts.nunito(
            fontSize: 15,
            color: isDark ? Colors.white60 : Colors.black45,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildStepContent(bool isDark) {
    switch (_step) {
      case 1:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _Label('Your Name', isDark),
            const SizedBox(height: 8),
            _Field(controller: _nameCtrl, hint: 'Enter your name', isDark: isDark),
            const SizedBox(height: 24),
            _Label('Your Gender', isDark),
            const SizedBox(height: 8),
            Row(
              children: ['Male', 'Female', 'Other'].map((g) {
                final isSelected = _selectedGender == g;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedGender = g),
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        gradient: isSelected ? const LinearGradient(colors: [Color(0xFF9333EA), Color(0xFFDB2777)]) : null,
                        color: isSelected ? null : (isDark ? Colors.white.withOpacity(0.08) : Colors.white),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: isSelected ? Colors.transparent : (isDark ? Colors.white12 : Colors.black12)),
                      ),
                      child: Center(
                        child: Text(
                          g,
                          style: GoogleFonts.nunito(color: isSelected ? Colors.white : (isDark ? Colors.white70 : Colors.black54), fontWeight: FontWeight.w800),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 24),
            _Label('Partner\'s Invite Code (Optional)', isDark),
            const SizedBox(height: 8),
            _Field(controller: _inviteCodeCtrl, hint: 'e.g. A1B2C3', isDark: isDark, textCapitalization: TextCapitalization.characters),
          ],
        );
      case 2:
        return Column(
          children: [
            // Scrollable list of ages
            Container(
              height: 200,
              decoration: BoxDecoration(
                color: isDark ? Colors.white.withOpacity(0.05) : Colors.white.withOpacity(0.8),
                borderRadius: BorderRadius.circular(24),
              ),
              child: ListWheelScrollView.useDelegate(
                itemExtent: 50,
                physics: const FixedExtentScrollPhysics(),
                onSelectedItemChanged: (index) {
                  setState(() => _selectedAge = index + 18);
                },
                childDelegate: ListWheelChildBuilderDelegate(
                  childCount: 83, // 18 to 100
                  builder: (context, index) {
                    final ageVal = index + 18;
                    final isSelected = ageVal == _selectedAge;
                    return Center(
                      child: Text(
                        '$ageVal',
                        style: GoogleFonts.nunito(
                          fontSize: isSelected ? 28 : 20,
                          fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                          color: isSelected ? const Color(0xFFDB2777) : (isDark ? Colors.white70 : Colors.black54),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          ],
        );
      case 3:
        return Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: _presetAvatars.map((url) {
                final isSelected = _selectedAvatar == url;
                return GestureDetector(
                  onTap: () => setState(() => _selectedAvatar = url),
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 8),
                    width: 70, height: 70,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: isSelected ? const Color(0xFFDB2777) : Colors.transparent, width: 3),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Image.network(url, fit: BoxFit.cover),
                  ),
                );
              }).toList(),
            ),
          ],
        );
      case 4:
        return Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _preferenceChips.map((chip) {
            final isSelected = _selectedChips.contains(chip);
            return GestureDetector(
              onTap: () {
                setState(() {
                  if (isSelected) {
                    _selectedChips.remove(chip);
                  } else {
                    _selectedChips.add(chip);
                  }
                });
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFFDB2777) : (isDark ? Colors.white.withOpacity(0.08) : Colors.white),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: isSelected ? Colors.transparent : (isDark ? Colors.white12 : Colors.black12)),
                ),
                child: Text(
                  chip,
                  style: GoogleFonts.nunito(
                    color: isSelected ? Colors.white : (isDark ? Colors.white70 : Colors.black54),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            );
          }).toList(),
        );
      case 5:
        final auth = context.read<AuthProvider>();
        final cp = auth.coupleProfile;
        final inviteCode = cp?.inviteCode ?? 'A1B2C3';
        final isLinked = cp?.isLinked == true;

        return Column(
          children: [
            const Text('🎉', style: TextStyle(fontSize: 54)),
            const SizedBox(height: 16),
            if (isLinked) ...[
              Text(
                'Successfully Linked! 💕',
                style: GoogleFonts.nunito(fontSize: 20, fontWeight: FontWeight.w800, color: isDark ? Colors.white : const Color(0xFF0F172A)),
              ),
              const SizedBox(height: 8),
              Text(
                "You are connected with your partner. Let's start the game!",
                textAlign: TextAlign.center,
                style: GoogleFonts.nunito(color: isDark ? Colors.white60 : Colors.black45),
              ),
            ] else ...[
              Text(
                'Share Your Invite Code',
                style: GoogleFonts.nunito(fontSize: 18, fontWeight: FontWeight.w800, color: isDark ? Colors.white : const Color(0xFF0F172A)),
              ),
              const SizedBox(height: 16),
              GestureDetector(
                onTap: () {
                  Clipboard.setData(ClipboardData(text: inviteCode));
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Invite code copied!')));
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white.withOpacity(0.08) : Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: const Color(0xFFDB2777)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(inviteCode, style: GoogleFonts.nunito(color: const Color(0xFFDB2777), fontSize: 32, fontWeight: FontWeight.w900, letterSpacing: 4)),
                      const SizedBox(width: 12),
                      const Icon(Icons.copy, color: Color(0xFFDB2777)),
                    ],
                  ),
                ),
              ),
            ],
          ],
        );
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _Label(String text, bool isDark) => Text(text, style: GoogleFonts.nunito(fontWeight: FontWeight.w700, color: isDark ? Colors.white70 : Colors.black54, fontSize: 14));

  Widget _Field({required TextEditingController controller, required String hint, required bool isDark, TextCapitalization textCapitalization = TextCapitalization.none}) => Container(
    decoration: BoxDecoration(
      color: isDark ? Colors.white.withOpacity(0.08) : Colors.white,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: isDark ? Colors.white12 : Colors.black12),
    ),
    child: TextField(
      controller: controller,
      textCapitalization: textCapitalization,
      style: GoogleFonts.nunito(color: isDark ? Colors.white : const Color(0xFF0F172A)),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: GoogleFonts.nunito(color: isDark ? Colors.white30 : Colors.black26),
        border: InputBorder.none,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    ),
  );
}
