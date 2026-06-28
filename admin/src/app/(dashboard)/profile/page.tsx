"use client";
import { env } from "@/lib/env";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import DataTable from "@/components/DataTable";
import { Settings, Loader2, AlertTriangle, Trash2, X } from "lucide-react";
import { useConfirm } from "@/components/ConfirmProvider";
import toast from "react-hot-toast";
import ModalPortal from "@/components/ModalPortal";

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", currentPassword: "", newPassword: "" });
  const [savingProfile, setSavingProfile] = useState(false);
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

  const handleEditClick = (user: AdminProfile) => {
    if ((session?.user as any)?.email !== user.email) {
      toast.error("You can only edit your own profile.");
      return;
    }
    setEditForm({ name: user.name, email: user.email, currentPassword: "", newPassword: "" });
    setShowEditModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editForm.newPassword && !editForm.currentPassword) {
      toast.error("Current password is required to set a new password.");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/auth/admin/profile`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update profile");
      }
      toast.success("Profile updated successfully!");
      setShowEditModal(false);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

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
            onEdit={handleEditClick}
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

      {/* Edit Profile Modal */}
      {showEditModal && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-800">Edit Profile</h2>
                <button onClick={() => setShowEditModal(false)} className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Name</label>
                  <input required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Email</label>
                  <input required type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400" />
                </div>
                
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Change Password (Optional)</p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Current Password</label>
                      <input type="password" value={editForm.currentPassword} onChange={e => setEditForm(f => ({ ...f, currentPassword: e.target.value }))}
                        placeholder="Required if changing password"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">New Password</label>
                      <input type="password" value={editForm.newPassword} onChange={e => setEditForm(f => ({ ...f, newPassword: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowEditModal(false)} className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={savingProfile} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 disabled:opacity-70">
                    {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
