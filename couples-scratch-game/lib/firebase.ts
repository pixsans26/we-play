import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, Auth, Persistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

console.log("[firebase] Initializing with project:", firebaseConfig.projectId);

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Create a custom robust persistence class for React Native
// This avoids Metro resolution issues on Android with Firebase v11/v12
const MyReactNativePersistence = class {
  type = "LOCAL" as const;
  async _isAvailable() {
    try {
      await AsyncStorage.setItem("__firebase_test__", "1");
      await AsyncStorage.removeItem("__firebase_test__");
      return true;
    } catch {
      return false;
    }
  }
  _set(key: string, value: any) {
    return AsyncStorage.setItem(key, JSON.stringify(value));
  }
  async _get(key: string) {
    const json = await AsyncStorage.getItem(key);
    return json ? JSON.parse(json) : null;
  }
  _remove(key: string) {
    return AsyncStorage.removeItem(key);
  }
  _addListener() {}
  _removeListener() {}
};

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: MyReactNativePersistence as unknown as Persistence,
  });
  console.log("[firebase] auth initialized with robust AsyncStorage persistence");
} catch (err) {
  // Fall back to getAuth if already initialized (e.g. during Hot Reload)
  console.log("[firebase] initializeAuth threw, falling back to getAuth():", err);
  auth = getAuth(app);
}

const cloudDb = getFirestore(app);

export { auth, cloudDb };
