export interface CyclePredictions {
  currentPhase: "Menstrual" | "Follicular" | "Ovulation" | "Luteal";
  daysUntilNextPeriod: number;
  nextPeriodDate: Date;
  nextOvulationDate: Date;
  fertileWindowStart: Date;
  fertileWindowEnd: Date;
  isFertile: boolean;
  pregnancyRisk: "Low" | "Medium" | "High";
  safeSex: boolean;
  partnerMood: string;
  partnerDesires: string;
  sexStatus: string;
}

/**
 * Normalizes a date by removing the time component.
 */
function normalizeDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Calculates predictions and phases based on the last period start date and cycle length.
 */
export function calculateCyclePredictions(
  lastPeriodStartStr: string | null,
  averageCycleLength: number = 28,
  averagePeriodLength: number = 5
): CyclePredictions | null {
  if (!lastPeriodStartStr) return null;

  const lastPeriodStart = normalizeDate(new Date(lastPeriodStartStr));
  if (isNaN(lastPeriodStart.getTime())) return null;

  const today = normalizeDate(new Date());

  // How many days since the last period started?
  const diffTime = today.getTime() - lastPeriodStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Determine current day of the cycle (1-indexed)
  // If we are past one full cycle, we simulate the most recent period start.
  const currentCycleDay = (diffDays % averageCycleLength) + 1;

  // Next period date
  const daysUntilNextPeriod = averageCycleLength - currentCycleDay + 1;
  const nextPeriodDate = new Date(today);
  nextPeriodDate.setDate(today.getDate() + daysUntilNextPeriod);

  // Approximate ovulation is usually 14 days before the NEXT period.
  const lutealPhaseLength = 14;
  const estimatedOvulationDay = averageCycleLength - lutealPhaseLength;
  
  // Find exactly what date ovulation occurs this cycle
  // (last period start + estimatedOvulationDay - 1)
  const daysToOvulationFromStart = estimatedOvulationDay - 1;
  const nextOvulationDate = new Date(today);
  nextOvulationDate.setDate(today.getDate() + (estimatedOvulationDay - currentCycleDay));

  // Fertile window: typically 5 days before ovulation + day of ovulation + 1 day after
  const fertileStartDay = estimatedOvulationDay - 5;
  const fertileEndDay = estimatedOvulationDay + 1;
  
  const fertileWindowStart = new Date(today);
  fertileWindowStart.setDate(today.getDate() + (fertileStartDay - currentCycleDay));
  
  const fertileWindowEnd = new Date(today);
  fertileWindowEnd.setDate(today.getDate() + (fertileEndDay - currentCycleDay));

  const isFertile = currentCycleDay >= fertileStartDay && currentCycleDay <= fertileEndDay;
  const safeSex = !isFertile;
  
  let pregnancyRisk: "Low" | "Medium" | "High" = "Low";
  if (isFertile) {
    if (currentCycleDay >= estimatedOvulationDay - 2 && currentCycleDay <= estimatedOvulationDay) {
      pregnancyRisk = "High";
    } else {
      pregnancyRisk = "Medium";
    }
  }

  // Determine Phase & Moods
  let currentPhase: "Menstrual" | "Follicular" | "Ovulation" | "Luteal" = "Menstrual";
  let partnerMood = "";
  let partnerDesires = "";
  let sexStatus = "";

  const isPeriod = currentCycleDay >= 1 && currentCycleDay <= averagePeriodLength;
  const isProtectedSafe = (currentCycleDay >= fertileStartDay - 3 && currentCycleDay < fertileStartDay) ||
                          (currentCycleDay > fertileEndDay && currentCycleDay <= fertileEndDay + 3);

  if (isPeriod) {
    sexStatus = "No Sex";
  } else if (isFertile) {
    sexStatus = "No Sex";
  } else if (isProtectedSafe) {
    sexStatus = "Protected Sex";
  } else {
    sexStatus = "Safe Sex";
  }

  if (isPeriod) { // Using accurate period length
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

  return {
    currentPhase,
    daysUntilNextPeriod,
    nextPeriodDate,
    nextOvulationDate,
    fertileWindowStart,
    fertileWindowEnd,
    isFertile,
    pregnancyRisk,
    safeSex,
    partnerMood,
    partnerDesires,
    sexStatus,
  };
}

/**
 * Generates marked dates object for react-native-calendars
 * Uses `markingType="period"` compatible objects.
 */
export function generatePredictionCalendarMarks(
  lastPeriodStartStr: string | null,
  averageCycleLength: number = 28,
  averagePeriodLength: number = 5,
  history: Array<{ periodStart: string; periodEnd: string | null; cycleLength: number }> = []
): any {
  const marked: any = {};
  if (!lastPeriodStartStr) return marked;

  const dateToKey = (d: Date) => {
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().split("T")[0];
  };

  const today = normalizeDate(new Date());

  const processCycle = (cStartStr: string, cLength: number, pEndStr: string | null) => {
    const cycleStart = new Date(cStartStr);
    if (isNaN(cycleStart.getTime())) return;
    
    const periodEnd = pEndStr ? new Date(pEndStr) : new Date(cycleStart);
    if (!pEndStr) {
      periodEnd.setDate(cycleStart.getDate() + averagePeriodLength - 1);
    }

    let curr = new Date(cycleStart);
    let dayOfPeriod = 1;
    while (curr <= periodEnd) {
      const key = dateToKey(curr);
      const isHeavyFlow = dayOfPeriod <= 2;

      marked[key] = {
        color: isHeavyFlow ? "#be185d" : "#fbcfe8",
        textColor: isHeavyFlow ? "#ffffff" : "#be185d",
        startingDay: key === dateToKey(cycleStart),
        endingDay: key === dateToKey(periodEnd),
        flowType: isHeavyFlow ? "heavy" : "light"
      };
      curr.setDate(curr.getDate() + 1);
      dayOfPeriod++;
    }

    const lutealPhaseLength = 14;
    const estimatedOvulationDay = cLength - lutealPhaseLength;
    
    const ovulationDate = new Date(cycleStart);
    ovulationDate.setDate(cycleStart.getDate() + estimatedOvulationDay - 1);
    
    const fertileStartDay = estimatedOvulationDay - 5;
    const fertileEndDay = estimatedOvulationDay + 1;
    
    const fertileStart = new Date(cycleStart);
    fertileStart.setDate(cycleStart.getDate() + fertileStartDay - 1);
    
    const fertileEnd = new Date(cycleStart);
    fertileEnd.setDate(cycleStart.getDate() + fertileEndDay - 1);
    
    const ovDateStr = dateToKey(ovulationDate);

    let fCurr = new Date(fertileStart);
    while (fCurr <= fertileEnd) {
      const key = dateToKey(fCurr);
      const isOvulation = key === ovDateStr;
      const daysToOvulation = Math.floor((ovulationDate.getTime() - fCurr.getTime()) / (1000 * 60 * 60 * 24));
      const isMostDesired = daysToOvulation >= 0 && daysToOvulation <= 2;

      if (!marked[key]) {
        marked[key] = {
          color: isOvulation ? "#9333ea" : "#d8b4fe",
          textColor: isOvulation ? "#fff" : "#6b21a8",
          startingDay: key === dateToKey(fertileStart),
          endingDay: key === dateToKey(fertileEnd),
          isMostDesired,
        };
      } else {
        marked[key].isMostDesired = isMostDesired;
      }
      fCurr.setDate(fCurr.getDate() + 1);
    }

    const protectedStart = new Date(fertileStart);
    protectedStart.setDate(fertileStart.getDate() - 3);
    const protectedEndPre = new Date(fertileStart);
    protectedEndPre.setDate(fertileStart.getDate() - 1);

    const protectedStartPost = new Date(fertileEnd);
    protectedStartPost.setDate(fertileEnd.getDate() + 1);
    const protectedEndPost = new Date(fertileEnd);
    protectedEndPost.setDate(fertileEnd.getDate() + 3);

    const markProtected = (start: Date, end: Date) => {
      let curr = new Date(start);
      while (curr <= end) {
        const key = dateToKey(curr);
        if (!marked[key]) {
          marked[key] = { isProtectedSafe: true };
        } else {
          marked[key].isProtectedSafe = true;
        }
        curr.setDate(curr.getDate() + 1);
      }
    };

    markProtected(protectedStart, protectedEndPre);
    markProtected(protectedStartPost, protectedEndPost);

    const nextCycleStart = new Date(cycleStart);
    nextCycleStart.setDate(cycleStart.getDate() + cLength);
    
    let cCurr = new Date(cycleStart);
    while (cCurr < nextCycleStart) {
      const key = dateToKey(cCurr);
      if (!marked[key]) {
        marked[key] = { isSafeSex: true };
      } else if (!marked[key].color && !marked[key].isProtectedSafe && !marked[key].isMostDesired) {
        marked[key].isSafeSex = true;
      } else if (marked[key].flowType) {
        marked[key].isSafeSex = true;
      }
      cCurr.setDate(cCurr.getDate() + 1);
    }
  };

  // Process History
  for (const h of history) {
    if (h.periodStart !== lastPeriodStartStr) { // avoid duplicating current if it's already there somehow
      processCycle(h.periodStart, h.cycleLength || averageCycleLength, h.periodEnd);
    }
  }

  // Process current and future
  const lastPeriodStart = new Date(lastPeriodStartStr);
  if (!isNaN(lastPeriodStart.getTime())) {
    processCycle(lastPeriodStartStr, averageCycleLength, null);
    
    for (let i = 1; i <= 6; i++) {
      const futureStart = new Date(lastPeriodStart);
      futureStart.setDate(lastPeriodStart.getDate() + (i * averageCycleLength));
      processCycle(dateToKey(futureStart), averageCycleLength, null);
    }
    
    // If no history, predict back 4 months
    if (history.length === 0) {
      for (let i = -4; i <= -1; i++) {
        const pastStart = new Date(lastPeriodStart);
        pastStart.setDate(lastPeriodStart.getDate() + (i * averageCycleLength));
        processCycle(dateToKey(pastStart), averageCycleLength, null);
      }
    }
  }

  // Mark today
  const todayKey = dateToKey(today);
  if (!marked[todayKey]) {
    marked[todayKey] = {
      customStyles: {
        container: { borderWidth: 2, borderColor: "#3b82f6" },
        text: { color: "#3b82f6", fontWeight: "bold" }
      }
    };
  }

  return marked;
}

export function getRecommendedGameForPhase(phase: "Menstrual" | "Follicular" | "Ovulation" | "Luteal"): string {
  switch (phase) {
    case "Menstrual":
      return "Hidden Moments (Low energy, intimate connection)";
    case "Follicular":
      return "Fate Wheel (Spontaneous and playful)";
    case "Ovulation":
      return "Couples Lottery (High excitement, passionate)";
    case "Luteal":
      return "Task Scratch (Meaningful acts of service)";
    default:
      return "Task Scratch";
  }
}
