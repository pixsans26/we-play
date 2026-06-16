"use client";
import { env } from "@/lib/env";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import DataTable from "@/components/DataTable";
import { Settings, Loader2 } from "lucide-react";

interface AdminProfile {
  id: number; name: string; email: string;
  role: string; createdAt: string;
}

const API = `${env.NEXT_PUBLIC_API_URL}/api/profile`;

export default function ProfilePage() {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const token = session?.user ? (session.user as any).backendToken : "";

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(API, { headers: { "Authorization": `Bearer ${token}` } });
      const data = await res.json();
      setProfiles(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { if (token) load(); }, [token]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-6">
           <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
             Admin Profile
           </h1>
           <div className="flex bg-white rounded-full p-1 shadow-sm border border-slate-100 hidden sm:flex">
             <div className="px-4 py-1.5 rounded-full text-xs font-bold text-slate-800">
               {profiles.length} Admins
             </div>
           </div>
         </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
          No admins found in the database.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <DataTable
            data={profiles}
            onDelete={async () => { alert("Cannot delete admins from dashboard yet."); }}
            onEdit={(user) => { alert("Viewing admin: " + user.name); }}
            emptyMessage="No admin profiles found."
            columns={[
              { key: "name", label: "Admin Name", render: (t) => (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center">
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.email}</div>
                  </div>
                </div>
              )},
              { key: "role", label: "Role", render: (t) => (
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${t.role === "admin" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>
                  {t.role}
                </span>
              )},
              { key: "createdAt", label: "Joined", render: (t) => <span className="text-sm font-medium text-slate-600">{new Date(t.createdAt).toLocaleDateString()}</span> },
            ]}
          />
        </div>
      )}
    </div>
  );
}
