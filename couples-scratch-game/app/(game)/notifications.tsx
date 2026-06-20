import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useThemeStore, getTheme } from "@/store/themeStore";
import { useNotificationStore } from "@/store/notificationStore";
import { FadingEdgeMask } from "@/components/FadingEdgeMask/FadingEdgeMask";
import { useEffect } from "react";

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);
  
  const notifications = useNotificationStore((s) => s.notifications);
  const removeNotification = useNotificationStore((s) => s.removeNotification);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  useEffect(() => {
    // Clear the unread notification badge and mark all as read when user views this screen
    markAllRead();
  }, [markAllRead]);

  return (
    <LinearGradient colors={theme.background as any} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: insets.top + 20, paddingHorizontal: 22 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable 
              onPress={() => router.back()}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.glass.bg, borderWidth: 1, borderColor: theme.glass.border, alignItems: "center", justifyContent: "center", marginRight: 16 }}
            >
              <Ionicons name="arrow-back" size={24} color={theme.card.text} />
            </Pressable>
            <Text style={{ fontFamily: "DynaPuff_700Bold", fontSize: 24, color: theme.card.text }}>Notifications</Text>
          </View>
          {notifications.length > 0 && (
            <Pressable onPress={clearAll} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }}>
              <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 13, color: theme.card.text }}>Clear All</Text>
            </Pressable>
          )}
        </View>

        <FadingEdgeMask style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
          
          {notifications.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", marginTop: 100 }}>
              <Ionicons name="notifications-off-outline" size={64} color={theme.card.subtext} style={{ opacity: 0.5, marginBottom: 16 }} />
              <Text style={{ fontFamily: "DynaPuff_700Bold", fontSize: 20, color: theme.card.text }}>No Notifications</Text>
              <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 14, color: theme.card.subtext, marginTop: 8, textAlign: "center", paddingHorizontal: 40 }}>You're all caught up! Check back later for updates.</Text>
            </View>
          ) : (
            notifications.map((notif) => (
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
                <Pressable 
                  onPress={() => removeNotification(notif.id)}
                  style={{ position: "absolute", top: 12, right: 12, padding: 8 }}
                >
                  <Ionicons name="close" size={18} color={theme.card.subtext} />
                </Pressable>
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
                <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 14, color: theme.card.subtext, marginBottom: 8, lineHeight: 20 }}>
                  {notif.message}
                </Text>
                <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 12, color: theme.card.subtext, opacity: 0.7 }}>
                  {notif.time}
                </Text>
              </View>
            </Pressable>
          )))}

        </ScrollView>
        </FadingEdgeMask>
      </View>
    </LinearGradient>
  );
}
