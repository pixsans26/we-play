import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  icon: string;
  iconColor: string;
  bgColor: string;
  isNew: boolean;
}

interface NotificationStore {
  notifications: AppNotification[];
  hasUnread: boolean;
  setHasUnread: (val: boolean) => void;
  addNotification: (notif: AppNotification) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  markAllRead: () => void;
}

const INITIAL_MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: "1",
    title: "App Update Available 🚀",
    message: "Version 1.2 is here with new games and bug fixes. Tap to learn more.",
    time: "1 hour ago",
    icon: "cloud-download",
    iconColor: "#3b82f6",
    bgColor: "rgba(59,130,246,0.15)",
    isNew: true,
  },
  {
    id: "2",
    title: "Daily Cycle Update 🌸",
    message: "She is in her Follicular phase. Energy levels are rising! Read today's insight.",
    time: "4 hours ago",
    icon: "flower",
    iconColor: "#a855f7",
    bgColor: "rgba(168,85,247,0.15)",
    isNew: true,
  },
  {
    id: "3",
    title: "It's your turn! 🎲",
    message: "Your partner just played a round of Fate Wheel. Your turn next!",
    time: "Yesterday",
    icon: "game-controller",
    iconColor: "#f59e0b",
    bgColor: "rgba(245,158,11,0.15)",
    isNew: false,
  },
];

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      notifications: INITIAL_MOCK_NOTIFICATIONS,
      hasUnread: true,
      setHasUnread: (val) => set({ hasUnread: val }),
      addNotification: (notif) => set((state) => ({
        notifications: [notif, ...state.notifications],
        hasUnread: true
      })),
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      })),
      clearAll: () => set({ notifications: [], hasUnread: false }),
      markAllRead: () => set((state) => ({
        hasUnread: false,
        notifications: state.notifications.map((n) => ({ ...n, isNew: false }))
      })),
    }),
    {
      name: "notifications-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
