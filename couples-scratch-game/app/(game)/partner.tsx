import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, Modal, Alert, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";

import { useThemeStore, getTheme } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { useCycleStore } from "@/store/cycleStore";
import { calculateCyclePredictions, generatePredictionCalendarMarks, CyclePredictions } from "@/lib/cycleCalculations";
import { getAvatarUrl } from "@/lib/apiClient";
import { FadingEdgeMask } from "@/components/FadingEdgeMask/FadingEdgeMask";
import { BlurView } from "@/components/CustomBlurView";

const formatDate = (date: Date) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${weekdays[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
};

const formatDateShort = (date: Date) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
};

export default function PartnerScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);

  const coupleProfile = useAuthStore((s) => s.coupleProfile);
  const isPartnerA = useAuthStore((s) => s.isPartnerA);
  
  const cycleConfig = useCycleStore((s) => s.cycleConfig);
  const fetchCycleConfig = useCycleStore((s) => s.fetchCycleConfig);
  const updateCycleConfig = useCycleStore((s) => s.updateCycleConfig);
  const isLoading = useCycleStore((s) => s.isLoading);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [predictions, setPredictions] = useState<CyclePredictions | null>(null);

  // Form State
  const [lastPeriodStart, setLastPeriodStart] = useState("");
  const [lastPeriodEnd, setLastPeriodEnd] = useState("");
  const [cycleLength, setCycleLength] = useState("28");

  useEffect(() => {
    fetchCycleConfig();
  }, [fetchCycleConfig]);

  useEffect(() => {
    if (cycleConfig?.lastPeriodStart) {
      const preds = calculateCyclePredictions(cycleConfig.lastPeriodStart, cycleConfig.averageCycleLength);
      setPredictions(preds);
      setLastPeriodStart(cycleConfig.lastPeriodStart);
      setLastPeriodEnd(cycleConfig.lastPeriodEnd || "");
      setCycleLength(String(cycleConfig.averageCycleLength));
    }
  }, [cycleConfig]);

  const handleSaveConfig = async () => {
    if (!lastPeriodStart) {
      Alert.alert("Error", "Please provide a valid Last Period Start Date (YYYY-MM-DD)");
      return;
    }
    const parsedLength = parseInt(cycleLength, 10);
    if (isNaN(parsedLength) || parsedLength < 20 || parsedLength > 45) {
      Alert.alert("Error", "Cycle length should be between 20 and 45 days.");
      return;
    }

    await updateCycleConfig({
      lastPeriodStart,
      lastPeriodEnd: lastPeriodEnd || null,
      averageCycleLength: parsedLength,
    });
    
    setIsModalOpen(false);
  };

  const handleDayPress = async (day: any) => {
    const dateStr = day.dateString;
    let newStart = lastPeriodStart;
    let newEnd = lastPeriodEnd;

    if (!lastPeriodStart || (lastPeriodStart && lastPeriodEnd)) {
      newStart = dateStr;
      newEnd = "";
      setLastPeriodStart(newStart);
      setLastPeriodEnd(newEnd);
    } else {
      const start = new Date(lastPeriodStart);
      const selected = new Date(dateStr);
      if (selected >= start) {
        newEnd = dateStr;
        setLastPeriodEnd(newEnd);
      } else {
        newStart = dateStr;
        newEnd = "";
        setLastPeriodStart(newStart);
        setLastPeriodEnd(newEnd);
      }
    }

    // Auto-sync
    const parsedLength = parseInt(cycleLength, 10);
    if (!isNaN(parsedLength) && parsedLength >= 20 && parsedLength <= 45) {
      await updateCycleConfig({
        lastPeriodStart: newStart,
        lastPeriodEnd: newEnd || null,
        averageCycleLength: parsedLength,
      });
    }
  };

  const handleCycleLengthChange = async (lenStr: string) => {
    setCycleLength(lenStr);
    const parsedLength = parseInt(lenStr, 10);
    if (lastPeriodStart && !isNaN(parsedLength) && parsedLength >= 20 && parsedLength <= 45) {
      await updateCycleConfig({
        lastPeriodStart,
        lastPeriodEnd: lastPeriodEnd || null,
        averageCycleLength: parsedLength,
      });
    }
  };

  const getMarkedDates = () => {
    const marked: any = {};
    if (lastPeriodStart && !lastPeriodEnd) {
      marked[lastPeriodStart] = { startingDay: true, endingDay: true, color: "#ec4899", textColor: "#fff" };
    } else if (lastPeriodStart && lastPeriodEnd) {
      let curr = new Date(lastPeriodStart);
      const end = new Date(lastPeriodEnd);
      while (curr <= end) {
        const dStr = curr.toISOString().split("T")[0];
        marked[dStr] = {
          startingDay: dStr === lastPeriodStart,
          endingDay: dStr === lastPeriodEnd,
          color: "#ec4899",
          textColor: "#fff"
        };
        curr.setDate(curr.getDate() + 1);
      }
    }
    return marked;
  };

  const CYCLE_LENGTHS = Array.from({ length: 26 }, (_, i) => i + 20); // 20 to 45

  const myPartnerName = isPartnerA ? coupleProfile?.partnerBName : coupleProfile?.partnerAName;
  const myPartnerAge = isPartnerA ? coupleProfile?.partnerBAge : coupleProfile?.partnerAAge;
  const myPartnerGender = isPartnerA ? coupleProfile?.partnerBGender : coupleProfile?.partnerAGender;
  const myPartnerAvatar = isPartnerA ? coupleProfile?.partnerBAvatar : coupleProfile?.partnerAAvatar;
  
  const displayAvatar = myPartnerAvatar ? getAvatarUrl(myPartnerAvatar) : null;
  const displayName = myPartnerName || "Partner";
  const displayAge = myPartnerAge ? `${myPartnerAge} yrs` : "";

  return (
    <LinearGradient colors={theme.background as any} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: insets.top + 20, paddingHorizontal: 22 }}>
        
        {/* Header - Partner Profile */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.glass.bg, borderWidth: 2, borderColor: theme.glass.border, overflow: "hidden", marginRight: 16 }}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="person" size={32} color={theme.card.subtext} />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "DynaPuff_700Bold", fontSize: 24, color: theme.card.text }}>{displayName}</Text>
            {displayAge ? (
              <Text style={{ fontFamily: "Nunito_600SemiBold", fontSize: 14, color: theme.card.subtext, marginTop: 2 }}>
                {myPartnerGender ? `${myPartnerGender.charAt(0).toUpperCase() + myPartnerGender.slice(1)}, ` : ""}{displayAge}
              </Text>
            ) : null}
          </View>
          <Pressable 
            onPress={() => setIsModalOpen(true)}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.glass.bg, borderWidth: 1, borderColor: theme.glass.border, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="settings-outline" size={22} color={theme.card.text} />
          </Pressable>
        </View>

        {/* Content */}
        {!cycleConfig?.lastPeriodStart ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 100 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? "rgba(236,72,153,0.15)" : "rgba(236,72,153,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <Ionicons name="calendar-outline" size={40} color="#ec4899" />
            </View>
            <Text style={{ fontFamily: "DynaPuff_700Bold", fontSize: 20, color: theme.card.text, textAlign: "center", marginBottom: 12 }}>
              Track {displayName}'s Cycle
            </Text>
            <Text style={{ fontFamily: "Nunito_400Regular", fontSize: 16, color: theme.card.subtext, textAlign: "center", marginBottom: 24, paddingHorizontal: 20 }}>
              Configure cycle tracking to predict periods, fertile windows, safe dates, and understand her daily moods.
            </Text>
            <Pressable 
              onPress={() => setIsModalOpen(true)}
              style={{ backgroundColor: "#ec4899", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24, flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Ionicons name="settings" size={18} color="#fff" />
              <Text style={{ fontFamily: "Nunito_700Bold", color: "#fff", fontSize: 16 }}>Configure Cycle</Text>
            </Pressable>
          </View>
        ) : (
          <FadingEdgeMask style={{ flex: 1, paddingBottom: 100 }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
              {predictions && (
                <>
                  <Text style={{ fontFamily: "DynaPuff_600SemiBold", fontSize: 18, color: theme.card.text, marginBottom: 16 }}>
                    Predictions Calendar
                  </Text>
                  
                  {/* Dashboard Visual Calendar */}
                  <View style={{ borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: theme.card.border, marginBottom: 16, backgroundColor: theme.card.bg }}>
                    <Calendar
                      markingType={'period'}
                      markedDates={generatePredictionCalendarMarks(predictions, cycleConfig.averagePeriodLength)}
                      theme={{
                        calendarBackground: "transparent",
                        textSectionTitleColor: theme.card.subtext,
                        dayTextColor: theme.card.text,
                        todayTextColor: "#ec4899",
                        monthTextColor: theme.card.text,
                        arrowColor: "#ec4899",
                        textDayFontFamily: "Nunito_600SemiBold",
                        textMonthFontFamily: "DynaPuff_600SemiBold",
                        textDayHeaderFontFamily: "Nunito_700Bold",
                      }}
                    />
                  </View>

                  <Text style={{ fontFamily: "DynaPuff_600SemiBold", fontSize: 18, color: theme.card.text, marginBottom: 16, marginTop: 8 }}>
                    Insights
                  </Text>
                  
                  {/* Next Period Widget */}
                  <View style={{ backgroundColor: theme.card.bg, borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: theme.card.border }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(239,68,68,0.15)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                        <Ionicons name="water" size={18} color="#ef4444" />
                      </View>
                      <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 16, color: theme.card.text }}>Next Period</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                      <Text style={{ fontFamily: "DynaPuff_700Bold", fontSize: 32, color: "#ef4444" }}>
                        {predictions.daysUntilNextPeriod}
                      </Text>
                      <Text style={{ fontFamily: "Nunito_600SemiBold", fontSize: 16, color: theme.card.subtext }}>
                        days away
                      </Text>
                    </View>
                    <Text style={{ fontFamily: "Nunito_600SemiBold", fontSize: 14, color: theme.card.text, marginTop: 4 }}>
                      Expected: {formatDate(predictions.nextPeriodDate)}
                    </Text>
                  </View>

                  {/* Fertility & Ovulation Widget */}
                  <View style={{ backgroundColor: theme.card.bg, borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: theme.card.border }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(168,85,247,0.15)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                        <MaterialCommunityIcons name="flower" size={20} color="#a855f7" />
                      </View>
                      <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 16, color: theme.card.text }}>Fertility Window</Text>
                    </View>
                    <Text style={{ fontFamily: "Nunito_600SemiBold", fontSize: 15, color: theme.card.text }}>
                      {formatDateShort(predictions.fertileWindowStart)} - {formatDateShort(predictions.fertileWindowEnd)}
                    </Text>
                    <Text style={{ fontFamily: "Nunito_400Regular", fontSize: 14, color: theme.card.subtext, marginTop: 4 }}>
                      Ovulation Day: <Text style={{ fontFamily: "Nunito_700Bold", color: "#a855f7" }}>{formatDateShort(predictions.nextOvulationDate)}</Text>
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", gap: 16, marginBottom: 16 }}>
                    {/* Safe Sex / Pregnancy Risk */}
                    <View style={{ flex: 1, backgroundColor: theme.card.bg, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: theme.card.border }}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                        <Ionicons name="shield-checkmark" size={20} color={predictions.safeSex ? "#22c55e" : theme.card.subtext} style={{ marginRight: 8 }} />
                        <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 15, color: theme.card.text }}>Safe Sex</Text>
                      </View>
                      <Text style={{ fontFamily: "DynaPuff_600SemiBold", fontSize: 18, color: predictions.safeSex ? "#22c55e" : theme.card.subtext }}>
                        {predictions.safeSex ? "Yes" : "No"}
                      </Text>
                    </View>
                    
                    <View style={{ flex: 1, backgroundColor: theme.card.bg, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: theme.card.border }}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                        <MaterialCommunityIcons name="baby-bottle-outline" size={20} color={predictions.pregnancyRisk === "High" ? "#ef4444" : predictions.pregnancyRisk === "Medium" ? "#f59e0b" : "#22c55e"} style={{ marginRight: 8 }} />
                        <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 15, color: theme.card.text }}>Pregnancy</Text>
                      </View>
                      <Text style={{ fontFamily: "DynaPuff_600SemiBold", fontSize: 18, color: predictions.pregnancyRisk === "High" ? "#ef4444" : predictions.pregnancyRisk === "Medium" ? "#f59e0b" : "#22c55e" }}>
                        {predictions.pregnancyRisk} Risk
                      </Text>
                    </View>
                  </View>

                  {/* Moods and Desires Widget */}
                  <View style={{ backgroundColor: theme.card.bg, borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: theme.card.border }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(236,72,153,0.15)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                        <Ionicons name="heart" size={18} color="#ec4899" />
                      </View>
                      <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 16, color: theme.card.text }}>Phase: {predictions.currentPhase}</Text>
                    </View>

                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 14, color: theme.card.subtext, marginBottom: 4 }}>Current Mood</Text>
                      <Text style={{ fontFamily: "Nunito_600SemiBold", fontSize: 15, color: theme.card.text }}>
                        {predictions.partnerMood}
                      </Text>
                    </View>

                    <View>
                      <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 14, color: theme.card.subtext, marginBottom: 4 }}>What She Might Want</Text>
                      <Text style={{ fontFamily: "Nunito_600SemiBold", fontSize: 15, color: theme.card.text }}>
                        {predictions.partnerDesires}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </FadingEdgeMask>
        )}
      </View>

      {/* Configuration Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: insets.bottom + 24, backgroundColor: isDark ? "rgba(30,0,53,0.85)" : "rgba(255,255,255,0.85)", overflow: "hidden" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <Text style={{ fontFamily: "DynaPuff_700Bold", fontSize: 22, color: theme.card.text }}>Cycle Settings</Text>
              <Pressable onPress={() => setIsModalOpen(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.glass.bg, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close" size={20} color={theme.card.text} />
              </Pressable>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 15, color: theme.card.text, marginBottom: 8 }}>Select Period Dates</Text>
              <Text style={{ fontFamily: "Nunito_600SemiBold", fontSize: 13, color: theme.card.subtext, marginBottom: 12 }}>Tap start date, then tap end date.</Text>
              <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: theme.glass.border }}>
                <Calendar
                  onDayPress={handleDayPress}
                  markingType={'period'}
                  markedDates={getMarkedDates()}
                  theme={{
                    calendarBackground: theme.glass.bg,
                    textSectionTitleColor: theme.card.subtext,
                    dayTextColor: theme.card.text,
                    todayTextColor: "#ec4899",
                    selectedDayTextColor: "#ffffff",
                    monthTextColor: theme.card.text,
                    arrowColor: "#ec4899",
                    textDayFontFamily: "Nunito_600SemiBold",
                    textMonthFontFamily: "DynaPuff_600SemiBold",
                    textDayHeaderFontFamily: "Nunito_700Bold",
                  }}
                />
              </View>
            </View>

            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 15, color: theme.card.text, marginBottom: 12 }}>Average Cycle Length (Days)</Text>
              <View style={{ height: 60 }}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={{ paddingHorizontal: 10, alignItems: "center", gap: 10 }}
                >
                  {CYCLE_LENGTHS.map((len) => {
                    const isSelected = String(len) === cycleLength;
                    return (
                      <Pressable 
                        key={len} 
                        onPress={() => handleCycleLengthChange(String(len))}
                        style={{ 
                          width: 50, 
                          height: 50, 
                          borderRadius: 25, 
                          backgroundColor: isSelected ? "#ec4899" : theme.glass.bg, 
                          borderWidth: isSelected ? 0 : 1,
                          borderColor: theme.glass.border,
                          alignItems: "center", 
                          justifyContent: "center" 
                        }}
                      >
                        <Text style={{ color: isSelected ? "#fff" : theme.card.text, fontSize: isSelected ? 20 : 16, fontFamily: "DynaPuff_700Bold" }}>
                          {len}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <Pressable 
              onPress={handleSaveConfig}
              style={{ backgroundColor: "#ec4899", borderRadius: 24, paddingVertical: 16, alignItems: "center" }}
            >
              <Text style={{ fontFamily: "Nunito_700Bold", color: "#fff", fontSize: 18 }}>Save Settings</Text>
            </Pressable>
          </BlurView>
        </BlurView>
      </Modal>
    </LinearGradient>
  );
}
