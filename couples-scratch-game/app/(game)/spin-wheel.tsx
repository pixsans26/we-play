import React, { useState, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions, Animated, Easing, Image, Modal } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, G, Text as SvgText, Circle, Polygon, Image as SvgImage, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";
import { BlurView } from "@/components/CustomBlurView";
import { useScratchHistory } from "@/hooks/useScratchHistory";

import { useThemeStore, getTheme } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { useGameStore } from "@/store/gameStore";
import HeartConfetti from "@/components/Confetti/HeartConfetti";

const { width } = Dimensions.get("window");
const WHEEL_SIZE = width * 0.85;
const CENTER = WHEEL_SIZE / 2;
// Decrease slice radius to make room for the golden rim
const RIM_WIDTH = 20;
const RADIUS = (WHEEL_SIZE / 2) - RIM_WIDTH;

// Helper to calculate SVG arc
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

function getStarPath(cx: number, cy: number, outerRadius: number, innerRadius: number) {
  let path = "";
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * 36 - 90) * Math.PI / 180;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    path += i === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `;
  }
  path += "Z";
  return path;
}

export default function SpinWheelScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const switchTurn = useGameStore((s) => s.switchTurn);
  const coupleProfile = useAuthStore((s) => s.coupleProfile);
  const { logScratch } = useScratchHistory();

  const rawTasks = useGameStore((s) => s.spinTasks);
  
  // Ensure exactly 9 tasks for the wheel
  const spinTasks = React.useMemo(() => {
    if (!rawTasks || rawTasks.length === 0) return [];
    if (rawTasks.length === 9) return rawTasks;
    if (rawTasks.length > 9) return rawTasks.slice(0, 9);
    // Pad to 9 by repeating
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
  const [showConfetti, setShowConfetti] = useState(false);

  const rotation = useRef(new Animated.Value(0)).current;
  const spinBtnAnim = useRef(new Animated.Value(1)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bgAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const turnName = currentTurn === "A"
    ? coupleProfile?.partnerAName ?? "Partner A"
    : coupleProfile?.partnerBName ?? "Partner B";

  const otherName = currentTurn === "A"
    ? coupleProfile?.partnerBName ?? "Partner B"
    : coupleProfile?.partnerAName ?? "Partner A";

  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setResult(null);
    setShowConfetti(false);

    // Arcade Button push effect
    Animated.sequence([
      Animated.timing(spinBtnAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(spinBtnAnim, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();

    const extraRotations = 360 * 5; 
    const randomSliceIndex = Math.floor(Math.random() * NUM_SLICES);
    
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
    setShowConfetti(true);
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
    switchTurn();
    router.replace("/(game)/");
  };

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"]
  });

  const animatedWheelStyle = {
    transform: [{ rotate: rotateInterpolate }],
  };

  const bgColors = (isDark ? ["#2a0410", "#4c0519"] : ["#fda4af", "#e11d48"]) as any;
  const heartColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.4)";
  const cardBg = isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)";
  const cardBorder = isDark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.6)";
  const titleColor = isDark ? "#fda4af" : "#9f1239";
  const descColor = isDark ? "#fff" : "#4c0519";
  const highlightColor = isDark ? "#fb7185" : "#e11d48";

  // Dynamic Arcade Button Colors (Yellow as requested)
  const btnBaseColor = isDark ? "#a16207" : "#ca8a04";
  const btnTopColor = isDark ? "#eab308" : "#facc15";
  const btnBorderColor = isDark ? "#fef08a" : "#fef9c3";
  const btnDisabledBaseColor = isDark ? "#713f12" : "#854d0e";
  const btnDisabledTopColor = isDark ? "#854d0e" : "#a16207";

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

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={{ flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 32, overflow: "hidden"}}>
            <Ionicons name="arrow-back" size={24} color={isDark ? "#ffffff" : "#4c0519"} />
          </BlurView>
        </Pressable>
        <Text style={[styles.headerTitle, { color: isDark ? "#ffffff" : "#4c0519", textShadowColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }]}>Spin Wheel</Text>
        <View style={{ width: 44 }} />
      </View>

      <Animated.View style={styles.textCardContainer}>
        <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={[styles.textCardInner, { backgroundColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)" }]}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>YOUR TURN</Text>
          </View>
          <Text style={[styles.subtitle, { color: isDark ? "#fda4af" : "#be123c", marginBottom: 8, marginTop: 12 }]}>
            {turnName}, spin the wheel to decide your fate!
          </Text>

          <Text style={{ textAlign: "center", color: isDark ? "#ffffff" : "#4c0519", fontSize: 16, fontWeight: "800" }}>
            🎲 <Text style={{ color: isDark ? "#fb7185" : "#e11d48" }}>{turnName}</Text> spins, <Text style={{ color: isDark ? "#fb7185" : "#e11d48" }}>{otherName}</Text> performs!
          </Text>
        </BlurView>
      </Animated.View>

      <View style={styles.wheelContainer}>
        {/* Pointer */}
        <View style={styles.pointerContainer}>
          <Svg width={40} height={50} viewBox="0 0 40 50">
            <Defs>
              <SvgLinearGradient id="pointer-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FFE066" />
                <Stop offset="50%" stopColor="#F5B700" />
                <Stop offset="100%" stopColor="#B87333" />
              </SvgLinearGradient>
            </Defs>
            <Path d="M20 50 L5 20 A 15 15 0 1 1 35 20 Z" fill="url(#pointer-gold)" stroke="#B87333" strokeWidth="2" />
            <Circle cx="20" cy="15" r="4" fill="#B87333" />
          </Svg>
        </View>

        {/* The Spinning Wheel */}
        <Animated.View style={[styles.wheelWrapper, animatedWheelStyle]}>
          <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
            <Defs>
              {/* Golden Rim Gradient */}
              <SvgLinearGradient id="rim-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FFDF00" />
                <Stop offset="25%" stopColor="#F5B700" />
                <Stop offset="50%" stopColor="#FFDF00" />
                <Stop offset="75%" stopColor="#B87333" />
                <Stop offset="100%" stopColor="#FFDF00" />
              </SvgLinearGradient>
            </Defs>

            <G x="0" y="0">
              {/* Outer Golden Rim */}
              <Circle cx={CENTER} cy={CENTER} r={WHEEL_SIZE / 2} fill="url(#rim-gold)" />
              
              {/* Rivets along the rim */}
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 30 * Math.PI) / 180;
                const rx = CENTER + (WHEEL_SIZE / 2 - RIM_WIDTH / 2) * Math.cos(angle);
                const ry = CENTER + (WHEEL_SIZE / 2 - RIM_WIDTH / 2) * Math.sin(angle);
                return <Circle key={`rivet-${i}`} cx={rx} cy={ry} r={4} fill="#B87333" opacity={0.6} />
              })}

              {/* Slices */}
              {spinTasks.map((task, i) => {
                const startAngle = -ANGLE_PER_SLICE / 2;
                const endAngle = ANGLE_PER_SLICE / 2;
                const slicePath = getWedgePath(startAngle, endAngle);
                
                const fallbackColors = ["#f43f5e", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#3b82f6"];
                const color = task.color || fallbackColors[i % fallbackColors.length];
                
                return (
                  <G key={`${task.id}-${i}`} rotation={i * ANGLE_PER_SLICE} origin={`${CENTER}, ${CENTER}`}>
                    <Path d={slicePath} fill={color} stroke="#ffffff" strokeWidth={1} />
                    <G rotation={-90} origin={`${CENTER + RADIUS * 0.75}, ${CENTER}`}>
                      {task.emoji ? (
                        <SvgText
                          x={CENTER + RADIUS * 0.75}
                          y={CENTER}
                          fontSize="24"
                          textAnchor="middle"
                          alignmentBaseline="middle"
                        >
                          {task.emoji}
                        </SvgText>
                      ) : (
                        <SvgText
                          x={CENTER + RADIUS * 0.75}
                          y={CENTER}
                          fontSize={12}
                          fill="#ffffff"
                          fontWeight="bold"
                          textAnchor="middle"
                          alignmentBaseline="middle"
                        >
                          {task.label ? task.label.substring(0, 10) + (task.label.length > 10 ? "..." : "") : "🎯"}
                        </SvgText>
                      )}
                    </G>
                  </G>
                );
              })}

              {/* Center Golden Knob */}
              <Circle cx={CENTER} cy={CENTER} r={32} fill="url(#rim-gold)" stroke="#B87333" strokeWidth="2" />
              <Path d={getStarPath(CENTER, CENTER, 15, 7)} fill="#E67E22" />
            </G>
          </Svg>
        </Animated.View>
      </View>

      {/* Action Area (Bottom) */}
      <View style={styles.actionContainer}>
        <Animated.View style={{ transform: [{ scale: spinBtnAnim }] }}>
          <Pressable onPress={handleSpin} disabled={isSpinning || !!result} style={styles.arcadeBtnWrapper}>
            <View style={[styles.arcadeBtnBase, { backgroundColor: btnBaseColor }, (isSpinning || !!result) && { backgroundColor: btnDisabledBaseColor }]} />
            <View style={[styles.arcadeBtnTop, { backgroundColor: btnTopColor, borderColor: btnBorderColor }, (isSpinning || !!result) && { backgroundColor: btnDisabledTopColor, borderColor: btnDisabledBaseColor }]}>
              <Text style={styles.arcadeBtnText}>{isSpinning ? "WAIT..." : "SPIN!"}</Text>
            </View>
          </Pressable>
        </Animated.View>
      </View>

      {/* Result Popup Modal */}
      <Modal visible={!!result} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          {showConfetti && <HeartConfetti duration={4000} />}
          {result && (
            <View style={styles.modalContent}>
              <Animated.View style={[
                styles.resultCard,
                { shadowColor: result.color, borderColor: "#ffffff", borderWidth: 2 }
              ]}>
                <LinearGradient
                  colors={[result.color, `${result.color}CC`]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.resultGradient}
                >
                  <View style={{ position: "absolute", top: 10, left: 10, right: 10, bottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderRadius: 32, overflow: "hidden", borderStyle: "dashed" }} />
                  {result.emoji ? (
                    <Text style={{ fontSize: 60, marginBottom: 16 }}>{result.emoji}</Text>
                  ) : (
                    <Text style={{ fontSize: 60, marginBottom: 16 }}>🎯</Text>
                  )}
                  <Text style={styles.resultLabel}>{result.label}</Text>
                  <Text style={styles.resultDesc}>{result.description}</Text>
                </LinearGradient>
              </Animated.View>
              
              <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
                <Pressable
                  onPress={handleDone}
                  style={({ pressed }) => [
                    styles.spinButton,
                    { flex: 1, paddingHorizontal: 16, opacity: pressed ? 0.8 : 1, backgroundColor: theme.glass.bg, borderWidth: 1, borderColor: theme.glass.border }
                  ]}
                >
                  <Text style={[styles.spinButtonText, { color: theme.card.text, fontSize: 16, textAlign: "center" }]} numberOfLines={1} adjustsFontSizeToFit>Done</Text>
                </Pressable>
                
                <Pressable
                  onPress={handleSpin}
                  style={({ pressed }) => [
                    styles.spinButton,
                    { flex: 1, paddingHorizontal: 16, opacity: pressed ? 0.8 : 1, backgroundColor: theme.accent }
                  ]}
                >
                  <Text style={[styles.spinButtonText, { fontSize: 16, textAlign: "center" }]} numberOfLines={1} adjustsFontSizeToFit>Spin Again</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>


    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 22, paddingTop: 56 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backButton: { width: 44, height: 44, borderRadius: 32, overflow: "hidden" },
  headerTitle: { fontSize: 20, fontWeight: "800", fontFamily: "DynaPuff_700Bold" },
  textCardContainer: { borderRadius: 32, marginBottom: 30, overflow: "visible" },
  textCardInner: { borderRadius: 32, padding: 16, alignItems: "center", overflow: "hidden" },
  badge: { backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 32, overflow: "hidden", position: "absolute", top: -14 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  subtitle: { fontSize: 16, textAlign: "center", fontWeight: "700" },
  wheelContainer: { alignItems: "center", justifyContent: "center", marginBottom: 40, position: "relative" },
  wheelWrapper: { width: WHEEL_SIZE, height: WHEEL_SIZE, borderRadius: WHEEL_SIZE / 2 },
  pointerContainer: { position: "absolute", top: -15, zIndex: 10, alignItems: "center" },
  actionContainer: { flex: 1, alignItems: "center", justifyContent: "flex-start", paddingBottom: 40 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 22 },
  modalContent: { width: "100%", alignItems: "center" },
  
  arcadeBtnWrapper: { width: 220, height: 65, alignSelf: "center" },
  arcadeBtnBase: { position: "absolute", width: "100%", height: "100%", borderRadius: 32, overflow: "hidden", top: 6 },
  arcadeBtnTop: { width: "100%", height: "100%", borderRadius: 32, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 2 },
  arcadeBtnText: { color: "#fff", fontSize: 24, fontWeight: "900", fontFamily: "DynaPuff_700Bold", textShadowColor: "rgba(0,0,0,0.3)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2 },
  
  spinButton: { paddingVertical: 18, paddingHorizontal: 48, borderRadius: 30, alignItems: "center" },
  spinButtonText: { color: "#ffffff", fontSize: 22, fontWeight: "900", fontFamily: "DynaPuff_700Bold" },
  resultCard: { width: "100%", borderRadius: 32, overflow: "hidden", marginBottom: 16 },
  resultGradient: { padding: 24, alignItems: "center" },
  resultLabel: { color: "#ffffff", fontSize: 28, fontWeight: "900", fontFamily: "DynaPuff_700Bold", marginBottom: 8 },
  resultDesc: { color: "#ffffff", fontSize: 16, textAlign: "center", opacity: 0.9, fontWeight: "500" },
});
