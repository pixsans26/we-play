import { env } from "@/lib/env";
import { apiFetch } from "@/lib/apiClient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Animated, Image, Easing, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "@/components/CustomBlurView";
import { useAuthStore } from "@/store/authStore";
import { useGameStore } from "@/store/gameStore";
import { useThemeStore, getTheme } from "@/store/themeStore";
import { useScratchHistory } from "@/hooks/useScratchHistory";
import { useTimer } from "@/hooks/useTimer";
import { useSound } from "@/hooks/useSound";
import { ScratchCard } from "@/components/ScratchCard/ScratchCard";
import HeartConfetti from "@/components/Confetti/HeartConfetti";
import { ImageTask } from "@/types";
import { safeDbWrite } from "@/lib/safeDbWrite";

function AnimatedButton({
  onPress,
  disabled,
  style,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  style: any;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function ImageScratchScreen() {
  const router = useRouter();

  // Auth & profile
  const user = useAuthStore((s) => s.user);
  const coupleProfile = useAuthStore((s) => s.coupleProfile);
  const isPartnerA = useAuthStore((s) => s.isPartnerA);

  // Game store
  const currentTask = useGameStore((s) => s.currentTask);
  const isScratched = useGameStore((s) => s.isScratched);
  const performingPartnerName = useGameStore((s) => s.performingPartnerName);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const setCurrentTask = useGameStore((s) => s.setCurrentTask);
  const setIsScratched = useGameStore((s) => s.setIsScratched);
  const setPerformingPartnerName = useGameStore(
    (s) => s.setPerformingPartnerName
  );
  const switchTurn = useGameStore((s) => s.switchTurn);
  const updateStreak = useGameStore((s) => s.updateStreak);
  const fetchData = useGameStore((s) => s.fetchData);
  const resetGameStore = useGameStore((s) => s.reset);

  // Theme
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);

  // Hooks
  const { getNextTask, logScratch, getAllHistory } = useScratchHistory();
  const { playScratch, playAlarm } = useSound();

  // Local state
  const [showConfetti, setShowConfetti] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [noTasksRemaining, setNoTasksRemaining] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [scratchCountA, setScratchCountA] = useState(0);
  const [scratchCountB, setScratchCountB] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [previousTask, setPreviousTask] = useState<ImageTask | null>(null);
  const [showPrevious, setShowPrevious] = useState(false);

  // Timer — 40 seconds, auto-starts 10s after scratch
  const TIMER_DURATION = 40;
  const { timeLeft, isRunning, isFinished, formattedTime, start, reset: resetTimer } = useTimer(TIMER_DURATION);
  const autoStartRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alarmPlayedRef = useRef(false);
  const timerStartTimeRef = useRef<number>(0);

  // Pulse animation for last 10s
  const pulseOpacity = useRef(new Animated.Value(1)).current;
  const pulseAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Fade-in animation for revealed content
  const revealOpacity = useRef(new Animated.Value(0)).current;

  // Background animated loop
  const bgAnim = useRef(new Animated.Value(0)).current;

  // Partner names
  const partnerAName = coupleProfile?.partnerAName ?? "Partner A";
  const partnerBName = coupleProfile?.partnerBName ?? "Partner B";
  const turnName = currentTurn === "A" ? partnerAName : partnerBName;

  // Performing partner is the OPPOSITE of currentTurn
  const getPerformingPartnerName = useCallback((): string => {
    if (!coupleProfile) return "Partner";
    if (currentTurn === "A") {
      return coupleProfile.partnerBName ?? "Partner B";
    }
    return coupleProfile.partnerAName;
  }, [coupleProfile, currentTurn]);

  useFocusEffect(
    useCallback(() => {
      fetchData().catch(() => { });
    }, [fetchData])
  );

  const loadScratchCounts = useCallback(async () => {
    if (!coupleProfile) return;
    try {
      const history = await getAllHistory(
        coupleProfile.partnerAUid,
        coupleProfile.partnerBUid
      );
      const imageHistory = history.filter((h) => h.taskType === "image");

      const countA = imageHistory.filter(
        (h) => h.userUid === coupleProfile.partnerAUid
      ).length;
      setScratchCountA(countA);

      if (coupleProfile.partnerBUid) {
        const countB = imageHistory.filter(
          (h) => h.userUid === coupleProfile.partnerBUid
        ).length;
        setScratchCountB(countB);
      }
    } catch { }
  }, [coupleProfile, getAllHistory]);

  const loadCurrentLevel = useCallback(async (): Promise<number> => {
    if (!user || !coupleProfile) return 1;
    try {
      const scratcherUid = currentTurn === "A"
        ? coupleProfile.partnerAUid ?? user.email!
        : coupleProfile.partnerBUid ?? user.email!;

      const BASE_URL = env.EXPO_PUBLIC_API_URL;
      const res = await apiFetch(`${BASE_URL}/api/progress/${scratcherUid}`);
      if (res.ok) {
        const data = await res.json();
        return data.currentLevel ?? 1;
      }
    } catch { }
    return 1;
  }, [user, coupleProfile, currentTurn]);

  const loadNextTask = useCallback(async () => {
    if (!user || !coupleProfile) return;
    try {
      if (currentTask) {
        setPreviousTask(currentTask as ImageTask);
      }
      setIsLoading(true);
      setIsScratched(false);
      setShowConfetti(false);
      revealOpacity.setValue(0);
      resetTimer();

      const level = await loadCurrentLevel();
      setCurrentLevel(level);

      // Use the current scratcher's UID so seen-task filtering is per-scratcher
      const scratcherUid = currentTurn === "A"
        ? coupleProfile.partnerAUid ?? user.email!
        : coupleProfile.partnerBUid ?? user.email!;

      const task = await getNextTask(scratcherUid, "image", level);
      if (task) {
        setCurrentTask(task);
        setNoTasksRemaining(false);
        setPerformingPartnerName(getPerformingPartnerName());

        // Prefetch image so it's fully loaded before we dismiss the loading state
        if ("imageSource" in task && task.imageSource) {
          try {
            await Image.prefetch(`${env.EXPO_PUBLIC_API_URL}${task.imageSource}`);
          } catch (err) {
            console.warn("Image prefetch failed:", err);
          }
        }
      } else {
        setCurrentTask(null);
        setNoTasksRemaining(true);
      }

      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
    }
  }, [
    user,
    coupleProfile,
    currentTurn,
    getNextTask,
    loadCurrentLevel,
    setCurrentTask,
    setIsScratched,
    setPerformingPartnerName,
    getPerformingPartnerName,
    revealOpacity,
    currentTask
  ]);

  useEffect(() => {
    loadScratchCounts();
    loadNextTask();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bgAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    return () => {
      resetGameStore();
      if (autoStartRef.current) clearTimeout(autoStartRef.current);
    };
  }, []);

  // Pulse animation when ≤10s left
  useEffect(() => {
    if (isRunning && timeLeft <= 10 && timeLeft > 0) {
      const anim = Animated.loop(Animated.sequence([
        Animated.timing(pulseOpacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]));
      pulseAnimRef.current = anim;
      anim.start();
    } else {
      if (pulseAnimRef.current) { pulseAnimRef.current.stop(); pulseAnimRef.current = null; }
      pulseOpacity.setValue(1);
    }
  }, [isRunning, timeLeft]);

  // Timer finished → play alarm, mark done
  useEffect(() => {
    if (isFinished && !alarmPlayedRef.current) {
      alarmPlayedRef.current = true;
      playAlarm();
      handleDone();
    }
  }, [isFinished]);

  const canSkip = !!currentTask && !timerStarted && !isCompleted;
  const canComplete = !!currentTask && isScratched && !isCompleted;

  const handleSkip = useCallback(async () => {
    if (!user || !currentTask || !coupleProfile) return;
    const scratcherUid = currentTurn === "A"
      ? coupleProfile.partnerAUid ?? user.email!
      : coupleProfile.partnerBUid ?? user.email!;

    await safeDbWrite(
      () =>
        logScratch({
          userUid: scratcherUid,
          taskId: currentTask.id,
          taskType: "image",
          completed: false,
          skipped: true,
        }),
      "Skip event could not be saved."
    );
    await loadScratchCounts();
    await loadNextTask();
  }, [user, currentTask, coupleProfile, currentTurn, logScratch, loadNextTask]);

  const handleScratchComplete = useCallback(async () => {
    setIsScratched(true);
    setShowConfetti(true);
    playScratch();

    // Fade in revealed content
    Animated.timing(revealOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Auto-start 40s timer after 10 seconds
    setTimerStarted(false);
    setTimerFinished(false);
    setIsCompleted(false);
    alarmPlayedRef.current = false;
    autoStartRef.current = setTimeout(() => {
      setTimerStarted(true);
      timerStartTimeRef.current = Date.now();
      start();
    }, 10000);

    if (user && currentTask && coupleProfile) {
      const scratcherUid = currentTurn === "A"
        ? coupleProfile.partnerAUid ?? user.email!
        : coupleProfile.partnerBUid ?? user.email!;
      const performerUid = currentTurn === "A"
        ? coupleProfile.partnerBUid ?? null
        : coupleProfile.partnerAUid ?? null;

      await safeDbWrite(
        () =>
          logScratch({
            userUid: scratcherUid,
            taskId: currentTask.id,
            taskType: "image",
            completed: false,
            skipped: false,
            performerUid: performerUid ?? undefined,
          }),
        "Scratch event could not be saved. Please try again."
      );
      await loadScratchCounts();
    }
  }, [user, coupleProfile, currentTurn, currentTask, setIsScratched, logScratch, playScratch, revealOpacity, start]);

  const handleDone = useCallback(async () => {
    if (!user || !currentTask || !coupleProfile) return;

    const scratcherUid = currentTurn === "A"
      ? coupleProfile.partnerAUid ?? user.email!
      : coupleProfile.partnerBUid ?? user.email!;

    const result = await safeDbWrite(async () => {
      const BASE_URL = env.EXPO_PUBLIC_API_URL;
      await apiFetch(`${BASE_URL}/api/progress/${scratcherUid}/increment-completed`, {
        method: "PATCH"
      });
    }, "Progress could not be saved. Please try again.");

    if (result !== null) {
      switchTurn();
      updateStreak();
      await loadScratchCounts();
      await loadNextTask();
    }
  }, [user, coupleProfile, currentTurn, currentTask, loadNextTask, switchTurn, updateStreak, loadScratchCounts]);

  function handlePrevious() {
    setShowPrevious(true);
  }

  function closePrevious() {
    setShowPrevious(false);
  }

  const handleNextCard = useCallback(async () => {
    await loadNextTask();
  }, [loadNextTask]);

  const handleGoBack = useCallback(() => {
    resetGameStore();
    router.back();
  }, [resetGameStore, router]);

  // ─── Loading state ──────────────────────────────────────────────────────────
  const imageTask = currentTask as ImageTask;
  const bgColors = (isDark ? ["#042f2e", "#134e4a"] : ["#99f6e4", "#0d9488"]) as any;
  const iconColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.25)";

  // ─── RENDER: Loading state ────────────────────────────────────────────────
  if (isLoading && !showPrevious) {
    return (
      <LinearGradient colors={bgColors} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={isDark ? "#ffffff" : "#0f172a"} />
        <Text style={{ marginTop: 16, color: isDark ? "#ffffff" : "#0f172a", fontSize: 16, fontWeight: "600", fontFamily: "DynaPuff_700Bold" }}>Fetching next card...</Text>
      </LinearGradient>
    );
  }

  // ─── RENDER: Previous task (read-only) ────────────────────────────────────
  if (showPrevious && previousTask) {
    const prevTask = previousTask;
    return (
      <LinearGradient
        colors={theme.background}
        locations={[0, 0.5, 1]}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: 24,
            paddingTop: 48,
            paddingBottom: 24,
            justifyContent: "space-between",
          }}
        >
          {/* Top */}
          <View style={{ alignItems: "center" }}>
            <Text
              style={{
                color: theme.card.subtext,
                fontSize: 14,
                textTransform: "uppercase",
              }}
            >
              Previous Task (Read Only)
            </Text>
          </View>

          {/* Middle */}
          <View
            style={{
              width: "100%",
              aspectRatio: 4 / 5,
              borderRadius: 32, overflow: "hidden",
            }}
          >
            <LinearGradient
              colors={isDark ? ["#7c3aed", "#e91e8c"] : ["#f953c6", "#b91d73"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1 }}
            >
              <Image
                source={{ uri: `${env.EXPO_PUBLIC_API_URL}${prevTask.imageSource}` }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </LinearGradient>
          </View>

          {/* Bottom Actions */}
          <View style={{ alignItems: "center", gap: 16 }}>
            <Pressable
              onPress={closePrevious}
              style={{ borderRadius: 999, overflow: "hidden", width: "100%" }}
            >
              <BlurView
                intensity={isDark ? 40 : 60}
                tint={isDark ? "dark" : "light"}
                style={{
                  paddingVertical: 16,
                  alignItems: "center",
                  borderRadius: 999, overflow: "hidden",
                }}
              >
                <Text
                  style={{
                    color: isDark ? "#ffffff" : "#1e1b4b",
                    fontSize: 16,
                    fontWeight: "700",
                  }}
                >
                  Back to Current Task
                </Text>
              </BlurView>
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // ─── Empty state ────────────────────────────────────────────────────────────
  if (noTasksRemaining && !showPrevious) {
    return (
      <LinearGradient colors={bgColors} style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Ionicons name="camera" size={80} color={isDark ? "#ffffff" : "#042f2e"} style={{ marginBottom: 20 }} />
        <Text style={{ color: isDark ? "#ffffff" : "#042f2e", fontSize: 28, fontWeight: "900", fontFamily: "DynaPuff_700Bold", textAlign: "center", marginBottom: 12 }}>All Done!</Text>
        <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(4,47,46,0.8)", fontSize: 16, textAlign: "center", marginBottom: 30, lineHeight: 22 }}>
          You've completed all Hidden Moments cards. Tell your partner to add more fun photos!
        </Text>
        <Pressable onPress={() => router.back()} style={{ borderRadius: 999, overflow: "hidden" }}>
          <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{ paddingHorizontal: 32, paddingVertical: 16, borderRadius: 999, overflow: "hidden" }}>
            <Text style={{ color: isDark ? "#ffffff" : "#042f2e", fontSize: 18, fontWeight: "800", fontFamily: "DynaPuff_700Bold" }}>Go Back</Text>
          </BlurView>
        </Pressable>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={bgColors}
      locations={[0, 1]}
      style={{ flex: 1 }}
    >
      {/* Decorative Background Icons */}
      <Animated.View style={{ position: "absolute", top: 80, left: -20, transform: [{ rotate: "-15deg" }, { translateY: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) }] }}>
        <Ionicons name="camera" size={120} color={iconColor} />
      </Animated.View>
      <Animated.View style={{ position: "absolute", top: 250, right: -10, transform: [{ rotate: "25deg" }, { translateY: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }) }] }}>
        <Ionicons name="camera" size={80} color={iconColor} />
      </Animated.View>
      <Animated.View style={{ position: "absolute", bottom: 150, left: 30, transform: [{ rotate: "-10deg" }, { translateY: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }] }}>
        <Ionicons name="camera" size={150} color={iconColor} />
      </Animated.View>

      {showConfetti && (
        <HeartConfetti onComplete={() => setShowConfetti(false)} />
      )}

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 52, paddingBottom: 40, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >

        {/* ── TOP HEADER: Close × top-right ── */}
        <View style={{ alignItems: "flex-end", marginBottom: 12 }}>
          <Pressable onPress={handleGoBack} style={{ borderRadius: 32, overflow: "hidden" }}>
            <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={{ width: 36, height: 36, borderRadius: 32, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="close" size={18} color={isDark ? "#ffffff" : "#042f2e"} />
            </BlurView>
          </Pressable>
        </View>

        {/* ── SCRATCH COUNTER BAR ── */}
        <View style={{ borderRadius: 32, overflow: "hidden", marginBottom: 14 }}>
          <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{ flexDirection: "row", alignItems: "center", borderRadius: 32, overflow: "hidden", paddingVertical: 10, paddingHorizontal: 16 }}>
            {/* Partner A */}
            <View style={{ flex: 1, alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 }}>
                <Ionicons name="camera" size={11} color={currentTurn === "A" ? "#2dd4bf" : (isDark ? "rgba(255,255,255,0.5)" : "rgba(4,47,46,0.5)")} />
                <Text style={{ color: isDark ? "#ffffff" : "#042f2e", fontSize: 13, fontWeight: "800", fontFamily: "DynaPuff_700Bold", textShadowColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }} numberOfLines={1}>{partnerAName}</Text>
              </View>
              <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(4,47,46,0.8)", fontSize: 11 }}>
                {scratchCountA} <Text style={{ color: "#2dd4bf" }}>📸</Text>
              </Text>
            </View>

            {/* Center: turn indicator */}
            <View style={{ alignItems: "center", paddingHorizontal: 8 }}>
              <Ionicons name="camera" size={20} color="#2dd4bf" />
              <View style={{
                marginTop: 3,
                backgroundColor: currentTurn === "A" ? "rgba(45,212,191,0.2)" : "rgba(168,85,247,0.2)",
                borderRadius: 999, overflow: "hidden",
                paddingHorizontal: 8,
                paddingVertical: 2
              }}>
                <Text style={{ color: isDark ? "#ffffff" : "#042f2e", fontSize: 9, fontWeight: "700" }}>
                  {turnName}'s turn
                </Text>
              </View>
            </View>

            {/* Partner B */}
            <View style={{ flex: 1, alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 }}>
                <Ionicons name="camera" size={11} color={currentTurn === "B" ? "#a855f7" : (isDark ? "rgba(255,255,255,0.5)" : "rgba(4,47,46,0.5)")} />
                <Text style={{ color: isDark ? "#ffffff" : "#042f2e", fontSize: 13, fontWeight: "800", fontFamily: "DynaPuff_700Bold", textShadowColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }} numberOfLines={1}>{partnerBName}</Text>
              </View>
              <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(4,47,46,0.8)", fontSize: 11 }}>
                {scratchCountB} <Text style={{ color: "#a855f7" }}>📸</Text>
              </Text>
            </View>
          </BlurView>
        </View>

        {/* ── CARD SECTION ── */}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          {/* Scratcher → Performer pill */}
          {imageTask && (
            <View style={{ borderRadius: 999, overflow: "hidden", marginBottom: 12 }}>
              <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                borderRadius: 999, overflow: "hidden",
                paddingHorizontal: 16,
                paddingVertical: 7,
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="camera" size={12} color={isDark ? "#2dd4bf" : "#0f766e"} />
                  <Text style={{ color: isDark ? "#ffffff" : "#042f2e", fontSize: 12, fontWeight: "700", textShadowColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>{turnName}</Text>
                  <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(4,47,46,0.8)", fontSize: 11 }}>scratches</Text>
                </View>
                <Text style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(4,47,46,0.6)", fontSize: 12 }}>→</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="camera-outline" size={12} color={isDark ? "#ffffff" : "#042f2e"} />
                  <Text style={{ color: isDark ? "#ffffff" : "#042f2e", fontSize: 12, fontWeight: "700", textShadowColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>{getPerformingPartnerName()}</Text>
                  <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(4,47,46,0.8)", fontSize: 11 }}>performs</Text>
                </View>
              </BlurView>
            </View>
          )}

          {!isScratched && imageTask ? (
            <View style={{ width: "100%" }}>
              <ScratchCard onScratchComplete={handleScratchComplete}>
                <LinearGradient
                  colors={isDark ? ["#7c3aed", "#e91e8c"] : ["#f953c6", "#b91d73"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ flex: 1, padding: 8, borderRadius: 32, overflow: "hidden" }}
                >
                  <Image
                    source={{ uri: `${env.EXPO_PUBLIC_API_URL}${imageTask.imageSource}` }}
                    style={{ width: "100%", height: "100%", borderRadius: 16, backgroundColor: "#1e1b4b" }}
                    resizeMode="contain"
                  />
                </LinearGradient>
              </ScratchCard>
            </View>
          ) : isScratched && imageTask ? (
            <Animated.View style={{
              width: "100%",
              aspectRatio: 4 / 5,
              borderRadius: 32, overflow: "hidden", opacity: revealOpacity,
            }}>
              <LinearGradient
                colors={isDark ? ["#7c3aed", "#e91e8c"] : ["#f953c6", "#b91d73"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ flex: 1, padding: 8 }}
              >
                <View style={{ flex: 1, borderRadius: 16, overflow: "hidden", backgroundColor: "#1e1b4b" }}>
                  <Image
                    source={{ uri: `${env.EXPO_PUBLIC_API_URL}${imageTask.imageSource}` }}
                    style={{ width: "100%", height: "100%", padding: 20 }}
                    resizeMode="contain"
                  />
                  {/* Timer overlay at bottom of image */}
                  {timerStarted && (
                    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center" }}>
                      <Animated.Text style={[
                        { fontSize: 36, fontWeight: "900", fontFamily: "DynaPuff_700Bold", color: timeLeft <= 10 ? "#f87171" : "#ffffff" },
                        timeLeft <= 10 ? { opacity: pulseOpacity } : undefined,
                      ]}>
                        {formattedTime}
                      </Animated.Text>
                      {timerFinished ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Ionicons name="alarm-outline" size={16} color="#4ade80" />
                          <Text style={{ color: "#4ade80", fontSize: 16, fontWeight: "800", fontFamily: "DynaPuff_700Bold" }}>Time's up!</Text>
                        </View>
                      ) : (
                        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>
                          {turnName} must complete the action!
                        </Text>
                      )}
                    </View>
                  )}
                  {/* Pre-timer hint */}
                  {!timerStarted && (
                    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 12, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="timer-outline" size={14} color="#10b981" />
                        <Text style={{ color: "#10b981", fontSize: 13, fontWeight: "700" }}>Timer starts in 10s…</Text>
                      </View>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </Animated.View>
          ) : null}
        </View>

        {/* ── BOTTOM ACTION BUTTONS ── */}
        <View style={{ gap: 10, marginTop: 14 }}>
          {/* Complete — pink→purple gradient (positive completion) */}
          <AnimatedButton
            onPress={handleDone}
            disabled={!canComplete}
            style={{ opacity: canComplete ? 1 : 0.3, borderRadius: 999, overflow: "hidden" }}
          >
            <LinearGradient
              colors={["#e91e8c", "#7c3aed"] as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 999, overflow: "hidden" }}
            >
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "800", fontFamily: "DynaPuff_700Bold" }}>Complete</Text>
            </LinearGradient>
          </AnimatedButton>

          {/* Previous / Skip */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            {/* Previous */}
            <View style={{ flex: 1, borderRadius: 32, overflow: "hidden", opacity: (previousTask && !showPrevious) ? 1 : 0.35 }}>
              <Pressable onPress={handlePrevious} disabled={!previousTask || showPrevious} style={{ flex: 1 }}>
                <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 32, overflow: "hidden", backgroundColor: (previousTask && !showPrevious) ? "rgba(99,102,241,0.12)" : "transparent", paddingVertical: 13, paddingHorizontal: 12 }}>
                  <Ionicons name="arrow-back" size={16} color={(previousTask && !showPrevious) ? "#6366f1" : (isDark ? "#ffffff" : "#1e1b4b")} />
                  <Text style={{ color: (previousTask && !showPrevious) ? "#6366f1" : (isDark ? "#ffffff" : "#1e1b4b"), fontSize: 14, fontWeight: "700" }}>Previous</Text>
                </BlurView>
              </Pressable>
            </View>

            {/* Skip */}
            <View style={{ flex: 1, borderRadius: 32, overflow: "hidden", opacity: canSkip ? 1 : 0.35 }}>
              <Pressable onPress={handleSkip} disabled={!canSkip} style={{ flex: 1 }}>
                <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 32, overflow: "hidden", backgroundColor: canSkip ? "rgba(245,158,11,0.12)" : "transparent", paddingVertical: 13, paddingHorizontal: 12 }}>
                  <Ionicons name="play-skip-forward" size={16} color={canSkip ? "#f59e0b" : (isDark ? "#ffffff" : "#1e1b4b")} />
                  <Text style={{ color: canSkip ? "#f59e0b" : (isDark ? "#ffffff" : "#1e1b4b"), fontSize: 14, fontWeight: "700" }}>Skip</Text>
                </BlurView>
              </Pressable>
            </View>
          </View>
        </View>
      </Animated.ScrollView>
    </LinearGradient>
  );
}
