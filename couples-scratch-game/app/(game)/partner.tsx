import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, Modal, Alert, Image, Share, StyleSheet, TextInput, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Calendar } from "react-native-calendars";

import { useThemeStore, getTheme } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { useCycleStore } from "@/store/cycleStore";
import { calculateCyclePredictions, generatePredictionCalendarMarks, CyclePredictions } from "@/lib/cycleCalculations";
import { env } from "@/lib/env";
import { apiFetch, getAvatarUrl, getAvatarSource } from "@/lib/apiClient";
import { useNotificationStore } from "@/store/notificationStore";
import * as Clipboard from 'expo-clipboard';
import { FadingEdgeMask } from "@/components/FadingEdgeMask/FadingEdgeMask";
import { BlurView } from "@/components/CustomBlurView";
import MaskedView from "@react-native-masked-view/masked-view";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { GradientIcon } from "@/components/GradientIcon";
import { GradientText } from "@/components/GradientText";

const formatDate = (date: Date) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${weekdays[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
};

const formatDateShort = (date: Date) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
};

export default function PartnerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);

  const coupleProfile = useAuthStore((s) => s.coupleProfile);
  const isPartnerA = useAuthStore((s) => s.isPartnerA);

  const cycleConfig = useCycleStore((s) => s.cycleConfig);
  const fetchCycleConfig = useCycleStore((s) => s.fetchCycleConfig);
  const updateCycleConfig = useCycleStore((s) => s.updateCycleConfig);
  const isLoading = useCycleStore((s) => s.isLoading);
  const hasUnreadNotifications = useNotificationStore((s) => s.hasUnread);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const setCoupleProfile = useAuthStore((s) => s.setCoupleProfile);
  const setIsPartnerA = useAuthStore((s) => s.setIsPartnerA);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const user = useAuthStore((s) => s.user);

  const handleJoinPartner = async () => {
    if (!inviteCodeInput || inviteCodeInput.trim().length < 4) {
      Alert.alert("Invalid Code", "Please enter a valid invite code.");
      return;
    }
    if (!user || !sessionToken) return;

    setIsJoining(true);
    try {
      const trimmed = inviteCodeInput.trim().toUpperCase();
      const res = await apiFetch(`${env.EXPO_PUBLIC_API_URL}/api/couple/invite/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${sessionToken}` },
        body: JSON.stringify({ uid: user.uid, inviteCode: trimmed })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        Alert.alert("Connection Failed", errorData.error || "Invalid invite code or already linked.");
        return;
      }

      const data = await res.json();
      setIsPartnerA(false);
      setCoupleProfile({
        id: data.id,
        partnerAUid: data.partnerAUid,
        partnerBUid: data.partnerBUid ?? null,
        partnerAName: data.partnerAName,
        partnerBName: data.partnerBName ?? null,
        partnerAAge: data.partnerAAge ?? null,
        partnerBAge: data.partnerBAge ?? null,
        partnerAAvatar: data.partnerAAvatar ?? null,
        partnerBAvatar: data.partnerBAvatar ?? null,
        partnerAGender: data.partnerAGender ?? null,
        partnerBGender: data.partnerBGender ?? null,
        whatALikes: data.whatALikes ?? null,
        whatBLikes: data.whatBLikes ?? null,
        status: data.status ?? null,
        inviteCode: data.inviteCode ?? null,
      });

      Alert.alert("Success!", "You are now connected with your partner.");
    } catch (err) {
      Alert.alert("Error", "Could not connect. Please try again later.");
    } finally {
      setIsJoining(false);
    }
  };

  // Form State
  const [lastPeriodStart, setLastPeriodStart] = useState("");
  const [lastPeriodEnd, setLastPeriodEnd] = useState("");
  const [cycleLength, setCycleLength] = useState("28");
  const [predictions, setPredictions] = useState<any>(null);

  useEffect(() => {
    fetchCycleConfig();
  }, [fetchCycleConfig]);

  useEffect(() => {
    if (cycleConfig?.lastPeriodStart) {
      const preds = calculateCyclePredictions(cycleConfig.lastPeriodStart, cycleConfig.averageCycleLength);
      setPredictions(preds);
      setLastPeriodStart(cycleConfig.lastPeriodStart);
      setLastPeriodEnd(cycleConfig.lastPeriodEnd || "");
      setCycleLength(String(cycleConfig.averageCycleLength));
    }
  }, [cycleConfig]);

  const handleSaveConfig = async () => {
    if (!lastPeriodStart) {
      Alert.alert("Error", "Please provide a valid Last Period Start Date (YYYY-MM-DD)");
      return;
    }
    const parsedLength = parseInt(cycleLength, 10);
    if (isNaN(parsedLength) || parsedLength < 20 || parsedLength > 45) {
      Alert.alert("Error", "Cycle length should be between 20 and 45 days.");
      return;
    }

    await updateCycleConfig({
      lastPeriodStart,
      lastPeriodEnd: lastPeriodEnd || null,
      averageCycleLength: parsedLength,
    });

    setIsModalOpen(false);
  };

  const handleDayPress = async (day: any) => {
    const dateStr = day.dateString;
    let newStart = lastPeriodStart;
    let newEnd = lastPeriodEnd;

    if (!lastPeriodStart || (lastPeriodStart && lastPeriodEnd)) {
      newStart = dateStr;
      newEnd = "";
      setLastPeriodStart(newStart);
      setLastPeriodEnd(newEnd);
    } else {
      const start = new Date(lastPeriodStart);
      const selected = new Date(dateStr);
      if (selected >= start) {
        newEnd = dateStr;
        setLastPeriodEnd(newEnd);
      } else {
        newStart = dateStr;
        newEnd = "";
        setLastPeriodStart(newStart);
        setLastPeriodEnd(newEnd);
      }
    }

    // Auto-sync
    const parsedLength = parseInt(cycleLength, 10);
    if (!isNaN(parsedLength) && parsedLength >= 20 && parsedLength <= 45) {
      await updateCycleConfig({
        lastPeriodStart: newStart,
        lastPeriodEnd: newEnd || null,
        averageCycleLength: parsedLength,
      });
    }
  };

  const handleCycleLengthChange = async (lenStr: string) => {
    setCycleLength(lenStr);
    const parsedLength = parseInt(lenStr, 10);
    if (lastPeriodStart && !isNaN(parsedLength) && parsedLength >= 20 && parsedLength <= 45) {
      await updateCycleConfig({
        lastPeriodStart,
        lastPeriodEnd: lastPeriodEnd || null,
        averageCycleLength: parsedLength,
      });
    }
  };

  const getMarkedDates = () => {
    const marked: any = {};
    if (lastPeriodStart && !lastPeriodEnd) {
      marked[lastPeriodStart] = { startingDay: true, endingDay: true, color: theme.accent, textColor: "#fff" };
    } else if (lastPeriodStart && lastPeriodEnd) {
      let curr = new Date(lastPeriodStart);
      const end = new Date(lastPeriodEnd);
      while (curr <= end) {
        const dStr = curr.toISOString().split("T")[0];
        marked[dStr] = {
          startingDay: dStr === lastPeriodStart,
          endingDay: dStr === lastPeriodEnd,
          color: theme.accent,
          textColor: "#fff"
        };
        curr.setDate(curr.getDate() + 1);
      }
    }
    return marked;
  };

  const CYCLE_LENGTHS = Array.from({ length: 13 }, (_, i) => i + 23); // 23 to 35

  const myPartnerName = isPartnerA ? coupleProfile?.partnerBName : coupleProfile?.partnerAName;
  const myPartnerAge = isPartnerA ? coupleProfile?.partnerBAge : coupleProfile?.partnerAAge;
  const myPartnerGender = isPartnerA ? coupleProfile?.partnerBGender : coupleProfile?.partnerAGender;
  const myPartnerAvatar = isPartnerA ? coupleProfile?.partnerBAvatar : coupleProfile?.partnerAAvatar;

  const myGender = isPartnerA ? coupleProfile?.partnerAGender : coupleProfile?.partnerBGender;
  const myAvatar = isPartnerA ? coupleProfile?.partnerAAvatar : coupleProfile?.partnerBAvatar;
  const isMeFemale = myGender?.toLowerCase() === "female";
  const isSingleMale = coupleProfile?.status === "pending" && !isMeFemale;

  const displayAvatarPath = isMeFemale ? myAvatar : myPartnerAvatar;
  const displayAvatarSource = getAvatarSource(displayAvatarPath);
  const displayName = myPartnerName || "Partner";
  const displayAge = myPartnerAge ? `${myPartnerAge} yrs` : "";

  const defaultPredictions = {
    currentPhase: "Unconfigured",
    daysUntilNextPeriod: 0,
    nextPeriodDate: null,
    nextOvulationDate: null,
    fertileWindowStart: null,
    fertileWindowEnd: null,
    isFertile: false,
    pregnancyRisk: "Unknown",
    safeSex: false,
    partnerMood: "Please configure cycle to see predictions.",
    partnerDesires: "Please configure cycle to see predictions.",
  };

  const activePredictions = predictions || defaultPredictions;

  if (isSingleMale) {
    return (
      <View style={{ flex: 1 }}>
        <AnimatedBackground currentPhase="Unconfigured" isDark={isDark} />

        {/* Fixed Blurred Header with Fade at Bottom */}
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
              paddingTop: insets.top + 12,
              paddingBottom: 20,
              paddingHorizontal: 22,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 24, overflow: "hidden", borderWidth: isDark ? 0 : 2, borderColor: theme.glass.border }}>
              <View style={{ flex: 1, backgroundColor: theme.glass.bg, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="person" size={24} color={theme.card.subtext} />
              </View>
            </View>
            <Pressable onPress={() => router.push("/notifications")} style={{ padding: 8 }}>
              <View style={{ position: "relative" }}>
                <Ionicons name="notifications-outline" size={28} color={theme.card.text} />
                {hasUnreadNotifications && (
                  <View style={{ position: "absolute", top: 2, right: 3, width: 10, height: 10, borderRadius: 5, backgroundColor: "#ff2d6b", borderWidth: isDark ? 0 : 2, borderColor: isDark ? "rgba(21, 0, 37, 1)" : "rgba(255, 255, 255, 1)" }} />
                )}
              </View>
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 70, paddingHorizontal: 22, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Invitation Content */}
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 16 }}>
            <View style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
              alignItems: "center", justifyContent: "center",
              borderWidth: isDark ? 0 : 2, borderColor: theme.accent,
            }}>
              <Ionicons name="heart-outline" size={40} color={theme.accent} />
            </View>

            <View style={{ gap: 6, alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontFamily: "DynaPuff_700Bold", fontSize: 24, color: theme.card.text, textAlign: "center" }}>
                  Invite Your Partner
                </Text>
                <Ionicons name="people" size={26} color={theme.card.text} />
              </View>
              <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 14, color: theme.card.subtext, textAlign: "center", lineHeight: 20 }}>
                Connect with your partner to start tracking her period cycle together and unlock sharing moods and desires.
              </Text>
            </View>

            {coupleProfile?.inviteCode ? (
              <Pressable
                onPress={async () => {
                  if (coupleProfile?.inviteCode) {
                    await Clipboard.setStringAsync(coupleProfile.inviteCode);
                    Alert.alert("Copied!", "Invite code copied to clipboard.");
                  }
                }}
                style={{
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                  borderRadius: 24, borderWidth: isDark ? 0 : 2, borderColor: theme.accent,
                  paddingHorizontal: 40, paddingVertical: 16, alignItems: "center", width: "100%"
                }}
              >
                <Text style={{ color: theme.card.subtext, fontSize: 12, fontFamily: "Nunito_700Bold", marginBottom: 6, letterSpacing: 2 }}>INVITE CODE</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text style={{ color: theme.accent, fontSize: 28, fontFamily: "Nunito_700Bold", letterSpacing: 6 }}>{coupleProfile.inviteCode}</Text>
                  <Ionicons name="copy-outline" size={22} color={theme.accent} />
                </View>
              </Pressable>
            ) : (
              <Text style={{ color: theme.card.subtext, fontSize: 14 }}>Generating your invite code...</Text>
            )}

            <Pressable
              onPress={async () => {
                if (!coupleProfile?.inviteCode) return;
                try {
                  const shareMessage = `Join me on WePlay using this invite code: ${coupleProfile.inviteCode}`;
                  await Share.share({ message: shareMessage });
                } catch (err) {
                  console.warn(err);
                }
              }}
              style={{ borderRadius: 32, overflow: "hidden", width: "100%", marginTop: 4, marginBottom: 16 }}
            >
              <LinearGradient
                colors={["#ff2d6b", "#a82dff"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10 }}
              >
                <Ionicons name="share-social-outline" size={22} color="#ffffff" />
                <Text style={{ color: "#ffffff", fontSize: 18, fontFamily: "DynaPuff_700Bold" }}>Share Invite Code</Text>
              </LinearGradient>
            </Pressable>

            <View style={{ width: "100%", height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", marginBottom: 16 }} />

            <Text style={{ color: theme.card.text, fontSize: 16, fontFamily: "DynaPuff_700Bold", textAlign: "center", marginBottom: 4 }}>
              Or enter partner's code
            </Text>
            <TextInput
              value={inviteCodeInput}
              onChangeText={setInviteCodeInput}
              placeholder="e.g. A1B2C3"
              placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
              autoCapitalize="characters"
              maxLength={10}
              style={{
                width: "100%",
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                borderWidth: isDark ? 0 : 1, borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                borderRadius: 16, padding: 12,
                color: theme.card.text, fontSize: 16, textAlign: "center", fontFamily: "Nunito_700Bold",
                marginBottom: 8
              }}
            />
            <Pressable
              onPress={handleJoinPartner}
              disabled={isJoining || inviteCodeInput.trim().length < 4}
              style={({ pressed }) => ({
                width: "100%",
                backgroundColor: isJoining || inviteCodeInput.trim().length < 4 ? "rgba(156, 163, 175, 0.5)" : "#10b981",
                borderRadius: 16, padding: 14, alignItems: "center",
                opacity: pressed ? 0.8 : 1
              })}
            >
              {isJoining ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={{ color: "#ffffff", fontSize: 16, fontFamily: "Nunito_700Bold",  }}>Connect Partner</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AnimatedBackground currentPhase={activePredictions.currentPhase} isDark={isDark} />

      {/* Fixed Blurred Header with Fade at Bottom */}
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
            paddingTop: insets.top + 12,
            paddingBottom: 20,
            paddingHorizontal: 22,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ width: 48, height: 48, borderRadius: 24, overflow: "hidden", borderWidth: isDark ? 0 : 2, borderColor: theme.glass.border }}>
            {displayAvatarSource ? (
              <Image source={displayAvatarSource} style={{ width: "100%", height: "100%", borderRadius: 24 }} />
            ) : (
              <View style={{ flex: 1, backgroundColor: theme.glass.bg, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="person" size={24} color={theme.card.subtext} />
              </View>
            )}
          </View>
          <Pressable
            onPress={() => router.push("/notifications")}
            style={{ padding: 8 }}
          >
            <View style={{ position: "relative" }}>
              <Ionicons name="notifications-outline" size={28} color={theme.card.text} />
              {hasUnreadNotifications && (
                <View style={{ position: "absolute", top: 2, right: 3, width: 10, height: 10, borderRadius: 5, backgroundColor: "#ff2d6b", borderWidth: isDark ? 0 : 2, borderColor: isDark ? "rgba(21, 0, 37, 1)" : "rgba(255, 255, 255, 1)" }} />
              )}
            </View>
          </Pressable>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {/* Content */}
        <FadingEdgeMask style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 80, paddingBottom: 120, paddingHorizontal: 22 }}>

            {/* Top Period Hero Section */}
            <View style={{ alignItems: "center", marginBottom: 40 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <Ionicons name="water" size={20} color="#ef4444" style={{ marginRight: 8 }} />
                <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 20, color: theme.card.text }}>
                  Period
                </Text>
              </View>
              <Text style={{ fontFamily: "DynaPuff_700Bold", fontSize: 32, color: theme.card.text, textAlign: "center" }}>
                {activePredictions.daysUntilNextPeriod} Days Left
              </Text>
              <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 18, color: theme.card.subtext, marginTop: 8 }}>
                {activePredictions.nextPeriodDate ? formatDateShort(activePredictions.nextPeriodDate) : "Not Set"} - Next Period
              </Text>

              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 24 }}>
                <Pressable
                  onPress={() => setIsModalOpen(true)}
                  style={{ borderRadius: 28, overflow: "hidden" }}
                >
                  <LinearGradient
                    colors={theme.accentGradient as any}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ paddingHorizontal: 32, paddingVertical: 14 }}
                  >
                    <Text style={{ fontFamily: "Nunito_700Bold", color: "#fff", fontSize: 18, textAlign: "center" }}>
                      {cycleConfig?.lastPeriodStart ? "Update Period Date" : "Configure"}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>

            <Pressable onPress={() => router.push("/calendar")}>

              {/* Insight Cards Row 1 */}
              <View style={{ flexDirection: "row", gap: 16, marginBottom: 16 }}>

                {/* Ovulation Day Card */}
                <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{ flex: 1, borderRadius: 24, overflow: "hidden" }}>
                  <LinearGradient
                    colors={isDark ? [theme.card.bg as string, theme.card.bg as string] : ["#faf5ff", "#ffffff"]}
                    style={{ flex: 1, padding: 20, borderWidth: isDark ? 0 : 1, borderColor: theme.card.border, shadowColor: isDark ? "transparent" : "#a855f7", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: isDark ? 0 : 2 }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? "rgba(168,85,247,0.15)" : "#ffffff", shadowColor: isDark ? "transparent" : "#a855f7", shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: isDark ? 0 : 4, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                      <MaterialCommunityIcons name="flower" size={20} color="#a855f7" />
                    </View>
                    <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 14, color: theme.card.subtext, marginBottom: 4 }}>Ovulation</Text>
                    <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 24, color: isDark ? theme.card.text : "#0f172a", marginBottom: 4 }}>
                      {activePredictions.nextOvulationDate ? formatDateShort(activePredictions.nextOvulationDate as Date) : "N/A"}
                    </Text>
                    <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 13, color: isDark ? "#ef4444" : "#dc2626" }}>High Pregnancy Risk</Text>
                  </LinearGradient>
                </BlurView>

                {/* Safe Sex Card */}
                <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{ flex: 1, borderRadius: 24, overflow: "hidden" }}>
                  <LinearGradient
                    colors={isDark ? [theme.card.bg as string, theme.card.bg as string] : activePredictions.safeSex ? ["#f0fdf4", "#ffffff"] : ["#f8fafc", "#ffffff"]}
                    style={{ flex: 1, padding: 20, borderWidth: isDark ? 0 : 1, borderColor: theme.card.border, shadowColor: isDark ? "transparent" : (activePredictions.safeSex ? "#22c55e" : "#6b7280"), shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: isDark ? 0 : 2 }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? (activePredictions.safeSex ? "rgba(34,197,94,0.15)" : "rgba(107,114,128,0.15)") : "#ffffff", shadowColor: isDark ? "transparent" : (activePredictions.safeSex ? "#22c55e" : "#6b7280"), shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: isDark ? 0 : 4, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                      <Ionicons name="shield-checkmark" size={20} color={activePredictions.safeSex ? "#22c55e" : theme.card.subtext} />
                    </View>
                    <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 14, color: theme.card.subtext, marginBottom: 4 }}>Safe Sex</Text>
                    <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 24, color: activePredictions.safeSex ? (isDark ? "#22c55e" : "#16a34a") : (isDark ? theme.card.subtext : "#475569"), marginBottom: 4 }}>
                      {activePredictions.safeSex ? "Yes" : "No"}
                    </Text>
                    <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 13, color: activePredictions.safeSex ? (isDark ? "#22c55e" : "#16a34a") : (isDark ? theme.card.subtext : "#475569") }}>Based on Cycle</Text>
                  </LinearGradient>
                </BlurView>

              </View>

              {/* Fertility Window Card */}
              <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{ borderRadius: 24, overflow: "hidden", marginBottom: 16 }}>
                <LinearGradient
                  colors={isDark ? [theme.card.bg as string, theme.card.bg as string] : ["#faf5ff", "#ffffff"]}
                  style={{ padding: 20, borderWidth: isDark ? 0 : 1, borderColor: theme.card.border, shadowColor: isDark ? "transparent" : "#9333ea", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: isDark ? 0 : 2 }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? "rgba(147,51,234,0.15)" : "#ffffff", shadowColor: isDark ? "transparent" : "#9333ea", shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: isDark ? 0 : 4, alignItems: "center", justifyContent: "center", marginRight: 16 }}>
                      <Ionicons name="pulse" size={20} color="#9333ea" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 14, color: theme.card.subtext }}>Fertility Window</Text>
                      <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 24, color: isDark ? theme.card.text : "#0f172a" }}>
                        {activePredictions.fertileWindowStart ? formatDateShort(activePredictions.fertileWindowStart as Date) : "N/A"} - {activePredictions.fertileWindowEnd ? formatDateShort(activePredictions.fertileWindowEnd as Date) : "N/A"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.card.subtext} />
                  </View>
                </LinearGradient>
              </BlurView>

              {/* Moods and Desires Widget */}
              <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{ borderRadius: 24, overflow: "hidden", marginBottom: 16 }}>
                <LinearGradient
                  colors={isDark ? [theme.card.bg as string, theme.card.bg as string] : ["#fdf2f8", "#ffffff"]}
                  style={{ padding: 20, borderWidth: isDark ? 0 : 1, borderColor: theme.card.border, shadowColor: isDark ? "transparent" : theme.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: isDark ? 0 : 2 }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? "rgba(236,72,153,0.15)" : "#ffffff", shadowColor: isDark ? "transparent" : theme.accent, shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: isDark ? 0 : 4, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                      <GradientIcon name="heart" size={18} />
                    </View>
                    <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 18, color: isDark ? theme.card.text : "#0f172a" }}>Phase: {activePredictions.currentPhase}</Text>
                  </View>

                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 14, color: theme.card.subtext, marginBottom: 4 }}>
                      {isMeFemale ? "Your Current Mood" : "Current Mood"}
                    </Text>
                    <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 16, color: isDark ? theme.card.text : "#0f172a" }}>
                      {activePredictions.partnerMood}
                    </Text>
                  </View>

                  <View>
                    <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 14, color: theme.card.subtext, marginBottom: 4 }}>
                      {isMeFemale ? "What You Might Want" : "What She Might Want"}
                    </Text>
                    <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 16, color: isDark ? theme.card.text : "#0f172a" }}>
                      {activePredictions.partnerDesires}
                    </Text>
                  </View>
                </LinearGradient>
              </BlurView>

            </Pressable>
          </ScrollView>
        </FadingEdgeMask>
      </View>

      {/* Configuration Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: insets.bottom + 24, backgroundColor: isDark ? "rgba(30,0,53,0.85)" : "rgba(255,255,255,0.85)", overflow: "hidden" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <Text style={{ fontFamily: "DynaPuff_700Bold", fontSize: 22, color: theme.card.text }}>Cycle Settings</Text>
              <Pressable onPress={() => setIsModalOpen(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.glass.bg, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close" size={20} color={theme.card.text} />
              </Pressable>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 15, color: theme.card.text, marginBottom: 8 }}>Select Period Dates</Text>
              <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 13, color: theme.card.subtext, marginBottom: 12 }}>Tap start date, then tap end date.</Text>
              <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: isDark ? 0 : 1, borderColor: theme.glass.border }}>
                <Calendar
                  onDayPress={handleDayPress}
                  markingType={'period'}
                  markedDates={getMarkedDates()}
                  monthFormat={'MMMM yyyy'}
                  theme={{
                    calendarBackground: theme.glass.bg,
                    textSectionTitleColor: theme.card.subtext,
                    dayTextColor: theme.card.text,
                    todayTextColor: theme.accent,
                    selectedDayTextColor: "#ffffff",
                    monthTextColor: theme.card.text,
                    arrowColor: theme.accent,
                    textDayFontFamily: "Nunito_700Bold",
                    textMonthFontFamily: "DynaPuff_700Bold",
                    textDayHeaderFontFamily: "Nunito_700Bold",
                  }}
                />
              </View>
            </View>

            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 15, color: theme.card.text, marginBottom: 12 }}>Average Cycle Length (Days)</Text>
              <View style={{ height: 60 }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 10, alignItems: "center", gap: 10 }}
                >
                  {CYCLE_LENGTHS.map((len) => {
                    const isSelected = String(len) === cycleLength;
                    return (
                      <Pressable
                        key={len}
                        onPress={() => handleCycleLengthChange(String(len))}
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 25,
                          backgroundColor: theme.glass.bg,
                          borderWidth: isSelected ? 0 : 1,
                          borderColor: theme.glass.border,
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden"
                        }}
                      >
                        {isSelected ? (
                          <LinearGradient
                            colors={theme.accentGradient as any}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}
                          >
                            <Text style={{ color: "#fff", fontSize: 20, fontFamily: "DynaPuff_700Bold" }}>
                              {len}
                            </Text>
                          </LinearGradient>
                        ) : (
                          <Text style={{ color: theme.card.text, fontSize: 16, fontFamily: "DynaPuff_700Bold" }}>
                            {len}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <Pressable
              onPress={() => setIsModalOpen(false)}
              style={{ borderRadius: 24, overflow: "hidden", marginTop: 10 }}
            >
              <LinearGradient
                colors={theme.accentGradient as any}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 16, alignItems: "center" }}
              >
                <Text style={{ fontFamily: "Nunito_700Bold", color: "#fff", fontSize: 18 }}>Done</Text>
              </LinearGradient>
            </Pressable>

          </BlurView>
        </BlurView>
      </Modal>
    </View>
  );
}
