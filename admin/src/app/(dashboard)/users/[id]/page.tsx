"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

const API_COUPLE_BY_ID = "http://localhost:4000/api/couples";
const API_COUPLE_SAVE = "http://localhost:4000/api/couple";

export default function EditCouplePage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [couple, setCouple] = useState<any>(null);

  const load = async () => {
    if (!session?.user) return;
    const token = (session.user as any).backendToken;
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_COUPLE_BY_ID}/${id}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCouple(data);
      } else {
        router.push("/users");
      }
    } catch (e) {
      console.error(e);
      router.push("/users");
    }
    setLoading(false);
  };

  useEffect(() => { if (session?.user) load(); }, [session, id]);

  const handleChange = (field: string, value: string | number) => {
    setCouple({ ...couple, [field]: value });
  };

  const saveProfile = async () => {
    if (!session?.user || !couple) return;
    const token = (session.user as any).backendToken;

    setSaving(true);
    try {
      const res = await fetch(API_COUPLE_SAVE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(couple)
      });
      if (res.ok) {
        alert("Couple profile updated successfully!");
        router.refresh();
      } else {
        alert("Failed to update profile.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to update profile.");
    }
    setSaving(false);
  };

  if (loading || !couple) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#5e51d9]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/users" className="text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Users
          </Link>
          <h1 className="text-2xl font-normal text-slate-800 tracking-tight flex items-center gap-3">
            Edit Couple Profile <span className="text-[28px]">💑</span>
          </h1>
        </div>
        <button
          onClick={saveProfile}
          disabled={saving}
          className="bg-[#5e51d9] text-white px-5 py-2 rounded-xl flex items-center gap-2 hover:bg-[#4d42b3] transition-colors disabled:opacity-50 text-sm font-medium shadow-sm shadow-indigo-500/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Partner A */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-full bg-pink-100 text-pink-700 font-bold flex items-center justify-center text-xl">
              A
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Partner A</h3>
              <p className="text-xs text-slate-500">{couple.partnerAUid}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
            <input
              type="text"
              value={couple.partnerAName || ""}
              onChange={(e) => handleChange("partnerAName", e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#5e51d9] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Age</label>
              <input
                type="number"
                value={couple.partnerAAge || ""}
                onChange={(e) => handleChange("partnerAAge", parseInt(e.target.value) || "")}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#5e51d9] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Gender</label>
              <select
                value={couple.partnerAGender || ""}
                onChange={(e) => handleChange("partnerAGender", e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#5e51d9] transition-colors"
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">What they like</label>
            <textarea
              value={couple.whatALikes || ""}
              onChange={(e) => handleChange("whatALikes", e.target.value)}
              rows={3}
              placeholder="E.g., romantic dinners, long walks, back massages..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#5e51d9] transition-colors resize-none"
            />
          </div>
        </div>

        {/* Partner B */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xl">
              B
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Partner B</h3>
              <p className="text-xs text-slate-500">{couple.partnerBUid || "Not connected yet"}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
            <input
              type="text"
              value={couple.partnerBName || ""}
              onChange={(e) => handleChange("partnerBName", e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#5e51d9] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Age</label>
              <input
                type="number"
                value={couple.partnerBAge || ""}
                onChange={(e) => handleChange("partnerBAge", parseInt(e.target.value) || "")}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#5e51d9] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Gender</label>
              <select
                value={couple.partnerBGender || ""}
                onChange={(e) => handleChange("partnerBGender", e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#5e51d9] transition-colors"
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">What they like</label>
            <textarea
              value={couple.whatBLikes || ""}
              onChange={(e) => handleChange("whatBLikes", e.target.value)}
              rows={3}
              placeholder="E.g., surprises, movie nights, forehead kisses..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#5e51d9] transition-colors resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
