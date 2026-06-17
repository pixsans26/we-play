import React, { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions, Animated, Easing, Modal, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, G, Text as SvgText, Circle, Polygon, Defs, LinearGradient as SvgLinearGradient, Stop, Filter, FeGaussianBlur, FeMerge, FeMergeNode } from "react-native-svg";
import { BlurView } from "@/components/CustomBlurView";
import { useScratchHistory } from "@/hooks/useScratchHistory";
import { useThemeStore, getTheme } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { useGameStore } from "@/store/gameStore";
import { useSound } from "@/hooks/useSound";

const { width, height } = Dimensions.get("window");
const WHEEL_SIZE = width * 0.82;
const CENTER = WHEEL_SIZE / 2;
const RIM_WIDTH = 14;
const RADIUS = (WHEEL_SIZE / 2) - RIM_WIDTH;

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function getWedgePath(startAngle: number, endAngle: number) {
  const start = polarToCartesian(CENTER, CENTER, RADIUS, endAngle);
  const end = polarToCartesian(CENTER, CENTER, RADIUS, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", start.x, start.y,
    "A", RADIUS, RADIUS, 0, largeArcFlag, 0, end.x, end.y,
    "L", CENTER, CENTER,
    "Z"
  ].join(" ");
}

const FloatingHeart = ({ delay }: { delay: number }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 6000 + Math.random() * 4000,
        delay,
        useNativeDriver: true,
        easing: Easing.linear
      })
    ).start();
  }, [delay]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [height, -100] });
  const scale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.2, 0.5] });
  const xOffset = useRef(Math.random() * width).current;

  return (
    <Animated.View style={{ position: 'absolute', left: xOffset, top: 0, transform: [{ translateY }, { scale }], opacity: 0.1, zIndex: 0 }}>
      <Ionicons name="heart" size={30} color="#ec4899" />
    </Animated.View>
  );
};

