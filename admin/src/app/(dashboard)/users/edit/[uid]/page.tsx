"use client";

import { env } from "@/lib/env";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Save, ArrowLeft, User, Upload, Sparkles, Check } from "lucide-react";
import Link from "next/link";

const DEFAULT_PRESETS = [
  { name: "Boy", url: "/uploads/presets/avatar_boy.png" },
  { name: "Girl", url: "/uploads/presets/avatar_girl.png" },
  { name: "Cat", url: "/uploads/presets/avatar_cat.png" },
  { name: "Dog", url: "/uploads/presets/avatar_dog.png" },
];

const getAvatarUrl = (avatar: string | null) => {
  if (!avatar) return null;
  if (avatar.startsWith("http") || avatar.startsWith("data:")) return avatar;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  return `${baseUrl}${avatar.startsWith("/") ? "" : "/"}${avatar}`;
};

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const uid = String(params.uid);
  const { data: session } = useSession();
  const token = session?.user ? (session.user as any).backendToken : "";

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState("");
  const [whatLikes, setWhatLikes] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  
  const [presetAvatars, setPresetAvatars] = useState<{ name: string; url: string }[]>(DEFAULT_PRESETS);
  
  // File upload state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  const loadPresetAvatars = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/preset-avatars`);
      if (res.ok) {
        const data = await res.json();
        setPresetAvatars(data);
      }
    } catch (e) {
      console.error("Failed to load preset avatars", e);
    }
  };

  const loadUser = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/app-users/${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const u = data.user;
        setName(u.name || "");
        setEmail(u.email || "");
        setAge(u.age !== null && u.age !== undefined ? Number(u.age) : "");
        setGender(u.gender || "");
        setWhatLikes(u.whatLikes || "");
        setAvatar(u.avatar || null);
        if (u.avatar) {
          setAvatarPreviewUrl(getAvatarUrl(u.avatar));
        }
      } else {
        alert("Failed to load user details");
        router.push("/users");
      }
    } catch (e) {
      console.error(e);
      alert("Error loading user");
      router.push("/users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPresetAvatars();
    if (token) loadUser();
  }, [token, uid]);

  const handlePresetSelect = (url: string) => {
    setAvatar(url);
    setAvatarFile(null);
    setAvatarPreviewUrl(getAvatarUrl(url));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatar(null); // Clear preset if uploading a custom file
      setAvatarPreviewUrl(URL.createObjectURL(file));
    }
  };

  const saveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("email", email.trim());
      formData.append("age", age !== "" ? String(age) : "");
      formData.append("gender", gender);
      formData.append("whatLikes", whatLikes.trim());
      
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      } else if (avatar) {
        formData.append("avatar", avatar);
      } else {
        formData.append("avatar", "");
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/app-users/${uid}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        alert("User profile updated successfully!");
        router.push(`/users/detail/${uid}`);
        router.refresh();
      } else {
        const errJson = await res.json();
        alert(errJson.error || "Failed to update profile.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#5e51d9]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href={`/users/detail/${uid}`} className="text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Details
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <User className="w-8 h-8 text-indigo-500" />
            Edit User Profile
          </h1>
        </div>
      </div>

      <form onSubmit={saveUser} className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm space-y-8">
        {/* Avatar Section */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-4">Profile Picture / Avatar</label>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar Preview */}
            <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold border-2 border-indigo-100 shrink-0 overflow-hidden relative group">
              {avatarPreviewUrl ? (
                <img src={avatarPreviewUrl} alt="Avatar preview" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-slate-300" />
              )}
            </div>

            <div className="flex-1 w-full space-y-4">
              {/* Preset avatars selection */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Choose Preset Avatar</p>
                <div className="flex flex-wrap gap-3">
                  {presetAvatars.map((preset) => {
                    const isSelected = avatar === preset.url;
                    return (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => handlePresetSelect(preset.url)}
                        className={`w-12 h-12 rounded-full border-2 overflow-hidden relative hover:scale-105 transition-all ${
                          isSelected ? "border-indigo-500 ring-2 ring-indigo-200" : "border-slate-200"
                        }`}
                      >
                        <img src={getAvatarUrl(preset.url) || ""} alt={preset.name} className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Upload image button */}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Custom Image
                </button>
                {avatarFile && (
                  <span className="text-xs text-slate-400 truncate max-w-[150px]">{avatarFile.name}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Age</label>
            <input
              type="number"
              min="18"
              max="120"
              value={age}
              onChange={(e) => setAge(e.target.value === "" ? "" : parseInt(e.target.value) || "")}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="pt-4 border-t border-slate-50">
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Preferences (comma-separated interests)
          </label>
          <textarea
            value={whatLikes}
            onChange={(e) => setWhatLikes(e.target.value)}
            rows={3}
            placeholder="e.g. Romantic Dates, Spicy Challenges, Pillow Talk"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors resize-none"
          />
        </div>

        {/* Submit */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link
            href={`/users/detail/${uid}`}
            className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-600 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm font-bold shadow-sm shadow-indigo-600/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
