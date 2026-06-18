"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Activity, ArrowLeft, Calendar, Clock, Loader2, AlertCircle, TrendingUp, History } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Couple {
  id: number;
  partnerAName: string;
  partnerBName: string;
  partnerAGender?: string;
  partnerBGender?: string;
}

interface CycleTracking {
  id: number;
  coupleId: number | null;
  femaleUid: string | null;
  averageCycleLength: number;
  averagePeriodLength: number;
  lastPeriodStart: string | null;
  lastPeriodEnd: string | null;
  isLocked: boolean;
  updatedAt: string;
}

interface CycleHistoryRecord {
  id: number;
  coupleId: number | null;
  femaleUid: string | null;
  periodStart: string;
  periodEnd: string | null;
  cycleLength: number;
  createdAt: string;
  isPredicted?: boolean;
}

export default function IndividualCycleDashboard() {
  const { id } = useParams();
  const router = useRouter();
  
  const [tracking, setTracking] = useState<{ 
    couple: Couple | null; 
    cycleTracking: CycleTracking;
    femaleEmail?: string | null;
    femaleName?: string | null;
  } | null>(null);
  const [history, setHistory] = useState<CycleHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [trackingRes, historyRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/cycles`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/cycles/${id}/history`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
        }),
      ]);

      if (!trackingRes.ok) throw new Error("Failed to fetch tracking details");
      if (!historyRes.ok) throw new Error("Failed to fetch history");

      const allTrackingData = await trackingRes.json();
      const historyData = await historyRes.json();

      const isNumeric = /^\d+$/.test(String(id));
      const specificTracking = Array.isArray(allTrackingData) 
        ? allTrackingData.find((item: any) => {
            if (isNumeric) {
              return item.cycleTracking.coupleId === Number(id);
            } else {
              return item.cycleTracking.femaleUid === String(id);
            }
          })
        : null;

      if (!specificTracking) {
         throw new Error("Cycle tracking not found");
      }

      setTracking(specificTracking);
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Loading analytics...</p>
      </div>
    );
  }

  if (error || !tracking) {
    return (
      <div className="pt-8 max-w-5xl mx-auto space-y-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="bg-red-50 border border-red-100 text-red-600 p-6 rounded-2xl flex items-center gap-3 font-medium">
          <AlertCircle className="w-6 h-6 shrink-0" />
          {error || "Could not load data"}
        </div>
      </div>
    );
  }

  let coupleName = `User ${id}`;
  if (tracking.couple) {
    let first = tracking.couple.partnerAName;
    let second = tracking.couple.partnerBName || 'Partner';
    
    const isBFemale = tracking.couple.partnerBGender?.toLowerCase() === 'female';
    const isAFemale = tracking.couple.partnerAGender?.toLowerCase() === 'female';

    if (isBFemale && !isAFemale) {
      first = tracking.couple.partnerBName || 'Partner';
      second = tracking.couple.partnerAName;
    }

    coupleName = `${first} & ${second}`;
  } else if (tracking.femaleName) {
    coupleName = `${tracking.femaleName} (Single)`;
  } else if (tracking.femaleEmail) {
    coupleName = `${tracking.femaleEmail} (Single)`;
  }

  // Prepare chart data from history
  // history is ordered DESC, so reverse for chart
  const chartData = [...history].reverse().map((h) => {
    const dateObj = new Date(h.periodStart);
    return {
      name: dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      cycleLength: h.cycleLength,
      periodStart: h.periodStart,
      isPredicted: !!h.isPredicted,
      label: h.isPredicted ? "Predicted" : "Logged"
    };
  });

  return (
    <div className="pt-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">{coupleName}</h1>
            <p className="text-slate-500 mt-1 font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" /> Cycle Analytics Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Average Cycle</p>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-black text-slate-800">{tracking.cycleTracking.averageCycleLength}</p>
            <p className="text-lg font-bold text-slate-400 mb-1">days</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-50 text-rose-500 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Last Period Start</p>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800">{tracking.cycleTracking.lastPeriodStart || "Not logged"}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Actual Logs</p>
          </div>
          <div>
            <p className="text-4xl font-black text-slate-800">{history.filter(h => !h.isPredicted).length}</p>
          </div>
        </div>
      </div>

      {/* Line Chart */}
      {chartData.length > 0 ? (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-slate-50 text-slate-500 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Cycle Length Trend</h2>
              <p className="text-sm text-slate-500 font-medium">Historical variations in cycle length over time.</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#334155' }}
                  formatter={(value: any, name: any, props: any) => {
                    return [
                      `${value} days (${props.payload.isPredicted ? 'Predicted' : 'Logged'})`,
                      'Cycle Length'
                    ];
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cycleLength" 
                  name="Cycle Length (Days)" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  activeDot={{ r: 6, fill: '#4f46e5', strokeWidth: 0 }}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    return (
                      <circle 
                        key={`dot-${payload.name}`}
                        cx={cx} 
                        cy={cy} 
                        r={payload.isPredicted ? 3 : 4} 
                        fill={payload.isPredicted ? '#cbd5e1' : '#6366f1'} 
                        stroke="#fff" 
                        strokeWidth={2} 
                      />
                    );
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
          <Activity className="w-12 h-12 text-slate-200 mb-4" />
          <h3 className="text-slate-600 font-bold text-lg mb-1">No Historical Trends</h3>
          <p className="text-slate-500 text-sm max-w-sm">This couple has not saved any past cycle logs yet.</p>
        </div>
      )}

    </div>
  );
}
