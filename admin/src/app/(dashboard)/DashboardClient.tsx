"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, FileText, Image as ImageIcon, RotateCcw, Heart, Activity, PlayCircle, Star } from "lucide-react";

export default function DashboardClient({ stats, recentUsers }: { stats: any, recentUsers: any[] }) {
  const barData = [
    { name: "Text Games", count: stats.totalTaskGames },
    { name: "Image Games", count: stats.totalImageGames },
    { name: "Spin Wheel", count: stats.totalSpins },
    { name: "Lottery", count: stats.totalLotteryItems },
  ];

  const pieData = [
    { name: "Scratches", value: stats.totalScratches },
    { name: "Rolls/Spins", value: stats.totalRolls },
  ];
  
  const COLORS = ["#f953c6", "#8b5cf6", "#06b6d4", "#f59e0b"];

  const statCards = [
    { label: "Total Couples", value: stats.totalCouples, icon: Users, color: "bg-blue-100 text-blue-600" },
    { label: "Total Users", value: stats.totalUsers, icon: Activity, color: "bg-indigo-100 text-indigo-600" },
    { label: "Total Scratches", value: stats.totalScratches, icon: Star, color: "bg-pink-100 text-pink-600" },
    { label: "Total Rolls", value: stats.totalRolls, icon: PlayCircle, color: "bg-purple-100 text-purple-600" },
    { label: "Image Games", value: stats.totalImageGames, icon: ImageIcon, color: "bg-rose-100 text-rose-600" },
    { label: "Text Games", value: stats.totalTaskGames, icon: FileText, color: "bg-emerald-100 text-emerald-600" },
    { label: "Spin Items", value: stats.totalSpins, icon: RotateCcw, color: "bg-amber-100 text-amber-600" },
    { label: "Lottery Items", value: stats.totalLotteryItems, icon: Heart, color: "bg-red-100 text-red-600" },
  ];

  return (
    <div className="space-y-10 max-w-[1200px]">
      
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center gap-8">
        <h1 className="text-2xl font-normal text-slate-800 flex items-center gap-3">
          Dashboard <span className="text-[28px]">😍</span>
        </h1>
        <div className="flex bg-white rounded-full shadow-sm border border-slate-100 p-1">
          <button className="px-5 py-1.5 rounded-full text-xs font-bold bg-[#5e51d9] text-white shadow-sm border border-[#5e51d9]">All Time</button>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
              <s.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">{s.label}</p>
              <h3 className="text-2xl font-bold text-slate-800">{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-6 uppercase tracking-wider">Task Library Composition</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Bar dataKey="count" fill="#5e51d9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-6 uppercase tracking-wider">Activity Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-xs font-semibold text-slate-600">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Users ────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Recent Couples</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Partner A</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Partner B</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentUsers.length > 0 ? (
                recentUsers.map((u: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{u.partnerAName}</div>
                      <div className="text-xs text-slate-500">{u.partnerAGender || "Unknown"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{u.partnerBName || "-"}</div>
                      <div className="text-xs text-slate-500">{u.partnerBGender || "Unknown"}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600" suppressHydrationWarning>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500 text-sm">
                    No recent couples found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
