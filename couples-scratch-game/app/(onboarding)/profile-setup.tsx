import { apiFetch } from "@/lib/apiClient";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { useAuthStore } from "@/store/authStore";
import { useThemeStore, getTheme } from "@/store/themeStore";

const GENDER_OPTIONS = ["male", "female", "non-binary", "other"] as const;
type Gender = (typeof GENDER_OPTIONS)[number];

interface Step1Errors {
  name?: string;
  age?: string;
  gender?: string;
  preferences?: string;
}

interface Step2Errors {
  partnerName?: string;
  partnerEmail?: string;
  general?: string;
}

export function validateStep1(fields: {
  name: string;
  age: string;
  gender: Gender | null;
  preferences: string;
}): { isValid: boolean; errors: Step1Errors } {
  const errors: Step1Errors = {};

  const trimmedName = fields.name.trim();
  if (trimmedName.length === 0) {
    errors.name = "Name is required";
  } else if (trimmedName.length > 50) {
    errors.name = "Name must be 50 characters or less";
  }

  const ageNum = parseInt(fields.age, 10);
  if (!fields.age.trim()) {
    errors.age = "Age is required";
  } else if (isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
    errors.age = "Age must be between 18 and 120";
  }

  if (!fields.gender) {
    errors.gender = "Please select a gender";
  }

  if (fields.preferences.length > 200) {
    errors.preferences = "Preferences must be 200 characters or less";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateStep2(fields: {
  partnerName: string;
  partnerEmail: string;
}): { isValid: boolean; errors: Step2Errors } {
  const errors: Step2Errors = {};

  const trimmedName = fields.partnerName.trim();
  if (trimmedName.length === 0) {
    errors.partnerName = "Partner name is required";
  } else if (trimmedName.length > 50) {
    errors.partnerName = "Partner name must be 50 characters or less";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!fields.partnerEmail.trim()) {
    errors.partnerEmail = "Partner email is required";
  } else if (!emailRegex.test(fields.partnerEmail.trim())) {
    errors.partnerEmail = "Enter a valid email address";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}



export default function ProfileSetupScreen() {
  console.log("[ProfileSetupScreen] mounted");

  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setCoupleProfile = useAuthStore((s) => s.setCoupleProfile);

  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);

  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);

  const inputStyle = (hasError: boolean) => ({
    backgroundColor: theme.input.bg,
    borderWidth: 1,
    borderColor: hasError ? theme.error : theme.input.border,
    borderRadius: 12,
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

  const errorTextStyle = {
    color: theme.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  };

  // Step 1 fields
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [preferences, setPreferences] = useState("");
  const [step1Errors, setStep1Errors] = useState<Step1Errors>({});

  // Step 2 fields
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [step2Errors, setStep2Errors] = useState<Step2Errors>({});

  const handleStep1Submit = () => {
    const { isValid, errors } = validateStep1({ name, age, gender, preferences });

    if (!isValid) {
      setStep1Errors(errors);
      return;
    }

    setStep1Errors({});
    setStep(2);
  };

  const handleStep2Submit = async () => {
    const { isValid, errors } = validateStep2({ partnerName, partnerEmail });

    if (!isValid) {
      setStep2Errors(errors);
      return;
    }

    if (!user || !user.email) {
      setStep2Errors({ general: "You must be logged in with an email to complete setup" });
      return;
    }

    setStep2Errors({});
    setIsLoading(true);

    try {
      const ageNum = parseInt(age, 10);
      const userEmail = user.email;
      const pEmail = partnerEmail.trim().toLowerCase();

      const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

      // Create couple profile via API
      const coupleRes = await apiFetch(`${BASE_URL}/api/couple`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerAUid: userEmail,
          partnerBUid: pEmail,
          partnerAName: name.trim(),
          partnerAAge: ageNum,
          partnerAGender: gender,
          whatALikes: preferences.trim() || null,
          partnerBName: partnerName.trim()
        })
      });

      if (!coupleRes.ok) throw new Error("Failed to create couple profile");
      const coupleRecord = await coupleRes.json();

      // Create progress for Partner A
      await apiFetch(`${BASE_URL}/api/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userUid: userEmail,
          scratchCount: 0,
          completedCount: 0,
          currentLevel: 1
        })
      });

      // Create progress for Partner B
      await apiFetch(`${BASE_URL}/api/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userUid: pEmail,
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
        partnerAGender: coupleRecord.partnerAGender ?? null,
        partnerBGender: coupleRecord.partnerBGender ?? null,
        whatALikes: coupleRecord.whatALikes ?? null,
        whatBLikes: coupleRecord.whatBLikes ?? null,
      });

      router.replace("/(game)");
    } catch (error) {
      console.warn("[ProfileSetupScreen] save failed:", error);
      setStep2Errors({ general: "Failed to save profile. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={theme.background as any}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 32,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <Text
              style={{
                color: theme.card.text,
                fontSize: 32,
                fontWeight: "bold",
                marginBottom: 8,
                fontFamily: "DynaPuff_700Bold",
              }}
            >
              {step === 1 ? "About You" : "Your Partner"}
            </Text>
            <Text style={{ color: theme.card.subtext, fontSize: 14 }}>
              {step === 1
                ? "Tell us a bit about yourself"
                : "Tell us about your partner"}
            </Text>
            {/* Step indicator */}
            <View style={{ flexDirection: "row", marginTop: 16, gap: 8 }}>
              <View
                style={{
                  height: 8,
                  width: 32,
                  borderRadius: 999,
                  backgroundColor: step === 1 ? theme.accent : (isDark ? "rgba(255,255,255,0.4)" : "rgba(168,85,247,0.3)"),
                }}
              />
              <View
                style={{
                  height: 8,
                  width: 32,
                  borderRadius: 999,
                  backgroundColor: step === 2 ? theme.accent : (isDark ? "rgba(255,255,255,0.4)" : "rgba(168,85,247,0.3)"),
                }}
              />
            </View>
          </View>

          <View
            style={{
              backgroundColor: theme.card.bg,
              borderRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: theme.card.border,
            }}
          >
            {step === 1 ? (
              <>
                {/* Name */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={labelStyle}>Your Name</Text>
                  <TextInput
                    style={inputStyle(!!step1Errors.name)}
                    placeholder="Enter your name"
                    placeholderTextColor={theme.input.placeholder}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    maxLength={50}
                  />
                  {step1Errors.name && (
                    <Text style={errorTextStyle}>{step1Errors.name}</Text>
                  )}
                </View>

                {/* Age */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={labelStyle}>Age</Text>
                  <TextInput
                    style={inputStyle(!!step1Errors.age)}
                    placeholder="Your age"
                    placeholderTextColor={theme.input.placeholder}
                    value={age}
                    onChangeText={setAge}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                  {step1Errors.age && (
                    <Text style={errorTextStyle}>{step1Errors.age}</Text>
                  )}
                </View>

                {/* Gender */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={labelStyle}>Gender</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {GENDER_OPTIONS.map((option) => {
                      const selected = gender === option;
                      return (
                        <TouchableOpacity
                          key={option}
                          onPress={() => setGender(option)}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 12,
                            borderWidth: 1,
                            backgroundColor: selected
                              ? theme.accent
                              : theme.input.bg,
                            borderColor: selected
                              ? theme.accent
                              : theme.input.border,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              textTransform: "capitalize",
                              color: selected ? "#ffffff" : theme.card.text,
                            }}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {step1Errors.gender && (
                    <Text style={errorTextStyle}>{step1Errors.gender}</Text>
                  )}
                </View>

                {/* Preferences */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={labelStyle}>Preferences (optional)</Text>
                  <TextInput
                    style={[
                      inputStyle(!!step1Errors.preferences),
                      { textAlignVertical: "top", minHeight: 80 },
                    ]}
                    placeholder="What do you enjoy together?"
                    placeholderTextColor={theme.input.placeholder}
                    value={preferences}
                    onChangeText={setPreferences}
                    multiline
                    numberOfLines={3}
                    maxLength={200}
                  />
                  {step1Errors.preferences && (
                    <Text style={errorTextStyle}>{step1Errors.preferences}</Text>
                  )}
                  <Text
                    style={{
                      color: theme.card.subtext,
                      fontSize: 12,
                      marginTop: 4,
                      marginLeft: 4,
                    }}
                  >
                    {preferences.length}/200
                  </Text>
                </View>

                {/* Next */}
                <TouchableOpacity onPress={handleStep1Submit} activeOpacity={0.8}>
                  <LinearGradient
                    colors={["#ff2d6b", "#a82dff"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      borderRadius: 12,
                      paddingVertical: 16,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#ffffff",
                        fontSize: 18,
                        fontWeight: "bold",
                      }}
                    >
                      Next
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {step2Errors.general && (
                  <View
                    style={{
                      backgroundColor: "rgba(239,68,68,0.2)",
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 16,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fecaca",
                        textAlign: "center",
                        fontSize: 14,
                      }}
                    >
                      {step2Errors.general}
                    </Text>
                  </View>
                )}

                {/* Partner Name */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={labelStyle}>Partner's Name</Text>
                  <TextInput
                    style={inputStyle(!!step2Errors.partnerName)}
                    placeholder="Enter your partner's name"
                    placeholderTextColor={theme.input.placeholder}
                    value={partnerName}
                    onChangeText={setPartnerName}
                    autoCapitalize="words"
                    maxLength={50}
                  />
                  {step2Errors.partnerName && (
                    <Text style={errorTextStyle}>{step2Errors.partnerName}</Text>
                  )}
                </View>

                {/* Partner Email */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={labelStyle}>Partner's Email</Text>
                  <TextInput
                    style={inputStyle(!!step2Errors.partnerEmail)}
                    placeholder="Enter your partner's email"
                    placeholderTextColor={theme.input.placeholder}
                    value={partnerEmail}
                    onChangeText={setPartnerEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {step2Errors.partnerEmail && (
                    <Text style={errorTextStyle}>{step2Errors.partnerEmail}</Text>
                  )}
                </View>

                <View style={{ gap: 12 }}>
                  {/* Start Playing */}
                  <TouchableOpacity
                    onPress={handleStep2Submit}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={["#ff2d6b", "#a82dff"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        borderRadius: 12,
                        paddingVertical: 16,
                        alignItems: "center",
                      }}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text
                          style={{
                            color: "#ffffff",
                            fontSize: 18,
                            fontWeight: "bold",
                          }}
                        >
                          Start Playing
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Back */}
                  <TouchableOpacity
                    onPress={() => {
                      setStep2Errors({});
                      setStep(1);
                    }}
                    disabled={isLoading}
                    activeOpacity={0.8}
                    style={{ paddingVertical: 12, alignItems: "center" }}
                  >
                    <Text
                      style={{
                        color: theme.card.subtext,
                        fontSize: 16,
                        fontWeight: "600",
                      }}
                    >
                      ← Back
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
