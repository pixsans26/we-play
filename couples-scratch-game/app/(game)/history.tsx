import React, { useEffect, useCallback, useState } from "react";
import { env } from "@/lib/env";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Alert,
  Modal,
  Image,
  ScrollView,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "@/store/authStore";
import { useHistoryStore } from "@/store/historyStore";
import { useThemeStore, getTheme } from "@/store/themeStore";
import { useScratchHistory } from "@/hooks/useScratchHistory";
import { HistoryEntry, CoupleProfile, Task, ImageTask } from "@/types";
import { getImageUrl } from "@/lib/apiClient";
import { FadingEdgeMask } from "@/components/FadingEdgeMask/FadingEdgeMask";
import { BlurView } from "@/components/CustomBlurView";
import MaskedView from "@react-native-masked-view/masked-view";
import { GradientIcon } from "@/components/GradientIcon";
import { GradientText } from "@/components/GradientText";

// ---------------------------------------------------------------------------
// Helpers (outside component for stable references)
// ---------------------------------------------------------------------------

function resolvePartnerName(
  uid: string | null | undefined,
  coupleProfile: CoupleProfile | null
): string {
  if (!uid || !coupleProfile) return "Unknown";
  if (uid === coupleProfile.partnerAUid) return coupleProfile.partnerAName;
  if (uid === coupleProfile.partnerBUid) return coupleProfile.partnerBName ?? "Partner B";
  return "Unknown";
}

import { useGameStore } from "@/store/gameStore";

function getTaskLabel(entry: HistoryEntry): string {
  const store = useGameStore.getState();
  if (entry.taskType === "text") {
    const task = store.textTasks.find((t) => t.id === entry.taskId);
    return task ? task.title : `Task ${entry.taskId}`;
  }
  if (entry.taskType === "image") {
    const imageTask = store.imageTasks.find((t) => t.id === entry.taskId);
    return imageTask ? imageTask.title : `Image ${entry.taskId}`;
  }
  if (entry.taskType === "lottery") {
    const parts = entry.taskId.split("_");
    if (parts.length >= 5) {
      // Format: "word1, word2 and word3" — no + signs
      return `${parts[2]}, ${parts[3]} and ${parts[4]}`;
    }
    return `Heart Draw: ${entry.taskId}`;
  }
  if (entry.taskType === "spin_wheel") {
    return entry.taskId.replace(/_/g, " ");
  }
  return `Task ${entry.taskId}`;
}

