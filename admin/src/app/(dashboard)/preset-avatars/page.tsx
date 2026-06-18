"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Upload, Trash2, Image as ImageIcon, Plus, Check } from "lucide-react";

interface PresetAvatar {
  id: number;
  name: string;
  url: string;
  createdAt: string;
}

const getAvatarUrl = (avatar: string | null) => {
  if (!avatar) return "";
  if (avatar.startsWith("http") || avatar.startsWith("data:")) return avatar;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  return `${baseUrl}${avatar.startsWith("/") ? "" : "/"}${avatar}`;
};

export default function PresetAvatarsPage() {
  const { data: session } = useSession();
  const token = session?.user ? (session.user as any).backendToken : "";

  const [presets, setPresets] = useState<PresetAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPresets = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/preset-avatars`);
      if (res.ok) {
        const data = await res.json();
        setPresets(data);
      }
    } catch (err) {
      console.error("Failed to fetch presets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert("You must be logged in as an admin to perform this action.");
      return;
    }
    if (!name.trim() || !avatarFile) {
      alert("Please provide both a name and an image file.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("avatar", avatarFile);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/preset-avatars`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const newPreset = await res.json();
        setPresets((prev) => [...prev, newPreset]);
        // Reset form
        setName("");
        setAvatarFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        const err = await res.json();
        alert(err.error || "Failed to upload preset avatar");
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    const confirmDelete = window.confirm("Are you sure you want to delete this preset avatar? Existing users using this avatar URL will continue to show it, but new users won't be able to select it.");
    if (!confirmDelete) return;

    setDeletingId(id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/preset-avatars/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setPresets((prev) => prev.filter((p) => p.id !== id));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete preset avatar");
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred during deletion.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <ImageIcon className="w-8 h-8 text-indigo-500" />
            Preset Avatars
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage profile picture options available to mobile application users.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Upload Form */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
            <Plus className="w-5 h-5 text-indigo-500" />
            Add Preset Avatar
          </h2>

          <form onSubmit={handleUpload} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Avatar Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Panda, Cute Girl"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Avatar Image</label>
              
              {/* File Drop/Select Area */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  previewUrl 
                    ? "border-indigo-200 bg-indigo-50/10" 
                    : "border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-indigo-200 shadow-sm">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-slate-400">
                    <Upload className="w-8 h-8 mb-2 text-slate-300" />
                    <span className="text-xs font-bold text-slate-500">Select Image File</span>
                    <span className="text-[10px] text-slate-400 mt-1">PNG, JPG or JPEG up to 5MB</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading || !name || !avatarFile}
              className="w-full bg-[#5e51d9] hover:bg-indigo-600 disabled:bg-slate-100 disabled:text-slate-400 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all shadow-sm active:scale-95"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Avatar
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Presets Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm min-h-[400px]">
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-50 pb-3 mb-6">
              Current Avatars ({presets.length})
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-[#5e51d9]" />
              </div>
            ) : presets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 border border-dashed border-slate-100 rounded-xl">
                <ImageIcon className="w-12 h-12 text-slate-200 mb-3" />
                <p className="font-semibold text-slate-500 text-sm">No preset avatars found</p>
                <p className="text-xs text-slate-400 mt-1">Upload dynamic avatars using the left form</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="group relative bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center text-center transition-all duration-300 hover:shadow-md hover:border-indigo-100"
                  >
                    {/* Image */}
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-100 shadow-sm relative mb-3 shrink-0">
                      <img
                        src={getAvatarUrl(preset.url)}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Name */}
                    <span className="text-sm font-bold text-slate-700 truncate w-full px-1 mb-1">
                      {preset.name}
                    </span>

                    {/* Meta/Date */}
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                      ID: {preset.id}
                    </span>

                    {/* Delete action overlay */}
                    <button
                      onClick={() => handleDelete(preset.id)}
                      disabled={deletingId === preset.id}
                      className="absolute top-2 right-2 p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-600 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-50"
                      title="Delete avatar option"
                    >
                      {deletingId === preset.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
