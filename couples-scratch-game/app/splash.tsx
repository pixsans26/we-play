import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function SplashScreen() {
  const router = useRouter();

  // Heart pulse animation
  const heartScale = useRef(new Animated.Value(1)).current;

  // Dot fade animations (staggered)
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Pulsing heart loop: 1.0 → 1.15 → 1.0, 1200ms
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(heartScale, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1.0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Staggered dots
    const makeDotLoop = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.delay(650 - delay),
        ])
      );

    const d1 = makeDotLoop(dot1Opacity, 0);
    const d2 = makeDotLoop(dot2Opacity, 250);
    const d3 = makeDotLoop(dot3Opacity, 500);
    d1.start();
    d2.start();
    d3.start();

    // Navigate after 2200ms
    const timer = setTimeout(() => {
      router.replace("/");
    }, 2200);

    return () => {
      clearTimeout(timer);
      pulse.stop();
      d1.stop();
      d2.stop();
      d3.stop();
    };
  }, []);

  return (
    <LinearGradient
      colors={["#150025", "#2d0050", "#0d001a"]}
      style={styles.container}
    >
      {/* Center content */}
      <View style={styles.center}>
        {/* Animated heart icon container */}
        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
          {/* Gradient circle behind heart */}
          <LinearGradient
            colors={["#f953c6", "#7c3aed"]}
            style={styles.heartCircle}
          >
            <Ionicons name="heart" size={60} color="#ffffff" />
          </LinearGradient>
        </Animated.View>

        {/* App name */}
        <Text style={styles.appName}>Couples Scratch</Text>

        {/* Tagline */}
        <Text style={styles.tagline}>Reveal surprises together ✨</Text>
      </View>

      {/* Loading dots at bottom */}
      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, { opacity: dot1Opacity }]} />
        <Animated.View style={[styles.dot, { opacity: dot2Opacity }]} />
        <Animated.View style={[styles.dot, { opacity: dot3Opacity }]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    gap: 20,
  },
  heartCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 36,
    fontWeight: "900",
    color: "#f8f0ff",
    marginTop: 8,
  },
  tagline: {
    fontSize: 16,
    color: "rgba(220,180,255,0.7)",
  },
  dotsContainer: {
    position: "absolute",
    bottom: 60,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(220,180,255,0.8)",
  },
});
