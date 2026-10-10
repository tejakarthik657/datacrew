"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { get, post, patch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/queryKeys";
import { pollJob } from "@/lib/api/jobs";
import { ApiError } from "@/lib/api/client";
import { formatNumber, formatPercent, formatScore } from "@/lib/format";
import {
  Zap, RefreshCw, ChevronDown, ChevronUp, Eye, AlertCircle,
  CheckCircle, XCircle, Download, Undo, Info,
} from "lucide-react";
import { toast as sonerToast } from "sonner";

interface PlanStep {
  id: string;
  order: number;
  title: string;
  description: string;
  columns: string[];
  rationale: string;
  rows_affected: number;
  risk: "low" | "medium" | "high";
  confidence: number;
  approved: boolean;
  params?: Record<string, unknown>;
}

interface Plan {
  id: string;
  dataset_id: string;
  source: string;
  dataset_type: string;
  notes: string;
  steps: PlanStep[];
  projected_score?: number;
}

interface JobResponse {
  job_id: string;
}

interface Dataset {
  id: string;
  score: number;
  current_version: number;
  versions: { version: number; score: number }[];
}

const RISK_COLOR = {
  low: "var(--success)",
  medium: "var(--warning)",
  high: "var(--danger)",
} as const;

const RISK_BG = {
  low: "var(--success-bg)",
  medium: "var(--warning-bg)",
  high: "var(--danger-bg)",
} as const;

const RISK_BORDER = {
  low: "var(--success-border)",
  medium: "var(--warning-border)",
  high: "var(--danger-border)",
} as const;

interface CleanTabProps {
  datasetId: string;
}

