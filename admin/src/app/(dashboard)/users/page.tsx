"use client";
import { env } from "@/lib/env";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DataTable from "@/components/DataTable";
import { Users, Loader2, Search, XCircle, Heart, User, Activity } from "lucide-react";

interface Couple {
  id: number;
  partnerAUid: string;
  partnerBUid: string | null;
  partnerAName: string;
  partnerBName: string | null;
  partnerAAge: number | null;
  partnerBAge: number | null;
  partnerAGender: string | null;
  partnerBGender: string | null;
  createdAt: string;
}

const API = `${env.NEXT_PUBLIC_API_URL}/api/couples`;

export default function UsersPage() {
  const [couples, setCouples] = useState<Couple[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<Couple | null>(null);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const { data: session } = useSession();
  const router = useRouter();

  const load = async () => {
    if (!session?.user) return;
    const token = (session.user as any).backendToken;
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(API, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      setCouples(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { if (session?.user) load(); }, [session]);

  const filtered = couples.filter(c =>
    c.partnerAName.toLowerCase().includes(search.toLowerCase()) ||
    (c.partnerBName && c.partnerBName.toLowerCase().includes(search.toLowerCase())) ||
    c.partnerAUid.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-6">
           <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
             App Users
           </h1>
           <div className="flex bg-white rounded-full p-1 shadow-sm border border-slate-100 hidden sm:flex">
             <div className="px-4 py-1.5 rounded-full text-xs font-bold text-slate-800">
               {couples.length} Couples
             </div>
           </div>
         </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users by name or email..."
            className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
      ) : couples.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
          No couples found in the database.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <DataTable
            data={paginated}
            onDelete={async () => { alert("Cannot delete couples from dashboard yet."); }}
            onEdit={(couple) => { setSelectedUser(couple as Couple); }}
            emptyMessage="No couples found."
            columns={[
              { key: "partnerAName", label: "Partner A", render: (t) => (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-700 font-bold flex items-center justify-center overflow-hidden">
                    {t.partnerAName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{t.partnerAName}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[150px]">{t.partnerAUid}</div>
                  </div>
                </div>
              )},
              { key: "partnerBName", label: "Partner B", render: (t) => (
                <div className="flex items-center gap-3">
                  {t.partnerBName ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center overflow-hidden">
                        {t.partnerBName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{t.partnerBName}</div>
                        {t.partnerBUid && <div className="text-xs text-slate-500 truncate max-w-[150px]">{t.partnerBUid}</div>}
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Not connected</span>
                  )}
                </div>
              )},
              { key: "partnerId", label: "Status", render: (t) => (
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${t.partnerBUid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {t.partnerBUid ? "Coupled 💖" : "Pending ⏳"}
                </span>
              )},
              { key: "createdAt", label: "Joined", render: (t) => <span className="text-sm font-medium text-slate-600">{new Date(t.createdAt).toLocaleDateString()}</span> },
            ]}
          />
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
              <span className="text-sm text-slate-500">Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} entries</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Prev</button>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User View Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-pink-500" />
                Couple Profile
              </h2>
              <button onClick={() => setSelectedUser(null)} className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors"><XCircle className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-3xl font-bold shadow-inner">
                  {selectedUser.partnerAName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col items-center justify-center">
                  <Heart className={`w-6 h-6 ${selectedUser.partnerBUid ? "text-rose-500 fill-rose-500" : "text-slate-300"} mb-1`} />
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${selectedUser.partnerBUid ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"}`}>
                    {selectedUser.partnerBUid ? "Coupled" : "Pending"}
                  </span>
                </div>
                <div className="w-20 h-20 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-3xl font-bold shadow-inner">
                  {selectedUser.partnerBName ? selectedUser.partnerBName.charAt(0).toUpperCase() : "?"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                    <User className="w-4 h-4 text-pink-500" /> Partner A
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Name</span>
                      <span className="text-sm font-semibold text-slate-700">{selectedUser.partnerAName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">UID</span>
                      <span className="text-xs font-medium text-slate-500 break-all">{selectedUser.partnerAUid}</span>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Age</span>
                        <span className="text-sm font-medium text-slate-600">{selectedUser.partnerAAge || "-"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gender</span>
                        <span className="text-sm font-medium text-slate-600 capitalize">{selectedUser.partnerAGender || "-"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                    <User className="w-4 h-4 text-purple-500" /> Partner B
                  </h3>
                  {selectedUser.partnerBName ? (
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Name</span>
                        <span className="text-sm font-semibold text-slate-700">{selectedUser.partnerBName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">UID</span>
                        <span className="text-xs font-medium text-slate-500 break-all">{selectedUser.partnerBUid}</span>
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Age</span>
                          <span className="text-sm font-medium text-slate-600">{selectedUser.partnerBAge || "-"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gender</span>
                          <span className="text-sm font-medium text-slate-600 capitalize">{selectedUser.partnerBGender || "-"}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-2 opacity-60">
                      <Activity className="w-6 h-6 text-slate-400" />
                      <p className="text-xs font-medium text-slate-500">Awaiting partner connection</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-center pt-2">
                <p className="text-xs font-medium text-slate-400">
                  Account created on {new Date(selectedUser.createdAt).toLocaleDateString()}
                </p>
                <button 
                  onClick={() => router.push(`/users/${selectedUser.id}`)} 
                  className="mt-4 w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold py-2.5 rounded-xl transition-colors text-sm"
                >
                  View Full Details / Edit
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
