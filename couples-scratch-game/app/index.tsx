import { env } from "@/lib/env";
import { apiFetch } from "@/lib/apiClient";
import { useEffect, useState, useCallback } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "@/store/authStore";

const ONBOARDING_KEY = "onboarding_seen";

export default function EntryScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setCoupleProfile = useAuthStore((s) => s.setCoupleProfile);
  const setIsPartnerA = useAuthStore((s) => s.setIsPartnerA);

  const [checkingProfile, setCheckingProfile] = useState(false);

  const run = useCallback(async () => {
    // Don't run while Firebase auth is still resolving
    if (isLoading) return;

    // If we have a user but no sessionToken yet, wait for the token fetch to complete
    if (user && !sessionToken) return;

    // 1. Check if onboarding has been seen
    let onboardingSeen = false;
    try {
      const val = await AsyncStorage.getItem(ONBOARDING_KEY);
      onboardingSeen = val === "true";
    } catch {
      // treat as not seen
    }

    // If user is already authenticated, skip onboarding regardless —
    // returning users should never be sent back to onboarding
    if (!user && !onboardingSeen) {
      router.replace("/onboarding");
      return;
    }

    // 2. No user and onboarding done (or user not logged in)
    if (!user) {
      router.replace("/(auth)/signup");
      return;
    }

    // 3. User authenticated — check couple profile from API
    setCheckingProfile(true);
    try {
      const BASE_URL = env.EXPO_PUBLIC_API_URL;
      const res = await apiFetch(`${BASE_URL}/api/couple/${encodeURIComponent(user.email || "")}`);
      if (!res.ok) {
        setCoupleProfile(null);
        router.replace("/(onboarding)/profile-setup");
        return;
      }
      
      const record = await res.json();
      if (!record || !record.partnerAName) {
        setCoupleProfile(null);
        router.replace("/(onboarding)/profile-setup");
        return;
      }

      const isA = record.partnerAUid === user.email;
      setIsPartnerA(isA);
      setCoupleProfile({
        id: record.id,
        partnerAUid: record.partnerAUid,
        partnerBUid: record.partnerBUid ?? null,
        partnerAName: record.partnerAName,
        partnerBName: record.partnerBName ?? null,
        partnerAAge: record.partnerAAge ?? null,
        partnerBAge: record.partnerBAge ?? null,
        partnerAGender: record.partnerAGender ?? null,
        partnerBGender: record.partnerBGender ?? null,
        whatALikes: record.whatALikes ?? null,
        whatBLikes: record.whatBLikes ?? null,
      });

      router.replace("/(game)");
    } catch {
      router.replace("/(onboarding)/profile-setup");
    } finally {
      setCheckingProfile(false);
    }
  }, [isLoading, user, sessionToken]);

  // Run on mount AND whenever auth state changes
  useEffect(() => {
    run();
  }, [run]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#150025" }}>
      <ActivityIndicator size="large" color="#f953c6" />
    </View>
  );
}