export default function SpinWheelScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const switchTurn = useGameStore((s) => s.switchTurn);
  const coupleProfile = useAuthStore((s) => s.coupleProfile);
  const { logScratch } = useScratchHistory();
  const { playLevelUp } = useSound();

  const rawTasks = useGameStore((s) => s.spinTasks);

  const spinTasks = React.useMemo(() => {
    if (!rawTasks || rawTasks.length === 0) return [];
    if (rawTasks.length === 9) return rawTasks;
    if (rawTasks.length > 9) return rawTasks.slice(0, 9);
    const padded = [...rawTasks];
    while (padded.length < 9) {
      padded.push(rawTasks[padded.length % rawTasks.length]);
    }
    return padded;
  }, [rawTasks]);

  const NUM_SLICES = Math.max(1, spinTasks.length);
  const ANGLE_PER_SLICE = 360 / NUM_SLICES;

  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const rotation = useRef(new Animated.Value(0)).current;
  const spinBtnAnim = useRef(new Animated.Value(1)).current;
  const rayRotation = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rayRotation, {
        toValue: 360,
        duration: 15000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(colorAnim, { toValue: 1, duration: 3000, useNativeDriver: false }),
        Animated.timing(colorAnim, { toValue: 0, duration: 3000, useNativeDriver: false })
      ])
    ).start();
  }, []);

  const turnName = currentTurn === "A"
    ? coupleProfile?.partnerAName ?? "Partner A"
    : coupleProfile?.partnerBName ?? "Partner B";

  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setResult(null);
    overlayOpacity.setValue(0);

    Animated.sequence([
      Animated.timing(spinBtnAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(spinBtnAnim, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();

    const extraRotations = 360 * 5;
    const randomSliceIndex = Math.floor(Math.random() * NUM_SLICES);

    // We want the selected slice to end up at the TOP (0 degrees).
    const targetAngle = extraRotations + (360 - (randomSliceIndex * ANGLE_PER_SLICE));

    rotation.setValue(0);
    Animated.timing(rotation, {
      toValue: targetAngle,
      duration: 4000,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start(() => {
      handleSpinComplete(randomSliceIndex);
    });
  };

  const handleSpinComplete = (index: number) => {
    setIsSpinning(false);
    const task = spinTasks[index];
    setResult(task);
    playLevelUp();

    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const handleDone = () => {
    if (result && coupleProfile) {
      const rollerUid = currentTurn === "A" ? coupleProfile.partnerAUid : coupleProfile.partnerBUid;
      const performerUid = currentTurn === "A" ? coupleProfile.partnerBUid : coupleProfile.partnerAUid;
      if (rollerUid && performerUid) {
        logScratch({
          userUid: rollerUid,
          taskId: result.label,
          taskType: "spin_wheel",
          completed: true,
          skipped: false,
          performerUid: performerUid,
        });
      }
    }
    setResult(null);
    overlayOpacity.setValue(0);
    switchTurn();
    router.replace("/(game)/");
  };

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"]
  });

  const rayRotateInterpolate = rayRotation.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"]
  });

  const cardBgColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#5b21b6", "#7c3aed"]
  });

  const bgColors = ["#172554", "#4c1d95"]; // Dark blue to deep purple

  return (
    <LinearGradient colors={bgColors as any} style={styles.container}>
      {/* Background Hearts Doodle */}
      {!result && Array.from({ length: 15 }).map((_, i) => (
        <FloatingHeart key={i} delay={i * 400} />
      ))}
      
      {/* Light Rays Background when won */}
      {result && (
        <Animated.View style={[styles.lightRaysContainer, { transform: [{ rotate: rayRotateInterpolate }] }]}>
          <Svg width="150%" height="150%" viewBox="-100 -100 200 200">
            <Defs>
              <SvgLinearGradient id="rayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                <Stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </SvgLinearGradient>
              <Filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <FeGaussianBlur stdDeviation="8" result="blur" />
                <FeMerge>
                  <FeMergeNode in="blur" />
                  <FeMergeNode in="SourceGraphic" />
                </FeMerge>
              </Filter>
            </Defs>
            <G filter="url(#glow)">
              {Array.from({ length: 16 }).map((_, i) => {
                const angle = (i * 22.5 * Math.PI) / 180;
                const nextAngle = ((i * 22.5 + 11.25) * Math.PI) / 180;
                const r = 200;
                const x1 = r * Math.cos(angle);
                const y1 = r * Math.sin(angle);
                const x2 = r * Math.cos(nextAngle);
                const y2 = r * Math.sin(nextAngle);
                return <Polygon key={i} points={`0,0 ${x1},${y1} ${x2},${y2}`} fill="url(#rayGrad)" />
              })}
            </G>
          </Svg>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={{ flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 32, overflow: "hidden" }}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </BlurView>
        </Pressable>
        {/* Removed "Fate Wheel" text to match design, title is below */}
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.contentArea}>

        {/* Who is spinning */}
        <View style={{ backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 12 }}>
          <Text style={{ color: "#facc15", fontSize: 14, fontWeight: "bold", fontFamily: "DynaPuff_700Bold" }}>
            {turnName} is spinning!
          </Text>
        </View>

        {/* The "spin the wheel" Sparkle Title */}
        <View style={styles.titleWrapper}>
          <Text style={styles.mainTitle}>Spin</Text>
          <Text style={styles.subTitle}>the wheel</Text>
          <Ionicons name="sparkles" size={16} color="#fef08a" style={{ position: "absolute", top: -5, left: -15 }} />
          <Ionicons name="sparkles" size={12} color="#fef08a" style={{ position: "absolute", bottom: 0, right: -15 }} />
        </View>

        {/* The Purple 3D Container */}
        <Animated.View style={[styles.purpleContainer, { backgroundColor: cardBgColor }]}>

          {/* Top Pointer */}
          <View style={styles.pointerContainer}>
            <Svg width={48} height={48} viewBox="0 0 24 24">
              <Defs>
                <SvgLinearGradient id="pointer-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#f43f5e" />
                  <Stop offset="100%" stopColor="#e11d48" />
                </SvgLinearGradient>
              </Defs>
              <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#pointer-grad)" stroke="#ffffff" strokeWidth="1.5" />
            </Svg>
          </View>

          {/* Wheel Frame */}
          <View style={styles.wheelWrapper}>
            <Animated.View style={[styles.wheelTransform, { transform: [{ rotate: rotateInterpolate }] }]}>
              <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
                <G x="0" y="0">
                  {/* Slices */}
                  {spinTasks.map((task, i) => {
                    const startAngle = -ANGLE_PER_SLICE / 2;
                    const endAngle = ANGLE_PER_SLICE / 2;
                    const slicePath = getWedgePath(startAngle, endAngle);

                    const fallbackColors = ["#14b8a6", "#f472b6", "#fb923c", "#facc15"];
                    const color = task.color || fallbackColors[i % fallbackColors.length];

                    return (
                      <G key={`${task.id}-${i}`} rotation={i * ANGLE_PER_SLICE} origin={`${CENTER}, ${CENTER}`}>
                        <Path d={slicePath} fill={color} stroke="#000000" strokeWidth={1} />
                      </G>
                    );
                  })}

                  {/* Outer Rim (Thick Black with Yellow Stroke inside) */}
                  <Circle cx={CENTER} cy={CENTER} r={WHEEL_SIZE / 2 - 7} fill="none" stroke="#000" strokeWidth={14} />
                  <Circle cx={CENTER} cy={CENTER} r={WHEEL_SIZE / 2 - 7} fill="none" stroke="#facc15" strokeWidth={4} />
                  <Circle cx={CENTER} cy={CENTER} r={WHEEL_SIZE / 2 - 1} fill="none" stroke="#ffffff" strokeWidth={2} />

                  {/* Center Knob */}
                  <Circle cx={CENTER} cy={CENTER} r={36} fill="#65a30d" stroke="#fef08a" strokeWidth={4} />
                  <SvgText x={CENTER} y={CENTER + 2} fontSize={12} fill="#ffffff" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">
                    PLAY
                  </SvgText>
                </G>
              </Svg>
            </Animated.View>

            {/* Dark Overlay inside the Wheel for Result */}
            <Animated.View pointerEvents="none" style={[styles.wheelOverlay, { opacity: overlayOpacity }]}>
              <View style={styles.overlayInner}>
                <Text style={styles.youWonText}>YOU WON!</Text>
                <Text style={styles.resultMainText}>{result?.label}</Text>
              </View>
            </Animated.View>

          </View>

          {/* Container Bottom (Button Area) */}
          <View style={styles.containerBottom}>
            {result ? (
              <View style={styles.cardActionsRow}>
                <Pressable onPress={handleDone} style={[styles.actionBtn, { backgroundColor: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.2)", borderWidth: 1 }]}>
                  <Text style={styles.actionBtnText}>Done</Text>
                </Pressable>
                <Pressable onPress={handleSpin} style={[styles.actionBtn, { backgroundColor: "#4f46e5" }]}>
                  <Text style={styles.actionBtnText}>Spin Again</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.dotsRow}>
                  <View style={[styles.dot, isSpinning ? styles.dotDim : null]} />
                  <View style={[styles.dot, isSpinning ? styles.dotDim : null]} />
                </View>
                
                <Animated.View style={{ transform: [{ scale: spinBtnAnim }] }}>
                  <Pressable onPress={handleSpin} disabled={isSpinning} style={styles.arcadeBtnWrapper}>
                    <View style={[styles.arcadeBtnBase, isSpinning && { backgroundColor: "#854d0e" }]} />
                    <View style={[styles.arcadeBtnTop, isSpinning && { backgroundColor: "#a16207", borderColor: "#ca8a04", top: 4 }]}>
                      {isSpinning ? (
                        <Text style={styles.arcadeBtnText}>• • •</Text>
                      ) : (
                        <Text style={styles.arcadeBtnText}>SPIN</Text>
                      )}
                    </View>
                  </Pressable>
                </Animated.View>

                <View style={styles.dotsRow}>
                  <View style={[styles.dot, isSpinning ? styles.dotDim : null]} />
                  <View style={[styles.dot, isSpinning ? styles.dotDim : null]} />
                </View>
              </>
            )}
          </View>

        </Animated.View>

      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56, overflow: 'hidden' },
  lightRaysContainer: { position: "absolute", top: "50%", left: "50%", width: 1000, height: 1000, marginLeft: -500, marginTop: -500, alignItems: "center", justifyContent: "center", zIndex: 0 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, marginBottom: 20, zIndex: 10 },
  backButton: { width: 44, height: 44, borderRadius: 32, overflow: "hidden" },
  contentArea: { flex: 1, alignItems: "center", justifyContent: "flex-start", paddingTop: 10, paddingBottom: 20, zIndex: 10 },

  titleWrapper: { alignItems: "center", marginBottom: 10, zIndex: 20, overflow: "visible" },
  mainTitle: { fontSize: 48, color: "#fff", fontWeight: "900", fontFamily: "DynaPuff_700Bold", textShadowColor: "#c084fc", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12, letterSpacing: -1, overflow: "visible", paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  subTitle: { fontSize: 36, color: "#fef08a", fontWeight: "900", fontFamily: "DynaPuff_700Bold", textShadowColor: "#ca8a04", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12, overflow: "visible", paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, marginTop: -40 },

  purpleContainer: { backgroundColor: "#5b21b6", borderRadius: 32, width: width * 0.9, alignItems: "center", paddingTop: 24, paddingBottom: 24, position: "relative", shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10, borderWidth: 1, borderColor: "#7c3aed" },

  pointerContainer: { position: "absolute", top: -8, zIndex: 40, alignSelf: "center" },

  wheelWrapper: { width: WHEEL_SIZE, height: WHEEL_SIZE, borderRadius: WHEEL_SIZE / 2, backgroundColor: "#000", position: "relative", zIndex: 20 },
  wheelTransform: { width: WHEEL_SIZE, height: WHEEL_SIZE, borderRadius: WHEEL_SIZE / 2 },

  wheelOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: WHEEL_SIZE / 2, backgroundColor: "rgba(0,0,0,0.85)", zIndex: 30 },
  overlayInner: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  youWonText: { color: "#4ade80", fontSize: 28, fontWeight: "900", fontFamily: "DynaPuff_700Bold", marginBottom: 12, textShadowColor: "#166534", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  resultMainText: { color: "#fff", fontSize: 26, fontWeight: "900", fontFamily: "DynaPuff_700Bold", textAlign: "center", textShadowColor: "rgba(0,0,0,0.8)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },

  containerBottom: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-evenly", marginTop: 24, paddingHorizontal: 20, zIndex: 20 },
  dotsRow: { flexDirection: "column", gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#a78bfa", shadowColor: "#a78bfa", shadowOffset: { width: 0, height: 0 }, shadowRadius: 5, shadowOpacity: 1 },
  dotDim: { backgroundColor: "#4c1d95", shadowOpacity: 0 },

  arcadeBtnWrapper: { width: 180, height: 55 },
  arcadeBtnBase: { position: "absolute", width: "100%", height: "100%", borderRadius: 16, backgroundColor: "#a16207", top: 6 },
  arcadeBtnTop: { position: "absolute", width: "100%", height: "100%", borderRadius: 16, backgroundColor: "#facc15", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fef08a" },
  arcadeBtnText: { color: "#713f12", fontSize: 20, fontWeight: "900", fontFamily: "DynaPuff_700Bold" },

  cardActionsRow: { flexDirection: "row", gap: 12, width: "100%", paddingHorizontal: 10 },
  actionBtn: { flex: 1, paddingVertical: 16, borderRadius: 20, alignItems: "center" },
  actionBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold", fontFamily: "DynaPuff_700Bold" },
});
