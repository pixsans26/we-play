import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SettingsState {
  soundEnabled: boolean;
  biometricEnabled: boolean;
  toggleSound: () => void;
  toggleBiometric: () => void;
  setSound: (enabled: boolean) => void;
  setBiometric: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      biometricEnabled: false,
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      toggleBiometric: () => set((state) => ({ biometricEnabled: !state.biometricEnabled })),
      setSound: (enabled) => set({ soundEnabled: enabled }),
      setBiometric: (enabled) => set({ biometricEnabled: enabled }),
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
