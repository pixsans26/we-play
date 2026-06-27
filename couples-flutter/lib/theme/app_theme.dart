import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ─── Brand Colors ───────────────────────────────────────────────────────────
const Color kAccent = Color(0xFFDB2777); // pink-600
const Color kAccentSecondary = Color(0xFF9333EA); // purple-600
const Color kAccentDark = Color(0xFF4C1D95); // purple-900

final _textTheme = TextTheme(
  displayLarge: GoogleFonts.dynaPuff(fontWeight: FontWeight.w700),
  displayMedium: GoogleFonts.dynaPuff(fontWeight: FontWeight.w700),
  displaySmall: GoogleFonts.dynaPuff(fontWeight: FontWeight.w700),
  headlineLarge: GoogleFonts.dynaPuff(fontWeight: FontWeight.w700),
  headlineMedium: GoogleFonts.dynaPuff(fontWeight: FontWeight.w700),
  headlineSmall: GoogleFonts.dynaPuff(fontWeight: FontWeight.w700),
  titleLarge: GoogleFonts.dynaPuff(fontWeight: FontWeight.w700),
  titleMedium: GoogleFonts.dynaPuff(fontWeight: FontWeight.w700),
  titleSmall: GoogleFonts.dynaPuff(fontWeight: FontWeight.w700),
  bodyLarge: GoogleFonts.nunito(fontWeight: FontWeight.w700),
  bodyMedium: GoogleFonts.nunito(fontWeight: FontWeight.w700),
  bodySmall: GoogleFonts.nunito(fontWeight: FontWeight.w700),
  labelLarge: GoogleFonts.nunito(fontWeight: FontWeight.w700),
  labelMedium: GoogleFonts.nunito(fontWeight: FontWeight.w700),
  labelSmall: GoogleFonts.nunito(fontWeight: FontWeight.w700),
);

// ─── Dark Theme ─────────────────────────────────────────────────────────────
final ThemeData darkTheme = ThemeData(
  brightness: Brightness.dark,
  scaffoldBackgroundColor: const Color(0xFF150025),
  primaryColor: kAccent,
  textTheme: _textTheme,
  colorScheme: const ColorScheme.dark(
    primary: kAccent,
    secondary: kAccentSecondary,
    surface: Color(0xFF1E0035),
  ),
  extensions: [
    AppColors(
      background: [Color(0xFF150025), Color(0xFF1A0038), Color(0xFF0D001A)],
      accent: kAccent,
      accentSecondary: kAccentSecondary,
      accentGradient: [Color(0xFF8B5CF6), Color(0xFFDB2777)],
      cardBg: Color(0xFF1E0035),
      cardBorder: Color(0x33FFFFFF),
      cardText: Colors.white,
      cardSubtext: Color(0xAAFFFFFF),
      navActive: Colors.white,
      navInactive: Color(0x66FFFFFF),
      navBg: Color(0xD90F172A),
      isDark: true,
    ),
  ],
);

// ─── Light Theme ─────────────────────────────────────────────────────────────
final ThemeData lightTheme = ThemeData(
  brightness: Brightness.light,
  scaffoldBackgroundColor: const Color(0xFFFDF2F8),
  primaryColor: kAccent,
  textTheme: _textTheme,
  colorScheme: const ColorScheme.light(
    primary: kAccent,
    secondary: kAccentSecondary,
    surface: Colors.white,
  ),
  extensions: [
    AppColors(
      background: [Color(0xFFFCE4F3), Color(0xFFEDE0FF), Color(0xFFDDD6FE)],
      accent: kAccent,
      accentSecondary: kAccentSecondary,
      accentGradient: [Color(0xFF8B5CF6), Color(0xFFDB2777)],
      cardBg: Colors.white,
      cardBorder: Color(0x1A000000),
      cardText: Color(0xFF0F172A),
      cardSubtext: Color(0x880F172A),
      navActive: kAccent,
      navInactive: Color(0x66000000),
      navBg: Color(0xD9FFFFFF),
      isDark: false,
    ),
  ],
);

// ─── AppColors Extension ─────────────────────────────────────────────────────
class AppColors extends ThemeExtension<AppColors> {
  final List<Color> background;
  final Color accent;
  final Color accentSecondary;
  final List<Color> accentGradient;
  final Color cardBg;
  final Color cardBorder;
  final Color cardText;
  final Color cardSubtext;
  final Color navActive;
  final Color navInactive;
  final Color navBg;
  final bool isDark;

  const AppColors({
    required this.background,
    required this.accent,
    required this.accentSecondary,
    required this.accentGradient,
    required this.cardBg,
    required this.cardBorder,
    required this.cardText,
    required this.cardSubtext,
    required this.navActive,
    required this.navInactive,
    required this.navBg,
    required this.isDark,
  });

  @override
  AppColors copyWith({
    List<Color>? background,
    Color? accent,
    Color? accentSecondary,
    List<Color>? accentGradient,
    Color? cardBg,
    Color? cardBorder,
    Color? cardText,
    Color? cardSubtext,
    Color? navActive,
    Color? navInactive,
    Color? navBg,
    bool? isDark,
  }) {
    return AppColors(
      background: background ?? this.background,
      accent: accent ?? this.accent,
      accentSecondary: accentSecondary ?? this.accentSecondary,
      accentGradient: accentGradient ?? this.accentGradient,
      cardBg: cardBg ?? this.cardBg,
      cardBorder: cardBorder ?? this.cardBorder,
      cardText: cardText ?? this.cardText,
      cardSubtext: cardSubtext ?? this.cardSubtext,
      navActive: navActive ?? this.navActive,
      navInactive: navInactive ?? this.navInactive,
      navBg: navBg ?? this.navBg,
      isDark: isDark ?? this.isDark,
    );
  }

  @override
  AppColors lerp(ThemeExtension<AppColors>? other, double t) {
    if (other is! AppColors) return this;
    return AppColors(
      background: [
        Color.lerp(background[0], other.background[0], t)!,
        Color.lerp(background[1], other.background[1], t)!,
        Color.lerp(background[2], other.background[2], t)!,
      ],
      accent: Color.lerp(accent, other.accent, t)!,
      accentSecondary: Color.lerp(accentSecondary, other.accentSecondary, t)!,
      accentGradient: [
        Color.lerp(accentGradient[0], other.accentGradient[0], t)!,
        Color.lerp(accentGradient[1], other.accentGradient[1], t)!,
      ],
      cardBg: Color.lerp(cardBg, other.cardBg, t)!,
      cardBorder: Color.lerp(cardBorder, other.cardBorder, t)!,
      cardText: Color.lerp(cardText, other.cardText, t)!,
      cardSubtext: Color.lerp(cardSubtext, other.cardSubtext, t)!,
      navActive: Color.lerp(navActive, other.navActive, t)!,
      navInactive: Color.lerp(navInactive, other.navInactive, t)!,
      navBg: Color.lerp(navBg, other.navBg, t)!,
      isDark: t < 0.5 ? isDark : other.isDark,
    );
  }
}
