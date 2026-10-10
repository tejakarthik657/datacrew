"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  ShieldCheck, 
  Check, 
  UserPlus 
} from "lucide-react";
import Link from "next/link";

const registerSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[0-9]/, "Must include a number"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const watchedPassword = watch("password") || "";

  // Password requirements real-time validation checks
  const hasMinLength = watchedPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(watchedPassword);
  const hasNumber = /[0-9]/.test(watchedPassword);

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, action: "register" }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.message ?? "Registration failed", {
          description: body.hint,
        });
        return;
      }
      toast.success("Account created — welcome to DataCrew!");
      router.push("/datasets");
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
              background: "rgba(62, 207, 142, 0.12)",
              border: "1px solid rgba(62, 207, 142, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#10b981",
            }}
          >
            <UserPlus size={16} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#10b981" }}>
            New Workspace
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
          Create your account
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
          Deploy autonomous agents on your messy data with zero external data leaks.
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
        <span>or create with email</span>
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
            Work email
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
        <div style={{ marginBottom: 14 }}>
          <label
            htmlFor="password"
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: 6,
            }}
          >
            Create password
          </label>
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
              autoComplete="new-password"
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

        {/* Live Password Strength Requirements Checklist */}
        <div
          style={{
            background: "var(--surface-raised, rgba(0,0,0,0.02))",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 12px",
            marginBottom: 20,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-subtle, #94a3b8)" }}>
            Security Requirements
          </span>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: hasMinLength ? "#10b981" : "var(--text-muted)" }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: hasMinLength ? "rgba(16, 185, 129, 0.2)" : "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Check size={9} style={{ color: hasMinLength ? "#10b981" : "transparent" }} />
              </div>
              <span>8+ chars</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 4, color: hasUppercase ? "#10b981" : "var(--text-muted)" }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: hasUppercase ? "rgba(16, 185, 129, 0.2)" : "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Check size={9} style={{ color: hasUppercase ? "#10b981" : "transparent" }} />
              </div>
              <span>1 uppercase</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 4, color: hasNumber ? "#10b981" : "var(--text-muted)" }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: hasNumber ? "rgba(16, 185, 129, 0.2)" : "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Check size={9} style={{ color: hasNumber ? "#10b981" : "transparent" }} />
              </div>
              <span>1 number</span>
            </div>
          </div>
        </div>

        {/* Privacy Callout */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "8px 10px",
            borderRadius: 6,
            background: "rgba(62, 207, 142, 0.06)",
            border: "1px solid rgba(62, 207, 142, 0.2)",
            marginBottom: 20,
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          <ShieldCheck size={14} style={{ color: "#10b981", flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>Local Guarantee:</strong> Raw datasets and transformations are isolated on your machine without external leakage.
          </span>
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
          <span>{loading ? "Creating workspace…" : "Create Workspace"}</span>
          {!loading && <ArrowRight size={15} />}
        </button>

        {/* Bottom Toggle */}
        <div style={{ textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link
              href="/login"
              style={{ color: "var(--brand, #635bff)", textDecoration: "none", fontWeight: 600 }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
