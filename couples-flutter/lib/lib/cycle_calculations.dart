class CyclePredictions {
  final String currentPhase; // "Menstrual" | "Follicular" | "Ovulation" | "Luteal"
  final int daysUntilNextPeriod;
  final DateTime nextPeriodDate;
  final DateTime nextOvulationDate;
  final DateTime fertileWindowStart;
  final DateTime fertileWindowEnd;
  final bool isFertile;
  final String pregnancyRisk; // "Low" | "Medium" | "High"
  final bool safeSex;
  final String partnerMood;
  final String partnerDesires;

  CyclePredictions({
    required this.currentPhase,
    required this.daysUntilNextPeriod,
    required this.nextPeriodDate,
    required this.nextOvulationDate,
    required this.fertileWindowStart,
    required this.fertileWindowEnd,
    required this.isFertile,
    required this.pregnancyRisk,
    required this.safeSex,
    required this.partnerMood,
    required this.partnerDesires,
  });
}

DateTime _normalizeDate(DateTime d) {
  return DateTime(d.year, d.month, d.day);
}

CyclePredictions? calculateCyclePredictions(
  String? lastPeriodStartStr,
  int averageCycleLength,
) {
  if (lastPeriodStartStr == null || lastPeriodStartStr.isEmpty) return null;

  final lastPeriodStart = _normalizeDate(DateTime.tryParse(lastPeriodStartStr) ?? DateTime.now());
  final today = _normalizeDate(DateTime.now());

  final diffDays = today.difference(lastPeriodStart).inDays;
  if (diffDays < 0) return null;

  // Day of cycle (1-indexed)
  final currentCycleDay = (diffDays % averageCycleLength) + 1;

  // Next period date
  final daysUntilNextPeriod = averageCycleLength - currentCycleDay + 1;
  final nextPeriodDate = today.add(Duration(days: daysUntilNextPeriod));

  // Ovulation usually 14 days before next period
  const lutealPhaseLength = 14;
  final estimatedOvulationDay = averageCycleLength - lutealPhaseLength;

  final nextOvulationDate = today.add(Duration(days: estimatedOvulationDay - currentCycleDay));

  // Fertile window: typically 5 days before ovulation + day of + 1 day after
  final fertileStartDay = estimatedOvulationDay - 5;
  final fertileEndDay = estimatedOvulationDay + 1;

  final fertileWindowStart = today.add(Duration(days: fertileStartDay - currentCycleDay));
  final fertileWindowEnd = today.add(Duration(days: fertileEndDay - currentCycleDay));

  final isFertile = currentCycleDay >= fertileStartDay && currentCycleDay <= fertileEndDay;
  final safeSex = !isFertile;

  String pregnancyRisk = "Low";
  if (isFertile) {
    if (currentCycleDay >= estimatedOvulationDay - 2 && currentCycleDay <= estimatedOvulationDay) {
      pregnancyRisk = "High";
    } else {
      pregnancyRisk = "Medium";
    }
  }

  String currentPhase = "Menstrual";
  String partnerMood = "";
  String partnerDesires = "";

  if (currentCycleDay >= 1 && currentCycleDay <= 5) {
    currentPhase = "Menstrual";
    partnerMood = "Might feel fatigued, introspective, or craving comfort.";
    partnerDesires = "Gentle affection, warm cuddles, emotional support, and relaxation.";
  } else if (currentCycleDay > 5 && currentCycleDay < fertileStartDay) {
    currentPhase = "Follicular";
    partnerMood = "Energy is rising, feeling confident, social, and upbeat.";
    partnerDesires = "Fun activities, trying new things, playful flirting, and romance.";
  } else if (isFertile) {
    currentPhase = "Ovulation";
    partnerMood = "Peak energy, feeling attractive, outgoing, and highly communicative.";
    partnerDesires = "Deep intimacy, passionate connection, and heightened physical touch.";
  } else {
    currentPhase = "Luteal";
    partnerMood = "Energy winds down. Might feel sensitive, nest-building, or prone to mood swings.";
    partnerDesires = "Patience, reassuring words, deep conversations, and cozy nights in.";
  }

  return CyclePredictions(
    currentPhase: currentPhase,
    daysUntilNextPeriod: daysUntilNextPeriod,
    nextPeriodDate: nextPeriodDate,
    nextOvulationDate: nextOvulationDate,
    fertileWindowStart: fertileWindowStart,
    fertileWindowEnd: fertileWindowEnd,
    isFertile: isFertile,
    pregnancyRisk: pregnancyRisk,
    safeSex: safeSex,
    partnerMood: partnerMood,
    partnerDesires: partnerDesires,
  );
}

class CalendarMarking {
  final String dateKey;
  final String color;
  final String textColor;
  final bool startingDay;
  final bool endingDay;
  final String? flowType; // "heavy" | "light" | null

  CalendarMarking({
    required this.dateKey,
    required this.color,
    required this.textColor,
    required this.startingDay,
    required this.endingDay,
    this.flowType,
  });
}

Map<String, CalendarMarking> generatePredictionCalendarMarks(
  String? lastPeriodStartStr,
  int averageCycleLength,
  int averagePeriodLength,
) {
  final Map<String, CalendarMarking> marked = {};
  if (lastPeriodStartStr == null || lastPeriodStartStr.isEmpty) return marked;

  final lastPeriodStart = DateTime.tryParse(lastPeriodStartStr);
  if (lastPeriodStart == null) return marked;

  String dateToKey(DateTime d) {
    return "${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}";
  }

  // Loop through current cycle and next 6 cycles
  for (int i = 0; i <= 6; i++) {
    final cycleStart = lastPeriodStart.add(Duration(days: i * averageCycleLength));
    final periodEnd = cycleStart.add(Duration(days: averagePeriodLength - 1));

    var curr = cycleStart;
    int dayOfPeriod = 1;
    while (!curr.isAfter(periodEnd)) {
      final key = dateToKey(curr);
      final isHeavyFlow = dayOfPeriod <= 2;

      marked[key] = CalendarMarking(
        dateKey: key,
        color: isHeavyFlow ? "#be185d" : "#fbcfe8",
        textColor: isHeavyFlow ? "#ffffff" : "#be185d",
        startingDay: key == dateToKey(cycleStart),
        endingDay: key == dateToKey(periodEnd),
        flowType: isHeavyFlow ? "heavy" : "light",
      );

      curr = curr.add(const Duration(days: 1));
      dayOfPeriod++;
    }

    const lutealPhaseLength = 14;
    final estimatedOvulationDay = averageCycleLength - lutealPhaseLength;

    final ovulationDate = cycleStart.add(Duration(days: estimatedOvulationDay - 1));
    final fertileStart = cycleStart.add(Duration(days: estimatedOvulationDay - 5 - 1));
    final fertileEnd = cycleStart.add(Duration(days: estimatedOvulationDay + 1 - 1));

    final ovDateStr = dateToKey(ovulationDate);

    var fCurr = fertileStart;
    while (!fCurr.isAfter(fertileEnd)) {
      final key = dateToKey(fCurr);
      final isOvulation = key == ovDateStr;

      if (!marked.containsKey(key)) {
        marked[key] = CalendarMarking(
          dateKey: key,
          color: isOvulation ? "#9333ea" : "#d8b4fe",
          textColor: isOvulation ? "#ffffff" : "#6b21a8",
          startingDay: key == dateToKey(fertileStart),
          endingDay: key == dateToKey(fertileEnd),
        );
      }
      fCurr = fCurr.add(const Duration(days: 1));
    }
  }

  return marked;
}
