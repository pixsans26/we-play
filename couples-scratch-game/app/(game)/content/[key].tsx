import { env } from "@/lib/env";
import React, { useEffect, useState, useRef } from "react";
import { View, Text, Pressable, ScrollView, Animated, Easing, ActivityIndicator, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import RenderHtml from 'react-native-render-html';
import { apiFetch } from "@/lib/apiClient";
import { useThemeStore, getTheme } from "@/store/themeStore";

const BASE_URL = env.EXPO_PUBLIC_API_URL;

const TITLES: Record<string, string> = {
  faq: "FAQ",
  support: "Support",
  privacy: "Privacy Policy",
  help: "Help",
  about: "About",
};

export default function ContentScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);
  const { width } = useWindowDimensions();

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const bgAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bgAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    async function loadContent() {
      try {
        const res = await apiFetch(`${BASE_URL}/api/config/${key}`);
        if (res.ok) {
          const data = await res.json();
          setContent(data.value || `<p>No content available for ${TITLES[key || ""] || key}</p>`);
        } else {
          setContent(`<p>No content available for ${TITLES[key || ""] || key}</p>`);
        }
      } catch (e) {
        setContent("<p>Failed to load content.</p>");
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, [key]);

  const heartColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.2)";

  return (
    <LinearGradient colors={theme.background as any} locations={[0, 0.5, 1]} style={{ flex: 1, paddingTop: 56 }}>
      {/* Decorative Background Hearts */}
      <Animated.View style={{ position: "absolute", top: 80, left: -20, transform: [{ rotate: "-15deg" }, { translateY: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) }] }}>
        <Ionicons name="heart" size={120} color={heartColor} />
      </Animated.View>
      <Animated.View style={{ position: "absolute", top: 250, right: -10, transform: [{ rotate: "25deg" }, { translateY: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }) }] }}>
        <Ionicons name="heart" size={80} color={heartColor} />
      </Animated.View>

      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20, paddingHorizontal: 22 }}>
        <Pressable onPress={() => router.back()} style={{ borderRadius: 20, overflow: "hidden", marginRight: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 }}>
          <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="arrow-back" size={20} color={isDark ? "#ffffff" : "#4c0519"} />
          </BlurView>
        </Pressable>
        <Text style={{ color: isDark ? "#ffffff" : "#0f172a", fontSize: 24, fontWeight: "900", fontFamily: "DynaPuff_700Bold", textShadowColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
          {TITLES[key || ""] || "Information"}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ 
          backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.4)",
          borderRadius: 24,
          padding: 24,
          minHeight: 300
        }}>
          {loading ? (
            <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
          ) : (
            <RenderHtml
              contentWidth={width - 92}
              source={{ html: content }}
              baseStyle={{ color: isDark ? "#ffffff" : "#0f172a", fontSize: 16, lineHeight: 26 }}
              tagsStyles={{
                a: { color: isDark ? '#818cf8' : '#4f46e5', textDecorationLine: 'underline' },
                h1: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
                h2: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
                h3: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
                p: { marginBottom: 12 }
              }}
            />
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
