import '../../widgets/game_widgets.dart';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/game_provider.dart';
import '../../providers/theme_provider.dart';
import '../../models/models.dart';
import '../../services/api_service.dart';
import '../../services/sound_service.dart';
import '../../widgets/scratch_card.dart';
import '../../widgets/heart_confetti.dart';
import '../../config/app_config.dart';

class ImageScratchScreen extends StatefulWidget {
  const ImageScratchScreen({super.key});

  @override
  State<ImageScratchScreen> createState() => _ImageScratchScreenState();
}

class _ImageScratchScreenState extends State<ImageScratchScreen> with TickerProviderStateMixin {
  bool _isLoading = true;
  bool _isScratched = false;
  bool _showConfetti = false;
  bool _timerStarted = false;
  bool _isCompleted = false;
  bool _isProcessingDone = false;
  bool _alarmPlayed = false;
  bool _noTasksRemaining = false;

  ImageTask? _currentTask;
  ImageTask? _previousTask;
  bool _showPrevious = false;

  int _scratchCountA = 0;
  int _scratchCountB = 0;
  int _currentLevel = 1;

  static const int kTimerDuration = 40;
  int _timeLeft = kTimerDuration;
  bool _timerFinished = false;
  Timer? _timer;
  Timer? _autoStartTimer;

  late AnimationController _bgAnim;
  late AnimationController _pulseAnim;
  late AnimationController _revealAnim;

  @override
  void initState() {
    super.initState();
    _bgAnim = AnimationController(vsync: this, duration: const Duration(seconds: 4))..repeat(reverse: true);
    _pulseAnim = AnimationController(vsync: this, duration: const Duration(milliseconds: 500))..repeat(reverse: true);
    _revealAnim = AnimationController(vsync: this, duration: const Duration(milliseconds: 400));
    WidgetsBinding.instance.addPostFrameCallback((_) => _init());
  }

  @override
  void dispose() {
    _bgAnim.dispose(); _pulseAnim.dispose(); _revealAnim.dispose();
    _timer?.cancel(); _autoStartTimer?.cancel();
    super.dispose();
  }

  Future<void> _init() async {
    await _loadProgress();
    await _loadNextTask();
    await _loadScratchCounts();
  }

  Future<void> _loadProgress() async {
    final auth = context.read<AuthProvider>();
    final game = context.read<GameProvider>();
    if (auth.coupleProfile == null) return;
    final uid = game.currentTurn == 'A' ? auth.coupleProfile!.partnerAUid : (auth.coupleProfile!.partnerBUid ?? auth.coupleProfile!.partnerAUid);
    final data = await ApiService.fetchProgress(uid);
    if (data != null && mounted) setState(() => _currentLevel = data['currentLevel'] ?? 1);
  }

  Future<void> _loadScratchCounts() async {
    final auth = context.read<AuthProvider>();
    final cp = auth.coupleProfile;
    if (cp == null) return;
    final histA = await ApiService.fetchHistory(cp.partnerAUid);
    final histB = await ApiService.fetchHistory(cp.partnerBUid ?? 'partner_b_pending_${cp.id}');
    if (!mounted) return;
    setState(() {
      _scratchCountA = histA.where((h) => h['taskType'] == 'image' && h['completed'] == true).length;
      _scratchCountB = histB.where((h) => h['taskType'] == 'image' && h['completed'] == true).length;
    });
  }

  Future<void> _loadNextTask() async {
    final auth = context.read<AuthProvider>();
    final game = context.read<GameProvider>();
    if (auth.coupleProfile == null) return;
    if (_currentTask != null) setState(() => _previousTask = _currentTask);
    setState(() { _isLoading = true; _isScratched = false; _showConfetti = false; });
    _revealAnim.reset();
    _timer?.cancel(); _autoStartTimer?.cancel();
    setState(() { _timerStarted = false; _timerFinished = false; _timeLeft = kTimerDuration; _isCompleted = false; _isProcessingDone = false; _alarmPlayed = false; });

    final task = game.getNextImageTask('', _currentLevel);
    if (mounted) setState(() { _currentTask = task; _noTasksRemaining = task == null; _isLoading = false; });
  }

