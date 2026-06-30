import React, { useEffect } from "react";
import { useNotificationStore } from "@/store/notificationStore";
import { useCycleStore } from "@/store/cycleStore";
import { useGameStore } from "@/store/gameStore";
import { calculateCyclePredictions, getRecommendedGameForPhase } from "@/lib/cycleCalculations";
import { usePushNotifications, scheduleLocalNotification } from "@/hooks/usePushNotifications";
import { env } from "@/lib/env";
import packageJson from "../package.json";

const LOCAL_APP_VERSION = packageJson.version || "1.0.0";

function isVersionHigher(latest: string, current: string) {
  const l = latest.split('.').map(Number);
  const c = current.split('.').map(Number);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lVal = l[i] || 0;
    const cVal = c[i] || 0;
    if (lVal > cVal) return true;
    if (lVal < cVal) return false;
  }
  return false;
}

export function NotificationManager() {
  const { expoPushToken, notification } = usePushNotifications();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const cycleConfig = useCycleStore((s) => s.cycleConfig);
  const { spinCount } = useGameStore();
  const SPIN_LIMIT = 5; // Default limit for Spin Wheel

  useEffect(() => {
    async function checkDailyNotifications() {
      try {
        const todayStr = new Date().toDateString();
        const activeNotifications = useNotificationStore.getState().notifications;

        // 1. Cycle Notification (Period status prediction)
        if (cycleConfig?.lastPeriodStart) {
          const preds = calculateCyclePredictions(
            cycleConfig.lastPeriodStart,
            cycleConfig.averageCycleLength,
            cycleConfig.averagePeriodLength
          );

          if (preds) {
            const notifId = `cycle_daily_${todayStr.replace(/\s+/g, "_")}`;
            const alreadyExists = activeNotifications.some(n => n.id === notifId);

            if (!alreadyExists) {
              const recGame = getRecommendedGameForPhase(preds.currentPhase);
              const protectionMsg = preds.sexStatus === "Protected Sex" ? "Protection Recommended" : preds.sexStatus === "Safe Sex" ? "Safe Sex" : "High Pregnancy Risk";
              const message = `Phase: ${preds.currentPhase}.\nMood: ${preds.partnerMood}\nDesires: ${preds.partnerDesires}\nStatus: ${protectionMsg}.\nRecommended Game: ${recGame}`;
              const title = "Daily Cycle Insight 🌸";

              addNotification({
                id: notifId,
                title,
                message,
                time: "Just now",
                icon: "flower",
                iconColor: "#a855f7",
                bgColor: "rgba(168,85,247,0.15)",
                isNew: true,
              });

              // Push native OS notification (strip newlines for display layout)
              await scheduleLocalNotification(title, message.replace(/\n/g, " "), 1);
            }
          }
        }

        // 2. Game Limit Notification (Fate Wheel spins)
        if (spinCount < SPIN_LIMIT) {
          const notifId = `limit_spin_${todayStr.replace(/\s+/g, "_")}`;
          const alreadyExists = activeNotifications.some(n => n.id === notifId);

          if (!alreadyExists) {
            const title = "Fate Wheel is Ready! 🎡";
            const message = `You have ${SPIN_LIMIT - spinCount} spins available today. Tap to play!`;

            addNotification({
              id: notifId,
              title,
              message,
              time: "Just now",
              icon: "game-controller",
              iconColor: "#f59e0b",
              bgColor: "rgba(245,158,11,0.15)",
              isNew: true,
            });

            // Push native OS notification
            await scheduleLocalNotification(title, message, 2);
          }
        }

        // 3. App Update Notification
        try {
          const res = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/config/public/app_branding`);
          if (res.ok) {
            const data = await res.json();
            if (data.value) {
              const parsed = JSON.parse(data.value);
              if (parsed.appVersion && isVersionHigher(parsed.appVersion, LOCAL_APP_VERSION)) {
                const notifId = `app_update_${parsed.appVersion}`;
                const alreadyExists = activeNotifications.some(n => n.id === notifId);

                if (!alreadyExists) {
                  const title = "Update Available! 🚀";
                  const message = `A new version of WePlay (${parsed.appVersion}) is ready. Update now for new features and bug fixes!`;

                  addNotification({
                    id: notifId,
                    title,
                    message,
                    time: "Just now",
                    icon: "cloud-download",
                    iconColor: "#3b82f6",
                    bgColor: "rgba(59,130,246,0.15)",
                    isNew: true,
                  });

                  // Push native OS notification
                  await scheduleLocalNotification(title, message, 3);
                }
              }
            }
          }
        } catch (e) {
          console.log("Check updates failed in NotificationManager:", e);
        }

        // 4. Schedule daily reminder for game bonding (24 hours from now)
        await scheduleLocalNotification(
          "Time to bond! ❤️",
          "Your partner is waiting. Play a game together today!",
          86400
        );

      } catch (err) {
        console.error("Failed to check daily notifications:", err);
      }
    }

    checkDailyNotifications();
  }, [cycleConfig, spinCount, addNotification]);

  return null; // Headless component
}
