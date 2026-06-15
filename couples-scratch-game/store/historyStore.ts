import { create } from "zustand";
import { HistoryEntry } from "@/types";

interface HistoryState {
  historyAll: HistoryEntry[];
  setHistoryAll: (h: HistoryEntry[]) => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  historyAll: [],
  setHistoryAll: (h) => set({ historyAll: h }),
}));
