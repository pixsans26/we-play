import { env } from "@/lib/env";
import { apiFetch } from "@/lib/apiClient";
import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, Pressable, Alert, Switch,
  Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Animated, Easing
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "@/components/CustomBlurView";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
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
    <View style={{ borderRadius: 32, overflow: "hidden", marginBottom: 2 }}>
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed && onPress ? 0.75 : 1 })}>
        <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={{
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 32, overflow: "hidden",
          padding: 18,
          gap: 14,
        }}>
          <View style={{
            width: 42, height: 42, borderRadius: 32, overflow: "hidden",
            backgroundColor: danger ? (isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.1)") : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"),
            alignItems: "center", justifyContent: "center",

          }}>
            <Ionicons name={icon} size={20} color={danger ? "#fca5a5" : iconColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: danger ? "#ef4444" : (isDark ? "#ffffff" : "#0f172a"), fontSize: 16, fontWeight: "500", fontFamily: "DynaPuff_700Bold", textShadowColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>{label}</Text>
            {sublabel && <Text style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(15,23,42,0.7)", fontSize: 12, marginTop: 2 }}>{sublabel}</Text>}
          </View>
          {right}
        </BlurView>
      </Pressable>
    </View>
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

  // Edit profile modal state
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [nameA, setNameA] = useState(coupleProfile?.partnerAName ?? "");
  const [nameB, setNameB] = useState(coupleProfile?.partnerBName ?? "");
  const [genderA, setGenderA] = useState(coupleProfile?.partnerAGender ?? "");
  const [genderB, setGenderB] = useState(coupleProfile?.partnerBGender ?? "");
  const [likesA, setLikesA] = useState(coupleProfile?.whatALikes ?? "");
  const [likesB, setLikesB] = useState(coupleProfile?.whatBLikes ?? "");
  const [avatarA, setAvatarA] = useState(coupleProfile?.partnerAAvatar ?? null);
  const [avatarB, setAvatarB] = useState(coupleProfile?.partnerBAvatar ?? null);
  const [savingProfile, setSavingProfile] = useState(false);

  const pickImage = async (setAvatar: (uri: string) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatar(result.assets[0].uri);
    }
  };

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
              if (coupleProfile.partnerBUid) {
                await resetHistory(coupleProfile.partnerBUid);
              }

              // 2. Reset progress via API
              await apiFetch(`${BASE_URL}/api/progress`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userUid: coupleProfile.partnerAUid, scratchCount: 0, completedCount: 0, currentLevel: 1 })
              });

              if (coupleProfile.partnerBUid) {
                await apiFetch(`${BASE_URL}/api/progress`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userUid: coupleProfile.partnerBUid, scratchCount: 0, completedCount: 0, currentLevel: 1 })
                });
              }

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

  async function handleSaveProfile() {
    if (!coupleProfile) return;
    const trimA = nameA.trim();
    const trimB = nameB.trim();
    if (!trimA) { Alert.alert("Name required", "Partner A name cannot be empty."); return; }

    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append("partnerAUid", coupleProfile.partnerAUid);
      if (coupleProfile.partnerBUid) formData.append("partnerBUid", coupleProfile.partnerBUid);
      formData.append("partnerAName", trimA);
      if (trimB) formData.append("partnerBName", trimB);
      if (genderA.trim()) formData.append("partnerAGender", genderA.trim());
      if (genderB.trim()) formData.append("partnerBGender", genderB.trim());
      if (likesA.trim()) formData.append("whatALikes", likesA.trim());
      if (likesB.trim()) formData.append("whatBLikes", likesB.trim());

      if (avatarA && avatarA !== coupleProfile.partnerAAvatar) {
        const ext = avatarA.substring(avatarA.lastIndexOf(".") + 1) || "jpg";
        formData.append("partnerAAvatar", {
          uri: avatarA,
          name: `avatar_A.${ext}`,
          type: `image/${ext}`
        } as any);
      }
      
      if (avatarB && avatarB !== coupleProfile.partnerBAvatar) {
        const ext = avatarB.substring(avatarB.lastIndexOf(".") + 1) || "jpg";
        formData.append("partnerBAvatar", {
          uri: avatarB,
          name: `avatar_B.${ext}`,
          type: `image/${ext}`
        } as any);
      }

      const res = await apiFetch(`${BASE_URL}/api/couple`, {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        const savedProfile = await res.json();
        setCoupleProfile(savedProfile);
        setEditProfileVisible(false);
      } else {
        throw new Error("Failed to save");
      }
    } catch {
      Alert.alert("Error", "Could not save profile. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  }

  const heartColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.25)";

  return (
    <LinearGradient colors={theme.background as any} locations={[0, 0.5, 1]} style={{ flex: 1, paddingTop: 56 }}>
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

      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20, paddingHorizontal: 22 }}>
        <Pressable onPress={() => router.back()} style={{ borderRadius: 32, overflow: "hidden", marginRight: 14 }}>
          <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={{ width: 40, height: 40, borderRadius: 32, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="arrow-back" size={20} color={isDark ? "#ffffff" : "#4c0519"} />
          </BlurView>
        </Pressable>
        <Text style={{ color: isDark ? "#ffffff" : "#0f172a", fontSize: 24, fontWeight: "900", fontFamily: "DynaPuff_700Bold", textShadowColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>Settings</Text>
      </View>

      <FadingEdgeMask style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ marginBottom: 32 }}>
            <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(15,23,42,0.8)", fontSize: 13, marginTop: 1 }}>Customize your experience</Text>
          </View>

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
            <SettingRow
              isDark={isDark}
              icon="pencil"
              iconColor="#10b981"
              label="Edit Profile"
              sublabel="Update names, genders & likes"
              theme={theme}
              onPress={() => {
                setNameA(coupleProfile?.partnerAName ?? "");
                setNameB(coupleProfile?.partnerBName ?? "");
                setGenderA(coupleProfile?.partnerAGender ?? "");
                setGenderB(coupleProfile?.partnerBGender ?? "");
                setLikesA(coupleProfile?.whatALikes ?? "");
                setLikesB(coupleProfile?.whatBLikes ?? "");
                setEditProfileVisible(true);
              }}
              right={<Ionicons name="chevron-forward" size={18} color={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)"} />}
            />
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

          {/* App version */}
          <View style={{ alignItems: "center", marginTop: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Ionicons name="heart" size={14} color={theme.accent} />
              <Text style={{ color: theme.accent, fontSize: 13, fontWeight: "800" }}>WePlay</Text>
            </View>
            <Text style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(15,23,42,0.5)", fontSize: 11 }}>Version 1.0.0</Text>
          </View>

          {/* Logout Button */}
          <View style={{ alignItems: "center", marginTop: 32 }}>
            <Pressable onPress={handleLogout} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 32, overflow: "hidden", backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)" })}>
              <Text style={{ color: "#ef4444", fontSize: 13, fontWeight: "700" }}>Log Out</Text>
            </Pressable>
          </View>
        </ScrollView>
      </FadingEdgeMask>

      {/* ── Edit Profile Modal ── */}
      <Modal visible={editProfileVisible} animationType="slide" transparent onRequestClose={() => setEditProfileVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: "flex-end" }}>
          <LinearGradient colors={theme.background} style={{
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            borderTopWidth: 1,
            borderColor: "rgba(255,255,255,0.2)",
            padding: 28,
            paddingBottom: 40,
            maxHeight: "85%",
          }}>
            {/* Modal header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <View>
                <Text style={{ color: isDark ? "#fff" : "#1e0a2e", fontSize: 20, fontWeight: "900", fontFamily: "DynaPuff_700Bold" }}>Edit Profile</Text>
                <Text style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#6d4c8a", fontSize: 13, marginTop: 2 }}>Update your couple details</Text>
              </View>
              <Pressable
                onPress={() => setEditProfileVisible(false)}
                style={{ width: 36, height: 36, borderRadius: 32, overflow: "hidden", backgroundColor: "rgba(0,0,0,0.05)", borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="close" size={18} color={isDark ? "#fff" : "#1e0a2e"} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Partner A */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#6d4c8a", fontSize: 11, fontWeight: "700", marginBottom: 8, letterSpacing: 1 }}>
                  YOU
                </Text>
                <View style={{ gap: 10 }}>
                  {/* Avatar A Selection */}
                  <View style={{ alignItems: "center", marginBottom: 12 }}>
                    <Pressable onPress={() => pickImage(setAvatarA)} style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#f3e8ff", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(168,85,247,0.2)", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {avatarA ? (
                        <Image source={{ uri: avatarA }} style={{ width: "100%", height: "100%" }} />
                      ) : (
                        <Ionicons name="camera-outline" size={24} color={isDark ? "rgba(255,255,255,0.5)" : "#9333ea"} />
                      )}
                    </Pressable>
                  </View>

                  {/* Name A */}
                  <View style={{
                    flexDirection: "row", alignItems: "center",
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#ffffff",
                    borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(168,85,247,0.2)",
                    borderRadius: 32, overflow: "hidden", paddingHorizontal: 14,
                  }}>
                    <Ionicons name="person-outline" size={16} color={isDark ? "rgba(255,255,255,0.7)" : "#6d4c8a"} style={{ marginRight: 10 }} />
                    <TextInput
                      style={{ flex: 1, color: isDark ? "#fff" : "#1e0a2e", fontSize: 16, paddingVertical: 13 }}
                      placeholder="Name"
                      placeholderTextColor={isDark ? "rgba(255,255,255,0.4)" : "rgba(109,76,138,0.5)"}
                      value={nameA}
                      onChangeText={setNameA}
                      autoCapitalize="words"
                      maxLength={30}
                    />
                  </View>

                  <View style={{ marginTop: 2 }}>
                    <Text style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#6d4c8a", fontSize: 13, fontWeight: "600", marginBottom: 6, marginLeft: 4 }}>Gender</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {["Male", "Female", "Other"].map((option) => (
                        <Pressable
                          key={option}
                          onPress={() => setGenderA(option)}
                          style={{
                            flex: 1, paddingVertical: 10, alignItems: "center",
                            backgroundColor: genderA === option ? (isDark ? "rgba(168,85,247,0.3)" : "#f3e8ff") : (isDark ? "rgba(255,255,255,0.05)" : "#f8fafc"),
                            borderWidth: 1, borderColor: genderA === option ? "#a855f7" : (isDark ? "rgba(255,255,255,0.15)" : "#e2e8f0"),
                            borderRadius: 32, overflow: "hidden",
                          }}
                        >
                          <Text style={{
                            color: genderA === option ? (isDark ? "#fff" : "#9333ea") : (isDark ? "rgba(255,255,255,0.6)" : "#64748b"),
                            fontSize: 14, fontWeight: genderA === option ? "700" : "500",
                          }}>
                            {option}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Likes A */}
                  <View style={{
                    flexDirection: "row", alignItems: "center",
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#ffffff",
                    borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(168,85,247,0.2)",
                    borderRadius: 32, overflow: "hidden", paddingHorizontal: 14,
                  }}>
                    <Ionicons name="heart-outline" size={16} color={isDark ? "rgba(255,255,255,0.7)" : "#6d4c8a"} style={{ marginRight: 10 }} />
                    <TextInput
                      style={{ flex: 1, color: isDark ? "#fff" : "#1e0a2e", fontSize: 16, paddingVertical: 13 }}
                      placeholder="What do you like? (Optional)"
                      placeholderTextColor={isDark ? "rgba(255,255,255,0.4)" : "rgba(109,76,138,0.5)"}
                      value={likesA}
                      onChangeText={setLikesA}
                    />
                  </View>
                </View>
              </View>

              {/* Partner B */}
              <View style={{ marginBottom: 28 }}>
                <Text style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#6d4c8a", fontSize: 11, fontWeight: "700", marginBottom: 8, letterSpacing: 1 }}>
                  YOUR PARTNER
                </Text>
                <View style={{ gap: 10 }}>
                  {/* Avatar B Selection */}
                  <View style={{ alignItems: "center", marginBottom: 12 }}>
                    <Pressable onPress={() => pickImage(setAvatarB)} style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#f3e8ff", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(168,85,247,0.2)", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {avatarB ? (
                        <Image source={{ uri: avatarB }} style={{ width: "100%", height: "100%" }} />
                      ) : (
                        <Ionicons name="camera-outline" size={24} color={isDark ? "rgba(255,255,255,0.5)" : "#9333ea"} />
                      )}
                    </Pressable>
                  </View>

                  {/* Name B */}
                  <View style={{
                    flexDirection: "row", alignItems: "center",
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#ffffff",
                    borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(168,85,247,0.2)",
                    borderRadius: 32, overflow: "hidden", paddingHorizontal: 14,
                  }}>
                    <Ionicons name="person-outline" size={16} color={isDark ? "rgba(255,255,255,0.7)" : "#6d4c8a"} style={{ marginRight: 10 }} />
                    <TextInput
                      style={{ flex: 1, color: isDark ? "#fff" : "#1e0a2e", fontSize: 16, paddingVertical: 13 }}
                      placeholder="Name"
                      placeholderTextColor={isDark ? "rgba(255,255,255,0.4)" : "rgba(109,76,138,0.5)"}
                      value={nameB}
                      onChangeText={setNameB}
                      autoCapitalize="words"
                      maxLength={30}
                    />
                  </View>

                  <View style={{ marginTop: 2 }}>
                    <Text style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#6d4c8a", fontSize: 13, fontWeight: "600", marginBottom: 6, marginLeft: 4 }}>Gender</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {["Male", "Female", "Other"].map((option) => (
                        <Pressable
                          key={option}
                          onPress={() => setGenderB(option)}
                          style={{
                            flex: 1, paddingVertical: 10, alignItems: "center",
                            backgroundColor: genderB === option ? (isDark ? "rgba(168,85,247,0.3)" : "#f3e8ff") : (isDark ? "rgba(255,255,255,0.05)" : "#f8fafc"),
                            borderWidth: 1, borderColor: genderB === option ? "#a855f7" : (isDark ? "rgba(255,255,255,0.15)" : "#e2e8f0"),
                            borderRadius: 32, overflow: "hidden",
                          }}
                        >
                          <Text style={{
                            color: genderB === option ? (isDark ? "#fff" : "#9333ea") : (isDark ? "rgba(255,255,255,0.6)" : "#64748b"),
                            fontSize: 14, fontWeight: genderB === option ? "700" : "500",
                          }}>
                            {option}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Likes B */}
                  <View style={{
                    flexDirection: "row", alignItems: "center",
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#ffffff",
                    borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(168,85,247,0.2)",
                    borderRadius: 32, overflow: "hidden", paddingHorizontal: 14,
                  }}>
                    <Ionicons name="heart-outline" size={16} color={isDark ? "rgba(255,255,255,0.7)" : "#6d4c8a"} style={{ marginRight: 10 }} />
                    <TextInput
                      style={{ flex: 1, color: isDark ? "#fff" : "#1e0a2e", fontSize: 16, paddingVertical: 13 }}
                      placeholder="What do they like? (Optional)"
                      placeholderTextColor={isDark ? "rgba(255,255,255,0.4)" : "rgba(109,76,138,0.5)"}
                      value={likesB}
                      onChangeText={setLikesB}
                    />
                  </View>
                </View>
              </View>

              {/* Save button */}
              <Pressable
                onPress={handleSaveProfile}
                disabled={savingProfile}
                style={{ opacity: savingProfile ? 0.6 : 1, borderRadius: 999, overflow: "hidden", marginBottom: 20 }}
              >
                <LinearGradient
                  colors={["#e91e8c", "#7c3aed"] as any}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 999, overflow: "hidden"}}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                  <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "800", fontFamily: "DynaPuff_700Bold" }}>
                    {savingProfile ? "Saving..." : "Save Profile"}
                  </Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </LinearGradient>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
}
