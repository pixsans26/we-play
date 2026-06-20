import { env } from "@/lib/env";
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View, Text, Pressable, ScrollView, Animated, Easing,
  ActivityIndicator, useWindowDimensions, LayoutAnimation, Platform, UIManager, Image
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "@/components/CustomBlurView";
import { Ionicons } from "@expo/vector-icons";
import RenderHtml from "react-native-render-html";
import { apiFetch } from "@/lib/apiClient";
import { useThemeStore, getTheme } from "@/store/themeStore";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BASE_URL = env.EXPO_PUBLIC_API_URL;

// ── Page meta ─────────────────────────────────────────────────────────────────
const PAGE_META: Record<string, {
  title: string;
  subtitle: string;
  icon: string;
  gradientColors: [string, string, string];
  accentColor: string;
}> = {
  faq: {
    title: "FAQ",
    subtitle: "Frequently asked questions",
    icon: "help-circle",
    gradientColors: ["#3b82f6", "#6366f1", "#4f46e5"],
    accentColor: "#6366f1",
  },
  support: {
    title: "Support",
    subtitle: "We're here to help",
    icon: "chatbubbles",
    gradientColors: ["#10b981", "#059669", "#047857"],
    accentColor: "#10b981",
  },
  privacy: {
    title: "Privacy Policy",
    subtitle: "How we protect your data",
    icon: "shield-checkmark",
    gradientColors: ["#8b5cf6", "#7c3aed", "#6d28d9"],
    accentColor: "#8b5cf6",
  },
  help: {
    title: "Help Center",
    subtitle: "Guides & how-tos",
    icon: "information-circle",
    gradientColors: ["#f59e0b", "#d97706", "#b45309"],
    accentColor: "#f59e0b",
  },
  about: {
    title: "About",
    subtitle: "About WePlay",
    icon: "heart-circle",
    gradientColors: ["#d946ef", "#a855f7", "#8b5cf6"],
    accentColor: "#d946ef",
  },
};

