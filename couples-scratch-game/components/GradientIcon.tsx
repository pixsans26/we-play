import React from "react";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { useThemeStore, getTheme } from "@/store/themeStore";

interface GradientIconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  colors?: string[];
  color?: string; // Fallback for solid color
  style?: any;
}

export const GradientIcon: React.FC<GradientIconProps> = ({ name, size = 24, colors, color, style }) => {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);

  if (color && !colors) {
     return <Ionicons name={name} size={size} color={color} style={style} />;
  }

  // On Web, react-native-masked-view is unsupported
  if (Platform.OS === "web") {
    const fallbackColor = (colors && colors[0]) || theme.accentGradient[0] || "#f43f5e";
    return <Ionicons name={name} size={size} color={fallbackColor} style={style} />;
  }

  return (
    <MaskedView
      style={[{ width: size, height: size }, style]}
      maskElement={
        <Ionicons
          name={name}
          size={size}
          color="black"
          style={{ backgroundColor: "transparent" }}
        />
      }
    >
      <LinearGradient
        colors={(colors || theme.accentGradient) as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      />
    </MaskedView>
  );
};
