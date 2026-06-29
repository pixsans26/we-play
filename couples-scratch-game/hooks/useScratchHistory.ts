import { env } from "@/lib/env";
import { apiFetch } from "@/lib/apiClient";
import { useCallback } from "react";
import { selectNextTask, getCategoriesForLevel } from "@/lib/taskSelection";
import { useGameStore } from "@/store/gameStore";
import { HistoryEntry, Task, ImageTask } from "@/types";

const API_URL = env.EXPO_PUBLIC_API_URL;

export interface LogScratchParams {
  userUid: string;
  taskId: string;
  taskType: "text" | "image" | "lottery" | "spin_wheel";
  category?: string;
  completed: boolean;
  skipped: boolean;
  timeTaken?: number;
  performerUid?: string;
}

export interface UseScratchHistoryReturn {
  getNextTask: (
    userUid: string,
    taskType: "text" | "image",
    currentLevel: number
  ) => Promise<Task | ImageTask | null>;
  logScratch: (params: LogScratchParams) => Promise<void>;
  resetHistory: (userUid: string, entryId?: number, taskType?: string) => Promise<void>;
  getSeenIds: (userUid: string, taskType: "text" | "image" | "lottery" | "spin_wheel") => Promise<string[]>;
  getHistory: (userUid: string) => Promise<HistoryEntry[]>;
  getAllHistory: (partnerAUid: string, partnerBUid: string | null) => Promise<HistoryEntry[]>;
}

export function useScratchHistory(): UseScratchHistoryReturn {
  const getSeenIds = useCallback(
    async (userUid: string, taskType: "text" | "image" | "lottery" | "spin_wheel"): Promise<string[]> => {
      try {
        const res = await apiFetch(`${API_URL}/api/history?partnerAUid=${userUid}&_t=${Date.now()}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data
          .filter((d: any) => d.taskType === taskType && (d.completed === true || d.completed === 1 || String(d.completed) === "true" || String(d.completed) === "1" || d.timeTaken === -1))
          .map((d: any) => d.taskId);
      } catch {
        return [];
      }
    },
    []
  );

  const getNextTask = useCallback(
    async (
      userUid: string,
      taskType: "text" | "image",
      currentLevel: number
    ): Promise<Task | ImageTask | null> => {
      const seenIds = await getSeenIds(userUid, taskType);
      const store = useGameStore.getState();
      const pool = taskType === "text" ? store.textTasks : store.imageTasks;
      const unlockedCategories =
        taskType === "text" ? getCategoriesForLevel(currentLevel) : undefined;
      return selectNextTask(
        pool as (Task | ImageTask)[],
        seenIds,
        currentLevel,
        unlockedCategories
      );
    },
    [getSeenIds]
  );

  const logScratch = useCallback(async (params: LogScratchParams): Promise<void> => {
    try {
      await apiFetch(`${API_URL}/api/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
    } catch (e) {
      console.warn("Failed to log scratch to API", e);
    }
  }, []);

  const resetHistory = useCallback(async (userUid: string, entryId?: number, taskType?: string): Promise<void> => {
    try {
      let url = `${API_URL}/api/history/reset?uid=${userUid}`;
      if (entryId) url += `&entryId=${entryId}`;
      if (taskType) url += `&taskType=${taskType}`;
      await apiFetch(url, { method: "DELETE" });
    } catch (e) {
      console.warn("Failed to reset history", e);
    }
  }, []);

  const getHistory = useCallback(async (userUid: string): Promise<HistoryEntry[]> => {
    try {
      const res = await apiFetch(`${API_URL}/api/history?partnerAUid=${userUid}&_t=${Date.now()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.reverse();
    } catch {
      return [];
    }
  }, []);

  const getAllHistory = useCallback(
    async (partnerAUid: string, partnerBUid: string | null): Promise<HistoryEntry[]> => {
      try {
        let url = `${API_URL}/api/history?partnerAUid=${partnerAUid}&_t=${Date.now()}`;
        if (partnerBUid) url += `&partnerBUid=${partnerBUid}`;
        const res = await apiFetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return data.reverse();
      } catch {
        return [];
      }
    },
    []
  );

  return {
    getNextTask,
    logScratch,
    resetHistory,
    getSeenIds,
    getHistory,
    getAllHistory,
  };
}
