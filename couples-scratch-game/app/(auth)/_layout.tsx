import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Slot, useRouter } from "expo-router";

import { useAuthStore } from "@/store/authStore";

export default function AuthLayout() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const coupleProfile = useAuthStore((s) => s.coupleProfile);

  useEffect(() => {
    if (isLoading) return;
    // If already fully authenticated with a profile, skip auth screens
    if (user && coupleProfile?.partnerAName) {
      router.replace("/(game)");
    }
  }, [isLoading, user, coupleProfile]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#150025" }}>
        <ActivityIndicator size="large" color="#f953c6" />
      </View>
    );
  }

  return <Slot />;
}
