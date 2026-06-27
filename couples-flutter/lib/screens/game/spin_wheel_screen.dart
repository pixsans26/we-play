import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/game_provider.dart';
import '../../providers/theme_provider.dart';
import '../../services/api_service.dart';
import '../../services/sound_service.dart';
import '../../widgets/spin_wheel_painter.dart';

class SpinWheelScreen extends StatefulWidget {
  const SpinWheelScreen({super.key});

  @override
  State<SpinWheelScreen> createState() => _SpinWheelScreenState();
}

class _SpinWheelScreenState extends State<SpinWheelScreen> with TickerProviderStateMixin {
  late AnimationController _spinController;
  late AnimationController _bgAnim;
  late AnimationController _resultAnim;
  Animation<double>? _spinAnimation;

  bool _isSpinning = false;
  String? _selectedLabel;
  bool _showResult = false;
  int _spinCountA = 0;
  int _spinCountB = 0;
  double _currentAngle = 0;

  List<Map<String, dynamic>> get _segments {
    final game = context.read<GameProvider>();
    final spins = game.spinTasks;
    if (spins.isEmpty) return _defaultSegments;
    return spins.map<Map<String, dynamic>>((s) => {'label': s['label']?.toString() ?? '?', 'level': s['level'] ?? 1}).toList();
  }

  static const List<Map<String, dynamic>> _defaultSegments = [
    {'label': 'Kiss 💋', 'level': 1},
    {'label': 'Hug 🤗', 'level': 1},
    {'label': 'Dance 💃', 'level': 1},
    {'label': 'Massage 💆', 'level': 2},
    {'label': 'Cook Together 🍳', 'level': 1},
    {'label': 'Truth or Dare 🎭', 'level': 2},
    {'label': 'Movie Night 🎬', 'level': 1},
    {'label': 'Love Letter 💌', 'level': 1},
  ];

