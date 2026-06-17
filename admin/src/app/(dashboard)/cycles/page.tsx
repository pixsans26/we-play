"use client";

import { useEffect, useState } from "react";
import { Activity, Calendar, History, Loader2, Heart, AlertCircle, RefreshCw } from "lucide-react";
import CycleHistoryModal from "@/components/CycleHistoryModal";

interface Couple {
  id: number;
  partnerAName: string;
  partnerBName: string;
}

interface CycleTracking {
  id: number;
  coupleId: number;
  averageCycleLength: number;
  averagePeriodLength: number;
  lastPeriodStart: string | null;
  lastPeriodEnd: string | null;
  isLocked: boolean;
  updatedAt: string;
}

interface CycleData {
  couple: Couple | null;
  cycleTracking: CycleTracking;
}

export default function CycleAnalyticsPage() {
  const [data, setData] = useState<CycleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCoupleId, setSelectedCoupleId] = useState<number | null>(null);
  const [selectedCoupleName, setSelectedCoupleName] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/cycles`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch cycle analytics data");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openHistory = (coupleId: number, name: string) => {
    setSelectedCoupleId(coupleId);
    setSelectedCoupleName(name);
    setModalOpen(true);
  };

  // Stats
  const totalTracked = data.length;
  const avgCycleLength = data.length > 0 
    ? Math.round(data.reduce((acc, curr) => acc + curr.cycleTracking.averageCycleLength, 0) / data.length) 
    : 0;

  return (
    <div className="pt-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            Cycle Analytics
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Monitor and analyze couples' cycle tracking usage across the platform.</p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 font-semibold transition-all shadow-sm active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
            <Heart className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Couples Tracking</p>
            <p className="text-3xl font-black text-slate-800">{totalTracked}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Global Avg Cycle</p>
            <p className="text-3xl font-black text-slate-800">{avgCycleLength} <span className="text-lg font-bold text-slate-400">days</span></p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-center gap-3 font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Couples Tracking Cycles</h2>
        </div>
        
        <div className="overflow-x-auto">
          {loading && data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
              <p className="text-slate-500 font-medium">Loading analytics data...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Activity className="w-12 h-12 text-slate-200 mb-4" />
              <h3 className="text-slate-600 font-semibold text-lg mb-1">No Data Available</h3>
              <p className="text-slate-400 text-sm max-w-sm">No couples have set up cycle tracking yet.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-4 pl-6 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Couple</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Average Cycle</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Last Period Start</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Last Updated</th>
                  <th className="p-4 pr-6 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.map((row) => {
                  const coupleName = row.couple 
                    ? `${row.couple.partnerAName} & ${row.couple.partnerBName || 'Partner'}` 
                    : `Couple #${row.cycleTracking.coupleId}`;
                    
                  const updatedDate = new Date(row.cycleTracking.updatedAt).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric'
                  });

                  return (
                    <tr key={row.cycleTracking.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4 pl-6">
                        <div className="font-bold text-slate-800">{coupleName}</div>
                        <div className="text-xs font-semibold text-slate-400 mt-0.5">ID: {row.cycleTracking.coupleId}</div>
                      </td>
                      <td className="p-4">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-sm border border-indigo-100/50">
                          {row.cycleTracking.averageCycleLength} days
                        </div>
                      </td>
                      <td className="p-4">
                        {row.cycleTracking.lastPeriodStart ? (
                          <div className="font-semibold text-slate-700">
                            {row.cycleTracking.lastPeriodStart}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm font-medium italic">Not set</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium text-slate-500">{updatedDate}</div>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => openHistory(row.cycleTracking.coupleId, coupleName)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 shadow-sm transition-all active:scale-95"
                        >
                          <History className="w-4 h-4" />
                          View History
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* History Modal */}
      {selectedCoupleId && (
        <CycleHistoryModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          coupleId={selectedCoupleId}
          coupleName={selectedCoupleName}
        />
      )}
    </div>
  );
}
