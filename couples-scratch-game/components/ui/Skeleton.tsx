import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, DimensionValue } from 'react-native';
import { useThemeStore } from '@/store/themeStore';

interface SkeletonProps {
  style?: ViewStyle | ViewStyle[];
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
}

export function Skeleton({ style, width, height, borderRadius = 8 }: SkeletonProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const animValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animValue]);

  const bgColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: bgColor,
          opacity: animValue,
          overflow: 'hidden',
        },
        style,
      ]}
    />
  );
}
