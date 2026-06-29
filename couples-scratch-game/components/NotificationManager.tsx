import React, { useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNotificationStore } from "@/store/notificationStore";
import { useCycleStore } from "@/store/cycleStore";
import { useGameStore } from "@/store/gameStore";
import { useAuthStore } from "@/store/authStore";
import { calculateCyclePredictions, getRecommendedGameForPhase } from "@/lib/cycleCalculations";
import { usePushNotifications, scheduleLocalNotification } from "@/hooks/usePushNotifications";

const LAST_CHECK_KEY = "last_notification_check_date";

export function NotificationManager() {
  const { expoPushToken, notification } = usePushNotifications();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const cycleConfig = useCycleStore((s) => s.cycleConfig);
  const { spinCount } = useGameStore();
  const SPIN_LIMIT = 5; // Default limit for Spin Wheel


  const isCheckedToday = useRef(false);

  useEffect(() => {
    async function checkDailyNotifications() {
      if (isCheckedToday.current) return;
      
      try {
        const todayStr = new Date().toDateString();
        const lastCheck = await AsyncStorage.getItem(LAST_CHECK_KEY);

        if (lastCheck !== todayStr) {
          isCheckedToday.current = true;
          
          // 1. Cycle Notification
          if (cycleConfig?.lastPeriodStart) {
            const preds = calculateCyclePredictions(
              cycleConfig.lastPeriodStart,
              cycleConfig.averageCycleLength,
              cycleConfig.averagePeriodLength
            );

            if (preds) {
              const recGame = getRecommendedGameForPhase(preds.currentPhase);
              const protectionMsg = preds.sexStatus === "Protected Sex" ? "Protection Recommended" : preds.sexStatus === "Safe Sex" ? "Safe Sex" : "High Pregnancy Risk";
              
              const message = `Phase: ${preds.currentPhase}.\nMood: ${preds.partnerMood}\nDesires: ${preds.partnerDesires}\nStatus: ${protectionMsg}.\nRecommended Game: ${recGame}`;
              
              addNotification({
                id: `cycle_daily_${Date.now()}`,
                title: "Daily Cycle Insight 🌸",
                message,
                time: "Just now",
                icon: "flower",
                iconColor: "#a855f7",
                bgColor: "rgba(168,85,247,0.15)",
                isNew: true,
              });
            }
          }

          // 2. Game Limit Notification (Fate Wheel example)
          if (spinCount < SPIN_LIMIT) {
            addNotification({
              id: `limit_spin_${Date.now()}`,
              title: "Fate Wheel is Ready! 🎡",
              message: `You have ${SPIN_LIMIT - spinCount} spins available today. Tap to play!`,
              time: "Just now",
              icon: "game-controller",
              iconColor: "#f59e0b",
              bgColor: "rgba(245,158,11,0.15)",
              isNew: true,
            });
          }

          // 3. Schedule OS Native Push Notification for Game Reminder
          // We schedule this for 24 hours from now, or just a generic reminder.
          // For demonstration, we schedule it 5 seconds from now so it can be tested easily.
          // But a real app would schedule it for e.g. 8 PM.
          scheduleLocalNotification(
            "Time to bond! ❤️",
            "Your partner is waiting. Play a game together today!",
            5 // seconds from now
          );

          await AsyncStorage.setItem(LAST_CHECK_KEY, todayStr);
        }
      } catch (err) {
        console.error("Failed to check daily notifications:", err);
      }
    }

    checkDailyNotifications();
  }, [cycleConfig, spinCount, addNotification]);

  return null; // Headless component
}
