import React, { useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from "react-native";
import { LEVEL_BADGES } from "@/types";
import { useSound } from "@/hooks/useSound";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface LevelUpCelebrationProps {
  level: number;
  onDismiss: () => void;
}

/**
 * Full-screen overlay celebrating a level-up event.
 * Uses plain React Native Animated API (no reanimated dependency).
 */
export function LevelUpCelebration({ level, onDismiss }: LevelUpCelebrationProps) {
  const badge = LEVEL_BADGES[level] ?? LEVEL_BADGES[5];
  const { playLevelUp } = useSound();

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const burstScale = useRef(new Animated.Value(0)).current;
  const burstOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    playLevelUp();

    // Overlay fade in
    Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    // Badge entrance with delay
    setTimeout(() => {
      Animated.spring(badgeScale, { toValue: 1, damping: 12, stiffness: 150, useNativeDriver: true }).start();
      Animated.timing(badgeOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }, 200);

    // Burst effect
    setTimeout(() => {
      Animated.timing(burstScale, { toValue: 2.5, duration: 800, useNativeDriver: true }).start();
      Animated.timing(burstOpacity, { toValue: 0, duration: 800, useNativeDriver: true }).start();
    }, 100);
  }, []);

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    const timeout = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timeout);
  }, [onDismiss]);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onDismiss}
      style={styles.touchable}
      accessibilityRole="button"
      accessibilityLabel="Dismiss level up celebration"
    >
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        {/* Burst circles */}
        <View style={styles.animationContainer}>
          <Animated.View
            style={[
              styles.burstCircle,
              styles.burstOuter,
              { transform: [{ scale: burstScale }], opacity: burstOpacity },
            ]}
          />
        </View>

        {/* Level badge content */}
        <Animated.View
          style={[
            styles.badgeContainer,
            { transform: [{ scale: badgeScale }], opacity: badgeOpacity },
          ]}
        >
          <Text style={styles.levelUpText}>Level Up!</Text>
          <Text style={styles.emoji}>{badge.emoji}</Text>
          <Text style={styles.levelNumber}>Level {level}</Text>
          <Text style={styles.levelLabel}>{badge.label}</Text>
        </Animated.View>

        {/* Dismiss hint */}
        <View style={styles.dismissHint}>
          <Text style={styles.dismissText}>Tap to continue</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  animationContainer: {
    position: "absolute",
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  burstCircle: {
    position: "absolute",
    borderRadius: 150,
    width: 200,
    height: 200,
    borderWidth: 3,
    borderColor: "rgba(236, 91, 165, 0.6)",
  },
  burstOuter: {},
  badgeContainer: {
    alignItems: "center",
    padding: 32,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  levelUpText: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.7)",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  levelNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 4,
  },
  levelLabel: {
    fontSize: 18,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.85)",
  },
  dismissHint: {
    position: "absolute",
    bottom: 80,
  },
  dismissText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
  },
});

export default LevelUpCelebration;
