import React, { useMemo, useCallback } from "react";
import { View, Text, Pressable, ScrollView, Dimensions, FlatList } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CalendarList, Calendar } from "react-native-calendars";

import { useThemeStore, getTheme } from "@/store/themeStore";
import { useCycleStore } from "@/store/cycleStore";
import { calculateCyclePredictions, generatePredictionCalendarMarks } from "@/lib/cycleCalculations";
import { FadingEdgeMask } from "@/components/FadingEdgeMask/FadingEdgeMask";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import Animated, { FadeInDown } from "react-native-reanimated";

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

  const calendarWidth = useMemo(() => Dimensions.get('window').width - 44, []);

  const months = useMemo(() => {
    const today = new Date();
    today.setDate(1); // Set to 1st to avoid end of month overflow
    const result = [];
    for (let i = -3; i <= 6; i++) {
      const d = new Date(today);
      d.setMonth(d.getMonth() + i);
      result.push(d.toISOString().split("T")[0]);
    }
    return result;
  }, []);

  const calendarTheme = useMemo(() => ({
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
    'stylesheet.calendar.main': {
      container: {
        paddingLeft: 0,
        paddingRight: 0,
        backgroundColor: 'transparent'
      }
    }
  } as any), [theme]);

  const renderDay = useCallback(({ date, state, marking }: any) => {
    const isSelected = !!marking?.color;
    const isHeavyFlow = marking?.flowType === "heavy";
    const isLightFlow = marking?.flowType === "light";
    const isPeriod = isHeavyFlow || isLightFlow;
    const isOvulation = marking?.color === "#9333ea";
    const isFertile = marking?.color === "#d8b4fe" && !isOvulation;
    const isMostDesired = marking?.isMostDesired;
    const isProtectedSafe = marking?.isProtectedSafe;
    const isSafeSex = marking?.isSafeSex;
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

    const isDarkBg = textColor === "#ffffff" || textColor === "#fff";

    return (
      <View style={{ 
        height: 48, 
        width: 44, 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: bgColor,
        borderRadius: 24,
        overflow: 'hidden',
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 16, gap: 2 }}>
          {isPeriod && <Ionicons name="water" size={12} color={textColor} />}
          {isMostDesired && <Ionicons name="flame" size={14} color={isDarkBg ? "#ffffff" : "#ef4444"} />}
          {isOvulation && <Ionicons name="flower" size={14} color={textColor} />}
          {isFertile && <Ionicons name="flower-outline" size={12} color={textColor} />}
          {isProtectedSafe && !isPeriod && <Ionicons name="shield-half" size={12} color={isDarkBg ? "#ffffff" : "#eab308"} />}
          {isSafeSex && !isProtectedSafe && !isPeriod && <Ionicons name="shield-checkmark" size={12} color={isDarkBg ? "#ffffff" : "#22c55e"} />}
        </View>
        
        <Text style={{ 
          fontFamily: "Nunito_700Bold", 
          fontSize: (isPeriod || isOvulation || isFertile || isMostDesired || isProtectedSafe || isSafeSex) ? 12 : 14, 
          color: textColor 
        }}>
          {date.day}
        </Text>
      </View>
    );
  }, [theme]);

  return (
    <View style={{ flex: 1 }}>
      <AnimatedBackground currentPhase={predictions?.currentPhase || "Unconfigured"} isDark={isDark} />
      <View style={{ flex: 1, paddingTop: insets.top + 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16, paddingHorizontal: 22 }}>
          <Pressable 
            onPress={() => router.back()}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.glass.bg, borderWidth: isDark ? 0 : 1, borderColor: theme.glass.border, alignItems: "center", justifyContent: "center", marginRight: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.card.text} />
          </Pressable>
          <Text style={{ fontFamily: "DynaPuff_700Bold", fontSize: 24, color: theme.card.text }}>Cycle Calendar</Text>
        </View>

        <FadingEdgeMask style={{ flex: 1 }}>
          <Animated.ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingHorizontal: 22 }}>
          
          <Animated.View entering={FadeInDown.duration(600).delay(100)} style={{ marginBottom: 24 }}>
            <FlatList
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={3} // Start exactly at the current month
              getItemLayout={(data, index) => ({ length: calendarWidth, offset: calendarWidth * index, index })}
              data={months}
              keyExtractor={item => item}
              renderItem={({ item }) => {
                const itemDate = new Date(item);
                const now = new Date();
                const isCurrentMonth = itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();

                return (
                  <View style={{ width: calendarWidth }}>
                    <Calendar
                      current={item}
                      hideArrows={true}
                      markingType={'period'}
                      markedDates={markedDates}
                      hideExtraDays={true}
                      theme={calendarTheme}
                      dayComponent={renderDay}
                      renderHeader={(date: any) => {
                        const monthYear = date.toString('MMMM yyyy');
                        return (
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: 10 }}>
                            <Text style={{ fontFamily: "DynaPuff_700Bold", fontSize: 18, color: theme.card.text }}>
                              {monthYear}
                            </Text>
                            {isCurrentMonth && (
                              <View style={{ backgroundColor: theme.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 10 }}>
                                <Text style={{ color: "#fff", fontFamily: "Nunito_700Bold", fontSize: 11, textTransform: "uppercase" }}>Current</Text>
                              </View>
                            )}
                          </View>
                        );
                      }}
                    />
                  </View>
                );
              }}
            />
          </Animated.View>

          <Animated.Text entering={FadeInDown.duration(600).delay(500)} style={{ fontFamily: "DynaPuff_700Bold", fontSize: 18, color: theme.card.text, marginBottom: 16 }}>
            Color Guide
          </Animated.Text>

          <Animated.View
            entering={FadeInDown.duration(600).delay(900)}
          >
            <LinearGradient
              colors={isDark ? [theme.card.bg as string, theme.card.bg as string] : ["#faf5ff", "#ffffff"]}
              style={{ borderRadius: 24, padding: 16, borderWidth: isDark ? 0 : 1, borderColor: theme.card.border, shadowColor: isDark ? "transparent" : "#a855f7", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.05, shadowRadius: 8, elevation: isDark ? 0 : 2 }}
            >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              
              <View style={{ width: '48%', flexDirection: "row", alignItems: "flex-start", marginBottom: 16 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#be185d", alignItems: "center", justifyContent: "center", marginRight: 8, marginTop: 2 }}>
                  <Ionicons name="water" size={14} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 13, color: theme.card.text, marginBottom: 2 }}>Heavy Flow</Text>
                  <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 11, color: theme.card.subtext, lineHeight: 14 }}>Peak period</Text>
                </View>
              </View>

              <View style={{ width: '48%', flexDirection: "row", alignItems: "flex-start", marginBottom: 16 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#fbcfe8", alignItems: "center", justifyContent: "center", marginRight: 8, marginTop: 2 }}>
                  <Ionicons name="water" size={14} color="#be185d" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 13, color: theme.card.text, marginBottom: 2 }}>Light Flow</Text>
                  <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 11, color: theme.card.subtext, lineHeight: 14 }}>Winding down</Text>
                </View>
              </View>

              <View style={{ width: '48%', flexDirection: "row", alignItems: "flex-start", marginBottom: 16 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(216,180,254,0.3)", alignItems: "center", justifyContent: "center", marginRight: 8, marginTop: 2 }}>
                  <Ionicons name="flower-outline" size={14} color="#a855f7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 13, color: theme.card.text, marginBottom: 2 }}>Fertility</Text>
                  <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 11, color: theme.card.subtext, lineHeight: 14 }}>High chance</Text>
                </View>
              </View>

              <View style={{ width: '48%', flexDirection: "row", alignItems: "flex-start", marginBottom: 16 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#d8b4fe", alignItems: "center", justifyContent: "center", marginRight: 8, marginTop: 2 }}>
                  <Ionicons name="flower-outline" size={14} color="#6b21a8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 13, color: theme.card.text, marginBottom: 2 }}>Fertile</Text>
                  <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 11, color: theme.card.subtext, lineHeight: 14 }}>High chance</Text>
                </View>
              </View>

              <View style={{ width: '48%', flexDirection: "row", alignItems: "flex-start", marginBottom: 16 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(147,51,234,0.15)", alignItems: "center", justifyContent: "center", marginRight: 8, marginTop: 2 }}>
                  <Ionicons name="flower" size={14} color="#9333ea" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 13, color: theme.card.text, marginBottom: 2 }}>Ovulation</Text>
                  <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 11, color: theme.card.subtext, lineHeight: 14 }}>Highest chance</Text>
                </View>
              </View>

              <View style={{ width: '48%', flexDirection: "row", alignItems: "flex-start", marginBottom: 16 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6", alignItems: "center", justifyContent: "center", marginRight: 8, marginTop: 2 }}>
                  <Ionicons name="flame" size={14} color="#ef4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 13, color: theme.card.text, marginBottom: 2 }}>Desired Sex</Text>
                  <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 11, color: theme.card.subtext, lineHeight: 14 }}>Peak libido</Text>
                </View>
              </View>

              <View style={{ width: '48%', flexDirection: "row", alignItems: "flex-start", marginBottom: 8 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6", alignItems: "center", justifyContent: "center", marginRight: 8, marginTop: 2 }}>
                  <Ionicons name="shield-half" size={14} color="#eab308" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 13, color: theme.card.text, marginBottom: 2 }}>Protected</Text>
                  <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 11, color: theme.card.subtext, lineHeight: 14 }}>Medium risk</Text>
                </View>
              </View>

              <View style={{ width: '48%', flexDirection: "row", alignItems: "flex-start", marginBottom: 8 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6", alignItems: "center", justifyContent: "center", marginRight: 8, marginTop: 2 }}>
                  <Ionicons name="shield-checkmark" size={14} color="#22c55e" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 13, color: theme.card.text, marginBottom: 2 }}>Safe Sex</Text>
                  <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 11, color: theme.card.subtext, lineHeight: 14 }}>Outside fertile</Text>
                </View>
              </View>

            </View>
          </LinearGradient>
          </Animated.View>

          </Animated.ScrollView>
        </FadingEdgeMask>
      </View>
    </View>
  );
}
