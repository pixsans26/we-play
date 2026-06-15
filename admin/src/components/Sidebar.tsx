"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, FileText, Image, RotateCcw, Heart,
  Users, Settings, LogOut, HelpCircle, MessageSquare, History, FileEdit
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/text-tasks", label: "Text Tasks", icon: FileText },
  { href: "/image-tasks", label: "Image Tasks", icon: Image },
  { href: "/spin-wheel", label: "Spin Wheel", icon: RotateCcw },
  { href: "/lottery", label: "Lottery", icon: Heart },
  { href: "/users", label: "App Users", icon: Users },
  { href: "/profile", label: "Settings", icon: Settings },
];

const secondaryNav = [
  { href: "/history", label: "Task History", icon: History },
  { href: "/content", label: "App Content", icon: FileEdit },
  { href: "/settings/branding", label: "App Branding", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex-shrink-0 flex flex-col bg-white border-r border-slate-100 shadow-[1px_0_20px_rgba(0,0,0,0.01)] z-30"
      style={{ width: "260px" }}
    >
      {/* ── Brand ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-8 h-24 shrink-0">
        <div className="w-8 h-8 bg-gradient-to-tr from-[#5e51d9] to-indigo-400 rounded-xl flex items-center justify-center shadow-sm shadow-indigo-500/30">
          <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
        </div>
        <h1 className="font-extrabold text-slate-800 text-xl tracking-tight">WePlay Admin</h1>
      </div>

      {/* ── Navigation ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-10 custom-scrollbar">
        <nav className="flex flex-col gap-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-4 py-3 px-4 mx-4 transition-all duration-300 rounded-xl ${active
                    ? "bg-[#5e51d9] text-white font-semibold shadow-lg shadow-indigo-500/20"
                    : "text-slate-500 hover:text-[#5e51d9] hover:bg-indigo-50/50 font-medium"
                  }`}
              >
                <Icon className={`w-5 h-5 shrink-0 transition-colors ${active ? "text-white" : "text-slate-400 group-hover:text-[#5e51d9]"}`} />
                <span className="text-sm">{label}</span>
              </Link>
            );
          })}
        </nav>

        <nav className="flex flex-col gap-2">
          <div className="px-8 mb-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">System & Records</span>
          </div>
          {secondaryNav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-4 py-3 px-4 mx-4 transition-all duration-300 rounded-xl ${active
                    ? "bg-[#5e51d9] text-white font-semibold shadow-lg shadow-indigo-500/20"
                    : "text-slate-500 hover:text-[#5e51d9] hover:bg-indigo-50/50 font-medium"
                  }`}
              >
                <Icon className={`w-5 h-5 shrink-0 transition-colors ${active ? "text-white" : "text-slate-400 group-hover:text-[#5e51d9]"}`} />
                <span className="text-sm">{label}</span>
              </Link>
            );
          })}
        </nav>
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
