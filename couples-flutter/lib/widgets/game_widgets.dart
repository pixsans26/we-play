// Shared game UI widgets used across scratch screens
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Round circle button used in screen headers
class GameCircleBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const GameCircleBtn({super.key, required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      width: 42, height: 42,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.22),
        borderRadius: BorderRadius.circular(21),
      ),
      child: Icon(icon, color: Colors.white.withOpacity(0.95), size: 22),
    ),
  );
}

/// Score card showing partner names + counts
class GameScoreCard extends StatelessWidget {
  final String partnerAName, partnerBName;
  final String? avatarA, avatarB;
  final int countA, countB;
  final String turnName, performingName;
  final bool isDark;

  const GameScoreCard({
    super.key,
    required this.partnerAName, required this.partnerBName,
    this.avatarA, this.avatarB,
    required this.countA, required this.countB,
    required this.turnName, required this.performingName,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 12),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withOpacity(0.1) : Colors.white.withOpacity(0.85),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? Colors.white.withOpacity(0.2) : Colors.white.withOpacity(0.6)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10)],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(child: _PartnerName(name: partnerAName, avatar: avatarA, isDark: isDark)),
              const SizedBox(width: 10),
              Expanded(child: _PartnerName(name: partnerBName, avatar: avatarB, isDark: isDark)),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(child: Text('$countA', textAlign: TextAlign.center, style: GoogleFonts.nunito(fontSize: 42, fontWeight: FontWeight.w900, color: isDark ? Colors.white : const Color(0xFF0F172A)))),
              const Icon(Icons.favorite, color: Color(0xFFDB2777), size: 36),
              Expanded(child: Text('$countB', textAlign: TextAlign.center, style: GoogleFonts.nunito(fontSize: 42, fontWeight: FontWeight.w900, color: isDark ? Colors.white : const Color(0xFF0F172A)))),
            ],
          ),
          Divider(color: isDark ? Colors.white12 : Colors.black12),
          Text('$turnName Scratches → $performingName Performs',
            textAlign: TextAlign.center,
            style: GoogleFonts.nunito(color: isDark ? Colors.white60 : Colors.black45, fontSize: 12, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _PartnerName extends StatelessWidget {
  final String name;
  final String? avatar;
  final bool isDark;

  const _PartnerName({required this.name, this.avatar, required this.isDark});

  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      Container(
        width: 28, height: 28,
        decoration: BoxDecoration(
          color: isDark ? Colors.white.withOpacity(0.1) : Colors.black.withOpacity(0.05),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: isDark ? Colors.white24 : Colors.black12, width: 1.5),
        ),
        clipBehavior: Clip.antiAlias,
        child: avatar != null && avatar!.isNotEmpty
            ? Image.network(avatar!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.person, size: 14, color: Colors.grey))
            : const Icon(Icons.person, size: 14, color: Colors.grey),
      ),
      const SizedBox(width: 6),
      Flexible(child: Text(name, style: GoogleFonts.nunito(fontSize: 13, fontWeight: FontWeight.w700, color: isDark ? Colors.white : const Color(0xFF9333EA)), overflow: TextOverflow.ellipsis)),
    ],
  );
}

/// 3D-style gradient button used in scratch screens
class GameBtn3D extends StatelessWidget {
  final String label;
  final IconData? icon;
  final IconData? iconRight;
  final List<Color> colors;
  final Color shadowColor;
  final VoidCallback? onTap;

  const GameBtn3D({
    super.key,
    required this.label,
    this.icon, this.iconRight,
    required this.colors,
    required this.shadowColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned(
          top: 3, left: 0, right: 0, bottom: -3,
          child: Container(
            decoration: BoxDecoration(
              color: shadowColor,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: shadowColor, width: 2),
            ),
          ),
        ),
        GestureDetector(
          onTap: onTap,
          child: Container(
            margin: const EdgeInsets.only(bottom: 3),
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: colors),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: Colors.white.withOpacity(0.35), width: 2),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (icon != null) ...[Icon(icon, color: Colors.white, size: 18), const SizedBox(width: 6)],
                Text(label, style: GoogleFonts.nunito(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w800)),
                if (iconRight != null) ...[const SizedBox(width: 6), Icon(iconRight, color: Colors.white, size: 18)],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class GameLoadingScaffold extends StatelessWidget {
  final List<Color> bgColors;
  const GameLoadingScaffold({super.key, required this.bgColors});

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Container(
      decoration: BoxDecoration(gradient: LinearGradient(colors: bgColors, begin: Alignment.topCenter, end: Alignment.bottomCenter)),
      child: const Center(child: CircularProgressIndicator(color: Colors.white)),
    ),
  );
}

class GameEmptyState extends StatelessWidget {
  final List<Color> bgColors;
  final VoidCallback onBack;
  const GameEmptyState({super.key, required this.bgColors, required this.onBack});

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Container(
      decoration: BoxDecoration(gradient: LinearGradient(colors: bgColors, begin: Alignment.topCenter, end: Alignment.bottomCenter)),
      child: Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.camera_alt, size: 80, color: Colors.white60),
          const SizedBox(height: 20),
          Text('All Done!', style: GoogleFonts.nunito(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
          const SizedBox(height: 12),
          Text('You\'ve completed all tasks!', textAlign: TextAlign.center, style: GoogleFonts.nunito(color: Colors.white70, fontSize: 15)),
          const SizedBox(height: 32),
          GestureDetector(
            onTap: onBack,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
              decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF7C3AED), Color(0xFFDB2777)]), borderRadius: BorderRadius.circular(999)),
              child: Text('Go Back', style: GoogleFonts.nunito(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
            ),
          ),
        ]),
      ),
    ),
  );
}
