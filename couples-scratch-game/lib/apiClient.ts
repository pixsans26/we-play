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
