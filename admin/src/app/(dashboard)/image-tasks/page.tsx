"use client";
import { env } from "@/lib/env";
import toast from "react-hot-toast";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Plus, Image as ImageIcon, Loader2, X, Trash2, Edit2, Search, Filter } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";

interface ImageTask {
  id: string; imageSource: string; title: string;
  level: number;
}

const API = `${env.NEXT_PUBLIC_API_URL}/api/tasks/image`;
const ASSETS = `${env.NEXT_PUBLIC_API_URL}`;

export default function ImageTasksPage() {
  const [tasks, setTasks] = useState<ImageTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const token = session?.user ? (session.user as any).backendToken : "";
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | number | null>(null);

  // Search & Pagination
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 6; // 6 cards per page

  const load = async () => {
    if (!token) return;
    setLoading(true);
    const res = await fetch(API, { headers: { "Authorization": `Bearer ${token}` } });
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { if (token) load(); }, [token]);

  const filtered = tasks.filter(t =>
    t.title?.toLowerCase().includes(search.toLowerCase()) &&
    (!filterLevel || t.level === parseInt(filterLevel))
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search, filterLevel]);

  const handleFile = (f: File | null) => {
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !id) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("id", id);
      fd.append("title", title);
      fd.append("level", String(level));
      if (file) fd.append("image", file);
      const res = await fetch(API, { headers: { "Authorization": `Bearer ${token}` }, method: "POST", body: fd });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(editing ? "Image task updated!" : "Image task uploaded!");
      setShowForm(false);
      setId(""); setTitle(""); setLevel(1); setFile(null); setPreview("");
      load();
    } catch (err) {
      toast.error("Failed to upload image.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      const res = await fetch(`${API}/${id}`, { headers: { "Authorization": `Bearer ${token}` }, method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Image task deleted!");
      load();
    } catch (err) {
      toast.error("Failed to delete image task.");
    }
  };

  const handleEdit = (task: ImageTask) => {
    setId(task.id);
    setTitle(task.title);
    setLevel(task.level);
    setPreview(`${ASSETS}${task.imageSource}`);
    setFile(null);
    setEditing(true);
    setShowForm(true);
  };

  return (
    <div className="space-y-8">
      {/* Header section matching reference image style */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-6">
           <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
             Image Tasks
           </h1>
           <div className="flex bg-white rounded-full p-1 shadow-sm border border-slate-100 hidden sm:flex">
             <div className="px-4 py-1.5 rounded-full text-sm font-semibold bg-slate-100 text-slate-800">
               {tasks.length} Photos
             </div>
           </div>
         </div>
        
        <button onClick={() => { setId(""); setTitle(""); setLevel(1); setFile(null); setPreview(""); setEditing(false); setShowForm(true); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-sm transition-all">
          <Plus className="w-4 h-4" /> Upload Task
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search titles..."
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">{editing ? "Edit Image Task" : "Upload Image Task"}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Image Upload */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Upload Image *</label>
                <label className={`flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${preview ? "border-indigo-300 bg-indigo-50/30" : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50"}`}>
                  {preview ? (
                    <img src={preview} alt="" className="h-full w-full object-cover rounded-2xl" />
                  ) : (
                    <div className="text-center">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-3">
                        <ImageIcon className="w-5 h-5 text-indigo-500" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">Click to browse photos</p>
                      <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 10MB</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Task ID</label>
                  <input value={id} disabled placeholder="Auto-generated"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm disabled:opacity-70 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Level (1–5)</label>
                  <input type="number" min={1} max={5} value={level} onChange={e => setLevel(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Title *</label>
                <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Short title for the image..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all" />
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-white border border-slate-200 rounded-xl py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all">Cancel</button>
                <button type="submit" disabled={saving || (!file && !editing)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-sm font-semibold shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {editing ? "Save Changes" : "Upload & Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <ImageIcon className="w-8 h-8 text-slate-300" />
          </div>
          <p className="font-medium text-slate-600">No image tasks found</p>
          <p className="text-sm mt-1">Upload your first photo task above!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {paginated.map(task => (
            <div key={task.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
              <div className="h-56 bg-slate-100 relative overflow-hidden">
                <img src={`${ASSETS}${task.imageSource}`} alt={task.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/400x300?text=No+Image"; }} />
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Top badges */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                  <span className="bg-white/90 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm backdrop-blur-md">
                    {task.id}
                  </span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-[-10px] group-hover:translate-y-0">
                    <button onClick={() => handleEdit(task)}
                      className="bg-white/90 p-2 rounded-lg text-indigo-500 shadow-sm hover:bg-indigo-50 hover:text-indigo-600 backdrop-blur-md">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(task.id)}
                      className="bg-white/90 p-2 rounded-lg text-red-500 shadow-sm hover:bg-red-50 hover:text-red-600 backdrop-blur-md">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-800 text-base">{task.title}</h3>
                  <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-md">Lvl {task.level}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm mt-6">
          <span className="text-sm text-slate-500">Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} photos</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Prev</button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
      
      <ConfirmModal
        isOpen={deleteId !== null}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId !== null) {
            handleDelete(deleteId);
            setDeleteId(null);
          }
        }}
      />
    </div>
  );
}
