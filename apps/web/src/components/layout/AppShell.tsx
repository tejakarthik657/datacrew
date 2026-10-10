"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export interface AppUser {
  id: string;
  email: string;
  role: "viewer" | "editor" | "admin" | "owner";
  workspace_id?: string;
}

interface AppShellProps {
  user: AppUser;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg)",
        fontFamily: "var(--font-ui)",
      }}
    >
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        userRole={user.role}
      />

      {/* Main area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Top header */}
        <Header user={user} />

        {/* Content */}
        <main
          id="main-content"
          tabIndex={-1}
          style={{
            flex: 1,
            overflow: "auto",
            position: "relative",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
