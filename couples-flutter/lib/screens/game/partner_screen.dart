import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../providers/cycle_provider.dart';
import '../../providers/notification_provider.dart';
import '../../lib/cycle_calculations.dart';
import '../../services/api_service.dart';
import 'cycle_calendar_screen.dart';
import '../../models/couple_profile.dart';

class PartnerScreen extends StatefulWidget {
  final bool isTab;
  const PartnerScreen({super.key, this.isTab = false});

  @override
  State<PartnerScreen> createState() => _PartnerScreenState();
}

class _PartnerScreenState extends State<PartnerScreen> {
  final _inviteCtrl = TextEditingController();
  bool _isJoining = false;
  String? _joinError;

  // Cycle tracking settings form state
  String? _lastPeriodStart;
  String? _lastPeriodEnd;
  int _averageCycleLength = 28;
  bool _isModalOpen = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _init());
  }

  @override
  void dispose() {
    _inviteCtrl.dispose();
    super.dispose();
  }

  Future<void> _init() async {
    final auth = context.read<AuthProvider>();
    final cycle = context.read<CycleProvider>();
    final identifier = auth.coupleProfile?.id?.toString() ?? auth.uid;
    if (identifier != null) {
      await cycle.fetchCycleConfig(identifier, auth.sessionToken ?? '');
      final config = cycle.cycleConfig;
      if (config != null) {
        setState(() {
          _lastPeriodStart = config.lastPeriodStart;
          _lastPeriodEnd = config.lastPeriodEnd;
          _averageCycleLength = config.averageCycleLength;
        });
      }
    }
  }

  Future<void> _joinPartner() async {
    if (_inviteCtrl.text.trim().length < 4) {
      setState(() => _joinError = 'Please enter a valid invite code');
      return;
    }
    setState(() { _isJoining = true; _joinError = null; });
    final auth = context.read<AuthProvider>();
    final result = await ApiService.joinCouple(
      uid: auth.uid!,
      inviteCode: _inviteCtrl.text.trim().toUpperCase(),
      sessionToken: auth.sessionToken ?? '',
    );
    if (!mounted) return;
    if (result != null && result['error'] == null) {
      final cp = await ApiService.fetchCoupleProfile(auth.uid!);
      if (cp != null && mounted) {
        await auth.setCoupleProfile(CoupleProfile.fromJson(cp));
        await auth.setIsPartnerA(cp['partnerAUid'] == auth.uid);
      }
      setState(() => _joinError = null);
      _init();
    } else {
      setState(() => _joinError = result?['error'] ?? 'Invalid invite code');
    }
    setState(() => _isJoining = false);
  }

  Future<void> _saveCycleConfig() async {
    if (_lastPeriodStart == null || _lastPeriodStart!.isEmpty) return;
    final auth = context.read<AuthProvider>();
    final cycle = context.read<CycleProvider>();
    final identifier = auth.coupleProfile?.id?.toString() ?? auth.uid;
    if (identifier != null) {
      await cycle.updateCycleConfig(
        identifier,
        {
          'lastPeriodStart': _lastPeriodStart,
          'lastPeriodEnd': _lastPeriodEnd,
          'averageCycleLength': _averageCycleLength,
        },
        auth.sessionToken ?? '',
      );
      setState(() => _isModalOpen = false);
    }
  }

  String _formatDateShort(DateTime? d) {
    if (d == null) return "N/A";
    return DateFormat('MMM d').format(d);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final cycle = context.watch<CycleProvider>();
    final notif = context.watch<NotificationProvider>();
    final isDark = context.watch<ThemeProvider>().isDark;

    final cp = auth.coupleProfile;
    final isPartnerA = auth.isPartnerA;
    final myGender = isPartnerA ? cp?.partnerAGender : cp?.partnerBGender;
    final partnerGender = isPartnerA ? cp?.partnerBGender : cp?.partnerAGender;
    final partnerName = isPartnerA ? (cp?.partnerBName ?? 'Partner') : (cp?.partnerAName ?? 'Partner');

    final isMeFemale = myGender?.toLowerCase() == 'female';
    final isSingleMale = cp?.status == 'pending' && !isMeFemale;

    final bgColors = isDark
        ? [const Color(0xFF150025), const Color(0xFF3B0764), const Color(0xFF4C1D95)]
        : [const Color(0xFFFDF2F8), const Color(0xFFFCE7F3), const Color(0xFFF5D0FE)];

    if (isSingleMale) {
      return _buildInviteView(isDark, bgColors, auth);
    }

    // Predictions
    final predictions = calculateCyclePredictions(_lastPeriodStart, _averageCycleLength);

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: bgColors, begin: Alignment.topCenter, end: Alignment.bottomCenter),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(22, 16, 22, 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        if (!widget.isTab) ...[
                          GestureDetector(
                            onTap: () => Navigator.of(context).pop(),
                            child: Container(
                              width: 44, height: 44,
                              decoration: BoxDecoration(
                                color: isDark ? Colors.white.withOpacity(0.12) : Colors.white,
                                borderRadius: BorderRadius.circular(22),
                                border: Border.all(color: isDark ? Colors.white12 : Colors.black.withOpacity(0.08)),
                              ),
                              child: Icon(Icons.arrow_back, color: isDark ? Colors.white : const Color(0xFF0F172A)),
                            ),
                          ),
                          const SizedBox(width: 16),
                        ],
                        Text(
                          'Cycle & Partner',
                          style: GoogleFonts.dynaPuff(fontSize: 22, fontWeight: FontWeight.w900, color: isDark ? Colors.white : const Color(0xFF0F172A)),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: Icon(Icons.notifications_none, color: isDark ? Colors.white : const Color(0xFF0F172A)),
                      onPressed: () => Navigator.of(context).pushNamed('/notifications'),
                    ),
                  ],
                ),
              ),

              // Main body
              Expanded(
                child: ListView(
                  padding: EdgeInsets.fromLTRB(22, 0, 22, widget.isTab ? 110 : 20),
                  children: [
                    // Hero period countdown
                    const SizedBox(height: 12),
                    Center(
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.water_drop, color: Colors.redAccent, size: 20),
                              const SizedBox(width: 6),
                              Text('Period Tracker', style: GoogleFonts.nunito(color: isDark ? Colors.white70 : Colors.black54, fontSize: 16, fontWeight: FontWeight.w700)),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            predictions != null ? '${predictions.daysUntilNextPeriod} Days Left' : 'Configure Cycle',
                            style: GoogleFonts.nunito(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 32, fontWeight: FontWeight.w900),
                          ),
                          Text(
                            predictions != null ? 'Next period starts: ${_formatDateShort(predictions.nextPeriodDate)}' : 'Tap below to enter dates',
                            style: GoogleFonts.nunito(color: isDark ? Colors.white54 : Colors.black45, fontSize: 15, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 16),
                          GestureDetector(
                            onTap: () => setState(() => _isModalOpen = true),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(colors: [Color(0xFF9333EA), Color(0xFFDB2777)]),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                _lastPeriodStart != null ? 'Update Period Dates' : 'Configure Settings',
                                style: GoogleFonts.nunito(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Insight Cards safe sex / ovulation / fertility window
                    GestureDetector(
                      onTap: () {
                        if (_lastPeriodStart != null) {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => CycleCalendarScreen(
                                lastPeriodStart: _lastPeriodStart,
                                averageCycleLength: _averageCycleLength,
                                averagePeriodLength: 5,
                              ),
                            ),
                          );
                        }
                      },
                      child: Column(
                        children: [
                          Row(
                            children: [
                              // Ovulation Day
                              Expanded(
                                child: _InsightCard(
                                  icon: Icons.local_florist,
                                  iconColor: const Color(0xFF9333EA),
                                  title: 'Ovulation',
                                  value: predictions != null ? _formatDateShort(predictions.nextOvulationDate) : 'N/A',
                                  subtitle: 'High Pregnancy Risk',
                                  isDark: isDark,
                                ),
                              ),
                              const SizedBox(width: 12),
                              // Safe Sex
                              Expanded(
                                child: _InsightCard(
                                  icon: Icons.shield,
                                  iconColor: predictions?.safeSex == true ? Colors.green : Colors.grey,
                                  title: 'Safe Sex',
                                  value: predictions != null ? (predictions.safeSex ? 'Yes' : 'No') : 'N/A',
                                  subtitle: 'Based on Cycle',
                                  isDark: isDark,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          // Fertility Window
                          _FullInsightCard(
                            icon: Icons.favorite,
                            iconColor: const Color(0xFFDB2777),
                            title: 'Fertility Window',
                            value: predictions != null
                                ? '${_formatDateShort(predictions.fertileWindowStart)} - ${_formatDateShort(predictions.fertileWindowEnd)}'
                                : 'N/A',
                            isDark: isDark,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Moods & Desires
                    _CardWrapper(
                      isDark: isDark,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 36, height: 36,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFDB2777).withOpacity(0.15),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.favorite, color: Color(0xFFDB2777), size: 18),
                              ),
                              const SizedBox(width: 12),
                              Text(
                                'Phase: ${predictions?.currentPhase ?? "Unconfigured"}',
                                style: GoogleFonts.nunito(fontSize: 18, fontWeight: FontWeight.w800, color: isDark ? Colors.white : const Color(0xFF0F172A)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Text(
                            isMeFemale ? 'Your Current Mood' : "Partner's Current Mood",
                            style: GoogleFonts.nunito(color: isDark ? Colors.white38 : Colors.black38, fontSize: 13, fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            predictions?.partnerMood ?? 'Configure cycle predictions to view moods.',
                            style: GoogleFonts.nunito(fontSize: 15, fontWeight: FontWeight.w600, color: isDark ? Colors.white70 : Colors.black87),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            isMeFemale ? 'What You Might Want' : 'What She Might Want',
                            style: GoogleFonts.nunito(color: isDark ? Colors.white38 : Colors.black38, fontSize: 13, fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            predictions?.partnerDesires ?? 'Configure cycle predictions to view desires.',
                            style: GoogleFonts.nunito(fontSize: 15, fontWeight: FontWeight.w600, color: isDark ? Colors.white70 : Colors.black87),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: _isModalOpen ? _buildSettingsModal(isDark) : null,
    );
  }

  Widget _buildInviteView(bool isDark, List<Color> bgColors, AuthProvider auth) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(gradient: LinearGradient(colors: bgColors, begin: Alignment.topCenter, end: Alignment.bottomCenter)),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 80, height: 80,
                    decoration: BoxDecoration(
                      color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.04),
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFFDB2777), width: 2),
                    ),
                    child: const Icon(Icons.favorite_border, size: 40, color: Color(0xFFDB2777)),
                  ),
                  const SizedBox(height: 24),
                  Text('Invite Your Partner', style: GoogleFonts.nunito(fontSize: 24, fontWeight: FontWeight.w900, color: isDark ? Colors.white : const Color(0xFF0F172A))),
                  const SizedBox(height: 8),
                  Text('Connect with your partner to start tracking her period cycle together and sharing moods and desires.', textAlign: TextAlign.center, style: GoogleFonts.nunito(color: isDark ? Colors.white60 : Colors.black45, fontSize: 14)),
                  const SizedBox(height: 32),
                  if (auth.coupleProfile?.inviteCode != null) ...[
                    GestureDetector(
                      onTap: () {
                        Clipboard.setData(ClipboardData(text: auth.coupleProfile!.inviteCode!));
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Invite code copied!')));
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.white.withOpacity(0.05) : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFDB2777).withOpacity(0.5)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(auth.coupleProfile!.inviteCode!, style: GoogleFonts.nunito(color: const Color(0xFFDB2777), fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: 4)),
                            const SizedBox(width: 12),
                            const Icon(Icons.copy, color: Color(0xFFDB2777)),
                          ],
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  Text('Or enter partner\'s code:', style: GoogleFonts.nunito(color: isDark ? Colors.white60 : Colors.black54, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _inviteCtrl,
                    textAlign: TextAlign.center,
                    textCapitalization: TextCapitalization.characters,
                    style: GoogleFonts.nunito(color: isDark ? Colors.white : const Color(0xFF0F172A), fontWeight: FontWeight.w700),
                    decoration: InputDecoration(
                      hintText: 'e.g. A1B2C3',
                      filled: true,
                      fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.white,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                  if (_joinError != null) ...[
                    const SizedBox(height: 8),
                    Text(_joinError!, style: const TextStyle(color: Colors.red)),
                  ],
                  const SizedBox(height: 12),
                  GestureDetector(
                    onTap: _isJoining ? null : _joinPartner,
                    child: Container(
                      width: double.infinity,
                      height: 52,
                      decoration: BoxDecoration(color: const Color(0xFF10B981), borderRadius: BorderRadius.circular(14)),
                      child: Center(
                        child: _isJoining
                            ? const CircularProgressIndicator(color: Colors.white)
                            : Text('Connect Partner', style: GoogleFonts.nunito(color: Colors.white, fontWeight: FontWeight.w800)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSettingsModal(bool isDark) {
    return Container(
      color: Colors.black54,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E0035) : Colors.white,
          borderRadius: const BorderRadius.only(topLeft: Radius.circular(32), topRight: Radius.circular(32)),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Cycle Settings', style: GoogleFonts.nunito(fontSize: 22, fontWeight: FontWeight.w900, color: isDark ? Colors.white : const Color(0xFF0F172A))),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => setState(() => _isModalOpen = false),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text('Last Period Start Date (YYYY-MM-DD)', style: GoogleFonts.nunito(color: isDark ? Colors.white70 : Colors.black54, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              TextField(
                controller: TextEditingController(text: _lastPeriodStart),
                onChanged: (val) => _lastPeriodStart = val,
                decoration: InputDecoration(
                  hintText: 'e.g. 2026-06-25',
                  filled: true,
                  fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.04),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
              const SizedBox(height: 16),
              Text('Average Cycle Length (Days)', style: GoogleFonts.nunito(color: isDark ? Colors.white70 : Colors.black54, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [24, 26, 28, 30, 32].map((len) {
                  final isSelected = len == _averageCycleLength;
                  return GestureDetector(
                    onTap: () => setState(() => _averageCycleLength = len),
                    child: Container(
                      width: 50, height: 50,
                      decoration: BoxDecoration(
                        gradient: isSelected ? const LinearGradient(colors: [Color(0xFF9333EA), Color(0xFFDB2777)]) : null,
                        color: isSelected ? null : (isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.05)),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text('$len', style: GoogleFonts.nunito(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 32),
              GestureDetector(
                onTap: _saveCycleConfig,
                child: Container(
                  width: double.infinity,
                  height: 52,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [Color(0xFF9333EA), Color(0xFFDB2777)]),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Center(
                    child: Text('Done', style: GoogleFonts.nunito(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 17)),
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

class _InsightCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title, value, subtitle;
  final bool isDark;

  const _InsightCard({required this.icon, required this.iconColor, required this.title, required this.value, required this.subtitle, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withOpacity(0.05) : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: iconColor, size: 18),
          ),
          const SizedBox(height: 16),
          Text(title, style: GoogleFonts.nunito(color: isDark ? Colors.white60 : Colors.black45, fontSize: 13, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(value, style: GoogleFonts.nunito(fontSize: 22, fontWeight: FontWeight.w900, color: isDark ? Colors.white : const Color(0xFF0F172A))),
          const SizedBox(height: 4),
          Text(subtitle, style: GoogleFonts.nunito(color: Colors.redAccent, fontSize: 11, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _FullInsightCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title, value;
  final bool isDark;

  const _FullInsightCard({required this.icon, required this.iconColor, required this.title, required this.value, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withOpacity(0.05) : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.08)),
      ),
      child: Row(
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: iconColor, size: 18),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.nunito(color: isDark ? Colors.white60 : Colors.black45, fontSize: 13, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(value, style: GoogleFonts.nunito(fontSize: 18, fontWeight: FontWeight.w900, color: isDark ? Colors.white : const Color(0xFF0F172A))),
              ],
            ),
          ),
          Icon(Icons.chevron_right, color: isDark ? Colors.white38 : Colors.black26),
        ],
      ),
    );
  }
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
        color: isDark ? Colors.white.withOpacity(0.05) : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.08)),
      ),
      child: child,
    );
  }
}
