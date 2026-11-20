"use client";

import { env } from "@/lib/env";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import DataTable from "@/components/DataTable";
import ModalPortal from "@/components/ModalPortal";
import {
  Plus, Dices, Loader2, X, Filter, Search, Star,
  Trophy, Flag, ShieldCheck, Heart, Sparkles, RefreshCw, Clock, Users,
  Map as MapIcon, List, Edit3, Check, Flame, MessageSquareHeart, ChevronLeft, ChevronRight, Save, Trash2,
  Upload, Image as ImageIcon
} from "lucide-react";

interface LudoTask {
  id: number;
  stepNumber: number | null;
  stepType: "normal" | "star" | "home_entry" | "home_stretch" | "home";
  title: string;
  description: string;
  category: string;
  performer: "lander" | "partner" | "both";
  timerSeconds: number;
  level: number;
  imageUrl?: string | null;
  categoryImageUrl?: string | null;
  active: boolean;
  createdAt: string;
}

const STEP_TYPES = [
  { id: "all", label: "All Steps" },
  { id: "normal", label: "Normal Track", icon: Dices, color: "bg-slate-100 text-slate-700 border-slate-200" },
  { id: "star", label: "⭐ Safe Stars", icon: Star, color: "bg-amber-50 text-amber-800 border-amber-200" },
  { id: "home_entry", label: "🏁 Home Entry", icon: Flag, color: "bg-blue-50 text-blue-800 border-blue-200" },
  { id: "home_stretch", label: "❤️ Home Stretch", icon: Heart, color: "bg-rose-50 text-rose-800 border-rose-200" },
  { id: "home", label: "🏆 Home Goal", icon: Trophy, color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
];

const CATEGORIES = [
  "Lick",
  "Kiss",
  "Intimate",
  "Dare",
  "Truth",
  "Romantic",
  "Physical",
  "Fun",
  "Deep",
  "Reward",
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Lick: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "#e11d48" },
  Kiss: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200", dot: "#ec4899" },
  Intimate: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", dot: "#a855f7" },
  Dare: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "#f97316" },
  Truth: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "#6366f1" },
  Romantic: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "#10b981" },
  Physical: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", dot: "#06b6d4" },
  Fun: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "#f59e0b" },
  Deep: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "#3b82f6" },
  Reward: { bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-300", dot: "#eab308" },
};

// 52 Track grid coordinates [col, row] (0-14)
const TRACK_COORDS: Array<[number, number]> = [
  [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],  // 0-4 (Steps 1-5)
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], // 5-10 (Steps 6-11)
  [0, 7],                                        // 11 (Step 12: Red Gateway)
  [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], // 12-17 (Steps 13-18)
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], // 18-23 (Steps 19-24)
  [7, 0],                                        // 24 (Step 25: Green Gateway)
  [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], // 25-30 (Steps 26-31)
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], // 31-36 (Steps 32-37)
  [14, 7],                                       // 37 (Step 38: Yellow Gateway)
  [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], // 38-43 (Steps 39-44)
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], // 44-49 (Steps 45-50)
  [7, 14],                                       // 50 (Step 51: Blue Gateway)
  [6, 14]                                        // 51 (Step 52)
];

const SAFE_STAR_STEPS = [1, 9, 14, 22, 27, 35, 40, 48];
const GATEWAY_STEPS = [12, 120, 25, 250, 38, 380, 51, 510];
const HOME_MILESTONES = [901, 902, 903, 904];

// Home run paths [col, row]
const HOME_RUN_CELLS: Record<string, Array<{ stepNumber: number; col: number; row: number }>> = {
  red: [
    { stepNumber: 101, col: 1, row: 7 },
    { stepNumber: 102, col: 2, row: 7 },
    { stepNumber: 103, col: 3, row: 7 },
    { stepNumber: 104, col: 4, row: 7 },
    { stepNumber: 105, col: 5, row: 7 },
  ],
  green: [
    { stepNumber: 101, col: 7, row: 1 },
    { stepNumber: 102, col: 7, row: 2 },
    { stepNumber: 103, col: 7, row: 3 },
    { stepNumber: 104, col: 7, row: 4 },
    { stepNumber: 105, col: 7, row: 5 },
  ],
  yellow: [
    { stepNumber: 101, col: 13, row: 7 },
    { stepNumber: 102, col: 12, row: 7 },
    { stepNumber: 103, col: 11, row: 7 },
    { stepNumber: 104, col: 10, row: 7 },
    { stepNumber: 105, col: 9, row: 7 },
  ],
  blue: [
    { stepNumber: 101, col: 7, row: 13 },
    { stepNumber: 102, col: 7, row: 12 },
    { stepNumber: 103, col: 7, row: 11 },
    { stepNumber: 104, col: 7, row: 10 },
    { stepNumber: 105, col: 7, row: 9 },
  ],
};

