"use client";
import { env } from "@/lib/env";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Save, Loader2, HelpCircle, MessageCircle,
  Shield, BookOpen, Heart, CheckCircle2, Eye, Edit3, Lightbulb
} from "lucide-react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const API = `${env.NEXT_PUBLIC_API_URL}/api/config`;

const CONFIG_KEYS = [
  {
    key: "faq",
    label: "FAQ",
    description: "Frequently asked questions shown in the app",
    icon: HelpCircle,
    color: "indigo",
    gradient: "from-indigo-500 to-blue-500",
    bgLight: "bg-indigo-50",
    textColor: "text-indigo-700",
    borderColor: "border-indigo-200",
    activeBg: "bg-indigo-600",
  },
  {
    key: "support",
    label: "Support",
    description: "Support info & contact details",
    icon: MessageCircle,
    color: "emerald",
    gradient: "from-emerald-500 to-teal-500",
    bgLight: "bg-emerald-50",
    textColor: "text-emerald-700",
    borderColor: "border-emerald-200",
    activeBg: "bg-emerald-600",
  },
  {
    key: "privacy",
    label: "Privacy Policy",
    description: "Data privacy and terms of use",
    icon: Shield,
    color: "violet",
    gradient: "from-violet-500 to-purple-600",
    bgLight: "bg-violet-50",
    textColor: "text-violet-700",
    borderColor: "border-violet-200",
    activeBg: "bg-violet-600",
  },
  {
    key: "help",
    label: "Help Center",
    description: "App guides and how-to articles",
    icon: BookOpen,
    color: "amber",
    gradient: "from-amber-500 to-orange-500",
    bgLight: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
    activeBg: "bg-amber-500",
  },
  {
    key: "about",
    label: "About",
    description: "About the app, version & team info",
    icon: Heart,
    color: "rose",
    gradient: "from-rose-500 to-pink-600",
    bgLight: "bg-rose-50",
    textColor: "text-rose-700",
    borderColor: "border-rose-200",
    activeBg: "bg-rose-600",
  },
];

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "clean"],
    [{ color: [] }],
  ],
};

