import { createAudioPlayer } from "expo-audio";
import { useSettingsStore } from "@/store/settingsStore";
import { Platform } from "react-native";

// Initialize players once at module scope to avoid re-creation on every render
const scratchSound = createAudioPlayer(require("@/assets/sounds/scratch.mp3"));
const alarmSound = createAudioPlayer(require("@/assets/sounds/alarm.wav"));
const levelUpSound = createAudioPlayer(require("@/assets/sounds/each-game-level-up.mp3"));
const spinSound = createAudioPlayer(require("@/assets/sounds/spin-wheel.mp3"));
const winSound = createAudioPlayer(require("@/assets/sounds/spin-wheel-win.mp3"));
const resultSound = createAudioPlayer(require("@/assets/sounds/lottery-result.wav"));
const popupSound = createAudioPlayer(require("@/assets/sounds/popup.wav"));

// Specific additions mapping to provided files
const lotterySpinSound = createAudioPlayer(require("@/assets/sounds/lottery-spin.wav"));
const coupleLevelUpSound = createAudioPlayer(require("@/assets/sounds/couple-level-up.mp3"));
const scratchResultSound = createAudioPlayer(require("@/assets/sounds/scratch-result.mp3"));

// Ludo Sounds
const diceRollSound = createAudioPlayer(require("@/assets/sounds/dice-roll.wav"));
const chipStepSound = createAudioPlayer(require("@/assets/sounds/chip-step.wav"));

export function useSound() {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);

  const playSound = (sound: any) => {
    try {
      if (soundEnabled && sound) {
        sound.seekTo(0);
        sound.play();
      }
    } catch {}
  };

  return {
    playScratch: () => playSound(scratchSound),
    playAlarm: () => playSound(alarmSound),
    playLevelUp: () => playSound(levelUpSound),
    playSpin: () => playSound(spinSound),
    playWin: () => playSound(winSound),
    playResult: () => playSound(resultSound),
    playPopup: () => playSound(popupSound),

    // Specific exports for components that want them
    playLotterySpin: () => playSound(lotterySpinSound),
    playCoupleLevelUp: () => playSound(coupleLevelUpSound),
    playScratchResult: () => playSound(scratchResultSound),

    // Ludo specific sounds
    playDiceRoll: () => playSound(diceRollSound),
    playChipStep: () => playSound(chipStepSound),
  };
}
