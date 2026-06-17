import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HistoryEntry } from "@/types";

interface HistoryState {
  historyAll: HistoryEntry[];
  setHistoryAll: (h: HistoryEntry[]) => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      historyAll: [],
      setHistoryAll: (h) => set({ historyAll: h }),
    }),
    {
      name: "history-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
