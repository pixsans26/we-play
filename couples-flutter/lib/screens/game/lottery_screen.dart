import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/game_provider.dart';
import '../../providers/theme_provider.dart';
import '../../services/api_service.dart';
import '../../services/sound_service.dart';

class LotteryScreen extends StatefulWidget {
  const LotteryScreen({super.key});

  @override
  State<LotteryScreen> createState() => _LotteryScreenState();
}

class _LotteryScreenState extends State<LotteryScreen> with TickerProviderStateMixin {
  bool _isRolling = false;
  List<String>? _results;
  late AnimationController _bgAnim;
  late List<AnimationController> _reelControllers;
  List<List<String>> _reelItems = [[], [], []];

  @override
  void initState() {
    super.initState();
    _bgAnim = AnimationController(vsync: this, duration: const Duration(seconds: 4))..repeat(reverse: true);
    _reelControllers = List.generate(3, (i) => AnimationController(vsync: this, duration: Duration(milliseconds: 800 + i * 400)));
    WidgetsBinding.instance.addPostFrameCallback((_) => _buildReels());
  }

  @override
  void dispose() {
    _bgAnim.dispose();
    for (final c in _reelControllers) c.dispose();
    super.dispose();
  }

  void _buildReels() {
    final game = context.read<GameProvider>();
    final lottery = game.lotteryData;

    List<String> col1 = List<String>.from((lottery['col1'] as List? ?? []).map((i) => i['label']?.toString() ?? ''));
    List<String> col2 = List<String>.from((lottery['col2'] as List? ?? []).map((i) => i['label']?.toString() ?? ''));
    List<String> col3 = List<String>.from((lottery['col3'] as List? ?? []).map((i) => i['label']?.toString() ?? ''));

    if (col1.isEmpty) col1 = ['Kiss', 'Hug', 'Dance', 'Cook', 'Massage'];
    if (col2.isEmpty) col2 = ['Kitchen', 'Bedroom', 'Park', 'Balcony', 'Sofa'];
    if (col3.isEmpty) col3 = ['Blindfolded', 'With music', 'Silently', 'Slowly', 'Passionately'];

    setState(() => _reelItems = [col1, col2, col3]);
  }

  Future<void> _roll() async {
    if (_isRolling || _reelItems.any((r) => r.isEmpty)) return;
    setState(() { _isRolling = true; _results = null; });
    SoundService.playLevelUp();

    final rng = Random();
    final picked = _reelItems.map((reel) => reel[rng.nextInt(reel.length)]).toList();

    // Animate reels sequentially
    for (int i = 0; i < 3; i++) {
      _reelControllers[i].reset();
      _reelControllers[i].forward();
      await Future.delayed(Duration(milliseconds: 500 + i * 200));
    }

    await Future.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;
    setState(() { _results = picked; _isRolling = false; });

    // Log it
    final auth = context.read<AuthProvider>();
    final game = context.read<GameProvider>();
    final cp = auth.coupleProfile;
    if (cp != null) {
      final uid = game.currentTurn == 'A' ? cp.partnerAUid : (cp.partnerBUid ?? 'partner_b_pending_${cp.id}');
      await ApiService.logScratch(userUid: uid, taskId: 'lottery_${DateTime.now().millisecondsSinceEpoch}', taskType: 'lottery', completed: true, skipped: false);
      game.switchTurn();
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final game = context.watch<GameProvider>();
    final isDark = context.watch<ThemeProvider>().isDark;
    final cp = auth.coupleProfile;
    final turnName = game.currentTurn == 'A' ? (cp?.partnerAName ?? 'A') : (cp?.partnerBName ?? 'B');

    final bgColors = isDark
        ? [const Color(0xFF0F0F23), const Color(0xFF1A1A3E), const Color(0xFF2D1B5E)]
        : [const Color(0xFFF0F9FF), const Color(0xFFE0F2FE), const Color(0xFFE9D5FF)];

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(gradient: LinearGradient(colors: bgColors, begin: Alignment.topCenter, end: Alignment.bottomCenter)),
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                child: Row(children: [
                  GestureDetector(
                    onTap: () => Navigator.of(context).pop(),
                    child: Container(width: 42, height: 42, decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(21)), child: Icon(Icons.arrow_back_ios_new, color: isDark ? Colors.white : const Color(0xFF6B21A8), size: 20)),
                  ),
                  Expanded(child: Text('Heart Draw 🎰', textAlign: TextAlign.center, style: GoogleFonts.nunito(color: isDark ? Colors.white : const Color(0xFF4C1D95), fontSize: 20, fontWeight: FontWeight.w900))),
                  const SizedBox(width: 42),
                ]),
              ),
              const SizedBox(height: 16),

