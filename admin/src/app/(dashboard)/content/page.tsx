"use client";
import { env } from "@/lib/env";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Save, Loader2, FileText } from "lucide-react";

const API = `${env.NEXT_PUBLIC_API_URL}/api/config`;

const CONFIG_KEYS = [
  { key: "faq", label: "FAQ" },
  { key: "support", label: "Support" },
  { key: "privacy_policy", label: "Privacy Policy" },
  { key: "help", label: "Help" },
  { key: "about", label: "About" },
];

export default function AppContentPage() {
  const { data: session } = useSession();
  const token = session?.user ? (session.user as any).backendToken : "";
  
  const [activeTab, setActiveTab] = useState(CONFIG_KEYS[0].key);
  const [contents, setContents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const fetched: Record<string, string> = {};
      for (const item of CONFIG_KEYS) {
        const res = await fetch(`${API}/${item.key}`, { headers: { "Authorization": `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          fetched[item.key] = data.value || "";
        } else {
          fetched[item.key] = "";
        }
      }
      setContents(fetched);
    } catch (err) {
      console.error("Failed to load configs", err);
    }
    setLoading(false);
  };

  useEffect(() => { if (token) loadData(); }, [token]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setSuccessMsg("");
    try {
      await fetch(`${API}/${activeTab}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ value: contents[activeTab] || "" })
      });
      setSuccessMsg("Content saved successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Failed to save config", err);
    }
    setSaving(false);
  };

  const handleContentChange = (val: string) => {
    setContents(prev => ({ ...prev, [activeTab]: val }));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
          App Content
        </h1>
        <button onClick={handleSave} disabled={saving || loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-sm transition-all disabled:opacity-70">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
          Save Changes
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar tabs */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-100 flex flex-col p-4 gap-2">
          {CONFIG_KEYS.map((item) => (
            <button
              key={item.key}
              onClick={() => { setActiveTab(item.key); setSuccessMsg(""); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all text-left ${activeTab === item.key ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-200"}`}
            >
              <FileText className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Content Editor */}
        <div className="flex-1 p-6 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">
              Editing: {CONFIG_KEYS.find(k => k.key === activeTab)?.label}
            </h2>
            {successMsg && <span className="text-green-600 text-sm font-semibold bg-green-50 px-3 py-1 rounded-lg">{successMsg}</span>}
          </div>
          
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <p className="text-sm text-slate-500 mb-2">You can use basic Markdown (like **bold**, *italic*, # Headers, - Lists) to format this content.</p>
              <textarea
                value={contents[activeTab] || ""}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder={`Enter content for ${CONFIG_KEYS.find(k => k.key === activeTab)?.label}...`}
                className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-none font-mono text-sm leading-relaxed"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
