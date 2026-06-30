import React, { useEffect } from 'react';
import { View, Text, Modal, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { LEVEL_BADGES } from '@/types';
import { useSound } from '@/hooks/useSound';

interface LevelUpModalProps {
  visible: boolean;
  level: number;
  isDark: boolean;
  onClose: () => void;
}

export function LevelUpModal({ visible, level, isDark, onClose }: LevelUpModalProps) {
  const badge = LEVEL_BADGES[level] || { emoji: "🏆", label: "Level Up!" };
  const { playLevelUp } = useSound();

  useEffect(() => {
    if (visible) {
      playLevelUp();
    }
  }, [visible]);
  
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View entering={ZoomIn.duration(400).springify()} style={[styles.modalContainer, { backgroundColor: isDark ? '#1e1e2d' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(147,51,234,0.2)' }]}>
          
          <LinearGradient
            colors={isDark ? ["#4c1d95", "#2e1065"] : ["#f3e8ff", "#e9d5ff"]}
            style={styles.headerArea}
          >
            <Animated.Text entering={FadeInDown.delay(200).springify()} style={styles.emoji}>
              {badge.emoji}
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(300).springify()} style={[styles.levelText, { color: isDark ? '#e9d5ff' : '#6b21a8' }]}>
              Level {level}
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(400).springify()} style={[styles.title, { color: isDark ? '#ffffff' : '#4c1d95' }]}>
              {badge.label}
            </Animated.Text>
          </LinearGradient>

          <View style={styles.contentArea}>
            <Animated.Text entering={FadeInDown.delay(500)} style={[styles.description, { color: isDark ? 'rgba(255,255,255,0.8)' : '#475569' }]}>
              Congratulations! You've reached a new relationship milestone. Keep exploring to deepen your connection.
            </Animated.Text>

            <Animated.View entering={FadeInDown.delay(600)}>
              <Pressable onPress={onClose} style={({ pressed }) => [styles.button, { opacity: pressed ? 0.9 : 1 }]}>
                <LinearGradient
                  colors={["#a855f7", "#7c3aed"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.buttonInner}
                >
                  <Text style={styles.buttonText}>Awesome!</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>
          
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  headerArea: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  levelText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontFamily: 'DynaPuff_700Bold',
    fontSize: 28,
    textAlign: 'center',
  },
  contentArea: {
    padding: 24,
    alignItems: 'center',
  },
  description: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  button: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  buttonInner: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
  }
});
