import { create } from "zustand";
import { env } from "@/lib/env";
import { useAuthStore } from "./authStore";

interface CycleTracking {
  coupleId: number | null;
  femaleUid: string | null;
  averageCycleLength: number;
  averagePeriodLength: number;
  lastPeriodStart: string | null;
  lastPeriodEnd: string | null;
  isLocked: boolean;
}

interface CycleStore {
  cycleConfig: CycleTracking | null;
  isLoading: boolean;
  error: string | null;
  fetchCycleConfig: () => Promise<void>;
  updateCycleConfig: (data: Partial<CycleTracking>) => Promise<void>;
}

export const useCycleStore = create<CycleStore>((set, get) => ({
  cycleConfig: null,
  isLoading: false,
  error: null,

  fetchCycleConfig: async () => {
    const { coupleProfile, user, sessionToken } = useAuthStore.getState();
    const identifier = coupleProfile?.id || user?.uid;
    if (!identifier) return;

    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/cycle/${identifier}`, {
        headers: {
          "Authorization": `Bearer ${sessionToken}`
        }
      });
      if (!res.ok) {
        if (res.status === 404) {
          // If not found, it's totally fine, means they haven't set it up yet.
          set({ cycleConfig: null, isLoading: false });
          return;
        }
        throw new Error("Failed to fetch cycle configuration");
      }
      const data = await res.json();
      set({ cycleConfig: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  updateCycleConfig: async (updates) => {
    const { coupleProfile, user, sessionToken } = useAuthStore.getState();
    const identifier = coupleProfile?.id || user?.uid;
    if (!identifier) return;

    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/cycle/${identifier}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update cycle configuration");
      const data = await res.json();
      set({ cycleConfig: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
}));
