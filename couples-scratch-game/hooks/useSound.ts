import { useAudioPlayer } from "expo-audio";

/**
 * Hook providing sound effect playback functions for the game.
 * Uses expo-audio for robust cross-platform audio playback.
 */

export function useSound() {
  const scratchSound = useAudioPlayer(require("@/assets/sounds/scratch.wav"));
  const alarmSound = useAudioPlayer(require("@/assets/sounds/alarm.wav"));
  const levelUpSound = useAudioPlayer(require("@/assets/sounds/level-up.wav"));

  const playScratch = () => {
    try {
      if (scratchSound) {
        scratchSound.seekTo(0);
        scratchSound.play();
      }
    } catch {}
  };

  const playAlarm = () => {
    try {
      if (alarmSound) {
        alarmSound.seekTo(0);
        alarmSound.play();
      }
    } catch {}
  };

  const playLevelUp = () => {
    try {
      if (levelUpSound) {
        levelUpSound.seekTo(0);
        levelUpSound.play();
      }
    } catch {}
  };

  return { playScratch, playAlarm, playLevelUp };
}
