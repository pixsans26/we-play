import { env } from "@/lib/env";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { Slot } from "expo-router";
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";
import {
  DynaPuff_400Regular,
  DynaPuff_500Medium,
  DynaPuff_600SemiBold,
  DynaPuff_700Bold,
} from "@expo-google-fonts/dynapuff";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { useGameStore } from "@/store/gameStore";

const FONT_LOAD_TIMEOUT_MS = 3000;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    DynaPuff_400Regular,
    DynaPuff_500Medium,
    DynaPuff_600SemiBold,
    DynaPuff_700Bold,
  });

  const [timedOut, setTimedOut] = useState(false);

  const setUser = useAuthStore((s) => s.setUser);
  const setSessionToken = useAuthStore((s) => s.setSessionToken);
  const setIsLoading = useAuthStore((s) => s.setIsLoading);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, FONT_LOAD_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    // Safety timeout: if auth doesn't resolve in 15 seconds, force isLoading to false
    // Increased to 15s because Android emulators/devices can be slow on cold start
    const safetyTimeout = setTimeout(() => {
      console.warn("[auth] Safety timeout fired — forcing isLoading=false");
      setIsLoading(false);
    }, 15000);

    try {
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        console.log("[auth] State changed:", user ? `email=${user.email}` : "no user");
        clearTimeout(safetyTimeout);
        setUser(user);
        
        if (user) {
          try {
            const API_URL = env.EXPO_PUBLIC_API_URL;
            const res = await fetch(`${API_URL}/api/auth/token`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ uid: user.uid })
            });
            if (res.ok) {
              const data = await res.json();
              setSessionToken(data.token);
            } else {
              setSessionToken(null);
            }
          } catch (e) {
            console.error("[auth] Token fetch failed", e);
            setSessionToken(null);
          }
        } else {
          setSessionToken(null);
        }
        
        setIsLoading(false);
      });
    } catch (err) {
      console.warn("[auth] onAuthStateChanged failed:", err);
      clearTimeout(safetyTimeout);
      setIsLoading(false);
    }

    return () => {
      clearTimeout(safetyTimeout);
      if (unsubscribe) unsubscribe();
    };
  }, [setUser, setIsLoading, setSessionToken]);

  const fontsReady = fontsLoaded || fontError !== null || timedOut;

  if (!fontsReady) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#150025" }}
      >
        <ActivityIndicator size="large" color="#f953c6" />
      </View>
    );
  }

  return <Slot />;
}
