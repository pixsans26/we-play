import React from "react";
import { Text, TextProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { useThemeStore, getTheme } from "@/store/themeStore";

interface GradientTextProps extends TextProps {
  colors?: string[];
  color?: string; // Fallback for solid color
}

export const GradientText: React.FC<GradientTextProps> = (props) => {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);
  
  if (props.color && !props.colors) {
    return <Text {...props} style={[props.style, { color: props.color }]} />;
  }

  return (
    <MaskedView maskElement={<Text {...props} />}>
      <LinearGradient
        colors={(props.colors || theme.accentGradient) as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text {...props} style={[props.style, { opacity: 0 }]} />
      </LinearGradient>
    </MaskedView>
  );
};
