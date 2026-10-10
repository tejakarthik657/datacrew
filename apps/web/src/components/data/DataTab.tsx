"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, History, RotateCcw, Table as TableIcon } from "lucide-react";
import { toast } from "sonner";
import { get, post, ApiError } from "@/lib/api/client";
import { formatNumber, formatScore } from "@/lib/format";

interface RowsResponse {
  total: number;
  columns: string[];
  rows: Record<string, unknown>[];
}

interface VersionItem {
  number: number;
  score: number;
  rows: number;
  step_id?: string;
  created_at?: string;
}

interface VersionsResponse {
  current_version: number;
  versions: VersionItem[];
}

interface DataTabProps {
  datasetId: string;
}

export function DataTab({ datasetId }: DataTabProps) {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const pageSize = 50;

  const { data: versionsData } = useQuery({
    queryKey: ["dataset", datasetId, "versions"],
    queryFn: () => get<VersionsResponse>(`/datasets/${datasetId}/versions`),
  });

  const activeVersion = selectedVersion ?? versionsData?.current_version ?? 0;

  const { data: rowsData, isLoading: rowsLoading } = useQuery({
    queryKey: ["dataset", datasetId, "rows", activeVersion, page],
    queryFn: () =>
      get<RowsResponse>(
        `/datasets/${datasetId}/rows?offset=${page * pageSize}&limit=${pageSize}${
          selectedVersion !== null ? `&version=${selectedVersion}` : ""
        }`
      ),
  });

  const restoreMutation = useMutation({
    mutationFn: (v: number) => post(`/datasets/${datasetId}/versions/${v}/restore`),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["dataset", datasetId] });
      setSelectedVersion(null);
      toast.success(`Restored to version v${v}`);
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to restore version";
      toast.error(msg);
    },
  });

  const totalPages = rowsData ? Math.ceil(rowsData.total / pageSize) : 1;

  const handleExport = (fmt: "csv" | "parquet" | "xlsx") => {
    window.open(`/api/proxy/datasets/${datasetId}/export?fmt=${fmt}`, "_blank");
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 0" }}>
      {/* Top action bar: Version picker & Export */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
            <History size={14} />
            <span>Version:</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {versionsData?.versions.map((v) => {
              const isCurrent = v.number === (versionsData.current_version);
              const isSelected = v.number === activeVersion;
              return (
                <button
                  key={v.number}
                  onClick={() => {
                    setSelectedVersion(v.number);
                    setPage(0);
                  }}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "var(--radius-md)",
                    fontSize: 12,
                    fontWeight: 600,
                    border: "1px solid",
                    borderColor: isSelected ? "var(--brand)" : "var(--border)",
                    background: isSelected ? "var(--surface-raised)" : "transparent",
                    color: isSelected ? "var(--text)" : "var(--text-muted)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>v{v.number}</span>
                  <span style={{ fontSize: 11, color: "var(--text-subtle)", fontFamily: "var(--font-mono)" }}>
                    ({formatScore(v.score)})
                  </span>
                  {isCurrent && (
                    <span style={{ fontSize: 10, background: "var(--brand)", color: "#fff", padding: "1px 4px", borderRadius: 3 }}>
                      active
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedVersion !== null && selectedVersion !== versionsData?.current_version && (
            <button
              onClick={() => restoreMutation.mutate(selectedVersion)}
              disabled={restoreMutation.isPending}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                background: "var(--brand)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <RotateCcw size={12} />
              Restore v{selectedVersion}
            </button>
          )}
        </div>

        {/* Export buttons */}
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => handleExport("csv")} style={ghostBtn}>
            <Download size={12} /> CSV
          </button>
          <button onClick={() => handleExport("parquet")} style={ghostBtn}>
            <Download size={12} /> Parquet
          </button>
        </div>
      </div>

      {/* Virtualised / Paginated Table */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto", maxHeight: 560 }}>
          {rowsLoading ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
              Loading data rows…
            </div>
          ) : !rowsData || rowsData.rows.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
              No rows found in this dataset version.
            </div>
          ) : (
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13, fontFamily: "var(--font-mono)" }}>
              <thead>
                <tr style={{ background: "var(--surface-raised)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-subtle)", width: 60, fontWeight: 600 }}>#</th>
                  {rowsData.columns.map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: "8px 14px",
                        textAlign: "left",
                        color: "var(--text)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        borderRight: "1px solid var(--hairline)",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowsData.rows.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: "1px solid var(--hairline)",
                      background: idx % 2 === 0 ? "transparent" : "var(--surface-hover)",
                    }}
                  >
                    <td style={{ padding: "8px 12px", color: "var(--text-subtle)", fontSize: 11 }}>
                      {page * pageSize + idx + 1}
                    </td>
                    {rowsData.columns.map((col) => {
                      const val = row[col];
                      const isNull = val === null || val === undefined;
                      return (
                        <td
                          key={col}
                          style={{
                            padding: "8px 14px",
                            color: isNull ? "var(--text-disabled)" : "var(--text-body)",
                            whiteSpace: "nowrap",
                            borderRight: "1px solid var(--hairline)",
                            fontStyle: isNull ? "italic" : "normal",
                          }}
                        >
                          {isNull ? "null" : String(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer pagination */}
        {rowsData && (
          <div
            style={{
              padding: "10px 16px",
              background: "var(--surface-raised)",
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            <span>
              Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, rowsData.total)} of{" "}
              {formatNumber(rowsData.total)} rows
            </span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                style={{ ...ghostBtn, opacity: page === 0 ? 0.5 : 1, cursor: page === 0 ? "not-allowed" : "pointer" }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span>
                Page {page + 1} / {totalPages || 1}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  ...ghostBtn,
                  opacity: page >= totalPages - 1 ? 0.5 : 1,
                  cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 12px",
  background: "transparent",
  color: "var(--text-muted)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
};
