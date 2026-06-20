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
    const fallbackBg = isDark ? "rgba(21, 0, 37, 0.95)" : "rgba(255, 255, 255, 0.95)";
    
    return (
      <View 
        {...(props as ViewProps)}
        style={[
          props.style,
          { backgroundColor: fallbackBg, overflow: 'hidden' }
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
