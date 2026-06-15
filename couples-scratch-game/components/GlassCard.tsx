import React from "react";
import { View, ViewStyle } from "react-native";

interface GlassCardProps {
  children: React.ReactNode;
  /** Additional style for the outer wrapper. */
  style?: ViewStyle | ViewStyle[];
}

/**
 * GlassCard — a plain View with semi-transparent background.
 *
 * Previously used expo-blur for a real glass effect, but that doesn't
 * render reliably in Expo Go on all platforms. This simpler version
 * provides a glass-like appearance using inline styles only.
 */
export function GlassCard({ children, style }: GlassCardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: "rgba(255,255,255,0.15)",
          borderRadius: 24,
          padding: 24,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.2)",
        },
        ...(Array.isArray(style) ? style : [style]),
      ]}
    >
      {children}
    </View>
  );
}

export default GlassCard;
