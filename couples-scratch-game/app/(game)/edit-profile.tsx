import React, { useState, useEffect } from "react";
import {
  View, Text, Pressable, Alert,
  TextInput, ScrollView, KeyboardAvoidingView, Platform, Image, Modal
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Asset } from "expo-asset";
import { Ionicons } from "@expo/vector-icons";
import { env } from "@/lib/env";
import { apiFetch, getAvatarUrl, getAvatarSource } from "@/lib/apiClient";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore, getTheme } from "@/store/themeStore";

const BASE_URL = env.EXPO_PUBLIC_API_URL;

const PRESET_AVATARS_LOCAL = [
  { url: "/uploads/presets/avatar_boy.png", source: require("@/assets/images/avatars/avatar_boy.jpg") },
  { url: "/uploads/presets/avatar_girl.png", source: require("@/assets/images/avatars/avatar_girl.jpg") },
  { url: "/uploads/presets/avatar_cat.png", source: require("@/assets/images/avatars/avatar_cat.jpg") },
  { url: "/uploads/presets/avatar_dog.png", source: require("@/assets/images/avatars/avatar_dog.jpg") },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const coupleProfile = useAuthStore((s) => s.coupleProfile);
  const setCoupleProfile = useAuthStore((s) => s.setCoupleProfile);
  const isPartnerA = useAuthStore((s) => s.isPartnerA);
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);

  const [nameA, setNameA] = useState(coupleProfile?.partnerAName ?? "");
  const [nameB, setNameB] = useState(coupleProfile?.partnerBName ?? "");
  const [genderA, setGenderA] = useState(coupleProfile?.partnerAGender ?? "");
  const [genderB, setGenderB] = useState(coupleProfile?.partnerBGender ?? "");
  const [likesA, setLikesA] = useState(coupleProfile?.whatALikes ?? "");
  const [likesB, setLikesB] = useState(coupleProfile?.whatBLikes ?? "");
  const [avatarA, setAvatarA] = useState(coupleProfile?.partnerAAvatar ?? null);
  const [avatarB, setAvatarB] = useState(coupleProfile?.partnerBAvatar ?? null);
  const isPartnerBPending = !coupleProfile?.partnerBUid || coupleProfile.partnerBUid.startsWith("partner_b_pending_");
  const [presetAvatars, setPresetAvatars] = useState<{ url: string; name?: string }[]>(PRESET_AVATARS_LOCAL);
  const [partnerBEmail, setPartnerBEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const res = await apiFetch(`${BASE_URL}/api/preset-avatars`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setPresetAvatars(data);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch preset avatars:", err);
      }
    };
    fetchPresets();
  }, []);

  // Avatar picker modal state
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [activePartnerAvatar, setActivePartnerAvatar] = useState<"A" | "B" | null>(null);

  const pickImage = async (setAvatar: (uri: string) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatar(result.assets[0].uri);
      setAvatarPickerVisible(false);
    }
  };

  const selectPreset = (url: string) => {
    if (activePartnerAvatar === "A") setAvatarA(url);
    if (activePartnerAvatar === "B") setAvatarB(url);
    setAvatarPickerVisible(false);
  };

  async function handleSaveProfile() {
    if (!coupleProfile) return;
    const trimA = nameA.trim();
    const trimB = nameB.trim();
    if (!trimA) { Alert.alert("Name required", "Partner A name cannot be empty."); return; }

    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append("partnerAUid", coupleProfile.partnerAUid);

      if (isPartnerBPending && partnerBEmail.trim()) {
        formData.append("partnerBUid", partnerBEmail.trim().toLowerCase());
      } else if (coupleProfile.partnerBUid) {
        formData.append("partnerBUid", coupleProfile.partnerBUid);
      }

      formData.append("partnerAName", trimA);
      if (trimB) formData.append("partnerBName", trimB);
      if (genderA.trim()) formData.append("partnerAGender", genderA.trim());
      if (genderB.trim()) formData.append("partnerBGender", genderB.trim());
      if (likesA.trim()) formData.append("whatALikes", likesA.trim());
      if (likesB.trim()) formData.append("whatBLikes", likesB.trim());

      if (avatarA && avatarA !== coupleProfile.partnerAAvatar) {
        if (avatarA.startsWith("file://") || avatarA.startsWith("content://")) {
          const dotIndex = avatarA.lastIndexOf(".");
          let ext = dotIndex !== -1 && dotIndex > avatarA.lastIndexOf("/") ? avatarA.substring(dotIndex + 1).toLowerCase() : "jpeg";
          if (ext === "jpg") ext = "jpeg";
          formData.append("partnerAAvatar", {
            uri: avatarA,
            name: `avatar_A.${ext}`,
            type: `image/${ext}`
          } as any);
        } else {
          formData.append("partnerAAvatar", avatarA);
        }
      }

      if (avatarB && avatarB !== coupleProfile.partnerBAvatar) {
        if (avatarB.startsWith("file://") || avatarB.startsWith("content://")) {
          const dotIndex = avatarB.lastIndexOf(".");
          let ext = dotIndex !== -1 && dotIndex > avatarB.lastIndexOf("/") ? avatarB.substring(dotIndex + 1).toLowerCase() : "jpeg";
          if (ext === "jpg") ext = "jpeg";
          formData.append("partnerBAvatar", {
            uri: avatarB,
            name: `avatar_B.${ext}`,
            type: `image/${ext}`
          } as any);
        } else {
          formData.append("partnerBAvatar", avatarB);
        }
      }

      const res = await apiFetch(`${BASE_URL}/api/couple`, {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        const savedProfile = await res.json();
        setCoupleProfile(savedProfile);
        Alert.alert("Success", "Profile saved successfully!");
        router.back();
      } else {
        throw new Error("Failed to save");
      }
    } catch (err) {
      console.warn("Save profile error", err);
      Alert.alert("Error", "Could not save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <LinearGradient colors={theme.background as any} locations={[0, 0.5, 1]} style={{ flex: 1, paddingTop: 56 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, marginBottom: 20 }}>
          <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="close" size={24} color={isDark ? "#ffffff" : "#0f172a"} />
          </Pressable>
          <Text style={{ color: isDark ? "#ffffff" : "#0f172a", fontSize: 20, fontWeight: "900", fontFamily: "DynaPuff_700Bold" }}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {/* Partner A */}
          <View style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.6)", borderRadius: 24, padding: 20, marginBottom: 20 }}>
            <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(15,23,42,0.8)", fontSize: 12, fontWeight: "800", marginBottom: 16 }}>
              {isPartnerA ? "PARTNER A (YOU)" : "PARTNER A"}
            </Text>

            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <Pressable
                onPress={() => {
                  if (isPartnerA) {
                    setActivePartnerAvatar("A");
                    setAvatarPickerVisible(true);
                  }
                }}
                style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#f3e8ff", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(168,85,247,0.2)", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
              >
                {avatarA ? (
                  <Image source={getAvatarSource(avatarA)} style={{ width: "100%", height: "100%", borderRadius: 50 }} resizeMode="cover" />
                ) : (
                  <Ionicons name="camera-outline" size={32} color={isDark ? "rgba(255,255,255,0.5)" : "#9333ea"} />
                )}
              </Pressable>
              {isPartnerA && (
                <Text style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(15,23,42,0.5)", fontSize: 10, marginTop: 8 }}>Tap to change</Text>
              )}
            </View>

            <View style={{ gap: 12 }}>
              <View>
                <Text style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)", fontSize: 12, marginBottom: 4, marginLeft: 4 }}>Name</Text>
                <TextInput
                  value={nameA}
                  onChangeText={setNameA}
                  editable={isPartnerA}
                  placeholder="Your Name"
                  placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
                  style={{
                    backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                    color: isPartnerA ? (isDark ? "#fff" : "#0f172a") : (isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.4)"),
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderRadius: 16,
                    fontSize: 16,
                    fontWeight: "600"
                  }}
                />
              </View>
              <View>
                <Text style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)", fontSize: 12, marginBottom: 4, marginLeft: 4 }}>Gender</Text>
                <TextInput
                  value={genderA}
                  onChangeText={setGenderA}
                  editable={isPartnerA}
                  placeholder="Male / Female"
                  placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
                  style={{
                    backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                    color: isPartnerA ? (isDark ? "#fff" : "#0f172a") : (isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.4)"),
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderRadius: 16,
                    fontSize: 16,
                    fontWeight: "600"
                  }}
                />
              </View>
              <View>
                <Text style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)", fontSize: 12, marginBottom: 4, marginLeft: 4 }}>Likes (comma separated)</Text>
                <TextInput
                  value={likesA}
                  onChangeText={setLikesA}
                  editable={isPartnerA}
                  placeholder="e.g. Coffee, Movies, Hiking"
                  placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
                  style={{
                    backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                    color: isPartnerA ? (isDark ? "#fff" : "#0f172a") : (isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.4)"),
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderRadius: 16,
                    fontSize: 16,
                    fontWeight: "600"
                  }}
                />
              </View>
            </View>
          </View>

          {/* Partner B */}
          <View style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.6)", borderRadius: 24, padding: 20, marginBottom: 24 }}>
            <Text style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(15,23,42,0.8)", fontSize: 12, fontWeight: "800", marginBottom: 16 }}>
              {!isPartnerA ? "PARTNER B (YOU)" : "PARTNER B"}
            </Text>

            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <Pressable
                onPress={() => {
                  if (!isPartnerA) {
                    setActivePartnerAvatar("B");
                    setAvatarPickerVisible(true);
                  }
                }}
                style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#f3e8ff", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(168,85,247,0.2)", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
              >
                {avatarB ? (
                  <Image source={getAvatarSource(avatarB)} style={{ width: "100%", height: "100%", borderRadius: 50 }} resizeMode="cover" />
                ) : (
                  <Ionicons name="camera-outline" size={32} color={isDark ? "rgba(255,255,255,0.5)" : "#9333ea"} />
                )}
              </Pressable>
              {!isPartnerA && (
                <Text style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(15,23,42,0.5)", fontSize: 10, marginTop: 8 }}>Tap to change</Text>
              )}
            </View>

            <View style={{ gap: 12 }}>
              {isPartnerBPending && isPartnerA && (
                <View>
                  <Text style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)", fontSize: 12, marginBottom: 4, marginLeft: 4 }}>Partner Email to Link (Optional)</Text>
                  <TextInput value={partnerBEmail} onChangeText={setPartnerBEmail} placeholder="partner@email.com" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"} style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", color: isDark ? "#fff" : "#0f172a", paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, fontSize: 16, fontWeight: "600" }} />
                  <Text style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(15,23,42,0.5)", fontSize: 10, marginTop: 4, marginLeft: 4 }}>They can login using this email later to sync progress.</Text>
                </View>
              )}
              <View>
                <Text style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)", fontSize: 12, marginBottom: 4, marginLeft: 4 }}>Name</Text>
                <TextInput
                  value={nameB}
                  onChangeText={setNameB}
                  editable={!isPartnerA}
                  placeholder="Partner Name"
                  placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
                  style={{
                    backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                    color: !isPartnerA ? (isDark ? "#fff" : "#0f172a") : (isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.4)"),
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderRadius: 16,
                    fontSize: 16,
                    fontWeight: "600"
                  }}
                />
              </View>
              <View>
                <Text style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)", fontSize: 12, marginBottom: 4, marginLeft: 4 }}>Gender</Text>
                <TextInput
                  value={genderB}
                  onChangeText={setGenderB}
                  editable={!isPartnerA}
                  placeholder="Male / Female"
                  placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
                  style={{
                    backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                    color: !isPartnerA ? (isDark ? "#fff" : "#0f172a") : (isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.4)"),
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderRadius: 16,
                    fontSize: 16,
                    fontWeight: "600"
                  }}
                />
              </View>
              <View>
                <Text style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)", fontSize: 12, marginBottom: 4, marginLeft: 4 }}>Likes (comma separated)</Text>
                <TextInput
                  value={likesB}
                  onChangeText={setLikesB}
                  editable={!isPartnerA}
                  placeholder="e.g. Coffee, Movies, Hiking"
                  placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
                  style={{
                    backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                    color: !isPartnerA ? (isDark ? "#fff" : "#0f172a") : (isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.4)"),
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderRadius: 16,
                    fontSize: 16,
                    fontWeight: "600"
                  }}
                />
              </View>
            </View>
          </View>

          <Pressable onPress={handleSaveProfile} disabled={savingProfile}>
            <LinearGradient
              colors={savingProfile ? ["#94a3b8", "#64748b"] : ["#8b5cf6", "#d946ef"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 999, overflow: "hidden" }}
            >
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "800", fontFamily: "DynaPuff_700Bold" }}>
                {savingProfile ? "Saving..." : "Save Profile"}
              </Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Avatar Picker Modal */}
      <Modal visible={avatarPickerVisible} animationType="fade" transparent onRequestClose={() => setAvatarPickerVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 }} onPress={() => setAvatarPickerVisible(false)}>
          <Pressable style={{ width: "100%", backgroundColor: isDark ? "#1e293b" : "#ffffff", borderRadius: 24, padding: 24, alignItems: "center" }}>
            <Text style={{ color: isDark ? "#fff" : "#0f172a", fontSize: 18, fontWeight: "800", fontFamily: "DynaPuff_700Bold", marginBottom: 20 }}>Choose Avatar</Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 16, marginBottom: 24 }}>
              {presetAvatars.map((preset, i) => (
                <Pressable key={i} onPress={() => selectPreset(preset.url)} style={{ width: 70, height: 70, borderRadius: 50, overflow: "hidden", borderWidth: 2, borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }}>
                  <Image source={getAvatarSource(preset.url)} style={{ width: "100%", height: "100%", borderRadius: 50 }} resizeMode="cover" />
                </Pressable>
              ))}
            </View>

            <Pressable onPress={() => pickImage(activePartnerAvatar === "A" ? setAvatarA : setAvatarB)} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#f1f5f9" }}>
              <Ionicons name="image-outline" size={20} color={isDark ? "#fff" : "#3b82f6"} />
              <Text style={{ color: isDark ? "#fff" : "#3b82f6", fontWeight: "700" }}>Upload from Gallery</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

    </LinearGradient>
  );
}
