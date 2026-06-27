"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { env } from "@/lib/env";
import {
  LayoutDashboard, FileText, Image, RotateCcw, Heart,
  Users, Settings, LogOut, HelpCircle, MessageSquare, History, FileEdit, Bell, Activity
} from "lucide-react";

const menuGroups = [
  {
    title: "Core",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/users", label: "App Users", icon: Users },
      { href: "/cycles", label: "Cycle Analytics", icon: Activity },
    ]
  },
  {
    title: "Game Modules",
    items: [
      { href: "/text-tasks", label: "Text Tasks", icon: FileText },
      { href: "/image-tasks", label: "Image Tasks", icon: Image },
      { href: "/spin-wheel", label: "Spin Wheel", icon: RotateCcw },
      { href: "/lottery", label: "Lottery", icon: Heart },
    ]
  },
  {
    title: "Operations",
    items: [
      { href: "/notifications", label: "Push Notifications", icon: Bell },
      { href: "/history", label: "Task History", icon: History },
      { href: "/content", label: "App Content", icon: FileEdit },
      { href: "/preset-avatars", label: "Preset Avatars", icon: Image },
    ]
  },
  {
    title: "Settings",
    items: [
      { href: "/settings/branding", label: "App Branding", icon: Settings },
      { href: "/profile", label: "Admin Profile", icon: Settings },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${env.NEXT_PUBLIC_API_URL}/api/config/public/app_branding`)
      .then(r => r.json())
      .then(data => {
        if (data.value) {
          try {
            const parsed = JSON.parse(data.value);
            if (parsed.logoUrl) setLogoUrl(parsed.logoUrl);
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, []);

  return (
    <aside
      className="flex-shrink-0 flex flex-col bg-white border-r border-slate-100 shadow-[1px_0_20px_rgba(0,0,0,0.01)] z-30"
      style={{ width: "260px" }}
    >
      {/* ── Brand ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-8 h-24 shrink-0">
        {logoUrl ? (
          <img src={logoUrl} alt="App Logo" className="w-8 h-8 object-contain" />
        ) : (
          <div className="w-8 h-8 bg-gradient-to-tr from-[#5e51d9] to-indigo-400 rounded-xl flex items-center justify-center shadow-sm shadow-indigo-500/30">
            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
          </div>
        )}
        <h1 className="font-extrabold text-slate-800 text-xl tracking-tight">WePlay Admin</h1>
      </div>

      {/* ── Navigation ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-6 custom-scrollbar">
        {menuGroups.map((group) => (
          <div key={group.title} className="flex flex-col gap-1">
            <div className="px-8 mb-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{group.title}</span>
            </div>
            <nav className="flex flex-col gap-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== "/" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`group flex items-center gap-3.5 py-2.5 px-4 mx-4 transition-all duration-300 rounded-xl ${
                      active
                        ? "bg-[#5e51d9] text-white font-semibold shadow-lg shadow-indigo-500/10"
                        : "text-slate-500 hover:text-[#5e51d9] hover:bg-indigo-50/50 font-medium"
                    }`}
                  >
                    <Icon className={`w-4.5 h-4.5 shrink-0 transition-colors ${active ? "text-white" : "text-slate-400 group-hover:text-[#5e51d9]"}`} />
                    <span className="text-sm">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* ── Footer / Logout ──────────────────────────────── */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={async () => {
            await signOut({ redirect: false });
            window.location.href = "/auth/login";
          }}
          className="group flex items-center gap-4 py-3 px-4 w-full text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-medium transition-all duration-300 rounded-xl text-left"
        >
          <LogOut className="w-5 h-5 shrink-0 text-slate-400 group-hover:text-rose-500 transition-colors" />
          <span className="text-sm">Log Out</span>
        </button>
      </div>

    </aside>
  );
}
