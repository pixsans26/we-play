"use client";
import { env } from "@/lib/env";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import DataTable from "@/components/DataTable";
import { Settings, Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ConfirmProvider";
import toast from "react-hot-toast";

interface AdminProfile {
  id: number; name: string; email: string;
  role: string; createdAt: string;
}

const API = `${env.NEXT_PUBLIC_API_URL}/api/profile`;

export default function ProfilePage() {
  const confirm = useConfirm();
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
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

  const handleClearData = async () => {
    const ok = await confirm({
      title: "Clear All User Data?",
      message: "Are you ABSOLUTELY sure you want to clear ALL users data? This will permanently delete all app users, couples, task completion histories, game progress, and cycle tracking records. This action cannot be undone.",
      confirmText: "Clear All Data",
      cancelText: "Cancel"
    });
    if (!ok) return;

    const secondConfirm = window.prompt("To confirm, type CLEAR ALL in all caps:");
    if (secondConfirm !== "CLEAR ALL") {
      toast.error("Clear operation cancelled. Confirmation text did not match.");
      return;
    }

    setClearing(true);
    try {
      const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/admin/clear-users-data`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (res.ok) {
        toast.success("All user data has been successfully cleared.");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to clear user data.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred while clearing user data.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
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
            onDelete={async () => { toast.error("Cannot delete admins from dashboard yet."); }}
            onEdit={(user) => { toast.success("Viewing admin: " + user.name); }}
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

      {/* Danger Zone */}
      <div className="bg-rose-50/35 border border-rose-100 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200/50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Danger Zone</h3>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Delete all mobile app users, couples, task completion histories, game progress, and period cycles. Admins and game tasks are preserved.
            </p>
          </div>
        </div>
        <button
          onClick={handleClearData}
          disabled={clearing}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-2xl font-bold transition-all shadow-sm active:scale-95 shrink-0"
        >
          {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          {clearing ? "Clearing Data..." : "Clear All Users Data"}
        </button>
      </div>
    </div>
  );
}