function formatDateTime(date: Date): string {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${month}/${day}/${year} ${hours}:${minutes}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HistoryScreen() {
  const router = useRouter();
  const coupleProfile = useAuthStore((s) => s.coupleProfile);

  const historyAll = useHistoryStore((s) => s.historyAll);
  const setHistoryAll = useHistoryStore((s) => s.setHistoryAll);

  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);

  const { getAllHistory, resetHistory } = useScratchHistory();

  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [filter, setFilter] = useState<"all" | "scratch" | "lottery" | "spin_wheel">("all");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Load combined history on mount / when coupleProfile changes
  useEffect(() => {
    loadHistory();
  }, [coupleProfile]);

  const loadHistory = useCallback(async () => {
    if (!coupleProfile) return;
    try {
      const partnerBUidFallback = coupleProfile.partnerBUid || `partner_b_pending_${coupleProfile.id || "0"}`;
      const entries = await getAllHistory(
        coupleProfile.partnerAUid,
        partnerBUidFallback
      );
      setHistoryAll(entries);
    } catch {
      // Silently handle DB read errors
    }
  }, [coupleProfile, getAllHistory, setHistoryAll]);

  const handleReset = useCallback(() => {
    if (!coupleProfile) return;

    Alert.alert(
      "Reset History",
      "All scratch history for both partners will be cleared and tasks will repeat. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: async () => {
            try {
              await resetHistory(coupleProfile.partnerAUid);
              const partnerBUidFallback = coupleProfile.partnerBUid || `partner_b_pending_${coupleProfile.id || "0"}`;
              await resetHistory(partnerBUidFallback);
              setHistoryAll([]);
            } catch {
              Alert.alert("Error", "History could not be cleared. Please try again.");
            }
          },
        },
      ]
    );
  }, [coupleProfile, resetHistory, setHistoryAll]);

  const handleDeleteEntry = useCallback(() => {
    if (!selectedEntry || !coupleProfile) return;
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to remove this from history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await resetHistory(selectedEntry.userUid, selectedEntry.id);
              setHistoryAll(historyAll.filter((h: any) => h.id !== selectedEntry.id));
              setSelectedEntry(null);
            } catch {
              Alert.alert("Error", "Could not delete this entry.");
            }
          },
        },
      ]
    );
  }, [selectedEntry, coupleProfile, resetHistory, historyAll, setHistoryAll]);

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderHistoryItem = ({ item }: { item: HistoryEntry }) => {
    const label = getTaskLabel(item);
    const dateStr = formatDateTime(item.scratchedAt);
    const scratcherName = resolvePartnerName(item.userUid, coupleProfile);
    const performerName = resolvePartnerName(item.performerUid, coupleProfile);

    return (
      <Pressable onPress={() => setSelectedEntry(item)} style={{ marginBottom: 12 }}>
        <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={{ borderRadius: 24, overflow: "hidden" }}>
          <LinearGradient
            colors={isDark ? [theme.card.bg as string, theme.card.bg as string] : ["#faf5ff", "#ffffff"]}
            style={{
              borderWidth: isDark ? 0 : 1, borderColor: theme.card.border,
              padding: 16,
              shadowColor: isDark ? "transparent" : "#a855f7",
              shadowOffset: {width: 0, height: 4},
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: isDark ? 0 : 2,
            }}
          >
            {/* Title row with heart status icon */}
            <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <Text style={{ color: theme.card.text, fontSize: 15,  flex: 1, marginRight: 10, fontFamily: "Nunito_700Bold" }}>
              {label}
            </Text>

            <GradientIcon
              name={item.completed ? "heart" : "heart-outline"}
              size={22}
              colors={item.completed ? (theme.accentGradient as any) : undefined}
              color={!item.completed ? (theme.card.subtext as string) : undefined}
            />
          </View>

          {/* Scratcher row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 4,
            }}
          >
            <Text style={{ fontSize: 14 }}>💝</Text>
            <Text style={{ color: theme.card.subtext, fontSize: 13, fontFamily: "Nunito_700Bold" }}>
              <Text style={{  color: theme.card.text }}>
                Scratched by:
              </Text>{" "}
              {scratcherName}
            </Text>
          </View>

          {/* Performer row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 10,
            }}
          >
            <Ionicons name="heart-outline" size={14} color={theme.card.subtext} />
            <Text style={{ color: theme.card.subtext, fontSize: 13, fontFamily: "Nunito_700Bold" }}>
              <Text style={{  color: theme.card.text }}>
                Performer:
              </Text>{" "}
              {performerName}
            </Text>
          </View>

          {/* Date + status row */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              borderTopWidth: 1,
              borderTopColor: theme.card.border,
              paddingTop: 8,
            }}
          >
            <GradientText
              style={{
                fontSize: 12,
                fontWeight: "600",
              }}
              colors={item.completed ? (theme.accentGradient as any) : undefined}
              color={!item.completed ? (theme.card.subtext as string) : undefined}
            >
              {item.completed ? "Completed" : "Skipped"}
            </GradientText>
              <Text style={{ color: theme.card.subtext, fontSize: 12, fontFamily: "Nunito_700Bold" }}>{dateStr}</Text>
            </View>
          </LinearGradient>
        </BlurView>
      </Pressable>
    );
  };

  const renderEmptyState = () => (
    <View
      style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80 }}
    >
      <Ionicons name="heart-outline" size={48} color={theme.card.subtext} />
      <Text style={{ color: theme.card.subtext, fontSize: 16, textAlign: "center", marginTop: 16, fontFamily: "Nunito_700Bold" }}>
        No cards scratched yet
      </Text>
    </View>
  );

  const renderDetailModal = () => {
    if (!selectedEntry) return null;

    const isTextTask = selectedEntry.taskType === "text";
    const isImageTask = selectedEntry.taskType === "image";
    const isLottery = selectedEntry.taskType === "lottery";
    const isSpinWheel = selectedEntry.taskType === "spin_wheel";

    const store = useGameStore.getState();
    const textTask: Task | undefined = isTextTask
      ? store.textTasks.find((t) => t.id === selectedEntry.taskId)
      : undefined;
    const imageTask: ImageTask | undefined = isImageTask
      ? store.imageTasks.find((t) => t.id === selectedEntry.taskId)
      : undefined;

    const dateStr = formatDateTime(selectedEntry.scratchedAt);

    return (
      <Modal
        visible={!!selectedEntry}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedEntry(null)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <LinearGradient
            colors={theme.background as [string, string, ...string[]]}
            locations={[0, 0.5, 1]}
            style={{
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: 1,
              borderColor: theme.card.border,
              maxHeight: "85%",
            }}
          >
            <ScrollView
              style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}
            >
              {/* Close button */}
              <Pressable
                onPress={() => setSelectedEntry(null)}
                style={{
                  alignSelf: "flex-end",
                  marginBottom: 16,
                  backgroundColor: theme.glass.bg,
                  borderRadius: 999, overflow: "hidden",
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderWidth: isDark ? 0 : 1, borderColor: theme.glass.border,
                }}
              >
                <Text style={{ color: theme.card.text, fontSize: 14,  fontFamily: "DynaPuff_700Bold" }}>
                  Close
                </Text>
              </Pressable>

              {/* Task type badge */}
              <View style={{ flexDirection: "row", marginBottom: 16 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: theme.glass.bg,
                    borderRadius: 999, overflow: "hidden",
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderWidth: isDark ? 0 : 1, borderColor: theme.glass.border,
                  }}
                >
                  <Ionicons
                    name={isTextTask ? "document-text-outline" : isImageTask ? "image-outline" : isLottery ? "dice-outline" : "color-filter-outline"}
                    size={14}
                    color={theme.card.subtext}
                  />
                  <Text style={{ color: theme.card.subtext, fontSize: 12 }}>
                    {isTextTask ? "Text Task" : isImageTask ? "Image Task" : isLottery ? "Heart Draw" : "Fate Wheel"}
                  </Text>
                </View>
              </View>

              {/* Text task detail */}
              {isTextTask && textTask && (
                <View>
                  <Text
                    style={{
                      color: theme.card.text,
                      fontSize: 22,
                       fontFamily: "DynaPuff_700Bold",
                      marginBottom: 12,
                    }}
                  >
                    {textTask.title}
                  </Text>
                  <Text
                    style={{
                      color: theme.card.subtext,
                      fontSize: 16,
                      lineHeight: 24,
                      marginBottom: 16,
                    }}
                  >
                    {textTask.description}
                  </Text>
                </View>
              )}

              {/* Image task detail */}
              {isImageTask && imageTask && (
                <View>
                  <Text
                    style={{
                      color: theme.card.text,
                      fontSize: 22,
                       fontFamily: "DynaPuff_700Bold",
                      marginBottom: 12,
                    }}
                  >
                    {imageTask.title}
                  </Text>
                  <View
                    style={{
                      width: "100%",
                      borderRadius: 24,
                      overflow: "hidden",
                      marginBottom: 16,
                      backgroundColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.05)",
                    }}
                  >
                    <Image
                      source={{ uri: getImageUrl(imageTask.imageSource) || "" }}
                      style={{
                        width: "100%",
                        aspectRatio: 4 / 5,
                      }}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              )}

              {/* Lottery / Fate Wheel Detail */}
              {(isLottery || isSpinWheel) && (
                <View style={{ marginBottom: 16 }}>
                  {/* Game type label small above */}
                  <Text
                    style={{
                      color: theme.card.subtext,
                      fontSize: 12,
                      
                      fontFamily: "Nunito_700Bold",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      marginBottom: 6,
                    }}
                  >
                    {isLottery ? "❤️ Heart Draw" : "🎡 Fate Wheel"}
                  </Text>
                  {/* Task combination — big */}
                  <Text
                    style={{
                      color: theme.card.text,
                      fontSize: 22,
                      
                      fontFamily: "DynaPuff_700Bold",
                      lineHeight: 30,
                    }}
                  >
                    {getTaskLabel(selectedEntry)}
                  </Text>
                </View>
              )}

              {/* Fallback if task not found in pool */}
              {isTextTask && !textTask && (
                <Text
                  style={{
                    color: theme.card.subtext,
                    fontSize: 16,
                    marginBottom: 16,
                  }}
                >
                  Task details unavailable (ID: {selectedEntry.taskId})
                </Text>
              )}
              {isImageTask && !imageTask && (
                <Text
                  style={{
                    color: theme.card.subtext,
                    fontSize: 16,
                    marginBottom: 16,
                  }}
                >
                  Image details unavailable (ID: {selectedEntry.taskId})
                </Text>
              )}

              {/* Metadata */}
              <View
                style={{
                  backgroundColor: theme.glass.bg,
                  borderWidth: isDark ? 0 : 1, borderColor: theme.glass.border,
                  borderRadius: 32, overflow: "hidden",
                  padding: 16,
                  marginTop: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: theme.card.subtext, fontSize: 14 }}>
                    Status
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <GradientIcon
                      name={selectedEntry.completed ? "heart" : "heart-outline"}
                      size={18}
                      colors={selectedEntry.completed ? (theme.accentGradient as any) : undefined}
                      color={!selectedEntry.completed ? (theme.card.subtext as string) : undefined}
                    />
                    <Text style={{ color: theme.card.text, fontSize: 14, fontFamily: "Nunito_700Bold" }}>
                      {selectedEntry.completed ? "Completed" : "Skipped"}
                    </Text>
                  </View>
                </View>

                {/* Scratcher in modal */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: theme.card.subtext, fontSize: 14 }}>
                    Scratched by
                  </Text>
                  <Text style={{ color: theme.card.text, fontSize: 14, fontFamily: "Nunito_700Bold" }}>
                    {resolvePartnerName(selectedEntry.userUid, coupleProfile)}
                  </Text>
                </View>

                {/* Performer in modal */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: theme.card.subtext, fontSize: 14 }}>
                    Performer
                  </Text>
                  <Text style={{ color: theme.card.text, fontSize: 14, fontFamily: "Nunito_700Bold" }}>
                    {resolvePartnerName(selectedEntry.performerUid, coupleProfile)}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: theme.card.subtext, fontSize: 14 }}>
                    Date
                  </Text>
                  <Text style={{ color: theme.card.text, fontSize: 14, fontFamily: "Nunito_700Bold" }}>{dateStr}</Text>
                </View>

                {selectedEntry.timeTaken != null && selectedEntry.timeTaken > 0 && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: theme.card.subtext, fontSize: 12, fontFamily: "Nunito_700Bold" }}>
                      Time Taken
                    </Text>
                    <Text style={{ color: theme.card.text, fontSize: 14, fontFamily: "Nunito_700Bold" }}>
                      {Math.floor(selectedEntry.timeTaken / 60)}m{" "}
                      {Math.round(selectedEntry.timeTaken % 60)}s
                    </Text>
                  </View>
                )}
              </View>

              {/* Delete Entry Button */}
              <Pressable
                onPress={handleDeleteEntry}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 24,
                  borderRadius: 999, overflow: "hidden",
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  borderWidth: isDark ? 0 : 1, borderColor: "rgba(239, 68, 68, 0.3)",
                  paddingVertical: 14,
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                <Text style={{ color: "#ef4444", fontSize: 15,  fontFamily: "DynaPuff_700Bold" }}>
                  Delete Entry
                </Text>
              </Pressable>

            </ScrollView>
          </LinearGradient>
        </View>
      </Modal>
    );
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const filteredHistory = historyAll
    .filter(entry => {
      if (filter === "all") return true;
      if (filter === "lottery") return entry.taskType === "lottery";
      if (filter === "spin_wheel") return entry.taskType === "spin_wheel";
      return entry.category === filter;
    })
    .sort((a, b) => new Date(b.scratchedAt).getTime() - new Date(a.scratchedAt).getTime());

  return (
    <LinearGradient
      colors={theme.background as any}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}
    >
      {/* Fixed Blurred Header & Filter Tabs with Fade at Bottom */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
        }}
      >
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <LinearGradient
              colors={["black", "black", "transparent"]}
              locations={[0, 0.75, 1]}
              style={{ flex: 1 }}
            />
          }
        >
          <BlurView
            intensity={80}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark ? "rgba(21, 0, 37, 0.4)" : "rgba(255, 255, 255, 0.4)",
              }
            ]}
          />
        </MaskedView>

        <View style={{ paddingTop: 56, paddingBottom: 20 }}>
          {/* Header Content */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16, paddingHorizontal: 22 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.card.text, fontSize: 24,  fontFamily: "DynaPuff_700Bold" }}>Our History</Text>
              <Text style={{ color: theme.card.subtext, fontSize: 13, marginTop: 1 }}>Your past moments</Text>
            </View>
            <View style={{ position: "relative" }}>
              <Pressable onPress={() => setIsMenuOpen(!isMenuOpen)} style={{ padding: 8 }}>
                <Ionicons name="ellipsis-vertical" size={24} color={theme.card.text} />
              </Pressable>
              {isMenuOpen && (
                <>
                  {/* Backdrop to close menu */}
                  <Pressable onPress={() => setIsMenuOpen(false)} style={{ position: "absolute", top: -100, right: -100, bottom: -1000, left: -1000, zIndex: 9 }} />
                  <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={{ position: "absolute", top: 40, right: 0, backgroundColor: isDark ? "rgba(30,0,53,0.85)" : "rgba(255,255,255,0.85)", borderRadius: 12, padding: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5, minWidth: 150, zIndex: 10, overflow: "hidden" }}>
                    <Pressable onPress={() => { setIsMenuOpen(false); handleReset(); }} style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 8 }}>
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      <Text style={{ color: "#ef4444", fontSize: 14, fontWeight: "bold" }}>Reset History</Text>
                    </Pressable>
                  </BlurView>
                </>
              )}
            </View>
          </View>

          {/* Filter Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 22 }}>
            {(["all", "romantic", "fun", "playful", "dare", "intimate", "lottery", "spin_wheel"] as const).map(f => {
              const isActive = filter === f;
              const label = f === "all" ? "All" : f === "lottery" ? "Heart Draw" : f === "spin_wheel" ? "Fate Wheel" : f.charAt(0).toUpperCase() + f.slice(1);
              return (
                  <Pressable
                    key={f}
                    onPress={() => setFilter(f as any)}
                    style={{
                      borderRadius: 32, overflow: "hidden",
                      backgroundColor: theme.glass.bg,
                      borderWidth: isActive ? 0 : 1,
                      borderColor: isActive ? "transparent" : theme.glass.border,
                      margin: isActive ? 1 : 0 // Prevent size jump from missing border
                    }}
                  >
                    {isActive ? (
                      <LinearGradient
                        colors={theme.accentGradient as any}
                        start={{x:0, y:0}} end={{x:1, y:1}}
                        style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 32 }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "800" }}>{label}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={{ paddingHorizontal: 18, paddingVertical: 10 }}>
                        <Text style={{ color: theme.card.text, fontWeight: "800" }}>{label}</Text>
                      </View>
                    )}
                  </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <View style={{ flex: 1, paddingBottom: 40 }}>
        {/* Combined history list */}
        <FadingEdgeMask style={{ flex: 1, marginBottom: 16 }}>
          <FlatList
            data={filteredHistory}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderHistoryItem}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={
              filteredHistory.length === 0
                ? { flex: 1, paddingHorizontal: 22, paddingTop: 190 }
                : { paddingTop: 190, paddingBottom: 110, paddingHorizontal: 22 }
            }
          />
        </FadingEdgeMask>
      </View>

      {/* Detail Modal */}
      {renderDetailModal()}
    </LinearGradient>
  );
}
