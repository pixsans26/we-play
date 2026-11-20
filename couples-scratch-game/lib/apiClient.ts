import { env } from "@/lib/env";
import { useAuthStore } from "@/store/authStore";
import { auth } from "@/lib/firebase";

const BASE_URL = env.EXPO_PUBLIC_API_URL;

export const apiFetch = async (url: string, options: RequestInit = {}) => {
  let token = useAuthStore.getState().sessionToken;
  const user = useAuthStore.getState().user || auth.currentUser;

  // Auto-acquire sessionToken if missing but user is logged in
  if (!token && user?.uid) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid }),
      });
      if (res.ok) {
        const data = await res.json();
        token = data.token;
        useAuthStore.getState().setSessionToken(data.token);
      }
    } catch (e) {
      console.warn("[apiFetch] Failed to auto-acquire token:", e);
    }
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
};

export const getAvatarUrl = (path?: string | null) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  if (path.startsWith("file://") || path.startsWith("data:")) return path;
  return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};

export const getImageUrl = getAvatarUrl;


const PRESET_AVATARS_LOCAL: Record<string, any> = {};

export const getAvatarSource = (path?: string | null) => {
  if (!path) return null;
  if (PRESET_AVATARS_LOCAL[path]) {
    return PRESET_AVATARS_LOCAL[path];
  }
  if (path.startsWith("http")) return { uri: path };
  if (path.startsWith("file://") || path.startsWith("data:")) return { uri: path };
  return { uri: `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}` };
};
