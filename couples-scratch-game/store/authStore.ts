import { create } from "zustand";
import { User } from "firebase/auth";
import { CoupleProfile } from "@/types";

interface AuthState {
  user: User | null;
  isPartnerA: boolean;
  coupleProfile: CoupleProfile | null;
  sessionToken: string | null;
  isLoading: boolean;
  setUser: (u: User | null) => void;
  setIsPartnerA: (v: boolean) => void;
  setCoupleProfile: (p: CoupleProfile | null) => void;
  setSessionToken: (t: string | null) => void;
  setIsLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isPartnerA: true,
  coupleProfile: null,
  sessionToken: null,
  isLoading: true,
  setUser: (u) => set({ user: u }),
  setIsPartnerA: (v) => set({ isPartnerA: v }),
  setCoupleProfile: (p) => set({ coupleProfile: p }),
  setSessionToken: (t) => set({ sessionToken: t }),
  setIsLoading: (v) => set({ isLoading: v }),
}));
