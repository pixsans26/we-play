import { env } from "@/lib/env";
import { apiFetch, getAvatarUrl, getAvatarSource } from "@/lib/apiClient";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, Text, Pressable, ScrollView, Image, Animated, Easing, Share, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "@/components/CustomBlurView";
import MaskedView from "@react-native-masked-view/masked-view";

import { useAuthStore } from "@/store/authStore";
import { useGameStore } from "@/store/gameStore";
import { useThemeStore, getTheme } from "@/store/themeStore";
import { useNotificationStore } from "@/store/notificationStore";
import { UserProgress, LEVEL_BADGES } from "@/types";
import { FadingEdgeMask } from "@/components/FadingEdgeMask/FadingEdgeMask";

export default function MainGameScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const coupleProfile = useAuthStore((s) => s.coupleProfile);
  const isPartnerA = useAuthStore((s) => s.isPartnerA);
  const setMode = useGameStore((s) => s.setMode);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const streak = useGameStore((s) => s.streak);
  const updateStreak = useGameStore((s) => s.updateStreak);
  const fetchData = useGameStore((s) => s.fetchData);
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);
  const hasUnreadNotifications = useNotificationStore((s) => s.hasUnread);

  const [progressA, setProgressA] = useState<UserProgress | null>(null);
  const [progressB, setProgressB] = useState<UserProgress | null>(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [completedCount, setCompletedCount] = useState(0);

  const bgAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProgress();
    updateStreak();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bgAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [user, coupleProfile]);

  useFocusEffect(
    useCallback(() => {
      if (user && coupleProfile) {
        fetchData().catch((err) => console.error("Failed to revalidate data:", err));
      }
    }, [user, coupleProfile, fetchData])
  );

  async function loadProgress() {
    if (!coupleProfile) return;
    try {
      const BASE_URL = env.EXPO_PUBLIC_API_URL;

      const resA = await apiFetch(`${BASE_URL}/api/progress/${coupleProfile.partnerAUid}`);
      if (resA.ok) {
        const dataA = await resA.json();
        const pA: UserProgress = {
          id: dataA.id || 0,
          userUid: dataA.userUid,
          scratchCount: dataA.scratchCount ?? 0,
          completedCount: dataA.completedCount ?? 0,
          currentLevel: dataA.currentLevel ?? 1
        };
        setProgressA(pA);
        if (isPartnerA) { setCurrentLevel(pA.currentLevel); setCompletedCount(pA.completedCount); }
      }

      if (coupleProfile.partnerBUid) {
        const resB = await apiFetch(`${BASE_URL}/api/progress/${coupleProfile.partnerBUid}`);
        if (resB.ok) {
          const dataB = await resB.json();
          const pB: UserProgress = {
            id: dataB.id || 0,
            userUid: dataB.userUid,
            scratchCount: dataB.scratchCount ?? 0,
            completedCount: dataB.completedCount ?? 0,
            currentLevel: dataB.currentLevel ?? 1
          };
          setProgressB(pB);
          if (!isPartnerA) { setCurrentLevel(pB.currentLevel); setCompletedCount(pB.completedCount); }
        }
      }
    } catch (err) {
      console.error("Failed to load progress", err);
    }
  }

  const badge = LEVEL_BADGES[currentLevel] ?? LEVEL_BADGES[5];
  const partnerAName = coupleProfile?.partnerAName ?? "You";
  const partnerBName = coupleProfile?.partnerBName ?? "Partner";
  const displayName = isPartnerA 
    ? `${partnerAName} & ${partnerBName}` 
    : `${partnerBName} & ${partnerAName}`;
  const turnName = currentTurn === "A" ? partnerAName : partnerBName;
  const myGender = isPartnerA ? coupleProfile?.partnerAGender : coupleProfile?.partnerBGender;
  const myAvatarIcon = myGender?.toLowerCase() === "female" ? "face-woman" : myGender?.toLowerCase() === "male" ? "face-man" : "account";

  const progressInLevel = completedCount % 10;

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

      {/* Blurred Header with Fade at Bottom */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
        }}
      >
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <LinearGradient
              colors={["black", "black", "transparent"]}
              locations={[0, 0.6, 1]}
              style={{ flex: 1 }}
            />
          }
        >
          <BlurView
            intensity={80}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark ? "rgba(21, 0, 37, 0.4)" : "rgba(255, 255, 255, 0.4)",
              }
            ]}
          />
        </MaskedView>

        <View
          style={{
            paddingTop: 56,
            paddingBottom: 24,
            paddingHorizontal: 22,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(15,23,42,0.8)", fontSize: 13, fontWeight: "600", marginBottom: 2 }}>
              Welcome back 💕
            </Text>
            <Text style={{ color: isDark ? "#ffffff" : "#0f172a", fontSize: 24, fontWeight: "900", fontFamily: "DynaPuff_700Bold", textShadowColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
              {displayName}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <Pressable onPress={() => router.push("/notifications")} style={{ position: "relative" }}>
              <Ionicons name="notifications-outline" size={28} color={isDark ? "#ffffff" : "#0f172a"} />
              {hasUnreadNotifications && (
                <View style={{ position: "absolute", top: 2, right: 3, width: 10, height: 10, borderRadius: 5, backgroundColor: "#ff2d6b", borderWidth: 2, borderColor: isDark ? "rgba(21, 0, 37, 1)" : "rgba(255, 255, 255, 1)" }} />
              )}
            </Pressable>
            <Pressable onPress={() => router.push("/(game)/profile")} style={{ borderRadius: 32, overflow: "hidden" }}>
              <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={{ width: 44, height: 44, borderRadius: 32, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                {(isPartnerA ? coupleProfile?.partnerAAvatar : coupleProfile?.partnerBAvatar) ? (
                  <Image source={getAvatarSource(isPartnerA ? coupleProfile?.partnerAAvatar : coupleProfile?.partnerBAvatar)} style={{ width: "100%", height: "100%", borderRadius: 32 }} resizeMode="cover" />
                ) : (
                  <MaterialCommunityIcons name={myAvatarIcon} size={24} color={isDark ? "#ffffff" : "#4c0519"} style={{ marginTop: 2 }} />
                )}
              </BlurView>
            </Pressable>
          </View>
        </View>
      </View>

      <FadingEdgeMask style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 140, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >

          {/* Invite Partner Banner (if status is pending) */}
          {coupleProfile?.status === "pending" && isPartnerA && (
            <View style={{
              borderRadius: 32, overflow: "hidden", marginBottom: 20,
              borderWidth: 1.5, borderColor: theme.accent,
            }}>
              <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={{ padding: 20, alignItems: "center" }}>
                <Ionicons name="mail-open-outline" size={32} color={theme.accent} style={{ marginBottom: 8 }} />
                <Text style={{ color: theme.card.text, fontSize: 18, fontFamily: "DynaPuff_700Bold", textAlign: "center", marginBottom: 4 }}>
                  Invite Your Partner 💌
                </Text>
                <Text style={{ color: theme.card.subtext, fontSize: 13, textAlign: "center", fontFamily: "Nunito_700Bold", marginBottom: 12 }}>
                  Your partner needs to enter this code to connect:
                </Text>
                <View style={{
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                  borderRadius: 16, paddingHorizontal: 24, paddingVertical: 10,
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
                  marginBottom: 16,
                }}>
                  <Text style={{ color: theme.accent, fontSize: 24, fontFamily: "DynaPuff_700Bold", letterSpacing: 4 }}>
                    {coupleProfile.inviteCode || "PENDING"}
                  </Text>
                </View>
                <Pressable
                  onPress={async () => {
                    try {
                      const shareMessage = `Join me on WePlay using this invite code: ${coupleProfile.inviteCode || ""}`;
                      await Share.share({ message: shareMessage });
                    } catch (err) {
                      console.warn(err);
                    }
                  }}
                  style={{
                    backgroundColor: theme.accent,
                    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10,
                    flexDirection: "row", alignItems: "center", gap: 8,
                  }}
                >
                  <Ionicons name="share-social-outline" size={16} color="#ffffff" />
                  <Text style={{ color: "#ffffff", fontSize: 14, fontFamily: "Nunito_700Bold" }}>Share Invite Code</Text>
                </Pressable>
              </BlurView>
            </View>
          )}

          {/* Level + Streak hero card */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ borderRadius: 32, overflow: "hidden", position: "relative", backgroundColor: isDark ? theme.accentSecondary : theme.accent }}>
              {/* Animated Background */}
              <Animated.View style={{
                position: "absolute",
                width: "200%", height: "200%",
                top: "-50%", left: "-50%",
                transform: [
                  { rotate: bgAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] }) },
                  { scale: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }
                ]
              }}>
                <LinearGradient
                  colors={isDark ? ["#4c1d95", theme.accentSecondary, theme.accent, "#4c1d95"] : [theme.accentSecondary, theme.accent, "#ff8a00", theme.accentSecondary]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>

              <View style={{ padding: 22 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <View>
                    <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "700", marginBottom: 4 }}>
                      YOUR LEVEL
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ fontSize: 26 }}>{badge.emoji}</Text>
                      <View>
                        <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "900", fontFamily: "DynaPuff_700Bold" }}>Level {currentLevel}</Text>
                        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>{badge.label}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ alignItems: "center", backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 32, overflow: "hidden", paddingHorizontal: 16, paddingVertical: 10 }}>
                    <Ionicons name="flame" size={22} color="#fbbf24" />
                    <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "900", fontFamily: "DynaPuff_700Bold", marginTop: 2 }}>{streak}</Text>
                    <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Streak</Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>Progress to next level</Text>
                    <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "700" }}>{progressInLevel}/10</Text>
                  </View>
                  <View style={{ backgroundColor: "rgba(0,0,0,0.25)", borderRadius: 999, overflow: "hidden", height: 7 }}>
                    <View style={{ backgroundColor: "#ffffff", height: 7, borderRadius: 999, overflow: "hidden", width: `${(progressInLevel / 10) * 100}%` }} />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Whose turn */}
          <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{ borderRadius: 24, overflow: "hidden", marginBottom: 20 }}>
            <LinearGradient
              colors={isDark ? [theme.card.bg as string, theme.card.bg as string] : ["#fdf2f8", "#ffffff"]}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                borderWidth: 1,
                borderColor: theme.card.border,
                paddingVertical: 12,
                paddingHorizontal: 16,
              }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isDark ? "#ffffff" : theme.accent, marginRight: 10, shadowColor: isDark ? "#fff" : theme.accent, shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: {width: 0, height: 0} }} />
              <Text style={{ color: isDark ? "#ffffff" : theme.accent, fontSize: 14, fontWeight: "800", fontFamily: "Nunito_700Bold" }}>
                {turnName}'s turn to play
              </Text>
              <View style={{ flex: 1 }} />
              <Ionicons name="heart" size={16} color={isDark ? "#ffffff" : theme.accent} />
            </LinearGradient>
          </BlurView>

          {/* Game mode cards - 2x2 Grid */}
          <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(15,23,42,0.8)", fontSize: 12, fontWeight: "900", fontFamily: "DynaPuff_700Bold", marginBottom: 12, textShadowColor: isDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
            CHOOSE A GAME MODE
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
            {/* Hidden Moments */}
            <View style={{ width: "48%", marginBottom: 14, aspectRatio: 1, borderRadius: 32, overflow: "hidden" }}>
              <Pressable
                onPress={() => { setMode("image"); router.push("/(game)/image-scratch"); }}
                style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1, flex: 1, borderRadius: 32, overflow: "hidden" })}
              >
                <Image source={require("../../assets/images/hidden-moments.png")} style={{ width: "100%", height: "100%", position: "absolute" }} />
                {/* <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.9)"]}
                  style={{ flex: 1, padding: 16, justifyContent: "flex-end" }}
                >
                  <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "800", marginBottom: 2, fontFamily: "DynaPuff_700Bold", textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>Hidden Moments</Text>
                  <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>Reveal pictures</Text>
                </LinearGradient> */}
              </Pressable>
            </View>

            {/* Love Missions */}
            <View style={{ width: "48%", marginBottom: 14, aspectRatio: 1, borderRadius: 32, overflow: "hidden" }}>
              <Pressable
                onPress={() => { setMode("text"); router.push("/(game)/task-scratch"); }}
                style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1, flex: 1, borderRadius: 32, overflow: "hidden" })}
              >
                <Image source={require("../../assets/images/love-missions.png")} style={{ width: "100%", height: "100%", position: "absolute" }} />
                {/* <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.9)"]}
                  style={{ flex: 1, padding: 16, justifyContent: "flex-end" }}
                >
                  <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "800", marginBottom: 2, fontFamily: "DynaPuff_700Bold", textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>Love Missions</Text>
                  <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>Fun challenges</Text>
                </LinearGradient> */}
              </Pressable>
            </View>

            {/* Fate Wheel */}
            <View style={{ width: "48%", marginBottom: 14, aspectRatio: 1, borderRadius: 32, overflow: "hidden" }}>
              <Pressable
                onPress={() => router.push("/(game)/spin-wheel")}
                style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1, flex: 1, borderRadius: 32, overflow: "hidden" })}
              >
                <Image source={require("../../assets/images/fate-wheel.png")} style={{ width: "100%", height: "100%", position: "absolute" }} />
                {/* <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.9)"]}
                  style={{ flex: 1, padding: 16, justifyContent: "flex-end" }}
                >
                  <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "800", marginBottom: 2, fontFamily: "DynaPuff_700Bold", textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>Fate Wheel</Text>
                  <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>Win a reward</Text>
                </LinearGradient> */}
              </Pressable>
            </View>

            {/* Heart Draw */}
            <View style={{ width: "48%", marginBottom: 14, aspectRatio: 1, borderRadius: 32, overflow: "hidden" }}>
              <Pressable
                onPress={() => router.push("/(game)/lottery")}
                style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1, flex: 1, borderRadius: 32, overflow: "hidden" })}
              >
                <Image source={require("../../assets/images/heart-draw.png")} style={{ width: "100%", height: "100%", position: "absolute" }} />
                {/* <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.9)"]}
                  style={{ flex: 1, padding: 16, justifyContent: "flex-end" }}
                >
                  <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "800", marginBottom: 2, fontFamily: "DynaPuff_700Bold", textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>Heart Draw</Text>
                  <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>Fun generator</Text>
                </LinearGradient> */}
              </Pressable>
            </View>
          </View>


        </ScrollView>
      </FadingEdgeMask>
    </LinearGradient>
  );
}
