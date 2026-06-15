import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Bell, Search } from "lucide-react";
import { Providers } from "@/components/Providers";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  return (
    <Providers>
      {/* Outer: Full screen without padding */}
      <div className="min-h-screen flex items-center justify-center bg-[#fafbfe]">
        
        {/* Inner full width container */ }
        <div className="flex w-full h-screen overflow-hidden bg-[#fafbfe]">
        
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
          
          {/* Top header bar */}
          <header className="h-20 flex items-center justify-between px-10 shrink-0">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <span className="text-indigo-600 text-lg">📅</span>
              {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>

            <div className="flex items-center gap-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  placeholder="Search by date, name or ID..."
                  className="bg-slate-50 border border-slate-100 rounded-full pl-10 pr-4 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-400 w-[240px] transition"
                />
              </div>
              <button className="text-slate-400 hover:text-slate-600 transition">
                <Bell className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold shadow ring-4 ring-indigo-50">
                {session?.user?.name?.charAt(0) ?? "A"}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 px-10 pb-10 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
    </Providers>
  );
}
