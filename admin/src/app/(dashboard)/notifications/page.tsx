"use client";

import { useState } from "react";
import { Send, Bell, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { env } from "@/lib/env";

export default function NotificationsPage() {
  const { data: session } = useSession();
  const token = session?.user ? (session.user as any).backendToken : "";

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Please provide both a title and message.");
      return;
    }

    if (!token) {
      toast.error("You must be logged in to send notifications.");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/notifications/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title, body }),
      });

      const res = await response.json();
      if (!response.ok || res.error) throw new Error(res.error || "Failed to send notification.");

      toast.success(`Successfully sent to ${res.count} user(s)!`);
      setTitle("");
      setBody("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send notification.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
          <Bell className="w-6 h-6 text-[#5e51d9]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Push Notifications</h1>
          <p className="text-slate-500 text-sm mt-1">Broadcast messages to all app users.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        <form onSubmit={handleSend} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Notification Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New Features Available!"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5e51d9] focus:bg-white transition-all text-slate-700 placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Message Body</label>
            <textarea
              required
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message here..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5e51d9] focus:bg-white transition-all text-slate-700 placeholder:text-slate-400 resize-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <p className="text-sm text-slate-500 w-8/12">
              This message will be delivered immediately to all users who have enabled push notifications.
            </p>
            <button
              type="submit"
              disabled={isSending}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#5e51d9] to-indigo-500 hover:from-indigo-600 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 hover:shadow-xl hover:scale-105 active:scale-95"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Broadcast
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
