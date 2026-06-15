import React from "react";
import { View, Text } from "react-native";

export interface PartnerHeaderProps {
  partnerA: { name: string; scratchCount: number } | null;
  partnerB: { name: string; scratchCount: number } | null;
}

/**
 * Shows both partners' names and scratch counts side by side with a divider.
 * If Partner B is null, shows a placeholder indicating they haven't joined yet.
 */
export function PartnerHeader({ partnerA, partnerB }: PartnerHeaderProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
        borderRadius: 24,
        padding: 24,
      }}
    >
      {/* Partner A */}
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text
          style={{ color: "#ffffff", fontSize: 16, fontWeight: "bold" }}
          numberOfLines={1}
        >
          {partnerA?.name ?? "Partner A"}
        </Text>
        <Text
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: 14,
            marginTop: 4,
          }}
        >
          {partnerA?.scratchCount ?? 0} scratches
        </Text>
      </View>

      {/* Divider */}
      <View
        style={{
          width: 1,
          height: 40,
          backgroundColor: "rgba(255,255,255,0.3)",
          marginHorizontal: 12,
        }}
      />

      {/* Partner B */}
      <View style={{ flex: 1, alignItems: "center" }}>
        {partnerB ? (
          <>
            <Text
              style={{ color: "#ffffff", fontSize: 16, fontWeight: "bold" }}
              numberOfLines={1}
            >
              {partnerB.name}
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: 14,
                marginTop: 4,
              }}
            >
              {partnerB.scratchCount} scratches
            </Text>
          </>
        ) : (
          <>
            <Text
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 16,
                fontWeight: "bold",
              }}
            >
              Partner B
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              Hasn't joined yet
            </Text>
          </>
        )}
      </View>
    </View>
  );
}
