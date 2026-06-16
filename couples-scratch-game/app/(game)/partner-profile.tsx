import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "@/components/CustomBlurView";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore, getTheme } from "@/store/themeStore";
import { apiFetch } from "@/lib/apiClient";
import { env } from "@/lib/env";

const GENDER_OPTIONS = ["male", "female", "non-binary", "other"] as const;

export default function PartnerProfileScreen() {
  const router = useRouter();
  const { partner } = useLocalSearchParams<{ partner: string }>();
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);
  const coupleProfile = useAuthStore((s) => s.coupleProfile);
  const setCoupleProfile = useAuthStore((s) => s.setCoupleProfile);
  const user = useAuthStore((s) => s.user);

  const isPartnerA = partner === "A";
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (coupleProfile) {
      if (isPartnerA) {
        setName(coupleProfile.partnerAName || "");
        setAge(coupleProfile.partnerAAge?.toString() || "");
        setGender(coupleProfile.partnerAGender || "");
      } else {
        setName(coupleProfile.partnerBName || "");
        setAge(coupleProfile.partnerBAge?.toString() || "");
        setGender(coupleProfile.partnerBGender || "");
      }
    }
  }, [coupleProfile, isPartnerA]);

  const handleSave = async () => {
    if (!coupleProfile || !user?.email) return;
    
    setIsLoading(true);
    
    const payload = isPartnerA ? {
      partnerAName: name,
      partnerAAge: age ? parseInt(age, 10) : null,
      partnerAGender: gender || null,
    } : {
      partnerBName: name,
      partnerBAge: age ? parseInt(age, 10) : null,
      partnerBGender: gender || null,
    };

    try {
      const res = await apiFetch(`${env.EXPO_PUBLIC_API_URL}/api/couple/${user.email}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Failed to save profile");
      }

      setCoupleProfile({
        ...coupleProfile,
        ...payload
      });
      
      Alert.alert("Success", "Profile updated successfully!");
      router.back();
    } catch (err) {
      console.warn("Save profile failed:", err);
      Alert.alert("Error", "Could not update profile. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: theme.input.bg,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: theme.card.text,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.input.border,
  };

  const labelStyle = {
    color: theme.card.subtext,
    fontSize: 13,
    fontWeight: "700" as const,
    marginBottom: 6,
    marginLeft: 4,
  };

  return (
    <LinearGradient colors={theme.background as any} locations={[0, 0.5, 1]} style={{ flex: 1, paddingTop: 56 }}>
      
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20, paddingHorizontal: 22 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ borderRadius: 32, overflow: "hidden", marginRight: 14 }}>
          <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={{ width: 40, height: 40, borderRadius: 32, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="arrow-back" size={20} color={isDark ? "#ffffff" : "#4c0519"} />
          </BlurView>
        </TouchableOpacity>
        <View>
          <Text style={{ color: isDark ? "#ffffff" : "#0f172a", fontSize: 24, fontWeight: "900", fontFamily: "DynaPuff_700Bold" }}>
            Edit Profile
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 110 }} keyboardShouldPersistTaps="handled">
          
          <View style={{ borderRadius: 32, overflow: "hidden", marginBottom: 24 }}>
            <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{ padding: 24 }}>
              
              <Text style={labelStyle}>NAME</Text>
              <TextInput
                style={inputStyle}
                placeholder="Enter name"
                placeholderTextColor={theme.input.placeholder}
                value={name}
                onChangeText={setName}
              />

              <Text style={labelStyle}>AGE</Text>
              <TextInput
                style={inputStyle}
                placeholder="Enter age"
                placeholderTextColor={theme.input.placeholder}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                maxLength={3}
              />

              <Text style={labelStyle}>GENDER</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {GENDER_OPTIONS.map((opt) => {
                  const selected = gender === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setGender(opt)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 32,
                        backgroundColor: selected ? theme.accent : theme.input.bg,
                        borderWidth: 1,
                        borderColor: selected ? theme.accent : theme.input.border,
                      }}
                    >
                      <Text style={{ fontSize: 14, textTransform: "capitalize", color: selected ? "#ffffff" : theme.card.text, fontWeight: selected ? "bold" : "normal" }}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity onPress={handleSave} disabled={isLoading}>
                <LinearGradient
                  colors={["#f953c6", "#7c3aed"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 32, paddingVertical: 16, alignItems: "center", marginTop: 8 }}
                >
                  {isLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "bold" }}>Save Changes</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          </View>

          {/* Period Calendar Placeholder */}
          {gender === "female" && (
            <View style={{ borderRadius: 32, overflow: "hidden" }}>
              <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{ padding: 24, alignItems: "center" }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(249,83,198,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <Ionicons name="calendar-outline" size={32} color="#f953c6" />
                </View>
                <Text style={{ color: isDark ? "#ffffff" : "#4c0519", fontSize: 18, fontWeight: "900", fontFamily: "DynaPuff_700Bold", marginBottom: 8 }}>
                  Period Calendar
                </Text>
                <Text style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(76,5,25,0.7)", fontSize: 13, textAlign: "center", marginBottom: 16 }}>
                  Track your cycle and understand your partner's moods better. Coming soon in a future update!
                </Text>
                <View style={{ backgroundColor: "rgba(249,83,198,0.15)", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 32 }}>
                  <Text style={{ color: "#f953c6", fontSize: 11, fontWeight: "800", textTransform: "uppercase" }}>Coming Soon</Text>
                </View>
              </BlurView>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
