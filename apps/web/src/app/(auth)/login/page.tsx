"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  KeyRound 
} from "lucide-react";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>}>
      <LoginFormContent />
    </Suspense>
  );
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/datasets";

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, action: "login" }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.message ?? "Login failed", {
          description: body.hint,
        });
        return;
      }
      toast.success("Welcome back to DataCrew!");
      router.push(next);
    } catch {
      toast.error("Network error — check your connection");
    } finally {
      setLoading(false);
    }
  };


  const handleGoogleSignIn = async () => {
    try {
      const res = await fetch("/api/proxy/auth/google/url");
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        const errorMsg =
          typeof data.detail === "object"
            ? data.detail?.message
            : data.detail || data.message || "Google OAuth is not configured on the server. Please set GOOGLE_CLIENT_ID in Render backend settings.";
        toast.error(errorMsg);
      }
    } catch {
      toast.error("Failed to connect to Google OAuth server. Check your network or backend logs.");
    }
  };

  return (
    <div style={{ fontFamily: "var(--font-ui)" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(99, 91, 255, 0.12)",
              border: "1px solid rgba(99, 91, 255, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--brand, #635bff)",
            }}
          >
            <KeyRound size={16} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--brand, #635bff)" }}>
            Secure Portal
          </span>
        </div>

        <h1
          style={{
            margin: "0 0 6px",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--text)",
            letterSpacing: "-0.4px",
          }}
        >
          Welcome back
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
          Sign in to access your autonomous data agents and cryptographic ledger.
        </p>
      </div>

      {/* Continue with Google Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        style={{
          width: "100%",
          padding: "10px 16px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md, 8px)",
          color: "var(--text)",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          marginBottom: 16,
          transition: "all 120ms ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--border-focus)";
          e.currentTarget.style.background = "var(--surface-hover)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.background = "var(--surface)";
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        <span>Continue with Google</span>
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, color: "var(--text-subtle)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span>or sign in with email</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>



      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Email Field */}
        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="email"
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: 6,
            }}
          >
            Email address
          </label>
          <div style={{ position: "relative" }}>
            <Mail
              size={15}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-subtle, #94a3b8)",
              }}
            />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              {...register("email")}
              style={{
                width: "100%",
                padding: "9px 12px 9px 36px",
                background: "var(--bg)",
                border: `1px solid ${errors.email ? "var(--danger)" : "var(--border)"}`,
                borderRadius: "var(--radius-md, 8px)",
                color: "var(--text)",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 120ms ease, box-shadow 120ms ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--brand, #635bff)")}
              onBlur={(e) => (e.target.style.borderColor = errors.email ? "var(--danger)" : "var(--border)")}
            />
          </div>
          {errors.email && (
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--danger)" }}>
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              Password
            </label>
          </div>
          <div style={{ position: "relative" }}>
            <Lock
              size={15}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-subtle, #94a3b8)",
              }}
            />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••••"
              {...register("password")}
              style={{
                width: "100%",
                padding: "9px 36px 9px 36px",
                background: "var(--bg)",
                border: `1px solid ${errors.password ? "var(--danger)" : "var(--border)"}`,
                borderRadius: "var(--radius-md, 8px)",
                color: "var(--text)",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 120ms ease, box-shadow 120ms ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--brand, #635bff)")}
              onBlur={(e) => (e.target.style.borderColor = errors.password ? "var(--danger)" : "var(--border)")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-subtle, #94a3b8)",
                padding: 2,
                display: "flex",
                alignItems: "center",
              }}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.password && (
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--danger)" }}>
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px 16px",
            background: loading ? "var(--text-disabled, #64748b)" : "linear-gradient(135deg, #635bff 0%, #8b5cf6 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: "var(--radius-md, 8px)",
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: "0 2px 8px rgba(99, 91, 255, 0.35)",
            transition: "opacity 120ms ease",
          }}
        >
          <span>{loading ? "Authenticating…" : "Sign In to Workspace"}</span>
          {!loading && <ArrowRight size={15} />}
        </button>

        {/* Bottom Toggle */}
        <div style={{ textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
            Don't have a workspace?{" "}
            <Link
              href="/register"
              style={{ color: "var(--brand, #635bff)", textDecoration: "none", fontWeight: 600 }}
            >
              Create an account
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
