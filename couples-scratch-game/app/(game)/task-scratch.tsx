import { apiFetch } from "@/lib/apiClient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Animated, Easing, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useAuthStore } from "@/store/authStore";
import { useGameStore } from "@/store/gameStore";
import { useThemeStore, getTheme } from "@/store/themeStore";
import { useScratchHistory } from "@/hooks/useScratchHistory";
import { useTimer } from "@/hooks/useTimer";
import { useSound } from "@/hooks/useSound";
import { ScratchCard } from "@/components/ScratchCard/ScratchCard";
import HeartConfetti from "@/components/Confetti/HeartConfetti";
import { Task } from "@/types";
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

export default function TaskScratchScreen() {
  const router = useRouter();

  // Auth & profile
  const user = useAuthStore((s) => s.user);
  const coupleProfile = useAuthStore((s) => s.coupleProfile);
  const isPartnerA = useAuthStore((s) => s.isPartnerA);

  // Game store
  const currentTask = useGameStore((s) => s.currentTask) as Task | null;
  const previousTask = useGameStore((s) => s.previousTask) as Task | null;
  const isScratched = useGameStore((s) => s.isScratched);
  const timerStarted = useGameStore((s) => s.timerStarted);
  const timerFinished = useGameStore((s) => s.timerFinished);
  const performingPartnerName = useGameStore((s) => s.performingPartnerName);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const setCurrentTask = useGameStore((s) => s.setCurrentTask);
  const setPreviousTask = useGameStore((s) => s.setPreviousTask);
  const setIsScratched = useGameStore((s) => s.setIsScratched);
  const setTimerStarted = useGameStore((s) => s.setTimerStarted);
  const setTimerFinished = useGameStore((s) => s.setTimerFinished);
  const setPerformingPartnerName = useGameStore(
    (s) => s.setPerformingPartnerName
  );
  const switchTurn = useGameStore((s) => s.switchTurn);
  const updateStreak = useGameStore((s) => s.updateStreak);
  const resetGameStore = useGameStore((s) => s.reset);

  // Theme
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);

  // Hooks
  const { getNextTask, logScratch, getAllHistory } = useScratchHistory();
  const { playScratch, playAlarm } = useSound();

  // Local state
  const [showConfetti, setShowConfetti] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showPrevious, setShowPrevious] = useState(false);
  const [emptyState, setEmptyState] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [timerKey, setTimerKey] = useState(0);
  const [scratchCountA, setScratchCountA] = useState(0);
  const [scratchCountB, setScratchCountB] = useState(0);

  // Timer
  const timerDuration = 40; // fixed 40-second timer for all tasks
  const {
    timeLeft,
    isRunning,
    isFinished,
    formattedTime,
    start,
    reset: resetTimer,
  } = useTimer(timerDuration);

  const timerStartTimeRef = useRef<number>(0);
  const alarmPlayedRef = useRef(false);
  // Ref to hold the 10-second auto-start countdown
  const autoStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animations
  const pulseOpacity = useRef(new Animated.Value(1)).current;
  const pulseAnimRef = useRef<Animated.CompositeAnimation | null>(null);
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

  // Timer pulse animation at ≤10s
  useEffect(() => {
    if (isRunning && timeLeft <= 10 && timeLeft > 0) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimRef.current = anim;
      anim.start();
    } else {
      if (pulseAnimRef.current) {
        pulseAnimRef.current.stop();
        pulseAnimRef.current = null;
      }
      pulseOpacity.setValue(1);
    }
  }, [isRunning, timeLeft]);

  // Timer finished effect
  useEffect(() => {
    if (isFinished && !alarmPlayedRef.current) {
      alarmPlayedRef.current = true;
      playAlarm();
      handleComplete();
    }
  }, [isFinished]);

  useEffect(() => {
    if (isFinished) {
      setTimerFinished(true);
    }
  }, [isFinished]);

  // Load scratch counts from DB
  const loadScratchCounts = useCallback(async () => {
    if (!coupleProfile) return;
    try {
      const history = await getAllHistory(
        coupleProfile.partnerAUid,
        coupleProfile.partnerBUid
      );
      const textHistory = history.filter((h) => h.taskType === "text");

      const countA = textHistory.filter(
        (h) => h.userUid === coupleProfile.partnerAUid
      ).length;
      setScratchCountA(countA);

      if (coupleProfile.partnerBUid) {
        const countB = textHistory.filter(
          (h) => h.userUid === coupleProfile.partnerBUid
        ).length;
        setScratchCountB(countB);
      }
    } catch { }
  }, [coupleProfile, getAllHistory]);

  // Load current level from DB
  const loadCurrentLevel = useCallback(async (): Promise<number> => {
    if (!user || !coupleProfile) return 1;
    try {
      const scratcherUid = currentTurn === "A"
        ? coupleProfile.partnerAUid ?? user.email!
        : coupleProfile.partnerBUid ?? user.email!;

      const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";
      const res = await apiFetch(`${BASE_URL}/api/progress/${scratcherUid}`);
      if (res.ok) {
        const data = await res.json();
        return data.currentLevel ?? 1;
      }
    } catch { }
    return 1;
  }, [user, coupleProfile, currentTurn]);

  // Load next task
  async function loadTask() {
    if (!user || !coupleProfile) return;
    try {
      setIsLoading(true);
      const level = await loadCurrentLevel();
      setCurrentLevel(level);

      // Use the current scratcher's UID so seen-task filtering is per-scratcher
      const scratcherUid = currentTurn === "A"
        ? coupleProfile.partnerAUid ?? user.email!
        : coupleProfile.partnerBUid ?? user.email!;

      const task = await getNextTask(scratcherUid, "text", level);

      if (!task) {
        setEmptyState(true);
        setCurrentTask(null);
        setIsLoading(false);
        return;
      }

      setEmptyState(false);
      setCurrentTask(task as Task);
      setIsScratched(false);
      setTimerStarted(false);
      setTimerFinished(false);
      setIsCompleted(false);
      setShowConfetti(false);
      setShowPrevious(false);
      resetTimer();
      alarmPlayedRef.current = false;
      setPerformingPartnerName(getPerformingPartnerName());
      setTimerKey((prev) => prev + 1);
      revealOpacity.setValue(0);
      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadScratchCounts();
    loadTask();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bgAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    return () => {
      resetGameStore();
      if (autoStartTimerRef.current) {
        clearTimeout(autoStartTimerRef.current);
      }
    };
  }, []);

  const canSkip = !!currentTask && !isScratched && !isCompleted;
  const canComplete = !!currentTask && isScratched && !isCompleted;

  function handleScratchComplete() {
    setIsScratched(true);
    setShowConfetti(true);
    playScratch();

    // Fade in revealed content
    Animated.timing(revealOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Auto-start timer after 10 seconds
    autoStartTimerRef.current = setTimeout(() => {
      handleStartTimer();
    }, 10000);
  }

  function handleStartTimer() {
    // Cancel any pending auto-start
    if (autoStartTimerRef.current) {
      clearTimeout(autoStartTimerRef.current);
      autoStartTimerRef.current = null;
    }
    setTimerStarted(true);
    timerStartTimeRef.current = Date.now();
    start();
  }

  function handleTimerEnd() {
    setIsCompleted(true);
    setTimerFinished(true);
    logCompletion();
    switchTurn();
    updateStreak();
  }

  async function handleComplete() {
    setIsCompleted(true);
    setTimerFinished(true);
    await logCompletion();
    switchTurn();
    updateStreak();
    await handleNext();
  }

  async function logCompletion() {
    if (!user || !currentTask) return;
    const elapsed = timerStartTimeRef.current
      ? Math.round((Date.now() - timerStartTimeRef.current) / 1000)
      : 0;

    const scratcherUid = currentTurn === "A"
      ? coupleProfile?.partnerAUid ?? user.email!
      : coupleProfile?.partnerBUid ?? user.email!;
    const performerUid = currentTurn === "A"
      ? coupleProfile?.partnerBUid ?? null
      : coupleProfile?.partnerAUid ?? null;

    const result = await safeDbWrite(
      () =>
        logScratch({
          userUid: scratcherUid,
          taskId: currentTask.id,
          taskType: "text",
          category: currentTask.category,
          completed: true,
          skipped: false,
          timeTaken: elapsed,
          performerUid: performerUid ?? undefined,
        }),
      "Task completion could not be saved. Please try again."
    );

    if (result !== null) {
      try {
        const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";
        await apiFetch(`${BASE_URL}/api/progress/${scratcherUid}/increment-completed`, {
          method: "PATCH"
        });
      } catch (err) {
        console.error("Failed to increment completed count", err);
      }
    }
    await loadScratchCounts();
  }

  async function handleSkip() {
    if (!user || !currentTask) return;

    // Cancel any pending auto-start
    if (autoStartTimerRef.current) {
      clearTimeout(autoStartTimerRef.current);
      autoStartTimerRef.current = null;
    }

    const scratcherUid = currentTurn === "A"
      ? coupleProfile?.partnerAUid ?? user.email!
      : coupleProfile?.partnerBUid ?? user.email!;
    const performerUid = currentTurn === "A"
      ? coupleProfile?.partnerBUid ?? null
      : coupleProfile?.partnerAUid ?? null;

    const nextTask = await getNextTask(scratcherUid, "text", currentLevel);

    if (!nextTask) {
      setEmptyState(true);
      return;
    }

    const result = await safeDbWrite(
      () =>
        logScratch({
          userUid: scratcherUid,
          taskId: currentTask.id,
          taskType: "text",
          category: currentTask.category,
          completed: false,
          skipped: true,
          timeTaken: 0,
          performerUid: performerUid ?? undefined,
        }),
      "Skip could not be saved. Please try again."
    );

    if (result === null) return;

    await loadScratchCounts();
    setPreviousTask(currentTask);
    setCurrentTask(nextTask as Task);
    setIsScratched(false);
    setTimerStarted(false);
    setTimerFinished(false);
    setIsCompleted(false);
    setShowConfetti(false);
    resetTimer();
    alarmPlayedRef.current = false;
    setTimerKey((prev) => prev + 1);
    revealOpacity.setValue(0);
  }

  async function handleNext() {
    if (!user) return;
    setPreviousTask(currentTask);
    await loadScratchCounts();
    await loadTask();
  }

  function handlePrevious() {
    setShowPrevious(true);
  }

  function handleBackFromPrevious() {
    setShowPrevious(false);
  }

  function handleGoBack() {
    resetGameStore();
    router.back();
  }

  // ─── RENDER: Loading state ────────────────────────────────────────────────
  if (isLoading && !showPrevious) {
    return (
      <LinearGradient colors={theme.background} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={theme.card.text} />
        <Text style={{ marginTop: 16, color: theme.card.text, fontSize: 16, fontWeight: "600", fontFamily: "DynaPuff_700Bold" }}>Fetching next task...</Text>
      </LinearGradient>
    );
  }

  // ─── RENDER: Empty state ──────────────────────────────────────────────────
  if (emptyState && !showPrevious) {
    return (
      <LinearGradient
        colors={theme.background}
        locations={[0, 0.5, 1]}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
          }}
        >
          <Ionicons name="trophy-outline" size={48} color={theme.card.text} />
          <Text
            style={{
              color: theme.card.text,
              fontSize: 22,
              fontWeight: "bold", fontFamily: "DynaPuff_700Bold",
              textAlign: "center",
              marginBottom: 12,
              marginTop: 16,
            }}
          >
            All Tasks Completed!
          </Text>
          <Text
            style={{
              color: theme.card.subtext,
              textAlign: "center",
              marginBottom: 32,
            }}
          >
            You've seen all available tasks at your current level. Reset your
            history to replay them!
          </Text>
          <View style={{ gap: 12, width: "100%" }}>
            {previousTask && (
              <AnimatedButton
                onPress={handlePrevious}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  borderRadius: 16,
                  backgroundColor: "transparent",
                  paddingVertical: 16,
                }}
              >
                <Ionicons
                  name="arrow-back"
                  size={20}
                  color={theme.card.text}
                />
                <Text
                  style={{
                    color: theme.card.text,
                    fontSize: 16,
                    fontWeight: "bold", fontFamily: "DynaPuff_700Bold",
                  }}
                >
                  View Previous Task
                </Text>
              </AnimatedButton>
            )}
            <AnimatedButton
              onPress={handleGoBack}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.glass.border,
                backgroundColor: "transparent",
                paddingVertical: 16,
              }}
            >
              <Ionicons name="arrow-back" size={20} color={theme.card.text} />
              <Text
                style={{
                  color: theme.card.text,
                  fontSize: 16,
                  fontWeight: "bold", fontFamily: "DynaPuff_700Bold",
                }}
              >
                Back to Menu
              </Text>
            </AnimatedButton>
          </View>
        </View>
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
              borderRadius: 24,
              backgroundColor: theme.glass.bg,
              borderWidth: 1,
              borderColor: theme.glass.border,
              padding: 24,
            }}
          >
            <Text
              style={{
                color: theme.card.text,
                fontSize: 22,
                fontWeight: "bold", fontFamily: "DynaPuff_700Bold",
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              {prevTask.title}
            </Text>
            <Text
              style={{
                color: theme.card.subtext,
                fontSize: 16,
                textAlign: "center",
                lineHeight: 24,
              }}
            >
              {prevTask.description}
            </Text>
            <View
              style={{
                marginTop: 16,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <Ionicons
                name="timer-outline"
                size={16}
                color={theme.card.subtext}
              />
              <Text style={{ color: theme.card.subtext, fontSize: 14 }}>
                {Math.floor(prevTask.timerSeconds / 60)}:
                {(prevTask.timerSeconds % 60).toString().padStart(2, "0")} timer
              </Text>
            </View>
          </View>

          {/* Bottom */}
          <AnimatedButton
            onPress={handleBackFromPrevious}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.glass.border,
              backgroundColor: "transparent",
              paddingVertical: 16,
            }}
          >
            <Ionicons name="arrow-back" size={20} color={theme.card.text} />
            <Text
              style={{
                color: theme.card.text,
                fontSize: 16,
                fontWeight: "bold", fontFamily: "DynaPuff_700Bold",
              }}
            >
              Back to Current
            </Text>
          </AnimatedButton>
        </View>
      </LinearGradient>
    );
  }

  // ─── RENDER: Main game screen ─────────────────────────────────────────────
  const textTask = currentTask as Task & { emoji: string };
  const bgColors = (isDark ? ["#1e1b4b", "#312e81"] : ["#c7d2fe", "#4f46e5"]) as any;
  const iconColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.25)";

  return (
    <LinearGradient
      colors={bgColors}
      locations={[0, 1]}
      style={{ flex: 1 }}
    >
      {/* Decorative Background Stars */}
      <Animated.View style={{ position: "absolute", top: 80, left: -20, transform: [{ rotate: "-15deg" }, { translateY: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) }] }}>
        <Ionicons name="star" size={120} color={iconColor} />
      </Animated.View>
      <Animated.View style={{ position: "absolute", top: 250, right: -10, transform: [{ rotate: "25deg" }, { translateY: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }) }] }}>
        <Ionicons name="star" size={80} color={iconColor} />
      </Animated.View>
      <Animated.View style={{ position: "absolute", bottom: 150, left: 30, transform: [{ rotate: "-10deg" }, { translateY: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }] }}>
        <Ionicons name="star" size={150} color={iconColor} />
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
          <Pressable onPress={handleGoBack} style={{ borderRadius: 18, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 }}>
            <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="close" size={18} color={isDark ? "#ffffff" : "#0f172a"} />
            </BlurView>
          </Pressable>
        </View>

        {/* ── SCRATCH COUNTER BAR ── */}
        <View style={{ borderRadius: 18, overflow: "hidden", marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 5 }}>
          <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{ flexDirection: "row", alignItems: "center", borderRadius: 18, paddingVertical: 10, paddingHorizontal: 16 }}>
            {/* Partner A */}
            <View style={{ flex: 1, alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 }}>
                <Ionicons name="star" size={11} color={currentTurn === "A" ? "#facc15" : (isDark ? "rgba(255,255,255,0.5)" : "rgba(30,27,75,0.5)")} />
                <Text style={{ color: isDark ? "#ffffff" : "#1e1b4b", fontSize: 13, fontWeight: "800", fontFamily: "DynaPuff_700Bold", textShadowColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }} numberOfLines={1}>{partnerAName}</Text>
              </View>
              <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(30,27,75,0.8)", fontSize: 11 }}>
                {scratchCountA} <Text style={{ color: "#facc15" }}>★</Text>
              </Text>
            </View>

            {/* Center: love icon + turn indicator */}
            <View style={{ alignItems: "center", paddingHorizontal: 8 }}>
              <Ionicons name="star" size={20} color="#facc15" />
              <View style={{
                marginTop: 3,
                backgroundColor: currentTurn === "A" ? "rgba(250,204,21,0.2)" : "rgba(168,85,247,0.2)",
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 2
              }}>
                <Text style={{ color: isDark ? "#ffffff" : "#1e1b4b", fontSize: 9, fontWeight: "700" }}>
                  {turnName}'s turn
                </Text>
              </View>
            </View>

            {/* Partner B */}
            <View style={{ flex: 1, alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 }}>
                <Ionicons name="star" size={11} color={currentTurn === "B" ? "#a855f7" : (isDark ? "rgba(255,255,255,0.5)" : "rgba(30,27,75,0.5)")} />
                <Text style={{ color: isDark ? "#ffffff" : "#1e1b4b", fontSize: 13, fontWeight: "800", fontFamily: "DynaPuff_700Bold", textShadowColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }} numberOfLines={1}>{partnerBName}</Text>
              </View>
              <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(30,27,75,0.8)", fontSize: 11 }}>
                {scratchCountB} <Text style={{ color: "#a855f7" }}>★</Text>
              </Text>
            </View>
          </BlurView>
        </View>

        {/* ── CARD + CONTENT ── */}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          {/* Scratcher → Performer pill */}
          {textTask && (
            <View style={{ borderRadius: 999, overflow: "hidden", marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 }}>
              <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                borderRadius: 999,
                paddingHorizontal: 16,
                paddingVertical: 7,
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="flash" size={12} color={isDark ? "#facc15" : "#d97706"} />
                  <Text style={{ color: isDark ? "#ffffff" : "#1e1b4b", fontSize: 12, fontWeight: "700", textShadowColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>{turnName}</Text>
                  <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(30,27,75,0.8)", fontSize: 11 }}>scratches</Text>
                </View>
                <Text style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(30,27,75,0.6)", fontSize: 12 }}>→</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="flash-outline" size={12} color={isDark ? "#ffffff" : "#1e1b4b"} />
                  <Text style={{ color: isDark ? "#ffffff" : "#1e1b4b", fontSize: 12, fontWeight: "700", textShadowColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>{getPerformingPartnerName()}</Text>
                  <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(30,27,75,0.8)", fontSize: 11 }}>performs</Text>
                </View>
              </BlurView>
            </View>
          )}

          {!isScratched && textTask ? (
            <View style={{ width: "100%", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 12 }}>
              <ScratchCard onScratchComplete={handleScratchComplete}>
                <LinearGradient
                  colors={isDark ? ["#7c3aed", "#e91e8c"] : ["#f953c6", "#b91d73"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 24, padding: 24 }}
                >
                  <Ionicons name="flame" size={48} color="#ffffff" style={{ marginBottom: 12 }} />
                  <Text style={{ color: "#ffffff", fontSize: 24, fontWeight: "900", fontFamily: "DynaPuff_700Bold", textAlign: "center", marginBottom: 8, textShadowColor: "rgba(0,0,0,0.3)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
                    {textTask.title}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 16, textAlign: "center", lineHeight: 22, fontWeight: "600" }}>
                    {textTask.description}
                  </Text>
                </LinearGradient>
              </ScratchCard>
            </View>
          ) : isScratched && textTask ? (
            <Animated.View style={{
              width: "100%",
              aspectRatio: 4 / 5,
              borderRadius: 24,
              overflow: "hidden",
              opacity: revealOpacity,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5,
              shadowRadius: 15,
              elevation: 12,
            }}>
              <LinearGradient
                colors={isDark ? ["#7c3aed", "#e91e8c"] : ["#f953c6", "#b91d73"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}
              >
                <Ionicons name="flame" size={48} color="#ffffff" style={{ marginBottom: 12 }} />
                <Text style={{ color: "#ffffff", fontSize: 24, fontWeight: "900", fontFamily: "DynaPuff_700Bold", textAlign: "center", marginBottom: 8, textShadowColor: "rgba(0,0,0,0.3)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
                  {textTask.title}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 16, textAlign: "center", lineHeight: 22, fontWeight: "600" }}>
                  {textTask.description}
                </Text>

                {/* Auto-start countdown or timer display */}
                {!timerStarted && !isCompleted && (
                  <View style={{ alignItems: "center", marginTop: 24 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}>
                      <Ionicons name="timer-outline" size={16} color="#ffffff" />
                      <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "700" }}>Timer starts in 10s…</Text>
                    </View>
                  </View>
                )}

                {/* Timer display */}
                {timerStarted && (
                  <View style={{ alignItems: "center", marginTop: 24 }}>
                    <Animated.Text style={[
                      { fontSize: 40, fontWeight: "900", fontFamily: "DynaPuff_700Bold", color: "#ffffff" },
                      timeLeft <= 10 && isRunning ? { opacity: pulseOpacity } : undefined,
                    ]}>
                      {formattedTime}
                    </Animated.Text>
                    {isRunning && (
                      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 4 }}>Time remaining</Text>
                    )}
                    {timerFinished && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                        <Ionicons name="alarm-outline" size={16} color="#4ade80" />
                        <Text style={{ color: "#4ade80", fontSize: 14, fontWeight: "700" }}>Time's up!</Text>
                      </View>
                    )}
                  </View>
                )}
              </LinearGradient>
            </Animated.View>
          ) : null}
        </View>

        {/* ── BOTTOM ACTION BUTTONS ── */}
        <View style={{ gap: 10, marginTop: 14 }}>
          {/* Complete — pink→purple gradient (primary positive action) */}
          <AnimatedButton
            onPress={handleComplete}
            disabled={!canComplete}
            style={{ opacity: canComplete ? 1 : 0.3, borderRadius: 999, overflow: "hidden" }}
          >
            <LinearGradient
              colors={["#e91e8c", "#7c3aed"] as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 999 }}
            >
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "800", fontFamily: "DynaPuff_700Bold" }}>Complete</Text>
            </LinearGradient>
          </AnimatedButton>

          {/* Previous (left) + Skip (right) */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            {/* Previous */}
            <View style={{ flex: 1, borderRadius: 16, overflow: "hidden", opacity: (previousTask && !showPrevious) ? 1 : 0.35 }}>
              <Pressable onPress={handlePrevious} disabled={!previousTask || showPrevious} style={{ flex: 1 }}>
                <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 16, backgroundColor: (previousTask && !showPrevious) ? "rgba(99,102,241,0.12)" : "transparent", paddingVertical: 13, paddingHorizontal: 12 }}>
                  <Ionicons name="arrow-back" size={16} color={(previousTask && !showPrevious) ? "#6366f1" : (isDark ? "#ffffff" : "#1e1b4b")} />
                  <Text style={{ color: (previousTask && !showPrevious) ? "#6366f1" : (isDark ? "#ffffff" : "#1e1b4b"), fontSize: 14, fontWeight: "700" }}>Previous</Text>
                </BlurView>
              </Pressable>
            </View>

            {/* Skip */}
            <View style={{ flex: 1, borderRadius: 16, overflow: "hidden", opacity: canSkip ? 1 : 0.35 }}>
              <Pressable onPress={handleSkip} disabled={!canSkip} style={{ flex: 1 }}>
                <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 16, backgroundColor: canSkip ? "rgba(245,158,11,0.12)" : "transparent", paddingVertical: 13, paddingHorizontal: 12 }}>
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
