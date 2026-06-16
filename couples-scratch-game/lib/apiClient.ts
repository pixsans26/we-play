import { env } from "@/lib/env";
import { useAuthStore } from "@/store/authStore";

export const LOCAL_PRESETS: Record<string, any> = {
  "/uploads/presets/avatar_boy.png": require("@/assets/images/avatars/avatar_boy.png"),
  "/uploads/presets/avatar_girl.png": require("@/assets/images/avatars/avatar_girl.png"),
  "/uploads/presets/avatar_cat.png": require("@/assets/images/avatars/avatar_cat.png"),
  "/uploads/presets/avatar_dog.png": require("@/assets/images/avatars/avatar_dog.png"),
};

const BASE_URL = env.EXPO_PUBLIC_API_URL;

export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = useAuthStore.getState().sessionToken;
  
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

export const getAvatarSource = (path?: string | null) => {
  if (!path) return null;
  if (LOCAL_PRESETS[path]) {
    return LOCAL_PRESETS[path];
  }
  const uri = getAvatarUrl(path);
  return uri ? { uri } : null;
};
