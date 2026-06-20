import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image, Alert
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, Link } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "@/components/CustomBlurView";
import { useThemeStore, getTheme } from "@/store/themeStore";
import { auth } from "@/lib/firebase";
import { env } from "@/lib/env";

let GoogleSignin: any = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "",
  });
} catch (error) {
  console.warn("GoogleSignin native module not found. It will be disabled in Expo Go.");
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export function validateSignupForm(fields: { name: string; email: string; password: string; confirmPassword: string }): { isValid: boolean; errors: FormErrors } {
  const errors: FormErrors = {};
  if (!fields.name.trim()) errors.name = "Name is required";
  else if (fields.name.trim().length > 50) errors.name = "Name must be 50 characters or less";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!fields.email.trim()) errors.email = "Email is required";
  else if (!emailRegex.test(fields.email.trim())) errors.email = "Enter a valid email address";
  if (!fields.password) errors.password = "Password is required";
  else if (fields.password.length < 8) errors.password = "Password must be at least 8 characters";
  if (!fields.confirmPassword) errors.confirmPassword = "Please confirm your password";
  else if (fields.password !== fields.confirmPassword) errors.confirmPassword = "Passwords do not match";
  return { isValid: Object.keys(errors).length === 0, errors };
}

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    const { isValid, errors: ve } = validateSignupForm({ name, email, password, confirmPassword });
    if (!isValid) { setErrors(ve); return; }
    setErrors({});
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Update Firebase display name
      await updateProfile(user, { displayName: name.trim() });

      // Send email verification
      await sendEmailVerification(user);

      // Save user details to server immediately
      const API_URL = env.EXPO_PUBLIC_API_URL;
      await fetch(`${API_URL}/api/user/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          name: name.trim(),
        }),
      }).catch(console.error);

      // Alert user to verify email and redirect to login
      Alert.alert("Account created!", "Please check your email to verify your account.", [
        { text: "OK", onPress: () => router.replace("/(auth)/login") }
      ]);
    } catch (error: any) {
      if (error?.code === "auth/email-already-in-use") setErrors({ email: "Email already in use" });
      else if (error?.code === "auth/invalid-email") setErrors({ email: "Invalid email address" });
      else if (error?.code === "auth/weak-password") setErrors({ password: "Password is too weak" });
      else setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
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
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      const API_URL = env.EXPO_PUBLIC_API_URL;
      await fetch(`${API_URL}/api/user/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          name: user.displayName || "Google User",
          avatar: user.photoURL || null,
        }),
      }).catch(console.error);

      // We assume Google emails are already verified, go to setup or app
      router.replace("/(onboarding)/profile-setup");
    } catch (error: any) {
      console.log(error);
      setErrors({ general: "Google Sign-In failed. Please try again." });
    }
  };

  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);

  const fieldBorder = (err?: string) => err ? theme.error : "transparent";

  return (
    <LinearGradient colors={theme.background} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 28, paddingVertical: 48 }} keyboardShouldPersistTaps="handled">

          {/* Hero */}
          <View style={{ alignItems: "center", marginBottom: 36 }}>
            <View style={{ width: 100, height: 100, borderRadius: 24, overflow: "hidden", marginBottom: 18 }}>
              <Image
                source={require("../../assets/adaptive-icon.png")}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </View>
            <Text style={{ fontSize: 30, color: theme.card.text, fontWeight: "900", marginBottom: 6, fontFamily: "DynaPuff_700Bold" }}>Create Account</Text>
            <Text style={{ fontSize: 14, color: theme.card.subtext, fontFamily: "Nunito_700Bold" }}>Start your journey together ❤️</Text>
          </View>

          {/* Card */}
          <View style={{ borderRadius: 28 }}>
            <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{ padding: 24, borderRadius: 32, overflow: "hidden" }}>

            {errors.general && (
              <View style={{ backgroundColor: "rgba(239,68,68,0.15)", borderRadius: 32, overflow: "hidden", padding: 12, marginBottom: 16 }}>
                <Text style={{ color: "#fca5a5", textAlign: "center", fontSize: 13 }}>{errors.general}</Text>
              </View>
            )}

            {/* Name */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: theme.card.subtext, fontSize: 12, fontWeight: "700", marginBottom: 7, fontFamily: "Nunito_700Bold" }}>NAME</Text>
              <View style={{ backgroundColor: theme.input.bg, borderWidth: 1, borderColor: fieldBorder(errors.name), borderRadius: 32, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingHorizontal: 14 }}>
                <Ionicons name="person-outline" size={17} color={theme.card.subtext} style={{ marginRight: 10 }} />
                <TextInput
                  style={{ flex: 1, color: theme.card.text, fontSize: 15, paddingVertical: 13 }}
                  placeholder="Your name" placeholderTextColor={theme.input.placeholder}
                  value={name} onChangeText={setName} autoCapitalize="words" maxLength={50}
                />
              </View>
              {errors.name && <Text style={{ color: "#fca5a5", fontSize: 11, marginTop: 4, marginLeft: 4 }}>{errors.name}</Text>}
            </View>

            {/* Email */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: theme.card.subtext, fontSize: 12, fontWeight: "700", marginBottom: 7, fontFamily: "Nunito_700Bold" }}>EMAIL</Text>
              <View style={{ backgroundColor: theme.input.bg, borderWidth: 1, borderColor: fieldBorder(errors.email), borderRadius: 32, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingHorizontal: 14 }}>
                <Ionicons name="mail-outline" size={17} color={theme.card.subtext} style={{ marginRight: 10 }} />
                <TextInput
                  style={{ flex: 1, color: theme.card.text, fontSize: 15, paddingVertical: 13 }}
                  placeholder="your@email.com" placeholderTextColor={theme.input.placeholder}
                  value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                />
              </View>
              {errors.email && <Text style={{ color: "#fca5a5", fontSize: 11, marginTop: 4, marginLeft: 4 }}>{errors.email}</Text>}
            </View>

            {/* Password */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: theme.card.subtext, fontSize: 12, fontWeight: "700", marginBottom: 7, fontFamily: "Nunito_700Bold" }}>PASSWORD</Text>
              <View style={{ backgroundColor: theme.input.bg, borderWidth: 1, borderColor: fieldBorder(errors.password), borderRadius: 32, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingHorizontal: 14 }}>
                <Ionicons name="lock-closed-outline" size={17} color={theme.card.subtext} style={{ marginRight: 10 }} />
                <TextInput
                  style={{ flex: 1, color: theme.card.text, fontSize: 15, paddingVertical: 13 }}
                  placeholder="Min. 8 characters" placeholderTextColor={theme.input.placeholder}
                  value={password} onChangeText={setPassword} secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={17} color={theme.card.subtext} />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={{ color: "#fca5a5", fontSize: 11, marginTop: 4, marginLeft: 4 }}>{errors.password}</Text>}
            </View>

            {/* Confirm Password */}
            <View style={{ marginBottom: 26 }}>
              <Text style={{ color: theme.card.subtext, fontSize: 12, fontWeight: "700", marginBottom: 7, fontFamily: "Nunito_700Bold" }}>CONFIRM PASSWORD</Text>
              <View style={{ backgroundColor: theme.input.bg, borderWidth: 1, borderColor: fieldBorder(errors.confirmPassword), borderRadius: 32, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingHorizontal: 14 }}>
                <Ionicons name="shield-checkmark-outline" size={17} color={theme.card.subtext} style={{ marginRight: 10 }} />
                <TextInput
                  style={{ flex: 1, color: theme.card.text, fontSize: 15, paddingVertical: 13 }}
                  placeholder="Re-enter password" placeholderTextColor={theme.input.placeholder}
                  value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry
                />
              </View>
              {errors.confirmPassword && <Text style={{ color: "#fca5a5", fontSize: 11, marginTop: 4, marginLeft: 4 }}>{errors.confirmPassword}</Text>}
            </View>

            {/* Button */}
            <TouchableOpacity onPress={handleSignup} disabled={isLoading} activeOpacity={0.85}>
              <LinearGradient
                colors={["#f953c6", "#7c3aed"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ borderRadius: 999, overflow: "hidden", paddingVertical: 17, alignItems: "center" }}
              >
                {isLoading
                  ? <ActivityIndicator color="#ffffff" />
                  : <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "800", fontFamily: "DynaPuff_700Bold" }}>Create Account</Text>
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

          {/* Login link */}
          <View style={{ marginTop: 24, alignItems: "center" }}>
            <Text style={{ color: theme.card.subtext, fontSize: 14, fontFamily: "Nunito_700Bold" }}>
              Already have an account?{" "}</Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={{ color: "#f953c6", fontSize: 14, fontWeight: "800", fontFamily: "DynaPuff_700Bold" }}>Log In</Text>
              </TouchableOpacity>
            </Link>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
