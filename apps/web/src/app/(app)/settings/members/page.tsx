"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, UserPlus, Shield, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { get, post, ApiError } from "@/lib/api/client";

interface Member {
  email: string;
  role: "viewer" | "editor" | "admin" | "owner" | string;
}

export default function MembersPage() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");

  const { data: members, isLoading } = useQuery({
    queryKey: ["workspace", "members"],
    queryFn: () => get<Member[]>("/workspaces/members"),
  });

  const addMemberMutation = useMutation({
    mutationFn: () => post("/workspaces/members", { email: email.trim(), role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace", "members"] });
      setEmail("");
      toast.success("Member added to workspace");
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to add member";
      toast.error(msg);
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    addMemberMutation.mutate();
  };

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", padding: "24px 0" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px", color: "var(--text)" }}>
          Workspace Members & Roles
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
          Manage collaborative access. Role permissions: Viewer (read-only), Editor (clean, plan & apply), Admin (settings & DB ingest).
        </p>
      </div>

      {/* Add Member Form */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px", color: "var(--text)" }}>
          Invite Member
        </h3>
        <form onSubmit={handleAdd} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@company.com"
            style={{
              flex: 1,
              minWidth: 240,
              padding: "8px 12px",
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              color: "var(--text)",
              fontSize: 13,
              outline: "none",
            }}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              color: "var(--text)",
              fontSize: 13,
              outline: "none",
            }}
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={!email.trim() || addMemberMutation.isPending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              background: email.trim() && !addMemberMutation.isPending ? "var(--brand)" : "var(--surface-active)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontSize: 13,
              fontWeight: 600,
              cursor: email.trim() && !addMemberMutation.isPending ? "pointer" : "not-allowed",
            }}
          >
            <UserPlus size={14} />
            {addMemberMutation.isPending ? "Inviting…" : "Add Member"}
          </button>
        </form>
      </div>

      {/* Members List */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: 13, color: "var(--text)" }}>
          Active Team Members
        </div>
        {isLoading ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>Loading members…</div>
        ) : !members || members.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>No members found.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {members.map((m, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 18px",
                  borderBottom: idx === members.length - 1 ? "none" : "1px solid var(--hairline)",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{m.email}</div>
                </div>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "var(--radius-full)",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    background: "rgba(99, 91, 255, 0.1)",
                    color: "var(--brand)",
                    border: "1px solid rgba(99, 91, 255, 0.3)",
                  }}
                >
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
