import { env } from "@/lib/env";
import { create } from "zustand";
import { Task, ImageTask } from "@/types";
import { apiFetch } from "@/lib/apiClient";

interface GameState {
  mode: "image" | "text" | null;
  currentTask: Task | ImageTask | null;
  previousTask: Task | ImageTask | null;
  timerStarted: boolean;
  timerFinished: boolean;
  isScratched: boolean;
  performingPartnerName: string | null;
  currentTurn: "A" | "B";
  lastPlayedDate: string | null;
  streak: number;
  spinCount: number;
  setMode: (m: "image" | "text") => void;
  setCurrentTask: (t: Task | ImageTask | null) => void;
  setPreviousTask: (t: Task | ImageTask | null) => void;
  setTimerStarted: (v: boolean) => void;
  setTimerFinished: (v: boolean) => void;
  setIsScratched: (v: boolean) => void;
  setPerformingPartnerName: (name: string | null) => void;
  setCurrentTurn: (turn: "A" | "B") => void;
  switchTurn: () => void;
  setLastPlayedDate: (date: string | null) => void;
  setStreak: (n: number) => void;
  updateStreak: () => void;
  incrementSpinCount: () => void;
  setSpinCount: (n: number) => void;
  textTasks: Task[];
  imageTasks: ImageTask[];
  spinTasks: any[];
  lotteryData: any;
  isDataLoaded: boolean;
  fetchData: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  mode: null as "image" | "text" | null,
  currentTask: null as Task | ImageTask | null,
  previousTask: null as Task | ImageTask | null,
  timerStarted: false,
  timerFinished: false,
  isScratched: false,
  performingPartnerName: null as string | null,
  currentTurn: "A" as "A" | "B",
  lastPlayedDate: null as string | null,
  streak: 0,
  spinCount: 0,
  textTasks: [],
  imageTasks: [],
  spinTasks: [],
  lotteryData: { col1: [], col2: [], col3: [] },
  isDataLoaded: false,
};

import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setMode: (m) => set({ mode: m }),
      setCurrentTask: (t) => set({ currentTask: t }),
      setPreviousTask: (t) => set({ previousTask: t }),
      setTimerStarted: (v) => set({ timerStarted: v }),
      setTimerFinished: (v) => set({ timerFinished: v }),
      setIsScratched: (v) => set({ isScratched: v }),
      setPerformingPartnerName: (name) => set({ performingPartnerName: name }),
      setCurrentTurn: (turn) => set({ currentTurn: turn }),
      switchTurn: () => set((s) => ({ currentTurn: s.currentTurn === "A" ? "B" : "A" })),
      setLastPlayedDate: (date) => set({ lastPlayedDate: date }),
      setStreak: (n) => set({ streak: n }),
      incrementSpinCount: () => set((state) => ({ spinCount: state.spinCount + 1 })),
      setSpinCount: (n) => set({ spinCount: n }),
      updateStreak: () => {
        const today = new Date().toISOString().split("T")[0];
        const { lastPlayedDate, streak } = get();
        if (lastPlayedDate === today) return;

        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        if (lastPlayedDate === yesterday) {
          set({ streak: streak + 1, lastPlayedDate: today });
        } else {
          set({ streak: 1, lastPlayedDate: today });
        }
      },
      fetchData: async () => {
        try {
          const BASE_URL = (env.EXPO_PUBLIC_API_URL) + "/api";
          const ts = Date.now();
          const [txt, img, spin, lot] = await Promise.all([
            apiFetch(`${BASE_URL}/tasks/text?_t=${ts}`).then(r => { if (!r.ok) throw new Error(`Text tasks failed: ${r.status}`); return r.json(); }),
            apiFetch(`${BASE_URL}/tasks/image?_t=${ts}`).then(r => { if (!r.ok) throw new Error(`Image tasks failed: ${r.status}`); return r.json(); }),
            apiFetch(`${BASE_URL}/tasks/spin?_t=${ts}`).then(r => { if (!r.ok) throw new Error(`Spin tasks failed: ${r.status}`); return r.json(); }),
            apiFetch(`${BASE_URL}/tasks/lottery?_t=${ts}`).then(r => { if (!r.ok) throw new Error(`Lottery tasks failed: ${r.status}`); return r.json(); }),
          ]);

          const safeTxt = Array.isArray(txt) ? txt : [];
          const safeImg = Array.isArray(img) ? img : [];
          const safeSpin = Array.isArray(spin) ? spin : [];
          const safeLot = Array.isArray(lot) ? lot : [];

          const formattedLottery = {
            col1: safeLot.filter((i: any) => i.columnType === "action" && i.active).map((i: any) => ({ label: i.label, type: i.actionType, level: i.level })),
            col2: safeLot.filter((i: any) => i.columnType === "spot" && i.active).map((i: any) => ({ label: i.label, level: i.level })),
            col3: safeLot.filter((i: any) => i.columnType === "extra" && i.active).map((i: any) => ({ label: i.label, type: i.actionType, level: i.level }))
          };

          set({ textTasks: safeTxt, imageTasks: safeImg, spinTasks: safeSpin, lotteryData: formattedLottery, isDataLoaded: true });
        } catch (err) {
          console.error("Failed to fetch game data:", err);
          throw err; // Re-throw so _layout.tsx can catch it and show the DB error screen
        }
      },
      reset: () => set((state) => ({ 
        ...initialState, 
        currentTurn: state.currentTurn, 
        lastPlayedDate: state.lastPlayedDate, 
        streak: state.streak, 
        spinCount: state.spinCount,
        textTasks: state.textTasks,
        imageTasks: state.imageTasks,
        spinTasks: state.spinTasks,
        lotteryData: state.lotteryData,
        isDataLoaded: state.isDataLoaded
      })),
    }),
    {
      name: "game-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist non-volatile state
        currentTurn: state.currentTurn,
        lastPlayedDate: state.lastPlayedDate,
        streak: state.streak,
        spinCount: state.spinCount,
        textTasks: state.textTasks,
        imageTasks: state.imageTasks,
        spinTasks: state.spinTasks,
        lotteryData: state.lotteryData,
      }),
    }
  )
);
