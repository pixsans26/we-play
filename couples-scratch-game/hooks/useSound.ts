import { createAudioPlayer } from "expo-audio";
import { useSettingsStore } from "@/store/settingsStore";

// Initialize players once at module scope to avoid re-creation on every render
const scratchSound = createAudioPlayer(require("@/assets/sounds/scratch.wav"));
const alarmSound = createAudioPlayer(require("@/assets/sounds/alarm.wav"));
const levelUpSound = createAudioPlayer(require("@/assets/sounds/level-up.wav"));
const spinSound = createAudioPlayer(require("@/assets/sounds/spin.wav"));
const winSound = createAudioPlayer(require("@/assets/sounds/win.wav"));
const resultSound = createAudioPlayer(require("@/assets/sounds/result.wav"));
const popupSound = createAudioPlayer(require("@/assets/sounds/popup.wav"));

export function useSound() {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);

  const playScratch = () => {
    try {
      if (soundEnabled && scratchSound) {
        scratchSound.seekTo(0);
        scratchSound.play();
      }
    } catch {}
  };

  const playAlarm = () => {
    try {
      if (soundEnabled && alarmSound) {
        alarmSound.seekTo(0);
        alarmSound.play();
      }
    } catch {}
  };

  const playLevelUp = () => {
    try {
      if (soundEnabled && levelUpSound) {
        levelUpSound.seekTo(0);
        levelUpSound.play();
      }
    } catch {}
  };

  const playSpin = () => {
    try {
      if (soundEnabled && spinSound) {
        spinSound.seekTo(0);
        spinSound.play();
      }
    } catch {}
  };

  const playWin = () => {
    try {
      if (soundEnabled && winSound) {
        winSound.seekTo(0);
        winSound.play();
      }
    } catch {}
  };

  const playResult = () => {
    try {
      if (soundEnabled && resultSound) {
        resultSound.seekTo(0);
        resultSound.play();
      }
    } catch {}
  };

  const playPopup = () => {
    try {
      if (soundEnabled && popupSound) {
        popupSound.seekTo(0);
        popupSound.play();
      }
    } catch {}
  };

  return { playScratch, playAlarm, playLevelUp, playSpin, playWin, playResult, playPopup };
}