  void _startTimer() {
    _timer?.cancel();
    setState(() { _timerStarted = true; _timeLeft = kTimerDuration; _timerFinished = false; });
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) { t.cancel(); return; }
      setState(() {
        if (_timeLeft > 0) { _timeLeft--; }
        else { _timerFinished = true; t.cancel(); if (!_alarmPlayed) { _alarmPlayed = true; SoundService.playAlarm(); _handleDone(); } }
      });
    });
  }

  void _onScratchComplete() {
    if (_isScratched) return;
    setState(() { _isScratched = true; _showConfetti = true; });
    SoundService.playScratch();
    _revealAnim.forward();
    _autoStartTimer = Timer(const Duration(seconds: 10), _startTimer);
  }

  Future<void> _handleDone() async {
    if (_isProcessingDone || !_isScratched || _currentTask == null) return;
    _isProcessingDone = true;
    setState(() => _isCompleted = true);
    _timer?.cancel();
    final auth = context.read<AuthProvider>();
    final game = context.read<GameProvider>();
    final cp = auth.coupleProfile!;
    final scratcherUid = game.currentTurn == 'A' ? cp.partnerAUid : (cp.partnerBUid ?? 'partner_b_pending_${cp.id}');
    final performerUid = game.currentTurn == 'A' ? (cp.partnerBUid ?? 'partner_b_pending_${cp.id}') : cp.partnerAUid;
    await ApiService.logScratch(userUid: scratcherUid, taskId: _currentTask!.id, taskType: 'image', completed: true, skipped: false, performerUid: performerUid);
    await ApiService.incrementCompleted(scratcherUid);
    game.switchTurn(); game.updateStreak();
    await _loadScratchCounts();
    await _loadNextTask();
  }

  String get _formattedTime => '${(_timeLeft ~/ 60).toString().padLeft(2, '0')}:${(_timeLeft % 60).toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final game = context.watch<GameProvider>();
    final isDark = context.watch<ThemeProvider>().isDark;
    final cp = auth.coupleProfile;
    final turnName = game.currentTurn == 'A' ? (cp?.partnerAName ?? 'A') : (cp?.partnerBName ?? 'B');
    final performingName = game.currentTurn == 'A' ? (cp?.partnerBName ?? 'B') : (cp?.partnerAName ?? 'A');
    final bgColors = isDark
        ? [const Color(0xFF3B0764), const Color(0xFF6B21A8), const Color(0xFFBE185D)]
        : [const Color(0xFFE879F9), const Color(0xFFF472B6), const Color(0xFFFB7185)];

    if (_isLoading && !_showPrevious) return GameLoadingScaffold(bgColors: bgColors);
    if (_noTasksRemaining) return GameEmptyState(bgColors: bgColors, onBack: () => Navigator.of(context).pop());

    return Scaffold(
      body: Stack(
        children: [
          Container(decoration: BoxDecoration(gradient: LinearGradient(colors: bgColors, begin: Alignment.topCenter, end: Alignment.bottomCenter))),
          AnimatedBuilder(animation: _bgAnim, builder: (_, __) => Stack(children: [
            Positioned(top: 80, left: -30, child: Transform.translate(offset: Offset(0, -20 * _bgAnim.value), child: Transform.rotate(angle: -0.26, child: const Icon(Icons.favorite, size: 130, color: Color(0x14FFFFFF))))),
            Positioned(top: 260, right: -20, child: Transform.translate(offset: Offset(0, 28 * _bgAnim.value), child: Transform.rotate(angle: 0.35, child: const Icon(Icons.favorite, size: 90, color: Color(0x0FFFFFFF))))),
          ])),
          if (_showConfetti) HeartConfetti(onComplete: () => setState(() => _showConfetti = false)),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
              child: Column(children: [
                Row(children: [
                  GameCircleBtn(icon: Icons.history, onTap: () => Navigator.of(context).pushNamed('/history')),
                  Expanded(child: Text('Hidden Moments', textAlign: TextAlign.center, style: GoogleFonts.nunito(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900))),
                  GameCircleBtn(icon: Icons.close, onTap: () => Navigator.of(context).pop()),
                ]),
                const SizedBox(height: 12),
                GameScoreCard(
                  partnerAName: cp?.partnerAName ?? 'A', partnerBName: cp?.partnerBName ?? 'B',
                  avatarA: cp?.partnerAAvatar, avatarB: cp?.partnerBAvatar,
                  countA: _scratchCountA, countB: _scratchCountB,
                  turnName: turnName, performingName: performingName, isDark: isDark,
                ),
                const SizedBox(height: 12),
                Expanded(child: Center(child: _currentTask != null ? _buildCard(isDark, turnName, performingName) : const SizedBox.shrink())),
                const SizedBox(height: 12),
                _buildButtons(isDark),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCard(bool isDark, String turnName, String performingName) {
    final task = _currentTask!;
    final imageUrl = '$kApiBaseUrl${task.imageSource}';
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Positioned(top: -16, left: 0, right: 0, child: Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
            decoration: BoxDecoration(
              color: isDark ? Colors.white.withOpacity(0.15) : Colors.white.withOpacity(0.6),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: isDark ? Colors.white24 : const Color(0x4D9333EA)),
            ),
            child: Text("$turnName's Turn", style: GoogleFonts.nunito(color: isDark ? Colors.white : const Color(0xFF6B21A8), fontWeight: FontWeight.w700, fontSize: 14)),
          ),
        )),
        AspectRatio(
          aspectRatio: 616 / 770,
          child: Container(
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(24), border: Border.all(color: Colors.white.withOpacity(0.25)), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8))]),
            clipBehavior: Clip.antiAlias,
            child: !_isScratched
                ? ScratchCard(
                    onScratchComplete: _onScratchComplete,
                    overlayImage: isDark ? const AssetImage('assets/images/overlay-dark.png') : const AssetImage('assets/images/overlay-light.png'),
                    child: Stack(fit: StackFit.expand, children: [
                      Image.network(imageUrl, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(color: const Color(0xFF9333EA), child: const Icon(Icons.image, color: Colors.white, size: 48))),
                      Positioned(bottom: 16, left: 0, right: 0, child: Center(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(color: isDark ? Colors.black.withOpacity(0.5) : Colors.white.withOpacity(0.7), borderRadius: BorderRadius.circular(20)),
                          child: Row(mainAxisSize: MainAxisSize.min, children: [
                            const Text('👆', style: TextStyle(fontSize: 14)),
                            const SizedBox(width: 6),
                            Text('Scratch to reveal!', style: GoogleFonts.nunito(color: isDark ? Colors.white : const Color(0xFF0F172A), fontWeight: FontWeight.w700, fontSize: 13)),
                          ]),
                        ),
                      )),
                    ]),
                  )
                : AnimatedBuilder(
                    animation: _revealAnim,
                    builder: (_, __) => Opacity(
                      opacity: _revealAnim.value,
                      child: Stack(fit: StackFit.expand, children: [
                        Image.network(imageUrl, fit: BoxFit.contain, errorBuilder: (_, __, ___) => Container(color: const Color(0xFF9333EA))),
                        Positioned(bottom: 0, left: 0, right: 0, child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: isDark ? Colors.black.withOpacity(0.75) : Colors.white.withOpacity(0.95),
                            border: Border(top: BorderSide(color: isDark ? Colors.white12 : const Color(0x339333EA))),
                          ),
                          child: Column(children: [
                            if (_timerStarted) ...[
                              AnimatedBuilder(animation: _pulseAnim, builder: (_, __) => Opacity(
                                opacity: _timeLeft <= 10 ? 0.3 + 0.7 * _pulseAnim.value : 1.0,
                                child: Text(_formattedTime, style: GoogleFonts.nunito(color: _timeLeft <= 10 ? Colors.red : (isDark ? Colors.white : const Color(0xFF4C1D95)), fontSize: 40, fontWeight: FontWeight.w900)),
                              )),
                              Text(_timerFinished ? '⏰ Time\'s up, $performingName!' : '$performingName must complete!', style: GoogleFonts.nunito(color: isDark ? Colors.white70 : Colors.black54, fontSize: 13, fontWeight: FontWeight.w700)),
                            ] else
                              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                                const Icon(Icons.timer_outlined, color: Color(0xFF10B981), size: 16),
                                const SizedBox(width: 6),
                                Text('Timer starts in 10s…', style: GoogleFonts.nunito(color: const Color(0xFF10B981), fontSize: 13, fontWeight: FontWeight.w700)),
                              ]),
                          ]),
                        )),
                      ]),
                    ),
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildButtons(bool isDark) {
    final canComplete = _isScratched && !_isCompleted && _currentTask != null;
    final canSkip = !_timerStarted && !_isCompleted && _currentTask != null;
    return Column(children: [
      Opacity(opacity: canComplete ? 1.0 : 0.35, child: GameBtn3D(label: 'Complete', colors: [const Color(0xFF9333EA), const Color(0xFFC026D3), const Color(0xFFDB2777)], shadowColor: const Color(0xFFE879F9), onTap: canComplete ? _handleDone : null)),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: Opacity(opacity: _previousTask != null && !_showPrevious ? 1.0 : 0.4, child: GameBtn3D(label: 'Previous', icon: Icons.arrow_back, colors: [const Color(0xFF3B82F6), const Color(0xFF2563EB)], shadowColor: const Color(0xFF93C5FD), onTap: _previousTask != null && !_showPrevious ? () => setState(() => _showPrevious = true) : null))),
        const SizedBox(width: 12),
        Expanded(child: Opacity(opacity: canSkip ? 1.0 : 0.4, child: GameBtn3D(label: 'Skip', iconRight: Icons.skip_next, colors: [const Color(0xFFFBBF24), const Color(0xFFF59E0B)], shadowColor: const Color(0xFFFDE68A), onTap: canSkip ? () async { await _loadScratchCounts(); await _loadNextTask(); } : null))),
      ]),
    ]);
  }
}
