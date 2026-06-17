"use client";
import { useState, useEffect } from "react";
import { X, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { env } from "@/lib/env";
import ModalPortal from "@/components/ModalPortal";

interface Couple {
  id: number;
  partnerAUid: string;
  partnerBUid: string | null;
  partnerAName: string;
  partnerBName: string | null;
  partnerAAge: number | null;
  partnerBAge: number | null;
  partnerAGender: string | null;
  partnerBGender: string | null;
  partnerAAvatar: string | null;
  partnerBAvatar: string | null;
  whatALikes: string | null;
  whatBLikes: string | null;
  createdAt?: string;
}

interface Props {
  isOpen: boolean;
  couple: Couple | null;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditCoupleModal({ isOpen, couple, token, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState<any>({
    partnerAName: "",
    partnerAAge: "",
    partnerAGender: "",
    whatALikes: "",
    partnerBName: "",
    partnerBAge: "",
    partnerBGender: "",
    whatBLikes: ""
  });
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (couple) {
      setFormData({
        partnerAName: couple.partnerAName || "",
        partnerAAge: couple.partnerAAge || "",
        partnerAGender: couple.partnerAGender || "",
        whatALikes: couple.whatALikes || "",
        partnerBName: couple.partnerBName || "",
        partnerBAge: couple.partnerBAge || "",
        partnerBGender: couple.partnerBGender || "",
        whatBLikes: couple.whatBLikes || "",
      });
      setFileA(null);
      setFileB(null);
    }
  }, [couple]);

  if (!isOpen || !couple) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      data.append("id", couple.id.toString());
      data.append("partnerAUid", couple.partnerAUid);

      data.append("partnerAName", formData.partnerAName);
      if (formData.partnerAAge) data.append("partnerAAge", formData.partnerAAge);
      if (formData.partnerAGender) data.append("partnerAGender", formData.partnerAGender);
      if (formData.whatALikes) data.append("whatALikes", formData.whatALikes);

      if (formData.partnerBName) data.append("partnerBName", formData.partnerBName);
      if (formData.partnerBAge) data.append("partnerBAge", formData.partnerBAge);
      if (formData.partnerBGender) data.append("partnerBGender", formData.partnerBGender);
      if (formData.whatBLikes) data.append("whatBLikes", formData.whatBLikes);

      if (fileA) data.append("partnerAAvatar", fileA);
      if (fileB) data.append("partnerBAvatar", fileB);

      const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/couple`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: data
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        alert("Failed to update user");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating user");
    }
    setLoading(false);
  };

  const renderAvatarInput = (label: string, file: File | null, existingUrl: string | null, setFile: (f: File | null) => void) => {
    const previewUrl = file ? URL.createObjectURL(file) : (existingUrl ? `${env.NEXT_PUBLIC_API_URL}${existingUrl}` : null);
    
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700">{label} Avatar</label>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <div className="flex-1">
            <label className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors text-sm font-medium w-full">
              <Upload className="w-4 h-4" />
              {file ? file.name : "Upload Image"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
              }} />
            </label>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Edit User Profile</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="editUserForm" onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8">
            
            {/* PARTNER A */}
            <div className="flex-1 space-y-5">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-lg font-bold text-indigo-600">Partner A</h3>
                <p className="text-xs text-slate-500 font-mono mt-1">Email: {couple.partnerAUid}</p>
              </div>
              
              {renderAvatarInput("Partner A", fileA, couple.partnerAAvatar, setFileA)}

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1">Name</label>
                  <input required name="partnerAName" value={formData.partnerAName} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-slate-700 block mb-1">Age</label>
                    <input type="number" name="partnerAAge" value={formData.partnerAAge} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-slate-700 block mb-1">Gender</label>
                    <input name="partnerAGender" value={formData.partnerAGender} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1">Interests</label>
                  <input name="whatALikes" value={formData.whatALikes} onChange={handleChange} placeholder="e.g. Travel, Movies, Food" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800" />
                </div>
              </div>
            </div>

            {/* DIVIDER */}
            <div className="hidden md:block w-px bg-slate-100"></div>

            {/* PARTNER B */}
            <div className="flex-1 space-y-5">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-lg font-bold text-pink-600">Partner B</h3>
                <p className="text-xs text-slate-500 font-mono mt-1">Email: {couple.partnerBUid || "Not invited yet"}</p>
              </div>

              {renderAvatarInput("Partner B", fileB, couple.partnerBAvatar, setFileB)}

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1">Name</label>
                  <input name="partnerBName" value={formData.partnerBName} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-slate-800" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-slate-700 block mb-1">Age</label>
                    <input type="number" name="partnerBAge" value={formData.partnerBAge} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-slate-800" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-slate-700 block mb-1">Gender</label>
                    <input name="partnerBGender" value={formData.partnerBGender} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-slate-800" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1">Interests</label>
                  <input name="whatBLikes" value={formData.whatBLikes} onChange={handleChange} placeholder="e.g. Travel, Movies, Food" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-slate-800" />
                </div>
              </div>
            </div>

          </form>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} disabled={loading} className="px-5 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button form="editUserForm" type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
