import 'dart:math';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/game_provider.dart';
import '../../providers/theme_provider.dart';
import '../../models/models.dart';
import '../../services/api_service.dart';

class HomeScreen extends StatefulWidget {
  final ValueChanged<int>? onNavigateTab;
  const HomeScreen({super.key, this.onNavigateTab});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  late AnimationController _bgAnim;
  late AnimationController _heartAnim;
  int _currentLevel = 1;
  int _completedCount = 0;
  bool _loadingProgress = false;

  // invite code state
  final _inviteCtrl = TextEditingController();
  bool _joining = false;
  String? _joinError;

  @override
  void initState() {
    super.initState();
    _bgAnim = AnimationController(vsync: this, duration: const Duration(seconds: 4))..repeat(reverse: true);
    _heartAnim = AnimationController(vsync: this, duration: const Duration(seconds: 8))..repeat();
    WidgetsBinding.instance.addPostFrameCallback((_) => _init());
  }

  @override
  void dispose() {
    _bgAnim.dispose();
    _heartAnim.dispose();
    _inviteCtrl.dispose();
    super.dispose();
  }

  Future<void> _init() async {
    final auth = context.read<AuthProvider>();
    final game = context.read<GameProvider>();
    game.updateStreak();
    await _loadProgress();
    if (auth.coupleProfile?.isLinked == true && !game.isDataLoaded) {
      try { await game.fetchData(); } catch (_) {}
    }
  }

  Future<void> _loadProgress() async {
    final auth = context.read<AuthProvider>();
    if (auth.coupleProfile == null) return;
    setState(() => _loadingProgress = true);
    try {
      final uid = auth.isPartnerA
          ? auth.coupleProfile!.partnerAUid
          : (auth.coupleProfile!.partnerBUid ?? auth.coupleProfile!.partnerAUid);
      final data = await ApiService.fetchProgress(uid);
      if (data != null && mounted) {
        setState(() {
          _currentLevel = data['currentLevel'] ?? 1;
          _completedCount = data['completedCount'] ?? 0;
        });
      }
    } catch (_) {}
    if (mounted) setState(() => _loadingProgress = false);
  }

