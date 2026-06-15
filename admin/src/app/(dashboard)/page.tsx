import { auth } from "@/lib/auth";
import DashboardClient from "./DashboardClient";

async function getStats(token: string) {
  try {
    const res = await fetch("http://localhost:4000/api/stats", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store" 
    });
    if (!res.ok) throw new Error("Failed to fetch");
    return await res.json();
  } catch (err) {
    return {
      totalCouples: 0,
      totalUsers: 0,
      totalScratches: 0,
      totalImageGames: 0,
      totalTaskGames: 0,
      totalLotteryItems: 0,
      totalSpins: 0,
      totalRolls: 0
    };
  }
}

async function getRecentUsers(token: string) {
  try {
    const res = await fetch("http://localhost:4000/api/couples", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    });
    if (!res.ok) return [];
    const allCouples = await res.json();
    return allCouples.slice(0, 5); // Just grab the 5 most recent
  } catch (err) {
    return [];
  }
}

export default async function DashboardPage() {
  const session = await auth();
  const token = session?.user ? (session.user as any).backendToken : "";

  const [stats, recentUsers] = await Promise.all([
    getStats(token),
    getRecentUsers(token)
  ]);

  return <DashboardClient stats={stats} recentUsers={recentUsers} />;
}
