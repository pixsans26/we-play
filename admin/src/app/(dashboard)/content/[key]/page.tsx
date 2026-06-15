"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

const API = "http://localhost:4000/api/config";

export default function ContentEditor() {
  const params = useParams();
  const router = useRouter();
  const key = String(params.key);

  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const { data: session } = useSession();

  // Format the title from the key (e.g. privacy_policy -> Privacy Policy)
  const title = key.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const load = async () => {
    if (!session?.user) return;
    const token = (session.user as any).backendToken;

    try {
      const res = await fetch(`${API}/${key}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setValue(data.value || "");
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [key, session]);

  const saveContent = async () => {
    if (!session?.user) return;
    const token = (session.user as any).backendToken;
    
    setSaving(true);
    try {
      await fetch(`${API}/${key}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ value })
      });
      router.refresh();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#5e51d9]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl pt-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-normal text-slate-800 tracking-tight">{title}</h1>
          <p className="text-slate-500 mt-1 text-sm">Edit the content for the {title} page.</p>
        </div>
        <button
          onClick={saveContent}
          disabled={saving}
          className="bg-[#5e51d9] text-white px-5 py-2 rounded-xl flex items-center gap-2 hover:bg-[#4d42b3] transition-colors disabled:opacity-50 text-sm font-medium shadow-sm shadow-indigo-500/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Content
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-1 flex flex-col h-[600px]">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Enter the content for ${title} here. You can use Markdown or HTML...`}
          className="w-full h-full p-6 text-slate-700 bg-transparent resize-none focus:outline-none"
        />
      </div>
    </div>
  );
}
