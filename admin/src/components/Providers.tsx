"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { env } from "@/lib/env";
import { ConfirmProvider } from "./ConfirmProvider";

export function Providers({ children, session }: { children: React.ReactNode, session?: any }) {
  useEffect(() => {
    const sseUrl = `${env.NEXT_PUBLIC_API_URL}/api/admin/events`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "NEW_USER" || data.type === "TASK_COMPLETED") {
          toast.success(data.message, {
            icon: data.type === "NEW_USER" ? '👋' : '🎉',
            duration: 5000,
          });
        }
      } catch (err) {
        console.error("Failed to parse SSE message:", err);
      }
    };

    eventSource.onerror = (err) => {
      // Silently handle SSE connection errors (e.g. if endpoint doesn't exist on staging yet)
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <SessionProvider session={session}>
      <ConfirmProvider>
        {children}
      </ConfirmProvider>
      <Toaster 
        position="top-right" 
        toastOptions={{
          className: '',
          style: {
            background: '#ffffff',
            color: '#334155',
            fontWeight: '600',
            fontSize: '14px',
            borderRadius: '16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            padding: '16px 20px',
            border: '1px solid #f1f5f9'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
            style: {
              borderLeft: '4px solid #10b981',
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
            style: {
              borderLeft: '4px solid #ef4444',
            }
          },
        }}
      />
    </SessionProvider>
  );
}
