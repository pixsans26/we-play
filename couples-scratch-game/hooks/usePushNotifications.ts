import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Expo Go dropped remote push notification support in SDK 53.
// We must NOT import expo-notifications at module level in Expo Go —
// the import itself crashes because the module runs side-effects on load.
// isExpoGo = true when running inside Expo Go (appOwnership === 'expo').
// In dev builds and release builds, appOwnership is null — full support.
const isExpoGo = Constants.appOwnership === 'expo';

// Lazily load expo-notifications only in real builds (dev build / release).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let N: typeof import('expo-notifications') | null = null;
if (!isExpoGo && Platform.OS !== 'web') {
  N = require('expo-notifications');
  N!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState<any | undefined>(undefined);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web' || isExpoGo || !N) return;

    registerForPushNotificationsAsync()
      .then(token => setExpoPushToken(token ?? ''))
      .catch((error: any) => setExpoPushToken(`${error}`));

    notificationListener.current = N.addNotificationReceivedListener((notif: any) => {
      setNotification(notif);
    });

    responseListener.current = N.addNotificationResponseReceivedListener((response: any) => {
      console.log(response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return { expoPushToken, notification };
}

export async function scheduleLocalNotification(title: string, body: string, secondsFromNow: number = 60) {
  if (Platform.OS === 'web' || isExpoGo || !N) return;

  try {
    await N.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsFromNow,
      },
    });
  } catch (err) {
    console.warn("Failed to schedule local notification:", err);
  }
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'web' || isExpoGo || !N) return;

  if (Platform.OS === 'android') {
    try {
      await N.setNotificationChannelAsync('default', {
        name: 'WePlay',
        importance: N.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ff2d6b',
      });
    } catch (e) {
      console.warn("Failed to set notification channel:", e);
    }
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await N.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await N.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    try {
      // Use getDevicePushTokenAsync to get the raw FCM token — works in real APK builds.
      // getExpoPushTokenAsync returns an ExponentPushToken which only routes through
      // Expo's proxy and can land in Expo Go instead of the real APK.
      const deviceToken = await N.getDevicePushTokenAsync();
      const pushTokenString = deviceToken.data as string;
      console.log('[Push] FCM device token:', pushTokenString);
      return pushTokenString;
    } catch (e: unknown) {
      console.error('[Push] Failed to get FCM device token:', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

