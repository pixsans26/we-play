import { env } from "@/lib/env";
import { apiFetch, getAvatarUrl } from "@/lib/apiClient";
import { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Image, Modal, Pressable,
  Animated
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "@/store/authStore";
import { useThemeStore, getTheme } from "@/store/themeStore";

const PRESET_AVATARS_LOCAL = [
  { url: "/uploads/presets/avatar_boy.png", source: require("@/assets/images/avatars/avatar_boy.png") },
  { url: "/uploads/presets/avatar_girl.png", source: require("@/assets/images/avatars/avatar_girl.png") },
  { url: "/uploads/presets/avatar_cat.png", source: require("@/assets/images/avatars/avatar_cat.png") },
  { url: "/uploads/presets/avatar_dog.png", source: require("@/assets/images/avatars/avatar_dog.png") },
];

const PREFERENCE_CHIPS = [
  "Travel ✈️", "Foodie 🍔", "Movie Nights 🍿", "Outdoors 🏕️", "Gaming 🎮",
  "Fitness 💪", "Reading 📚", "Art & Culture 🎨", "Music 🎵", "Coffee ☕",
  "Wine Tasting 🍷", "Photography 📸", "Cooking 🍳", "Pets 🐕"
];

const AGES = Array.from({ length: 103 }, (_, i) => i + 18); // 18 to 120

export default function ProfileSetupScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setCoupleProfile = useAuthStore((s) => s.setCoupleProfile);

  const [step, setStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);

  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);

  const [errorMsg, setErrorMsg] = useState("");

  // Fields
  const [name, setName] = useState("");
  const [age, setAge] = useState<number>(18);
  const [avatarA, setAvatarA] = useState<string | null>(null);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [partnerName, setPartnerName] = useState("");
  const [partnerAge, setPartnerAge] = useState<number>(18);

  // Avatar picker modal state
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);

  const inputStyle = (hasError: boolean) => ({
    backgroundColor: theme.input.bg,
    borderWidth: 1,
    borderColor: hasError ? theme.error : theme.input.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: theme.card.text,
    fontSize: 16,
  });

  const labelStyle = {
    color: theme.card.subtext,
    fontSize: 14,
    fontWeight: "600" as const,
    marginBottom: 4,
    marginLeft: 4,
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarA(result.assets[0].uri);
      setAvatarPickerVisible(false);
    }
  };

  const selectPreset = (url: string) => {
    setAvatarA(url);
    setAvatarPickerVisible(false);
  };

  const toggleChip = (chip: string) => {
    if (selectedChips.includes(chip)) {
      setSelectedChips(selectedChips.filter(c => c !== chip));
    } else {
      setSelectedChips([...selectedChips, chip]);
    }
  };

  const handleNext = () => {
    setErrorMsg("");
    if (step === 1) {
      if (!name.trim()) return setErrorMsg("Please enter your name");
      setStep(2);
    } else if (step === 2) {
      if (age < 18) return setErrorMsg("You must be at least 18");
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      setStep(5);
    }
  };

  const handleSubmit = async () => {
    setErrorMsg("");
    if (!partnerName.trim()) return setErrorMsg("Please enter your partner's name");
    if (partnerAge < 18) return setErrorMsg("Partner must be at least 18");

    if (!user || !user.email) {
      return setErrorMsg("You must be logged in to complete setup");
    }

    setIsLoading(true);

    try {
      const BASE_URL = env.EXPO_PUBLIC_API_URL;
      const formData = new FormData();
      
      formData.append("partnerAUid", user.email);
      // partnerBUid is null since we removed email from setup
      
      formData.append("partnerAName", name.trim());
      formData.append("partnerAAge", age.toString());
      
      formData.append("partnerBName", partnerName.trim());
      formData.append("partnerBAge", partnerAge.toString());

      const prefsStr = selectedChips.join(", ");
      if (prefsStr) formData.append("whatALikes", prefsStr);

      if (avatarA) {
        if (avatarA.startsWith("/uploads/presets/")) {
          formData.append("partnerAAvatarStr", avatarA);
        } else {
          const ext = avatarA.substring(avatarA.lastIndexOf(".") + 1) || "jpg";
          formData.append("partnerAAvatar", {
            uri: avatarA,
            name: `avatar_A.${ext}`,
            type: `image/${ext}`
          } as any);
        }
      }

      // Create couple profile
      const coupleRes = await apiFetch(`${BASE_URL}/api/couple`, {
        method: "POST",
        body: formData,
      });

      if (!coupleRes.ok) throw new Error("Failed to create couple profile");
      const coupleRecord = await coupleRes.json();

      // Create progress for Partner A
      await apiFetch(`${BASE_URL}/api/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userUid: user.email,
          scratchCount: 0,
          completedCount: 0,
          currentLevel: 1
        })
      });

      setCoupleProfile({
        id: coupleRecord.id,
        partnerAUid: coupleRecord.partnerAUid,
        partnerBUid: coupleRecord.partnerBUid ?? null,
        partnerAName: coupleRecord.partnerAName,
        partnerBName: coupleRecord.partnerBName ?? null,
        partnerAAge: coupleRecord.partnerAAge ?? null,
        partnerBAge: coupleRecord.partnerBAge ?? null,
        partnerAAvatar: coupleRecord.partnerAAvatar ?? null,
        partnerBAvatar: coupleRecord.partnerBAvatar ?? null,
        partnerAGender: coupleRecord.partnerAGender ?? null,
        partnerBGender: coupleRecord.partnerBGender ?? null,
        whatALikes: coupleRecord.whatALikes ?? null,
        whatBLikes: coupleRecord.whatBLikes ?? null,
      });

      router.replace("/(game)");
    } catch (error) {
      console.warn("[ProfileSetupScreen] save failed:", error);
      setErrorMsg("Failed to save profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderAgeList = (selectedAge: number, setAgeValue: (a: number) => void) => (
    <View style={{ height: 250, marginVertical: 20 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 100 }}
        snapToInterval={56}
        decelerationRate="fast"
      >
        {AGES.map((item) => {
          const isSelected = item === selectedAge;
          return (
            <TouchableOpacity
              key={item.toString()}
              onPress={() => setAgeValue(item)}
              activeOpacity={0.7}
              style={{
                height: 56,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{
                fontSize: isSelected ? 32 : 20,
                fontWeight: isSelected ? "800" : "500",
                color: isSelected ? theme.accent : theme.input.placeholder,
                opacity: isSelected ? 1 : 0.5
              }}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {/* Selection overlay */}
      <View style={{
        position: "absolute", top: "50%", left: 0, right: 0,
        height: 56, marginTop: -28,
        borderTopWidth: 2, borderBottomWidth: 2,
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
        pointerEvents: "none"
      }} />
    </View>
  );

  return (
    <LinearGradient colors={theme.background as any} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 40 }} keyboardShouldPersistTaps="handled">
          
          {/* Header & Progress */}
          <View style={{ marginBottom: 32, marginTop: 20 }}>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map((idx) => (
                <View key={idx} style={{
                  flex: 1, height: 6, borderRadius: 3,
                  backgroundColor: step >= idx ? theme.accent : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)")
                }} />
              ))}
            </View>
            <Text style={{ color: theme.card.text, fontSize: 32, fontWeight: "bold", fontFamily: "DynaPuff_700Bold", marginBottom: 8 }}>
              {step === 1 && "What's your name?"}
              {step === 2 && "How old are you?"}
              {step === 3 && "Pick an Avatar"}
              {step === 4 && "Your Interests"}
              {step === 5 && "Your Partner"}
            </Text>
            <Text style={{ color: theme.card.subtext, fontSize: 16 }}>
              {step === 1 && "Let's get to know you first."}
              {step === 2 && "You must be 18 or older to play."}
              {step === 3 && "Show off your personality."}
              {step === 4 && "What do you enjoy doing?"}
              {step === 5 && "Who will you be playing with?"}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            {errorMsg ? (
              <View style={{ backgroundColor: "rgba(239,68,68,0.2)", borderRadius: 16, padding: 12, marginBottom: 24 }}>
                <Text style={{ color: "#fecaca", textAlign: "center", fontSize: 14 }}>{errorMsg}</Text>
              </View>
            ) : null}

            {step === 1 && (
              <View style={{ marginBottom: 24 }}>
                <TextInput
                  style={[inputStyle(false), { fontSize: 24, paddingVertical: 20 }]}
                  placeholder="Your Name"
                  placeholderTextColor={theme.input.placeholder}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoFocus
                />
              </View>
            )}

            {step === 2 && (
              <View style={{ alignItems: "center" }}>
                {renderAgeList(age, setAge)}
              </View>
            )}

            {step === 3 && (
              <View style={{ alignItems: "center", marginVertical: 40 }}>
                <TouchableOpacity onPress={() => setAvatarPickerVisible(true)} activeOpacity={0.8} style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: theme.input.bg, borderWidth: 3, borderColor: theme.input.border, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {avatarA ? (
                    <Image source={PRESET_AVATARS_LOCAL.find(p => p.url === avatarA)?.source || { uri: getAvatarUrl(avatarA) || undefined }} style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <View style={{ alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="camera-outline" size={48} color={theme.input.placeholder} />
                      <Text style={{ fontSize: 14, color: theme.input.placeholder, marginTop: 8, fontWeight: "600" }}>Add Photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {step === 4 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginVertical: 20 }}>
                {PREFERENCE_CHIPS.map(chip => {
                  const selected = selectedChips.includes(chip);
                  return (
                    <TouchableOpacity
                      key={chip}
                      onPress={() => toggleChip(chip)}
                      style={{
                        paddingHorizontal: 20, paddingVertical: 12,
                        borderRadius: 32, borderWidth: 2,
                        backgroundColor: selected ? theme.accent : "transparent",
                        borderColor: selected ? theme.accent : theme.input.border,
                      }}
                    >
                      <Text style={{
                        fontSize: 16, fontWeight: "600",
                        color: selected ? "#fff" : theme.card.text
                      }}>
                        {chip}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {step === 5 && (
              <View style={{ gap: 24 }}>
                <View>
                  <Text style={labelStyle}>Partner's Name</Text>
                  <TextInput
                    style={[inputStyle(false), { fontSize: 20 }]}
                    placeholder="Partner's Name"
                    placeholderTextColor={theme.input.placeholder}
                    value={partnerName}
                    onChangeText={setPartnerName}
                    autoCapitalize="words"
                  />
                </View>
                <View>
                  <Text style={labelStyle}>Partner's Age</Text>
                  {renderAgeList(partnerAge, setPartnerAge)}
                </View>
              </View>
            )}
          </View>

          {/* Navigation Buttons */}
          <View style={{ marginTop: "auto", paddingTop: 20, gap: 16 }}>
            {step < 5 ? (
              <>
                <TouchableOpacity onPress={handleNext} activeOpacity={0.8}>
                  <LinearGradient colors={["#ff2d6b", "#a82dff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 32, paddingVertical: 18, alignItems: "center" }}>
                    <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "bold" }}>Continue</Text>
                  </LinearGradient>
                </TouchableOpacity>
                {(step === 3 || step === 4) && (
                  <TouchableOpacity onPress={handleNext} style={{ alignItems: "center", paddingVertical: 12 }}>
                    <Text style={{ color: theme.card.subtext, fontSize: 16, fontWeight: "600" }}>Skip for now</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <TouchableOpacity onPress={handleSubmit} disabled={isLoading} activeOpacity={0.8}>
                <LinearGradient colors={["#ff2d6b", "#a82dff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 32, paddingVertical: 18, alignItems: "center" }}>
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "bold" }}>Start Playing</Text>}
                </LinearGradient>
              </TouchableOpacity>
            )}
            
            {step > 1 && (
              <TouchableOpacity onPress={() => setStep(s => s - 1)} disabled={isLoading} style={{ alignItems: "center", paddingVertical: 12 }}>
                <Text style={{ color: theme.card.subtext, fontSize: 16, fontWeight: "600" }}>← Back</Text>
              </TouchableOpacity>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Avatar Picker Modal */}
      <Modal visible={avatarPickerVisible} animationType="fade" transparent onRequestClose={() => setAvatarPickerVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 }} onPress={() => setAvatarPickerVisible(false)}>
          <Pressable style={{ width: "100%", backgroundColor: theme.card.bg, borderRadius: 24, padding: 24, alignItems: "center", borderWidth: 1, borderColor: theme.card.border }}>
            <Text style={{ color: theme.card.text, fontSize: 18, fontWeight: "800", fontFamily: "DynaPuff_700Bold", marginBottom: 20 }}>Choose Avatar</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 16, marginBottom: 24 }}>
              {PRESET_AVATARS_LOCAL.map((preset, i) => (
                <Pressable key={i} onPress={() => selectPreset(preset.url)} style={{ width: 64, height: 64, borderRadius: 32, overflow: "hidden", borderWidth: 2, borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }}>
                  <Image source={preset.source} style={{ width: "100%", height: "100%" }} />
                </Pressable>
              ))}
            </View>
            <Pressable onPress={pickImage} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999, backgroundColor: theme.input.bg }}>
              <Ionicons name="image-outline" size={20} color={theme.accent} />
              <Text style={{ color: theme.accent, fontWeight: "700" }}>Upload from Gallery</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

    </LinearGradient>
  );
}
