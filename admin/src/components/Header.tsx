"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Search, LogOut, User as UserIcon, Settings, Heart, Users, FileText, ImageIcon, RotateCcw } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const NAVIGATION_LINKS = [
  { name: "Dashboard", href: "/", icon: <Activity className="w-4 h-4 text-slate-400" /> },
  { name: "Users & Couples", href: "/users", icon: <Users className="w-4 h-4 text-slate-400" /> },
  { name: "Text Tasks", href: "/text-tasks", icon: <FileText className="w-4 h-4 text-slate-400" /> },
  { name: "Image Tasks", href: "/image-tasks", icon: <ImageIcon className="w-4 h-4 text-slate-400" /> },
  { name: "Spin Wheel", href: "/spin-wheel", icon: <RotateCcw className="w-4 h-4 text-slate-400" /> },
  { name: "Lottery", href: "/lottery", icon: <Heart className="w-4 h-4 text-slate-400" /> },
  { name: "Settings", href: "/settings/branding", icon: <Settings className="w-4 h-4 text-slate-400" /> },
  { name: "Profile", href: "/profile", icon: <UserIcon className="w-4 h-4 text-slate-400" /> },
];

function Activity({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
  );
}

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setShowSearch(false);
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setShowProfile(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults = NAVIGATION_LINKS.filter(link => 
    link.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header className="h-20 flex items-center justify-between px-10 shrink-0 border-b border-slate-100 bg-white relative z-50">
      <div className="flex items-center gap-2 text-slate-800 font-bold text-sm select-none">
        <span className="text-indigo-600 text-lg">📅</span>
        {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </div>

      <div className="flex items-center gap-6">
        
        {/* Universal Search */}
        <div className="relative" ref={searchRef}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(true);
            }}
            onFocus={() => setShowSearch(true)}
            placeholder="Search pages..."
            className="bg-slate-50 border border-slate-100 rounded-full pl-10 pr-4 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-400 w-[240px] transition"
          />

          {showSearch && searchQuery && (
            <div className="absolute top-full mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {searchResults.length > 0 ? (
                searchResults.map(result => (
                  <button
                    key={result.href}
                    onClick={() => {
                      router.push(result.href);
                      setShowSearch(false);
                      setSearchQuery("");
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-3 transition-colors text-sm text-slate-700 font-medium"
                  >
                    {result.icon}
                    {result.name}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-slate-400 text-center">
                  No pages found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-full transition ${showNotifications ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
          >
            <Bell className="w-5 h-5" />
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <span className="font-bold text-slate-800 text-sm">Notifications</span>
              </div>
              <div className="p-6 text-center text-slate-400 text-sm flex flex-col items-center">
                <Bell className="w-8 h-8 text-slate-200 mb-2" />
                No new notifications
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => setShowProfile(!showProfile)}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold shadow ring-4 ring-indigo-50 transition transform active:scale-95"
          >
            {session?.user?.name?.charAt(0) ?? "A"}
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-slate-100 mb-1">
                <p className="text-sm font-bold text-slate-800 truncate">{session?.user?.name || "Admin"}</p>
                <p className="text-xs text-slate-500 truncate">{session?.user?.email || "admin@example.com"}</p>
              </div>
              <Link href="/profile" onClick={() => setShowProfile(false)} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-sm font-medium text-slate-700 transition">
                <UserIcon className="w-4 h-4 text-slate-400" /> My Profile
              </Link>
              <button 
                onClick={() => signOut({ callbackUrl: '/auth/login' })}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 text-sm font-medium text-red-600 transition mt-1"
              >
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
