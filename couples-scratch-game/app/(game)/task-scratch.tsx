import { env } from "@/lib/env";
import { apiFetch, getAvatarSource } from "@/lib/apiClient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform, View, Text, Pressable, Animated, Image,
  Easing, ActivityIndicator, StyleSheet, Dimensions
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "@/components/CustomBlurView";
import { useAuthStore } from "@/store/authStore";
import { useGameStore } from "@/store/gameStore";
import { useNotificationStore } from "@/store/notificationStore";
import { useThemeStore, getTheme } from "@/store/themeStore";
import { Skeleton } from "@/components/ui/Skeleton";
import { useScratchHistory } from "@/hooks/useScratchHistory";
import { useTimer } from "@/hooks/useTimer";
import { useSound } from "@/hooks/useSound";
import { ScratchCard } from "@/components/ScratchCard/ScratchCard";
import HeartConfetti from "@/components/Confetti/HeartConfetti";
import { LevelUpModal } from "@/components/LevelUpModal";
import { ImageTask, Task, LEVEL_BADGES } from "@/types";
import { safeDbWrite } from "@/lib/safeDbWrite";
import { CustomAlertModal } from "@/components/CustomAlertModal";
import Svg, { Path, LinearGradient as SvgLinearGradient, Stop, G, Defs } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const AnimatedHeartIcon = () => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, [scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Svg width={40} height={40} viewBox="0 0 512 512">
        <Defs>
          <SvgLinearGradient id="SVGID_1_" gradientUnits="userSpaceOnUse" x1="124.759" x2="392.343" y1="396.304" y2="128.72">
            <Stop offset="0" stopColor="#da1467" />
            <Stop offset="1" stopColor="#ff992e" />
          </SvgLinearGradient>
        </Defs>
        <G id="_x33_1_Burning_Heart">
          <Path d="m142.933 220.386c6.971-11.593-1.443-38.2-2.346-50.661-2.399-28.903 12.105-59.353 35.303-73.965 3.694-2.351 8.698.656 8.105 5.279-2.026 14.505-2.933 26.344 3.84 37.489 2.773-20.371 7.519-47.621 44.955-72.578 38.316-25.62 17.661-49.073 23.411-62.659 1.518-3.502 5.824-4.299 8.479-1.866 38.396 34.663 33.276 54.767 28.317 74.231-4.586 17.865-8.959 34.823 22.451 67.459v-.8c-.64-14.985-1.387-31.996 21.544-42.341 3.373-1.574 7.175.708 7.519 4.373 2.848 31.848 26.486 55.156 46.981 81.856 20.691 27.037 28.21 60.527 21.544 91.882-15.092-35.355-50.234-60.259-91.083-60.259-24.584 0-48.101 9.119-66.125 25.384-18.131-16.478-41.222-25.384-66.179-25.384-40.475 0-75.351 24.477-90.603 59.353-6.932-32.316.906-65.272 23.411-98.548 1.226-1.867 3.519-2.773 5.653-2.24 2.186.533 3.786 2.347 4.053 4.586 1.426 11.997.311 28.09 10.77 39.409zm179.019 8.106c-25.65 0-49.381 10.826-66.125 29.863-16.798-19.037-40.529-29.863-66.179-29.863-48.688 0-88.256 39.622-88.256 88.309 0 90.603 145.263 190.058 151.449 194.271 1.812 1.172 4.048 1.245 5.973 0 6.186-4.212 151.449-103.668 151.449-194.271-.002-48.687-39.624-88.309-88.311-88.309z" fill="url(#SVGID_1_)" />
        </G>
      </Svg>
    </Animated.View>
  );
};

