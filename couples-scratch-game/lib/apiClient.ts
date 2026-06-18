import { env } from "@/lib/env";
import { useAuthStore } from "@/store/authStore";

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

const PRESET_AVATARS_LOCAL: Record<string, any> = {
  "/uploads/presets/avatar_boy.png": require("@/assets/images/avatars/avatar_boy.jpg"),
  "/uploads/presets/avatar_girl.png": require("@/assets/images/avatars/avatar_girl.jpg"),
  "/uploads/presets/avatar_cat.png": require("@/assets/images/avatars/avatar_cat.jpg"),
  "/uploads/presets/avatar_dog.png": require("@/assets/images/avatars/avatar_dog.jpg"),
};

export const getAvatarSource = (path?: string | null) => {
  if (!path) return null;
  if (PRESET_AVATARS_LOCAL[path]) {
    return PRESET_AVATARS_LOCAL[path];
  }
  if (path.startsWith("http")) return { uri: path };
  if (path.startsWith("file://") || path.startsWith("data:")) return { uri: path };
  return { uri: `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}` };
};
