import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

// ─── Floating heart particle ─────────────────────────────────────────────────
function FloatingHeart({
  x,
  size,
  delay,
  duration,
  color,
}: {
  x: number;
  size: number;
  delay: number;
  duration: number;
  color: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(sway, {
          toValue: 1,
          duration: duration * 0.5,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(sway, {
          toValue: -1,
          duration: duration * 0.5,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [height + 50, -size - 50],
  });

  const translateX = sway.interpolate({
    inputRange: [-1, 1],
    outputRange: [-20, 20],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.1, 0.85, 1],
    outputRange: [0, 0.7, 0.5, 0],
  });

  const scale = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 1.1, 0.6],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x,
        bottom: 0,
        transform: [{ translateY }, { translateX }, { scale }],
        opacity,
      }}
    >
      <Ionicons name="heart" size={size} color={color} />
    </Animated.View>
  );
}

// ─── Sparkle dot ────────────────────────────────────────────────────────────
function Sparkle({
  x,
  y,
  delay,
}: {
  x: number;
  y: number;
  delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 700,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(800),
      ])
    ).start();
  }, []);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.3] });
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#f8a0ff",
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}

// ─── Main Splash ─────────────────────────────────────────────────────────────
export default function SplashScreen() {
  const router = useRouter();

  // Entrance animations
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(30)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const heartPulse = useRef(new Animated.Value(1)).current;

  // Exit
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Logo pops in
    Animated.spring(logoScale, {
      toValue: 1,
      friction: 5,
      tension: 60,
      useNativeDriver: true,
    }).start();

    Animated.timing(logoOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // 2. Title slides up
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslate, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 3. Tagline fades in
    Animated.sequence([
      Animated.delay(650),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // 4. Glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 5. Heart beat
    Animated.loop(
      Animated.sequence([
        Animated.timing(heartPulse, {
          toValue: 1.18,
          duration: 550,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(heartPulse, {
          toValue: 1.0,
          duration: 550,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 6. Fade out then navigate
    const navTimer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 500,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        router.replace("/");
      });
    }, 2800);

    return () => clearTimeout(navTimer);
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.95],
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  // ── Particle configs ────────────────────────────────────────────────────────
  const hearts = [
    { x: 0.08 * width, size: 18, delay: 0,    duration: 6000, color: "rgba(249,83,198,0.6)" },
    { x: 0.2 * width,  size: 12, delay: 800,  duration: 8000, color: "rgba(167,139,250,0.5)" },
    { x: 0.38 * width, size: 22, delay: 300,  duration: 7000, color: "rgba(249,83,198,0.4)" },
    { x: 0.55 * width, size: 14, delay: 1200, duration: 9000, color: "rgba(236,72,153,0.5)" },
    { x: 0.7 * width,  size: 20, delay: 600,  duration: 6500, color: "rgba(167,139,250,0.6)" },
    { x: 0.85 * width, size: 10, delay: 100,  duration: 7500, color: "rgba(249,83,198,0.5)" },
    { x: 0.93 * width, size: 16, delay: 1800, duration: 8500, color: "rgba(236,72,153,0.4)" },
  ];

  const sparkles = [
    { x: 0.15 * width, y: 0.2 * height, delay: 200 },
    { x: 0.8 * width,  y: 0.15 * height, delay: 600 },
    { x: 0.25 * width, y: 0.7 * height, delay: 1000 },
    { x: 0.75 * width, y: 0.72 * height, delay: 400 },
    { x: 0.5 * width,  y: 0.12 * height, delay: 800 },
    { x: 0.9 * width,  y: 0.45 * height, delay: 300 },
    { x: 0.05 * width, y: 0.5 * height, delay: 700 },
    { x: 0.6 * width,  y: 0.82 * height, delay: 1200 },
  ];

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      <LinearGradient
        colors={["#0d001a", "#1e003a", "#3b0068", "#1e003a", "#0d001a"]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={styles.container}
      >
        {/* Floating hearts */}
        {hearts.map((h, i) => (
          <FloatingHeart key={i} {...h} />
        ))}

        {/* Sparkles */}
        {sparkles.map((s, i) => (
          <Sparkle key={i} {...s} />
        ))}

        {/* Glow blob behind logo */}
        <Animated.View
          style={[
            styles.glowBlob,
            { opacity: glowOpacity, transform: [{ scale: glowScale }] },
          ]}
        />

        {/* Center content */}
        <View style={styles.center}>
          {/* Logo */}
          <Animated.View
            style={{
              transform: [{ scale: logoScale }, { scale: heartPulse }],
              opacity: logoOpacity,
            }}
          >
            <LinearGradient
              colors={["#f953c6", "#b91d8d", "#7c3aed"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoCircle}
            >
              {/* Inner ring */}
              <View style={styles.logoRing}>
                <Ionicons name="heart" size={58} color="#ffffff" />
              </View>
            </LinearGradient>
          </Animated.View>

          {/* App name */}
          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslate }],
              alignItems: "center",
              marginTop: 28,
            }}
          >
            <Text style={styles.appName}>Couples</Text>
            <Text style={styles.appNameAccent}>Scratch</Text>
          </Animated.View>

          {/* Tagline */}
          <Animated.View style={{ opacity: taglineOpacity, alignItems: "center", marginTop: 12 }}>
            <Text style={styles.tagline}>Reveal surprises together ✨</Text>
            <View style={styles.divider} />
          </Animated.View>
        </View>

        {/* Bottom loading bar */}
        <Animated.View style={[styles.bottomBar, { opacity: taglineOpacity }]}>
          <LoadingBar />
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Animated loading bar ───────────────────────────────────────────────────
function LoadingBar() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 2200,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start();
  }, []);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.barTrack}>
      <Animated.View style={[styles.barFill, { width: barWidth }]}>
        <LinearGradient
          colors={["#f953c6", "#a855f7", "#6366f1"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  glowBlob: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(167,39,210,0.25)",
    // soft blur via shadow on iOS
    shadowColor: "#c084fc",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 80,
    elevation: 0,
  },
  center: {
    alignItems: "center",
    zIndex: 10,
  },
  logoCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f953c6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 20,
  },
  logoRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 42,
    fontWeight: "900",
    color: "#f8f0ff",
    fontFamily: "DynaPuff_700Bold",
    letterSpacing: -0.5,
    textShadowColor: "rgba(249,83,198,0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    lineHeight: 50,
  },
  appNameAccent: {
    fontSize: 42,
    fontWeight: "900",
    color: "#f953c6",
    fontFamily: "DynaPuff_700Bold",
    letterSpacing: -0.5,
    textShadowColor: "rgba(249,83,198,0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
    lineHeight: 50,
    marginTop: -8,
  },
  tagline: {
    fontSize: 15,
    color: "rgba(220,180,255,0.75)",
    fontFamily: "Nunito_700Bold",
    letterSpacing: 0.3,
    marginTop: 4,
  },
  divider: {
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(249,83,198,0.4)",
    marginTop: 14,
  },
  bottomBar: {
    position: "absolute",
    bottom: 60,
    width: "55%",
    alignItems: "center",
  },
  barTrack: {
    width: "100%",
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
    overflow: "hidden",
  },
});
