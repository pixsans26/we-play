import { env } from "@/lib/env";
import { apiFetch, getAvatarUrl, getAvatarSource } from "@/lib/apiClient";
import { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Image, Modal, Pressable,
  Animated
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Asset } from "expo-asset";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "@/store/authStore";
import { useThemeStore, getTheme } from "@/store/themeStore";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const AGES = Array.from({ length: 103 }, (_, i) => i + 18); // 18 to 120

const AgeWheelPicker = ({ selectedAge, setAgeValue, theme, isDark }: { selectedAge: number, setAgeValue: (a: number) => void, theme: any, isDark: boolean }) => {
  const scrollY = useRef(new Animated.Value((selectedAge - 18) * 56)).current;

  return (
    <View style={{ width: "50%", height: 250, marginVertical: 20 }}>
      {/* Selection overlay */}
      <View style={{
        position: "absolute", top: "50%", left: 0, right: 0,
        height: 56, marginTop: -28,
        borderTopWidth: 2, borderBottomWidth: 2,
        borderColor: theme.accent,
        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
        borderRadius: 16,
        pointerEvents: "none"
      }} />
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 97 }}
        snapToInterval={56}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: (selectedAge - 18) * 56 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        onScrollEndDrag={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          const index = Math.max(0, Math.min(AGES.length - 1, Math.round(y / 56)));
          if (AGES[index]) setAgeValue(AGES[index]);
        }}
        onMomentumScrollEnd={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          const index = Math.max(0, Math.min(AGES.length - 1, Math.round(y / 56)));
          if (AGES[index]) setAgeValue(AGES[index]);
        }}
      >
        {AGES.map((item, index) => {
          const inputRange = [
            (index - 2) * 56,
            (index - 1) * 56,
            index * 56,
            (index + 1) * 56,
            (index + 2) * 56
          ];

          const scale = scrollY.interpolate({
            inputRange,
            outputRange: [0.6, 0.8, 1.25, 0.8, 0.6],
            extrapolate: 'clamp'
          });

          const opacity = scrollY.interpolate({
            inputRange,
            outputRange: [0.1, 0.3, 1, 0.3, 0.1],
            extrapolate: 'clamp'
          });

          return (
            <Animated.View
              key={item.toString()}
              style={{
                height: 56,
                justifyContent: "center",
                alignItems: "center",
                transform: [{ scale }],
                opacity
              }}
            >
              <Text style={{
                fontSize: 28,
                color: item === selectedAge ? theme.accent : theme.text,
                fontWeight: "900",
                fontFamily: "DynaPuff_700Bold",
              }}>{item}</Text>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
};

const GenderSelector = ({ value, onChange, theme }: { value: string, onChange: (v: string) => void, theme: any }) => (
  <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
    {["Male", "Female", "Other"].map(g => (
      <TouchableOpacity
        key={g}
        onPress={() => onChange(g)}
        activeOpacity={0.8}
        style={{
          flex: 1,
          paddingVertical: 14,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: value === g ? theme.accent : theme.input.border,
          backgroundColor: value === g ? theme.accent : theme.input.bg,
          alignItems: "center"
        }}
      >
        <Text style={{
          color: value === g ? "#fff" : theme.input.text,
          fontWeight: "800",
          fontFamily: "DynaPuff_700Bold",
        }}>{g}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const PRESET_AVATARS_LOCAL = [
  { url: "/uploads/presets/avatar_boy.png", source: require("@/assets/images/avatars/avatar_boy.jpg") },
  { url: "/uploads/presets/avatar_girl.png", source: require("@/assets/images/avatars/avatar_girl.jpg") },
  { url: "/uploads/presets/avatar_cat.png", source: require("@/assets/images/avatars/avatar_cat.jpg") },
  { url: "/uploads/presets/avatar_dog.png", source: require("@/assets/images/avatars/avatar_dog.jpg") },
];

const PREFERENCE_CHIPS = [
  "Romantic Dates", "Spicy Challenges", "Foreplay", "Roleplay", "Deep Conversations",
  "Massage & Spa", "Adventures", "Kinky", "Gentle Romance", "Weekend Getaways",
  "Pillow Talk", "Surprises"
];

export default function ProfileSetupScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setCoupleProfile = useAuthStore((s) => s.setCoupleProfile);

  const [step, setStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<number | null>(null);

  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);

  const [errorMsg, setErrorMsg] = useState("");

  // Fields
  const [name, setName] = useState("");
  const [gender, setGender] = useState<string>("Male");
  const [age, setAge] = useState<number>(18);
  const [avatarA, setAvatarA] = useState<string | null>(null);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [isLinkedOnSignup, setIsLinkedOnSignup] = useState(false);
  const [partnerName, setPartnerName] = useState("");

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
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setErrorMsg("");
    if (!user || !user.uid) {
      return setErrorMsg("You must be logged in to complete setup");
    }
    setIsLoading(true);
    try {
      const BASE_URL = env.EXPO_PUBLIC_API_URL;
      const token = useAuthStore.getState().sessionToken;

      let resolvedAvatar = avatarA;

      if (avatarA && (avatarA.startsWith("file://") || avatarA.startsWith("content://"))) {
        try {
          const dotIndex = avatarA.lastIndexOf(".");
          let ext = dotIndex !== -1 && dotIndex > avatarA.lastIndexOf("/") ? avatarA.substring(dotIndex + 1).toLowerCase() : "jpeg";
          if (ext === "jpg") ext = "jpeg";

          const uploadData = new FormData();
          uploadData.append("file", {
            uri: Platform.OS === "ios" && avatarA.startsWith("file://") ? avatarA.replace("file://", "") : avatarA,
            name: `avatar.${ext}`,
            type: `image/${ext}`
          } as any);

          const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`
            },
            body: uploadData
          });

          if (uploadRes.ok) {
            const uploadResult = await uploadRes.json();
            resolvedAvatar = uploadResult.url;
          } else {
            console.warn("Failed to upload avatar image to /api/upload:", await uploadRes.text());
          }
        } catch (e) {
          console.warn("Error uploading avatar image during onboarding:", e);
        }
      }

      // Step 1: Save own profile to appUsers
      await fetch(`${BASE_URL}/api/user/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          name: name.trim(),
          age,
          gender,
          avatar: resolvedAvatar || undefined,
          whatLikes: selectedChips.join(", ") || undefined,
        }),
      });

      if (inviteCodeInput.trim()) {
        const trimmed = inviteCodeInput.trim().toUpperCase();
        const joinRes = await fetch(`${BASE_URL}/api/couple/invite/join`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ uid: user.uid, inviteCode: trimmed }),
        });

        if (!joinRes.ok) {
          const data = await joinRes.json();
          throw new Error(data.error || "Failed to join couple with that code");
        }

        const coupleRecord = await joinRes.json();
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
          status: coupleRecord.status ?? null,
          inviteCode: coupleRecord.inviteCode ?? null,
        });

        useAuthStore.getState().setIsPartnerA(false); // They are Partner B!
        setIsLinkedOnSignup(true);
        setPartnerName(coupleRecord.partnerAName || "your partner");
        setStep(5); // Show success screen (Step 5 dynamic check)
        return;
      }

      // Step 2: Create couple record
      const formData = new FormData();
      formData.append("partnerAUid", user.uid);
      formData.append("partnerAName", name.trim());
      formData.append("partnerAAge", age.toString());
      formData.append("partnerAGender", gender);
      if (selectedChips.length) formData.append("whatALikes", selectedChips.join(", "));
      if (resolvedAvatar) formData.append("partnerAAvatar", resolvedAvatar);

      const coupleRes = await apiFetch(`${BASE_URL}/api/couple`, {
        method: "POST",
        body: formData,
      });
      if (!coupleRes.ok) throw new Error("Failed to create couple profile");
      const coupleRecord = await coupleRes.json();

      // Step 3: Create progress for self
      await apiFetch(`${BASE_URL}/api/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userUid: user.uid, scratchCount: 0, completedCount: 0, currentLevel: 1 })
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
        status: coupleRecord.status ?? null,
        inviteCode: coupleRecord.inviteCode ?? null,
      });

      setInviteCode(coupleRecord.inviteCode || null);
      setCoupleId(coupleRecord.id);
      setStep(5); // Show invite code screen
    } catch (error) {
      console.warn("[ProfileSetupScreen] save failed:", error);
      setErrorMsg("Failed to save profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={theme.background as any} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 40 }} keyboardShouldPersistTaps="handled">

          {/* Header & Progress */}
          <View style={{ marginBottom: 32, marginTop: 20 }}>
            {/* Top Back/SignOut Row */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => {
                  if (step > 1) setStep(s => s - 1);
                  else router.back();
                }}
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                  alignItems: "center", justifyContent: "center",
                  marginLeft: -8
                }}
              >
                <Ionicons name="arrow-back" size={24} color={theme.card.text} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  try {
                    await signOut(auth);
                    setCoupleProfile(null);
                  } catch (e) {
                    console.error("Sign out failed", e);
                  }
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 20,
                  backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)",
                }}
              >
                <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                <Text style={{ color: "#ef4444", fontWeight: "700", fontSize: 13 }}>Sign Out</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
              {[1, 2, 3, 4].map((idx) => (
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
              {step === 5 && (isLinkedOnSignup ? "Profile Ready! 💖" : "Invite Your Partner 💌")}
            </Text>
            <Text style={{ color: theme.card.subtext, fontSize: 16 }}>
              {step === 1 && "Let's get to know you first."}
              {step === 2 && "You must be 18 or older to play."}
              {step === 3 && "Show off your personality."}
              {step === 4 && "What do you enjoy doing?"}
              {step === 5 && (isLinkedOnSignup ? "Everything is set up." : "Share this code with your partner!")}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            {errorMsg ? (
              <View style={{ backgroundColor: "rgba(239,68,68,0.2)", borderRadius: 16, padding: 12, marginBottom: 24 }}>
                <Text style={{ color: "#fecaca", textAlign: "center", fontSize: 14 }}>{errorMsg}</Text>
              </View>
            ) : null}

            {step === 1 && (
              <View style={{ marginBottom: 24, gap: 24 }}>
                <View>
                  <Text style={labelStyle}>Your Name</Text>
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
                <View>
                  <Text style={labelStyle}>Your Gender</Text>
                  <GenderSelector value={gender} onChange={setGender} theme={theme} />
                </View>
                <View>
                  <Text style={labelStyle}>Partner's Invite Code (Optional)</Text>
                  <TextInput
                    style={[inputStyle(false), { fontSize: 18 }]}
                    placeholder="e.g. XXXXXX"
                    placeholderTextColor={theme.input.placeholder}
                    value={inviteCodeInput}
                    onChangeText={(t) => setInviteCodeInput(t.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={10}
                  />
                </View>
              </View>
            )}

            {step === 2 && (
              <View style={{ alignItems: "center" }}>
                <AgeWheelPicker selectedAge={age} setAgeValue={setAge} theme={theme} isDark={isDark} />
              </View>
            )}

            {step === 3 && (
              <View style={{ alignItems: "center", marginVertical: 40 }}>
                <TouchableOpacity onPress={() => setAvatarPickerVisible(true)} activeOpacity={0.8} style={{ width: 160, height: 160, borderRadius: 80, backgroundColor: theme.input.bg, borderWidth: 3, borderColor: theme.input.border, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {avatarA ? (
                    <Image source={getAvatarSource(avatarA)} style={{ width: "100%", height: "100%", borderRadius: 80 }} resizeMode="cover" />
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
                        backgroundColor: selected ? theme.accent : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)"),
                        borderColor: selected ? theme.accent : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"),
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
              <View style={{ alignItems: "center", paddingVertical: 32, gap: 20 }}>
                {isLinkedOnSignup ? (
                  <>
                    <View style={{
                      width: 100, height: 100, borderRadius: 50,
                      backgroundColor: "rgba(34,197,94,0.15)",
                      alignItems: "center", justifyContent: "center",
                      marginBottom: 16
                    }}>
                      <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
                    </View>
                    <Text style={{ color: theme.card.text, fontSize: 24, fontWeight: "bold", fontFamily: "DynaPuff_700Bold", textAlign: "center" }}>
                      Successfully Linked! 🎉
                    </Text>
                    <Text style={{ color: theme.card.subtext, fontSize: 16, textAlign: "center", fontFamily: "Nunito_600SemiBold", paddingHorizontal: 12 }}>
                      You are now linked with <Text style={{ color: theme.accent, fontWeight: "bold" }}>{partnerName}</Text>. Let's start playing!
                    </Text>
                  </>
                ) : inviteCode ? (
                  <>
                    <Text style={{ color: theme.card.subtext, fontSize: 15, textAlign: "center", fontFamily: "Nunito_600SemiBold" }}>
                      Share this code with your partner so they can join you in the app.
                    </Text>
                    <View style={{
                      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                      borderRadius: 24, borderWidth: 2, borderColor: theme.accent,
                      paddingHorizontal: 40, paddingVertical: 24, alignItems: "center"
                    }}>
                      <Text style={{ color: theme.card.subtext, fontSize: 13, fontFamily: "Nunito_600SemiBold", marginBottom: 8, letterSpacing: 2 }}>INVITE CODE</Text>
                      <Text style={{ color: theme.accent, fontSize: 40, fontFamily: "DynaPuff_700Bold", letterSpacing: 6 }}>{inviteCode}</Text>
                    </View>
                    <Text style={{ color: theme.card.subtext, fontSize: 13, textAlign: "center", fontFamily: "Nunito_400Regular" }}>
                      Your partner can enter this code after signing up to link your accounts.
                    </Text>
                  </>
                ) : (
                  <Text style={{ color: theme.card.subtext, fontSize: 14, textAlign: "center" }}>Generating your invite code...</Text>
                )}
              </View>
            )}
          </View>

          {/* Navigation Buttons */}
          <View style={{ marginTop: "auto", paddingTop: 20, gap: 16 }}>
            {step < 4 ? (
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
            ) : step === 4 ? (
              <TouchableOpacity onPress={handleNext} disabled={isLoading} activeOpacity={0.8}>
                <LinearGradient colors={["#ff2d6b", "#a82dff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 32, paddingVertical: 18, alignItems: "center" }}>
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "bold" }}>Create My Profile</Text>}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              // Step 5: invite code shown — just a "Start Playing" button
              <TouchableOpacity onPress={() => router.replace("/(game)")} activeOpacity={0.8}>
                <LinearGradient colors={["#ff2d6b", "#a82dff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 32, paddingVertical: 18, alignItems: "center" }}>
                  <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "bold" }}>Start Playing 🎉</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Navigation back text below has been replaced by top left back button, so we remove it */}
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
                <Pressable key={i} onPress={() => selectPreset(preset.url)} style={{ width: 80, height: 80, borderRadius: 40, overflow: "hidden", borderWidth: 2, borderColor: theme.accent }}>
                  <Image source={preset.source} style={{ width: "100%", height: "100%", borderRadius: 40 }} resizeMode="cover" />
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
