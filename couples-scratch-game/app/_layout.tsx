import "@/patch";
import { env } from "@/lib/env";
import { useEffect, useState } from "react";
import { LogBox } from "react-native";
import { Slot, useRouter } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Ignore all log warnings to keep the UI clean
LogBox.ignoreAllLogs();
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

import { Ionicons } from "@expo/vector-icons";
import { Pressable, View, Text } from "react-native";
import packageJson from "../package.json";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const LOCAL_APP_VERSION = packageJson.version || "1.0.0";

function isVersionHigher(latest: string, current: string) {
  const l = latest.split('.').map(Number);
  const c = current.split('.').map(Number);
  for(let i=0; i<Math.max(l.length, c.length); i++) {
    const lVal = l[i] || 0;
    const cVal = c[i] || 0;
    if (lVal > cVal) return true;
    if (lVal < cVal) return false;
  }
  return false;
}

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
  const [updateRequired, setUpdateRequired] = useState(false);
  const [latestVersion, setLatestVersion] = useState("");
  const [brandingAppName, setBrandingAppName] = useState("WePlay");

  const setUser = useAuthStore((s) => s.setUser);
  const setSessionToken = useAuthStore((s) => s.setSessionToken);
  const setIsLoading = useAuthStore((s) => s.setIsLoading);
  
  const { expoPushToken } = usePushNotifications();
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user && sessionToken && expoPushToken) {
      fetch(`${env.EXPO_PUBLIC_API_URL}/api/users/push-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          userUid: user.uid,
          pushToken: expoPushToken,
        }),
      }).catch(console.error);
    }
  }, [user, sessionToken, expoPushToken]);

  useEffect(() => {
    async function checkVersion() {
      try {
        const res = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/config/public/app_branding`);
        if (res.ok) {
          const data = await res.json();
          if (data.value) {
            const parsed = JSON.parse(data.value);
            if (parsed.appName) setBrandingAppName(parsed.appName);
            if (parsed.appVersion && isVersionHigher(parsed.appVersion, LOCAL_APP_VERSION)) {
              setLatestVersion(parsed.appVersion);
              setUpdateRequired(true);
            }
          }
        }
      } catch (e) {}
    }
    checkVersion();
  }, []);

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

            // Register user email so admin can see it
            fetch(`${API_URL}/api/user/register`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoUrl: user.photoURL,
              }),
            }).catch(() => {});
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

  const authIsLoading = useAuthStore((s) => s.isLoading);
  const fontsReady = fontsLoaded || fontError !== null || timedOut;
  const appIsReady = fontsReady && !authIsLoading;

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  if (updateRequired) {
    return (
      <View style={{ flex: 1, backgroundColor: "#150025", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Ionicons name="cloud-download-outline" size={80} color="#f953c6" style={{ marginBottom: 20 }} />
        <Text style={{ fontFamily: "DynaPuff_700Bold", fontSize: 28, color: "#fff", marginBottom: 12, textAlign: "center" }}>Update Available</Text>
        <Text style={{ fontFamily: "Nunito_400Regular", fontSize: 16, color: "rgba(255,255,255,0.7)", textAlign: "center", marginBottom: 32 }}>
          A new version of {brandingAppName} ({latestVersion}) is available. Please update to continue.
        </Text>
        <Pressable 
          style={{ backgroundColor: "#f953c6", paddingHorizontal: 32, paddingVertical: 16, borderRadius: 30 }}
          onPress={() => alert("Redirect to App Store / Play Store")}
        >
          <Text style={{ fontFamily: "Nunito_700Bold", color: "#fff", fontSize: 18 }}>Update Now</Text>
        </Pressable>
      </View>
    );
  }

  return <Slot />;
}
