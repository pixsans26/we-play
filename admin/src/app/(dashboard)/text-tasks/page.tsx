"use client";
import { env } from "@/lib/env";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import DataTable from "@/components/DataTable";
import { Plus, FileText, Loader2, X, Filter, Search } from "lucide-react";

interface TextTask {
  id: string; title: string; description: string;
  timerSeconds: number; level: number; category: string;
}

const CATEGORIES = ["romantic", "fun", "dare", "intimate", "playful"];
const API = `${env.NEXT_PUBLIC_API_URL}/api/tasks/text`;

const emptyForm = { id: "", title: "", description: "", timerSeconds: 60, level: 1, category: "romantic" };

export default function TextTasksPage() {
  const [tasks, setTasks] = useState<TextTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const token = session?.user ? (session.user as any).backendToken : "";
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState({ search: "", category: "", level: "" });
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const load = async () => {
    if (!token) return;
    setLoading(true);
    const res = await fetch(API, { headers: { "Authorization": `Bearer ${token}` } });
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { if (token) load(); }, [token]);

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
    await fetch(`${API}/${id}`, { headers: { "Authorization": `Bearer ${token}` }, method: "DELETE" });
    load();
  };

  const handleEdit = (task: TextTask) => {
    setForm(task);
    setEditing(true);
    setShowForm(true);
  };

  const filtered = tasks.filter(t =>
    t.title.toLowerCase().includes(filter.search.toLowerCase()) &&
    (!filter.category || t.category === filter.category) &&
    (!filter.level || t.level === parseInt(filter.level))
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [filter.search, filter.category, filter.level]);

  return (
    <div className="space-y-8">
      {/* Header section matching reference image style */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-6">
           <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
             Text Tasks
           </h1>
           <div className="flex bg-white rounded-full p-1 shadow-sm border border-slate-100 hidden sm:flex">
             <div className="px-4 py-1.5 rounded-full text-sm font-semibold bg-slate-100 text-slate-800">
               {tasks.length} Total
             </div>
           </div>
         </div>
        
        <button onClick={() => { setForm(emptyForm); setEditing(false); setShowForm(true); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-sm transition-all">
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} placeholder="Search text tasks..."
            className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" />
        </div>
        <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
          <Filter className="w-4 h-4" /> Filters:
        </div>
        <select value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 min-w-[150px]">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select value={filter.level} onChange={e => setFilter(f => ({ ...f, level: e.target.value }))}
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 min-w-[150px]">
          <option value="">All Levels</option>
          {[1,2,3,4,5].map(l => <option key={l} value={l}>Level {l}</option>)}
        </select>
        {(filter.search || filter.category || filter.level) && (
          <button onClick={() => setFilter({ search: "", category: "", level: "" })} className="text-sm text-slate-400 hover:text-slate-700 flex items-center gap-1 font-medium transition-colors">
            <X className="w-3.5 h-3.5" /> Clear All
          </button>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">{editing ? "Edit Text Task" : "Add New Text Task"}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Task ID</label>
                  <input value={form.id} disabled placeholder="Auto-generated"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm disabled:opacity-70 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Title</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Kiss in the rain"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Description</label>
                <textarea required rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detailed instructions for the couple..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Timer (seconds)</label>
                  <input type="number" min={0} value={form.timerSeconds} onChange={e => setForm(f => ({ ...f, timerSeconds: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Level (1–5)</label>
                  <input type="number" min={1} max={5} value={form.level} onChange={e => setForm(f => ({ ...f, level: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all" />
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-white border border-slate-200 rounded-xl py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-sm font-semibold shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editing ? "Save Changes" : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <DataTable
          data={paginated}
          onDelete={handleDelete}
          onEdit={handleEdit}
          emptyMessage="No text tasks found. Add one above!"
          columns={[
            { key: "id", label: "ID" },
            { key: "title", label: "Title", render: (t) => (
              <div>
                <div className="font-semibold text-slate-800">{t.title}</div>
                <div className="text-slate-500 text-xs truncate max-w-xs mt-0.5">{t.description}</div>
              </div>
            )},
            { key: "category", label: "Category", render: (t) => (
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                t.category === "romantic" ? "bg-pink-100 text-pink-700" :
                t.category === "fun" ? "bg-amber-100 text-amber-700" :
                t.category === "dare" ? "bg-orange-100 text-orange-700" :
                t.category === "intimate" ? "bg-rose-100 text-rose-700" :
                "bg-slate-100 text-slate-700"
              }`}>{t.category}</span>
            )},
            { key: "level", label: "Level", render: (t) => <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-md text-xs">Lvl {t.level}</span> },
            { key: "timerSeconds", label: "Timer", render: (t) => <span className="text-slate-600 font-medium">{t.timerSeconds}s</span> },
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