export function CleanTab({ datasetId }: CleanTabProps) {
  const qc = useQueryClient();
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [previewStep, setPreviewStep] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [jobProgress, setJobProgress] = useState<number | null>(null);
  const [riskFilter, setRiskFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [showDiff, setShowDiff] = useState(false);

  const { data: ds } = useQuery({
    queryKey: queryKeys.dataset(datasetId),
    queryFn: () => get<Dataset>(`/datasets/${datasetId}`),
  });

  const { data: plan, isLoading: planLoading, refetch: refetchPlan } = useQuery({
    queryKey: queryKeys.plan(datasetId),
    queryFn: async () => {
      const plans = await get<Plan[]>(`/datasets/${datasetId}/plans`).catch(() => null);
      return plans?.[0] ?? null;
    },
    enabled: !!ds,
  });

  // Generate plan
  const generatePlan = useMutation({
    mutationFn: async () => {
      const { job_id } = await post<JobResponse>(`/datasets/${datasetId}/plan`);
      await pollJob(job_id, {
        onProgress: (p) => setJobProgress(p),
      });
      setJobProgress(null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.plan(datasetId) });
      toast.success("Plan generated");
    },
    onError: (err) => {
      setJobProgress(null);
      const msg = err instanceof ApiError ? err.message : "Plan generation failed";
      toast.error(msg);
    },
  });

  // Toggle a step
  const toggleStep = useCallback(
    async (stepId: string, approved: boolean) => {
      if (!plan) return;
      try {
        await patch(`/plans/${plan.id}/steps/${stepId}`, { approved });
        qc.setQueryData(queryKeys.plan(datasetId), (old: Plan | null) => {
          if (!old) return old;
          return {
            ...old,
            steps: old.steps.map((s) =>
              s.id === stepId ? { ...s, approved } : s
            ),
          };
        });
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to toggle step");
      }
    },
    [plan, qc, datasetId]
  );

  // Apply plan
  const applyPlan = async () => {
    if (!plan) return;
    const approvedCount = plan.steps.filter((s) => s.approved).length;
    if (approvedCount === 0) {
      toast.error("Select at least one step to apply");
      return;
    }

    setApplying(true);
    setJobProgress(0);
    try {
      const { job_id } = await post<JobResponse>(`/plans/${plan.id}/execute`);
      await pollJob(job_id, {
        onProgress: (p) => setJobProgress(p),
      });
      setJobProgress(null);

      // Refetch dataset (score + version update)
      await qc.invalidateQueries({ queryKey: queryKeys.dataset(datasetId) });
      await qc.invalidateQueries({ queryKey: queryKeys.plan(datasetId) });

      toast.success("Fixes applied — check the score!", {
        action: { label: "View diff", onClick: () => setShowDiff(true) },
      });
      setShowDiff(true);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Apply failed";
      const hint = err instanceof ApiError ? err.hint : undefined;
      toast.error(msg, { description: hint });
    } finally {
      setApplying(false);
      setJobProgress(null);
    }
  };

  // Undo
  const undoPlan = async () => {
    try {
      await post(`/datasets/${datasetId}/undo`);
      await qc.invalidateQueries({ queryKey: queryKeys.dataset(datasetId) });
      await qc.invalidateQueries({ queryKey: queryKeys.plan(datasetId) });
      toast.success("Undone — score restored to previous version");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Undo failed");
    }
  };

  const filteredSteps = plan?.steps.filter(
    (s) => riskFilter === "all" || s.risk === riskFilter
  ) ?? [];

  const approvedCount = plan?.steps.filter((s) => s.approved).length ?? 0;
  const v0Score = ds?.versions?.[0]?.score ?? null;

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      {/* Score header */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          padding: "20px 24px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        {/* Before -> After scores */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {v0Score != null && (
            <>
              <ScoreDisplay value={v0Score} label="Original" dim />
              <span style={{ fontSize: 20, color: "var(--text-muted)" }}>→</span>
            </>
          )}
          <ScoreDisplay value={ds?.score ?? 0} label={`v${ds?.current_version ?? 0}`} />
        </div>

        {plan?.projected_score != null && (
          <>
            <span style={{ fontSize: 20, color: "var(--text-muted)" }}>→</span>
            <div>
              <ScoreDisplay value={plan.projected_score} label="After apply" dim />
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-subtle)" }}>
                Projected (deterministic)
              </p>
            </div>
          </>
        )}

        <div style={{ flex: 1 }} />

        <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", maxWidth: 260 }}>
          Scores are deterministic — no LLM involved. Nothing changes until you approve and apply.
        </p>

        <button
          onClick={() => generatePlan.mutate()}
          disabled={generatePlan.isPending}
          style={primaryBtn(generatePlan.isPending)}
        >
          <Zap size={14} />
          {generatePlan.isPending ? "Generating…" : plan ? "Regenerate plan" : "Generate AI plan"}
        </button>
      </div>

      {/* Job progress bar */}
      {(jobProgress != null || applying) && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, color: "var(--text-muted)" }}>
            <span>{applying ? "Applying fixes…" : "Generating plan…"}</span>
            <span>{jobProgress != null ? `${Math.round(jobProgress * 100)}%` : "…"}</span>
          </div>
          <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
            <div
              aria-live="polite"
              aria-label={`Progress: ${jobProgress != null ? Math.round(jobProgress * 100) : 0}%`}
              style={{
                height: "100%",
                background: "var(--brand)",
                width: jobProgress != null ? `${jobProgress * 100}%` : "40%",
                transition: "width 400ms ease",
                borderRadius: 2,
              }}
            />
          </div>
        </div>
      )}

      {/* Plan table */}
      {planLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 60, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      )}

      {!planLoading && !plan && (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-muted)" }}>
          <Zap size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
            No plan yet
          </p>
          <p style={{ margin: 0, fontSize: 13 }}>
            Click &quot;Generate AI plan&quot; to analyse your data and propose fixes.
          </p>
        </div>
      )}

      {plan && (
        <>
          {/* Plan controls */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)",
              padding: "12px 16px",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
              Cleaning plan
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {plan.steps.length} steps · {approvedCount} approved
            </span>

            {/* Quick selects */}
            <button onClick={() => plan.steps.forEach((s) => toggleStep(s.id, true))} style={ghostBtn}>
              Approve all
            </button>
            <button onClick={() => plan.steps.filter((s) => s.risk === "high").forEach((s) => toggleStep(s.id, false))} style={ghostBtn}>
              Reject risky
            </button>

            <div style={{ flex: 1 }} />

            {/* Risk filter */}
            {(["all", "low", "medium", "high"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRiskFilter(r)}
                style={{
                  ...ghostBtn,
                  borderColor: riskFilter === r ? "var(--border-focus)" : "var(--border)",
                  color: riskFilter === r ? "var(--text)" : "var(--text-muted)",
                  fontWeight: riskFilter === r ? 600 : 400,
                  textTransform: "capitalize",
                }}
              >
                {r === "all" ? "All" : r}
              </button>
            ))}
          </div>

          {/* Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 80 }}>
            {filteredSteps.map((step) => (
              <StepRow
                key={step.id}
                step={step}
                expanded={expandedStep === step.id}
                onToggle={(approved) => toggleStep(step.id, approved)}
                onExpand={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                onPreview={() => setPreviewStep(previewStep === step.id ? null : step.id)}
                disabled={applying}
                planId={plan.id}
                showPreview={previewStep === step.id}
              />
            ))}
          </div>
        </>
      )}

      {/* Sticky apply bar */}
      {plan && approvedCount > 0 && (
        <div
          style={{
            position: "sticky",
            bottom: 16,
            background: "var(--surface-raised)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-modal)",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "var(--shadow-modal)",
          }}
        >
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            <span style={{ fontWeight: 700, color: "var(--text)" }}>{approvedCount}</span> fix{approvedCount !== 1 ? "es" : ""} selected
          </span>
          {plan.projected_score != null && (
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              · Score: {formatScore(ds?.score ?? 0)} → ~{formatScore(plan.projected_score)}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={undoPlan} style={ghostBtn} title="Undo last apply">
            <Undo size={13} />
            Undo
          </button>
          <button
            onClick={applyPlan}
            disabled={applying}
            style={{
              ...primaryBtn(applying),
              background: applying ? "var(--text-disabled)" : "var(--success)",
            }}
          >
            <CheckCircle size={14} />
            {applying ? "Applying…" : `Apply ${approvedCount} fix${approvedCount !== 1 ? "es" : ""}`}
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}

/* ── Step Row ── */
interface StepRowProps {
  step: PlanStep;
  expanded: boolean;
  onToggle: (approved: boolean) => void;
  onExpand: () => void;
  onPreview: () => void;
  disabled: boolean;
  planId: string;
  showPreview: boolean;
}

function StepRow({ step, expanded, onToggle, onExpand, onPreview, disabled, planId, showPreview }: StepRowProps) {
  const { data: preview } = useQuery({
    queryKey: queryKeys.planPreview(planId, step.id),
    queryFn: () => get<{ rows: Record<string, unknown>[] }>(`/plans/${planId}/steps/${step.id}/preview`),
    enabled: showPreview,
  });

  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${step.approved ? "var(--border-focus)" : "var(--border)"}`,
        borderRadius: "var(--radius-card)",
        overflow: "hidden",
        transition: "border-color 120ms ease",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          cursor: "pointer",
        }}
        onClick={onExpand}
      >
        {/* Checkbox */}
        <input
          type="checkbox"
          id={`step-${step.id}`}
          checked={step.approved}
          disabled={disabled}
          onChange={(e) => { e.stopPropagation(); onToggle(e.target.checked); }}
          onClick={(e) => e.stopPropagation()}
          aria-label={`${step.approved ? "Unapprove" : "Approve"} step: ${step.title}`}
          style={{ width: 16, height: 16, accentColor: "var(--brand)", cursor: disabled ? "not-allowed" : "pointer", flexShrink: 0 }}
        />

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
              {step.title}
            </span>
            <RiskBadge risk={step.risk} />
          </div>
          {step.columns.length > 0 && (
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {step.columns.slice(0, 3).join(", ")}{step.columns.length > 3 ? ` +${step.columns.length - 3}` : ""}
            </span>
          )}
        </div>

        {/* Meta */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {formatNumber(step.rows_affected)} rows
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {formatPercent(step.confidence)} conf
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
            title="Preview affected rows"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 4 }}
            aria-label="Preview step"
          >
            <Eye size={14} />
          </button>
          {expanded ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
        </div>
      </div>

      {/* Expanded rationale */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 14px", background: "var(--surface-hover)" }}>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-body)" }}>
            {step.description}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
            {step.rationale}
          </p>
        </div>
      )}

      {/* Preview panel */}
      {showPreview && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 14px", background: "var(--canvas-soft)" }}>
          <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Preview (first 20 affected rows)
          </p>
          {!preview ? (
            <div style={{ height: 60, background: "var(--surface)", borderRadius: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
          ) : preview.rows.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>No rows affected.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12, fontFamily: "var(--font-mono)" }}>
                <thead>
                  <tr>
                    {Object.keys(preview.rows[0]).map((col) => (
                      <th key={col} style={{ textAlign: "left", padding: "4px 8px", color: "var(--text-muted)", fontWeight: 600, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 20).map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((cell, j) => (
                        <td key={j} style={{ padding: "4px 8px", borderBottom: "1px solid var(--border)", color: "var(--text-body)", whiteSpace: "nowrap" }}>
                          {String(cell ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Risk Badge ── */
function RiskBadge({ risk }: { risk: "low" | "medium" | "high" }) {
  const Icon = risk === "high" ? XCircle : risk === "medium" ? AlertCircle : CheckCircle;
  return (
    <span
      aria-label={`${risk} risk`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 7px",
        borderRadius: "var(--radius-full)",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "capitalize",
        color: RISK_COLOR[risk],
        background: RISK_BG[risk],
        border: `1px solid ${RISK_BORDER[risk]}`,
      }}
    >
      <Icon size={10} />
      {risk}
    </span>
  );
}

/* ── Score display ── */
function ScoreDisplay({ value, label, dim }: { value: number; label: string; dim?: boolean }) {
  const color = value >= 80 ? "var(--success)" : value >= 50 ? "var(--warning)" : "var(--danger)";
  return (
    <div style={{ textAlign: "center", opacity: dim ? 0.55 : 1 }}>
      <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "var(--font-mono)", color: dim ? "var(--text-muted)" : color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {formatScore(value)}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </div>
    </div>
  );
}

/* ── Button styles ── */
const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 16px",
  background: disabled ? "var(--text-disabled)" : "var(--brand)",
  color: "#fff", border: "none", borderRadius: "var(--radius-md)",
  fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
  transition: "background 120ms ease", whiteSpace: "nowrap",
});

const ghostBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "5px 10px", background: "transparent",
  color: "var(--text-muted)", border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)", fontSize: 12, fontWeight: 500,
  cursor: "pointer", whiteSpace: "nowrap",
};