  @override
  void initState() {
    super.initState();
    _spinController = AnimationController(vsync: this, duration: const Duration(milliseconds: 3500));
    _bgAnim = AnimationController(vsync: this, duration: const Duration(seconds: 5))..repeat(reverse: true);
    _resultAnim = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadCounts());
  }

  @override
  void dispose() {
    _spinController.dispose();
    _bgAnim.dispose();
    _resultAnim.dispose();
    super.dispose();
  }

  Future<void> _loadCounts() async {
    final auth = context.read<AuthProvider>();
    final cp = auth.coupleProfile;
    if (cp == null) return;
    final histA = await ApiService.fetchHistory(cp.partnerAUid);
    final histB = await ApiService.fetchHistory(cp.partnerBUid ?? 'partner_b_pending_${cp.id}');
    if (!mounted) return;
    setState(() {
      _spinCountA = histA.where((h) => h['taskType'] == 'spin_wheel').length;
      _spinCountB = histB.where((h) => h['taskType'] == 'spin_wheel').length;
    });
  }

  void _spin() {
    if (_isSpinning) return;
    final segs = _segments;
    if (segs.isEmpty) return;

    setState(() { _isSpinning = true; _showResult = false; _selectedLabel = null; });
    SoundService.playLevelUp();

    final rng = Random();
    final extraSpins = 5 + rng.nextInt(5);
    final selectedIndex = rng.nextInt(segs.length);
    final segmentAngle = 2 * pi / segs.length;
    // Target: position selected segment under pointer (top = -pi/2)
    final targetAngle = _currentAngle + extraSpins * 2 * pi + (2 * pi - selectedIndex * segmentAngle - segmentAngle / 2 - _currentAngle % (2 * pi));
    
    _spinAnimation = Tween<double>(begin: _currentAngle, end: targetAngle).animate(
      CurvedAnimation(parent: _spinController, curve: Curves.easeOutCubic),
    );

    _spinController.reset();
    _spinController.forward().then((_) {
      _currentAngle = targetAngle % (2 * pi);
      setState(() {
        _isSpinning = false;
        _selectedLabel = segs[selectedIndex]['label'];
        _showResult = true;
      });
      _resultAnim.reset();
      _resultAnim.forward();

      // Log the spin
      final auth = context.read<AuthProvider>();
      final game = context.read<GameProvider>();
      final cp = auth.coupleProfile;
      if (cp != null) {
        final uid = game.currentTurn == 'A' ? cp.partnerAUid : (cp.partnerBUid ?? 'partner_b_pending_${cp.id}');
        ApiService.logScratch(userUid: uid, taskId: 'spin_${selectedIndex}', taskType: 'spin_wheel', completed: true, skipped: false);
        game.incrementSpinCount();
        game.switchTurn();
        _loadCounts();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final game = context.watch<GameProvider>();
    final isDark = context.watch<ThemeProvider>().isDark;
    final cp = auth.coupleProfile;
    final turnName = game.currentTurn == 'A' ? (cp?.partnerAName ?? 'A') : (cp?.partnerBName ?? 'B');

    final bgColors = isDark
        ? [const Color(0xFF150025), const Color(0xFF4C1D95), const Color(0xFF7C3AED)]
        : [const Color(0xFFF3E8FF), const Color(0xFFEDE9FE), const Color(0xFFFDF2F8)];

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(gradient: LinearGradient(colors: bgColors, begin: Alignment.topCenter, end: Alignment.bottomCenter)),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                child: Row(children: [
                  GestureDetector(
                    onTap: () => Navigator.of(context).pop(),
                    child: Container(width: 42, height: 42, decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(21)), child: Icon(Icons.arrow_back_ios_new, color: isDark ? Colors.white : const Color(0xFF6B21A8), size: 20)),
                  ),
                  Expanded(child: Text('Fate Wheel ⚡', textAlign: TextAlign.center, style: GoogleFonts.nunito(color: isDark ? Colors.white : const Color(0xFF4C1D95), fontSize: 20, fontWeight: FontWeight.w900))),
                  const SizedBox(width: 42),
                ]),
              ),

              // Score row
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                child: Row(children: [
                  Expanded(child: _StatCard(label: cp?.partnerAName ?? 'A', value: _spinCountA, isDark: isDark)),
                  const SizedBox(width: 12),
                  Expanded(child: _StatCard(label: cp?.partnerBName ?? 'B', value: _spinCountB, isDark: isDark)),
                ]),
              ),

              // Turn pill
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 20),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF9333EA), Color(0xFFDB2777)]),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text("$turnName's Spin 🎡", textAlign: TextAlign.center, style: GoogleFonts.nunito(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14)),
              ),
              const SizedBox(height: 16),

              // Wheel
              Expanded(
                child: AnimatedBuilder(
                  animation: _spinAnimation != null ? _spinAnimation! : _bgAnim,
                  builder: (_, __) {
                    final angle = _spinAnimation != null ? _spinAnimation!.value : _currentAngle;
                    return CustomPaint(
                      painter: SpinWheelPainter(segments: _segments, rotationAngle: angle),
                      child: Container(),
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),

              // Result
              if (_showResult && _selectedLabel != null)
                AnimatedBuilder(
                  animation: _resultAnim,
                  builder: (_, __) => Transform.scale(
                    scale: _resultAnim.value,
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 20),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [Color(0xFF9333EA), Color(0xFFDB2777)]),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [BoxShadow(color: const Color(0xFFDB2777).withOpacity(0.4), blurRadius: 16, offset: const Offset(0, 6))],
                      ),
                      child: Column(children: [
                        Text('✨ You got:', style: GoogleFonts.nunito(color: Colors.white70, fontSize: 13)),
                        const SizedBox(height: 4),
                        Text(_selectedLabel!, textAlign: TextAlign.center, style: GoogleFonts.nunito(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
                      ]),
                    ),
                  ),
                ),
              const SizedBox(height: 16),

              // Spin button
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                child: GestureDetector(
                  onTap: _isSpinning ? null : _spin,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: double.infinity,
                    height: 58,
                    decoration: BoxDecoration(
                      gradient: _isSpinning
                          ? LinearGradient(colors: [Colors.grey.shade400, Colors.grey.shade500])
                          : const LinearGradient(colors: [Color(0xFF9333EA), Color(0xFFDB2777), Color(0xFFFF8A00)]),
                      borderRadius: BorderRadius.circular(999),
                      boxShadow: _isSpinning ? [] : [BoxShadow(color: const Color(0xFFDB2777).withOpacity(0.4), blurRadius: 16, offset: const Offset(0, 6))],
                    ),
                    child: Center(
                      child: _isSpinning
                          ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                          : Text('SPIN! 🎡', style: GoogleFonts.nunito(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: 1)),
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
}

class _StatCard extends StatelessWidget {
  final String label;
  final int value;
  final bool isDark;

  const _StatCard({required this.label, required this.value, required this.isDark});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
    decoration: BoxDecoration(
      color: isDark ? Colors.white.withOpacity(0.08) : Colors.white,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: isDark ? Colors.white12 : Colors.black.withOpacity(0.08)),
    ),
    child: Column(children: [
      Text(label, style: GoogleFonts.nunito(color: isDark ? Colors.white60 : Colors.black45, fontSize: 13, fontWeight: FontWeight.w700)),
      Text('$value', style: GoogleFonts.nunito(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 28, fontWeight: FontWeight.w900)),
    ]),
  );
}
