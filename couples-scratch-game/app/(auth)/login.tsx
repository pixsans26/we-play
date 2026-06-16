import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { auth } from "@/lib/firebase";
import { useSettingsStore } from "@/store/settingsStore";
import { BlurView } from "@/components/CustomBlurView";
import { useThemeStore, getTheme } from "@/store/themeStore";

function getAuthErrorMessage(code: string): string {
  switch (code) {
    case "auth/invalid-email": return "Please enter a valid email address.";
    case "auth/user-disabled": return "This account has been disabled.";
    case "auth/user-not-found": return "No account found with this email.";
    case "auth/wrong-password": return "Incorrect password. Please try again.";
    case "auth/invalid-credential": return "Invalid email or password.";
    case "auth/too-many-requests": return "Too many attempts. Please try again later.";
    case "auth/network-request-failed": return "Network error. Check your connection.";
    default: return "Something went wrong. Please try again.";
  }
}

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const biometricEnabled = useSettingsStore((s) => s.biometricEnabled);
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);

  useEffect(() => {
    if (biometricEnabled) {
      handleBiometricAuth();
    }
  }, []);

  async function handleBiometricAuth() {
    try {
      const storedEmail = await SecureStore.getItemAsync("biometric_email");
      const storedPassword = await SecureStore.getItemAsync("biometric_password");

      if (storedEmail && storedPassword) {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (hasHardware && isEnrolled) {
          const authResult = await LocalAuthentication.authenticateAsync({
            promptMessage: "Sign in to WePlay",
            fallbackLabel: "Use Password",
          });

          if (authResult.success) {
            setIsLoading(true);
            try {
              await signInWithEmailAndPassword(auth, storedEmail, storedPassword);
              router.replace("/");
            } catch (err: any) {
              setError(getAuthErrorMessage(err?.code || ""));
            } finally {
              setIsLoading(false);
            }
          }
        }
      }
    } catch (e) {
      // Ignore secure store/biometric errors silently and let user type password
    }
  }

  async function handleLogin() {
    setError(null);
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (!password) { setError("Please enter your password."); return; }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      
      // Save credentials for future biometric logins
      await SecureStore.setItemAsync("biometric_email", email.trim());
      await SecureStore.setItemAsync("biometric_password", password);

      // Route directly to entry
      router.replace("/");
    } catch (err: any) {
      setError(getAuthErrorMessage(err?.code || ""));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={theme.background}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28, paddingVertical: 48 }}>

            {/* Hero */}
            <View style={{ alignItems: "center", marginBottom: 44 }}>
              <LinearGradient
                colors={["#f953c6", "#7c3aed"]}
                style={{ width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 20 }}
              >
                <Ionicons name="heart" size={40} color="#ffffff" />
              </LinearGradient>
              <Text style={{ fontSize: 32, color: theme.card.text, fontWeight: "900", marginBottom: 6, fontFamily: "DynaPuff_700Bold" }}>
                Welcome Back
              </Text>
              <Text style={{ fontSize: 15, color: theme.card.subtext, textAlign: "center" }}>
                Your love story continues ✨
              </Text>
            </View>

            {/* Card */}
            <View style={{ borderRadius: 28 }}>
              <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{
                padding: 24,
                borderRadius: 32, overflow: "hidden",
              }}>

              {error && (
                <View style={{ backgroundColor: "rgba(239,68,68,0.15)", borderWidth: 1, borderColor: "rgba(248,113,113,0.3)", borderRadius: 32, overflow: "hidden", padding: 12, marginBottom: 20 }}>
                  <Text style={{ color: "#fca5a5", fontSize: 13, textAlign: "center" }}>{error}</Text>
                </View>
              )}

              {/* Email */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: theme.card.subtext, fontSize: 13, fontWeight: "700", marginBottom: 8 }}>
                  EMAIL
                </Text>
                <View style={{ backgroundColor: theme.input.bg, borderRadius: 32, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingHorizontal: 16 }}>
                  <Ionicons name="mail-outline" size={18} color={theme.card.subtext} style={{ marginRight: 10 }} />
                  <TextInput
                    style={{ flex: 1, color: theme.card.text, fontSize: 16, paddingVertical: 14 }}
                    placeholder="your@email.com"
                    placeholderTextColor={theme.input.placeholder}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={{ marginBottom: 28 }}>
                <Text style={{ color: theme.card.subtext, fontSize: 13, fontWeight: "700", marginBottom: 8 }}>
                  PASSWORD
                </Text>
                <View style={{ backgroundColor: theme.input.bg, borderRadius: 32, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingHorizontal: 16 }}>
                  <Ionicons name="lock-closed-outline" size={18} color={theme.card.subtext} style={{ marginRight: 10 }} />
                  <TextInput
                    style={{ flex: 1, color: theme.card.text, fontSize: 16, paddingVertical: 14 }}
                    placeholder="Enter your password"
                    placeholderTextColor={theme.input.placeholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={theme.card.subtext} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Button */}
              <TouchableOpacity onPress={handleLogin} disabled={isLoading} activeOpacity={0.85}>
                <LinearGradient
                  colors={["#f953c6", "#7c3aed"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 999, overflow: "hidden", paddingVertical: 17, alignItems: "center" }}
                >
                  {isLoading
                    ? <ActivityIndicator color="#ffffff" />
                    : <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "800" }}>Log In</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
              </BlurView>
            </View>

            {/* Sign up link */}
            <View style={{ marginTop: 28, alignItems: "center" }}>
              <Text style={{ color: theme.card.subtext, fontSize: 14 }}>
                Don't have an account?{" "}
                <Link href="/(auth)/signup" asChild>
                  <TouchableOpacity>
                    <Text style={{ color: "#f953c6", fontWeight: "800" }}>Sign Up</Text>
                  </TouchableOpacity>
                </Link>
              </Text>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
