import { env } from "@/lib/env";
import { apiFetch, getAvatarUrl } from "@/lib/apiClient";
import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, Pressable, Alert, Switch,
  Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Animated, Easing, StyleSheet
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView as ExpoBlurView } from "expo-blur";
import { BlurView } from "@/components/CustomBlurView";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Asset } from "expo-asset";
import { Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore, getTheme } from "@/store/themeStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useHistoryStore } from "@/store/historyStore";
import { useScratchHistory } from "@/hooks/useScratchHistory";
import { FadingEdgeMask } from "@/components/FadingEdgeMask/FadingEdgeMask";

const BASE_URL = env.EXPO_PUBLIC_API_URL;

const PRESET_AVATARS_LOCAL = [
  { url: "/uploads/presets/avatar_boy.png", source: require("@/assets/images/avatars/avatar_boy.jpg") },
  { url: "/uploads/presets/avatar_girl.png", source: require("@/assets/images/avatars/avatar_girl.jpg") },
  { url: "/uploads/presets/avatar_cat.png", source: require("@/assets/images/avatars/avatar_cat.jpg") },
  { url: "/uploads/presets/avatar_dog.png", source: require("@/assets/images/avatars/avatar_dog.jpg") },
];

interface SettingRowProps {
  icon: any;
  iconColor: string;
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  theme: ReturnType<typeof getTheme>;
  danger?: boolean;
  isDark?: boolean;
}

