import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View, Image } from "react-native";
import { Slot, useRouter, usePathname } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "@/components/CustomBlurView";

import { useAuthStore } from "@/store/authStore";
import { useGameStore } from "@/store/gameStore";
import { useThemeStore, getTheme } from "@/store/themeStore";
import { getAvatarUrl, apiFetch } from "@/lib/apiClient";
import { env } from "@/lib/env";

// Screens that should hide the tab bar
const HIDDEN_TAB_SCREENS = ["/image-scratch", "/task-scratch", "/history", "/spin-wheel", "/lottery"];

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface TabConfig {
  route: string;
  icon: string;
  label: string;
  imageUrl?: string | null;
}

function getProfileIcon(gender: string | null | undefined): string {
  if (gender?.toLowerCase() === "female") return "face-woman";
  if (gender?.toLowerCase() === "male") return "face-man";
  return "account";
}

function TabItem({
  tab,
  isActive,
  isDark,
  onPress,
}: {
  tab: TabConfig;
  isActive: boolean;
  isDark: boolean;
  onPress: () => void;
}) {
  const theme = getTheme(isDark);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 0.9,
        useNativeDriver: true,
        speed: 80,
        bounciness: 0,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 80,
        bounciness: 4,
      }),
    ]).start();
    onPress();
  };

  return (
    <Pressable style={styles.tabItem} onPress={handlePress}>
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        {/* Pill background for active tab */}
        {isActive && (
          <View
            style={[
              styles.pillBg,
              {
                backgroundColor: isDark
                  ? "rgba(249,83,198,0.15)"
                  : "rgba(233,30,140,0.08)",
              },
            ]}
          />
        )}
        {tab.imageUrl ? (
          <View style={{ width: isActive ? 34 : 30, height: isActive ? 34 : 30, borderRadius: isActive ? 17 : 15, overflow: "hidden", borderWidth: 2, borderColor: isActive ? theme.nav.active : theme.nav.inactive }}>
            <Image source={{ uri: tab.imageUrl }} style={{ width: "100%", height: "100%", borderRadius: isActive ? 17 : 15 }} resizeMode="cover" />
          </View>
        ) : tab.icon.startsWith("face-") || tab.icon === "account" ? (
          <MaterialCommunityIcons
            name={tab.icon as any}
            size={isActive ? 28 : 26}
            color={isActive ? theme.nav.active : theme.nav.inactive}
          />
        ) : (
          <Ionicons
            name={tab.icon as any}
            size={isActive ? 26 : 24}
            color={isActive ? theme.nav.active : theme.nav.inactive}
          />
        )}
        {/* Active dot indicator */}
        {isActive && (
          <View
            style={[styles.activeDot, { backgroundColor: theme.nav.active }]}
          />
        )}
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          {
            color: isActive ? theme.nav.active : theme.nav.inactive,
            fontWeight: isActive ? "700" : "500",
          },
        ]}
        numberOfLines={1}
      >
        {tab.label}
      </Text>
    </Pressable>
  );
}

export default function GameLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const coupleProfile = useAuthStore((s) => s.coupleProfile);
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);
  const isPartnerA = useAuthStore((s) => s.isPartnerA);
  const isDataLoaded = useGameStore((s) => s.isDataLoaded);
  const fetchData = useGameStore((s) => s.fetchData);
  const [dataError, setDataError] = useState<string | null>(null);

  const setCoupleProfile = useAuthStore((s) => s.setCoupleProfile);

  useEffect(() => {
    if (isLoading || !user || !coupleProfile?.partnerAName) return;
    if (!isDataLoaded) {
      fetchData().catch((err) => setDataError(err.message));
    }
  }, [isLoading, user, coupleProfile, isDataLoaded, fetchData]);

  // Background real-time sync for couple profile
  useEffect(() => {
    if (!user || !user.email) return;

    const fetchProfile = () => {
      apiFetch(`${env.EXPO_PUBLIC_API_URL}/api/couple/${user.email}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setCoupleProfile(data);
        })
        .catch(err => console.warn("Background sync profile failed:", err));
    };

    // Initial fetch
    fetchProfile();

    // Poll every 5 seconds for real-time updates across devices
    const interval = setInterval(fetchProfile, 5000);

    return () => clearInterval(interval);
  }, [user, setCoupleProfile]);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/(auth)/signup");
      return;
    }

    if (!coupleProfile || !coupleProfile.partnerAName) {
      router.replace("/(onboarding)/profile-setup");
      return;
    }
  }, [isLoading, user, coupleProfile]);

  if (isLoading || !user || !coupleProfile || !coupleProfile.partnerAName || (!isDataLoaded && !dataError)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#150025" }}>
        <ActivityIndicator size="large" color="#f953c6" />
      </View>
    );
  }

  if (dataError) {
    return (
      <View
        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#ff2d6b", paddingHorizontal: 24 }}
      >
        <Text
          style={{ color: "#ffffff", fontSize: 18, fontWeight: "bold", marginBottom: 8, textAlign: "center" }}
        >
          Database Error
        </Text>
        <Text
          style={{ color: "rgba(255,255,255,0.8)", textAlign: "center" }}
        >
          {dataError}. Please restart the app.
        </Text>
      </View>
    );
  }

  // Build profile tab label — first name, max 10 chars
  const partnerFirstName = (coupleProfile.partnerAName ?? "Profile")
    .split(" ")[0]
    .slice(0, 10);

  const myGender = isPartnerA ? coupleProfile.partnerAGender : coupleProfile.partnerBGender;
  const myAvatarUrl = isPartnerA ? coupleProfile.partnerAAvatar : coupleProfile.partnerBAvatar;

  const TABS: TabConfig[] = [
    { route: "/(game)", label: "Home", icon: "home" },
    {
      route: "/(game)/profile",
      label: partnerFirstName,
      icon: getProfileIcon(myGender) as IoniconName,
      imageUrl: getAvatarUrl(myAvatarUrl),
    },
    { route: "/(game)/settings", label: "Settings", icon: "settings-outline" },
  ];

  // Check if current screen should hide tabs
  const shouldHideTabs = HIDDEN_TAB_SCREENS.some((s) => pathname.includes(s));

  return (
    <View style={{ flex: 1 }}>
      <Slot />
      {!shouldHideTabs && (
        <BlurView
          intensity={80}
          tint={isDark ? "dark" : "light"}
          style={[
            styles.navContainer,
            {
              backgroundColor: isDark ? "rgba(30,0,53,0.65)" : "rgba(255,255,255,0.65)",
              overflow: "hidden",
            },
          ]}
        >
          {TABS.map((tab) => {
            const isActive =
              tab.route === "/(game)"
                ? pathname === "/" || pathname === "/(game)" || pathname === ""
                : pathname.includes(tab.route.replace("/(game)", ""));

            return (
              <TabItem
                key={tab.route}
                tab={tab}
                isActive={isActive}
                isDark={isDark}
                onPress={() => router.push(tab.route as any)}
              />
            );
          })}
        </BlurView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    flexDirection: "row",
    position: "absolute",
    bottom: 30,
    left: 24,
    right: 24,
    borderRadius: 30,
    paddingBottom: 12,
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  tabInner: {
    width: 52,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 32, overflow: "hidden",
    position: "relative",
  },
  pillBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 32, overflow: "hidden",
  },
  activeDot: {
    position: "absolute",
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: 10,
  },
});
