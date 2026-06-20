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
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { signInWithEmailAndPassword, signOut, sendEmailVerification, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { auth } from "@/lib/firebase";

let GoogleSignin: any = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "",
  });
} catch (error) {
  console.warn("GoogleSignin native module not found. It will be disabled in Expo Go.");
}
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
  const [unverifiedUser, setUnverifiedUser] = useState<any>(null);

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
              const userCred = await signInWithEmailAndPassword(auth, storedEmail, storedPassword);
              if (!userCred.user.emailVerified) {
                await signOut(auth);
                setUnverifiedUser(userCred.user);
                setError("Please verify your email address to log in.");
                setIsLoading(false);
                return;
              }
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
      const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);

      if (!userCred.user.emailVerified) {
        await signOut(auth);
        setUnverifiedUser(userCred.user);
        setError("Please verify your email address to log in.");
        setIsLoading(false);
        return;
      }

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

  async function handleGoogleSignIn() {
    if (!GoogleSignin) {
      Alert.alert("Not Supported", "Google Sign-In requires a custom native build (npm run ios/android). It does not work in Expo Go.");
      return;
    }
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) throw new Error("No ID token found");

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      
      // Google emails are implicitly verified
      router.replace("/");
    } catch (err: any) {
      console.log(err);
      setError("Google Sign-In failed. Please try again.");
    }
  }

  async function handleResendEmail() {
    if (!unverifiedUser) return;
    try {
      await sendEmailVerification(unverifiedUser);
      Alert.alert("Email Sent", "A new verification link has been sent to your email.");
    } catch (err) {
      setError("Failed to resend email. Please try again later.");
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
              <View style={{ width: 140, height: 140, borderRadius: 24, overflow: "hidden", marginBottom: 20 }}>
                <Image
                  source={require("../../assets/adaptive-icon.png")}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </View>
              <Text style={{ fontSize: 32, color: theme.card.text, fontWeight: "900", marginBottom: 6, fontFamily: "DynaPuff_700Bold" }}>
                Welcome Back
              </Text>
              <Text style={{ fontSize: 15, color: theme.card.subtext, textAlign: "center", fontFamily: "Nunito_700Bold" }}>
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
                    {unverifiedUser && (
                      <TouchableOpacity onPress={handleResendEmail} style={{ marginTop: 8 }}>
                        <Text style={{ color: "#ffffff", fontSize: 13, textAlign: "center", fontWeight: "bold", textDecorationLine: "underline" }}>Resend Verification Email</Text>
                      </TouchableOpacity>
                    )}
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
                      : <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "800", fontFamily: "DynaPuff_700Bold" }}>Log In</Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>

                {/* Google Sign-in */}
                <TouchableOpacity onPress={handleGoogleSignIn} disabled={isLoading} activeOpacity={0.85} style={{ marginTop: 16 }}>
                  <View style={{ backgroundColor: "#ffffff", borderRadius: 999, paddingVertical: 15, alignItems: "center", flexDirection: "row", justifyContent: "center" }}>
                    <Ionicons name="logo-google" size={20} color="#000000" style={{ marginRight: 10 }} />
                    <Text style={{ color: "#000000", fontSize: 16, fontWeight: "800", fontFamily: "Nunito_700Bold" }}>Continue with Google</Text>
                  </View>
                </TouchableOpacity>
              </BlurView>
            </View>

            {/* Sign up link */}
            <View style={{ marginTop: 28, alignItems: "center" }}>
              <Text style={{ color: theme.card.subtext, fontSize: 14, fontFamily: "Nunito_700Bold" }}>
                Don't have an account?{" "}
                <Link href="/(auth)/signup" asChild>
                  <TouchableOpacity>
                    <Text style={{ color: "#f953c6", fontWeight: "800", fontFamily: "DynaPuff_700Bold" }}>Sign Up</Text>
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
