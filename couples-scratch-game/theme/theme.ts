import { StyleSheet } from "react-native";

// ─── Color Themes ────────────────────────────────────────────────────────────

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
  accent: "#d946ef",
  accentSecondary: "#8b5cf6",
  accentGradient: ["#8b5cf6", "#d946ef"] as [string, string],
  primaryGradient: ["#8b5cf6", "#d946ef"] as [string, string],
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  // Nav bar
  nav: {
    bg: "rgba(255,255,255,0.92)",
    border: "rgba(168,85,247,0.15)",
    active: "#d946ef",
    inactive: "#9ca3af",
  },
};

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
  accent: "#d946ef",
  accentSecondary: "#8b5cf6",
  accentGradient: ["#8b5cf6", "#d946ef"] as [string, string],
  primaryGradient: ["#8b5cf6", "#d946ef"] as [string, string],
  success: "#34d399",
  warning: "#fbbf24",
  error: "#f87171",
  nav: {
    bg: "rgba(21,0,37,0.95)",
    border: "rgba(255,255,255,0.1)",
    active: "#d946ef",
    inactive: "rgba(220,180,255,0.4)",
  },
};

export type AppTheme = typeof lightTheme;

export function getTheme(isDark: boolean): AppTheme {
  return isDark ? darkTheme : lightTheme;
}

// ─── Font Families ───────────────────────────────────────────────────────────

export const FONTS = {
  heading: "DynaPuff_700Bold",
  body: "Nunito_700Bold",
};

// ─── Global Font Styles (Typography) ─────────────────────────────────────────

export const fontStyles = StyleSheet.create({
  // Headings and Titles (DynaPuff_700Bold only)
  h1: {
    fontFamily: FONTS.heading,
    fontSize: 28,
  },
  h2: {
    fontFamily: FONTS.heading,
    fontSize: 24,
  },
  h3: {
    fontFamily: FONTS.heading,
    fontSize: 20,
  },
  h4: {
    fontFamily: FONTS.heading,
    fontSize: 16,
  },
  h5: {
    fontFamily: FONTS.heading,
    fontSize: 14,
  },

  // Descriptions, Subtexts, Subtitles, Paragraphs, Content (Nunito_700Bold)
  body: {
    fontFamily: FONTS.body,
    fontSize: 16,
  },
  description: {
    fontFamily: FONTS.body,
    fontSize: 15,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  subtext: {
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  caption: {
    fontFamily: FONTS.body,
    fontSize: 12,
  },
  label: {
    fontFamily: FONTS.body,
    fontSize: 10,
  },
});
