import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Calendar } from "react-native-calendars";

import { useThemeStore, getTheme } from "@/store/themeStore";
import { useCycleStore } from "@/store/cycleStore";
import { calculateCyclePredictions, generatePredictionCalendarMarks } from "@/lib/cycleCalculations";
import { FadingEdgeMask } from "@/components/FadingEdgeMask/FadingEdgeMask";

export default function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);
  const cycleConfig = useCycleStore((s) => s.cycleConfig);

  const predictions = useMemo(() => {
    if (cycleConfig?.lastPeriodStart) {
      return calculateCyclePredictions(cycleConfig.lastPeriodStart, cycleConfig.averageCycleLength);
    }
    return null;
  }, [cycleConfig]);

  const markedDates = useMemo(() => {
    return generatePredictionCalendarMarks(
      cycleConfig?.lastPeriodStart || null,
      cycleConfig?.averageCycleLength || 28,
      cycleConfig?.averagePeriodLength || 5
    );
  }, [cycleConfig]);

  return (
    <LinearGradient colors={theme.background as any} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: insets.top + 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16, paddingHorizontal: 22 }}>
          <Pressable 
            onPress={() => router.back()}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.glass.bg, borderWidth: 1, borderColor: theme.glass.border, alignItems: "center", justifyContent: "center", marginRight: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.card.text} />
          </Pressable>
          <Text style={{ fontFamily: "DynaPuff_700Bold", fontSize: 24, color: theme.card.text }}>Cycle Calendar</Text>
        </View>

        <FadingEdgeMask style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingHorizontal: 22 }}>
          
          <LinearGradient
            colors={isDark ? [theme.card.bg as string, theme.card.bg as string] : ["#fdf2f8", "#ffffff"]}
            style={{ borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: theme.card.border, marginBottom: 24, shadowColor: isDark ? "transparent" : theme.accent, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.05, shadowRadius: 8, elevation: isDark ? 0 : 2 }}
          >
            <Calendar
              markingType={'period'}
              markedDates={markedDates}
              monthFormat={'MMMM yyyy'}
              hideExtraDays={true}
              theme={{
                calendarBackground: "transparent",
                textSectionTitleColor: theme.card.subtext,
                dayTextColor: theme.card.text,
                todayTextColor: theme.accent,
                selectedDayTextColor: "#ffffff",
                monthTextColor: theme.card.text,
                arrowColor: theme.accent,
                textDayFontFamily: "Nunito_700Bold",
                textMonthFontFamily: "DynaPuff_700Bold",
                textDayHeaderFontFamily: "Nunito_700Bold",
              }}
              dayComponent={({ date, state, marking }: any) => {
                const isSelected = !!marking?.color;
                const isHeavyFlow = marking?.flowType === "heavy";
                const isLightFlow = marking?.flowType === "light";
                const isPeriod = isHeavyFlow || isLightFlow;
                const isOvulation = marking?.color === "#9333ea";
                const isFertile = marking?.color === "#d8b4fe";
                const isDisabled = state === 'disabled';

                let bgColor = "transparent";
                let textColor = isDisabled ? "rgba(156,163,175,0.5)" : theme.card.text;

                if (isSelected) {
                  bgColor = marking.color;
                  textColor = marking.textColor;
                }

                if (state === 'today' && !isSelected) {
                  textColor = "#be185d";
                }

                return (
                  <View style={{ 
                    height: 44, 
                    width: 44, 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: bgColor,
                    borderRadius: 16,
                  }}>
                    {isPeriod && <Ionicons name="water" size={12} color={textColor} style={{ marginBottom: 0 }} />}
                    {isOvulation && <Ionicons name="flower" size={14} color={textColor} style={{ marginBottom: 0 }} />}
                    {isFertile && <Ionicons name="flower-outline" size={12} color={textColor} style={{ marginBottom: 0 }} />}
                    
                    <Text style={{ 
                      fontFamily: "Nunito_700Bold", 
                      fontSize: (isPeriod || isOvulation || isFertile) ? 11 : 14, 
                      color: textColor 
                    }}>
                      {date.day}
                    </Text>
                  </View>
                );
              }}
            />
          </LinearGradient>

          <Text style={{ fontFamily: "DynaPuff_700Bold", fontSize: 18, color: theme.card.text, marginBottom: 16 }}>
            Legend
          </Text>

          <LinearGradient
            colors={isDark ? [theme.card.bg as string, theme.card.bg as string] : ["#faf5ff", "#ffffff"]}
            style={{ borderRadius: 24, padding: 20, borderWidth: 1, borderColor: theme.card.border, shadowColor: isDark ? "transparent" : "#a855f7", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.05, shadowRadius: 8, elevation: isDark ? 0 : 2 }}
          >
            
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#be185d", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                <Ionicons name="water" size={18} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 16, color: theme.card.text }}>Heavy Flow</Text>
                <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 14, color: theme.card.subtext }}>Peak period days predicted based on cycle</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#fbcfe8", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                <Ionicons name="water" size={18} color="#be185d" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 16, color: theme.card.text }}>Light Flow</Text>
                <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 14, color: theme.card.subtext }}>Winding down period days</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(216,180,254,0.3)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                <Ionicons name="flower-outline" size={18} color="#a855f7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 16, color: theme.card.text }}>Fertility Window</Text>
                <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 14, color: theme.card.subtext }}>High chance of conception during this phase</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(147,51,234,0.15)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                <Ionicons name="flower" size={18} color="#9333ea" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 16, color: theme.card.text }}>Ovulation Day</Text>
                <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 14, color: theme.card.subtext }}>Highest chance of conception</Text>
              </View>
            </View>

          </LinearGradient>

        </ScrollView>
        </FadingEdgeMask>
      </View>
    </LinearGradient>
  );
}
