import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";

interface HeartConfettiProps {
  particleCount?: number;
  duration?: number;
  onComplete?: () => void;
}

const CONFETTI_COLORS = [
  "#FF6B9D",
  "#FF4081",
  "#E91E8C",
  "#FF8FAB",
  "#C71585",
];

export default function HeartConfetti({
  particleCount = 80,
  duration = 3000,
  onComplete,
}: HeartConfettiProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Auto-dismiss after duration
    timerRef.current = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [duration, onComplete]);

  return (
    <View style={styles.container} pointerEvents="none">
      <ConfettiCannon
        count={particleCount}
        origin={{ x: -10, y: 0 }}
        autoStart
        fadeOut
        fallSpeed={3000}
        colors={CONFETTI_COLORS}
        explosionSpeed={350}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
});
