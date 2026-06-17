import { create } from "zustand";

// ─── Light Theme ────────────────────────────────────────────────────────────
// Soft pastel lavender/rose — warm, romantic, airy
export const lightTheme = {
  background: ["#fce4f3", "#ede0ff", "#ddd6fe"] as [string, string, string],
  card: {
    bg: "#ffffff",
    border: "transparent",
    text: "#1e0a2e",
    subtext: "#6d4c8a",
    shadow: "rgba(168,85,247,0.15)",
  },
  glass: {
    bg: "rgba(255,255,255,0.75)",
    border: "transparent",
    tint: "rgba(236,72,153,0.06)",
  },
  input: {
    bg: "rgba(168,85,247,0.06)",
    border: "transparent",
    text: "#1e0a2e",
    placeholder: "rgba(109,76,138,0.5)",
  },
  accent: "#e91e8c",
  accentSecondary: "#7c3aed",
  accentGradient: ["#f953c6", "#b91d73"] as [string, string],
  primaryGradient: ["#e91e8c", "#7c3aed"] as [string, string],
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  // Nav bar
  nav: {
    bg: "rgba(255,255,255,0.92)",
    border: "rgba(168,85,247,0.15)",
    active: "#e91e8c",
    inactive: "#9ca3af",
  },
};

// ─── Dark Theme ─────────────────────────────────────────────────────────────
// Deep plum/purple-black — bold, romantic, vibrant
export const darkTheme = {
  background: ["#150025", "#1a0038", "#0d001a"] as [string, string, string],
  card: {
    bg: "rgba(255,255,255,0.07)",
    border: "transparent",
    text: "#f8f0ff",
    subtext: "rgba(220,180,255,0.7)",
    shadow: "rgba(168,85,247,0.3)",
  },
  glass: {
    bg: "rgba(255,255,255,0.08)",
    border: "transparent",
    tint: "rgba(236,72,153,0.08)",
  },
  input: {
    bg: "rgba(255,255,255,0.08)",
    border: "transparent",
    text: "#f8f0ff",
    placeholder: "rgba(220,180,255,0.4)",
  },
  accent: "#f953c6",
  accentSecondary: "#a855f7",
  accentGradient: ["#f953c6", "#7c3aed"] as [string, string],
  primaryGradient: ["#f953c6", "#7c3aed"] as [string, string],
  success: "#34d399",
  warning: "#fbbf24",
  error: "#f87171",
  nav: {
    bg: "rgba(21,0,37,0.95)",
    border: "rgba(255,255,255,0.1)",
    active: "#f953c6",
    inactive: "rgba(220,180,255,0.4)",
  },
};

export type AppTheme = typeof lightTheme;

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
}

import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: true,
      toggleTheme: () => set((s) => ({ isDark: !s.isDark })),
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export function getTheme(isDark: boolean): AppTheme {
  return isDark ? darkTheme : lightTheme;
}
