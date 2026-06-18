import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useThemeStore, getTheme } from "@/store/themeStore";
import { FadingEdgeMask } from "@/components/FadingEdgeMask/FadingEdgeMask";

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);

  const mockNotifications = [
    {
      id: "1",
      title: "Fertility Window Starts Tomorrow",
      message: "The highest chance of conception starts tomorrow. Time to get ready!",
      time: "2 hours ago",
      icon: "flower",
      iconColor: "#a855f7",
      bgColor: "rgba(168,85,247,0.15)",
      isNew: true,
    },
    {
      id: "2",
      title: "Period Expected in 3 Days",
      message: "Her cycle is approaching. She might be feeling tired or moody.",
      time: "1 day ago",
      icon: "water",
      iconColor: "#ef4444",
      bgColor: "rgba(239,68,68,0.15)",
      isNew: true,
    },
    {
      id: "3",
      title: "Cycle Configured Successfully",
      message: "Your partner's cycle has been synced and is now tracking.",
      time: "3 days ago",
      icon: "checkmark-circle",
      iconColor: "#22c55e",
      bgColor: "rgba(34,197,94,0.15)",
      isNew: false,
    },
  ];

  return (
    <LinearGradient colors={theme.background as any} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: insets.top + 20, paddingHorizontal: 22 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <Pressable 
            onPress={() => router.back()}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.glass.bg, borderWidth: 1, borderColor: theme.glass.border, alignItems: "center", justifyContent: "center", marginRight: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.card.text} />
          </Pressable>
          <Text style={{ fontFamily: "DynaPuff_700Bold", fontSize: 24, color: theme.card.text }}>Notifications</Text>
        </View>

        <FadingEdgeMask style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
          
          {mockNotifications.map((notif) => (
            <Pressable 
              key={notif.id}
              style={{
                backgroundColor: theme.card.bg,
                borderRadius: 24,
                padding: 20,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: notif.isNew ? notif.iconColor : theme.card.border,
                flexDirection: "row",
                alignItems: "flex-start",
                position: "relative"
              }}
            >
              {notif.isNew && (
                <View style={{ position: "absolute", top: 16, right: 16, width: 8, height: 8, borderRadius: 4, backgroundColor: notif.iconColor }} />
              )}
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: notif.bgColor, alignItems: "center", justifyContent: "center", marginRight: 16 }}>
                {notif.icon === "flower" ? (
                  <MaterialCommunityIcons name="flower" size={24} color={notif.iconColor} />
                ) : (
                  <Ionicons name={notif.icon as any} size={24} color={notif.iconColor} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 16, color: theme.card.text, marginBottom: 4, paddingRight: 16 }}>
                  {notif.title}
                </Text>
                <Text style={{ fontFamily: "Nunito_600SemiBold", fontSize: 14, color: theme.card.subtext, marginBottom: 8, lineHeight: 20 }}>
                  {notif.message}
                </Text>
                <Text style={{ fontFamily: "Nunito_600SemiBold", fontSize: 12, color: theme.card.subtext, opacity: 0.7 }}>
                  {notif.time}
                </Text>
              </View>
            </Pressable>
          ))}

        </ScrollView>
        </FadingEdgeMask>
      </View>
    </LinearGradient>
  );
}
