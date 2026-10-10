"use client";

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send, Bot, User, Code, Table } from "lucide-react";
import { toast } from "sonner";
import { post } from "@/lib/api/client";
import { ApiError } from "@/lib/api/client";

interface ChatResult {
  answer: string;
  sql?: string;
  columns?: string[];
  rows?: unknown[][];
  source_row_keys?: string[];
  chart_spec?: unknown;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  result?: ChatResult;
}

interface AskTabProps {
  datasetId: string;
}

export function AskTab({ datasetId }: AskTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showSql, setShowSql] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const askMutation = useMutation({
    mutationFn: (question: string) =>
      post<ChatResult>(`/datasets/${datasetId}/chat`, { question }),
    onSuccess: (result, question) => {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: question },
        { role: "assistant", content: result.answer, result },
      ]);
      setInput("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Question failed";
      toast.error(msg);
    },
  });

  const send = () => {
    const q = input.trim();
    if (!q || askMutation.isPending) return;
    askMutation.mutate(q);
  };

  const SUGGESTED = [
    "How many rows have missing values?",
    "What are the top 5 cities by count?",
    "Show me rows where email is invalid",
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxWidth: 800,
        margin: "0 auto",
        padding: "0 24px",
      }}
    >
      {/* Message thread */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 0" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
            <Bot size={40} style={{ marginBottom: 16, opacity: 0.4 }} />
            <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
              Ask anything about your data
            </p>
            <p style={{ margin: "0 0 24px", fontSize: 13 }}>
              I&apos;ll answer in plain English and show you the SQL I used.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  style={{
                    padding: "6px 14px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-full)",
                    fontSize: 12,
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              marginBottom: 20,
              display: "flex",
              gap: 12,
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: msg.role === "user" ? "var(--brand)" : "var(--surface-raised)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {msg.role === "user" ? <User size={14} color="#fff" /> : <Bot size={14} color="var(--agent-analyst)" />}
            </div>

            {/* Content */}
            <div style={{ maxWidth: "80%", minWidth: 0 }}>
              <div
                style={{
                  background: msg.role === "user" ? "var(--brand)" : "var(--surface)",
                  border: `1px solid ${msg.role === "user" ? "transparent" : "var(--border)"}`,
                  borderRadius: "var(--radius-card)",
                  padding: "12px 14px",
                  color: msg.role === "user" ? "#fff" : "var(--text-body)",
                  fontSize: 14,
                  lineHeight: 1.55,
                }}
              >
                {msg.content}
              </div>

              {/* SQL toggle */}
              {msg.result?.sql && (
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={() => setShowSql(showSql === String(i) ? null : String(i))}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 12,
                      color: "var(--text-muted)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px 0",
                    }}
                  >
                    <Code size={12} />
                    {showSql === String(i) ? "Hide" : "Show"} SQL
                  </button>
                  {showSql === String(i) && (
                    <pre
                      style={{
                        marginTop: 6,
                        padding: "10px 14px",
                        background: "var(--canvas-soft)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-body)",
                        overflowX: "auto",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {msg.result.sql}
                    </pre>
                  )}
                </div>
              )}

              {/* Source rows */}
              {msg.result?.rows && msg.result.rows.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 12, color: "var(--text-muted)" }}>
                    <Table size={12} />
                    {msg.result.rows.length} source rows
                  </div>
                  <div style={{ overflowX: "auto", maxHeight: 200 }}>
                    <table style={{ borderCollapse: "collapse", fontSize: 12, fontFamily: "var(--font-mono)" }}>
                      <thead>
                        <tr>
                          {msg.result.columns?.map((col) => (
                            <th key={col} style={{ padding: "4px 10px", textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap", fontWeight: 600 }}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {msg.result.rows.slice(0, 10).map((row, ri) => (
                          <tr key={ri}>
                            {(row as unknown[]).map((cell, ci) => (
                              <td key={ci} style={{ padding: "4px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-body)", whiteSpace: "nowrap" }}>
                                {String(cell ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          padding: "12px 0 20px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-card)",
            padding: "8px 8px 8px 14px",
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask a question about your data…"
            aria-label="Question input"
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              fontSize: 14,
              color: "var(--text)",
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || askMutation.isPending}
            aria-label="Send question"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              background: input.trim() && !askMutation.isPending ? "var(--brand)" : "var(--surface-active)",
              border: "none",
              borderRadius: "var(--radius-md)",
              cursor: input.trim() && !askMutation.isPending ? "pointer" : "not-allowed",
              transition: "background 120ms ease",
            }}
          >
            <Send size={14} color={input.trim() && !askMutation.isPending ? "#fff" : "var(--text-disabled)"} />
          </button>
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-subtle)", paddingLeft: 4 }}>
          Not enough data is an allowed answer. Queries run on your data only — no data sent to AI without masking.
        </p>
      </div>
    </div>
  );
}
