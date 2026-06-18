"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Users, Search, UserCheck, UserX, Mail, Calendar, Heart, Loader2, RefreshCw, Eye, Edit } from "lucide-react";

interface AppUser {
  uid: string;
  email: string | null;
  name: string | null;
  age: number | null;
  gender: string | null;
  avatar: string | null;
  whatLikes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserRow {
  user: AppUser;
  coupleId: number | null;
  coupleStatus: string | null;
  isPartnerA: boolean | null;
}

const getAvatarUrl = (avatar: string | null) => {
  if (!avatar) return null;
  if (avatar.startsWith("http") || avatar.startsWith("data:")) return avatar;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  return `${baseUrl}${avatar.startsWith("/") ? "" : "/"}${avatar}`;
};

export default function AppUsersPage() {
  const { data: session } = useSession();
  const token = session?.user ? (session.user as any).backendToken : "";

  const [data, setData] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/app-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchData(); }, [token]);

  const filtered = data.filter((row) => {
    const q = search.toLowerCase();
    const u = row.user;
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.gender?.toLowerCase().includes(q)
    );
  });

  const genderColor = (g: string | null) => {
    if (g?.toLowerCase() === "female") return "text-rose-600 bg-rose-50 border-rose-100";
    if (g?.toLowerCase() === "male") return "text-blue-600 bg-blue-50 border-blue-100";
    return "text-slate-500 bg-slate-50 border-slate-100";
  };

  return (
    <div className="pt-8 max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-500" /> App Users
          </h1>
          <p className="text-slate-500 mt-1 font-medium">All registered Firebase users from the mobile app</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: data.length, color: "text-indigo-600 bg-indigo-50" },
          { label: "Couples", value: new Set(data.filter(r => r.coupleId && r.coupleStatus === "active").map(r => r.coupleId)).size, color: "text-rose-600 bg-rose-50" },
          { label: "Female", value: data.filter(r => r.user.gender?.toLowerCase() === "female").length, color: "text-pink-600 bg-pink-50" },
          { label: "Solo / Pending", value: data.filter(r => !r.coupleId || r.coupleStatus === "pending").length, color: "text-amber-600 bg-amber-50" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-3xl font-black text-slate-800">{value}</p>
            <p className={`text-xs font-bold uppercase tracking-wider mt-1 ${color.split(" ")[0]}`}>{label}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Search by name, email, or gender..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm" />
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl font-medium">{error}</div>}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">User Registry</h2>
          <span className="text-sm text-slate-400 font-medium">{filtered.length} users</span>
        </div>
        <div className="overflow-x-auto">
          {loading && data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
              <p className="text-slate-500 font-medium">Loading users...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Users className="w-12 h-12 text-slate-200 mb-4" />
              <h3 className="text-slate-600 font-semibold text-lg mb-1">No Users Found</h3>
              <p className="text-slate-400 text-sm">Users appear here after they log into the mobile app.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  {["User", "Email", "Gender / Age", "Couple Status", "Joined", "Actions"].map(h => (
                    <th key={h} className="p-4 pl-6 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 first:pl-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((row) => {
                  const u = row.user;
                  const displayName = u.name || "Anonymous";
                  const joinedDate = new Date(u.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
                  return (
                    <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-sm shrink-0 overflow-hidden border border-slate-200">
                            {u.avatar ? (
                              <img
                                src={getAvatarUrl(u.avatar) || ""}
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
                          <div>
                            <div className="font-bold text-slate-800">{displayName}</div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[120px]">{u.uid.slice(0, 14)}…</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {u.email ? (
                          <div className="flex items-center gap-1.5 text-sm text-slate-700 font-medium">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />{u.email}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">No email</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {u.gender && (
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${genderColor(u.gender)}`}>{u.gender}</span>
                          )}
                          {u.age && <span className="text-sm text-slate-500 font-semibold">{u.age} yrs</span>}
                          {!u.gender && !u.age && <span className="text-slate-400 text-xs italic">Not set</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        {row.coupleId ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${row.coupleStatus === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
                              <Heart className="w-3 h-3" /> {row.coupleStatus === "active" ? "Linked" : "Pending"}
                            </span>
                            <span className="text-xs text-slate-400">{row.isPartnerA ? "Creator" : "Partner"}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Solo</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-300" />{joinedDate}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/users/detail/${u.uid}`} title="View Details" className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <Eye className="w-4.5 h-4.5" />
                          </Link>
                          <Link href={`/users/edit/${u.uid}`} title="Edit User" className="p-1.5 text-slate-500 hover:text-[#5e51d9] hover:bg-slate-100 rounded-lg transition-colors">
                            <Edit className="w-4.5 h-4.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
