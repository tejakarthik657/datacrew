"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", color: "var(--text)" }}>
        <p>Connecting to Google OAuth…</p>
      </div>
    }>
      <GoogleCallbackContent />
    </Suspense>
  );
}

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    if (error) {
      toast.error("Google authentication cancelled or failed", { description: error });
      router.push("/login");
      return;
    }

    if (!code) {
      toast.error("Invalid Google OAuth callback: No authorization code received");
      router.push("/login");
      return;
    }

    async function processCode() {
      try {
        const res = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "google", code }),
        });

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.message ?? "Google authentication failed", { description: data.hint });
          router.push("/login");
          return;
        }

        toast.success("Successfully logged in with Google!");
        router.push("/datasets");
      } catch (err) {
        toast.error("Failed to complete Google sign-in process");
        router.push("/login");
      } finally {
        setProcessing(false);
      }
    }

    processCode();
  }, [code, error, router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "var(--font-ui)",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: "rgba(99, 91, 255, 0.12)",
          border: "1px solid rgba(99, 91, 255, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--brand)",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      >
        <Sparkles size={24} />
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
        {processing ? "Verifying Google Account…" : "Redirecting to Workspace…"}
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
        Generating secure JWT token and establishing workspace session.
      </p>
    </div>
  );
}
