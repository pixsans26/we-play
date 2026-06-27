import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../lib/cycle_calculations.dart';

class CycleCalendarScreen extends StatefulWidget {
  final String? lastPeriodStart;
  final int averageCycleLength;
  final int averagePeriodLength;

  const CycleCalendarScreen({
    super.key,
    required this.lastPeriodStart,
    required this.averageCycleLength,
    required this.averagePeriodLength,
  });

  @override
  State<CycleCalendarScreen> createState() => _CycleCalendarScreenState();
}

class _CycleCalendarScreenState extends State<CycleCalendarScreen> {
  late Map<String, CalendarMarking> _markedDates;
  late DateTime _focusedMonth;

  @override
  void initState() {
    super.initState();
    _focusedMonth = DateTime.now();
    _markedDates = generatePredictionCalendarMarks(
      widget.lastPeriodStart,
      widget.averageCycleLength,
      widget.averagePeriodLength,
    );
  }

  void _nextMonth() {
    setState(() {
      _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1, 1);
    });
  }

  void _prevMonth() {
    setState(() {
      _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month - 1, 1);
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final bgColors = isDark
        ? [const Color(0xFF150025), const Color(0xFF3B0764), const Color(0xFF4C1D95)]
        : [const Color(0xFFFDF2F8), const Color(0xFFFCE7F3), const Color(0xFFF5D0FE)];

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
                      'Cycle Calendar',
                      style: GoogleFonts.nunito(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                      ),
                    ),
                  ],
                ),
              ),

              // Calendar Widget
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 22),
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white.withOpacity(0.06) : Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.08)),
                      ),
                      child: Column(
                        children: [
                          // Month Header Navigation
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.chevron_left),
                                color: const Color(0xFFDB2777),
                                onPressed: _prevMonth,
                              ),
                              Text(
                                DateFormat('MMMM yyyy').format(_focusedMonth),
                                style: GoogleFonts.nunito(fontSize: 18, fontWeight: FontWeight.w800, color: isDark ? Colors.white : const Color(0xFF0F172A)),
                              ),
                              IconButton(
                                icon: const Icon(Icons.chevron_right),
                                color: const Color(0xFFDB2777),
                                onPressed: _nextMonth,
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          _buildCalendarDays(isDark),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Legend Title
                    Text(
                      'Legend',
                      style: GoogleFonts.nunito(fontSize: 18, fontWeight: FontWeight.w900, color: isDark ? Colors.white : const Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 12),

                    // Legend list
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white.withOpacity(0.06) : Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.08)),
                      ),
                      child: Column(
                        children: [
                          _LegendRow(color: const Color(0xFFBE185D), label: 'Heavy Flow', subtitle: 'Peak period days predicted based on cycle', icon: Icons.water_drop, isDark: isDark),
                          const Divider(height: 24, color: Colors.white12),
                          _LegendRow(color: const Color(0xFFFBCFE8), iconColor: const Color(0xFFBE185D), label: 'Light Flow', subtitle: 'Winding down period days', icon: Icons.water_drop_outlined, isDark: isDark),
                          const Divider(height: 24, color: Colors.white12),
                          _LegendRow(color: const Color(0x4DD8B4FE), iconColor: const Color(0xFF9333EA), label: 'Fertility Window', subtitle: 'High chance of conception during this phase', icon: Icons.favorite_border, isDark: isDark),
                          const Divider(height: 24, color: Colors.white12),
                          _LegendRow(color: const Color(0x339333EA), iconColor: const Color(0xFF9333EA), label: 'Ovulation Day', subtitle: 'Highest chance of conception', icon: Icons.favorite, isDark: isDark),
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
    );
  }

  Widget _buildCalendarDays(bool isDark) {
    final firstDayOfMonth = DateTime(_focusedMonth.year, _focusedMonth.month, 1);
    final daysInMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1, 0).day;
    final weekdayOfFirst = firstDayOfMonth.weekday; // 1 = Monday ... 7 = Sunday

    // Weekday headers
    final weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    final widgets = <Widget>[];

    // Headers row
    for (var w in weekdays) {
      widgets.add(
        Center(
          child: Text(
            w,
            style: GoogleFonts.nunito(color: isDark ? Colors.white38 : Colors.black38, fontSize: 13, fontWeight: FontWeight.bold),
          ),
        ),
      );
    }

    // Offset before first day
    final offset = (weekdayOfFirst - 1) % 7;
    for (int i = 0; i < offset; i++) {
      widgets.add(const SizedBox.shrink());
    }

    // Day numbers
    for (int day = 1; day <= daysInMonth; day++) {
      final date = DateTime(_focusedMonth.year, _focusedMonth.month, day);
      final key = "${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";
      final marking = _markedDates[key];

      Color bgColor = Colors.transparent;
      Color textColor = isDark ? Colors.white70 : Colors.black87;
      Widget? markerIcon;

      if (marking != null) {
        bgColor = Color(int.parse(marking.color.replaceFirst('#', 'FF'), radix: 16));
        textColor = Color(int.parse(marking.textColor.replaceFirst('#', 'FF'), radix: 16));
        if (marking.flowType != null) {
          markerIcon = Icon(Icons.water_drop, size: 8, color: textColor);
        } else if (marking.color == "#9333ea") {
          markerIcon = Icon(Icons.favorite, size: 8, color: textColor);
        } else if (marking.color == "#d8b4fe") {
          markerIcon = Icon(Icons.favorite_border, size: 8, color: textColor);
        }
      }

      widgets.add(
        Center(
          child: Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (markerIcon != null) markerIcon,
                Text(
                  '$day',
                  style: GoogleFonts.nunito(
                    color: textColor,
                    fontSize: markerIcon != null ? 11 : 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return GridView.custom(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 7,
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
      ),
      childrenDelegate: SliverChildListDelegate(widgets),
    );
  }
}

class _LegendRow extends StatelessWidget {
  final Color color;
  final Color? iconColor;
  final String label, subtitle;
  final IconData icon;
  final bool isDark;

  const _LegendRow({required this.color, this.iconColor, required this.label, required this.subtitle, required this.icon, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 36, height: 36,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(18),
          ),
          child: Icon(icon, color: iconColor ?? Colors.white, size: 18),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: GoogleFonts.nunito(fontSize: 16, fontWeight: FontWeight.w800, color: isDark ? Colors.white : const Color(0xFF0F172A))),
              Text(subtitle, style: GoogleFonts.nunito(fontSize: 12, color: isDark ? Colors.white38 : Colors.black38, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ],
    );
  }
}
