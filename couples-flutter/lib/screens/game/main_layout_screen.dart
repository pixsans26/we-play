import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import 'home_screen.dart';
import 'partner_screen.dart';
import 'other_screens.dart';

class MainLayoutScreen extends StatefulWidget {
  const MainLayoutScreen({super.key});

  @override
  State<MainLayoutScreen> createState() => _MainLayoutScreenState();
}

class _MainLayoutScreenState extends State<MainLayoutScreen> {
  int _currentIndex = 2; // Default to HomeScreen (Home tab)

  void _setIndex(int index) {
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isDark = context.watch<ThemeProvider>().isDark;
    final cp = auth.coupleProfile;

    // Determine partner label and icon based on user's gender
    final isFemale = (auth.isPartnerA
                ? cp?.partnerAGender
                : cp?.partnerBGender)
            ?.toLowerCase() ==
        'female';
    final isLinked = cp?.isLinked == true;
    final partnerLabel = isLinked ? (isFemale ? 'Periods' : 'Partner') : 'Link Partner';
    final partnerIcon = isFemale ? Icons.spa_rounded : Icons.favorite_rounded;

    // Get my first name for the profile tab
    final myName = auth.isPartnerA ? cp?.partnerAName : cp?.partnerBName;
    final myFirstName = (myName ?? 'Profile').split(' ')[0];
    final myAvatarUrl = auth.isPartnerA ? cp?.partnerAAvatar : cp?.partnerBAvatar;
    final myGender = auth.isPartnerA ? cp?.partnerAGender : cp?.partnerBGender;

    final tabs = [
      {'index': 0, 'label': 'History', 'icon': Icons.history_rounded},
      {'index': 1, 'label': partnerLabel, 'icon': partnerIcon},
      {'index': 2, 'label': 'Home', 'icon': Icons.home_rounded},
      {'index': 3, 'label': 'Settings', 'icon': Icons.settings_rounded},
      {'index': 4, 'label': myFirstName, 'icon': Icons.person_rounded},
    ];

    // Selected colors matching React Native theme
    final activeColor = const Color(0xFFD946EF);
    final inactiveColor = isDark ? const Color(0x66DCB4FF) : const Color(0xFF9CA3AF);
    final navBgColor = isDark ? const Color(0xD90F172A) : const Color(0xD9FFFFFF);

    return Scaffold(
      body: Stack(
        children: [
          // ── Switch Screens ──
          IndexedStack(
            index: _currentIndex,
            children: [
              HistoryScreen(isTab: true),
              PartnerScreen(isTab: true),
              HomeScreen(onNavigateTab: _setIndex),
              SettingsScreen(isTab: true),
              ProfileScreen(isTab: true),
            ],
          ),

          // ── Custom Floating Glassmorphic Navigation Bar ──
          Positioned(
            bottom: 30,
            left: 24,
            right: 24,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(30),
              child: BackdropFilter(
                filter: ui.ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                child: Container(
                  height: 72,
                  decoration: BoxDecoration(
                    color: navBgColor,
                    borderRadius: BorderRadius.circular(30),
                    border: Border.all(
                      color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.05),
                    ),
                  ),
                  child: Row(
                    children: tabs.map((tab) {
                      final idx = tab['index'] as int;
                      final isActive = _currentIndex == idx;
                      final tabColor = isActive ? activeColor : inactiveColor;

                      Widget iconWidget;
                      if (idx == 4) {
                        // Render Profile Avatar
                        iconWidget = Container(
                          width: 30, height: 30,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: tabColor,
                              width: 2,
                            ),
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: myAvatarUrl != null && myAvatarUrl.isNotEmpty
                              ? Image.network(myAvatarUrl, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _avatarGenderIcon(myGender, tabColor))
                              : _avatarGenderIcon(myGender, tabColor),
                        );
                      } else {
                        iconWidget = Icon(
                          tab['icon'] as IconData,
                          color: tabColor,
                          size: 24,
                        );
                      }

                      return Expanded(
                        child: GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () => _setIndex(idx),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              iconWidget,
                              const SizedBox(height: 4),
                              Text(
                                tab['label'] as String,
                                style: GoogleFonts.nunito(
                                  color: tabColor,
                                  fontSize: 10,
                                  fontWeight: isActive ? FontWeight.w800 : FontWeight.w600,
                                ),
                              ),
                              if (isActive)
                                Container(
                                  margin: const EdgeInsets.only(top: 2),
                                  width: 4, height: 4,
                                  decoration: BoxDecoration(
                                    color: activeColor,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _avatarGenderIcon(String? gender, Color color) {
    final icon = gender?.toLowerCase() == 'female' ? Icons.face_3_rounded : Icons.face_rounded;
    return Icon(icon, color: color, size: 20);
  }
}
