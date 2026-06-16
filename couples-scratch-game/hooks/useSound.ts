import { useEffect, useRef } from "react";
import { Audio } from "expo-av";

/**
 * Hook providing sound effect playback functions for the game.
 * Uses expo-av for robust cross-platform audio playback.
 */

export function useSound() {
  const scratchSound = useRef<Audio.Sound | null>(null);
  const alarmSound = useRef<Audio.Sound | null>(null);
  const levelUpSound = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      playThroughEarpieceAndroid: false
    }).catch(() => {});

    async function loadSounds() {
      try {
        const { sound: s1 } = await Audio.Sound.createAsync(require("@/assets/sounds/scratch.mp3"));
        scratchSound.current = s1;
        
        const { sound: s2 } = await Audio.Sound.createAsync(require("@/assets/sounds/alarm.mp3"));
        alarmSound.current = s2;
        
        const { sound: s3 } = await Audio.Sound.createAsync(require("@/assets/sounds/level-up.mp3"));
        levelUpSound.current = s3;
      } catch (e) {
        // Silently fail if sounds cannot be loaded (e.g. invalid files or missing audio hardware)
      }
    }
    loadSounds();

    return () => {
      scratchSound.current?.unloadAsync();
      alarmSound.current?.unloadAsync();
      levelUpSound.current?.unloadAsync();
    };
  }, []);

  const playScratch = async () => {
    try {
      if (scratchSound.current) {
        await scratchSound.current.setPositionAsync(0);
        await scratchSound.current.playAsync();
      }
    } catch {}
  };

  const playAlarm = async () => {
    try {
      if (alarmSound.current) {
        await alarmSound.current.setPositionAsync(0);
        await alarmSound.current.playAsync();
      }
    } catch {}
  };

  const playLevelUp = async () => {
    try {
      if (levelUpSound.current) {
        await levelUpSound.current.setPositionAsync(0);
        await levelUpSound.current.playAsync();
      }
    } catch {}
  };

  return {
    playScratch,
    playAlarm,
    playLevelUp,
  };
}
