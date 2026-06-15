import React from "react";
import { View, Text } from "react-native";
import { LEVEL_BADGES } from "@/types";

export interface LevelBadgeProps {
  level: number;
}

/**
 * Displays the level emoji and label for the given level.
 * Falls back to the highest defined badge (level 5) for levels above 5.
 */
export function LevelBadge({ level }: LevelBadgeProps) {
  const badge = LEVEL_BADGES[level] ?? LEVEL_BADGES[5];

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
        borderRadius: 999,
        paddingHorizontal: 20,
        paddingVertical: 8,
      }}
    >
      <Text style={{ fontSize: 24, marginRight: 8 }}>{badge.emoji}</Text>
      <View>
        <Text
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: 12,
            fontWeight: "600",
          }}
        >
          Level {level}
        </Text>
        <Text
          style={{
            color: "#ffffff",
            fontSize: 14,
            fontWeight: "bold",
          }}
        >
          {badge.label}
        </Text>
      </View>
    </View>
  );
}
