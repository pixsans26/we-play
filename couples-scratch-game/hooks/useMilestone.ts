import { apiFetch } from "@/lib/apiClient";
import { useCallback } from "react";
import { UserProgress } from "@/types";

const TASKS_PER_LEVEL = 10;
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

export function calculateLevel(completedCount: number): number {
  return Math.floor(completedCount / TASKS_PER_LEVEL) + 1;
}

export function isLevelUp(completedCount: number): boolean {
  return completedCount > 0 && completedCount % TASKS_PER_LEVEL === 0;
}

export interface UseMilestoneReturn {
  checkLevelUp: (userUid: string) => Promise<{ leveledUp: boolean; newLevel: number }>;
  getProgress: (userUid: string) => Promise<UserProgress | null>;
  TASKS_PER_LEVEL: number;
}

export function useMilestone(): UseMilestoneReturn {
  const checkLevelUp = useCallback(
    async (userUid: string): Promise<{ leveledUp: boolean; newLevel: number }> => {
      // API handles level up dynamically when incrementing
      return { leveledUp: false, newLevel: 1 };
    },
    []
  );

  const getProgress = useCallback(
    async (userUid: string): Promise<UserProgress | null> => {
      try {
        const res = await apiFetch(`${BASE_URL}/api/progress/${userUid}`);
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },
    []
  );

  return { checkLevelUp, getProgress, TASKS_PER_LEVEL };
}
