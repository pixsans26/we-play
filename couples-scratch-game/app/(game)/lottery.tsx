import { env } from "@/lib/env";
import { apiFetch } from "@/lib/apiClient";
import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing, Alert, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { BlurView } from "@/components/CustomBlurView";

import { useThemeStore, getTheme } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { useGameStore } from "@/store/gameStore";
import { useNotificationStore } from "@/store/notificationStore";
import { LevelUpModal } from "@/components/LevelUpModal";
import { useScratchHistory } from "@/hooks/useScratchHistory";
import { useSound } from "@/hooks/useSound";

const { width } = Dimensions.get("window");

export default function LotteryScreen() {
  const router = useRouter();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const switchTurn = useGameStore((s) => s.switchTurn);
  const coupleProfile = useAuthStore((s) => s.coupleProfile);
  const { getAllHistory, logScratch } = useScratchHistory();
  const { playSpin, playResult } = useSound();

  const store = useGameStore((s) => s);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [lvl1Count, setLvl1Count] = useState(0);
  const [lvl2Count, setLvl2Count] = useState(0);

  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const [newLevelState, setNewLevelState] = useState(1);

  const [isRolling, setIsRolling] = useState(false);
  const [results, setResults] = useState<string[] | null>(null);
  const [reels, setReels] = useState<{ c1: string[], c2: string[], c3: string[] } | null>(null);
  const [seenCombos, setSeenCombos] = useState<Set<string>>(new Set());

  const [currentComboId, setCurrentComboId] = useState<string | null>(null);
  const [statsA, setStatsA] = useState({ rolls: 0, performs: 0 });
  const [statsB, setStatsB] = useState({ rolls: 0, performs: 0 });

  // Animation values for 3 columns
  const col1Anim = useRef(new Animated.Value(0)).current;
  const col2Anim = useRef(new Animated.Value(0)).current;
  const col3Anim = useRef(new Animated.Value(0)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  // Button push animations
  const spinBtnAnim = useRef(new Animated.Value(1)).current;

  const turnName = currentTurn === "A"
    ? coupleProfile?.partnerAName ?? "Partner A"
    : coupleProfile?.partnerBName ?? "Partner B";

  const otherName = currentTurn === "A"
    ? coupleProfile?.partnerBName ?? "Partner B"
    : coupleProfile?.partnerAName ?? "Partner A";

  function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  useEffect(() => {
    fetchSeenCombos();
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bgAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [coupleProfile]);

  async function fetchSeenCombos() {
    if (!coupleProfile) return;
    const partnerBUidFallback = coupleProfile.partnerBUid || `partner_b_pending_${coupleProfile.id || "0"}`;
    const history = await getAllHistory(coupleProfile.partnerAUid, partnerBUidFallback);
    const lotteryHistory = history.filter(h => h.taskType === "lottery" && h.completed);
    setLvl1Count(lotteryHistory.filter(h => h.taskId.includes("_1_")).length);
    setLvl2Count(lotteryHistory.filter(h => h.taskId.includes("_2_")).length);
    setSeenCombos(new Set(lotteryHistory.map(h => h.taskId)));

    
    
    setStatsA({
      rolls: lotteryHistory.filter(h => h.userUid === coupleProfile.partnerAUid).length,
      performs: lotteryHistory.filter(h => h.performerUid === coupleProfile.partnerAUid).length,
    });
    setStatsB({
      rolls: lotteryHistory.filter(h => h.userUid === partnerBUidFallback).length,
      performs: lotteryHistory.filter(h => h.performerUid === partnerBUidFallback).length,
    });
  }

  const handleSelectLevel = (lvl: number) => {
    if (lvl === 2 && lvl1Count < 8) {
      Alert.alert("Locked 🔒", `Complete ${8 - lvl1Count} more Level 1 Love Lottery task(s) to unlock Level 2.`);
      return;
    }
    if (lvl === 3 && lvl2Count < 6) {
      Alert.alert("Locked 🔒", `Complete ${6 - lvl2Count} more Level 2 Love Lottery task(s) to unlock Level 3.`);
      return;
    }
    setSelectedLevel(lvl);
  };

  const handleResetLottery = () => {
    Alert.alert("Reset Love Lottery?", "This will clear your Love Lottery progress and lock the higher levels.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset", style: "destructive", onPress: async () => {
          if (!coupleProfile) return;
          try {
            await apiFetch(`${env.EXPO_PUBLIC_API_URL}/api/history/reset?uid=${coupleProfile.partnerAUid}`, { method: "DELETE" });
            if (coupleProfile.partnerBUid) {
              await apiFetch(`${env.EXPO_PUBLIC_API_URL}/api/history/reset?uid=${coupleProfile.partnerBUid}`, { method: "DELETE" });
            }
            setLvl1Count(0);
            setLvl2Count(0);
            setSeenCombos(new Set());
            setSelectedLevel(1);
          } catch { }
        }
      }
    ]);
  };

  const handleRoll = () => {
    if (isRolling) return;
    setIsRolling(true);
    setResults(null);

    // Button push effect
    Animated.sequence([
      Animated.timing(spinBtnAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(spinBtnAnim, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();

    playSpin();

    const lotteryData = store.lotteryData;
    if (!lotteryData || lotteryData.col1.length === 0) {
      setIsRolling(false);
      Alert.alert("No Data", "No lottery items found.");
      return;
    }

    let levelFilteredCol1, levelFilteredCol2, baseCol3;

    if (selectedLevel === 3) {
      levelFilteredCol1 = lotteryData.col1.filter((c: any) => c.level === 3);
      levelFilteredCol2 = lotteryData.col2.filter((c: any) => c.level === 2 || c.level === 3);
      baseCol3 = lotteryData.col3.filter((c: any) => c.level === 3);
    } else if (selectedLevel === 2) {
      levelFilteredCol1 = lotteryData.col1.filter((c: any) => c.level === 2);
      levelFilteredCol2 = lotteryData.col2.filter((c: any) => c.level === 2);
      baseCol3 = lotteryData.col3.filter((c: any) => c.level === 2);
    } else {
      levelFilteredCol1 = lotteryData.col1.filter((c: any) => c.level === 1);
      levelFilteredCol2 = lotteryData.col2.filter((c: any) => c.level === 1);
      baseCol3 = lotteryData.col3.filter((c: any) => c.level === 1);
    }

    // If no items match the level (e.g. database setup issues), fallback to all items
    const col1List = levelFilteredCol1.length > 0 ? levelFilteredCol1 : lotteryData.col1;
    const col2List = levelFilteredCol2.length > 0 ? levelFilteredCol2 : lotteryData.col2;
    const col3List = baseCol3.length > 0 ? baseCol3 : lotteryData.col3;

    let c1: any, c2: any, c3: any;
    let comboId = "";
    let attempts = 0;

    do {
      c1 = col1List[Math.floor(Math.random() * col1List.length)];
      c2 = col2List[Math.floor(Math.random() * col2List.length)];

      const isMouth = c1.type === "mouth";
      const isHand = c1.type === "hand";

      let validCol3 = col3List;
      if (isMouth) validCol3 = validCol3.filter((c: any) => c.type === "any" || c.type === "mouth");
      if (isHand) validCol3 = validCol3.filter((c: any) => c.type === "any" || c.type === "hand");

      if (validCol3.length === 0) validCol3 = col3List;
      c3 = validCol3[Math.floor(Math.random() * validCol3.length)];

      const stringComboId = `${c1.label}_${c2.label}_${c3.label}`.toLowerCase().replace(/\s+/g, '-');
      comboId = `lottery_${selectedLevel}_${stringComboId}`;
      attempts++;
    } while (seenCombos.has(comboId) && attempts < 50);

    const finalCombo = [c1.label, c2.label, c3.label];
    const finalComboId = comboId;

    // Generate reels
    const SPIN_ITEMS = 30;
    const ITEM_HEIGHT = 60;

    const generateReel = (pool: any[], finalResult: string) => {
      const reel = [];
      for (let i = 0; i < SPIN_ITEMS - 1; i++) {
        reel.push(pool[Math.floor(Math.random() * pool.length)].label);
      }
      reel.push(finalResult);
      return reel;
    };

    setReels({
      c1: generateReel(col1List, finalCombo[0]),
      c2: generateReel(col2List, finalCombo[1]),
      c3: generateReel(col3List, finalCombo[2]),
    });

    // Reset anims
    col1Anim.setValue(0);
    col2Anim.setValue(0);
    col3Anim.setValue(0);

    const targetY = -((SPIN_ITEMS - 1) * ITEM_HEIGHT);

    const createSpinAnim = (anim: Animated.Value, duration: number) => {
      return Animated.timing(anim, {
        toValue: targetY,
        duration: duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      });
    };

    createSpinAnim(col1Anim, 2500).start();
    setTimeout(() => createSpinAnim(col2Anim, 2500).start(), 300);
    setTimeout(() => createSpinAnim(col3Anim, 2500).start(), 600);

    setTimeout(() => {
      setResults(finalCombo);
      setCurrentComboId(finalComboId);
      setIsRolling(false);
      playResult();
    }, 3200);
  };

  const handleDone = async () => {
    if (currentComboId && coupleProfile) {
      const rollerUid = currentTurn === "A" ? coupleProfile.partnerAUid : (coupleProfile.partnerBUid || `partner_b_pending_${coupleProfile.id || "0"}`);
      const performerUid = currentTurn === "A" ? (coupleProfile.partnerBUid || `partner_b_pending_${coupleProfile.id || "0"}`) : coupleProfile.partnerAUid;
      if (rollerUid && performerUid) {
        await logScratch({
          userUid: rollerUid,
          taskId: currentComboId,
          taskType: "lottery",
          completed: true,
          skipped: false,
          performerUid: performerUid,
        });
        
        if (rollerUid) {
          const fetchLevel = async () => {
            try {
              const res = await apiFetch(`${env.EXPO_PUBLIC_API_URL}/api/progress/${rollerUid}`);
              if (res.ok) { const d = await res.json(); return d.currentLevel || 1; }
            } catch { return 1; }
            return 1;
          };

          try {
            const oldLevel = await fetchLevel();
            const res = await apiFetch(`${env.EXPO_PUBLIC_API_URL}/api/progress/${rollerUid}/increment-completed`, { method: "PATCH" });
            if (res.ok) {
              const data = await res.json();
              if (data.currentLevel > oldLevel) {
                setNewLevelState(data.currentLevel);
                setLevelUpVisible(true);
              }
            }
          } catch (err) {
            console.error("Failed to increment progress", err);
          }
        }

        setSeenCombos(prev => new Set(prev).add(currentComboId));
        if (selectedLevel === 1) setLvl1Count(prev => prev + 1);
        if (selectedLevel === 2) setLvl2Count(prev => prev + 1);
        fetchSeenCombos();
      }
    }
    setResults(null);
    setCurrentComboId(null);
    switchTurn();
  };

  const getColStyle = (animValue: Animated.Value) => {
    return {
      transform: [{ translateY: animValue }],
    };
  };

  const bgColors = (isDark ? ["#2a0410", "#4c0519"] : ["#fda4af", "#e11d48"]) as any;
  const heartColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.4)";

  return (
    <LinearGradient colors={bgColors} locations={[0, 1]} style={styles.container}>

      {/* Decorative Background Hearts */}
      <Animated.View style={{ position: "absolute", top: 80, left: -20, transform: [{ rotate: "-15deg" }, { translateY: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) }] }}>
        <Ionicons name="heart" size={120} color={heartColor} />
      </Animated.View>
      <Animated.View style={{ position: "absolute", top: 200, right: -10, transform: [{ rotate: "25deg" }, { translateY: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }) }] }}>
        <Ionicons name="heart" size={80} color={heartColor} />
      </Animated.View>
      <Animated.View style={{ position: "absolute", bottom: 100, left: 30, transform: [{ rotate: "-10deg" }, { translateY: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }] }}>
        <Ionicons name="heart" size={150} color={heartColor} />
      </Animated.View>

      {/* Top Nav */}
      <View style={styles.topNav}>
        <Pressable onPress={() => router.back()} style={styles.navButton}>
          <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={{ flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 32, overflow: "hidden" }}>
            <Ionicons name="arrow-back" size={24} color={isDark ? "#fff" : "#4c0519"} />
          </BlurView>
        </Pressable>
        <Pressable onPress={handleResetLottery} style={styles.navButton}>
          <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={{ flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 32, overflow: "hidden" }}>
            <Ionicons name="refresh" size={22} color={isDark ? "#fff" : "#4c0519"} />
          </BlurView>
        </Pressable>
      </View>

      {/* 4 KPI Cards for Stats */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { backgroundColor: isDark ? "#0f172a" : "#ffffff", borderColor: isDark ? "#334155" : "#cbd5e1" }]}>
          <Text style={[styles.kpiLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>{coupleProfile?.partnerAName ?? "A"} Rolls</Text>
          <Text style={[styles.kpiValue, { color: isDark ? "#fb7185" : "#e11d48" }]}>{statsA.rolls}</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: isDark ? "#0f172a" : "#ffffff", borderColor: isDark ? "#334155" : "#cbd5e1" }]}>
          <Text style={[styles.kpiLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>{coupleProfile?.partnerAName ?? "A"} Perf.</Text>
          <Text style={[styles.kpiValue, { color: isDark ? "#fb7185" : "#e11d48" }]}>{statsA.performs}</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: isDark ? "#0f172a" : "#ffffff", borderColor: isDark ? "#334155" : "#cbd5e1" }]}>
          <Text style={[styles.kpiLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>{coupleProfile?.partnerBName ?? "B"} Rolls</Text>
          <Text style={[styles.kpiValue, { color: isDark ? "#fb7185" : "#e11d48" }]}>{statsB.rolls}</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: isDark ? "#0f172a" : "#ffffff", borderColor: isDark ? "#334155" : "#cbd5e1" }]}>
          <Text style={[styles.kpiLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>{coupleProfile?.partnerBName ?? "B"} Perf.</Text>
          <Text style={[styles.kpiValue, { color: isDark ? "#fb7185" : "#e11d48" }]}>{statsB.performs}</Text>
        </View>
      </View>

      <View style={styles.machineWrapper}>

        {/* Arcade Cabinet Casing */}
        <View style={[styles.cabinetOuter, { backgroundColor: isDark ? "#4c0519" : "#fecdd3" }]}>

          {/* Marquee Header */}
          <View style={styles.marqueeHeader}>
            <LinearGradient colors={["#f43f5e", "#be123c"]} style={styles.marqueeBg} />
            <Ionicons name="heart" size={14} color="#fef08a" style={{ position: "absolute", top: 10, left: 40 }} />
            <Ionicons name="heart" size={20} color="#fef08a" style={{ position: "absolute", top: 5, left: 80 }} />
            <Ionicons name="heart" size={20} color="#fef08a" style={{ position: "absolute", top: 5, right: 80 }} />
            <Ionicons name="heart" size={14} color="#fef08a" style={{ position: "absolute", top: 10, right: 40 }} />

            {/* Ribbon */}
            <View style={styles.ribbon}>
              <LinearGradient colors={["#fde047", "#d97706"]} style={StyleSheet.absoluteFillObject} />
              <Text style={styles.ribbonText}>LOVE LOTTERY</Text>
            </View>
          </View>

          {/* Machine Body (Metallic) */}
          <LinearGradient colors={isDark ? ["#881337", "#9f1239", "#be123c"] : ["#fff1f2", "#ffe4e6", "#fecdd3"]} style={styles.machineBody}>

            <View style={{ alignSelf: "center", borderRadius: 32, overflow: "hidden", marginBottom: 16 }}>
              <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 32, overflow: "hidden" }}>
                <Text style={[styles.turnIndicatorText, { color: isDark ? "#fb923c" : "#c2410c" }]}>
                  {turnName} <Text style={{ color: isDark ? "#fff" : "#000" }}>rolls</Text> • {otherName} <Text style={{ color: isDark ? "#fff" : "#000" }}>performs</Text>
                </Text>
              </BlurView>
            </View>

            {/* Recessed Reels Container */}
            <View style={styles.reelsOuter}>
              <View style={styles.reelsInner}>

                {/* Column 1 */}
                <LinearGradient colors={["#881337", "#fff1f2", "#fff1f2", "#881337"]} style={styles.reelColumn}>
                  <Animated.View style={[styles.reelStrip, getColStyle(col1Anim)]}>
                    {reels ? reels.c1.map((item, idx) => (
                      <View key={idx} style={styles.slotItem}>
                        <Text style={styles.slotText}>{item}</Text>
                      </View>
                    )) : (
                      <View style={styles.slotItem}>
                        <Text style={styles.slotText}>{results ? results[0] : "?"}</Text>
                      </View>
                    )}
                  </Animated.View>
                </LinearGradient>

                <View style={styles.reelDivider} />

                {/* Column 2 */}
                <LinearGradient colors={["#881337", "#fff1f2", "#fff1f2", "#881337"]} style={styles.reelColumn}>
                  <Animated.View style={[styles.reelStrip, getColStyle(col2Anim)]}>
                    {reels ? reels.c2.map((item, idx) => (
                      <View key={idx} style={styles.slotItem}>
                        <Text style={styles.slotText}>{item}</Text>
                      </View>
                    )) : (
                      <View style={styles.slotItem}>
                        <Text style={styles.slotText}>{results ? results[1] : "?"}</Text>
                      </View>
                    )}
                  </Animated.View>
                </LinearGradient>

                <View style={styles.reelDivider} />

                {/* Column 3 */}
                <LinearGradient colors={["#881337", "#fff1f2", "#fff1f2", "#881337"]} style={styles.reelColumn}>
                  <Animated.View style={[styles.reelStrip, getColStyle(col3Anim)]}>
                    {reels ? reels.c3.map((item, idx) => (
                      <View key={idx} style={styles.slotItem}>
                        <Text style={styles.slotText}>{item}</Text>
                      </View>
                    )) : (
                      <View style={styles.slotItem}>
                        <Text style={styles.slotText}>{results ? results[2] : "?"}</Text>
                      </View>
                    )}
                  </Animated.View>
                </LinearGradient>



              </View>
            </View>

            {/* Bottom Control Panel */}
            <LinearGradient colors={["#4c0519", "#881337"]} style={styles.controlPanel}>

              {/* Digital Stats Screen */}
              <View style={styles.statsScreen}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>LEVEL</Text>
                  <Text style={styles.statValue}>{selectedLevel}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>ROLLS</Text>
                  <Text style={styles.statValue}>{seenCombos.size}</Text>
                </View>
              </View>

              <View style={styles.controlsRow}>
                {/* Level Buttons */}
                <View style={styles.levelButtonsContainer}>
                  {[1, 2, 3].map((lvl) => {
                    const isSelected = selectedLevel === lvl;
                    const isLocked = (lvl === 2 && lvl1Count < 8) || (lvl === 3 && lvl2Count < 6);
                    return (
                      <Pressable key={lvl} onPress={() => handleSelectLevel(lvl)} style={styles.levelBtnWrapper}>
                        <View style={[styles.levelBtnBase, isSelected && { backgroundColor: "#e11d48" }]} />
                        <View style={[styles.levelBtnTop, isSelected && { transform: [{ translateY: 2 }], backgroundColor: "#fb7185", borderColor: "#fda4af" }]}>
                          <Text style={styles.levelBtnText}>{lvl}</Text>
                          {isLocked && <Ionicons name="lock-closed" size={10} color="#fff" style={{ position: "absolute", top: 2, right: 2 }} />}
                        </View>
                        <Text style={styles.levelBtnLabel}>LVL {lvl}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Spin Button */}
                <Animated.View style={{ transform: [{ scale: spinBtnAnim }] }}>
                  {results ? (
                    <Pressable onPress={handleDone} style={styles.spinBtnWrapper}>
                      <View style={[styles.spinBtnBase, { backgroundColor: "#166534" }]} />
                      <View style={[styles.spinBtnTop, { backgroundColor: "#22c55e", borderColor: "#86efac" }]}>
                        <Text style={styles.spinBtnText}>DONE</Text>
                      </View>
                    </Pressable>
                  ) : (
                    <Pressable onPress={handleRoll} disabled={isRolling} style={styles.spinBtnWrapper}>
                      <View style={styles.spinBtnBase} />
                      <View style={styles.spinBtnTop}>
                        <Text style={styles.spinBtnText}>{isRolling ? "WAIT" : "SPIN"}</Text>
                      </View>
                    </Pressable>
                  )}
                </Animated.View>
              </View>

            </LinearGradient>

          </LinearGradient>
        </View>
      </View>

      <LevelUpModal visible={levelUpVisible} level={newLevelState} isDark={isDark} onClose={() => setLevelUpVisible(false)} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56, paddingHorizontal: 16 },
  topNav: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  navButton: { width: 44, height: 44, borderRadius: 32, overflow: "hidden" },

  kpiRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, gap: 8 },
  kpiCard: { flex: 1, borderRadius: 32, overflow: "hidden", paddingVertical: 10, alignItems: "center", borderWidth: 1 },
  kpiLabel: { fontSize: 9,  marginBottom: 4, textAlign: "center", fontFamily: "Nunito_700Bold" },
  kpiValue: { fontSize: 18,  fontFamily: "DynaPuff_700Bold" },

  machineWrapper: { flex: 1, justifyContent: "center", alignItems: "center", marginBottom: 40, overflow: "hidden" },

  cabinetOuter: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fecdd3",
    borderRadius: 30,
    padding: 8,
  },

  marqueeHeader: {
    height: 100,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 15,
    borderWidth: 2, borderColor: "#e2e8f0",
    borderBottomWidth: 0,
  },
  marqueeBg: {
    ...StyleSheet.absoluteFillObject,
  },
  ribbon: {
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2, borderColor: "#fde047",
    overflow: "hidden",
  },
  ribbonText: {
    color: "#78350f",
    fontSize: 22,
    
    fontFamily: "DynaPuff_700Bold",
  },

  machineBody: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderWidth: 2, borderColor: "#e2e8f0",
    padding: 16,
    paddingTop: 10,
  },

  turnIndicator: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.4)",
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 32, overflow: "hidden",
    marginBottom: 16,
  },
  turnIndicatorText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#c2410c",
  },

  reelsOuter: {
    backgroundColor: "#000",
    borderRadius: 12, overflow: "hidden",
    padding: 4,
    marginBottom: 20,
  },
  reelsInner: {
    flexDirection: "row",
    height: 60,
    backgroundColor: "#1e293b",
    borderRadius: 8,
    overflow: "hidden",
  },
  reelColumn: {
    flex: 1,
    overflow: "hidden",
  },
  reelDivider: {
    width: 2,
    backgroundColor: "#000",
    height: "100%",
  },
  reelStrip: {
    position: "absolute",
    top: 0, // Centers the first item
    width: "100%",
  },
  slotItem: {
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  slotText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#000",
    textAlign: "center",
    textShadowColor: "rgba(255,255,255,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  controlPanel: {
    borderRadius: 32, overflow: "hidden",
    padding: 16,
    borderWidth: 2, borderColor: "#475569",
  },

  statsScreen: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#2a0410",
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    borderWidth: 2, borderColor: "#4c0519",
  },
  statBox: {
    alignItems: "center",
  },
  statLabel: {
    color: "#fda4af",
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 4,
  },
  statValue: {
    color: "#fb7185",
    fontSize: 24,
    
    fontFamily: "DynaPuff_700Bold",
  },

  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelButtonsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  levelBtnWrapper: {
    alignItems: "center",
    width: 44,
  },
  levelBtnBase: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 32, overflow: "hidden",
    backgroundColor: "#831843",
    top: 4,
  },
  levelBtnTop: {
    width: 36,
    height: 36,
    borderRadius: 32, overflow: "hidden",
    backgroundColor: "#db2777",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1, borderColor: "#f472b6",
  },
  levelBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  levelBtnLabel: {
    color: "#94a3b8",
    fontSize: 9,
    fontWeight: "800",
    marginTop: 8,
  },

  spinBtnWrapper: {
    width: 100,
    height: 60,
  },
  spinBtnBase: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 30,
    backgroundColor: "#991b1b",
    top: 6,
  },
  spinBtnTop: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2, borderColor: "#f87171",
  },
  spinBtnText: {
    color: "#fff",
    fontSize: 22,
    
    fontFamily: "DynaPuff_700Bold",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
});