const emptyForm: {
  id: number;
  stepNumber: number | string;
  stepType: "normal" | "star" | "home_entry" | "home_stretch" | "home";
  title: string;
  description: string;
  category: string;
  performer: "lander" | "partner" | "both";
  timerSeconds: number;
  level: number;
  imageUrl: string;
  categoryImageUrl: string;
  active: boolean;
} = {
  id: 0,
  stepNumber: "",
  stepType: "normal",
  title: "",
  description: "",
  category: "Intimate",
  performer: "lander",
  timerSeconds: 30,
  level: 1,
  imageUrl: "",
  categoryImageUrl: "",
  active: true,
};

const API = `${env.NEXT_PUBLIC_API_URL}/api/tasks/ludo`;

export default function LudoTasksPage() {
  const [tasks, setTasks] = useState<LudoTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const token = session?.user ? (session.user as any).backendToken : "";

  // View mode: "map" or "table"
  const [viewMode, setViewMode] = useState<"map" | "table">("map");

  // Selected step on board map
  const [selectedStep, setSelectedStep] = useState<number>(1);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Uploading state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingCatIcon, setUploadingCatIcon] = useState(false);

  // Filters for Table View
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stepFilter, setStepFilter] = useState("");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load Ludo tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  // Lookup map by stepNumber
  const tasksByStep = useMemo(() => {
    const map: Record<number, LudoTask> = {};
    for (const t of tasks) {
      if (t.stepNumber !== null) {
        map[t.stepNumber] = t;
      }
    }
    return map;
  }, [tasks]);

  // When selectedStep changes in map mode, preload form with that step's task
  useEffect(() => {
    const existing = tasksByStep[selectedStep];
    if (existing) {
      setForm({
        id: existing.id,
        stepNumber: existing.stepNumber !== null ? existing.stepNumber : selectedStep,
        stepType: existing.stepType,
        title: existing.title,
        description: existing.description,
        category: existing.category,
        performer: existing.performer,
        timerSeconds: existing.timerSeconds,
        level: existing.level,
        imageUrl: existing.imageUrl || "",
        categoryImageUrl: existing.categoryImageUrl || "",
        active: existing.active,
      });
      setEditing(true);
    } else {
      let deducedType: "normal" | "star" | "home_entry" | "home_stretch" | "home" = "normal";
      if (SAFE_STAR_STEPS.includes(selectedStep)) deducedType = "star";
      else if (GATEWAY_STEPS.includes(selectedStep)) deducedType = "home_entry";
      else if (selectedStep >= 101 && selectedStep <= 105) deducedType = "home_stretch";
      else if (selectedStep >= 900) deducedType = "home";

      setForm({
        ...emptyForm,
        stepNumber: selectedStep,
        stepType: deducedType,
        title: `Step ${selectedStep} Challenge`,
      });
      setEditing(false);
    }
  }, [selectedStep, tasksByStep]);

  // Handle generic image upload to /api/upload
  const handleFileUpload = async (file: File, field: "imageUrl" | "categoryImageUrl") => {
    if (!file || !token) return;
    if (field === "imageUrl") setUploadingImage(true);
    else setUploadingCatIcon(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setForm((prev) => ({ ...prev, [field]: data.url }));
      toast.success(field === "imageUrl" ? "Step image uploaded!" : "Category icon uploaded!");
    } catch (err) {
      toast.error("Failed to upload image");
    } finally {
      if (field === "imageUrl") setUploadingImage(false);
      else setUploadingCatIcon(false);
    }
  };

  // Filtering for table
  const filtered = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || t.stepType === typeFilter;
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    const matchesStep =
      !stepFilter ||
      (t.stepNumber !== null && String(t.stepNumber) === stepFilter.trim());
    return matchesSearch && matchesType && matchesCategory && matchesStep;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, categoryFilter, stepFilter]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Please enter both title and description.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          stepNumber: form.stepNumber !== "" ? parseInt(String(form.stepNumber), 10) : null,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to save");
      }

      toast.success(editing ? `Step ${form.stepNumber} task updated!` : `Task for Step ${form.stepNumber} created!`);
      if (showForm) setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to save Ludo task");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`${API}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Ludo task deleted!");
      load();
    } catch (err) {
      toast.error("Failed to delete task");
    }
  };

  const handleSeed = async () => {
    if (!confirm("This will reload/re-seed all default couple tasks across all 52 steps, safe stars, dual gateways, and champion rewards. Continue?")) {
      return;
    }
    setSeeding(true);
    try {
      const res = await fetch(`${API}/seed`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Seeding failed");
      const d = await res.json();
      toast.success(`Successfully seeded ${d.count || 66} Ludo tasks!`);
      load();
    } catch (err) {
      toast.error("Failed to seed default tasks");
    } finally {
      setSeeding(false);
    }
  };

  const openEditModal = (task: LudoTask) => {
    setForm({
      id: task.id,
      stepNumber: task.stepNumber !== null ? task.stepNumber : "",
      stepType: task.stepType,
      title: task.title,
      description: task.description,
      category: task.category,
      performer: task.performer,
      timerSeconds: task.timerSeconds,
      level: task.level,
      imageUrl: task.imageUrl || "",
      categoryImageUrl: task.categoryImageUrl || "",
      active: task.active,
    });
    setEditing(true);
    setShowForm(true);
  };

  const currentTask = tasksByStep[selectedStep];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 text-rose-500 rounded-xl">
              <Dices className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">
                Couples Ludo Board & Task Map
              </h1>
              <p className="text-sm text-slate-500">
                Interactive board map and task editor for every step, safe star, home gateway, and champion victory.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "map"
                  ? "bg-white text-rose-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Board Map</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "table"
                  ? "bg-white text-rose-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Task List</span>
            </button>
          </div>

          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
            title="Reset & seed default spicy intimacy tasks"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${seeding ? "animate-spin text-rose-500" : ""}`} />
            <span className="hidden md:inline">Seed Defaults</span>
          </button>

          <button
            onClick={() => {
              setForm(emptyForm);
              setEditing(false);
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-md shadow-rose-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* ─── INTERACTIVE BOARD MAP VIEW ─── */}
      {viewMode === "map" && (
        <div className="space-y-4">
          {/* Quick Jump Ribbon */}
          <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] mr-1">
              Quick Jump:
            </span>

            {/* Stars */}
            <div className="flex items-center gap-1">
              <span className="text-amber-700 font-bold flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                Stars:
              </span>
              {SAFE_STAR_STEPS.map((s) => (
                <button
                  key={`star-${s}`}
                  onClick={() => setSelectedStep(s)}
                  className={`px-2 py-1 rounded-md transition-all ${
                    selectedStep === s
                      ? "bg-amber-500 text-white font-bold shadow-sm ring-2 ring-amber-300"
                      : "bg-slate-50 text-slate-700 hover:bg-amber-100 border border-slate-200"
                  }`}
                >
                  #{s}
                </button>
              ))}
            </div>

            {/* Gateways */}
            <div className="flex items-center gap-1 ml-2">
              <span className="text-blue-700 font-bold flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                <Flag className="w-3 h-3 text-blue-500" />
                Gateways:
              </span>
              {[
                { label: "Red Own", step: 51 },
                { label: "Red Other", step: 510 },
                { label: "Green Own", step: 12 },
                { label: "Green Other", step: 120 },
                { label: "Yellow Own", step: 25 },
                { label: "Yellow Other", step: 250 },
                { label: "Blue Own", step: 38 },
                { label: "Blue Other", step: 380 },
              ].map(({ label, step }) => (
                <button
                  key={`gw-${step}`}
                  onClick={() => setSelectedStep(step)}
                  className={`px-2 py-1 rounded-md transition-all ${
                    selectedStep === step
                      ? "bg-blue-600 text-white font-bold shadow-sm ring-2 ring-blue-300"
                      : "bg-slate-50 text-slate-700 hover:bg-blue-100 border border-slate-200"
                  }`}
                  title={label}
                >
                  #{step}
                </button>
              ))}
            </div>

            {/* Home Stretch (101 to 105) */}
            <div className="flex items-center gap-1 ml-2">
              <span className="text-rose-700 font-bold flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500/20" />
                Home Stretch:
              </span>
              {[101, 102, 103, 104, 105].map((s) => (
                <button
                  key={`stretch-${s}`}
                  onClick={() => setSelectedStep(s)}
                  className={`px-2 py-1 rounded-md transition-all ${
                    selectedStep === s
                      ? "bg-rose-600 text-white font-bold shadow-sm ring-2 ring-rose-300"
                      : "bg-slate-50 text-slate-700 hover:bg-rose-100 border border-slate-200"
                  }`}
                >
                  #{s}
                </button>
              ))}
            </div>

            {/* Home Arrival Milestones */}
            <div className="flex items-center gap-1 ml-2">
              <span className="text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                <Trophy className="w-3 h-3 text-emerald-600" />
                Home Chips:
              </span>
              {HOME_MILESTONES.map((s, idx) => (
                <button
                  key={`home-${s}`}
                  onClick={() => setSelectedStep(s)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    selectedStep === s
                      ? "bg-emerald-600 text-white font-bold shadow-sm ring-2 ring-emerald-300"
                      : "bg-slate-50 text-slate-700 hover:bg-emerald-100 border border-slate-200"
                  }`}
                >
                  {idx + 1}st Chip ({s})
                </button>
              ))}
            </div>
          </div>

          {/* Map + Live Editor Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Visual Ludo Board Map */}
            <div className="lg:col-span-7 bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Interactive Board Map
                  </span>
                  <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                    Click any tile to edit
                  </span>
                </div>
                {hoveredStep && (
                  <span className="text-xs font-semibold text-rose-600 animate-fade-in">
                    Hovering: Step #{hoveredStep} {tasksByStep[hoveredStep]?.title ? `— ${tasksByStep[hoveredStep]?.title}` : ""}
                  </span>
                )}
              </div>

              {/* 15x15 SVG Ludo Board */}
              <div className="w-full max-w-[520px] aspect-square rounded-2xl overflow-hidden border-2 border-slate-300 shadow-md bg-white select-none">
                <svg viewBox="0 0 600 600" className="w-full h-full">
                  {/* Yard 1: Red (Top-Left) */}
                  <rect x="0" y="0" width="240" height="240" fill="#fef2f2" stroke="#ef4444" strokeWidth="2" />
                  <rect x="25" y="25" width="190" height="190" rx="20" fill="#ffffff" stroke="#ef4444" strokeWidth="2.5" />
                  <text x="120" y="125" fill="#b91c1c" fontSize="18" fontWeight="bold" textAnchor="middle">RED YARD</text>

                  {/* Yard 2: Green (Top-Right) */}
                  <rect x="360" y="0" width="240" height="240" fill="#ecfdf5" stroke="#10b981" strokeWidth="2" />
                  <rect x="385" y="25" width="190" height="190" rx="20" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" />
                  <text x="480" y="125" fill="#047857" fontSize="18" fontWeight="bold" textAnchor="middle">GREEN YARD</text>

                  {/* Yard 3: Blue (Bottom-Left) */}
                  <rect x="0" y="360" width="240" height="240" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" />
                  <rect x="25" y="385" width="190" height="190" rx="20" fill="#ffffff" stroke="#3b82f6" strokeWidth="2.5" />
                  <text x="120" y="485" fill="#1d4ed8" fontSize="18" fontWeight="bold" textAnchor="middle">BLUE YARD</text>

                  {/* Yard 4: Yellow (Bottom-Right) */}
                  <rect x="360" y="360" width="240" height="240" fill="#fffbeb" stroke="#f59e0b" strokeWidth="2" />
                  <rect x="385" y="385" width="190" height="190" rx="20" fill="#ffffff" stroke="#f59e0b" strokeWidth="2.5" />
                  <text x="480" y="485" fill="#b45309" fontSize="18" fontWeight="bold" textAnchor="middle">YELLOW YARD</text>

                  {/* Center Victory Area (Cols 6-8, Rows 6-8 -> (240, 240) to (360, 360)) */}
                  <rect x="240" y="240" width="120" height="120" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                  <polygon points="240,240 300,300 240,360" fill="#ef4444" opacity="0.85" />
                  <polygon points="240,240 300,300 360,240" fill="#10b981" opacity="0.85" />
                  <polygon points="360,240 300,300 360,360" fill="#f59e0b" opacity="0.85" />
                  <polygon points="240,360 300,300 360,360" fill="#3b82f6" opacity="0.85" />

                  {/* Center Circle Button for Home Milestones */}
                  <circle
                    cx="300"
                    cy="300"
                    r="32"
                    fill={selectedStep >= 900 ? "#fef3c7" : "#ffffff"}
                    stroke={selectedStep >= 900 ? "#d97706" : "#e2e8f0"}
                    strokeWidth={selectedStep >= 900 ? "4" : "2"}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => setSelectedStep(904)}
                    onMouseEnter={() => setHoveredStep(904)}
                    onMouseLeave={() => setHoveredStep(null)}
                  />
                  <text x="300" y="296" fontSize="16" textAnchor="middle" fill="#d97706" pointerEvents="none">🏆</text>
                  <text x="300" y="314" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#78350f" pointerEvents="none">HOME</text>

                  {/* Home Run Tiles (Stretch to Home) */}
                  {Object.entries(HOME_RUN_CELLS).map(([colColor, cells]) =>
                    cells.map((cell) => {
                      const x = cell.col * 40;
                      const y = cell.row * 40;
                      const isSelected = selectedStep === cell.stepNumber;
                      const fillColor =
                        colColor === "red" ? "#fee2e2" :
                        colColor === "green" ? "#d1fae5" :
                        colColor === "yellow" ? "#fef3c7" : "#dbeafe";
                      const strokeColor =
                        colColor === "red" ? "#ef4444" :
                        colColor === "green" ? "#10b981" :
                        colColor === "yellow" ? "#f59e0b" : "#3b82f6";

                      return (
                        <g
                          key={`stretch-${colColor}-${cell.stepNumber}`}
                          className="cursor-pointer transition-all"
                          onClick={() => setSelectedStep(cell.stepNumber)}
                          onMouseEnter={() => setHoveredStep(cell.stepNumber)}
                          onMouseLeave={() => setHoveredStep(null)}
                        >
                          <rect
                            x={x}
                            y={y}
                            width="40"
                            height="40"
                            fill={isSelected ? "#fda4af" : fillColor}
                            stroke={isSelected ? "#e11d48" : strokeColor}
                            strokeWidth={isSelected ? "3" : "1"}
                          />
                          <text x={x + 20} y={y + 18} fontSize="9" fontWeight="bold" textAnchor="middle" fill="#be123c">
                            ❤️
                          </text>
                          <text x={x + 20} y={y + 32} fontSize="9" fontWeight="bold" textAnchor="middle" fill="#334155">
                            {cell.stepNumber}
                          </text>
                        </g>
                      );
                    })
                  )}

                  {/* 52 Perimeter Track Cells */}
                  {TRACK_COORDS.map(([col, row], idx) => {
                    const stepNumber = idx + 1;
                    const x = col * 40;
                    const y = row * 40;
                    const isSelected = selectedStep === stepNumber;
                    const isHovered = hoveredStep === stepNumber;
                    const isStar = SAFE_STAR_STEPS.includes(stepNumber);
                    const isGateway = GATEWAY_STEPS.includes(stepNumber);
                    const task = tasksByStep[stepNumber];

                    // Cell colors
                    let cellBg = "#ffffff";
                    if (stepNumber === 1) cellBg = "#fee2e2";
                    else if (stepNumber === 14) cellBg = "#d1fae5";
                    else if (stepNumber === 27) cellBg = "#fef3c7";
                    else if (stepNumber === 40) cellBg = "#dbeafe";
                    else if (isStar) cellBg = "#fffbeb";
                    else if (isGateway) cellBg = "#f0fdf4";

                    return (
                      <g
                        key={`track-cell-${stepNumber}`}
                        className="cursor-pointer transition-all"
                        onClick={() => setSelectedStep(stepNumber)}
                        onMouseEnter={() => setHoveredStep(stepNumber)}
                        onMouseLeave={() => setHoveredStep(null)}
                      >
                        <rect
                          x={x}
                          y={y}
                          width="40"
                          height="40"
                          fill={isSelected ? "#ffe4e6" : cellBg}
                          stroke={isSelected ? "#e11d48" : isHovered ? "#f43f5e" : "#cbd5e1"}
                          strokeWidth={isSelected ? "3" : isHovered ? "2" : "1"}
                        />

                        {/* Star / Gateway / Step number */}
                        {isStar ? (
                          <>
                            <text x={x + 20} y={y + 17} fontSize="12" textAnchor="middle" fill="#d97706">⭐</text>
                            <text x={x + 20} y={y + 32} fontSize="9" fontWeight="bold" textAnchor="middle" fill="#b45309">
                              {stepNumber}
                            </text>
                          </>
                        ) : isGateway ? (
                          <>
                            <text x={x + 20} y={y + 17} fontSize="11" textAnchor="middle" fill="#2563eb">🏁</text>
                            <text x={x + 20} y={y + 32} fontSize="9" fontWeight="bold" textAnchor="middle" fill="#1d4ed8">
                              {stepNumber}
                            </text>
                          </>
                        ) : (
                          <text x={x + 20} y={y + 24} fontSize="11" fontWeight="bold" textAnchor="middle" fill="#334155">
                            {stepNumber}
                          </text>
                        )}

                        {/* Category Indicator Dot */}
                        {task && (
                          <circle
                            cx={x + 32}
                            cy={y + 8}
                            r="3.5"
                            fill={CATEGORY_COLORS[task.category]?.dot || "#ef4444"}
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> ⭐ Safe Star</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> 🏁 Home Gateway</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> ❤️ Home Stretch</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 🏆 Home Goal</span>
              </div>
            </div>

            {/* Live Step Task Editor Panel */}
            <div className="lg:col-span-5 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col space-y-5">
              {/* Step Title Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 font-extrabold text-lg shadow-sm">
                    #{selectedStep}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-800">
                        {selectedStep >= 900
                          ? `Home Milestone (${selectedStep})`
                          : selectedStep >= 101
                          ? `Home Stretch #${selectedStep}`
                          : SAFE_STAR_STEPS.includes(selectedStep)
                          ? `Safe Star #${selectedStep}`
                          : GATEWAY_STEPS.includes(selectedStep)
                          ? `Home Gateway #${selectedStep}`
                          : `Track Step #${selectedStep}`}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400">
                      {currentTask ? "Edit task triggered when chips land here" : "No task mapped yet. Enter details below."}
                    </p>
                  </div>
                </div>

                {/* Step Switcher (< >) */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedStep((s) => (s > 1 && s <= 52 ? s - 1 : s === 1 ? 52 : 1))}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                    title="Previous Step"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedStep((s) => (s >= 1 && s < 52 ? s + 1 : s === 52 ? 1 : 1))}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                    title="Next Step"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Task Form Inputs */}
              <form onSubmit={handleSave} className="space-y-4">
                {/* Task Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Task Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Seductive Neck Nibble"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                  />
                </div>

                {/* Category & Performer */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Category
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Performer
                    </label>
                    <select
                      value={form.performer}
                      onChange={(e) => setForm({ ...form, performer: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                    >
                      <option value="lander">Lander Performs</option>
                      <option value="partner">Partner Performs</option>
                      <option value="both">Both Together</option>
                    </select>
                  </div>
                </div>

                {/* Step Type & Timer */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Step Type
                    </label>
                    <select
                      value={form.stepType}
                      onChange={(e) => setForm({ ...form, stepType: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                    >
                      <option value="normal">Normal Step (1–52)</option>
                      <option value="star">⭐ Safe Star Tile</option>
                      <option value="home_entry">🏁 Home Entry</option>
                      <option value="home_stretch">❤️ Home Stretch</option>
                      <option value="home">🏆 Home Goal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Timer (Seconds)
                    </label>
                    <input
                      type="number"
                      placeholder="0 for none"
                      value={form.timerSeconds}
                      onChange={(e) => setForm({ ...form, timerSeconds: parseInt(e.target.value || "0", 10) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Task Description / Prompt */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Task Prompt / Description
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {form.description.length} chars
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Describe the romantic dare, question, kiss or command..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white leading-relaxed"
                  />
                </div>

                {/* Image Uploads: Step Image & Category Image */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Step Image */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Step / Task Image
                    </label>
                    {form.imageUrl ? (
                      <div className="relative w-full h-24 rounded-lg overflow-hidden border border-slate-200 bg-white group">
                        <img
                          src={form.imageUrl.startsWith("http") ? form.imageUrl : `${env.NEXT_PUBLIC_API_URL}${form.imageUrl}`}
                          alt="Step"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, imageUrl: "" }))}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md opacity-90 hover:opacity-100 shadow-sm"
                          title="Remove image"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 hover:border-rose-400 rounded-lg cursor-pointer bg-white transition-all">
                        {uploadingImage ? (
                          <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                        ) : (
                          <>
                            <Upload className="w-4 h-4 text-slate-400 mb-1" />
                            <span className="text-[11px] font-medium text-slate-500">Upload Step Image</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingImage}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileUpload(f, "imageUrl");
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Category Image / Icon */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Category Image / Icon
                    </label>
                    {form.categoryImageUrl ? (
                      <div className="relative w-full h-24 rounded-lg overflow-hidden border border-slate-200 bg-white group flex items-center justify-center">
                        <img
                          src={form.categoryImageUrl.startsWith("http") ? form.categoryImageUrl : `${env.NEXT_PUBLIC_API_URL}${form.categoryImageUrl}`}
                          alt="Category Icon"
                          className="w-16 h-16 object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, categoryImageUrl: "" }))}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md opacity-90 hover:opacity-100 shadow-sm"
                          title="Remove image"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 hover:border-rose-400 rounded-lg cursor-pointer bg-white transition-all">
                        {uploadingCatIcon ? (
                          <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                        ) : (
                          <>
                            <ImageIcon className="w-4 h-4 text-slate-400 mb-1" />
                            <span className="text-[11px] font-medium text-slate-500">Upload Category Icon</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingCatIcon}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileUpload(f, "categoryImageUrl");
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Active Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="mapTaskActive"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                  />
                  <label htmlFor="mapTaskActive" className="text-xs font-medium text-slate-700 cursor-pointer">
                    Active in gameplay
                  </label>
                </div>

                {/* Save & Delete Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-md shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{editing ? "Save Step Changes" : "Create Task for Step"}</span>
                  </button>

                  {editing && currentTask && (
                    <button
                      type="button"
                      onClick={() => handleDelete(currentTask.id)}
                      className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 transition-all"
                      title="Delete this task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── TABLE LIST VIEW ─── */}
      {viewMode === "table" && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
            {/* Step Type Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {STEP_TYPES.map((type) => {
                const isSelected = typeFilter === type.id;
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setTypeFilter(type.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      isSelected
                        ? "bg-rose-500 text-white shadow-sm"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60"
                    }`}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search & Extra Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by title or task prompt..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="number"
                  placeholder="Step # (1-52)"
                  value={stepFilter}
                  onChange={(e) => setStepFilter(e.target.value)}
                  className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                />

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                >
                  <option value="all">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-2" />
                <p className="text-sm font-medium">Loading Ludo tasks...</p>
              </div>
            ) : (
              <DataTable<LudoTask>
                data={paginated}
                columns={[
                  {
                    key: "stepNumber",
                    label: "Tile / Step",
                    render: (task) => {
                      let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
                      let label = `Step ${task.stepNumber ?? "Any"}`;

                      if (task.stepType === "star") {
                        badgeColor = "bg-amber-50 text-amber-800 border-amber-200";
                        label = `⭐ Star #${task.stepNumber}`;
                      } else if (task.stepType === "home_entry") {
                        badgeColor = "bg-blue-50 text-blue-800 border-blue-200";
                        label = `🏁 Entry #${task.stepNumber}`;
                      } else if (task.stepType === "home_stretch") {
                        badgeColor = "bg-rose-50 text-rose-800 border-rose-200";
                        label = `❤️ Run #${task.stepNumber ?? ""}`;
                      } else if (task.stepType === "home") {
                        badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-200";
                        label = task.stepNumber ? `🏆 Home (${task.stepNumber})` : `🏆 HOME GOAL`;
                      }

                      return (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeColor}`}>
                          {label}
                        </span>
                      );
                    },
                  },
                  {
                    key: "title",
                    label: "Title & Prompt",
                    render: (task) => (
                      <div className="flex items-start gap-3 max-w-md">
                        {task.imageUrl && (
                          <img
                            src={task.imageUrl.startsWith("http") ? task.imageUrl : `${env.NEXT_PUBLIC_API_URL}${task.imageUrl}`}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{task.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {task.description}
                          </p>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "category",
                    label: "Category & Performer",
                    render: (task) => {
                      const cColor = CATEGORY_COLORS[task.category] || { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
                      return (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            {task.categoryImageUrl && (
                              <img
                                src={task.categoryImageUrl.startsWith("http") ? task.categoryImageUrl : `${env.NEXT_PUBLIC_API_URL}${task.categoryImageUrl}`}
                                alt=""
                                className="w-4 h-4 rounded-full object-cover shrink-0"
                              />
                            )}
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cColor.bg} ${cColor.text} ${cColor.border}`}>
                              {task.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span>
                              {task.performer === "lander" ? "Lander" : task.performer === "partner" ? "Partner" : "Both Together"}
                            </span>
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    key: "timerSeconds",
                    label: "Timer",
                    render: (task) => (
                      <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{task.timerSeconds > 0 ? `${task.timerSeconds}s` : "No timer"}</span>
                      </div>
                    ),
                  },
                  {
                    key: "active",
                    label: "Status",
                    render: (task) => (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          task.active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {task.active ? "Active" : "Inactive"}
                      </span>
                    ),
                  },
                ]}
                onEdit={(task) => openEditModal(task)}
                onDelete={handleDelete}
              />
            )}

            {/* Pagination Bar */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Showing {(page - 1) * ITEMS_PER_PAGE + 1} to{" "}
                  {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} tasks
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 rounded-lg text-xs font-medium border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-semibold px-2 text-slate-700">
                    {page} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 rounded-lg text-xs font-medium border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task Edit/Create Modal (for Table view or "New Task" button) */}
      {showForm && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-rose-50 text-rose-500 rounded-lg">
                    <Dices className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">
                      {editing ? "Edit Ludo Task" : "Create New Ludo Task"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Configure dare/challenge triggered when chips land on this tile.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  {/* Step Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Step / Tile Type
                    </label>
                    <select
                      value={form.stepType}
                      onChange={(e) => setForm({ ...form, stepType: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                    >
                      <option value="normal">Normal Step (1–52)</option>
                      <option value="star">⭐ Safe Star Tile</option>
                      <option value="home_entry">🏁 Home Entry Step</option>
                      <option value="home_stretch">❤️ Home Stretch Step</option>
                      <option value="home">🏆 Home Victory</option>
                    </select>
                  </div>

                  {/* Step Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Step Number (1–52, 101–105, 901–904)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 9"
                      value={form.stepNumber}
                      onChange={(e) => setForm({ ...form, stepNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Task Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Safe Zone: French Kiss Sanctuary"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                  />
                </div>

                {/* Category & Performer */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Category
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Performer
                    </label>
                    <select
                      value={form.performer}
                      onChange={(e) => setForm({ ...form, performer: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                    >
                      <option value="lander">Lander Performs</option>
                      <option value="partner">Partner Performs</option>
                      <option value="both">Both Together</option>
                    </select>
                  </div>
                </div>

                {/* Timer Seconds */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Timer (Seconds) — 0 for untimed
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="600"
                    value={form.timerSeconds}
                    onChange={(e) => setForm({ ...form, timerSeconds: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Task Prompt / Description
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Enter the spicy romantic instructions for the couple..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                  />
                </div>

                {/* Image Uploads: Step Image & Category Image */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Step Image */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Step / Task Image
                    </label>
                    {form.imageUrl ? (
                      <div className="relative w-full h-24 rounded-lg overflow-hidden border border-slate-200 bg-white group">
                        <img
                          src={form.imageUrl.startsWith("http") ? form.imageUrl : `${env.NEXT_PUBLIC_API_URL}${form.imageUrl}`}
                          alt="Step"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, imageUrl: "" }))}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md opacity-90 hover:opacity-100 shadow-sm"
                          title="Remove image"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 hover:border-rose-400 rounded-lg cursor-pointer bg-white transition-all">
                        {uploadingImage ? (
                          <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                        ) : (
                          <>
                            <Upload className="w-4 h-4 text-slate-400 mb-1" />
                            <span className="text-[11px] font-medium text-slate-500">Upload Step Image</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingImage}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileUpload(f, "imageUrl");
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Category Image / Icon */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Category Image / Icon
                    </label>
                    {form.categoryImageUrl ? (
                      <div className="relative w-full h-24 rounded-lg overflow-hidden border border-slate-200 bg-white group flex items-center justify-center">
                        <img
                          src={form.categoryImageUrl.startsWith("http") ? form.categoryImageUrl : `${env.NEXT_PUBLIC_API_URL}${form.categoryImageUrl}`}
                          alt="Category Icon"
                          className="w-16 h-16 object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, categoryImageUrl: "" }))}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md opacity-90 hover:opacity-100 shadow-sm"
                          title="Remove image"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 hover:border-rose-400 rounded-lg cursor-pointer bg-white transition-all">
                        {uploadingCatIcon ? (
                          <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                        ) : (
                          <>
                            <ImageIcon className="w-4 h-4 text-slate-400 mb-1" />
                            <span className="text-[11px] font-medium text-slate-500">Upload Category Icon</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingCatIcon}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileUpload(f, "categoryImageUrl");
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Active Checkbox */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="modalTaskActive"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                  />
                  <label htmlFor="modalTaskActive" className="text-xs font-medium text-slate-700 cursor-pointer">
                    Active in gameplay
                  </label>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/20 disabled:opacity-50"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{editing ? "Update Task" : "Create Task"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
