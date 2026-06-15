import { useAuthStore } from "@/store/authStore";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

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
