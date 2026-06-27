import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../services/api_service.dart';
import '../../models/models.dart';
import 'package:intl/intl.dart';

// ─── History Screen ──────────────────────────────────────────────────────────

class HistoryScreen extends StatefulWidget {
  final bool isTab;
  const HistoryScreen({super.key, this.isTab = false});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<HistoryEntry> _history = [];
  bool _loading = true;
  String _selectedFilter = 'all';

  final List<String> _filters = [
    'all',
    'romantic',
    'fun',
    'playful',
    'dare',
    'intimate',
    'lottery',
    'spin_wheel'
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final auth = context.read<AuthProvider>();
    final cp = auth.coupleProfile;
    if (cp == null) {
      setState(() => _loading = false);
      return;
    }
    try {
      final histA = await ApiService.fetchHistory(cp.partnerAUid);
      final histB = cp.partnerBUid != null
          ? await ApiService.fetchHistory(cp.partnerBUid!)
          : <dynamic>[];
      final all = [...histA, ...histB];
      all.sort((a, b) => DateTime.parse(b['scratchedAt'].toString())
          .compareTo(DateTime.parse(a['scratchedAt'].toString())));
      if (mounted) {
        setState(() {
          _history = all.map((j) => HistoryEntry.fromJson(j)).toList();
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showDetailModal(HistoryEntry entry) {
    showDialog(
      context: context,
      builder: (context) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        final dateStr = DateFormat('MMM d, yyyy · h:mm a').format(entry.scratchedAt.toLocal());
        
        String title = '';
        if (entry.taskType == 'text') title = 'Love Mission';
        else if (entry.taskType == 'image') title = 'Hidden Moment';
        else if (entry.taskType == 'spin_wheel') title = 'Fate Wheel Roll';
        else if (entry.taskType == 'lottery') title = 'Heart Draw Roll';

        return Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          backgroundColor: isDark ? const Color(0xFF1E0035) : Colors.white,
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('🎮', style: const TextStyle(fontSize: 48)),
                const SizedBox(height: 16),
                Text(
                  title,
                  style: GoogleFonts.dynaPuff(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Task ID: ${entry.taskId}',
                  style: GoogleFonts.nunito(
                    fontSize: 14,
                    color: isDark ? Colors.white70 : Colors.black54,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Date: $dateStr',
                  style: GoogleFonts.nunito(
                    fontSize: 13,
                    color: isDark ? Colors.white38 : Colors.black38,
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: entry.completed ? const Color(0xFF10B981).withOpacity(0.15) : Colors.orange.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    entry.completed ? 'Completed ✓' : 'Skipped / Incomplete',
                    style: GoogleFonts.nunito(
                      color: entry.completed ? const Color(0xFF10B981) : Colors.orange,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFDB2777),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  ),
                  child: Text('Close', style: GoogleFonts.nunito(fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;
    final bgColors = isDark
        ? [const Color(0xFF150025), const Color(0xFF3B0764), const Color(0xFF4C1D95)]
        : [const Color(0xFFFDF2F8), const Color(0xFFFCE7F3), const Color(0xFFF5D0FE)];

    // Filter items based on selection
    final filteredHistory = _history.where((item) {
      if (_selectedFilter == 'all') return true;
      if (_selectedFilter == 'lottery' || _selectedFilter == 'spin_wheel') {
        return item.taskType == _selectedFilter;
      }
      return item.category?.toLowerCase() == _selectedFilter;
    }).toList();

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
            gradient: LinearGradient(
                colors: bgColors,
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter)),
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              // Header Row
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                child: Row(
                  children: [
                    if (!widget.isTab) ...[
                      GestureDetector(
                        onTap: () => Navigator.of(context).pop(),
                        child: Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                            color: isDark
                                ? Colors.white.withOpacity(0.12)
                                : Colors.white,
                            borderRadius: BorderRadius.circular(21),
                            border: Border.all(
                                color: isDark
                                    ? Colors.white12
                                    : Colors.black.withOpacity(0.08)),
                          ),
                          child: Icon(Icons.arrow_back_ios_new,
                              color: isDark
                                  ? Colors.white
                                  : const Color(0xFF0F172A),
                              size: 20),
                        ),
                      ),
                      const SizedBox(width: 16),
                    ],
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Our History',
                            style: GoogleFonts.dynaPuff(
                              fontSize: 24,
                              fontWeight: FontWeight.w900,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                          Text(
                            'Your past moments',
                            style: GoogleFonts.nunito(
                              fontSize: 13,
                              color: isDark ? Colors.white60 : Colors.black45,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Horizontal Filter Chips
              Container(
                height: 46,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: _filters.length,
                  itemBuilder: (context, idx) {
                    final f = _filters[idx];
                    final isActive = _selectedFilter == f;
                    final label = f == 'all'
                        ? 'All'
                        : f == 'lottery'
                            ? 'Heart Draw'
                            : f == 'spin_wheel'
                                ? 'Fate Wheel'
                                : f[0].toUpperCase() + f.substring(1);

                    return GestureDetector(
                      onTap: () => setState(() => _selectedFilter = f),
                      child: Container(
                        margin: const EdgeInsets.only(right: 8),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 18, vertical: 10),
                        decoration: BoxDecoration(
                          gradient: isActive
                              ? const LinearGradient(
                                  colors: [Color(0xFF9333EA), Color(0xFFDB2777)])
                              : null,
                          color: isActive
                              ? null
                              : (isDark
                                  ? Colors.white.withOpacity(0.08)
                                  : Colors.white.withOpacity(0.7)),
                          borderRadius: BorderRadius.circular(32),
                          border: Border.all(
                            color: isActive
                                ? Colors.transparent
                                : (isDark ? Colors.white12 : Colors.black12),
                          ),
                        ),
                        child: Center(
                          child: Text(
                            label,
                            style: GoogleFonts.nunito(
                              color: isActive
                                  ? Colors.white
                                  : (isDark ? Colors.white70 : Colors.black54),
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),

              // Main List
              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : filteredHistory.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Text('🎮', style: TextStyle(fontSize: 48)),
                                const SizedBox(height: 12),
                                Text('No history yet',
                                    style: GoogleFonts.nunito(
                                        color: isDark
                                            ? Colors.white60
                                            : Colors.black45,
                                        fontSize: 16)),
                                Text('Start playing to see your history!',
                                    style: GoogleFonts.nunito(
                                        color: isDark
                                            ? Colors.white38
                                            : Colors.black26,
                                        fontSize: 13)),
                              ],
                            ),
                          )
                        : ListView.builder(
                            padding: EdgeInsets.fromLTRB(
                                20, 0, 20, widget.isTab ? 110 : 20),
                            itemCount: filteredHistory.length,
                            itemBuilder: (_, i) => GestureDetector(
                              onTap: () => _showDetailModal(filteredHistory[i]),
                              child: _HistoryItem(
                                  entry: filteredHistory[i], isDark: isDark),
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

class _HistoryItem extends StatelessWidget {
  final HistoryEntry entry;
  final bool isDark;

  const _HistoryItem({required this.entry, required this.isDark});

  String get _typeEmoji {
    switch (entry.taskType) {
      case 'image':
        return '🖼️';
      case 'text':
        return '💌';
      case 'spin_wheel':
        return '🎡';
      case 'lottery':
        return '🎰';
      default:
        return '🎮';
    }
  }

  String get _typeName {
    switch (entry.taskType) {
      case 'image':
        return 'Hidden Moments';
      case 'text':
        return 'Love Missions';
      case 'spin_wheel':
        return 'Fate Wheel';
      case 'lottery':
        return 'Heart Draw';
      default:
        return 'Game';
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateStr = DateFormat('MMM d, yyyy · h:mm a').format(entry.scratchedAt.toLocal());
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withOpacity(0.07) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
            color: isDark ? Colors.white10 : Colors.black.withOpacity(0.08)),
      ),
      child: Row(
        children: [
          Text(_typeEmoji, style: const TextStyle(fontSize: 28)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_typeName,
                      style: GoogleFonts.nunito(
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                          fontWeight: FontWeight.w800,
                          fontSize: 14)),
                  Text(dateStr,
                      style: GoogleFonts.nunito(
                          color: isDark ? Colors.white38 : Colors.black38,
                          fontSize: 12)),
                ]),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: entry.completed
                  ? const Color(0xFF10B981).withOpacity(0.15)
                  : Colors.orange.withOpacity(0.15),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(entry.completed ? 'Done ✓' : 'Skipped',
                style: GoogleFonts.nunito(
                    color: entry.completed
                        ? const Color(0xFF10B981)
                        : Colors.orange,
                    fontSize: 11,
                    fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}

// ─── Profile Screen ──────────────────────────────────────────────────────────

class ProfileScreen extends StatelessWidget {
  final bool isTab;
  const ProfileScreen({super.key, this.isTab = false});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isDark = context.watch<ThemeProvider>().isDark;
    final cp = auth.coupleProfile;
    final myName = auth.isPartnerA ? cp?.partnerAName : cp?.partnerBName;
    final myAge = auth.isPartnerA ? cp?.partnerAAge : cp?.partnerBAge;
    final myGender = auth.isPartnerA ? cp?.partnerAGender : cp?.partnerBGender;
    final myAvatar = auth.isPartnerA ? cp?.partnerAAvatar : cp?.partnerBAvatar;

    final bgColors = isDark
        ? [const Color(0xFF150025), const Color(0xFF3B0764), const Color(0xFF4C1D95)]
        : [const Color(0xFFFDF2F8), const Color(0xFFFCE7F3), const Color(0xFFF5D0FE)];

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
            gradient: LinearGradient(
                colors: bgColors,
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter)),
        child: SafeArea(
          bottom: false,
          child: SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(24, 24, 24, isTab ? 110 : 24),
            child: Column(
              children: [
                Row(
                  children: [
                    if (!isTab) ...[
                      GestureDetector(
                        onTap: () => Navigator.of(context).pop(),
                        child: Container(
                            width: 42,
                            height: 42,
                            decoration: BoxDecoration(
                                color: isDark
                                    ? Colors.white.withOpacity(0.12)
                                    : Colors.white,
                                borderRadius: BorderRadius.circular(21)),
                            child: Icon(Icons.arrow_back_ios_new,
                                color: isDark
                                    ? Colors.white
                                    : const Color(0xFF0F172A),
                                size: 20)),
                      ),
                      const SizedBox(width: 16),
                    ],
                    Text('My Profile',
                        style: GoogleFonts.dynaPuff(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            color: isDark ? Colors.white : const Color(0xFF0F172A))),
                  ],
                ),
                const SizedBox(height: 40),
                // Avatar
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                        colors: [Color(0xFF9333EA), Color(0xFFDB2777)]),
                    borderRadius: BorderRadius.circular(50),
                    boxShadow: [
                      BoxShadow(
                          color: const Color(0xFFDB2777).withOpacity(0.4),
                          blurRadius: 20,
                          offset: const Offset(0, 8))
                    ],
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: myAvatar != null && myAvatar.isNotEmpty
                      ? Image.network(myAvatar,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _avatarIcon(myGender))
                      : _avatarIcon(myGender),
                ),
                const SizedBox(height: 20),
                Text(myName ?? 'Loading...',
                    style: GoogleFonts.dynaPuff(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: isDark ? Colors.white : const Color(0xFF0F172A))),
                Text(myGender ?? 'Gender',
                    style: GoogleFonts.nunito(
                        fontSize: 14,
                        color: isDark ? Colors.white38 : Colors.black38,
                        fontWeight: FontWeight.w700)),
                const SizedBox(height: 32),
                _InfoCard(
                    label: 'Age',
                    value: myAge != null ? '$myAge yrs' : 'N/A',
                    icon: Icons.cake,
                    isDark: isDark),
                const SizedBox(height: 12),
                _InfoCard(
                    label: 'Likes/Interests',
                    value: (auth.isPartnerA ? cp?.whatALikes : cp?.whatBLikes) ??
                        'None specified',
                    icon: Icons.favorite,
                    isDark: isDark),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: () =>
                      Navigator.of(context).pushNamed('/edit-profile'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFDB2777),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(32)),
                    minimumSize: const Size(double.infinity, 54),
                    elevation: 5,
                  ),
                  child: Text('Edit Profile Details',
                      style: GoogleFonts.nunito(
                          fontSize: 16, fontWeight: FontWeight.w800)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _avatarIcon(String? gender) => Icon(
        gender?.toLowerCase() == 'female' ? Icons.face_3 : Icons.face,
        color: Colors.white,
        size: 52,
      );
}

class _InfoCard extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final bool isDark;

  const _InfoCard(
      {required this.label,
      required this.value,
      required this.icon,
      required this.isDark});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? Colors.white.withOpacity(0.07) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
              color: isDark ? Colors.white10 : Colors.black.withOpacity(0.08)),
        ),
        child: Row(children: [
          Icon(icon, color: const Color(0xFF9333EA), size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: GoogleFonts.nunito(
                          color: isDark ? Colors.white38 : Colors.black38,
                          fontSize: 12,
                          fontWeight: FontWeight.w700)),
                  Text(value,
                      style: GoogleFonts.nunito(
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                          fontSize: 16,
                          fontWeight: FontWeight.w700)),
                ]),
          ),
        ]),
      );
}

// ─── Settings Screen ─────────────────────────────────────────────────────────

class SettingsScreen extends StatelessWidget {
  final bool isTab;
  const SettingsScreen({super.key, this.isTab = false});

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;
    final themeProvider = context.read<ThemeProvider>();
    final auth = context.read<AuthProvider>();

    final bgColors = isDark
        ? [const Color(0xFF150025), const Color(0xFF3B0764), const Color(0xFF4C1D95)]
        : [const Color(0xFFFDF2F8), const Color(0xFFFCE7F3), const Color(0xFFF5D0FE)];

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
            gradient: LinearGradient(
                colors: bgColors,
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter)),
        child: SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  if (!isTab) ...[
                    GestureDetector(
                      onTap: () => Navigator.of(context).pop(),
                      child: Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                              color: isDark
                                  ? Colors.white.withOpacity(0.12)
                                  : Colors.white,
                              borderRadius: BorderRadius.circular(21)),
                          child: Icon(Icons.arrow_back_ios_new,
                              color: isDark
                                  ? Colors.white
                                  : const Color(0xFF0F172A),
                              size: 20)),
                    ),
                    const SizedBox(width: 16),
                  ],
                  Text('Settings',
                      style: GoogleFonts.dynaPuff(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF0F172A))),
                ]),
                const SizedBox(height: 32),
                _SettingRow(
                  icon: Icons.dark_mode_outlined,
                  label: 'Dark Mode',
                  subtitle: 'Enable dark background theme',
                  trailing: Switch(
                    value: isDark,
                    onChanged: (val) => themeProvider.toggle(),
                    activeColor: const Color(0xFFDB2777),
                  ),
                  isDark: isDark,
                ),
                const SizedBox(height: 12),
                _SettingRow(
                  icon: Icons.logout_rounded,
                  label: 'Logout',
                  subtitle: 'Sign out of your account',
                  onTap: () async {
                    await auth.logout();
                    if (context.mounted) {
                      Navigator.of(context)
                          .pushNamedAndRemoveUntil('/login', (route) => false);
                    }
                  },
                  isDark: isDark,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SettingRow extends StatelessWidget {
  final IconData icon;
  final String label, subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;
  final bool isDark;

  const _SettingRow(
      {required this.icon,
      required this.label,
      required this.subtitle,
      this.trailing,
      this.onTap,
      required this.isDark});

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? Colors.white.withOpacity(0.07) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
                color:
                    isDark ? Colors.white10 : Colors.black.withOpacity(0.08)),
          ),
          child: Row(children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                    colors: [Color(0xFF9333EA), Color(0xFFDB2777)]),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label,
                        style: GoogleFonts.nunito(
                            color: isDark ? Colors.white : const Color(0xFF0F172A),
                            fontWeight: FontWeight.w700,
                            fontSize: 15)),
                    Text(subtitle,
                        style: GoogleFonts.nunito(
                            color: isDark ? Colors.white38 : Colors.black38,
                            fontSize: 12)),
                  ]),
            ),
            trailing ??
                (onTap != null
                    ? Icon(Icons.chevron_right,
                        color: isDark ? Colors.white38 : Colors.black26)
                    : const SizedBox.shrink()),
          ]),
        ),
      );
}