export default function TaskScratchScreen() {
  const router = useRouter();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const user = useAuthStore((s) => s.user);
  const coupleProfile = useAuthStore((s) => s.coupleProfile);

  const currentTask = useGameStore((s) => s.currentTask);
  const isScratched = useGameStore((s) => s.isScratched);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const setCurrentTask = useGameStore((s) => s.setCurrentTask);
  const setIsScratched = useGameStore((s) => s.setIsScratched);
  const setPerformingPartnerName = useGameStore((s) => s.setPerformingPartnerName);
  const switchTurn = useGameStore((s) => s.switchTurn);
  const updateStreak = useGameStore((s) => s.updateStreak);
  const fetchData = useGameStore((s) => s.fetchData);
  const resetGameStore = useGameStore((s) => s.reset);

  const isDark = useThemeStore((s) => s.isDark);
  const isAndroidDark = Platform.OS === 'android' && isDark;
  const theme = getTheme(isDark);

  const { getNextTask, logScratch, getAllHistory, getSeenIds } = useScratchHistory();
  const { playScratch, playAlarm, playLevelUp } = useSound();

  const [showConfetti, setShowConfetti] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [noTasksRemaining, setNoTasksRemaining] = useState(false);
  const [scratchCountA, setScratchCountA] = useState(0);
  const [scratchCountB, setScratchCountB] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const [startCountdown, setStartCountdown] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [previousTask, setPreviousTask] = useState<(Task & { emoji: string; title: string; description: string }) | null>(null);
  const [showPrevious, setShowPrevious] = useState(false);
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const [newLevelState, setNewLevelState] = useState(1);
  const [isFetching, setIsFetching] = useState(true);
  const [displayLevel, setDisplayLevel] = useState(1);
  const [levelCompleteVisible, setLevelCompleteVisible] = useState(false);
  const [completedLevelNum, setCompletedLevelNum] = useState(1);

  const TIMER_DURATION = 40;
  const { timeLeft, isRunning, isFinished, formattedTime, start, reset: resetTimer } = useTimer(TIMER_DURATION);
  const autoStartRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alarmPlayedRef = useRef(false);
  const isProcessingDoneRef = useRef(false);

  const pulseOpacity = useRef(new Animated.Value(1)).current;
  const pulseAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const revealOpacity = useRef(new Animated.Value(0)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  const partnerAName = coupleProfile?.partnerAName ?? "Partner A";
  const partnerBName = coupleProfile?.partnerBName ?? "Partner B";
  const turnName = currentTurn === "A" ? partnerAName : partnerBName;
  const performingName = currentTurn === "A"
    ? (coupleProfile?.partnerBName ?? "Partner B")
    : (coupleProfile?.partnerAName ?? "Partner A");

  const getPerformingPartnerName = useCallback(() => performingName, [performingName]);

  const isLinked = coupleProfile?.status !== "pending" && !!coupleProfile?.partnerBUid;


  const loadScratchCounts = useCallback(async () => {
    if (!coupleProfile) return;
    try {
      const partnerBUidFallback = coupleProfile.partnerBUid || `partner_b_pending_${coupleProfile.id || "0"}`;
      const history = await getAllHistory(coupleProfile.partnerAUid, partnerBUidFallback);
      const textHistory = history.filter((h) => h.taskType === "text" && (h.completed === true || (h.completed as any) === 1 || String(h.completed) === "true" || String(h.completed) === "1"));
      setScratchCountA(textHistory.filter((h) => h.userUid === coupleProfile.partnerAUid).length);
      setScratchCountB(textHistory.filter((h) => h.userUid === partnerBUidFallback).length);
    } catch { }
  }, [coupleProfile, getAllHistory]);

  const loadCurrentLevel = useCallback(async (forcedTurn?: "A" | "B") => {
    if (!user || !coupleProfile) return 1;
    try {
      const activeTurn = forcedTurn || currentTurn;
      const uid = activeTurn === "A"
        ? coupleProfile.partnerAUid
        : (coupleProfile.partnerBUid || `partner_b_pending_${coupleProfile.id || "0"}`);
      const res = await apiFetch(`${env.EXPO_PUBLIC_API_URL}/api/progress/${uid}`);
      if (res.ok) { const d = await res.json(); return d.currentLevel ?? 1; }
    } catch { }
    return 1;
  }, [user, coupleProfile, currentTurn]);

  const loadNextTask = useCallback(async (forcedTurn?: "A" | "B") => {
    if (!user || !coupleProfile) return;
    try {
      if (currentTask) setPreviousTask(currentTask as Task & { emoji: string; title: string; description: string });
      setIsLoading(true);
      setIsScratched(false);
      setShowConfetti(false);
      revealOpacity.setValue(0);
      resetTimer();

      const level = await loadCurrentLevel(forcedTurn);
      setDisplayLevel(level);
      const activeTurn = forcedTurn || currentTurn;
      const uid = activeTurn === "A"
        ? coupleProfile.partnerAUid
        : (coupleProfile.partnerBUid || `partner_b_pending_${coupleProfile.id || "0"}`);
      const task = await getNextTask(uid, "text", level);
      if (task) {
        setCurrentTask(task);
        setNoTasksRemaining(false);
        setPerformingPartnerName(getPerformingPartnerName());
        if ("imageSource" in task && task.imageSource) {
          try { await Image.prefetch(`${env.EXPO_PUBLIC_API_URL}${task.imageSource}`); } catch { }
        }
      } else {
        setCurrentTask(null);
        setNoTasksRemaining(true);
      }
      setIsLoading(false);
    } catch { setIsLoading(false); }
  }, [user, coupleProfile, currentTurn, getNextTask, loadCurrentLevel, setCurrentTask, setIsScratched, setPerformingPartnerName, getPerformingPartnerName, revealOpacity, currentTask]);

  useFocusEffect(useCallback(() => {
    let isMounted = true;
    setIsFetching(true);
    fetchData()
      .then(() => {
        if (isMounted) {
          loadNextTask();
        }
      })
      .catch(() => { })
      .finally(() => {
        if (isMounted) {
          setIsFetching(false);
        }
      });
    return () => { isMounted = false; };
  }, [isLinked, fetchData, loadNextTask]));

  useEffect(() => {
    loadScratchCounts();
    Animated.loop(Animated.sequence([
      Animated.timing(bgAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bgAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    return () => { resetGameStore(); if (autoStartRef.current) clearTimeout(autoStartRef.current); };
  }, []);

  useEffect(() => {
    if (isRunning && timeLeft <= 10 && timeLeft > 0) {
      const anim = Animated.loop(Animated.sequence([
        Animated.timing(pulseOpacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]));
      pulseAnimRef.current = anim;
      anim.start();
    } else {
      pulseAnimRef.current?.stop();
      pulseAnimRef.current = null;
      pulseOpacity.setValue(1);
    }
  }, [isRunning, timeLeft]);

  useEffect(() => {
    if (isFinished && !alarmPlayedRef.current) {
      alarmPlayedRef.current = true;
      playAlarm();
      handleDone();
    }
  }, [isFinished]);
  useEffect(() => {
    if (startCountdown === null) return;
    if (startCountdown === 0) {
      setStartCountdown(null);
      setTimerStarted(true);
      start();
      return;
    }
    const timer = setTimeout(() => setStartCountdown(c => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [startCountdown, start]);
  const canSkip = !!currentTask && !timerStarted && !isCompleted;
  const canComplete = !!currentTask && isScratched && !isCompleted;

  const handleSkip = useCallback(async () => {
    if (!user || !currentTask || !coupleProfile) return;
    const scratcherUid = currentTurn === "A"
      ? coupleProfile.partnerAUid
      : (coupleProfile.partnerBUid || `partner_b_pending_${coupleProfile.id || "0"}`);
    const performerUid = currentTurn === "A"
      ? (coupleProfile.partnerBUid || `partner_b_pending_${coupleProfile.id || "0"}`)
      : coupleProfile.partnerAUid;

    // Log as skipped by setting timeTaken: -1
    await logScratch({
      userUid: scratcherUid,
      taskId: currentTask.id,
      taskType: "text",
      completed: false,
      skipped: true,
      performerUid: performerUid ?? undefined,
      timeTaken: -1
    });

    await loadScratchCounts();
    await loadNextTask();
  }, [user, currentTask, coupleProfile, currentTurn, logScratch, loadNextTask]);

  const handleScratchComplete = useCallback(async () => {
    setIsScratched(true);
    setShowConfetti(true);
    playScratch();
    Animated.timing(revealOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    setTimerStarted(false);
    setIsCompleted(false);
    isProcessingDoneRef.current = false;
    alarmPlayedRef.current = false;
    setStartCountdown(10);

    if (user && currentTask && coupleProfile) {
      const scratcherUid = currentTurn === "A"
        ? coupleProfile.partnerAUid
        : (coupleProfile.partnerBUid || `partner_b_pending_${coupleProfile.id || "0"}`);
      const performerUid = currentTurn === "A"
        ? (coupleProfile.partnerBUid || `partner_b_pending_${coupleProfile.id || "0"}`)
        : coupleProfile.partnerAUid;

      logScratch({
        userUid: scratcherUid,
        taskId: currentTask.id,
        taskType: "text",
        completed: false,
        skipped: false,
        performerUid: performerUid ?? undefined
      }).catch(console.error);
    }
  }, [setIsScratched, playScratch, revealOpacity, start, user, currentTask, coupleProfile, currentTurn, logScratch]);

  const handleDone = useCallback(async () => {
    if (isProcessingDoneRef.current) return;
    if (!user || !currentTask || !coupleProfile) return;

    isProcessingDoneRef.current = true;
    setIsCompleted(true);
    playLevelUp(); // Play sound effect on Complete

    const scratcherUid = currentTurn === "A"
      ? coupleProfile.partnerAUid
      : (coupleProfile.partnerBUid || `partner_b_pending_${coupleProfile.id || "0"}`);
    const performerUid = currentTurn === "A"
      ? (coupleProfile.partnerBUid || `partner_b_pending_${coupleProfile.id || "0"}`)
      : coupleProfile.partnerAUid;

    await safeDbWrite(
      () => logScratch({ userUid: scratcherUid, taskId: currentTask.id, taskType: "text", completed: true, skipped: false, performerUid: performerUid ?? undefined }),
      "Scratch event could not be saved."
    );
    try {
      const oldLevel = await loadCurrentLevel();
      const res = await apiFetch(`${env.EXPO_PUBLIC_API_URL}/api/progress/${scratcherUid}/increment-completed`, { method: "PATCH" });
      if (res.ok) {
        const data = await res.json();
        if (data.currentLevel > oldLevel) {
          setNewLevelState(data.currentLevel);
          setLevelUpVisible(true);
        }
      }
    } catch { }

    // Check if this level's tasks are all completed
    try {
      const store = useGameStore.getState();
      const levelTasks = store.textTasks.filter(t => t.level === currentTask.level);
      const seenIds = await getSeenIds(scratcherUid, "text");
      const updatedSeenIds = seenIds.includes(currentTask.id) ? seenIds : [...seenIds, currentTask.id];
      const allLevelCompleted = levelTasks.every(t => updatedSeenIds.includes(t.id));
      if (allLevelCompleted) {
        setCompletedLevelNum(currentTask.level);
        setLevelCompleteVisible(true);
      }
    } catch { }

    await loadScratchCounts();
    const nextTurn = currentTurn === "A" ? "B" : "A";
    switchTurn();
    updateStreak();
    await loadNextTask(nextTurn);
  }, [user, coupleProfile, currentTurn, currentTask, loadNextTask, switchTurn, updateStreak, loadScratchCounts, logScratch, loadCurrentLevel]);

  const handleGoBack = useCallback(() => { resetGameStore(); router.back(); }, [resetGameStore, router]);

  const textTask = currentTask as Task & { emoji: string; title: string; description: string };

  // ── Background gradient matching screenshot: warm pink-purple
  const bgColors = isDark
    ? (["#3b0764", "#6b21a8", "#be185d"] as any)
    : (["#e879f9", "#f472b6", "#fb7185"] as any);

  // ── Loading ──
  if (isFetching) {
    return (
      <LinearGradient colors={bgColors} locations={[0, 0.5, 1]} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ marginTop: 12, color: "#ffffff", fontFamily: "Nunito_700Bold", fontSize: 16 }}>Syncing with server...</Text>
      </LinearGradient>
    );
  }

  if (!isLoading && !currentTask) {
    return (
      <LinearGradient colors={bgColors} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 28 }}>
          <View style={[S.headerRow, { justifyContent: 'space-between', marginBottom: 24 }]}>
            <Pressable onPress={handleGoBack} style={S.iconBtn}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </Pressable>
            <Text style={S.headerTitle}>All Done!</Text>
            <View style={{ width: 44 }} />
          </View>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="checkmark-circle" size={80} color="#ffffff" style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 24, color: "#ffffff", fontFamily: "DynaPuff_700Bold", textAlign: "center", marginBottom: 8 }}>You're all caught up!</Text>
            <Text style={{ fontSize: 16, color: "rgba(255,255,255,0.8)", fontFamily: "Nunito_700Bold", textAlign: "center" }}>More cards will be available soon.</Text>
          </View>
        </View>
        <LevelUpModal visible={levelUpVisible} level={newLevelState} isDark={isDark} onClose={() => setLevelUpVisible(false)} />
        <CustomAlertModal visible={levelCompleteVisible} title={`Level ${completedLevelNum} Completed! 🎉`} message={`You've successfully completed all tasks in Level ${completedLevelNum}. Get ready for Level ${completedLevelNum + 1}!`} icon="trophy" isDark={isDark} onClose={() => setLevelCompleteVisible(false)} />
      </LinearGradient>
    );
  }



  // ── Previous task read-only ──
  if (showPrevious && previousTask) {
    return (
      <LinearGradient colors={bgColors} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 24 }}>
          <Text style={S.prevLabel}>Previous Task (Read Only)</Text>
          <View style={{ flex: 1, marginVertical: 20, borderRadius: 24, borderWidth: isDark ? 0 : 4, borderColor: "#7c3aed" }}>
            <View style={{ flex: 1, borderRadius: 20, overflow: "hidden" }}>
              <LinearGradient
                colors={["#4c1d95", "#2e1065"] as any}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}
              >
                <Text style={{ fontSize: 48, marginBottom: 12 }}>{previousTask.emoji}</Text>
                <Text style={{ color: "#ffffff", fontSize: 24, fontFamily: "DynaPuff_700Bold", textAlign: "center", marginBottom: 8, textShadowColor: "rgba(0,0,0,0.3)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
                  {previousTask.title}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 16, textAlign: "center", lineHeight: 22, fontFamily: "Nunito_700Bold" }}>
                  {previousTask.description}
                </Text>
              </LinearGradient>
            </View>
          </View>
          <Pressable onPress={() => setShowPrevious(false)} style={S.completeBtn}>
            <LinearGradient colors={["#7c3aed", "#db2777"] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.completeBtnInner}>
              <Text style={S.completeBtnText}>Back to Current Task</Text>
            </LinearGradient>
          </Pressable>
        </View>
        <LevelUpModal visible={levelUpVisible} level={newLevelState} isDark={isDark} onClose={() => setLevelUpVisible(false)} />
      </LinearGradient>
    );
  }

  // ── Empty state ──
  if (noTasksRemaining) {
    return (
      <LinearGradient colors={bgColors} locations={[0, 0.5, 1]} style={S.fill_center}>
        <Ionicons name="camera" size={80} color="rgba(255,255,255,0.8)" style={{ marginBottom: 20 }} />
        <Text style={[S.completeBtnText, { fontSize: 26, marginBottom: 12 }]}>All Done!</Text>
        <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, textAlign: "center", marginBottom: 32, lineHeight: 22, fontFamily: "Nunito_700Bold", paddingHorizontal: 32 }}>
          You've completed all Love Missions cards!
        </Text>
        <Pressable onPress={handleGoBack} style={[S.completeBtn, { paddingVertical: 10 }]}>
          <LinearGradient colors={["#7c3aed", "#db2777"] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[S.completeBtnInner, { paddingHorizontal: 32 }]}>
            <Text style={S.completeBtnText}>Go Back</Text>
          </LinearGradient>
        </Pressable>
      </LinearGradient>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── MAIN RENDER ──
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <LinearGradient colors={bgColors} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
      {/* Floating background hearts */}
      <Animated.View style={[S.bgHeart, { top: 80, left: -30, transform: [{ rotate: "-15deg" }, { translateY: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) }] }]}>
        <Ionicons name="heart" size={130} color="rgba(255,255,255,0.08)" />
      </Animated.View>
      <Animated.View style={[S.bgHeart, { top: 260, right: -20, transform: [{ rotate: "20deg" }, { translateY: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 28] }) }] }]}>
        <Ionicons name="heart" size={90} color="rgba(255,255,255,0.06)" />
      </Animated.View>

      {showConfetti && <HeartConfetti onComplete={() => setShowConfetti(false)} />}

      {/* ─── FIXED LAYOUT: not scrollable to keep proportions exact ─── */}
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 28 }}>

        {/* ════ 1. HEADER ROW ════ */}
        <View style={S.headerRow}>
          {/* History button — navigates to history page */}
          <Pressable
            onPress={() => router.push("/(game)/history")}
            style={S.headerCircleBtn}
          >
            <Ionicons name="time-outline" size={22} color="rgba(255,255,255,0.95)" />
          </Pressable>

          {/* Title and Level Status */}
          <View style={{ alignItems: "center" }}>
            <Text style={S.headerTitle}>Love Missions</Text>
            {textTask && (
              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "Nunito_700Bold", marginTop: 2 }}>
                Task Level {textTask.level} {LEVEL_BADGES[textTask.level]?.emoji || ""}
              </Text>
            )}
          </View>

          {/* Close / Go Back button — plain circle, no shadow */}
          <Pressable onPress={handleGoBack} style={S.headerCircleBtn}>
            <Ionicons name="close" size={22} color="rgba(255,255,255,0.95)" />
          </Pressable>
        </View>

        {/* ════ 2. SCORE CARD ════ */}
        <View style={{ borderRadius: 24, marginBottom: 12, borderWidth: isDark ? 0 : 1, borderColor: isDark ? "transparent" : "rgba(255,255,255,0.6)", shadowColor: isDark ? "transparent" : theme.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: isDark ? 0 : 2 }}>
          <View style={{ borderRadius: 23, overflow: "hidden" }}>
            <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 }}>
              <LinearGradient colors={isDark ? ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.02)"] : ["rgba(255, 255, 255, 0.8)", "rgba(255, 255, 255, 0.4)"]} style={StyleSheet.absoluteFill} />

              {/* Row 1: Names + Avatars — both center-aligned */}
              <View style={S.scoreNamesRow}>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {coupleProfile?.partnerAAvatar ? (
                    <Image source={getAvatarSource(coupleProfile.partnerAAvatar)} style={{ width: 28, height: 28, borderRadius: 14, borderWidth: isDark ? 0 : 1.5, borderColor: isDark ? "transparent" : "rgba(0,0,0,0.1)" }} />
                  ) : (
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center", borderWidth: isDark ? 0 : 1.5, borderColor: isDark ? "transparent" : "rgba(0,0,0,0.1)" }}>
                      <Ionicons name="person" size={14} color={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.3)"} />
                    </View>
                  )}
                  <Text style={[S.scoreName, { flex: undefined, textAlign: "center", color: isDark ? "#ffffff" : "#9333ea" }]} numberOfLines={1}>{partnerAName}</Text>
                </View>

                <View style={{ width: 10 }} />

                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {coupleProfile?.partnerBAvatar ? (
                    <Image source={getAvatarSource(coupleProfile.partnerBAvatar)} style={{ width: 28, height: 28, borderRadius: 14, borderWidth: isDark ? 0 : 1.5, borderColor: isDark ? "transparent" : "rgba(0,0,0,0.1)" }} />
                  ) : (
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center", borderWidth: isDark ? 0 : 1.5, borderColor: isDark ? "transparent" : "rgba(0,0,0,0.1)" }}>
                      <Ionicons name="person" size={14} color={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.3)"} />
                    </View>
                  )}
                  <Text style={[S.scoreName, { flex: undefined, textAlign: "center", color: isDark ? "#ffffff" : "#9333ea" }]} numberOfLines={1}>{partnerBName}</Text>
                </View>
              </View>

              {/* Row 2: Numbers + center icon */}
              <View style={S.scoreCountRow}>
                <Text style={[S.scoreCount, { color: isDark ? "#ffffff" : "#0f172a" }]}>{scratchCountA}</Text>
                <View style={S.scoreIconCenter}>
                  <AnimatedHeartIcon />
                </View>
                <Text style={[S.scoreCount, { color: isDark ? "#ffffff" : "#0f172a" }]}>{scratchCountB}</Text>
              </View>

              {/* Divider */}
              <View style={[S.scoreDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)" }]} />

              {/* Row 3: Scratches / Performs label */}
              <Text style={[S.scratchPerformLabel, { color: isDark ? "rgba(255,255,255,0.65)" : "rgba(15,23,42,0.55)" }]}>
                {turnName} Scratches{" --> "}{performingName} Performs
              </Text>
            </BlurView>
          </View>
        </View>


        {/* ════ 4. SCRATCH CARD ════ */}
        <View style={S.cardArea}>
          {(isLoading || !currentTask) ? (
            <Skeleton width="100%" height={400} borderRadius={24} style={{ marginBottom: 24, flex: 1 }} />
          ) : (
            <>

              {/* ── BEFORE SCRATCH ── */}
              {!isScratched && textTask ? (
                <View style={S.cardWrapper}>
                  {/* Turn pill — absolute on top edge of the wrapper (no overflow hidden here) */}
                  <View style={S.turnPillAbsolute}>
                    <View style={{ borderRadius: 999, overflow: "hidden", borderWidth: isDark ? 0 : 1, borderColor: isDark ? "transparent" : "rgba(147,51,234,0.3)" }}>
                      <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={[S.turnPill, {
                        backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.4)",
                        borderWidth: 0,
                      }]}>
                        <Text style={[S.turnPillText, { color: isDark ? "#ffffff" : "#6b21a8" }]}>
                          {turnName}'s Turn
                        </Text>
                      </BlurView>
                    </View>
                  </View>

                  <View style={[S.cardOuter, { position: "relative", borderRadius: 30, borderWidth: isDark ? 0 : 6 }]}>
                    <ScratchCard
                      onScratchComplete={handleScratchComplete}
                      overlayImage={
                        isDark
                          ? require("@/assets/images/overlay-dark.png")
                          : require("@/assets/images/overlay-light.png")
                      }
                    >
                      {/* Reveal image — this sits underneath and is shown through scratching */}
                      <LinearGradient
                        colors={["#4c1d95", "#2e1065"] as any}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}
                      >
                        <Text style={{ fontSize: 48, marginBottom: 12 }}>{textTask.emoji}</Text>
                        <Text style={{ color: "#ffffff", fontSize: 24, fontFamily: "DynaPuff_700Bold", textAlign: "center", marginBottom: 8, textShadowColor: "rgba(0,0,0,0.3)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
                          {textTask.title}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 16, textAlign: "center", lineHeight: 22, fontFamily: "Nunito_700Bold" }}>
                          {textTask.description}
                        </Text>
                      </LinearGradient>


                    </ScratchCard>
                  </View>
                </View>
              ) : isScratched && textTask ? (
                /* ── AFTER SCRATCH ── */
                <View style={S.cardWrapper}>
                  {/* Turn pill — absolute on top edge of the wrapper */}
                  <View style={S.turnPillAbsolute}>
                    <View style={{ borderRadius: 999, overflow: "hidden", borderWidth: isDark ? 0 : 1, borderColor: isDark ? "transparent" : "rgba(147,51,234,0.3)" }}>
                      <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={[S.turnPill, {
                        backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.4)",
                        borderWidth: 0,
                      }]}>
                        {!timerStarted ? (
                          <Text style={[S.turnPillText, { color: isDark ? "#ffffff" : "#6b21a8" }]}>
                            {startCountdown !== null ? `${turnName}'s Turn - Starts in ${startCountdown}s` : `${turnName}'s Turn`}
                          </Text>
                        ) : isFinished ? (
                          <Text style={[S.turnPillText, { color: isDark ? "#ef4444" : "#ef4444" }]}>
                            Time's up!
                          </Text>
                        ) : (
                          <Animated.Text style={[S.turnPillText, {
                            color: timeLeft <= 10 ? "#ef4444" : (isDark ? "#ffffff" : "#6b21a8"),
                            opacity: timeLeft <= 10 ? pulseOpacity : 1,
                          }]}>
                            {turnName}'s Turn - {formattedTime}
                          </Animated.Text>
                        )}
                      </BlurView>
                    </View>
                  </View>

                  <Animated.View style={[S.cardOuter, {
                    position: "relative",
                    borderRadius: 30,
                    borderColor: "#7c3aed",
                    borderWidth: isDark ? 0 : 6,
                    opacity: revealOpacity,
                  }]}>
                    {/* Revealed text */}
                    <LinearGradient
                      colors={["#4c1d95", "#2e1065"] as any}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}
                    >
                      <Text style={{ fontSize: 48, marginBottom: 12 }}>{textTask.emoji}</Text>
                      <Text style={{ color: "#ffffff", fontSize: 24, fontFamily: "DynaPuff_700Bold", textAlign: "center", marginBottom: 8, textShadowColor: "rgba(0,0,0,0.3)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
                        {textTask.title}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 16, textAlign: "center", lineHeight: 22, fontFamily: "Nunito_700Bold" }}>
                        {textTask.description}
                      </Text>
                    </LinearGradient>

                  </Animated.View>
                </View>
              ) : null}
            </>
          )}
        </View>

        {/* ════ 5. BOTTOM ACTION BUTTONS ════ */}
        <View style={S.buttonsArea}>
          {(isLoading || !currentTask) ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, width: '100%' }}>
              <Skeleton width="48%" height={56} borderRadius={28} />
              <Skeleton width="48%" height={56} borderRadius={28} />
            </View>
          ) : (
            <>

              {/* ── Complete — 3D shadow (lighter purple) ── */}
              <View style={{ opacity: canComplete ? 1 : 0.35 }}>
                <View style={[S.btn3dShadow, { backgroundColor: "#34d399", borderColor: "#34d399" }]} />
                <Pressable
                  onPress={handleDone}
                  disabled={!canComplete}
                  style={S.btn3dWrapper}
                >
                  <LinearGradient
                    colors={["#10b981", "#059669"] as any}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[S.completeBtnInner, S.btn3dBorder, { borderColor: "rgba(255,255,255,0.35)" }]}
                  >
                    <Text style={S.completeBtnText}>Complete</Text>
                  </LinearGradient>
                </Pressable>
              </View>

              {/* ── Previous | Skip ── */}
              <View style={S.secondRow}>

                {/* Previous — blue 3D pill (lighter blue shadow) */}
                <View style={[{ flex: 1 }, { opacity: (previousTask && !showPrevious) ? 1 : 0.4 }]}>
                  <View style={[S.btn3dShadow, { backgroundColor: "#93c5fd", borderColor: "#93c5fd" }]} />
                  <Pressable
                    onPress={() => setShowPrevious(true)}
                    disabled={!previousTask || showPrevious}
                    style={S.btn3dWrapper}
                  >
                    <LinearGradient
                      colors={["#3b82f6", "#2563eb"] as any}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[S.secondBtnInner, S.btn3dBorder, { borderColor: "rgba(255,255,255,0.35)" }]}
                    >
                      <Ionicons name="arrow-back" size={18} color="#ffffff" />
                      <Text style={S.secondBtnText}>Previous</Text>
                    </LinearGradient>
                  </Pressable>
                </View>

                {/* Skip — yellow 3D pill (lighter amber shadow) */}
                <View style={[{ flex: 1 }, { opacity: canSkip ? 1 : 0.4 }]}>
                  <View style={[S.btn3dShadow, { backgroundColor: "#fde68a", borderColor: "#fde68a" }]} />
                  <Pressable
                    onPress={handleSkip}
                    disabled={!canSkip}
                    style={S.btn3dWrapper}
                  >
                    <LinearGradient
                      colors={["#fbbf24", "#f59e0b"] as any}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[S.secondBtnInner, S.btn3dBorder, { borderColor: "rgba(255,255,255,0.35)" }]}
                    >
                      <Text style={S.secondBtnText}>Skip</Text>
                      <Ionicons name="play-skip-forward" size={18} color="#ffffff" />
                    </LinearGradient>
                  </Pressable>
                </View>

              </View>
            </>
          )}
        </View>

      </View>
      <LevelUpModal visible={levelUpVisible} level={newLevelState} isDark={isDark} onClose={() => setLevelUpVisible(false)} />
      <CustomAlertModal visible={levelCompleteVisible} title={`Level ${completedLevelNum} Completed! 🎉`} message={`You've successfully completed all tasks in Level ${completedLevelNum}. Get ready for Level ${completedLevelNum + 1}!`} icon="trophy" isDark={isDark} onClose={() => setLevelCompleteVisible(false)} />
    </LinearGradient>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  fill_center: { flex: 1, alignItems: "center", justifyContent: "center", paddingLeft: 50, paddingRight: 50, },
  loadingText: { marginTop: 16, color: "#ffffff", fontSize: 16, fontFamily: "DynaPuff_700Bold" },
  bgHeart: { position: "absolute" },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  // Header buttons — proper 3D circle with border + bottom shadow
  headerBtnWrapper: {
    position: "relative",
  },
  headerBtnShadow: {
    position: "absolute",
    top: 4,
    left: 0,
    right: 0,
    bottom: -4,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)",
  },
  headerBtnInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.28)",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  // Legacy — kept for safety
  headerCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "DynaPuff_700Bold",
    fontSize: 20,
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Score card styles
  scoreNamesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  scoreName: {
    flex: 1,
    fontSize: 14,
    fontFamily: "DynaPuff_700Bold",
    color: "#9333ea",
  },
  scoreCountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  scoreCount: {
    flex: 1,
    fontSize: 42,
    fontFamily: "DynaPuff_700Bold",
    textAlign: "center",
  },
  scoreIconCenter: {
    alignItems: "center",
    justifyContent: "center",
    width: 50,
  },
  scoreDivider: {
    height: 1,
    marginBottom: 8,
  },
  scratchPerformLabel: {
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
  },

  // Turn pill
  turnPillWrapper: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  turnPill: {
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 24,
    paddingVertical: 7,
    overflow: "hidden",
  },
  turnPillText: {
    fontFamily: "Nunito_700Bold",
    fontSize: 15,

  },
  // Absolute wrapper — floats pill on top edge of the scratch card
  turnPillAbsolute: {
    position: "absolute",
    top: -16,      // half of pill height, so it straddles the top edge
    left: 0,
    right: 0,
    alignItems: "center",
    borderRadius: 999,
    zIndex: 20,
  },

  // Card — sized to match overlay image ratio 616×770 ≈ 0.80
  // width is ~80% of screen to be smaller and proportional
  cardArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardWrapper: {
    width: "80%",
    aspectRatio: 600 / 740,
    position: "relative",
  },
  cardOuter: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },

  // Pattern (before scratch)
  patternGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    gap: 6,
    alignContent: "center",
    justifyContent: "center",
  },
  scratchHintOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: 18,
  },
  scratchHintPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.38)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scratchHintText: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
  },

  // Timer overlay
  timerOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  timerText: {
    fontSize: 42,
    fontFamily: "DynaPuff_700Bold",
  },
  timerSubText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    marginTop: 2,
  },

  // Buttons
  buttonsArea: {
    gap: 12,
    marginTop: 12,
  },
  // 3D effect: shadow only at bottom — reduced height (3px)
  btn3dShadow: {
    position: "absolute",
    top: 3,
    left: 0,
    right: 0,
    bottom: -3,
    borderRadius: 999,
    borderWidth: 2,
  },
  // Actual button sits on top
  btn3dWrapper: {
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 3,  // space for shadow below
  },
  // Outline border on the gradient itself
  btn3dBorder: {
    borderWidth: 2,
    borderRadius: 999,
  },
  completeBtn: {
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 16,
  },
  completeBtnInner: {
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  completeBtnText: {
    color: "#ffffff",
    fontSize: 20,
    fontFamily: "DynaPuff_700Bold",
  },
  secondRow: {
    flexDirection: "row",
    gap: 12,
  },
  secondBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 999,
  },
  secondBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "DynaPuff_700Bold",
  },

  // Previous screen
  prevLabel: {
    textAlign: "center",
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
});
