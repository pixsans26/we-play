"use client";
import { env } from "@/lib/env";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Loader2, Search, History, Clock, CheckCircle2, XCircle } from "lucide-react";

interface TaskHistory {
  id: string;
  userUid: string;
  performerUid: string | null;
  taskId: string;
  taskType: string;
  category: string | null;
  scratchedAt: string;
  completed: boolean;
  timeTaken: number | null;
}

const API = `${env.NEXT_PUBLIC_API_URL}/api/admin/history`;

export default function HistoryPage() {
  const { data: session } = useSession();
  const token = session?.user ? (session.user as any).backendToken : "";
  
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(API, { headers: { "Authorization": `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load history", err);
    }
    setLoading(false);
  };

  useEffect(() => { if (token) loadData(); }, [token]);

  const filtered = history.filter(h => 
    h.userUid?.toLowerCase().includes(search.toLowerCase()) || 
    h.taskId?.toLowerCase().includes(search.toLowerCase()) ||
    h.taskType?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
          Task History
        </h1>
        <div className="flex bg-white rounded-full p-1 shadow-sm border border-slate-100 hidden sm:flex">
          <div className="px-4 py-1.5 rounded-full text-sm font-semibold bg-slate-100 text-slate-800">
            {history.length} Records
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by User UID, Task ID, or Type..."
            className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-20 text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400 flex flex-col items-center">
            <History className="w-10 h-10 text-slate-300 mb-3" />
            <p className="font-medium text-slate-600">No task history found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User (Scratcher)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Task Info</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(record.scratchedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800 text-sm truncate max-w-[150px]" title={record.userUid}>
                        {record.userUid}
                      </div>
                      {record.performerUid && record.performerUid !== record.userUid && (
                        <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[150px]" title={record.performerUid}>
                          Performer: {record.performerUid}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          record.taskType === 'image' ? 'bg-purple-100 text-purple-700' :
                          record.taskType === 'text' ? 'bg-blue-100 text-blue-700' :
                          record.taskType === 'spin' ? 'bg-orange-100 text-orange-700' :
                          'bg-indigo-100 text-indigo-700'
                        }`}>
                          {record.taskType.toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]" title={record.taskId}>
                          {record.taskId}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {record.completed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                          <XCircle className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 flex items-center gap-1.5">
                      {record.timeTaken !== null ? (
                        <>
                          <Clock className="w-4 h-4 text-slate-400" />
                          {record.timeTaken}s
                        </>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm mt-6">
          <span className="text-sm text-slate-500">Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} records</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Prev</button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
