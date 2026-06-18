"use client";

import { env } from "@/lib/env";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, User, Heart, Calendar, Mail, UserCheck, ShieldAlert, Sparkles } from "lucide-react";
import Link from "next/link";

const LEVEL_BADGES: Record<number, { emoji: string; label: string }> = {
  1: { emoji: "🌱", label: "New Couple" },
  2: { emoji: "💞", label: "Getting Closer" },
  3: { emoji: "🔥", label: "Heating Up" },
  4: { emoji: "💜", label: "Deeply Connected" },
  5: { emoji: "👑", label: "Soulmates" },
};

const getAvatarUrl = (avatar: string | null) => {
  if (!avatar) return null;
  if (avatar.startsWith("http") || avatar.startsWith("data:")) return avatar;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  return `${baseUrl}${avatar.startsWith("/") ? "" : "/"}${avatar}`;
};

function calculatePeriodStatus(lastPeriodStartStr: string | null, averageCycleLength: number = 28, averagePeriodLength: number = 5) {
  if (!lastPeriodStartStr) return null;
  const lastPeriodStart = new Date(lastPeriodStartStr);
  lastPeriodStart.setHours(0, 0, 0, 0);
  if (isNaN(lastPeriodStart.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - lastPeriodStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Current day of cycle (1-indexed)
  const currentCycleDay = (diffDays % averageCycleLength) + 1;

  // Days until next period
  const daysUntilNextPeriod = averageCycleLength - currentCycleDay + 1;
  const nextPeriodDate = new Date(today);
  nextPeriodDate.setDate(today.getDate() + daysUntilNextPeriod);

  let currentPhase: "Menstrual" | "Follicular" | "Ovulation" | "Luteal" = "Menstrual";
  const fertileStartDay = averageCycleLength - 14 - 5;
  const fertileEndDay = averageCycleLength - 14 + 1;

  if (currentCycleDay >= 1 && currentCycleDay <= averagePeriodLength) {
    currentPhase = "Menstrual";
  } else if (currentCycleDay > averagePeriodLength && currentCycleDay < fertileStartDay) {
    currentPhase = "Follicular";
  } else if (currentCycleDay >= fertileStartDay && currentCycleDay <= fertileEndDay) {
    currentPhase = "Ovulation";
  } else {
    currentPhase = "Luteal";
  }

  return {
    currentCycleDay,
    currentPhase,
    daysUntilNextPeriod,
    nextPeriodDate: nextPeriodDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  };
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const uid = String(params.uid);
  const { data: session } = useSession();
  const token = session?.user ? (session.user as any).backendToken : "";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/app-users/${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("User not found");
        }
        throw new Error("Failed to load user details");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadData();
  }, [token, uid]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full pt-20">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Loading user details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto pt-10">
        <Link href="/users" className="text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-2 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Link>
        <div className="bg-red-50 border border-red-100 text-red-700 p-6 rounded-2xl flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-red-500" />
          <p className="font-semibold">{error || "User data not available"}</p>
        </div>
      </div>
    );
  }

  const { user, progress, couple, partner, cycle } = data;
  const displayName = user.name || "Anonymous";
  const joinedDate = new Date(user.createdAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const levelBadge = LEVEL_BADGES[progress?.currentLevel ?? 1] || LEVEL_BADGES[5];

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Link href="/users" className="text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-2 mb-3">
            <ArrowLeft className="w-4 h-4" /> Back to Users
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <User className="w-8 h-8 text-indigo-500" />
            User Details
          </h1>
        </div>
        <Link
          href={`/users/edit/${user.uid}`}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors text-sm font-bold shadow-sm shadow-indigo-600/20 text-center"
        >
          Edit Profile Details
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-3xl overflow-hidden border-2 border-indigo-100 shadow-inner mb-4">
            {user.avatar ? (
              <img
                src={getAvatarUrl(user.avatar) || ""}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as any).style.display = 'none';
                  const parent = (e.target as any).parentElement;
                  if (parent) {
                    parent.innerText = displayName[0]?.toUpperCase() || "?";
                    parent.className += " bg-gradient-to-br from-indigo-400 to-pink-400 text-white";
                  }
                }}
              />
            ) : (
              <span className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-400 to-pink-400 text-white">
                {displayName[0]?.toUpperCase() || "?"}
              </span>
            )}
          </div>

          <h2 className="text-xl font-bold text-slate-800">{displayName}</h2>
          <p className="text-xs font-mono text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md mt-1 border border-slate-100 max-w-full truncate">{user.uid}</p>

          <div className="w-full mt-6 space-y-4 text-left border-t border-slate-100 pt-6">
            <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="truncate">
                <p className="text-xs text-slate-400">Email Address</p>
                <p className="text-slate-700">{user.email || "No email provided"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Registration Date</p>
                <p className="text-slate-700">{joinedDate}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400">Gender</p>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                  user.gender?.toLowerCase() === "female"
                    ? "text-rose-600 bg-rose-50 border-rose-100"
                    : user.gender?.toLowerCase() === "male"
                    ? "text-blue-600 bg-blue-50 border-blue-100"
                    : "text-slate-500 bg-slate-50 border-slate-100"
                }`}>
                  {user.gender || "Not set"}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-400">Age</p>
                <p className="text-slate-700 font-semibold mt-1">{user.age ? `${user.age} yrs` : "Not set"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Details & Partnership Card */}
        <div className="md:col-span-2 space-y-8">
          {/* What they likes */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-md">
              <Sparkles className="w-4.5 h-4.5 text-amber-500" /> Preferences & Interests
            </h3>
            {user.whatLikes ? (
              <div className="flex flex-wrap gap-2">
                {user.whatLikes.split(",").map((chip: string) => (
                  <span key={chip} className="px-3 py-1.5 bg-indigo-50/50 border border-indigo-100/50 text-indigo-700 rounded-xl text-xs font-semibold">
                    {chip.trim()}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm italic">User has not completed the onboarding preferences survey yet.</p>
            )}
          </div>

          {/* Connection Status */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-md">
              <Heart className="w-4.5 h-4.5 text-rose-500" /> Partnership Status
            </h3>

            {couple ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 border border-slate-100 p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {couple.status === "active" ? "Linked Couple" : "Pending Link Invitation"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Invite Code: <span className="font-mono font-bold text-slate-700">{couple.inviteCode}</span>
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/users/${couple.id}`}
                    className="text-xs font-bold text-indigo-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-center"
                  >
                    Edit Couple Profile
                  </Link>
                </div>

                {partner ? (
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Partner Details</p>
                    <div className="flex items-center gap-3 border border-slate-100 p-4 rounded-xl bg-white hover:bg-slate-50/30 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-sm overflow-hidden border border-slate-200 shrink-0">
                        {partner.avatar ? (
                          <img
                            src={getAvatarUrl(partner.avatar) || ""}
                            alt={partner.name || "Partner"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-400 to-pink-400 text-white">
                            {(partner.name || "P")[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 truncate">{partner.name || "Anonymous Partner"}</p>
                        <p className="text-xs text-slate-400 truncate">{partner.email}</p>
                      </div>
                      <Link
                        href={`/users/detail/${partner.uid}`}
                        className="text-xs font-bold text-slate-500 hover:text-indigo-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors shadow-sm shrink-0"
                      >
                        View Partner Details
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-xl">
                    <p className="text-sm font-semibold">Waiting for Partner to join</p>
                    <p className="text-xs text-amber-700/80 mt-1">An invitation has been created, but the partner has not registered/logged in with the invite code yet.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl">
                <Heart className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600">Solo User</p>
                <p className="text-xs text-slate-400 mt-1">This user has not set up a couple relationship or shared an invitation code yet.</p>
              </div>
            )}
          </div>

          {/* Period & Cycle Status (Only for female users or if cycle exists) */}
          {(user.gender?.toLowerCase() === "female" || cycle) && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-md">
                <Calendar className="w-4.5 h-4.5 text-pink-500" /> Period & Cycle Status
              </h3>
              {cycle && cycle.lastPeriodStart ? (() => {
                const status = calculatePeriodStatus(
                  cycle.lastPeriodStart,
                  cycle.averageCycleLength,
                  cycle.averagePeriodLength
                );

                if (!status) {
                  return <p className="text-slate-400 text-sm italic">Failed to calculate period status.</p>;
                }

                const phaseColors = {
                  Menstrual: "text-rose-700 bg-rose-50 border-rose-100",
                  Follicular: "text-emerald-700 bg-emerald-50 border-emerald-100",
                  Ovulation: "text-purple-700 bg-purple-50 border-purple-100",
                  Luteal: "text-amber-700 bg-amber-50 border-amber-100"
                };

                const phaseEmojis = {
                  Menstrual: "🩸",
                  Follicular: "🌱",
                  Ovulation: "🍇",
                  Luteal: "🍂"
                };

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">Current Cycle Day</p>
                        <p className="text-2xl font-black text-slate-800 mt-1">Day {status.currentCycleDay}</p>
                        <p className="text-xs text-slate-400 mt-0.5">of {cycle.averageCycleLength}-day cycle</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">Current Phase</p>
                        <div className="mt-2">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border ${phaseColors[status.currentPhase]}`}>
                            <span className="text-sm">{phaseEmojis[status.currentPhase]}</span> {status.currentPhase} Phase
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-100 p-4 rounded-xl">
                      <div>
                        <p className="text-sm font-bold text-slate-800">Next Predicted Period</p>
                        <p className="text-xs text-slate-400 mt-0.5">Estimated date: <span className="font-semibold text-slate-700">{status.nextPeriodDate}</span></p>
                      </div>
                      <div className="bg-rose-50 border border-rose-100 text-rose-700 font-black px-4 py-2 rounded-xl text-center self-start sm:self-center">
                        {status.daysUntilNextPeriod} Days Left
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl">
                  <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-600">No Period Data Set</p>
                  <p className="text-xs text-slate-400 mt-1">The user has not logged her last period start date in the app yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Progress Metrics */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-md">
              <Sparkles className="w-4.5 h-4.5 text-indigo-500" /> Game Progress
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-indigo-50/30 border border-indigo-100/50 p-4 rounded-xl text-center">
                <span className="text-3xl mb-1 block">{levelBadge.emoji}</span>
                <p className="text-xs text-indigo-700 font-bold uppercase tracking-wider">Current Level</p>
                <p className="text-lg font-extrabold text-slate-800 mt-1">Level {progress?.currentLevel ?? 1}</p>
                <p className="text-xs text-slate-500 mt-0.5">{levelBadge.label}</p>
              </div>

              <div className="bg-rose-50/30 border border-rose-100/50 p-4 rounded-xl text-center flex flex-col justify-center">
                <p className="text-xs text-rose-700 font-bold uppercase tracking-wider">Scratched Cards</p>
                <p className="text-3xl font-black text-slate-800 mt-2">{progress?.scratchCount ?? 0}</p>
                <p className="text-xs text-slate-400 mt-1">total scratches</p>
              </div>

              <div className="bg-emerald-50/30 border border-emerald-100/50 p-4 rounded-xl text-center flex flex-col justify-center">
                <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider">Completed Cards</p>
                <p className="text-3xl font-black text-slate-800 mt-2">{progress?.completedCount ?? 0}</p>
                <p className="text-xs text-slate-400 mt-1">successfully finished</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
