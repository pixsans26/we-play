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
  averageCycleLength: number = 28
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

  if (currentCycleDay >= 1 && currentCycleDay <= 5) { // Assuming 5 day period
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
  };
}

/**
 * Generates marked dates object for react-native-calendars
 * Uses `markingType="period"` compatible objects.
 */
export function generatePredictionCalendarMarks(
  lastPeriodStartStr: string | null,
  averageCycleLength: number = 28,
  averagePeriodLength: number = 5
): any {
  const marked: any = {};
  if (!lastPeriodStartStr) return marked;

  const dateToKey = (d: Date) => {
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().split("T")[0];
  };

  const lastPeriodStart = new Date(lastPeriodStartStr);
  if (isNaN(lastPeriodStart.getTime())) return marked;

  const today = normalizeDate(new Date());

  // Loop through current cycle and next 6 cycles
  for (let i = 0; i <= 6; i++) {
    // 1. Mark Period days
    const cycleStart = new Date(lastPeriodStart);
    cycleStart.setDate(lastPeriodStart.getDate() + (i * averageCycleLength));
    
    // Only mark cycles that are in the future or the current one
    // We don't want to skip the current cycle, even if it's partly past
    
    const periodEnd = new Date(cycleStart);
    periodEnd.setDate(cycleStart.getDate() + averagePeriodLength - 1);

    let curr = new Date(cycleStart);
    let dayOfPeriod = 1;
    while (curr <= periodEnd) {
      const key = dateToKey(curr);
      
      // Heavy flow (days 1-2), Light flow (days 3+)
      const isHeavyFlow = dayOfPeriod <= 2;

      marked[key] = {
        color: isHeavyFlow ? "#be185d" : "#fbcfe8", // Dark pink vs Light pink
        textColor: isHeavyFlow ? "#ffffff" : "#be185d",
        startingDay: key === dateToKey(cycleStart),
        endingDay: key === dateToKey(periodEnd),
        flowType: isHeavyFlow ? "heavy" : "light"
      };
      
      curr.setDate(curr.getDate() + 1);
      dayOfPeriod++;
    }

    // 2. Mark Fertile Window & Ovulation
    const lutealPhaseLength = 14;
    const estimatedOvulationDay = averageCycleLength - lutealPhaseLength;
    
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

      // Don't overwrite period marks with fertile marks (just in case of extremely short cycles)
      if (!marked[key]) {
        marked[key] = {
          color: isOvulation ? "#9333ea" : "#d8b4fe", // Dark purple for ovulation, light purple for fertile
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

    // 3. Mark Protected Safe (3 days before fertile, 3 days after fertile)
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

    // 4. Mark Safe Sex (all other days in the cycle)
    // A cycle is from cycleStart to nextCycleStart - 1
    const nextCycleStart = new Date(cycleStart);
    nextCycleStart.setDate(cycleStart.getDate() + averageCycleLength);
    
    let cCurr = new Date(cycleStart);
    while (cCurr < nextCycleStart) {
      const key = dateToKey(cCurr);
      // If a day has no color/flowType and is not protected and not fertile, it's a completely regular safe day
      if (!marked[key]) {
        marked[key] = { isSafeSex: true };
      } else if (!marked[key].color && !marked[key].isProtectedSafe && !marked[key].isMostDesired) {
        // Just in case it was initialized for today
        marked[key].isSafeSex = true;
      } else if (marked[key].flowType) {
        // During period, pregnancy risk is very low, so it can be considered safe sex
        marked[key].isSafeSex = true;
      }
      cCurr.setDate(cCurr.getDate() + 1);
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
