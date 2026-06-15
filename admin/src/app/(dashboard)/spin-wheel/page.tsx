"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import DataTable from "@/components/DataTable";
import { Plus, RotateCcw, Loader2, X, Trash2, Search, Filter } from "lucide-react";

interface SpinWheelItem {
  id: number; label: string; emoji: string;
  color: string; level: number; active: boolean;
}

const API = "http://localhost:4000/api/tasks/spin";

const emptyForm = { id: 0, label: "", emoji: "🎯", color: "#FF6B9D", level: 1, active: true };

export default function SpinWheelPage() {
  const [items, setItems] = useState<SpinWheelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const token = session?.user ? (session.user as any).backendToken : "";
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const load = async () => {
    if (!token) return;
    setLoading(true);
    const res = await fetch(API, { headers: { "Authorization": `Bearer ${token}` } });
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { if (token) load(); }, [token]);

  const filtered = items.filter(t =>
    t.label.toLowerCase().includes(search.toLowerCase()) &&
    (!filterLevel || t.level === parseInt(filterLevel))
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search, filterLevel]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch(API, { method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowForm(false);
    setForm(emptyForm);
    setEditing(false);
    load();
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm("Delete this spin wheel item?")) return;
    await fetch(`${API}/${id}`, { headers: { "Authorization": `Bearer ${token}` }, method: "DELETE" });
    load();
  };

  const handleEdit = (item: SpinWheelItem) => {
    setForm(item);
    setEditing(true);
    setShowForm(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-6">
           <h1 className="text-2xl font-normal text-slate-800 tracking-tight flex items-center gap-3">
             Spin Wheel <span className="text-[28px]">🎡</span>
           </h1>
           <div className="flex bg-white rounded-full p-1 shadow-sm border border-slate-100 hidden sm:flex">
             <div className="px-4 py-1.5 rounded-full text-xs font-bold text-slate-800">
               {items.length} Items
             </div>
           </div>
         </div>
        
        <button onClick={() => { setForm(emptyForm); setEditing(false); setShowForm(true); }}
          className="flex items-center gap-2 bg-[#5e51d9] hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-indigo-500/20 transition-all">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>
      {/* Filters Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..."
            className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" />
        </div>
        <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
          <Filter className="w-4 h-4" /> Filters:
        </div>
        <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 min-w-[120px]">
          <option value="">All Levels</option>
          {[1,2,3,4,5].map(l => <option key={l} value={l}>Level {l}</option>)}
        </select>
        {(search || filterLevel) && (
          <button onClick={() => { setSearch(""); setFilterLevel(""); }} className="text-sm text-slate-400 hover:text-slate-700 flex items-center gap-1 font-medium transition-colors">
            <X className="w-3.5 h-3.5" /> Clear All
          </button>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">{editing ? "Edit Spin Item" : "Add Spin Item"}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Emoji</label>
                  <input required value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} placeholder="🎯"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg text-center focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Color (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      className="h-12 w-12 rounded cursor-pointer border-0 p-0" />
                    <input required value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Label (Action)</label>
                <input required value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Kiss on the cheek"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Level (1–5)</label>
                  <input type="number" min={1} max={5} value={form.level} onChange={e => setForm(f => ({ ...f, level: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all" />
                </div>
                <div className="flex flex-col justify-center">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Status</label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-5 h-5 text-indigo-600 rounded" />
                    <span className="text-sm font-semibold text-slate-700">Active</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-white border border-slate-200 rounded-xl py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-[#5e51d9] hover:bg-indigo-700 text-white rounded-xl py-3 text-sm font-semibold shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editing ? "Save Changes" : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
          No spin wheel items found. Add one above!
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <DataTable
            data={paginated}
            onDelete={handleDelete}
            onEdit={handleEdit}
            emptyMessage="No spin wheel items found."
            columns={[
              { key: "emoji", label: "Icon", render: (t) => <span className="text-2xl">{t.emoji}</span> },
              { key: "label", label: "Action", render: (t) => <span className="font-bold text-slate-800">{t.label}</span> },
              { key: "color", label: "Color", render: (t) => (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: t.color }}></div>
                  <span className="text-xs font-mono text-slate-500 uppercase">{t.color}</span>
                </div>
              )},
              { key: "level", label: "Level", render: (t) => <span className="font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md text-xs">Lvl {t.level}</span> },
              { key: "active", label: "Status", render: (t) => (
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${t.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {t.active ? "Active" : "Hidden"}
                </span>
              )},
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