  Future<void> _joinPartner() async {
    if (_inviteCtrl.text.trim().length < 4) {
      setState(() => _joinError = 'Please enter a valid invite code');
      return;
    }
    setState(() { _joining = true; _joinError = null; });
    final auth = context.read<AuthProvider>();
    final result = await ApiService.joinCouple(
      uid: auth.uid!,
      inviteCode: _inviteCtrl.text.trim().toUpperCase(),
      sessionToken: auth.sessionToken ?? '',
    );
    if (!mounted) return;
    if (result != null && result['error'] == null) {
      await auth.setCoupleProfile(auth.coupleProfile);
      await auth.setIsPartnerA(false);
      setState(() => _joinError = null);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Connected with your partner! 💕', style: GoogleFonts.nunito())),
      );
    } else {
      setState(() => _joinError = result?['error'] ?? 'Invalid invite code');
    }
    setState(() => _joining = false);
  }

  void _handleGamePress(String mode, String route) {
    final auth = context.read<AuthProvider>();
    if (auth.coupleProfile?.isLinked != true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Please connect with your partner first 💕', style: GoogleFonts.nunito()),
          backgroundColor: const Color(0xFF9333EA),
        ),
      );
      return;
    }
    if (mode.isNotEmpty) context.read<GameProvider>().setMode(mode);
    Navigator.of(context).pushNamed(route);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final game = context.watch<GameProvider>();
    final isDark = context.watch<ThemeProvider>().isDark;

    final cp = auth.coupleProfile;
    final partnerAName = cp?.partnerAName ?? 'You';
    final partnerBName = cp?.partnerBName ?? 'Partner';
    final displayName = cp?.isLinked == true
        ? (auth.isPartnerA ? '$partnerAName & $partnerBName' : '$partnerBName & $partnerAName')
        : (auth.isPartnerA ? partnerAName : partnerBName);
    final turnName = game.currentTurn == 'A' ? partnerAName : partnerBName;

    final badge = kLevelBadges[_currentLevel] ?? kLevelBadges[5]!;
    final progressInLevel = _completedCount % 10;

    final bgColors = isDark
        ? [const Color(0xFF150025), const Color(0xFF3B0764), const Color(0xFF4C1D95)]
        : [const Color(0xFFFDF2F8), const Color(0xFFFCE7F3), const Color(0xFFF5D0FE)];

    final heartColor = isDark ? Colors.white.withOpacity(0.07) : Colors.white.withOpacity(0.25);

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: bgColors, begin: Alignment.topCenter, end: Alignment.bottomCenter),
        ),
        child: Stack(
          children: [
            // ── Floating background hearts ──
            AnimatedBuilder(
              animation: _bgAnim,
              builder: (_, __) => Stack(
                children: [
                  Positioned(
                    top: 80,
                    left: -20,
                    child: Transform.translate(
                      offset: Offset(0, -20 * _bgAnim.value),
                      child: Transform.rotate(
                        angle: -0.26,
                        child: Icon(Icons.favorite, size: 120, color: heartColor),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 250,
                    right: -10,
                    child: Transform.translate(
                      offset: Offset(0, 30 * _bgAnim.value),
                      child: Transform.rotate(
                        angle: 0.44,
                        child: Icon(Icons.favorite, size: 80, color: heartColor),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 150,
                    left: 30,
                    child: Transform.translate(
                      offset: Offset(0, -40 * _bgAnim.value),
                      child: Transform.rotate(
                        angle: -0.17,
                        child: Icon(Icons.favorite, size: 150, color: heartColor),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            SafeArea(
              child: Column(
                children: [
                  // ── Header ──
                  Padding(
                    padding: const EdgeInsets.fromLTRB(22, 16, 22, 16),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Welcome back 💕',
                                style: GoogleFonts.nunito(
                                  color: isDark ? Colors.white70 : Colors.black54,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              Text(
                                displayName,
                                style: GoogleFonts.dynaPuff(
                                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                                  fontSize: 22,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: () {
                            if (widget.onNavigateTab != null) {
                              widget.onNavigateTab!(3);
                            } else {
                              Navigator.of(context).pushNamed('/settings');
                            }
                          },
                          icon: Icon(Icons.settings_outlined, color: isDark ? Colors.white : const Color(0xFF0F172A)),
                        ),
                        GestureDetector(
                          onTap: () {
                            if (widget.onNavigateTab != null) {
                              widget.onNavigateTab!(4);
                            } else {
                              Navigator.of(context).pushNamed('/profile');
                            }
                          },
                          child: _AvatarWidget(
                            avatarUrl: auth.isPartnerA ? cp?.partnerAAvatar : cp?.partnerBAvatar,
                            gender: auth.isPartnerA ? cp?.partnerAGender : cp?.partnerBGender,
                            isDark: isDark,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // ── Scrollable content ──
                  Expanded(
                    child: ListView(
                      padding: EdgeInsets.fromLTRB(22, 0, 22, widget.onNavigateTab != null ? 110 : 100),
                      children: [
                        // Invite banner (if pending)
                        if (cp?.status == 'pending' && auth.isPartnerA) ...[
                          _InviteBanner(
                            inviteCode: cp?.inviteCode ?? '',
                            inviteCtrl: _inviteCtrl,
                            joining: _joining,
                            joinError: _joinError,
                            onJoin: _joinPartner,
                            isDark: isDark,
                          ),
                          const SizedBox(height: 16),
                        ],

                        // ── Level & Streak card ──
                        _LevelCard(
                          badgeEmoji: badge['emoji']!,
                          badgeLabel: badge['label']!,
                          level: _currentLevel,
                          streak: game.streak,
                          progressInLevel: progressInLevel,
                          bgAnim: _bgAnim,
                          isDark: isDark,
                        ),
                        const SizedBox(height: 14),

                        // ── Whose turn ──
                        _TurnBanner(turnName: turnName, isDark: isDark),
                        const SizedBox(height: 16),

                        // ── Section label ──
                        Text(
                          'CHOOSE A GAME MODE',
                          style: GoogleFonts.dynaPuff(
                            color: isDark ? Colors.white70 : Colors.black54,
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1,
                          ),
                        ),
                        const SizedBox(height: 12),

                        // ── 2×2 Game Grid ──
                        GridView.count(
                          crossAxisCount: 2,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          children: [
                            _GameCard(image: 'assets/images/hidden-moments.png', onTap: () => _handleGamePress('image', '/image-scratch')),
                            _GameCard(image: 'assets/images/love-missions.png', onTap: () => _handleGamePress('text', '/task-scratch')),
                            _GameCard(image: 'assets/images/fate-wheel.png', onTap: () => _handleGamePress('', '/spin-wheel')),
                            _GameCard(image: 'assets/images/heart-draw.png', onTap: () => _handleGamePress('', '/lottery')),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // ── Bottom Nav ──
            if (widget.onNavigateTab == null)
              Positioned(
                bottom: 24,
                left: 20,
                right: 20,
                child: _BottomNav(isDark: isDark),
              ),
          ],
        ),
      ),
    );
  }
}

// ─── Sub-Widgets ────────────────────────────────────────────────────────────

class _AvatarWidget extends StatelessWidget {
  final String? avatarUrl;
  final String? gender;
  final bool isDark;

  const _AvatarWidget({this.avatarUrl, this.gender, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 44, height: 44,
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withOpacity(0.12) : Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: isDark ? Colors.white24 : Colors.black12),
      ),
      clipBehavior: Clip.antiAlias,
      child: avatarUrl != null && avatarUrl!.isNotEmpty
          ? Image.network(avatarUrl!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _genderIcon())
          : _genderIcon(),
    );
  }

  Widget _genderIcon() {
    final icon = gender?.toLowerCase() == 'female' ? Icons.face_3 : Icons.face;
    return Icon(icon, color: isDark ? Colors.white54 : Colors.black38, size: 24);
  }
}

class _LevelCard extends StatelessWidget {
  final String badgeEmoji, badgeLabel;
  final int level, streak, progressInLevel;
  final AnimationController bgAnim;
  final bool isDark;

  const _LevelCard({
    required this.badgeEmoji, required this.badgeLabel,
    required this.level, required this.streak, required this.progressInLevel,
    required this.bgAnim, required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: bgAnim,
      builder: (_, __) => Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: isDark
                ? [const Color(0xFF4C1D95), const Color(0xFF7C3AED), const Color(0xFFDB2777)]
                : [const Color(0xFF9333EA), const Color(0xFFDB2777), const Color(0xFFFF8A00)],
            begin: Alignment(bgAnim.value * 0.5, 0),
            end: Alignment(1 - bgAnim.value * 0.5, 1),
          ),
          borderRadius: BorderRadius.circular(28),
          boxShadow: [BoxShadow(color: const Color(0xFFDB2777).withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8))],
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Text(badgeEmoji, style: const TextStyle(fontSize: 26)),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('YOUR LEVEL', style: GoogleFonts.dynaPuff(color: Colors.white60, fontSize: 11, fontWeight: FontWeight.w700)),
                          Text('Level $level', style: GoogleFonts.dynaPuff(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
                          Text(badgeLabel, style: GoogleFonts.nunito(color: Colors.white70, fontSize: 12)),
                        ],
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.local_fire_department, color: Color(0xFFFBBF24), size: 22),
                      Text('$streak', style: GoogleFonts.dynaPuff(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
                      Text('Streak', style: GoogleFonts.dynaPuff(color: Colors.white60, fontSize: 10)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Progress to next level', style: GoogleFonts.nunito(color: Colors.white70, fontSize: 12)),
                Text('$progressInLevel/10', style: GoogleFonts.nunito(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
              ],
            ),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: LinearProgressIndicator(
                value: progressInLevel / 10,
                backgroundColor: Colors.black.withOpacity(0.25),
                valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                minHeight: 7,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TurnBanner extends StatelessWidget {
  final String turnName;
  final bool isDark;

  const _TurnBanner({required this.turnName, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withOpacity(0.07) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? Colors.white12 : Colors.black.withOpacity(0.08)),
      ),
      child: Row(
        children: [
          Container(
            width: 8, height: 8,
            decoration: BoxDecoration(
              color: isDark ? Colors.white : const Color(0xFFDB2777),
              borderRadius: BorderRadius.circular(4),
              boxShadow: [BoxShadow(color: (isDark ? Colors.white : const Color(0xFFDB2777)).withOpacity(0.8), blurRadius: 4)],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            "$turnName's turn to play",
            style: GoogleFonts.dynaPuff(
              color: isDark ? Colors.white : const Color(0xFFDB2777),
              fontSize: 14,
              fontWeight: FontWeight.w800,
            ),
          ),
          const Spacer(),
          Icon(Icons.favorite, size: 16, color: isDark ? Colors.white : const Color(0xFFDB2777)),
        ],
      ),
    );
  }
}

class _GameCard extends StatelessWidget {
  final String image;
  final VoidCallback onTap;

  const _GameCard({required this.image, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 12, offset: const Offset(0, 6))],
        ),
        clipBehavior: Clip.antiAlias,
        child: Image.asset(image, fit: BoxFit.cover),
      ),
    );
  }
}

class _InviteBanner extends StatelessWidget {
  final String inviteCode;
  final TextEditingController inviteCtrl;
  final bool joining;
  final String? joinError;
  final VoidCallback onJoin;
  final bool isDark;

  const _InviteBanner({
    required this.inviteCode, required this.inviteCtrl, required this.joining,
    this.joinError, required this.onJoin, required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withOpacity(0.07) : Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: const Color(0xFFDB2777).withOpacity(0.5)),
      ),
      child: Column(
        children: [
          const Icon(Icons.mail_outline, color: Color(0xFFDB2777), size: 32),
          const SizedBox(height: 8),
          Text('Invite Your Partner', style: GoogleFonts.nunito(fontSize: 18, fontWeight: FontWeight.w900, color: isDark ? Colors.white : const Color(0xFF0F172A))),
          const SizedBox(height: 4),
          Text('Share this code with your partner:', style: GoogleFonts.nunito(color: isDark ? Colors.white60 : Colors.black45, fontSize: 13)),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: () {
              Clipboard.setData(ClipboardData(text: inviteCode));
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Copied!', style: GoogleFonts.nunito())));
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
              decoration: BoxDecoration(
                color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.04),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(inviteCode, style: GoogleFonts.nunito(color: const Color(0xFFDB2777), fontSize: 24, fontWeight: FontWeight.w700, letterSpacing: 4)),
                  const SizedBox(width: 12),
                  const Icon(Icons.copy, color: Color(0xFFDB2777), size: 20),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Divider(color: isDark ? Colors.white12 : Colors.black12),
          const SizedBox(height: 16),
          Text("Or enter partner's code:", style: GoogleFonts.nunito(color: isDark ? Colors.white70 : Colors.black54, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          TextField(
            controller: inviteCtrl,
            textCapitalization: TextCapitalization.characters,
            textAlign: TextAlign.center,
            style: GoogleFonts.nunito(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.w700),
            decoration: InputDecoration(
              hintText: 'e.g. A1B2C3',
              hintStyle: GoogleFonts.nunito(color: isDark ? Colors.white30 : Colors.black26),
              filled: true,
              fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: isDark ? Colors.white12 : Colors.black12)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: isDark ? Colors.white12 : Colors.black12)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
          ),
          if (joinError != null) ...[
            const SizedBox(height: 8),
            Text(joinError!, style: GoogleFonts.nunito(color: Colors.red, fontSize: 13)),
          ],
          const SizedBox(height: 12),
          GestureDetector(
            onTap: joining ? null : onJoin,
            child: Container(
              width: double.infinity,
              height: 48,
              decoration: BoxDecoration(
                color: joining ? Colors.grey : const Color(0xFF10B981),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Center(
                child: joining
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text('Connect Partner', style: GoogleFonts.nunito(color: Colors.white, fontWeight: FontWeight.w800)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BottomNav extends StatelessWidget {
  final bool isDark;

  const _BottomNav({required this.isDark});

  @override
  Widget build(BuildContext context) {
    final route = ModalRoute.of(context)?.settings.name ?? '/home';

    final tabs = [
      {'icon': Icons.history, 'label': 'History', 'route': '/history'},
      {'icon': Icons.favorite_outline, 'label': 'Partner', 'route': '/partner'},
      {'icon': Icons.home, 'label': 'Home', 'route': '/home'},
      {'icon': Icons.settings_outlined, 'label': 'Settings', 'route': '/settings'},
      {'icon': Icons.person_outline, 'label': 'Profile', 'route': '/profile'},
    ];

    return ClipRRect(
      borderRadius: BorderRadius.circular(28),
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          height: 70,
          decoration: BoxDecoration(
            color: isDark ? const Color(0xD90F172A) : const Color(0xD9FFFFFF),
            borderRadius: BorderRadius.circular(28),
          ),
          child: Row(
            children: tabs.map((tab) {
              final isActive = route == tab['route'];
              final color = isActive
                  ? (isDark ? Colors.white : const Color(0xFFDB2777))
                  : (isDark ? Colors.white38 : Colors.black26);
              return Expanded(
                child: GestureDetector(
                  onTap: () {
                    if (!isActive) Navigator.of(context).pushNamed(tab['route'] as String);
                  },
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(tab['icon'] as IconData, color: color, size: 24),
                      if (isActive)
                        Container(
                          margin: const EdgeInsets.only(top: 4),
                          width: 4, height: 4,
                          decoration: BoxDecoration(
                            color: color,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      if (!isActive) const SizedBox(height: 8),
                      Text(
                        tab['label'] as String,
                        style: GoogleFonts.nunito(color: color, fontSize: 10, fontWeight: isActive ? FontWeight.w700 : FontWeight.w400),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}


