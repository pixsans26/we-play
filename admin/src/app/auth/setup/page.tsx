"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [done, setDone] = useState(false);

  // If admin already exists, redirect to login
  useEffect(() => {
    fetch("/api/admin/check")
      .then(r => r.json())
      .then(d => {
        if (d.hasAdmin) router.replace("/auth/login");
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) return setError("Passwords do not match.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");

    setLoading(true);
    const res = await fetch("/api/admin/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) return setError(data.error || "Registration failed. Please try again.");

    setDone(true);
    setTimeout(() => router.push("/auth/login"), 2000);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}>
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}>
        <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Account Created!</h2>
        <p className="text-slate-400 text-sm">Redirecting you to login...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}>
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/3 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md flex flex-col space-y-4 justify-center items-center">
        {/* Logo */}
        <div className="flex flex-col justify-center items-center space-y-2 mb-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-2xl mb-2"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight text-center">First-Time Setup</h1>
          <p className="text-slate-400 mt-1 text-sm text-center">Create your admin account to get started</p>
        </div>

        {/* Notice banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl text-sm text-amber-300 w-full"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <span className="text-lg leading-none">🔒</span>
          <span>This page is only accessible once. After creating your account, it will be disabled permanently.</span>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 shadow-2xl border border-white/10 w-full"
          style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)" }}>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="Your full name"
                className="w-full rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 border border-white/10 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition"
                style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@yourapp.com"
                className="w-full rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 border border-white/10 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition"
                style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} required value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters"
                  className="w-full rounded-xl px-4 py-3 pr-12 text-white text-sm placeholder-slate-500 border border-white/10 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition"
                  style={{ background: "rgba(255,255,255,0.06)" }} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Password strength indicators */}
              {password && (
                <div className="mt-2 flex gap-1">
                  {[8, 12, 16].map((len, i) => (
                    <div key={i} className="flex-1 h-1 rounded-full transition-all"
                      style={{ background: password.length >= len ? (i === 0 ? "#f59e0b" : i === 1 ? "#10b981" : "#7c3aed") : "rgba(255,255,255,0.1)" }} />
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Confirm Password</label>
              <input type={showPw ? "text" : "password"} required value={confirm}
                onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password"
                className="w-full rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 border border-white/10 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition"
                style={{ background: "rgba(255,255,255,0.06)" }} />
              {confirm && password !== confirm && (
                <p className="text-xs text-red-400 mt-1.5">⚠ Passwords don't match</p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl text-sm text-red-400"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <span>⚠️</span> {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading || (confirm.length > 0 && password !== confirm)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50 mt-2"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 8px 32px rgba(124,58,237,0.3)" }}>
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
              ) : (
                "Create Admin Account →"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          WePlay · Admin Panel
        </p>
      </div>
    </div>
  );
}