// ── Matches the app's DEFAULT_CONTENT exactly ──────────────────────────────
const DEFAULT_CONTENT: Record<string, string> = {
  faq: `<h2>What is WePlay?</h2>
<p>WePlay is a fun and intimate game designed for couples. Scratch cards to reveal surprise tasks, challenges, and moments you can enjoy together!</p>
<h2>How does it work?</h2>
<p>Simply scratch the card to reveal a task or image. Complete the task together before the timer runs out, then hit Done to earn points and level up!</p>
<h2>What happens when I skip?</h2>
<p>Skipping a task is completely free — it won't count against you. The task goes back into the pool and may appear again later. Perfect if a task doesn't feel right in the moment.</p>
<h2>How do we level up?</h2>
<p>Every completed task earns you progress toward the next level. Higher levels unlock more exciting and adventurous tasks!</p>
<h2>Is my data private?</h2>
<p>Absolutely. Your couple profile and game history are stored securely and are only visible to you and your partner. We never share your data with third parties.</p>
<h2>Can we reset our progress?</h2>
<p>Yes! Go to Settings → Reset Progress to start fresh. This will clear your history and reset your level back to 1.</p>`,

  support: `<h2>Contact Us</h2>
<p>Having trouble? We're here to help! Reach out to our support team and we'll get back to you within 24 hours.</p>
<h2>Email Support</h2>
<p>Send us an email at <strong>support@weplay.app</strong> and describe the issue you're experiencing.</p>
<h2>Report a Bug</h2>
<p>If you've found a bug, please include: your device model, app version (found in Settings), and a description of what happened.</p>
<h2>Feature Requests</h2>
<p>We'd love to hear your ideas! Send your feature requests to <strong>ideas@weplay.app</strong>.</p>
<h2>Common Issues</h2>
<p><strong>App not loading?</strong> Try closing and reopening the app, or check your internet connection.</p>
<p><strong>Tasks not appearing?</strong> Make sure you've completed your couple profile setup in Settings.</p>
<p><strong>Partner not connecting?</strong> Both partners need to sign up with the same couple invite code.</p>`,

  privacy: `<h2>Privacy Policy</h2>
<p>Last updated: June 2025</p>
<h2>Information We Collect</h2>
<p>We collect only the information necessary to provide our service: your email address, couple profile details (names, ages, preferences), and game history.</p>
<h2>How We Use Your Information</h2>
<p>Your data is used solely to power the app experience — matching you with your partner, tracking game progress, and personalizing task recommendations.</p>
<h2>Data Storage &amp; Security</h2>
<p>All data is stored on secure, encrypted servers. We use industry-standard security practices to protect your information.</p>
<h2>Data Sharing</h2>
<p>We never sell or share your personal data with third parties. Your intimate game history is strictly private between you and your partner.</p>
<h2>Your Rights</h2>
<p>You can request deletion of all your data at any time through Settings → Delete Account. This permanently removes all your data from our servers.</p>
<h2>Contact</h2>
<p>For privacy concerns, contact us at <strong>privacy@weplay.app</strong></p>`,

  help: `<h2>Getting Started</h2>
<p>Welcome to WePlay! Here's everything you need to know to get the most out of the app.</p>
<h2>Playing the Games</h2>
<p><strong>Task Scratch:</strong> Scratch the card to reveal a fun challenge. Complete it before the timer runs out!</p>
<p><strong>Image Scratch:</strong> Scratch to reveal a surprise image. Your partner performs the task shown!</p>
<p><strong>Spin Wheel:</strong> Spin the wheel and complete whatever task it lands on — together!</p>
<p><strong>Lottery:</strong> Pick cards from columns to create a unique, randomized challenge.</p>
<h2>Levels &amp; Progress</h2>
<p>Every completed task earns you points. Earn enough points to level up and unlock more exciting, adventurous tasks at higher levels.</p>
<h2>Timer</h2>
<p>Each task has a countdown timer. Try to complete the task before time runs out. Don't worry — you can always skip if something doesn't feel right!</p>
<h2>Taking Turns</h2>
<p>The game automatically alternates turns between you and your partner. The current player's name is always shown at the top of the game screen.</p>
<h2>Resetting</h2>
<p>Want a fresh start? Head to Settings → Reset Progress to clear your history and start from Level 1 again.</p>`,

  about: `<h2>About WePlay</h2>
<p>WePlay is a love game designed to bring couples closer through fun, playful, and intimate shared experiences.</p>
<h2>Our Mission</h2>
<p>We believe that the best relationships are built on shared experiences, laughter, and genuine connection. WePlay is designed to help couples explore, connect, and create memories together.</p>
<h2>The Games</h2>
<p>From scratch cards to spin wheels, every game is crafted to spark joy, intimacy, and playfulness in your relationship.</p>
<h2>Made with Love</h2>
<p>WePlay is built by a small team passionate about relationship wellness and gamified connection. Every feature is designed with real couples in mind.</p>
<h2>Version</h2>
<p>App Version: 1.0.0</p>
<p>© 2025 WePlay. All rights reserved.</p>`,
};

