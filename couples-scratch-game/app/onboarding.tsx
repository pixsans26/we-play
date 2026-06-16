import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "@/components/CustomBlurView";
import { useThemeStore, getTheme } from "@/store/themeStore";

// SVG files — works after: npx expo start --clear
import HeartSvg from "@/assets/images/onboarding/heart.svg";
import KissSvg from "@/assets/images/onboarding/kiss.svg";
import BondSvg from "@/assets/images/onboarding/bond.svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ONBOARDING_KEY = "onboarding_seen";

interface PageData {
  title: string;
  subtitle: string;
  Illustration: React.FC<{ width: number; height: number }>;
  glowColor: string;
}

const PAGES: PageData[] = [
  {
    title: "Reveal the Spark",
    subtitle:
      "Scratch away to uncover exciting challenges and sweet surprises tailored to your unique chemistry.",
    Illustration: HeartSvg as React.FC<{ width: number; height: number }>,
    glowColor: "#f953c6",
  },
  {
    title: "Share the Moment",
    subtitle:
      "One reveals, the other delights. Take turns bringing the prompts to life and keep your spark glowing.",
    Illustration: KissSvg as React.FC<{ width: number; height: number }>,
    glowColor: "#ff6b9d",
  },
  {
    title: "Deepen Your Bond",
    subtitle:
      "Maintain your streaks, unlock exclusive experiences, and explore new dimensions of intimacy as you grow.",
    Illustration: BondSvg as React.FC<{ width: number; height: number }>,
    glowColor: "#a855f7",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [checking, setChecking] = useState(true);

  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((val) => {
        if (val === "true") {
          router.replace("/(auth)/login");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, []);

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    } catch {}
    router.replace("/(auth)/login");
  };

  const goNext = () => {
    const next = currentPage + 1;
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    setCurrentPage(next);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentPage(page);
  };

  if (checking) return null;

  return (
    <LinearGradient colors={theme.background} style={styles.container}>

      {/* Skip */}
      <TouchableOpacity style={styles.skipBtn} onPress={finishOnboarding}>
        <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={[styles.skipPill, { borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(168,85,247,0.2)" }]}>
          <Text style={[styles.skipText, { color: theme.card.subtext }]}>Skip</Text>
        </BlurView>
      </TouchableOpacity>

      {/* Pages */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {PAGES.map((page, index) => {
          const { Illustration, glowColor } = page;
          return (
            <View key={index} style={[styles.page, { width: SCREEN_WIDTH }]}>
              <View style={styles.illustrationWrapper}>
                <View style={[styles.glowCircle, { backgroundColor: glowColor }]} />
                <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={[styles.illustrationRing, { borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(168,85,247,0.2)" }]}>
                  <Illustration width={220} height={220} />
                  {/* Bottom tint overlay: transparent → glowColor */}
                  <LinearGradient
                    colors={["transparent", `${glowColor}4D`, glowColor]}
                    locations={[0, 0.5, 1]}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  />
                </BlurView>
              </View>
              <Text style={[styles.title, { color: theme.card.text }]}>{page.title}</Text>
              <Text style={[styles.subtitle, { color: theme.card.subtext }]}>{page.subtitle}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom */}
      <View style={styles.bottomContainer}>
        <View style={styles.dotsRow}>
          {PAGES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentPage 
                  ? styles.dotActive 
                  : [styles.dotInactive, { backgroundColor: isDark ? "rgba(220,180,255,0.3)" : "rgba(168,85,247,0.3)" }]
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={currentPage < PAGES.length - 1 ? goNext : finishOnboarding}
          style={styles.btnWrapper}
        >
          <LinearGradient
            colors={["#f953c6", "#7c3aed"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btn}
          >
            <Text style={styles.btnText}>
              {currentPage < PAGES.length - 1 ? "Next  →" : "Get Started  ♥"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipBtn: { position: "absolute", top: 56, right: 20, zIndex: 10 },
  skipPill: {
    borderWidth: 1,
    borderRadius: 999, overflow: "hidden",
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  skipText: { color: "rgba(220,180,255,0.75)", fontSize: 14, fontWeight: "600" },
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 140,
    gap: 24,
  },
  illustrationWrapper: { alignItems: "center", justifyContent: "center" },
  glowCircle: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.15,
  },
  illustrationRing: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#f8f0ff",
    textAlign: "center",
    fontFamily: "DynaPuff_700Bold",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(220,180,255,0.7)",
    textAlign: "center",
    lineHeight: 26,
    fontWeight: "500",
  },
  bottomContainer: {
    paddingBottom: 48,
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 20,
  },
  dotsRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 28, backgroundColor: "#f953c6" },
  dotInactive: { width: 8, backgroundColor: "rgba(220,180,255,0.3)" },
  btnWrapper: { width: "100%" },
  btn: { borderRadius: 999, overflow: "hidden", paddingVertical: 17, alignItems: "center" },
  btnText: { color: "#ffffff", fontSize: 17, fontWeight: "800" },
});
