"use client";
import { env } from "@/lib/env";
import toast from "react-hot-toast";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Save, Palette, Image as ImageIcon, Type } from "lucide-react";

const API = `${env.NEXT_PUBLIC_API_URL}/api/config/app_branding`;

interface BrandingConfig {
  appName: string;
  appVersion: string;
  supportEmail: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
}

const defaultConfig: BrandingConfig = {
  appName: "WePlay",
  appVersion: "1.0.0",
  supportEmail: "support@weplay.app",
  primaryColor: "#5e51d9",
  secondaryColor: "#ffffff",
  logoUrl: "",
};

export default function BrandingSettings() {
  const [config, setConfig] = useState<BrandingConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { data: session } = useSession();

  const load = async () => {
    if (!session?.user) return;
    const token = (session.user as any).backendToken;

    try {
      const res = await fetch(API, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.value) {
          try {
            const parsed = JSON.parse(data.value);
            setConfig({ ...defaultConfig, ...parsed });
          } catch (e) {
            console.error("Failed to parse branding config", e);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [session]);

  const saveConfig = async () => {
    if (!session?.user) return;
    const token = (session.user as any).backendToken;
    
    setSaving(true);
    setSuccess(false);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ value: JSON.stringify(config) })
      });
      if (!res.ok) throw new Error("Failed to save");
      setSuccess(true);
      toast.success("Branding settings saved!");
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      toast.error("Failed to save branding settings.");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof BrandingConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#5e51d9]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <Palette className="w-8 h-8 text-[#5e51d9]" /> App Branding
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            Customize the look and feel of the mobile application.
          </p>
        </div>
        <button
          onClick={saveConfig}
          disabled={saving}
          className="bg-[#5e51d9] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-[#4d42b3] transition-colors disabled:opacity-50 text-sm font-semibold shadow-sm shadow-indigo-500/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {success ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8">
        
        {/* App Identity Section */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Type className="w-4 h-4 text-slate-400" /> Identity & Contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-2 block">App Name</label>
              <input 
                type="text" 
                value={config.appName}
                onChange={(e) => updateField('appName', e.target.value)}
                placeholder="e.g. WePlay"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5e51d9] focus:ring-1 focus:ring-[#5e51d9] transition-all"
              />
              <p className="text-xs text-slate-400 mt-2">Appears on splash screen and headers.</p>
            </div>
            
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-2 block">App Version</label>
              <input 
                type="text" 
                value={config.appVersion}
                onChange={(e) => updateField('appVersion', e.target.value)}
                placeholder="e.g. 1.0.0"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5e51d9] focus:ring-1 focus:ring-[#5e51d9] transition-all"
              />
              <p className="text-xs text-slate-400 mt-2">Displayed in the About page.</p>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-500 mb-2 block">Support Email</label>
              <input 
                type="email" 
                value={config.supportEmail}
                onChange={(e) => updateField('supportEmail', e.target.value)}
                placeholder="e.g. support@weplay.app"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5e51d9] focus:ring-1 focus:ring-[#5e51d9] transition-all"
              />
              <p className="text-xs text-slate-400 mt-2">Dedicated email shown on the Support page.</p>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Colors Section */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Palette className="w-4 h-4 text-slate-400" /> Color Scheme
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-2 block">Primary Color</label>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg border border-slate-200 shadow-sm overflow-hidden flex-shrink-0"
                  style={{ backgroundColor: config.primaryColor }}
                >
                  <input 
                    type="color" 
                    value={config.primaryColor}
                    onChange={(e) => updateField('primaryColor', e.target.value)}
                    className="opacity-0 w-full h-full cursor-pointer"
                  />
                </div>
                <input 
                  type="text" 
                  value={config.primaryColor}
                  onChange={(e) => updateField('primaryColor', e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5e51d9] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-2 block">Secondary Color</label>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg border border-slate-200 shadow-sm overflow-hidden flex-shrink-0"
                  style={{ backgroundColor: config.secondaryColor }}
                >
                  <input 
                    type="color" 
                    value={config.secondaryColor}
                    onChange={(e) => updateField('secondaryColor', e.target.value)}
                    className="opacity-0 w-full h-full cursor-pointer"
                  />
                </div>
                <input 
                  type="text" 
                  value={config.secondaryColor}
                  onChange={(e) => updateField('secondaryColor', e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5e51d9] transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Logo Section */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-slate-400" /> Application Logo
          </h3>
          <div className="max-w-md space-y-4">
            <label className="text-xs font-semibold text-slate-500 block">Upload Logo Image</label>
            <div className="flex items-center gap-4">
              <label className="flex-1 cursor-pointer">
                <div className="border-2 border-dashed border-slate-200 hover:border-[#5e51d9] bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center transition-all text-center">
                  <ImageIcon className="w-6 h-6 text-slate-400 mb-2" />
                  <span className="text-sm font-medium text-slate-600">Click to upload logo</span>
                  <span className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!session?.user) return;
                    
                    const token = (session.user as any).backendToken;
                    const fd = new FormData();
                    fd.append("file", file);
                    
                    try {
                      // Note: using the same base URL as the other API endpoints
                      const uploadApiUrl = API.replace("/config/app_branding", "/upload");
                      const res = await fetch(uploadApiUrl, {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${token}` },
                        body: fd
                      });
                      if (!res.ok) throw new Error("Failed to upload");
                      const data = await res.json();
                      const baseUrl = API.replace("/api/config/app_branding", "");
                      updateField('logoUrl', baseUrl + data.url);
                      toast.success("Logo uploaded!");
                    } catch (err) {
                      toast.error("Failed to upload logo.");
                    }
                  }}
                />
              </label>
            </div>
            
            {config.logoUrl && (
              <div className="mt-4 p-4 border border-slate-100 rounded-2xl bg-slate-50 inline-block">
                <p className="text-xs text-slate-400 mb-2">Preview</p>
                <img 
                  src={config.logoUrl} 
                  alt="App Logo" 
                  className="max-h-24 object-contain rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://placehold.co/200x80?text=Invalid+Image+URL";
                  }}
                />
              </div>
            )}
            <p className="text-xs text-slate-400">
              The logo will appear on the splash screen and headers. It should ideally be a PNG with a transparent background.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