export default function AppContentPage() {
  const { data: session } = useSession();
  const token = session?.user ? (session.user as any).backendToken : "";

  const [activeTab, setActiveTab] = useState(CONFIG_KEYS[0].key);
  const [contents, setContents] = useState<Record<string, string>>({});
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set()); // tracks which have server-saved content
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [preview, setPreview] = useState(false);

  const activeMeta = CONFIG_KEYS.find((k) => k.key === activeTab)!;

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const fetched: Record<string, string> = {};
      const saved = new Set<string>();
      await Promise.all(
        CONFIG_KEYS.map(async (item) => {
          const res = await fetch(`${API}/${item.key}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const serverValue = res.ok ? (await res.json()).value || "" : "";
          if (serverValue.trim()) {
            // Has custom saved content
            fetched[item.key] = serverValue;
            saved.add(item.key);
          } else {
            // Show default content so admin sees what's live in the app
            fetched[item.key] = DEFAULT_CONTENT[item.key] || "";
          }
        })
      );
      setContents(fetched);
      setSavedKeys(saved);
    } catch {
      setErrorMsg("Failed to load content");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const res = await fetch(`${API}/${activeTab}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: contents[activeTab] || "" }),
      });
      if (res.ok) {
        setSuccessMsg(`${activeMeta.label} saved successfully!`);
        setSavedKeys((prev) => new Set([...prev, activeTab])); // mark as saved
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg("Save failed. Please try again.");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* ── Page header ────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">App Content</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage the content shown on FAQ, Support, Privacy Policy, Help & About pages in the app
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPreview((p) => !p)}
            className={`flex items-center gap-2 font-medium px-4 py-2.5 rounded-xl border transition-all text-sm ${
              preview
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {preview ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {preview ? "Edit" : "Preview"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className={`flex items-center gap-2 bg-gradient-to-r ${activeMeta.gradient} text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg transition-all disabled:opacity-60 text-sm hover:shadow-xl hover:scale-105 active:scale-95`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ── Status messages ────────────────────────────────── */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* ── Main editor ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex min-h-[620px]">

        {/* Left sidebar — page selector */}
        <div className="w-64 bg-slate-50 border-r border-slate-100 flex flex-col p-4 gap-2 shrink-0">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Pages</p>
          {CONFIG_KEYS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            const hasContent = (contents[item.key] || "").trim().length > 0;
            return (
              <button
                key={item.key}
                onClick={() => { setActiveTab(item.key); setSuccessMsg(""); setErrorMsg(""); setPreview(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all text-left relative ${
                  isActive
                    ? `${item.activeBg} text-white shadow-md`
                    : `text-slate-600 hover:${item.bgLight} hover:${item.textColor}`
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{item.label}</div>
                  <div className={`text-xs truncate mt-0.5 ${isActive ? "text-white/70" : "text-slate-400"}`}>
                    {item.description}
                  </div>
                </div>
                {hasContent && (
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isActive
                        ? "bg-white/60"
                        : savedKeys.has(item.key)
                        ? "bg-emerald-400"
                        : "bg-amber-400"
                    }`}
                    title={savedKeys.has(item.key) ? "Custom saved" : "Showing app default"}
                  />
                )}
              </button>
            );
          })}

          {/* Stats */}
          <div className="mt-auto pt-4 border-t border-slate-100 space-y-1.5">
            <p className="text-xs text-slate-400 px-3">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1.5 align-middle" />
              {savedKeys.size} custom saved
            </p>
            <p className="text-xs text-slate-400 px-3">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1.5 align-middle" />
              {CONFIG_KEYS.length - savedKeys.size} using app default
            </p>
          </div>
        </div>

        {/* Right editor/preview pane */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Pane header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r ${activeMeta.gradient} bg-opacity-5`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${activeMeta.gradient} flex items-center justify-center shadow-sm`}>
                <activeMeta.icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  {preview ? "Preview:" : "Editing:"} {activeMeta.label}
                </h2>
                <p className="text-xs text-slate-500">{activeMeta.description}</p>
              </div>
            </div>
            <div className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
              savedKeys.has(activeTab)
                ? `${activeMeta.bgLight} ${activeMeta.textColor}`
                : "bg-amber-50 text-amber-700"
            }`}>
              {savedKeys.has(activeTab) ? "Custom saved" : "Showing app default"}
            </div>
          </div>

          {/* Editor/Preview area */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center h-full text-slate-400 gap-3 py-20">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-sm">Loading content...</p>
              </div>
            ) : preview ? (
              <div
                className="p-8 prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: contents[activeTab] || "<p class='text-slate-400 italic'>No content yet. Switch to edit mode to add content.</p>" }}
              />
            ) : (
              <div className="flex flex-col h-full">
                <style global jsx>{`
                  .ql-toolbar { border: none !important; border-bottom: 1px solid #f1f5f9 !important; background: #f8fafc; padding: 12px 16px !important; }
                  .ql-container { border: none !important; font-size: 15px; flex: 1; }
                  .ql-editor { color: #334155; min-height: 450px; padding: 20px 24px; line-height: 1.75; }
                  .ql-editor p { margin-bottom: 10px; }
                  .ql-editor h1, .ql-editor h2, .ql-editor h3 { font-weight: 700; margin: 16px 0 8px; }
                  .quill { display: flex; flex-direction: column; flex: 1; height: 100%; }
                `}</style>
                <ReactQuill
                  theme="snow"
                  value={contents[activeTab] || ""}
                  onChange={(val) => setContents((prev) => ({ ...prev, [activeTab]: val }))}
                  placeholder={`Write ${activeMeta.label} content here... Use headings, bullet lists, and links to structure the content.`}
                  modules={QUILL_MODULES}
                  style={{ flex: 1 }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tips ────────────────────────────────────────────── */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
        <p className="text-sm font-semibold text-blue-700 mb-1.5 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" /> Content Tips
        </p>
        <ul className="text-sm text-blue-600 space-y-1">
          <li>• Use <strong>H2 headings</strong> to separate sections — they display in the app as colored section titles</li>
          <li>• Keep paragraphs short and scannable — mobile users skim content</li>
          <li>• For <strong>Support</strong>, always include an email address so users can reach you</li>
          <li>• For <strong>Privacy Policy</strong>, include your data retention and deletion policies</li>
          <li>• Changes are <strong>live immediately</strong> after saving — no app update needed</li>
        </ul>
      </div>
    </div>
  );
}
