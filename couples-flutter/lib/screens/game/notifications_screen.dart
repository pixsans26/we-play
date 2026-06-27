import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/theme_provider.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationProvider>().markAllRead();
    });
  }

  IconData _getIconData(String iconName) {
    switch (iconName) {
      case 'download': return Icons.cloud_download_outlined;
      case 'flower': return Icons.local_florist_outlined;
      case 'gamepad': return Icons.sports_esports_outlined;
      default: return Icons.notifications_none_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;
    final prov = context.watch<NotificationProvider>();
    final notifications = prov.notifications;

    final bgColors = isDark
        ? [const Color(0xFF150025), const Color(0xFF3B0764), const Color(0xFF4C1D95)]
        : [const Color(0xFFFDF2F8), const Color(0xFFFCE7F3), const Color(0xFFF5D0FE)];

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(gradient: LinearGradient(colors: bgColors, begin: Alignment.topCenter, end: Alignment.bottomCenter)),
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(22, 16, 22, 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
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
                        Text(
                          'Notifications',
                          style: GoogleFonts.nunito(fontSize: 24, fontWeight: FontWeight.w900, color: isDark ? Colors.white : const Color(0xFF0F172A)),
                        ),
                      ],
                    ),
                    if (notifications.isNotEmpty)
                      GestureDetector(
                        onTap: () => prov.clearAll(),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.04),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Text('Clear All', style: GoogleFonts.nunito(color: isDark ? Colors.white70 : Colors.black54, fontSize: 13, fontWeight: FontWeight.w700)),
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(
                child: notifications.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.notifications_off_outlined, size: 64, color: isDark ? Colors.white30 : Colors.black26),
                            const SizedBox(height: 16),
                            Text('No Notifications', style: GoogleFonts.nunito(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 20, fontWeight: FontWeight.w900)),
                            const SizedBox(height: 8),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 40),
                              child: Text("You're all caught up! Check back later for updates.", textAlign: TextAlign.center, style: GoogleFonts.nunito(color: isDark ? Colors.white38 : Colors.black38, fontSize: 14)),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 22),
                        itemCount: notifications.length,
                        itemBuilder: (_, i) {
                          final item = notifications[i];
                          final notifColor = Color(int.parse(item.iconColor.replaceFirst('#', 'FF'), radix: 16));
                          final notifBgColor = Color(int.parse(item.bgColor.replaceFirst('rgba(', '').replaceFirst(')', '').split(',')[0]))
                              .withOpacity(0.15); // Simple parsing fallback

                          return Container(
                            margin: const EdgeInsets.only(bottom: 16),
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: isDark ? Colors.white.withOpacity(0.05) : Colors.white.withOpacity(0.9),
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(color: item.isNew ? notifColor : (isDark ? Colors.white12 : Colors.black.withOpacity(0.08))),
                            ),
                            child: Stack(
                              children: [
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      width: 48, height: 48,
                                      decoration: BoxDecoration(
                                        color: notifBgColor,
                                        borderRadius: BorderRadius.circular(24),
                                      ),
                                      child: Icon(_getIconData(item.icon), color: notifColor, size: 24),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(item.title, style: GoogleFonts.nunito(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.w800)),
                                          const SizedBox(height: 4),
                                          Text(item.message, style: GoogleFonts.nunito(color: isDark ? Colors.white70 : Colors.black54, fontSize: 14, fontWeight: FontWeight.w600, height: 1.4)),
                                          const SizedBox(height: 8),
                                          Text(item.time, style: GoogleFonts.nunito(color: isDark ? Colors.white38 : Colors.black38, fontSize: 12)),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                Positioned(
                                  top: -8, right: -8,
                                  child: IconButton(
                                    icon: Icon(Icons.close, size: 16, color: isDark ? Colors.white30 : Colors.black26),
                                    onPressed: () => prov.removeNotification(item.id),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
