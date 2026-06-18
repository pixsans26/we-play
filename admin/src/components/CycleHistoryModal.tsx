"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { X, Calendar as CalendarIcon, Clock, Activity, Loader2 } from "lucide-react";

interface CycleHistoryRecord {
  id: number;
  coupleId: number | null;
  femaleUid: string | null;
  periodStart: string;
  periodEnd: string | null;
  cycleLength: number;
  createdAt: string;
}

interface Props {
  coupleId: number | string;
  coupleName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CycleHistoryModal({ coupleId, coupleName, isOpen, onClose }: Props) {
  const { data: session } = useSession();
  const token = session?.user ? (session.user as any).backendToken : "";

  const [history, setHistory] = useState<CycleHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && token) {
      fetchHistory();
    }
  }, [isOpen, coupleId, token]);

  const fetchHistory = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/cycles/${coupleId}/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setHistory(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Cycle Analytics History</h2>
            <p className="text-sm text-slate-500 mt-1">Viewing records for <span className="font-semibold text-indigo-600">{coupleName}</span></p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-colors shadow-sm border border-transparent hover:border-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
              <p className="text-slate-500 font-medium">Loading history records...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 flex items-center gap-3">
              <X className="w-4 h-4 shrink-0" /> {error}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Activity className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-slate-700 font-semibold mb-1">No Historical Data</h3>
              <p className="text-slate-500 text-sm max-w-xs">This couple has not saved any past cycle configurations yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record, index) => {
                const dateObj = new Date(record.createdAt);
                return (
                  <div key={record.id} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">Log #{history.length - index}</span>
                        <span className="text-sm font-medium text-slate-600">Recorded on {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-start gap-3 bg-rose-50/50 p-3 rounded-xl border border-rose-100/50">
                        <CalendarIcon className="w-5 h-5 text-rose-500 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-rose-600 mb-0.5 uppercase tracking-wider">Period Dates</p>
                          <p className="text-sm font-bold text-slate-800">
                            {record.periodStart} 
                            {record.periodEnd ? ` to ${record.periodEnd}` : ""}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50">
                        <Clock className="w-5 h-5 text-indigo-500 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-indigo-600 mb-0.5 uppercase tracking-wider">Cycle Length</p>
                          <p className="text-sm font-bold text-slate-800">{record.cycleLength} Days</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
