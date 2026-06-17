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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "@/store/authStore";
import { useHistoryStore } from "@/store/historyStore";
import { useThemeStore, getTheme } from "@/store/themeStore";
import { useScratchHistory } from "@/hooks/useScratchHistory";
import { HistoryEntry, CoupleProfile, Task, ImageTask } from "@/types";
import { FadingEdgeMask } from "@/components/FadingEdgeMask/FadingEdgeMask";

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
    return imageTask ? `Image: ${imageTask.title}` : `Image ${entry.taskId}`;
  }
  if (entry.taskType === "lottery") {
    const parts = entry.taskId.split("_");
    if (parts.length >= 5) {
      return `Lvl ${parts[1]}: ${parts[2]} + ${parts[3]} + ${parts[4]}`;
    }
    return `Heart Draw: ${entry.taskId}`;
  }
  if (entry.taskType === "spin_wheel") {
    return `Fate Wheel: ${entry.taskId}`;
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
      <Pressable onPress={() => setSelectedEntry(item)}>
        <View
          style={{
            backgroundColor: theme.card.bg,
            borderWidth: 1,
            borderColor: theme.card.border,
            borderRadius: 32, overflow: "hidden",
            padding: 16,
            marginBottom: 12,
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
            <Text
              style={{
                color: theme.card.text,
                fontSize: 15,
                fontWeight: "700",
                flex: 1,
                marginRight: 10,
              }}
              numberOfLines={2}
            >
              {label}
            </Text>
            <Ionicons
              name={item.completed ? "heart" : "heart-outline"}
              size={22}
              color={item.completed ? "#ec4899" : theme.card.subtext}
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
            <Text style={{ color: theme.card.subtext, fontSize: 13 }}>
              <Text style={{ fontWeight: "600", color: theme.card.text }}>
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
            <Text style={{ color: theme.card.subtext, fontSize: 13 }}>
              <Text style={{ fontWeight: "600", color: theme.card.text }}>
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
            <Text
              style={{
                color: item.completed ? "#ec4899" : theme.card.subtext,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {item.completed ? "Completed" : "Skipped"}
            </Text>
            <Text style={{ color: theme.card.subtext, fontSize: 12 }}>{dateStr}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderEmptyState = () => (
    <View
      style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80 }}
    >
      <Ionicons name="heart-outline" size={48} color={theme.card.subtext} />
      <Text
        style={{
          color: theme.card.subtext,
          fontSize: 16,
          textAlign: "center",
          marginTop: 16,
        }}
      >
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
                  borderWidth: 1,
                  borderColor: theme.glass.border,
                }}
              >
                <Text style={{ color: theme.card.text, fontSize: 14, fontWeight: "bold", fontFamily: "DynaPuff_700Bold" }}>
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
                    borderWidth: 1,
                    borderColor: theme.glass.border,
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
                      fontWeight: "bold", fontFamily: "DynaPuff_700Bold",
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
                  <Image
                    source={{ uri: `${env.EXPO_PUBLIC_API_URL}${imageTask.imageSource}` }}
                    style={{
                      width: "100%",
                      height: 224,
                      borderRadius: 32, overflow: "hidden",
                      marginBottom: 16,
                    }}
                    resizeMode="cover"
                  />
                  <Text
                    style={{
                      color: theme.card.text,
                      fontSize: 22,
                      fontWeight: "bold", fontFamily: "DynaPuff_700Bold",
                      marginBottom: 12,
                    }}
                  >
                    {imageTask.title}
                  </Text>
                </View>
              )}

              {/* Lottery / Fate Wheel Detail */}
              {(isLottery || isSpinWheel) && (
                <View>
                  <Text
                    style={{
                      color: theme.card.text,
                      fontSize: 22,
                      fontWeight: "bold", fontFamily: "DynaPuff_700Bold",
                      marginBottom: 12,
                    }}
                  >
                    {isLottery ? "Heart Draw Result" : "Fate Wheel Result"}
                  </Text>
                  <Text
                    style={{
                      color: theme.card.subtext,
                      fontSize: 16,
                      lineHeight: 24,
                      marginBottom: 16,
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
                  borderWidth: 1,
                  borderColor: theme.glass.border,
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
                    <Ionicons
                      name={selectedEntry.completed ? "heart" : "heart-outline"}
                      size={18}
                      color={selectedEntry.completed ? "#ec4899" : theme.card.subtext}
                    />
                    <Text style={{ color: theme.card.text, fontSize: 14 }}>
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
                  <Text style={{ color: theme.card.text, fontSize: 14 }}>
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
                  <Text style={{ color: theme.card.text, fontSize: 14 }}>
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
                  <Text style={{ color: theme.card.text, fontSize: 14 }}>{dateStr}</Text>
                </View>

                {selectedEntry.timeTaken != null && selectedEntry.timeTaken > 0 && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: theme.card.subtext, fontSize: 14 }}>
                      Time Taken
                    </Text>
                    <Text style={{ color: theme.card.text, fontSize: 14 }}>
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
                  borderWidth: 1,
                  borderColor: "rgba(239, 68, 68, 0.3)",
                  paddingVertical: 14,
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                <Text style={{ color: "#ef4444", fontSize: 15, fontWeight: "bold", fontFamily: "DynaPuff_700Bold" }}>
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
      <View
        style={{ flex: 1, paddingHorizontal: 22, paddingTop: 56, paddingBottom: 40 }}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 40, height: 40, borderRadius: 32, overflow: "hidden", backgroundColor: theme.glass.bg, borderWidth: 1, borderColor: theme.glass.border, alignItems: "center", justifyContent: "center", marginRight: 14 }}
          >
            <Ionicons name="arrow-back" size={20} color={theme.card.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.card.text, fontSize: 24, fontWeight: "900", fontFamily: "DynaPuff_700Bold" }}>Our History</Text>
            <Text style={{ color: theme.card.subtext, fontSize: 13, marginTop: 1 }}>Your past moments</Text>
          </View>
          <Ionicons name="heart" size={24} color="#ec4899" />
        </View>

        {/* Filter Tabs */}
        <View style={{ marginBottom: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
            {(["all", "romantic", "fun", "playful", "dare", "intimate", "lottery", "spin_wheel"] as const).map(f => {
              const isActive = filter === f;
              const label = f === "all" ? "All" : f === "lottery" ? "Heart Draw" : f === "spin_wheel" ? "Fate Wheel" : f.charAt(0).toUpperCase() + f.slice(1);
              return (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f as any)}
                  style={{
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 32, overflow: "hidden",
                    backgroundColor: isActive ? theme.accent : theme.glass.bg,
                    borderWidth: 1,
                    borderColor: isActive ? theme.accent : theme.glass.border,
                  }}
                >
                  <Text style={{ color: isActive ? "#fff" : theme.card.text, fontWeight: "800" }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Combined history list */}
        <FadingEdgeMask style={{ flex: 1, marginBottom: 16 }}>
          <FlatList
            data={filteredHistory}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderHistoryItem}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={filteredHistory.length === 0 ? { flex: 1 } : { paddingTop: 8, paddingBottom: 16 }}
          />
        </FadingEdgeMask>

        {/* Reset Button */}
        <Pressable
          onPress={handleReset}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginTop: 16,
            borderRadius: 999, overflow: "hidden",
            backgroundColor: theme.glass.bg,
            borderWidth: 1,
            borderColor: theme.glass.border,
            paddingVertical: 16,
          }}
        >
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
          <Text style={{ color: "#ef4444", fontSize: 16, fontWeight: "bold", fontFamily: "DynaPuff_700Bold" }}>
            Reset History
          </Text>
        </Pressable>
      </View>

      {/* Detail Modal */}
      {renderDetailModal()}
    </LinearGradient>
  );
}
