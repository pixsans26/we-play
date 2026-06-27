import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../services/api_service.dart';
import '../../services/sound_service.dart';
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
        child: Stack(
          children: [
            // ── Scrollable list content (scrolls under header) ──
            Positioned.fill(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : filteredHistory.isEmpty
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.only(top: 100),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Text('🎮', style: TextStyle(fontSize: 48)),
                                const SizedBox(height: 12),
                                Text('No history yet',
                                    style: GoogleFonts.nunito(
                                        color: isDark ? Colors.white60 : Colors.black45,
                                        fontSize: 16)),
                                Text('Start playing to see your history!',
                                    style: GoogleFonts.nunito(
                                        color: isDark ? Colors.white38 : Colors.black26,
                                        fontSize: 13)),
                              ],
                            ),
                          ),
                        )
                      : ListView.builder(
                          padding: EdgeInsets.fromLTRB(20, 190, 20, widget.isTab ? 110 : 20),
                          itemCount: filteredHistory.length,
                          itemBuilder: (_, i) => GestureDetector(
                            onTap: () => _showDetailModal(filteredHistory[i]),
                            child: _HistoryItem(entry: filteredHistory[i], isDark: isDark),
                          ),
                        ),
            ),

            // ── Absolute Positioned Glassmorphic Header & Chips ──
            Positioned(
              top: 0, left: 0, right: 0,
              child: ClipRect(
                child: BackdropFilter(
                  filter: ui.ImageFilter.blur(sigmaX: 15, sigmaY: 15),
                  child: Container(
                    padding: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xCC150025) : const Color(0xCCFDF2F8),
                      border: Border(
                        bottom: BorderSide(
                          color: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.03),
                        ),
                      ),
                    ),
                    child: SafeArea(
                      bottom: false,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Title Bar
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
                                        color: isDark ? Colors.white.withOpacity(0.12) : Colors.white,
                                        borderRadius: BorderRadius.circular(21),
                                        border: Border.all(
                                            color: isDark ? Colors.white12 : Colors.black.withOpacity(0.08)),
                                      ),
                                      child: Icon(Icons.arrow_back_ios_new,
                                          color: isDark ? Colors.white : const Color(0xFF0F172A),
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
                                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
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
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
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

class ProfileScreen extends StatefulWidget {
  final bool isTab;
  const ProfileScreen({super.key, this.isTab = false});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  int _moments = 0;
  int _missions = 0;
  int _spins = 0;
  int _draws = 0;
  int _level = 1;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
  }

  Future<void> _loadData() async {
    final auth = context.read<AuthProvider>();
    final cp = auth.coupleProfile;
    if (cp == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      if (auth.uid != null) {
        final freshData = await ApiService.fetchCoupleProfile(auth.uid!);
        if (freshData != null) {
          final updatedCp = CoupleProfile.fromJson(freshData);
          await auth.setCoupleProfile(updatedCp);
        }
      }
      
      final currentCp = context.read<AuthProvider>().coupleProfile;
      if (currentCp == null) {
        if (mounted) setState(() => _loading = false);
        return;
      }
      
      final uid = auth.isPartnerA ? currentCp.partnerAUid : (currentCp.partnerBUid ?? currentCp.partnerAUid);
      final data = await ApiService.fetchProgress(uid);
      if (data != null && mounted) {
        _level = data['currentLevel'] ?? 1;
      }
      
      final histA = await ApiService.fetchHistory(currentCp.partnerAUid);
      final histB = currentCp.partnerBUid != null ? await ApiService.fetchHistory(currentCp.partnerBUid!) : <dynamic>[];
      final all = [...histA, ...histB];
      
      int moments = 0, missions = 0, spins = 0, draws = 0;
      for (var j in all) {
        final t = HistoryEntry.fromJson(j);
        if (!t.completed) continue;
        if (t.taskType == 'image') moments++;
        else if (t.taskType == 'text') missions++;
        else if (t.taskType == 'spin_wheel') spins++;
        else if (t.taskType == 'lottery') draws++;
      }
      if (mounted) {
        setState(() {
          _moments = moments;
          _missions = missions;
          _spins = spins;
          _draws = draws;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _buildStatCard(String title, int count, IconData icon, Color iconColor, bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withOpacity(0.07) : Colors.white.withOpacity(0.9),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: iconColor, size: 28),
          const SizedBox(height: 8),
          Text(
            count.toString(),
            style: GoogleFonts.dynaPuff(
              fontSize: 24,
              fontWeight: FontWeight.w900,
              color: isDark ? Colors.white : const Color(0xFF0F172A),
            ),
          ),
          Text(
            title,
            style: GoogleFonts.nunito(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: isDark ? Colors.white70 : const Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileCard(String name, String? age, String? gender, String? avatarUrl, bool isMe, bool isDark, Color fallbackColor) {
    final displayAge = age != null ? 'Age $age' : 'Age 27'; // Fallback to 27 if missing to match mock
    final displayGender = gender != null && gender.isNotEmpty ? '${gender[0].toUpperCase()}${gender.substring(1)}' : 'Unknown';
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withOpacity(0.07) : Colors.white.withOpacity(0.9),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: fallbackColor,
              shape: BoxShape.circle,
            ),
            clipBehavior: Clip.antiAlias,
            child: avatarUrl != null && avatarUrl.isNotEmpty
                ? Image.network(ApiService.getImageUrl(avatarUrl)!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _avatarIcon(gender))
                : _avatarIcon(gender),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: GoogleFonts.dynaPuff(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
                Text(
                  '$displayAge • $displayGender',
                  style: GoogleFonts.nunito(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white70 : const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          if (isMe)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                'YOU',
                style: GoogleFonts.dynaPuff(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _avatarIcon(String? gender) {
    return Icon(
      gender?.toLowerCase() == 'female' ? Icons.face_3_rounded : Icons.face_rounded,
      color: Colors.white,
      size: 36,
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isDark = context.watch<ThemeProvider>().isDark;
    final cp = auth.coupleProfile;
    
    final myName = auth.isPartnerA ? cp?.partnerAName : cp?.partnerBName;
    final myAge = auth.isPartnerA ? cp?.partnerAAge : cp?.partnerBAge;
    final myGender = auth.isPartnerA ? cp?.partnerAGender : cp?.partnerBGender;
    final myAvatar = auth.isPartnerA ? cp?.partnerAAvatar : cp?.partnerBAvatar;
    
    final partnerName = auth.isPartnerA ? cp?.partnerBName : cp?.partnerAName;
    final partnerAge = auth.isPartnerA ? cp?.partnerBAge : cp?.partnerAAge;
    final partnerGender = auth.isPartnerA ? cp?.partnerBGender : cp?.partnerAGender;
    final partnerAvatar = auth.isPartnerA ? cp?.partnerBAvatar : cp?.partnerAAvatar;
    
    final badge = kLevelBadges[_level] ?? kLevelBadges[5]!;
    
    final bgColors = isDark
        ? [const Color(0xFF150025), const Color(0xFF3B0764), const Color(0xFF4C1D95)]
        : [const Color(0xFFFDF2F8), const Color(0xFFFCE7F3), const Color(0xFFF5D0FE)];

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: bgColors,
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: _loading 
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF9333EA)))
            : SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(24, 24, 24, widget.isTab ? 110 : 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (!widget.isTab) ...[
                        GestureDetector(
                          onTap: () => Navigator.of(context).pop(),
                          child: Container(
                            width: 42,
                            height: 42,
                            decoration: BoxDecoration(
                              color: isDark ? Colors.white.withOpacity(0.12) : Colors.white,
                              borderRadius: BorderRadius.circular(21)
                            ),
                            child: Icon(Icons.arrow_back_ios_new, color: isDark ? Colors.white : const Color(0xFF0F172A), size: 20)
                          ),
                        ),
                        const SizedBox(width: 16),
                      ],
                      Text(
                        'Our Profile',
                        style: GoogleFonts.dynaPuff(
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                        ),
                      ),
                    ],
                  ),
                  Text(
                    'Your couple stats',
                    style: GoogleFonts.nunito(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white70 : const Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Top Purple Card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF9333EA), Color(0xFFC026D3)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(32),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF9333EA).withOpacity(0.3),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        SizedBox(
                          height: 70,
                          width: 130,
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              Positioned(
                                left: 0,
                                child: Container(
                                  width: 70,
                                  height: 70,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF10B981),
                                    shape: BoxShape.circle,
                                    border: Border.all(color: Colors.transparent, width: 0),
                                  ),
                                  clipBehavior: Clip.antiAlias,
                                  child: myAvatar != null && myAvatar.isNotEmpty
                                      ? Image.network(ApiService.getImageUrl(myAvatar)!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _avatarIcon(myGender))
                                      : _avatarIcon(myGender),
                                ),
                              ),
                              Positioned(
                                right: 0,
                                child: Container(
                                  width: 70,
                                  height: 70,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF59E0B),
                                    shape: BoxShape.circle,
                                    border: Border.all(color: Colors.transparent, width: 0),
                                  ),
                                  clipBehavior: Clip.antiAlias,
                                  child: partnerAvatar != null && partnerAvatar.isNotEmpty
                                      ? Image.network(ApiService.getImageUrl(partnerAvatar)!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _avatarIcon(partnerGender))
                                      : _avatarIcon(partnerGender),
                                ),
                              ),
                              Container(
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.3),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.favorite, color: Color(0xFFE879F9), size: 18),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          '${myName ?? 'You'} & ${partnerName ?? 'Partner'}',
                          style: GoogleFonts.dynaPuff(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            '${badge['emoji']} Level $_level • ${badge['label']}',
                            style: GoogleFonts.nunito(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Stats Grid
                  GridView.count(
                    crossAxisCount: 2,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    childAspectRatio: 1.3,
                    children: [
                      _buildStatCard('Moments', _moments, Icons.image_outlined, const Color(0xFF3B82F6), isDark),
                      _buildStatCard('Missions', _missions, Icons.description_outlined, const Color(0xFF10B981), isDark),
                      _buildStatCard('Spins', _spins, Icons.gps_fixed_rounded, const Color(0xFFF59E0B), isDark),
                      _buildStatCard('Heart Draws', _draws, Icons.casino_outlined, const Color(0xFF9333EA), isDark),
                    ],
                  ),
                  const SizedBox(height: 24),
                  
                  // Profiles
                  _buildProfileCard(myName ?? 'You', myAge?.toString(), myGender, myAvatar, true, isDark, const Color(0xFF10B981)),
                  _buildProfileCard(partnerName ?? 'Partner', partnerAge?.toString(), partnerGender, partnerAvatar, false, isDark, const Color(0xFFF59E0B)),
                  
                  // Email row
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.white.withOpacity(0.07) : const Color(0xFFF0E5F5), // Light purple hint
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.mail_outline_rounded, color: Color(0xFF4C1D95)),
                        const SizedBox(width: 16),
                        Text(
                          auth.email ?? 'Unknown Email',
                          style: GoogleFonts.nunito(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: isDark ? Colors.white : const Color(0xFF4C1D95),
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  // Our History button
                  ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const HistoryScreen()));
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isDark ? Colors.white.withOpacity(0.07) : const Color(0xFFE5D5F0), // slightly darker than email row
                      foregroundColor: isDark ? Colors.white : const Color(0xFF4A1029),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                      minimumSize: const Size(double.infinity, 60),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.favorite, color: Color(0xFF4A1029)),
                        const SizedBox(width: 8),
                        Text(
                          'Our History',
                          style: GoogleFonts.dynaPuff(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: isDark ? Colors.white : const Color(0xFF4A1029),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  Center(
                    child: Text(
                      'Keep scratching to level up!',
                      style: GoogleFonts.nunito(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white54 : const Color(0xFF64748B),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
        ),
      ),
    );
  }
}

// ─── Settings Screen ─────────────────────────────────────────────────────────

class SettingsScreen extends StatefulWidget {
  final bool isTab;
  const SettingsScreen({super.key, this.isTab = false});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> with SingleTickerProviderStateMixin {
  late AnimationController _floatCtrl;
  bool _soundEnabled = SoundService.soundEnabled;

  @override
  void initState() {
    super.initState();
    _floatCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _floatCtrl.dispose();
    super.dispose();
  }

  Future<void> _resetHistory(BuildContext context) async {
    final auth = context.read<AuthProvider>();
    final cp = auth.coupleProfile;
    if (cp == null) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Text('Reset Everything', style: GoogleFonts.dynaPuff(fontWeight: FontWeight.w900)),
        content: const Text(
          'This will clear all scratch history, reset scratch counts, and reset levels to 1 for both partners. This cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text('Cancel', style: GoogleFonts.nunito(color: Colors.grey)),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text('Reset All', style: GoogleFonts.nunito(color: Colors.red, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      // 1. Delete history via API
      await ApiService.delete('/api/history/user/${cp.partnerAUid}');
      if (cp.partnerBUid != null) {
        await ApiService.delete('/api/history/user/${cp.partnerBUid}');
      }

      // 2. Reset progress via API
      await ApiService.post('/api/progress', {
        'userUid': cp.partnerAUid,
        'scratchCount': 0,
        'completedCount': 0,
        'currentLevel': 1,
      });
      if (cp.partnerBUid != null) {
        await ApiService.post('/api/progress', {
          'userUid': cp.partnerBUid,
          'scratchCount': 0,
          'completedCount': 0,
          'currentLevel': 1,
        });
      }

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('All progress and history has been reset!')),
        );
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to reset progress. Please try again.')),
        );
      }
    }
  }

  Future<void> _disconnectPartner(BuildContext context) async {
    final auth = context.read<AuthProvider>();
    if (auth.uid == null) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Text('Disconnect Partner', style: GoogleFonts.dynaPuff(fontWeight: FontWeight.w900)),
        content: const Text(
          'Are you sure you want to disconnect? This will permanently unlink you and delete shared progress. You will need to set up a new profile or join someone else.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text('Cancel', style: GoogleFonts.nunito(color: Colors.grey)),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text('Disconnect', style: GoogleFonts.nunito(color: Colors.red, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final res = await ApiService.delete('/api/couple/uid/${auth.uid}');
      if (res.statusCode == 200) {
        await auth.setCoupleProfile(null);
        if (context.mounted) {
          Navigator.of(context).pushNamedAndRemoveUntil('/profile-setup', (route) => false);
        }
      } else {
        throw Exception();
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not disconnect. Please try again later.')),
        );
      }
    }
  }

  Future<void> _deleteAccount(BuildContext context) async {
    final auth = context.read<AuthProvider>();
    if (auth.uid == null) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Text('Delete Account', style: GoogleFonts.dynaPuff(fontWeight: FontWeight.w900)),
        content: const Text(
          'Are you sure you want to delete your account? This will permanently delete your couple profile and all your progress. This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text('Cancel', style: GoogleFonts.nunito(color: Colors.grey)),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text('Delete Account', style: GoogleFonts.nunito(color: Colors.red, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await ApiService.delete('/api/couple/uid/${auth.uid}');
      await auth.logout();
      if (context.mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not delete account. Please try again.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;
    final themeProvider = context.read<ThemeProvider>();
    final auth = context.read<AuthProvider>();

    final bgColors = isDark
        ? [const Color(0xFF150025), const Color(0xFF3B0764), const Color(0xFF4C1D95)]
        : [const Color(0xFFFDF2F8), const Color(0xFFFCE7F3), const Color(0xFFF5D0FE)];

    final heartColor = isDark ? Colors.white.withOpacity(0.04) : Colors.white.withOpacity(0.22);

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: bgColors,
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: Stack(
          children: [
            // Decorative background hearts matching React Native settings screen
            AnimatedBuilder(
              animation: _floatCtrl,
              builder: (context, child) => Positioned(
                top: 80 - (20 * _floatCtrl.value),
                left: -20,
                child: Transform.rotate(
                  angle: -0.26,
                  child: Icon(Icons.favorite, size: 120, color: heartColor),
                ),
              ),
            ),
            AnimatedBuilder(
              animation: _floatCtrl,
              builder: (context, child) => Positioned(
                top: 250 + (30 * _floatCtrl.value),
                right: -10,
                child: Transform.rotate(
                  angle: 0.44,
                  child: Icon(Icons.favorite, size: 80, color: heartColor),
                ),
              ),
            ),
            AnimatedBuilder(
              animation: _floatCtrl,
              builder: (context, child) => Positioned(
                bottom: 150 - (40 * _floatCtrl.value),
                left: 30,
                child: Transform.rotate(
                  angle: -0.17,
                  child: Icon(Icons.favorite, size: 150, color: heartColor),
                ),
              ),
            ),

            // Scrollable Content
            Positioned.fill(
              child: ListView(
                padding: EdgeInsets.fromLTRB(22, 140, 22, widget.isTab ? 110 : 30),
                children: [
                  // ACCOUNT SECTION
                  _SectionHeader(label: 'ACCOUNT', isDark: isDark),
                  _SettingRow(
                    icon: Icons.person_outline_rounded,
                    iconColor: const Color(0xFF3B82F6),
                    label: 'Edit Profile',
                    subtitle: 'Modify name, age, gender, and avatar',
                    onTap: () => Navigator.of(context).pushNamed('/edit-profile'),
                    isDark: isDark,
                  ),
                  const SizedBox(height: 10),
                  _SettingRow(
                    icon: Icons.link_off_rounded,
                    iconColor: const Color(0xFFF59E0B),
                    label: 'Disconnect Partner',
                    subtitle: 'Unlink from current partner connection',
                    onTap: () => _disconnectPartner(context),
                    isDark: isDark,
                  ),
                  const SizedBox(height: 24),

                  // PREFERENCES SECTION
                  _SectionHeader(label: 'PREFERENCES', isDark: isDark),
                  _SettingRow(
                    icon: Icons.dark_mode_outlined,
                    iconColor: const Color(0xFF8B5CF6),
                    label: 'Dark Mode',
                    subtitle: 'Enable dark background theme',
                    trailing: Switch(
                      value: isDark,
                      onChanged: (val) => themeProvider.toggle(),
                      activeColor: const Color(0xFFDB2777),
                    ),
                    isDark: isDark,
                  ),
                  const SizedBox(height: 10),
                  _SettingRow(
                    icon: Icons.volume_up_outlined,
                    iconColor: const Color(0xFF10B981),
                    label: 'Sound Effects',
                    subtitle: 'Enable scratch and reward audios',
                    trailing: Switch(
                      value: _soundEnabled,
                      onChanged: (val) {
                        SoundService.toggleSound(val);
                        setState(() => _soundEnabled = val);
                      },
                      activeColor: const Color(0xFFDB2777),
                    ),
                    isDark: isDark,
                  ),
                  const SizedBox(height: 24),

                  // DANGER ZONE SECTION
                  _SectionHeader(label: 'DANGER ZONE', isDark: isDark, danger: true),
                  _SettingRow(
                    icon: Icons.restart_alt_rounded,
                    iconColor: const Color(0xFFEF4444),
                    label: 'Reset All History',
                    subtitle: 'Clear scratch counts, histories, and levels',
                    onTap: () => _resetHistory(context),
                    danger: true,
                    isDark: isDark,
                  ),
                  const SizedBox(height: 10),
                  _SettingRow(
                    icon: Icons.delete_forever_outlined,
                    iconColor: const Color(0xFFEF4444),
                    label: 'Delete Account',
                    subtitle: 'Permanently remove your profile and progress',
                    onTap: () => _deleteAccount(context),
                    danger: true,
                    isDark: isDark,
                  ),
                  const SizedBox(height: 10),
                  _SettingRow(
                    icon: Icons.logout_rounded,
                    iconColor: const Color(0xFFEC4899),
                    label: 'Logout',
                    subtitle: 'Sign out of your account',
                    onTap: () async {
                      await auth.logout();
                      if (context.mounted) {
                        Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
                      }
                    },
                    isDark: isDark,
                  ),
                ],
              ),
            ),

            // Blurred Floating Header (Always on Top)
            Positioned(
              top: 0, left: 0, right: 0,
              child: ClipRect(
                child: BackdropFilter(
                  filter: ui.ImageFilter.blur(sigmaX: 15, sigmaY: 15),
                  child: Container(
                    padding: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xCC150025) : const Color(0xCCFDF2F8),
                      border: Border(
                        bottom: BorderSide(
                          color: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.03),
                        ),
                      ),
                    ),
                    child: SafeArea(
                      bottom: false,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(22, 12, 22, 0),
                        child: Row(
                          children: [
                            if (!widget.isTab) ...[
                              GestureDetector(
                                onTap: () => Navigator.of(context).pop(),
                                child: Container(
                                  width: 42,
                                  height: 42,
                                  decoration: BoxDecoration(
                                    color: isDark ? Colors.white.withOpacity(0.12) : Colors.white,
                                    borderRadius: BorderRadius.circular(21),
                                    border: Border.all(
                                      color: isDark ? Colors.white12 : Colors.black.withOpacity(0.08),
                                    ),
                                  ),
                                  child: Icon(
                                    Icons.arrow_back_ios_new,
                                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                                    size: 20,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                            ],
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Settings',
                                    style: GoogleFonts.dynaPuff(
                                      fontSize: 24,
                                      fontWeight: FontWeight.w900,
                                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                                    ),
                                  ),
                                  Text(
                                    'Customize your experience',
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
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String label;
  final bool isDark;
  final bool danger;

  const _SectionHeader({required this.label, required this.isDark, this.danger = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        label,
        style: GoogleFonts.dynaPuff(
          color: danger
              ? const Color(0xFFEF4444)
              : (isDark ? Colors.white70 : Colors.black54),
          fontSize: 11,
          fontWeight: FontWeight.w900,
          letterSpacing: 1,
        ),
      ),
    );
  }
}

class _SettingRow extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label, subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;
  final bool danger;
  final bool isDark;

  const _SettingRow({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.subtitle,
    this.trailing,
    this.onTap,
    this.danger = false,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final bgColors = danger
        ? (isDark
            ? [Colors.red.withOpacity(0.12), Colors.red.withOpacity(0.04)]
            : [const Color(0xFFFEF2F2), Colors.white])
        : (isDark
            ? [Colors.white.withOpacity(0.07), Colors.white.withOpacity(0.07)]
            : [const Color(0xFFF8FAFC), Colors.white]);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: bgColors, begin: Alignment.topLeft, end: Alignment.bottomRight),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: danger
                ? Colors.red.withOpacity(0.2)
                : (isDark ? Colors.white10 : Colors.black.withOpacity(0.05)),
          ),
          boxShadow: isDark
              ? []
              : [
                  BoxShadow(
                    color: danger ? Colors.red.withOpacity(0.04) : const Color(0xFF94A3B8).withOpacity(0.06),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  )
                ],
        ),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: danger
                    ? (isDark ? Colors.red.withOpacity(0.2) : const Color(0xFFFEE2E2))
                    : (isDark ? Colors.white.withOpacity(0.1) : Colors.white),
                borderRadius: BorderRadius.circular(21),
                boxShadow: isDark
                    ? []
                    : [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.03),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        )
                      ],
              ),
              child: Icon(
                icon,
                color: danger ? const Color(0xFFEF4444) : iconColor,
                size: 20,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: GoogleFonts.dynaPuff(
                      color: danger ? const Color(0xFFEF4444) : (isDark ? Colors.white : const Color(0xFF0F172A)),
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: GoogleFonts.nunito(
                      color: isDark ? Colors.white60 : Colors.black54,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            trailing ??
                (onTap != null
                    ? Icon(Icons.chevron_right, color: isDark ? Colors.white38 : Colors.black26)
                    : const SizedBox.shrink()),
          ],
        ),
      ),
    );
  }
}
