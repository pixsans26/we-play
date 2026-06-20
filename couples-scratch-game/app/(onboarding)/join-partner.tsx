import { env } from "@/lib/env";
import { apiFetch } from "@/lib/apiClient";
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Share } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthStore } from "@/store/authStore";
import { useThemeStore, getTheme } from "@/store/themeStore";

export default function JoinPartnerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const setCoupleProfile = useAuthStore((s) => s.setCoupleProfile);
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleJoin = async () => {
    setError("");
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) return setError("Please enter a valid invite code");
    if (!user?.uid) return setError("You must be logged in");

    setLoading(true);
    try {
      const BASE_URL = env.EXPO_PUBLIC_API_URL;

      const res = await apiFetch(`${BASE_URL}/api/couple/invite/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, inviteCode: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to join couple");
      }

      const coupleRecord = await res.json();

      setCoupleProfile({
        id: coupleRecord.id,
        partnerAUid: coupleRecord.partnerAUid,
        partnerBUid: coupleRecord.partnerBUid ?? null,
        partnerAName: coupleRecord.partnerAName ?? "",
        partnerBName: coupleRecord.partnerBName ?? null,
        partnerAAge: coupleRecord.partnerAAge ?? null,
        partnerBAge: coupleRecord.partnerBAge ?? null,
        partnerAAvatar: coupleRecord.partnerAAvatar ?? null,
        partnerBAvatar: coupleRecord.partnerBAvatar ?? null,
        partnerAGender: coupleRecord.partnerAGender ?? null,
        partnerBGender: coupleRecord.partnerBGender ?? null,
        whatALikes: coupleRecord.whatALikes ?? null,
        whatBLikes: coupleRecord.whatBLikes ?? null,
        status: coupleRecord.status ?? null,
        inviteCode: coupleRecord.inviteCode ?? null,
      });

      setSuccess(true);
      setTimeout(() => router.replace("/(game)"), 1500);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={theme.background as any} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: insets.top + 24, paddingHorizontal: 24 }}>

        {/* Header */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center", marginBottom: 32 }}
        >
          <Ionicons name="arrow-back" size={22} color={theme.card.text} />
        </TouchableOpacity>

        <Text style={{ fontSize: 32, fontFamily: "DynaPuff_700Bold", color: theme.card.text, marginBottom: 8 }}>
          Join Your Partner 💌
        </Text>
        <Text style={{ fontSize: 16, color: theme.card.subtext, fontFamily: "Nunito_700Bold", marginBottom: 40 }}>
          Enter the invite code your partner shared with you.
        </Text>

        {/* Code Input */}
        <View style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderRadius: 24, borderWidth: 2, borderColor: error ? "#ef4444" : theme.accent, padding: 24, alignItems: "center", marginBottom: 24 }}>
          <Text style={{ fontSize: 13, color: theme.card.subtext, fontFamily: "Nunito_700Bold", letterSpacing: 2, marginBottom: 16 }}>INVITE CODE</Text>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="XXXXXX"
            placeholderTextColor={theme.input.placeholder}
            autoCapitalize="characters"
            maxLength={8}
            style={{
              fontSize: 36,
              fontFamily: "DynaPuff_700Bold",
              color: theme.accent,
              textAlign: "center",
              letterSpacing: 8,
              width: "100%",
              backgroundColor: "transparent",
            }}
          />
        </View>

        {!!error && (
          <View style={{ backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <Text style={{ color: "#ef4444", textAlign: "center", fontFamily: "Nunito_700Bold" }}>{error}</Text>
          </View>
        )}

        {success && (
          <View style={{ backgroundColor: "rgba(34,197,94,0.1)", borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <Text style={{ color: "#22c55e", textAlign: "center", fontFamily: "Nunito_700Bold" }}>🎉 Linked! Redirecting...</Text>
          </View>
        )}

        {/* Join Button */}
        <TouchableOpacity onPress={handleJoin} disabled={loading || success} activeOpacity={0.85}>
          <LinearGradient
            colors={["#ff2d6b", "#a82dff"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ borderRadius: 32, paddingVertical: 18, alignItems: "center" }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontSize: 18, fontFamily: "DynaPuff_700Bold" }}>Join Couple 💑</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

      </View>
    </LinearGradient>
  );
}
