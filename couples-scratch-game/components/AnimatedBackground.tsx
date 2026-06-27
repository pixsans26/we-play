import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { getTheme } from "@/store/themeStore";

interface AnimatedBackgroundProps {
  currentPhase: string;
  isDark: boolean;
}

export function AnimatedBackground({ currentPhase, isDark }: AnimatedBackgroundProps) {
  const theme = getTheme(isDark);
  
  // Opacity value that pulses between 0.4 and 1
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // Infinite
      true // Reverse
    );
  }, []);

  // Determine colors based on phase
  let phaseColors = isDark 
    ? ["rgba(236,72,153,0.15)", "rgba(168,85,247,0.1)", "rgba(13,0,26,0)"]
    : ["rgba(236,72,153,0.2)", "rgba(168,85,247,0.15)", "rgba(221,214,254,0)"];

  if (currentPhase === "Menstrual") {
    phaseColors = isDark 
      ? ["rgba(239,68,68,0.25)", "rgba(244,63,94,0.1)", "rgba(0,0,0,0)"]
      : ["rgba(239,68,68,0.3)", "rgba(244,63,94,0.15)", "rgba(255,255,255,0)"];
  } else if (currentPhase === "Follicular") {
    phaseColors = isDark 
      ? ["rgba(168,85,247,0.25)", "rgba(192,132,252,0.1)", "rgba(0,0,0,0)"]
      : ["rgba(168,85,247,0.3)", "rgba(192,132,252,0.15)", "rgba(255,255,255,0)"];
  } else if (currentPhase === "Ovulation") {
    phaseColors = isDark 
      ? ["rgba(147,51,234,0.35)", "rgba(168,85,247,0.2)", "rgba(0,0,0,0)"]
      : ["rgba(147,51,234,0.4)", "rgba(168,85,247,0.25)", "rgba(255,255,255,0)"];
  } else if (currentPhase === "Luteal") {
    phaseColors = isDark 
      ? ["rgba(52,211,153,0.15)", "rgba(16,185,129,0.1)", "rgba(0,0,0,0)"]
      : ["rgba(52,211,153,0.2)", "rgba(16,185,129,0.15)", "rgba(255,255,255,0)"];
  }

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <>
      <LinearGradient colors={theme.background as any} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFillObject} />
      <Animated.View style={[StyleSheet.absoluteFillObject, animatedStyle]}>
        <LinearGradient 
          colors={phaseColors as any} 
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject} 
        />
      </Animated.View>
    </>
  );
}