// ── Default content if server has nothing ─────────────────────────────────────
const DEFAULT_CONTENT: Record<string, string> = {
  faq: `
<h2>What is WePlay?</h2>
<p>WePlay is a fun and intimate game designed for couples. Scratch cards to reveal surprise tasks, challenges, and moments you can enjoy together!</p>

<h2>How does it work?</h2>
<p>Simply scratch the card to reveal a task or image. Complete the task together before the timer runs out, then hit Done to earn points and level up!</p>

<h2>What happens when I skip?</h2>
<p>Skipping a task is completely free — it won't count against you. The task goes back into the pool and may appear again later. Perfect if a task doesn't feel right in the moment.</p>

<h2>How do we level up?</h2>
<p>Every completed task earns you progress toward the next level. Higher levels unlock more exciting and adventurous tasks!</p>

<h2>Is my data private?</h2>
<p>Absolutely. Your couple profile and game history are stored securely and are only visible to you and your partner. We never share your data with third parties.</p>

<h2>Can we reset our progress?</h2>
<p>Yes! Go to Settings → Reset Progress to start fresh. This will clear your history and reset your level back to 1.</p>
  `.trim(),

  support: `
<h2>Contact Us</h2>
<p>Having trouble? We're here to help! Reach out to our support team and we'll get back to you within 24 hours.</p>

<h2>Email Support</h2>
<p>Send us an email at <strong>support@couplesscratch.app</strong> and describe the issue you're experiencing.</p>

<h2>Report a Bug</h2>
<p>If you've found a bug, please include: your device model, app version (found in Settings), and a description of what happened.</p>

<h2>Feature Requests</h2>
<p>We'd love to hear your ideas! Send your feature requests to <strong>ideas@couplesscratch.app</strong>.</p>

<h2>Common Issues</h2>
<p><strong>App not loading?</strong> Try closing and reopening the app, or check your internet connection.</p>
<p><strong>Tasks not appearing?</strong> Make sure you've completed your couple profile setup in Settings.</p>
<p><strong>Partner not connecting?</strong> Both partners need to sign up with the same couple invite code.</p>
  `.trim(),

  privacy: `
<h2>Privacy Policy</h2>
<p>Last updated: June 2025</p>

<h2>Information We Collect</h2>
<p>We collect only the information necessary to provide our service: your email address, couple profile details (names, ages, preferences), and game history.</p>

<h2>How We Use Your Information</h2>
<p>Your data is used solely to power the app experience — matching you with your partner, tracking game progress, and personalizing task recommendations.</p>

<h2>Data Storage & Security</h2>
<p>All data is stored on secure, encrypted servers. We use industry-standard security practices to protect your information.</p>

<h2>Data Sharing</h2>
<p>We never sell or share your personal data with third parties. Your intimate game history is strictly private between you and your partner.</p>

<h2>Your Rights</h2>
<p>You can request deletion of all your data at any time through Settings → Delete Account. This permanently removes all your data from our servers.</p>

<h2>Contact</h2>
<p>For privacy concerns, contact us at <strong>privacy@couplesscratch.app</strong></p>
  `.trim(),

  help: `
<h2>Getting Started</h2>
<p>Welcome to WePlay! Here's everything you need to know to get the most out of the app.</p>

<h2>Playing the Games</h2>
<p><strong>Task Scratch:</strong> Scratch the card to reveal a fun challenge. Complete it before the timer runs out!</p>
<p><strong>Image Scratch:</strong> Scratch to reveal a surprise image. Your partner performs the task shown!</p>
<p><strong>Spin Wheel:</strong> Spin the wheel and complete whatever task it lands on — together!</p>
<p><strong>Lottery:</strong> Pick cards from columns to create a unique, randomized challenge.</p>

<h2>Levels & Progress</h2>
<p>Every completed task earns you points. Earn enough points to level up and unlock more exciting, adventurous tasks at higher levels.</p>

<h2>Timer</h2>
<p>Each task has a countdown timer. Try to complete the task before time runs out. Don't worry — you can always skip if something doesn't feel right!</p>

<h2>Taking Turns</h2>
<p>The game automatically alternates turns between you and your partner. The current player's name is always shown at the top of the game screen.</p>

<h2>Resetting</h2>
<p>Want a fresh start? Head to Settings → Reset Progress to clear your history and start from Level 1 again.</p>
  `.trim(),

  about: `
<h2>About WePlay</h2>
<p>WePlay is a love game designed to bring couples closer through fun, playful, and intimate shared experiences.</p>

<h2>Our Mission</h2>
<p>We believe that the best relationships are built on shared experiences, laughter, and genuine connection. WePlay is designed to help couples explore, connect, and create memories together.</p>

<h2>The Games</h2>
<p>From scratch cards to spin wheels, every game is crafted to spark joy, intimacy, and playfulness in your relationship.</p>

<h2>Made with Love</h2>
<p>WePlay is built by a small team passionate about relationship wellness and gamified connection. Every feature is designed with real couples in mind.</p>

<h2>Version</h2>
<p>App Version: 1.0.0</p>
<p>© 2025 WePlay. All rights reserved.</p>
  `.trim(),
};

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ContentScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);
  const { width } = useWindowDimensions();

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState<any>(null);
  const bgAnim = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(0.95)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const meta = PAGE_META[key ?? ""] ?? PAGE_META.faq;

  useEffect(() => {
    // Background float animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bgAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Header entrance
    Animated.parallel([
      Animated.spring(headerScale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    async function loadContent() {
      try {
        const [res, brandRes] = await Promise.all([
          apiFetch(`${BASE_URL}/api/config/public/${key}`),
          apiFetch(`${BASE_URL}/api/config/public/app_branding`)
        ]);

        if (brandRes.ok) {
          const brandData = await brandRes.json();
          if (brandData.value) {
            try { setBranding(JSON.parse(brandData.value)); } catch {}
          }
        }

        if (res.ok) {
          const data = await res.json();
          setContent(data.value && data.value.trim() ? data.value : (DEFAULT_CONTENT[key ?? ""] ?? ""));
        } else {
          setContent(DEFAULT_CONTENT[key ?? ""] ?? "");
        }
      } catch {
        setContent(DEFAULT_CONTENT[key ?? ""] ?? "");
      } finally {
        setLoading(false);
        Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      }
    }
    loadContent();
  }, [key]);

  const heartColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.18)";

  return (
    <LinearGradient
      colors={theme.background as any}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}
    >
      {/* Decorative background hearts */}
      <Animated.View style={{
        position: "absolute", top: 60, left: -30,
        transform: [{ rotate: "-20deg" }, { translateY: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) }]
      }}>
        <Ionicons name="heart" size={130} color={heartColor} />
      </Animated.View>
      <Animated.View style={{
        position: "absolute", bottom: 160, right: -20,
        transform: [{ rotate: "20deg" }, { translateY: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 24] }) }]
      }}>
        <Ionicons name="heart" size={100} color={heartColor} />
      </Animated.View>

      {/* ── Header ──────────────────────────────────────────── */}
      <View style={{ paddingTop: 56, paddingHorizontal: 22 }}>
        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          style={{ borderRadius: 32, overflow: "hidden", alignSelf: "flex-start", marginBottom: 20 }}
        >
          <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={{
            width: 40, height: 40, borderRadius: 32, overflow: "hidden",
            alignItems: "center", justifyContent: "center"
          }}>
            <Ionicons name="arrow-back" size={20} color={isDark ? "#ffffff" : "#4c0519"} />
          </BlurView>
        </Pressable>

        {/* Hero banner */}
        <Animated.View style={{
          transform: [{ scale: headerScale }],
          opacity: headerOpacity,
          marginBottom: 24,
        }}>
          <LinearGradient
            colors={meta.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 28,
              padding: 24,
              flexDirection: "row",
              alignItems: "center",
              gap: 18,
              shadowColor: meta.accentColor,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <View style={{
              width: 60, height: 60, borderRadius: 30,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name={meta.icon as any} size={32} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                color: "#ffffff",
                fontSize: 26,
                fontWeight: "900",
                fontFamily: "DynaPuff_700Bold",
                textShadowColor: "rgba(0,0,0,0.2)",
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 4,
              }}>
                {meta.title}
              </Text>
              <Text style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: 13,
                fontFamily: "Nunito_700Bold",
                marginTop: 2,
              }}>
                {meta.subtitle}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>

      {/* ── Content ─────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: contentOpacity }}>
          {loading ? (
            <View style={{
              backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.5)",
              borderRadius: 28, padding: 40, alignItems: "center", minHeight: 300, justifyContent: "center"
            }}>
              <ActivityIndicator size="large" color={meta.accentColor} />
              <Text style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(15,23,42,0.5)", marginTop: 16, fontSize: 14, fontFamily: "Nunito_700Bold" }}>
                Loading content...
              </Text>
            </View>
          ) : (
            <View style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.7)",
              borderRadius: 28,
              padding: 24,
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.3 : 0.08,
              shadowRadius: 12,
              elevation: 4,
            }}>
              {key === "about" && branding?.logoUrl && (
                <View style={{ alignItems: "center", marginBottom: 24 }}>
                  <Image source={{ uri: branding.logoUrl }} style={{ width: 100, height: 100, borderRadius: 20 }} resizeMode="contain" />
                  <Text style={{ fontSize: 24, fontFamily: "DynaPuff_700Bold", color: isDark ? "#fff" : "#000", marginTop: 12 }}>
                    {branding.appName || "WePlay"}
                  </Text>
                  <Text style={{ fontSize: 14, fontFamily: "Nunito_700Bold", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", marginTop: 4 }}>
                    Version {branding.appVersion || "1.0.0"}
                  </Text>
                </View>
              )}
              {key === "support" && branding?.supportEmail && (
                <View style={{ marginBottom: 24, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)", padding: 16, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: meta.accentColor + "20", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="mail" size={24} color={meta.accentColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: isDark ? "#fff" : "#000", fontFamily: "Nunito_700Bold", fontSize: 16 }}>Email Support</Text>
                    <Text style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)", fontFamily: "Nunito_700Bold", fontSize: 14 }}>{branding.supportEmail}</Text>
                  </View>
                </View>
              )}
              <RenderHtml
                contentWidth={width - 92}
                source={{ html: content }}
                baseStyle={{
                  color: isDark ? "#f1f5f9" : "#0f172a",
                  fontSize: 15,
                  lineHeight: 26,
                  fontFamily: "Nunito_700Bold",
                }}
                tagsStyles={{
                  h1: {
                    fontSize: 24,
                    fontWeight: "900",
                    fontFamily: "Nunito_700Bold",
                    color: isDark ? "#ffffff" : "#0f172a",
                    marginBottom: 10,
                    marginTop: 20,
                  },
                  h2: {
                    fontSize: 18,
                    fontWeight: "800",
                    fontFamily: "Nunito_700Bold",
                    color: meta.accentColor,
                    marginBottom: 8,
                    marginTop: 22,
                    paddingBottom: 4,
                  },
                  h3: {
                    fontSize: 16,
                    fontWeight: "700",
                    fontFamily: "Nunito_700Bold",
                    color: isDark ? "#e2e8f0" : "#1e293b",
                    marginBottom: 6,
                    marginTop: 14,
                  },
                  p: {
                    marginBottom: 12,
                    fontFamily: "Nunito_700Bold",
                    color: isDark ? "rgba(255,255,255,0.85)" : "rgba(15,23,42,0.85)",
                  },
                  strong: {
                    fontWeight: "700",
                    fontFamily: "Nunito_700Bold",
                    color: isDark ? "#ffffff" : "#0f172a",
                  },
                  a: {
                    fontFamily: "Nunito_700Bold",
                    color: meta.accentColor,
                    textDecorationLine: "underline",
                  },
                  ul: { marginBottom: 12 },
                  ol: { marginBottom: 12 },
                  li: {
                    marginBottom: 4,
                    fontFamily: "Nunito_700Bold",
                    color: isDark ? "rgba(255,255,255,0.85)" : "rgba(15,23,42,0.85)",
                  },
                }}
              />
            </View>
          )}

          {/* Footer stamp */}
          {!loading && (
            <View style={{ alignItems: "center", marginTop: 32, gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="heart" size={14} color={meta.accentColor} />
                <Text style={{ color: meta.accentColor, fontSize: 13, fontWeight: "800", fontFamily: "DynaPuff_700Bold" }}>
                  {branding?.appName || "WePlay"}
                </Text>
              </View>
              <Text style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.4)", fontSize: 11, fontFamily: "Nunito_700Bold" }}>
                Version {branding?.appVersion || "1.0.0"} • {branding?.appName || "WePlay"}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}
