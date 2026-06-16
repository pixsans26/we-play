"use client";
import { env } from "@/lib/env";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";

import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

const API = `${env.NEXT_PUBLIC_API_URL}/api/config`;

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
      const res = await fetch(`${API}/${key}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ value })
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(`${title} saved successfully!`);
      router.refresh();
    } catch (e) {
      toast.error(`Failed to save ${title}.`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#5e51d9]" />
      </div>
    );
  }

  // Quill modules configuration for rich text features
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'clean']
    ],
  };

  return (
    <div className="max-w-4xl pt-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col min-h-[600px] overflow-hidden">
        <style jsx global>{`
          .quill {
            display: flex;
            flex-direction: column;
            height: 100%;
            flex: 1;
          }
          .ql-toolbar {
            border-top: none !important;
            border-left: none !important;
            border-right: none !important;
            border-bottom: 1px solid #f1f5f9 !important;
            background: #f8fafc;
            padding: 12px 16px !important;
          }
          .ql-container {
            border: none !important;
            flex: 1;
            font-size: 16px;
          }
          .ql-editor {
            min-height: 500px;
            padding: 24px;
            color: #334155;
          }
        `}</style>
        <ReactQuill 
          theme="snow" 
          value={value} 
          onChange={setValue} 
          modules={modules}
          placeholder={`Write the content for ${title} here...`}
        />
      </div>
    </div>
  );
}
