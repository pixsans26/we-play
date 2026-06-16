import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { BlurView as ExpoBlurView, BlurViewProps } from 'expo-blur';

/**
 * CustomBlurView
 * 
 * On iOS, this uses the native expo-blur component which is highly optimized.
 * On Android, expo-blur can cause severe frame drops and performance issues, 
 * especially on older devices or with complex layouts. Thus, we fallback to 
 * a simple semi-transparent View on Android.
 */
export function BlurView(props: BlurViewProps) {
  return (
    <ExpoBlurView 
      {...props} 
      experimentalBlurMethod="dimezisBlurView" 
      style={[
        props.style,
        Platform.OS === 'android' && { overflow: 'hidden' }
      ]}
    />
  );
}
