"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Plus, Link, Database, RefreshCw, Globe, ShieldCheck, Sparkles, FileText, Code, ChevronDown, ChevronUp, SlidersHorizontal, Layers, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { get, post, del } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/queryKeys";
import { formatDate, formatNumber, formatScore } from "@/lib/format";
import { ApiError } from "@/lib/api/client";

interface Dataset {
  id: string;
  name: string;
  rows: number;
  columns?: string[];
  score: number;
  current_version: number;
  created_at: string;
  updated_at?: string;
}

export function DatasetsClient() {
  const router = useRouter();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [httpMethod, setHttpMethod] = useState<"GET" | "POST">("GET");
  const [showHttpAdvanced, setShowHttpAdvanced] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [customHeaders, setCustomHeaders] = useState("");
  const [requestBody, setRequestBody] = useState("");
  const [importing, setImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<Dataset | null>(null);

  const { data: datasets, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.datasets(),
    queryFn: () => get<Dataset[]>("/datasets"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del<{ status: string; id: string }>(`/datasets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.datasets() });
      toast.success("Dataset deleted successfully");
      setDatasetToDelete(null);
    },
    onError: (err: ApiError) => {
      toast.error(`Failed to delete dataset: ${err.message}`);
    },
  });

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return post<Dataset>("/datasets", fd);
    },
    onSuccess: (ds) => {
      toast.success(`Uploaded — health score ${formatScore(ds.score)}`);
      qc.invalidateQueries({ queryKey: queryKeys.datasets() });
      router.push(`/datasets/${ds.id}/clean`);
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Upload failed";
      const hint = err instanceof ApiError ? err.hint : undefined;
      toast.error(msg, { description: hint });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  const handleUrlImport = async () => {
    if (!urlInput.trim()) return;
    setImporting(true);
    try {
      let parsedHeaders: Record<string, string> | undefined = undefined;
      if (apiKey.trim()) {
        const token = apiKey.trim();
        parsedHeaders = {
          Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
        };
      }
      if (customHeaders.trim()) {
        try {
          if (customHeaders.trim().startsWith("{")) {
            parsedHeaders = { ...(parsedHeaders || {}), ...JSON.parse(customHeaders) };
          } else {
            const lines = customHeaders.split("\n");
            const map: Record<string, string> = { ...(parsedHeaders || {}) };
            for (const line of lines) {
              const idx = line.indexOf(":");
              if (idx > 0) {
                map[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
              }
            }
            parsedHeaders = map;
          }
        } catch {
          toast.error("Invalid headers format — use 'Header: Value' or JSON");
          setImporting(false);
          return;
        }
      }

      const payload: {
        url: string;
        method?: string;
        headers?: Record<string, string>;
        body?: string;
      } = {
        url: urlInput.trim(),
        method: httpMethod,
      };
      if (parsedHeaders && Object.keys(parsedHeaders).length > 0) {
        payload.headers = parsedHeaders;
      }
      if (httpMethod === "POST" && requestBody.trim()) {
        payload.body = requestBody.trim();
      }

      const ds = await post<Dataset>("/datasets/from-url", payload);
      toast.success(`Imported ${formatNumber(ds.rows)} rows — health score ${formatScore(ds.score)}`);
      qc.invalidateQueries({ queryKey: queryKeys.datasets() });
      setShowUrlDialog(false);
      setUrlInput("");
      setApiKey("");
      setCustomHeaders("");
      setRequestBody("");
      router.push(`/datasets/${ds.id}/clean`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Import failed";
      const hint = err instanceof ApiError ? err.hint : undefined;
      toast.error(msg, { description: hint });
    } finally {
      setImporting(false);
    }
  };

  // Load demo dataset
  const loadDemo = async () => {
    try {
      const res = await fetch("/demo/dirty_customers.csv");
      if (!res.ok) throw new Error("Demo file not found — run make demo-data");
      const blob = await res.blob();
      uploadMutation.mutate(new File([blob], "dirty_customers.csv"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load demo");
    }
  };

  const isUploading = uploadMutation.isPending;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 36px" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.5px" }}>
            Datasets
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.4 }}>
            Upload files, paste public URLs, or connect data sources for automated cleaning and governance.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={loadDemo}
            disabled={isUploading}
            style={ghostBtnStyle}
            title="Load dirty_customers.csv sample data"
          >
            <Sparkles size={14} style={{ color: "var(--brand)" }} />
            <span>Load Demo Dataset</span>
          </button>

          <button
            onClick={() => setShowUrlDialog(true)}
            style={ghostBtnStyle}
            title="Import from URL or API"
          >
            <Globe size={14} />
            <span>From URL / API</span>
          </button>

          <input
            ref={fileRef}
            type="file"
            hidden
            accept=".csv,.xlsx,.xls,.json,.parquet,.tsv"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
            style={primaryBtnStyle(isUploading)}
          >
            <Upload size={14} />
            <span>{isUploading ? "Uploading…" : "Upload File"}</span>
          </button>
        </div>
      </div>

      {/* Upload progress bar */}
      {isUploading && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                background: "var(--brand)",
                width: uploadProgress != null ? `${uploadProgress}%` : "60%",
                transition: "width 300ms ease",
                animation: uploadProgress == null ? "indeterminate 1.5s ease-in-out infinite" : undefined,
              }}
            />
          </div>
        </div>
      )}

      {/* Drop zone (when no datasets) */}
      {!isLoading && datasets?.length === 0 && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) uploadMutation.mutate(file);
          }}
          style={{
            border: isDragging ? "2px dashed var(--brand, #635bff)" : "2px dashed var(--border)",
            borderRadius: "var(--radius-modal, 12px)",
            padding: "64px 32px",
            textAlign: "center",
            marginBottom: 24,
            cursor: "pointer",
            background: isDragging ? "rgba(99, 91, 255, 0.05)" : "var(--surface)",
            boxShadow: isDragging ? "0 0 24px rgba(99, 91, 255, 0.12)" : "var(--shadow-card, 0 1px 3px rgba(0,0,0,0.04))",
            transition: "all 150ms ease",
          }}
          onClick={() => fileRef.current?.click()}
        >
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 16,
              background: isDragging ? "rgba(99, 91, 255, 0.15)" : "rgba(99, 91, 255, 0.08)",
              border: "1px solid rgba(99, 91, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
              color: "var(--brand, #635bff)",
              transition: "all 150ms ease",
            }}
          >
            <Upload size={26} />
          </div>

          <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.2px" }}>
            Drop your dataset here, or click to browse
          </h3>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-muted)", maxWidth: 500, marginInline: "auto" }}>
            Automatically profiles anomalies, data health scores, and PII with zero external leakage.
          </p>

          {/* Formats chips */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
            {["CSV", "XLSX", "JSON", "Parquet", "TSV"].map((fmt) => (
              <span
                key={fmt}
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 6,
                  background: "var(--surface-raised, rgba(0,0,0,0.04))",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                {fmt}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              style={primaryBtnStyle(isUploading)}
            >
              <Upload size={14} />
              <span>Browse Files</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowUrlDialog(true); }}
              style={ghostBtnStyle}
            >
              <Globe size={14} />
              <span>Import from URL or API</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); loadDemo(); }}
              style={ghostBtnStyle}
            >
              <Sparkles size={14} style={{ color: "var(--brand)" }} />
              <span>Try with dirty_customers.csv</span>
            </button>
          </div>
        </div>
      )}

      {/* Dataset grid */}
      {isLoading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 18 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 140, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-card, 12px)", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      )}

      {error && (
        <div style={{ padding: 20, background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--radius-card, 12px)", color: "var(--danger)", fontSize: 13 }}>
          Failed to load datasets. <button onClick={() => refetch()} style={{ background: "none", border: "none", color: "var(--brand)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Retry</button>
        </div>
      )}

      {datasets && datasets.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 18 }}>
          {datasets.map((ds) => (
            <article
              key={ds.id}
              onClick={() => router.push(`/datasets/${ds.id}/clean`)}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-card, 12px)",
                padding: "20px",
                cursor: "pointer",
                transition: "all 140ms ease",
                boxShadow: "var(--shadow-card, 0 1px 3px rgba(0,0,0,0.04))",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 16,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "var(--brand, #635bff)";
                el.style.boxShadow = "0 8px 24px rgba(99, 91, 255, 0.08)";
                el.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "var(--border)";
                el.style.boxShadow = "var(--shadow-card, 0 1px 3px rgba(0,0,0,0.04))";
                el.style.transform = "none";
              }}
            >
              {/* Card top bar */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: "rgba(99, 91, 255, 0.08)",
                  border: "1px solid rgba(99, 91, 255, 0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--brand, #635bff)",
                  flexShrink: 0,
                }}>
                  <Database size={20} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ds.name}
                  </h2>
                  <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
                    {formatNumber(ds.rows)} rows · {ds.columns?.length ?? 0} columns
                  </p>
                </div>

                {/* Score badge & Delete option */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    padding: "3px 9px",
                    borderRadius: "var(--radius-full, 9999px)",
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono, monospace)",
                    background: (ds.score ?? 0) >= 80 ? "var(--success-bg)" : (ds.score ?? 0) >= 50 ? "var(--warning-bg)" : "var(--danger-bg)",
                    color: (ds.score ?? 0) >= 80 ? "var(--success)" : (ds.score ?? 0) >= 50 ? "var(--warning)" : "var(--danger)",
                    border: `1px solid ${(ds.score ?? 0) >= 80 ? "var(--success-border)" : (ds.score ?? 0) >= 50 ? "var(--warning-border)" : "var(--danger-border)"}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}>
                    <ShieldCheck size={12} />
                    <span>{formatScore(ds.score ?? 0)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDatasetToDelete(ds);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: "5px",
                      borderRadius: "6px",
                      color: "var(--text-subtle)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 120ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--danger)";
                      e.currentTarget.style.background = "var(--danger-bg)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--text-subtle)";
                      e.currentTarget.style.background = "transparent";
                    }}
                    title="Delete Dataset"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Card Footer */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: 12,
                borderTop: "1px solid var(--border)",
                fontSize: 12,
              }}>
                <span style={{ color: "var(--text-subtle)" }}>
                  Updated {formatDate(ds.updated_at || ds.created_at)}
                </span>
                <span style={{ fontWeight: 600, color: "var(--brand, #635bff)" }}>
                  Clean & Analyze &rarr;
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Universal URL & API Import Dialog */}
      {showUrlDialog && (
        <div
          role="dialog"
          aria-label="Import data from Web URL or REST API"
          aria-modal
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowUrlDialog(false); }}
        >
          <div style={{
            width: 580, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto",
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-modal, 12px)", padding: 26,
            boxShadow: "var(--shadow-modal, 0 20px 40px rgba(0,0,0,0.12))",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "rgba(99, 91, 255, 0.12)", border: "1px solid rgba(99, 91, 255, 0.25)",
                display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand, #635bff)"
              }}>
                <Globe size={17} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                  Universal Web & HTTP Data Importer
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                  Extract structured datasets from any site, REST API endpoint, CSV stream, or web application.
                </p>
              </div>
            </div>

            {/* Supported formats tags */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "14px 0 16px" }}>
              {[
                { label: "HTML Tables & Cards", color: "#635bff" },
                { label: "REST APIs & JSON", color: "#0284c7" },
                { label: "CSV / TSV Streams", color: "#16a34a" },
                { label: "Next.js / Hydration", color: "#8b5cf6" },
              ].map((badge) => (
                <span
                  key={badge.label}
                  style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                    background: `${badge.color}12`, color: badge.color, border: `1px solid ${badge.color}30`
                  }}
                >
                  {badge.label}
                </span>
              ))}
            </div>

            {/* HTTP Method + URL Input Bar */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <div style={{
                display: "flex", background: "var(--surface-raised, rgba(0,0,0,0.03))",
                border: "1px solid var(--border)", borderRadius: "var(--radius-md, 8px)", padding: 2
              }}>
                {(["GET", "POST"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setHttpMethod(m)}
                    style={{
                      padding: "6px 10px", fontSize: 11, fontWeight: 700, borderRadius: 6,
                      border: "none", cursor: "pointer",
                      background: httpMethod === m ? "var(--brand, #635bff)" : "transparent",
                      color: httpMethod === m ? "#fff" : "var(--text-muted)",
                      transition: "all 120ms ease"
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://api.example.com/v1/data or https://site.com/table"
                autoFocus
                style={{
                  flex: 1, padding: "9px 12px",
                  background: "var(--bg)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md, 8px)", color: "var(--text)", fontSize: 13,
                  outline: "none", fontFamily: "var(--font-mono, monospace)"
                }}
                onKeyDown={(e) => e.key === "Enter" && handleUrlImport()}
              />
            </div>

            {/* Preset 1-Click Examples */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-subtle)", display: "block", marginBottom: 6 }}>
                1-click test endpoints:
              </span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { label: "DummyJSON Products", url: "https://dummyjson.com/products", method: "GET" as const },
                  { label: "Typicode Users", url: "https://jsonplaceholder.typicode.com/users", method: "GET" as const },
                  { label: "Open-Meteo Weather", url: "https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.00&hourly=temperature_2m,relative_humidity_2m", method: "GET" as const },
                  { label: "Wikipedia GDP Table", url: "https://en.wikipedia.org/wiki/List_of_countries_by_GDP_(nominal)", method: "GET" as const },
                  { label: "GitHub Commits", url: "https://api.github.com/repos/pallets/flask/commits?per_page=15", method: "GET" as const },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setUrlInput(item.url);
                      setHttpMethod(item.method);
                    }}
                    style={{
                      padding: "3px 8px", fontSize: 11, fontWeight: 500, borderRadius: 4,
                      background: "var(--surface-raised, rgba(0,0,0,0.02))",
                      border: "1px solid var(--border)", color: "var(--text-muted)",
                      cursor: "pointer", transition: "all 120ms ease"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "var(--text)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced HTTP Options Accordion */}
            <div style={{
              marginBottom: 16, border: "1px solid var(--border)", borderRadius: "var(--radius-md, 8px)",
              overflow: "hidden", background: "var(--surface-raised, rgba(0,0,0,0.01))"
            }}>
              <button
                type="button"
                onClick={() => setShowHttpAdvanced((prev) => !prev)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "9px 12px", background: "transparent", border: "none",
                  cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <SlidersHorizontal size={13} style={{ color: "var(--brand)" }} />
                  <span>Advanced HTTP Options (Auth, Custom Headers, Payload)</span>
                </div>
                {showHttpAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showHttpAdvanced && (
                <div style={{ padding: "0 12px 12px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-subtle)", margin: "8px 0 4px" }}>
                      Bearer Token / API Key (optional)
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="e.g. sk_live_... or Bearer token"
                      style={{
                        width: "100%", padding: "7px 10px", fontSize: 12, boxSizing: "border-box",
                        background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6,
                        color: "var(--text)", fontFamily: "var(--font-mono, monospace)"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-subtle)", marginBottom: 4 }}>
                      Custom Request Headers (one per line or JSON)
                    </label>
                    <textarea
                      rows={2}
                      value={customHeaders}
                      onChange={(e) => setCustomHeaders(e.target.value)}
                      placeholder={"Accept: application/json\nX-Custom-Tenant: prod-east"}
                      style={{
                        width: "100%", padding: "7px 10px", fontSize: 12, boxSizing: "border-box",
                        background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6,
                        color: "var(--text)", fontFamily: "var(--font-mono, monospace)", resize: "vertical"
                      }}
                    />
                  </div>

                  {httpMethod === "POST" && (
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-subtle)", marginBottom: 4 }}>
                        POST Request Body (JSON)
                      </label>
                      <textarea
                        rows={3}
                        value={requestBody}
                        onChange={(e) => setRequestBody(e.target.value)}
                        placeholder={'{"query": "SELECT *", "limit": 100}'}
                        style={{
                          width: "100%", padding: "7px 10px", fontSize: 12, boxSizing: "border-box",
                          background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6,
                          color: "var(--text)", fontFamily: "var(--font-mono, monospace)", resize: "vertical"
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reassurance Note */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 10px", borderRadius: 6, background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.2)", marginBottom: 18, fontSize: 11, color: "#15803d"
            }}>
              <ShieldCheck size={14} style={{ flexShrink: 0 }} />
              <span>robots.txt verified • SSRF multi-hop protection • SHA-256 Source Passport cryptographically sealed</span>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowUrlDialog(false); setUrlInput(""); }}
                style={ghostBtnStyle}
                disabled={importing}
              >
                Cancel
              </button>
              <button
                onClick={handleUrlImport}
                disabled={importing || !urlInput.trim()}
                style={primaryBtnStyle(importing || !urlInput.trim())}
              >
                {importing ? "Connecting & Ingesting…" : "Connect & Ingest"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dataset Confirmation Modal */}
      {datasetToDelete && (
        <div
          role="dialog"
          aria-label="Delete Dataset Confirmation"
          aria-modal
          style={{
            position: "fixed", inset: 0, zIndex: 110,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setDatasetToDelete(null); }}
        >
          <div style={{
            width: 440, maxWidth: "90vw",
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-modal, 12px)", padding: 24,
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--danger)", marginBottom: 12 }}>
              <Trash2 size={20} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Delete Dataset?</h3>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px", lineHeight: 1.5 }}>
              Are you sure you want to delete <strong style={{ color: "var(--text)" }}>{datasetToDelete.name}</strong>? This action cannot be undone. All parquet files, versions, cleaning plans, and forecast records will be permanently erased.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setDatasetToDelete(null)}
                style={ghostBtnStyle}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(datasetToDelete.id)}
                disabled={deleteMutation.isPending}
                style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "var(--danger)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes indeterminate { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
      `}</style>
    </div>
  );
}

// ── Shared button styles ──
const primaryBtnStyle = (disabled: boolean): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "7px 14px", background: disabled ? "var(--text-disabled)" : "var(--brand)",
  color: "#fff", border: "none", borderRadius: "var(--radius-md)",
  fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
  transition: "background 120ms ease", whiteSpace: "nowrap",
});

const ghostBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "7px 14px", background: "transparent",
  color: "var(--text-muted)", border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 500,
  cursor: "pointer", transition: "background 120ms ease, color 120ms ease",
  whiteSpace: "nowrap",
};
