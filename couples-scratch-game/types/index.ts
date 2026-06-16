export interface Task {
  id: string;
  title: string;
  description: string;
  timerSeconds: number;
  level: number;
  category: string;
}

export interface ImageTask {
  id: string;
  imageSource: any;
  title: string;
  level: number;
}

export interface CoupleProfile {
  id: number;
  partnerAUid: string;
  partnerBUid: string | null;
  partnerAName: string;
  partnerBName: string | null;
  partnerAAvatar?: string | null;
  partnerBAvatar?: string | null;
  partnerAAge: number | null;
  partnerBAge: number | null;
  partnerAGender: string | null;
  partnerBGender: string | null;
  whatALikes: string | null;
  whatBLikes: string | null;
}

export interface UserProgress {
  id: number;
  userUid: string;
  scratchCount: number;
  completedCount: number;
  currentLevel: number;
}

export interface HistoryEntry {
  id: number;
  userUid: string;
  taskId: string;
  taskType: "image" | "text" | "lottery" | "spin_wheel";
  category?: string;
  scratchedAt: Date;
  completed: boolean;
  skipped: boolean;
  timeTaken: number | null;
  performerUid?: string | null;
}

export type LevelBadgeMapping = {
  [level: number]: { emoji: string; label: string };
};

export const LEVEL_BADGES: LevelBadgeMapping = {
  1: { emoji: "🌱", label: "New Couple" },
  2: { emoji: "💞", label: "Getting Closer" },
  3: { emoji: "🔥", label: "Heating Up" },
  4: { emoji: "💜", label: "Deeply Connected" },
  5: { emoji: "👑", label: "Soulmates" },
};

export const LEVEL_CATEGORIES: Record<number, string[]> = {
  1: ["romantic", "fun"],
  2: ["romantic", "fun", "playful"],
  3: ["romantic", "fun", "playful", "dare"],
  4: ["romantic", "fun", "playful", "dare", "intimate"],
  5: ["romantic", "fun", "playful", "dare", "intimate"],
};
