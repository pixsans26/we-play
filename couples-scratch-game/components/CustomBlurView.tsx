import React from 'react';
import { View, Platform, StyleSheet, ViewProps } from 'react-native';
import { BlurView as ExpoBlurView, BlurViewProps } from 'expo-blur';

/**
 * CustomBlurView
 * 
 * On iOS, this uses the native expo-blur component which is highly optimized.
 * On Android, under the New Architecture (Fabric), BlurView can cause severe 
 * crashes and broken UI. Thus, we absolutely fallback to a simple semi-transparent View.
 */
export function BlurView(props: BlurViewProps) {
  if (Platform.OS === 'android') {
    const isDark = props.tint === 'dark';
    // Use a solid but translucent background for Android to avoid the weird "glow" effect 
    // from Android's RenderEffect blur. We omit overflow: 'hidden' here so we don't 
    // clip children or break nested borders!
    const fallbackBg = isDark ? "rgba(25, 10, 40, 0.90)" : "rgba(255, 255, 255, 0.90)";
    
    return (
      <View 
        {...(props as ViewProps)}
        style={[
          props.style,
          { backgroundColor: fallbackBg }
        ]}
      >
        {props.children}
      </View>
    );
  }

  return (
    <ExpoBlurView 
      {...props} 
      experimentalBlurMethod="dimezisBlurView" 
      style={[
        props.style
      ]}
    />
  );
}
