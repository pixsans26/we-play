import { env } from "@/lib/env";
import { apiFetch, getAvatarUrl, getAvatarSource } from "@/lib/apiClient";
import React, { useEffect, useState, useRef } from "react";
import { View, Text, Pressable, ScrollView, Animated, Easing, Image, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "@/components/CustomBlurView";

import { useAuthStore } from "@/store/authStore";
import { useThemeStore, getTheme } from "@/store/themeStore";
import { useScratchHistory } from "@/hooks/useScratchHistory";
import { LEVEL_BADGES } from "@/types";
import { FadingEdgeMask } from "@/components/FadingEdgeMask/FadingEdgeMask";
import { GradientIcon } from "@/components/GradientIcon";

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const coupleProfile = useAuthStore((s) => s.coupleProfile);
  const isPartnerA = useAuthStore((s) => s.isPartnerA);
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);
  const { getAllHistory } = useScratchHistory();

  const [currentLevel, setCurrentLevel] = useState(1);
  const [completedCount, setCompletedCount] = useState(0);
  const [imageCount, setImageCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [spinCount, setSpinCount] = useState(0);
  const [lotteryCount, setLotteryCount] = useState(0);

  const bgAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      loadProgress();
    }, [coupleProfile, isPartnerA])
  );

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bgAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  async function loadProgress() {
    if (!coupleProfile) return;
    try {
      const BASE_URL = env.EXPO_PUBLIC_API_URL;

      const resA = await apiFetch(`${BASE_URL}/api/progress/${coupleProfile.partnerAUid}`);
      let pA = { currentLevel: 1, scratchCount: 0, completedCount: 0 };
      if (resA.ok) {
        const dataA = await resA.json();
        pA = {
          currentLevel: dataA.currentLevel ?? 1,
          scratchCount: dataA.scratchCount ?? 0,
          completedCount: dataA.completedCount ?? 0,
        };
      }

      let pB = { currentLevel: 1, scratchCount: 0, completedCount: 0 };
      if (coupleProfile.partnerBUid) {
        const resB = await apiFetch(`${BASE_URL}/api/progress/${coupleProfile.partnerBUid}`);
        if (resB.ok) {
          const dataB = await resB.json();
          pB = {
            currentLevel: dataB.currentLevel ?? 1,
            scratchCount: dataB.scratchCount ?? 0,
            completedCount: dataB.completedCount ?? 0,
          };
        }
      }

      const activeProgress = isPartnerA ? pA : pB;
      setCurrentLevel(activeProgress.currentLevel);
      setCompletedCount(activeProgress.completedCount);

      const partnerBUidFallback = coupleProfile.partnerBUid || `partner_b_pending_${coupleProfile.id || "0"}`;
      const history = await getAllHistory(coupleProfile.partnerAUid, partnerBUidFallback);

      const myUid = isPartnerA
        ? coupleProfile.partnerAUid
        : (coupleProfile.partnerBUid || `partner_b_pending_${coupleProfile.id || "0"}`);

      // Per-game totals = A + B combined (total couple plays)
      setImageCount(history.filter((h) => h.taskType === "image" && h.completed).length);
      setTaskCount(history.filter((h) => h.taskType === "text" && h.completed).length);
      setSpinCount(history.filter((h) => h.taskType === "spin_wheel" && h.completed).length);
      setLotteryCount(history.filter((h) => h.taskType === "lottery" && h.completed).length);
    } catch (err) {
      console.error("Failed to load progress", err);
    }
  }

  const badge = LEVEL_BADGES[currentLevel] ?? LEVEL_BADGES[5];
  const partnerAName = coupleProfile?.partnerAName ?? "Partner A";
  const partnerBName = coupleProfile?.partnerBName ?? "Partner B";

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
        <View>
          <Text style={{ color: isDark ? "#ffffff" : "#0f172a", fontSize: 24, fontWeight: "900", fontFamily: "DynaPuff_700Bold", textShadowColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>Our Profile</Text>
          <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(15,23,42,0.8)", fontSize: 13, marginTop: 1 }}>Your couple stats</Text>
        </View>
      </View>

      <FadingEdgeMask style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >

          {/* Couple hero */}
          <View style={{ marginBottom: 20 }}>
            <LinearGradient
              colors={theme.accentGradient as any}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ borderRadius: 32, overflow: "hidden", padding: 24, alignItems: "center" }}
            >
              {/* Avatars */}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {coupleProfile?.partnerAAvatar ? (
                    <Image source={getAvatarSource(coupleProfile.partnerAAvatar)} style={{ width: "100%", height: "100%", borderRadius: 30 }} resizeMode="cover" />
                  ) : (
                    <MaterialCommunityIcons name={coupleProfile?.partnerAGender?.toLowerCase() === "female" ? "face-woman" : coupleProfile?.partnerAGender?.toLowerCase() === "male" ? "face-man" : "account"} size={36} color="rgba(255,255,255,0.7)" style={{ marginTop: 2 }} />
                  )}
                </View>
                <View style={{ marginHorizontal: -8, width: 36, height: 36, borderRadius: 32, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.4)", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                  <GradientIcon name="heart" size={18} />
                </View>
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {coupleProfile?.partnerBAvatar ? (
                    <Image source={getAvatarSource(coupleProfile.partnerBAvatar)} style={{ width: "100%", height: "100%", borderRadius: 30 }} resizeMode="cover" />
                  ) : (
                    <MaterialCommunityIcons name={coupleProfile?.partnerBGender?.toLowerCase() === "female" ? "face-woman" : coupleProfile?.partnerBGender?.toLowerCase() === "male" ? "face-man" : "account"} size={36} color="rgba(255,255,255,0.7)" style={{ marginTop: 2 }} />
                  )}
                </View>
              </View>
              <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "900", fontFamily: "DynaPuff_700Bold", marginBottom: 4, textShadowColor: "rgba(0,0,0,0.3)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
                {partnerAName} & {partnerBName}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.2)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 32, overflow: "hidden" }}>
                <Text style={{ fontSize: 18 }}>{badge.emoji}</Text>
                <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "800" }}>
                  Level {currentLevel} • {badge.label}
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* Stats cards */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            <View style={{ width: "48%", borderRadius: 32, overflow: "hidden" }}>
              <LinearGradient colors={isDark ? [theme.card.bg as string, theme.card.bg as string] : ["#eff6ff", "#ffffff"]} style={{ flex: 1, borderRadius: 24, padding: 16, alignItems: "center", borderWidth: 1, borderColor: theme.card.border, shadowColor: isDark ? "transparent" : "#3b82f6", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.05, shadowRadius: 8, elevation: isDark ? 0 : 2 }}>
                <Ionicons name="image-outline" size={24} color="#3b82f6" style={{ marginBottom: 4 }} />
                <Text style={{ color: isDark ? "#ffffff" : "#0f172a", fontSize: 18, fontWeight: "800", fontFamily: "DynaPuff_700Bold" }}>{imageCount}</Text>
                <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "#64748b", fontSize: 10, marginTop: 2, fontWeight: "700" }}>Moments</Text>
              </LinearGradient>
            </View>
            <View style={{ width: "48%", borderRadius: 32, overflow: "hidden" }}>
              <LinearGradient colors={isDark ? [theme.card.bg as string, theme.card.bg as string] : ["#f0fdf4", "#ffffff"]} style={{ flex: 1, borderRadius: 24, padding: 16, alignItems: "center", borderWidth: 1, borderColor: theme.card.border, shadowColor: isDark ? "transparent" : "#10b981", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.05, shadowRadius: 8, elevation: isDark ? 0 : 2 }}>
                <Ionicons name="document-text-outline" size={24} color="#10b981" style={{ marginBottom: 4 }} />
                <Text style={{ color: isDark ? "#ffffff" : "#0f172a", fontSize: 18, fontWeight: "800", fontFamily: "DynaPuff_700Bold" }}>{taskCount}</Text>
                <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "#64748b", fontSize: 10, marginTop: 2, fontWeight: "700" }}>Missions</Text>
              </LinearGradient>
            </View>
            <View style={{ width: "48%", borderRadius: 32, overflow: "hidden" }}>
              <LinearGradient colors={isDark ? [theme.card.bg as string, theme.card.bg as string] : ["#fffbeb", "#ffffff"]} style={{ flex: 1, borderRadius: 24, padding: 16, alignItems: "center", borderWidth: 1, borderColor: theme.card.border, shadowColor: isDark ? "transparent" : "#fbbf24", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.05, shadowRadius: 8, elevation: isDark ? 0 : 2 }}>
              <Ionicons name="disc-outline" size={24} color="#f59e0b" style={{ marginBottom: 4 }} />
              <Text style={{ color: isDark ? "#ffffff" : "#0f172a", fontSize: 18, fontWeight: "800", fontFamily: "DynaPuff_700Bold" }}>{spinCount}</Text>
              <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "#64748b", fontSize: 10, marginTop: 2, fontWeight: "700" }}>Spins</Text>
            </LinearGradient>
            </View>
            <View style={{ width: "48%", borderRadius: 32, overflow: "hidden" }}>
              <LinearGradient colors={isDark ? [theme.card.bg as string, theme.card.bg as string] : ["#fdf2f8", "#ffffff"]} style={{ flex: 1, borderRadius: 24, padding: 16, alignItems: "center", borderWidth: 1, borderColor: theme.card.border, shadowColor: isDark ? "transparent" : theme.accent, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.05, shadowRadius: 8, elevation: isDark ? 0 : 2 }}>
                <GradientIcon name="dice-outline" size={24} style={{ marginBottom: 4 }} />
                <Text style={{ color: isDark ? "#ffffff" : "#0f172a", fontSize: 18, fontWeight: "800", fontFamily: "DynaPuff_700Bold" }}>{lotteryCount}</Text>
                <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "#64748b", fontSize: 10, marginTop: 2, fontWeight: "700" }}>Heart Draws</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Partner A card */}
          <LinearGradient colors={isDark ? [theme.card.bg as string, theme.card.bg as string] : ["#fdf2f8", "#ffffff"]} style={{ borderRadius: 24, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: theme.card.border, shadowColor: isDark ? "transparent" : theme.accent, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.05, shadowRadius: 8, elevation: isDark ? 0 : 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, overflow: "hidden", backgroundColor: isDark ? "rgba(233,30,140,0.3)" : "#fce7f3", alignItems: "center", justifyContent: "center" }}>
                {coupleProfile?.partnerAAvatar ? (
                  <Image source={getAvatarSource(coupleProfile.partnerAAvatar)} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <MaterialCommunityIcons name={coupleProfile?.partnerAGender?.toLowerCase() === "female" ? "face-woman" : coupleProfile?.partnerAGender?.toLowerCase() === "male" ? "face-man" : "account"} size={28} color={isDark ? "#fbcfe8" : "#db2777"} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Text style={{ color: isDark ? "#ffffff" : "#0f172a", fontSize: 17, fontWeight: "800", fontFamily: "DynaPuff_700Bold" }}>{partnerAName}</Text>
                </View>
                <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "#475569", fontSize: 13, marginTop: 2, fontWeight: "600" }}>
                  {coupleProfile?.partnerAAge ? `Age ${coupleProfile.partnerAAge}` : ""}
                  {coupleProfile?.partnerAAge && coupleProfile?.partnerAGender ? " · " : ""}
                  {coupleProfile?.partnerAGender ?? ""}
                </Text>
              </View>
              {isPartnerA && (
                <View style={{ backgroundColor: "#10b981", borderRadius: 999, overflow: "hidden", paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "900", fontFamily: "DynaPuff_700Bold" }}>YOU</Text>
                </View>
              )}
            </View>
          </LinearGradient>

          {/* Partner B card */}
          <LinearGradient colors={isDark ? [theme.card.bg as string, theme.card.bg as string] : ["#faf5ff", "#ffffff"]} style={{ borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: theme.card.border, shadowColor: isDark ? "transparent" : "#a855f7", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.05, shadowRadius: 8, elevation: isDark ? 0 : 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, overflow: "hidden", backgroundColor: isDark ? "rgba(168,85,247,0.3)" : "#f3e8ff", alignItems: "center", justifyContent: "center" }}>
                {coupleProfile?.partnerBAvatar ? (
                  <Image source={getAvatarSource(coupleProfile.partnerBAvatar)} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <MaterialCommunityIcons name={coupleProfile?.partnerBGender?.toLowerCase() === "female" ? "face-woman" : coupleProfile?.partnerBGender?.toLowerCase() === "male" ? "face-man" : "account"} size={28} color={isDark ? "#e9d5ff" : "#9333ea"} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Text style={{ color: isDark ? "#ffffff" : "#0f172a", fontSize: 17, fontWeight: "800", fontFamily: "DynaPuff_700Bold" }}>{partnerBName}</Text>
                </View>
                <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "#475569", fontSize: 13, marginTop: 2, fontWeight: "600" }}>
                  {coupleProfile?.partnerBAge ? `Age ${coupleProfile.partnerBAge}` : ""}
                  {coupleProfile?.partnerBAge && coupleProfile?.partnerBGender ? " · " : ""}
                  {coupleProfile?.partnerBGender ?? ""}
                </Text>
              </View>
              {!isPartnerA && (
                <View style={{ backgroundColor: "#10b981", borderRadius: 999, overflow: "hidden", paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "900", fontFamily: "DynaPuff_700Bold" }}>YOU</Text>
                </View>
              )}
            </View>
          </LinearGradient>

          {/* Account */}
          <View style={{ borderRadius: 32, overflow: "hidden", marginBottom: 20 }}>
            <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{ borderRadius: 32, overflow: "hidden", padding: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Ionicons name="mail-outline" size={18} color={isDark ? "#ffffff" : "#4c0519"} />
                <Text style={{ color: isDark ? "#ffffff" : "#4c0519", fontSize: 14, fontWeight: "600" }}>{user?.email ?? "No email"}</Text>
              </View>
            </BlurView>
          </View>

          {/* History */}
          <View style={{ borderRadius: 999, overflow: "hidden" }}>
            <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{ borderRadius: 999, overflow: "hidden" }}>
              <Pressable
                onPress={() => router.push("/(game)/history")}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  paddingVertical: 15,
                  backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                })}
              >
                <Ionicons name="heart" size={20} color={isDark ? "#ffffff" : "#4c0519"} />
                <Text style={{ color: isDark ? "#ffffff" : "#4c0519", fontSize: 16, fontWeight: "800", fontFamily: "DynaPuff_700Bold", textShadowColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>Our History</Text>
              </Pressable>
            </BlurView>
          </View>

          {/* Footer info */}
          <View style={{ alignItems: "center", marginTop: 24, marginBottom: 24 }}>
            <Text style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)", fontSize: 12, fontWeight: "700" }}>
              Keep scratching to level up!
            </Text>
          </View>
        </ScrollView>
      </FadingEdgeMask>
    </LinearGradient>
  );
}
