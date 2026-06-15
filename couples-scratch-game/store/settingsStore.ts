import { create } from "zustand";

interface SettingsState {
  soundEnabled: boolean;
  biometricEnabled: boolean;
  toggleSound: () => void;
  toggleBiometric: () => void;
  setSound: (enabled: boolean) => void;
  setBiometric: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  soundEnabled: true,
  biometricEnabled: false,
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  toggleBiometric: () => set((state) => ({ biometricEnabled: !state.biometricEnabled })),
  setSound: (enabled) => set({ soundEnabled: enabled }),
  setBiometric: (enabled) => set({ biometricEnabled: enabled }),
}));
