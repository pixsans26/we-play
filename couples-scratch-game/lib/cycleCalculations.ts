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