function SettingRow({ icon, iconColor, label, sublabel, right, onPress, theme, danger, isDark }: SettingRowProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed && onPress ? 0.75 : 1, marginBottom: 8 })}>
      <LinearGradient
        colors={danger ? (isDark ? ["rgba(239,68,68,0.15)", "rgba(239,68,68,0.05)"] : ["#fef2f2", "#ffffff"]) : (isDark ? [theme.card.bg as string, theme.card.bg as string] : ["#f8fafc", "#ffffff"])}
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 24,
          padding: 18,
          gap: 14,
          borderWidth: 1,
          borderColor: theme.card.border,
          shadowColor: danger ? "#ef4444" : "#94a3b8", shadowOpacity: isDark ? 0 : 0.05, shadowRadius: 8, shadowOffset: {width:0, height:4}, elevation: isDark ? 0 : 2
        }}>
          <View style={{
            width: 42, height: 42, borderRadius: 21,
            backgroundColor: danger ? (isDark ? "rgba(239,68,68,0.2)" : "#fee2e2") : (isDark ? "rgba(255,255,255,0.1)" : "#ffffff"),
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name={icon} size={20} color={danger ? "#ef4444" : iconColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: danger ? "#ef4444" : (isDark ? "#ffffff" : "#0f172a"), fontSize: 16, fontWeight: "500", fontFamily: "DynaPuff_700Bold" }}>{label}</Text>
            {sublabel && <Text style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(15,23,42,0.7)", fontSize: 12, marginTop: 2 }}>{sublabel}</Text>}
          </View>
          {right}
      </LinearGradient>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const coupleProfile = useAuthStore((s) => s.coupleProfile);
  const setCoupleProfile = useAuthStore((s) => s.setCoupleProfile);
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const setHistoryAll = useHistoryStore((s) => s.setHistoryAll);
  const { resetHistory } = useScratchHistory();
  const theme = getTheme(isDark);

  const bgAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bgAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  function handleLogout() {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: async () => { await signOut(auth); setCoupleProfile(null); } },
    ]);
  }

  function handleResetHistory() {
    if (!user || !coupleProfile) return;
    Alert.alert(
      "Reset Everything",
      "This will clear all scratch history, reset scratch counts, and reset levels to 1 for both partners. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset All",
          style: "destructive",
          onPress: async () => {
            try {
              // 1. Delete all history rows using resetHistory hook
              await resetHistory(coupleProfile.partnerAUid);
              const partnerBUidFallback = coupleProfile.partnerBUid || `partner_b_pending_${coupleProfile.id || "0"}`;
              await resetHistory(partnerBUidFallback);

              // 2. Reset progress via API
              await apiFetch(`${BASE_URL}/api/progress`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userUid: coupleProfile.partnerAUid, scratchCount: 0, completedCount: 0, currentLevel: 1 })
              });

              await apiFetch(`${BASE_URL}/api/progress`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userUid: partnerBUidFallback, scratchCount: 0, completedCount: 0, currentLevel: 1 })
              });

              setHistoryAll([]);
              Alert.alert("Done", "Everything has been reset.");
            } catch {
              Alert.alert("Error", "Could not reset. Please try again.");
            }
          },
        },
      ]
    );
  }

  function handleDeleteAccount() {
    if (!user?.uid) return;
    const userUidStr = user.uid;
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This will permanently delete your couple profile and all your progress. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await apiFetch(`${BASE_URL}/api/couple/uid/${userUidStr}`, {
                method: "DELETE"
              });
              if (res.ok) {
                // Wipe local state
                await resetHistory(userUidStr);
                if (coupleProfile?.partnerBUid) await resetHistory(coupleProfile.partnerBUid);
                setHistoryAll([]);
                setCoupleProfile(null);
                await signOut(auth);
                Alert.alert("Account Deleted", "Your account has been successfully deleted.");
              } else {
                Alert.alert("Error", "Failed to delete account. Please try again.");
              }
            } catch (err) {
              console.warn("Delete account error:", err);
              Alert.alert("Error", "Could not delete account. Please try again later.");
            }
          }
        }
      ]
    );
  }

  const heartColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.25)";

  return (
    <LinearGradient colors={theme.background as any} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
      {/* Decorative Background Hearts */}
      <Animated.View style={{ position: "absolute", top: 80, left: -20, transform: [{ rotate: "-15deg" }, { translateY: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) }] }}>
        <Ionicons name="heart" size={120} color={heartColor} />
      </Animated.View>
      <Animated.View style={{ position: "absolute", top: 250, right: -10, transform: [{ rotate: "25deg" }, { translateY: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }) }] }}>
        <Ionicons name="heart" size={80} color={heartColor} />
      </Animated.View>
      <Animated.View style={{ position: "absolute", bottom: 150, left: 30, transform: [{ rotate: "-10deg" }, { translateY: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }] }}>
        <Ionicons name="heart" size={150} color={heartColor} />
      </Animated.View>

      {/* Blurred Header */}
      <BlurView
        intensity={80}
        tint={isDark ? "dark" : "light"}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          paddingTop: 56,
          paddingBottom: 16,
          paddingHorizontal: 22,
          flexDirection: "row",
          alignItems: "center",
          zIndex: 50,
          backgroundColor: isDark ? "rgba(21, 0, 37, 0.4)" : "rgba(255, 255, 255, 0.4)",
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
        }}
      >
        <View>
          <Text style={{ color: isDark ? "#ffffff" : "#0f172a", fontSize: 24, fontWeight: "900", fontFamily: "DynaPuff_700Bold", textShadowColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>Settings</Text>
          <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(15,23,42,0.8)", fontSize: 13, marginTop: 1, fontFamily: "Nunito_600SemiBold" }}>Customize your experience</Text>
        </View>
      </BlurView>

      <FadingEdgeMask style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 140, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >

          {/* Account */}
          <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(15,23,42,0.8)", fontSize: 11, fontWeight: "900", fontFamily: "DynaPuff_700Bold", marginBottom: 10, marginLeft: 4, letterSpacing: 1 }}>
            ACCOUNT
          </Text>
          <View style={{ gap: 10, marginBottom: 28 }}>
            <SettingRow
              isDark={isDark}
              icon="mail-outline"
              iconColor={theme.accent}
              label={user?.email ?? "No email"}
              sublabel="Signed in account"
              theme={theme}
            />
            <SettingRow icon="person-circle-outline" iconColor="#a855f7" label="Edit Profile" onPress={() => router.push("/(game)/edit-profile")} theme={theme} isDark={isDark} right={<Ionicons name="chevron-forward" size={16} color={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} />} />
            <SettingRow
              isDark={isDark}
              icon="refresh-circle-outline"
              iconColor="#f59e0b"
              label="Reset Progress"
              sublabel="Start over your stats and levels"
              theme={theme}
              onPress={handleResetHistory}
              right={<Ionicons name="chevron-forward" size={18} color={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)"} />}
            />
          </View>

          {/* Preferences */}
          <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(15,23,42,0.8)", fontSize: 11, fontWeight: "900", fontFamily: "DynaPuff_700Bold", marginBottom: 10, marginLeft: 4, letterSpacing: 1, marginTop: 10 }}>
            PREFERENCES
          </Text>
          <View style={{ gap: 10, marginBottom: 28 }}>
            <SettingRow
              isDark={isDark}
              icon={isDark ? "moon" : "sunny-outline"}
              iconColor={isDark ? "#a855f7" : "#f59e0b"}
              label="Dark Mode"
              sublabel={isDark ? "Switch to light theme" : "Switch to dark theme"}
              theme={theme}
              right={
                <Switch value={isDark} onValueChange={toggleTheme}
                  trackColor={{ false: "#d1d5db", true: "#a855f7" }} thumbColor="#ffffff" />
              }
            />
            <SettingRow
              isDark={isDark}
              icon={soundEnabled ? "volume-high" : "volume-mute"}
              iconColor={soundEnabled ? "#10b981" : "#059669"}
              label="Sound Effects"
              sublabel={soundEnabled ? "Sounds are on" : "Sounds are off"}
              theme={theme}
              right={
                <Switch value={soundEnabled} onValueChange={toggleSound}
                  trackColor={{ false: "#d1d5db", true: "#10b981" }} thumbColor="#ffffff" />
              }
            />
            <SettingRow
              isDark={isDark}
              icon="finger-print-outline"
              iconColor="#3b82f6"
              label="Biometric Sign-In"
              sublabel="Use Face ID / Touch ID"
              theme={theme}
              right={
                <Switch
                  value={useSettingsStore((s) => s.biometricEnabled)}
                  onValueChange={useSettingsStore((s) => s.toggleBiometric)}
                  trackColor={{ false: "#d1d5db", true: "#3b82f6" }} thumbColor="#ffffff"
                />
              }
            />
          </View>

          {/* About & Support */}
          <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(15,23,42,0.8)", fontSize: 11, fontWeight: "900", fontFamily: "DynaPuff_700Bold", marginBottom: 10, marginLeft: 4, letterSpacing: 1, marginTop: 10 }}>
            ABOUT & SUPPORT
          </Text>
          <View style={{ gap: 10, marginBottom: 28 }}>
            <SettingRow
              isDark={isDark}
              icon="help-circle-outline"
              iconColor="#3b82f6"
              label="FAQ"
              sublabel="Frequently asked questions"
              theme={theme}
              onPress={() => router.push("/(game)/content/faq")}
              right={<Ionicons name="chevron-forward" size={18} color={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)"} />}
            />
            <SettingRow
              isDark={isDark}
              icon="chatbubbles-outline"
              iconColor="#10b981"
              label="Support"
              sublabel="Get help with the app"
              theme={theme}
              onPress={() => router.push("/(game)/content/support")}
              right={<Ionicons name="chevron-forward" size={18} color={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)"} />}
            />
            <SettingRow
              isDark={isDark}
              icon="shield-checkmark-outline"
              iconColor="#a855f7"
              label="Privacy Policy"
              sublabel="How we protect your data"
              theme={theme}
              onPress={() => router.push("/(game)/content/privacy")}
              right={<Ionicons name="chevron-forward" size={18} color={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)"} />}
            />
            <SettingRow
              isDark={isDark}
              icon="information-circle-outline"
              iconColor="#f59e0b"
              label="Help"
              sublabel="App guides and info"
              theme={theme}
              onPress={() => router.push("/(game)/content/help")}
              right={<Ionicons name="chevron-forward" size={18} color={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)"} />}
            />
            <SettingRow
              isDark={isDark}
              icon="reader-outline"
              iconColor="#ef4444"
              label="About"
              sublabel="About the game"
              theme={theme}
              onPress={() => router.push("/(game)/content/about")}
              right={<Ionicons name="chevron-forward" size={18} color={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)"} />}
            />
          </View>



          {/* Logout & Delete Buttons */}
          <View style={{ alignItems: "center", marginTop: 32, gap: 16 }}>
            <Pressable onPress={handleLogout} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 32, overflow: "hidden", backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" })}>
              <Text style={{ color: isDark ? "#ffffff" : "#0f172a", fontSize: 13, fontWeight: "700" }}>Log Out</Text>
            </Pressable>

            <Pressable onPress={handleDeleteAccount} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 32, overflow: "hidden", backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)" })}>
              <Text style={{ color: "#ef4444", fontSize: 13, fontWeight: "700" }}>Delete Account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </FadingEdgeMask>
    </LinearGradient>
  );
}
