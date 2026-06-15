import { useEffect } from "react";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";

/**
 * Hook providing sound effect playback functions for the game.
 * All functions silently fail if sound cannot load or play (non-blocking).
 * Respects device silent/muted mode (playsInSilentMode: false).
 */

export function useSound() {
  const scratchPlayer = useAudioPlayer(require("@/assets/sounds/scratch.mp3"));
  const alarmPlayer = useAudioPlayer(require("@/assets/sounds/alarm.mp3"));
  const levelUpPlayer = useAudioPlayer(require("@/assets/sounds/level-up.mp3"));

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: false,
    }).catch(() => {});
  }, []);

  const playScratch = async () => {
    try {
      if (scratchPlayer) {
        scratchPlayer.seekTo(0);
        scratchPlayer.play();
      }
    } catch {
      // Silently fail
    }
  };

  const playAlarm = async () => {
    try {
      if (alarmPlayer) {
        alarmPlayer.seekTo(0);
        alarmPlayer.play();
      }
    } catch {
      // Silently fail
    }
  };

  const playLevelUp = async () => {
    try {
      if (levelUpPlayer) {
        levelUpPlayer.seekTo(0);
        levelUpPlayer.play();
      }
    } catch {
      // Silently fail
    }
  };

  return {
    playScratch,
    playAlarm,
    playLevelUp,
  };
}