              // Turn pill
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 20),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF9333EA), Color(0xFFDB2777)]),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text("$turnName's Roll 🎲", textAlign: TextAlign.center, style: GoogleFonts.nunito(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14)),
              ),
              const SizedBox(height: 32),

              // Slot machine display
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  height: 160,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: isDark ? [const Color(0xFF1E1E3E), const Color(0xFF2D2D5E)] : [Colors.white, const Color(0xFFF8F4FF)]),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: isDark ? const Color(0xFF9333EA).withOpacity(0.5) : const Color(0xFFDB2777).withOpacity(0.3), width: 2),
                    boxShadow: [BoxShadow(color: const Color(0xFF9333EA).withOpacity(0.2), blurRadius: 20, spreadRadius: 2)],
                  ),
                  child: Row(children: List.generate(3, (i) => Expanded(child: _ReelColumn(
                    items: _reelItems.length > i ? _reelItems[i] : [],
                    result: _results != null ? _results![i] : null,
                    isRolling: _isRolling,
                    controller: _reelControllers[i],
                    isDark: isDark,
                    showDivider: i < 2,
                  )))),
                ),
              ),
              const SizedBox(height: 24),

              // Column labels
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(children: [
                  Expanded(child: Text('Action', textAlign: TextAlign.center, style: GoogleFonts.nunito(color: isDark ? Colors.white38 : Colors.black38, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1))),
                  Expanded(child: Text('Where', textAlign: TextAlign.center, style: GoogleFonts.nunito(color: isDark ? Colors.white38 : Colors.black38, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1))),
                  Expanded(child: Text('How', textAlign: TextAlign.center, style: GoogleFonts.nunito(color: isDark ? Colors.white38 : Colors.black38, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1))),
                ]),
              ),

              if (_results != null) ...[
                const SizedBox(height: 24),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF9333EA), Color(0xFFDB2777)]),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [BoxShadow(color: const Color(0xFFDB2777).withOpacity(0.4), blurRadius: 16, offset: const Offset(0, 6))],
                    ),
                    child: Column(children: [
                      Text('Your Mission! 💕', style: GoogleFonts.nunito(color: Colors.white70, fontSize: 13)),
                      const SizedBox(height: 8),
                      Text(_results!.join(' + '), textAlign: TextAlign.center, style: GoogleFonts.nunito(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)),
                    ]),
                  ),
                ),
              ],

              const Spacer(),

              // Roll button
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                child: GestureDetector(
                  onTap: _isRolling ? null : _roll,
                  child: Container(
                    width: double.infinity,
                    height: 58,
                    decoration: BoxDecoration(
                      gradient: _isRolling
                          ? LinearGradient(colors: [Colors.grey.shade400, Colors.grey.shade500])
                          : const LinearGradient(colors: [Color(0xFFDB2777), Color(0xFF9333EA), Color(0xFF7C3AED)]),
                      borderRadius: BorderRadius.circular(999),
                      boxShadow: _isRolling ? [] : [BoxShadow(color: const Color(0xFFDB2777).withOpacity(0.4), blurRadius: 16, offset: const Offset(0, 6))],
                    ),
                    child: Center(
                      child: _isRolling
                          ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                          : Text('🎲 ROLL!', style: GoogleFonts.nunito(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900, letterSpacing: 1)),
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

class _ReelColumn extends StatefulWidget {
  final List<String> items;
  final String? result;
  final bool isRolling;
  final AnimationController controller;
  final bool isDark;
  final bool showDivider;

  const _ReelColumn({required this.items, this.result, required this.isRolling, required this.controller, required this.isDark, required this.showDivider});

  @override
  State<_ReelColumn> createState() => _ReelColumnState();
}

class _ReelColumnState extends State<_ReelColumn> {
  int _displayIndex = 0;
  Timer? _rollTimer;

  @override
  void didUpdateWidget(_ReelColumn old) {
    super.didUpdateWidget(old);
    if (widget.isRolling && !old.isRolling) {
      _startRolling();
    }
    if (!widget.isRolling && old.isRolling) {
      _stopRolling();
    }
  }

  void _startRolling() {
    _rollTimer?.cancel();
    _rollTimer = Timer.periodic(const Duration(milliseconds: 80), (_) {
      if (widget.items.isNotEmpty && mounted) {
        setState(() => _displayIndex = Random().nextInt(widget.items.length));
      }
    });
  }

  void _stopRolling() {
    _rollTimer?.cancel();
    if (widget.result != null && widget.items.isNotEmpty) {
      final idx = widget.items.indexOf(widget.result!);
      if (idx >= 0 && mounted) setState(() => _displayIndex = idx);
    }
  }

  @override
  void dispose() {
    _rollTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final display = widget.result ?? (widget.items.isNotEmpty ? widget.items[_displayIndex % widget.items.length] : '?');
    return Container(
      decoration: BoxDecoration(
        border: widget.showDivider ? Border(right: BorderSide(color: widget.isDark ? Colors.white12 : Colors.black12)) : null,
      ),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Text(
            display,
            textAlign: TextAlign.center,
            style: GoogleFonts.nunito(
              color: widget.isDark ? Colors.white : const Color(0xFF4C1D95),
              fontSize: 14,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ),
    );
  }
}
