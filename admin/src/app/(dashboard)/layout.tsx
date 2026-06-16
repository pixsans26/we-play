import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Providers } from "@/components/Providers";
import Header from "@/components/Header";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  return (
    <Providers session={session}>
      {/* Outer: Full screen without padding */}
      <div className="min-h-screen flex items-center justify-center bg-[#fafbfe]">
        
        {/* Inner full width container */ }
        <div className="flex w-full h-screen overflow-hidden bg-[#fafbfe]">
        
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
          
          {/* Top header bar */}
          <Header />

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
