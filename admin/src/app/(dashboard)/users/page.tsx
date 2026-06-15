"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DataTable from "@/components/DataTable";
import { Users, Loader2, Search } from "lucide-react";

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

const API = "http://localhost:4000/api/couples";

export default function UsersPage() {
  const [couples, setCouples] = useState<Couple[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
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
           <h1 className="text-2xl font-normal text-slate-800 tracking-tight flex items-center gap-3">
             Couples <span className="text-[28px]">👥</span>
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
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <DataTable
            data={paginated}
            onDelete={async () => { alert("Cannot delete couples from dashboard yet."); }}
            onEdit={(couple) => { router.push(`/users/${couple.id}`); }}
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
    </div>
  );
}
