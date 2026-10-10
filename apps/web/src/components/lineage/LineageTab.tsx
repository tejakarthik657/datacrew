"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Database, 
  Bot, 
  ShieldCheck, 
  Layers, 
  FileText, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  ExternalLink,
  Workflow
} from "lucide-react";
import { get } from "@/lib/api/client";
import Link from "next/link";

interface LineageNode {
  id: string;
  type: "source" | "agent" | "version" | "artifact";
  label: string;
  subtitle: string;
  status: string;
  meta?: {
    rows?: number;
    score?: number;
    hash?: string;
    number?: number;
    step_id?: string;
    storage_key?: string;
  };
}

interface LineageEdge {
  from: string;
  to: string;
  label?: string;
}

interface LineageResponse {
  dataset_id: string;
  dataset_name: string;
  current_version: number;
  nodes: LineageNode[];
  edges: LineageEdge[];
  graph_engine?: string;
  neo4j_connected?: boolean;
  neo4j_uri?: string;
  ledger_state?: {
    valid?: boolean;
    entries?: number;
    head_hash?: string;
  };
}

interface LineageTabProps {
  datasetId: string;
}

export function LineageTab({ datasetId }: LineageTabProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("source_node");
  const [filterView, setFilterView] = useState<"all" | "flow" | "governance">("all");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["lineage", datasetId],
    queryFn: () => get<LineageResponse>(`/datasets/${datasetId}/lineage`),
  });

  if (isLoading) {
    return (
      <div style={{ padding: "64px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--brand)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Tracing cryptographic lineage DAG…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ margin: "24px 0", padding: 24, borderRadius: "var(--radius-card)", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", textAlign: "center" }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--danger)", margin: "0 0 10px" }}>Failed to construct data lineage graph.</p>
        <button
          onClick={() => refetch()}
          style={{ padding: "6px 14px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--danger-border)", color: "var(--danger)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          Retry
        </button>
      </div>
    );
  }

  const nodes = data.nodes ?? [];
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? nodes[0];

  // Group nodes by pipeline stage
  const sourceNodes = nodes.filter((n) => n.type === "source");
  const agentNodes = nodes.filter((n) => n.type === "agent");
  const versionNodes = nodes.filter((n) => n.type === "version");
  const artifactNodes = nodes.filter((n) => n.type === "artifact");

  const getNodeColor = (type: string) => {
    switch (type) {
      case "source": return "#38bdf8";
      case "agent": return "#8b5cf6";
      case "version": return "#10b981";
      case "artifact": return "#f59e0b";
      default: return "#635bff";
    }
  };

  const getNodeIcon = (type: string, size = 15) => {
    switch (type) {
      case "source": return <Database size={size} style={{ color: "#38bdf8", flexShrink: 0 }} />;
      case "agent": return <Bot size={size} style={{ color: "#8b5cf6", flexShrink: 0 }} />;
      case "version": return <Layers size={size} style={{ color: "#10b981", flexShrink: 0 }} />;
      case "artifact": return <FileText size={size} style={{ color: "#f59e0b", flexShrink: 0 }} />;
      default: return <Workflow size={size} style={{ color: "var(--brand)", flexShrink: 0 }} />;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          paddingBottom: 16,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text)", letterSpacing: "-0.3px" }}>
              Data Lineage & Provenance Graph
            </h2>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 9999,
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.25)",
              }}
            >
              <ShieldCheck size={13} />
              Cryptographically Verified
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 9999,
                background: data.neo4j_connected ? "rgba(56, 189, 248, 0.12)" : "rgba(107, 114, 128, 0.12)",
                color: data.neo4j_connected ? "#38bdf8" : "var(--text-muted)",
                border: data.neo4j_connected ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid var(--border)",
              }}
            >
              <Workflow size={13} />
              {data.neo4j_connected ? "Neo4j AuraDB Cypher Graph Active" : "Graph Engine: Relational Fallback"}
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            End-to-end auditability tracking source ingest, AI specialist transformations, version snapshots, and downstream artifacts.
          </p>
        </div>

        {/* View Toggle */}
        <div
          style={{
            display: "flex",
            background: "var(--surface-raised, rgba(0,0,0,0.03))",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: 2,
          }}
        >
          {(
            [
              { id: "all", label: "Full Graph" },
              { id: "flow", label: "Data Flow Only" },
              { id: "governance", label: "Agent Governance" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterView(tab.id)}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 4,
                border: "none",
                cursor: "pointer",
                background: filterView === tab.id ? "var(--surface)" : "transparent",
                color: filterView === tab.id ? "var(--text)" : "var(--text-muted)",
                boxShadow: filterView === tab.id ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
                transition: "all 120ms ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger status stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div
          style={{
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            padding: 14,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
            Ledger Integrity
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <CheckCircle2 size={16} style={{ color: "#10b981" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
              {data.ledger_state?.valid !== false ? "Tamper-Evident (Valid)" : "Mismatch Detected"}
            </span>
          </div>
        </div>

        <div
          style={{
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            padding: 14,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
            Current Version
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Layers size={16} style={{ color: "var(--brand)" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
              v{data.current_version} ({versionNodes.length} snapshots)
            </span>
          </div>
        </div>

        <div
          style={{
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            padding: 14,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
            Active Specialists
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Bot size={16} style={{ color: "#8b5cf6" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
              {agentNodes.length} Governed Agents
            </span>
          </div>
        </div>

        <div
          style={{
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            padding: 14,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
            Downstream Artifacts
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <FileText size={16} style={{ color: "#f59e0b" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
              {artifactNodes.length} Verified Targets
            </span>
          </div>
        </div>
      </div>

      {/* Main layout: Stages Flow on Left/Center, Inspection Drawer on Right */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Pipeline Flow Stages */}
        <div
          style={{
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            padding: 18,
            overflowX: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
            <span>Pipeline Execution Flow</span>
            <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text-subtle)", fontSize: 11 }}>
              Select a node to inspect cryptographic details
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 640 }}>
            {/* Stage 1: Ingest Source */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#38bdf8" }}>
                <Database size={14} />
                <span>1. Ingest Source</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sourceNodes.map((node) => {
                  const isSelected = selectedNode?.id === node.id;
                  return (
                    <button
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: 12,
                        borderRadius: 8,
                        border: isSelected ? "1.5px solid #38bdf8" : "1px solid var(--border)",
                        background: isSelected ? "rgba(56, 189, 248, 0.1)" : "var(--surface)",
                        boxShadow: isSelected ? "0 2px 8px rgba(56, 189, 248, 0.2)" : "none",
                        cursor: "pointer",
                        transition: "all 120ms ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        {getNodeIcon(node.type)}
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {node.label}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {node.subtitle}
                      </p>
                      {node.meta?.rows !== undefined && (
                        <div style={{ marginTop: 6, fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-subtle)" }}>
                          {node.meta.rows.toLocaleString()} raw rows
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ paddingTop: 36, color: "var(--text-subtle)", opacity: 0.5 }}>
              <ArrowRight size={16} />
            </div>

            {/* Stage 2: AI Specialists */}
            {filterView !== "flow" && (
              <>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#8b5cf6" }}>
                    <Bot size={14} />
                    <span>2. AI Crew Specialists</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {agentNodes.map((node) => {
                      const isSelected = selectedNode?.id === node.id;
                      return (
                        <button
                          key={node.id}
                          onClick={() => setSelectedNodeId(node.id)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: 10,
                            borderRadius: 8,
                            border: isSelected ? "1.5px solid #8b5cf6" : "1px solid var(--border)",
                            background: isSelected ? "rgba(139, 92, 246, 0.1)" : "var(--surface)",
                            boxShadow: isSelected ? "0 2px 8px rgba(139, 92, 246, 0.2)" : "none",
                            cursor: "pointer",
                            transition: "all 120ms ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {getNodeIcon(node.type)}
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {node.label}
                            </span>
                          </div>
                          <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {node.subtitle}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ paddingTop: 36, color: "var(--text-subtle)", opacity: 0.5 }}>
                  <ArrowRight size={16} />
                </div>
              </>
            )}

            {/* Stage 3: Version Ledger */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#10b981" }}>
                <Layers size={14} />
                <span>3. Version Ledger</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {versionNodes.map((node) => {
                  const isSelected = selectedNode?.id === node.id;
                  const isActive = node.status === "active";
                  return (
                    <button
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: 12,
                        borderRadius: 8,
                        border: isSelected ? "1.5px solid #10b981" : "1px solid var(--border)",
                        background: isSelected ? "rgba(16, 185, 129, 0.1)" : "var(--surface)",
                        boxShadow: isSelected ? "0 2px 8px rgba(16, 185, 129, 0.2)" : "none",
                        cursor: "pointer",
                        transition: "all 120ms ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {getNodeIcon(node.type)}
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{node.label}</span>
                        </div>
                        {isActive && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: "1px 5px",
                              borderRadius: 4,
                              background: "rgba(16, 185, 129, 0.2)",
                              color: "#10b981",
                            }}
                          >
                            Current
                          </span>
                        )}
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-muted)" }}>{node.subtitle}</p>
                      {node.meta?.score !== undefined && (
                        <div style={{ marginTop: 6, fontSize: 10, fontFamily: "var(--font-mono)", color: "#10b981", fontWeight: 600 }}>
                          Score: {node.meta.score}%
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ paddingTop: 36, color: "var(--text-subtle)", opacity: 0.5 }}>
              <ArrowRight size={16} />
            </div>

            {/* Stage 4: Downstream Targets */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>
                <FileText size={14} />
                <span>4. Downstream Artifacts</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {artifactNodes.map((node) => {
                  const isSelected = selectedNode?.id === node.id;
                  return (
                    <button
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: 10,
                        borderRadius: 8,
                        border: isSelected ? "1.5px solid #f59e0b" : "1px solid var(--border)",
                        background: isSelected ? "rgba(245, 158, 11, 0.1)" : "var(--surface)",
                        boxShadow: isSelected ? "0 2px 8px rgba(245, 158, 11, 0.2)" : "none",
                        cursor: "pointer",
                        transition: "all 120ms ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {getNodeIcon(node.type)}
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {node.label}
                        </span>
                      </div>
                      <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {node.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Node Inspection Drawer on Right */}
        <div
          style={{
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {selectedNode ? (
            <>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    {getNodeIcon(selectedNode.type, 18)}
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {selectedNode.label}
                    </h3>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      padding: "2px 7px",
                      borderRadius: 4,
                      background: `${getNodeColor(selectedNode.type)}18`,
                      color: getNodeColor(selectedNode.type),
                      border: `1px solid ${getNodeColor(selectedNode.type)}35`,
                    }}
                  >
                    {selectedNode.type}
                  </span>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{selectedNode.subtitle}</p>
              </div>

              {/* Node Specifications */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
                  Node Specifications
                </span>

                <div
                  style={{
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--surface-raised, rgba(0,0,0,0.02))",
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Identifier</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text)" }}>{selectedNode.id}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Governance Status</span>
                    <span style={{ fontWeight: 600, color: "#10b981", textTransform: "capitalize" }}>{selectedNode.status}</span>
                  </div>

                  {selectedNode.meta?.rows !== undefined && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Record Count</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text)" }}>
                        {selectedNode.meta.rows.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {selectedNode.meta?.score !== undefined && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Health Metric</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#10b981" }}>
                        {selectedNode.meta.score}%
                      </span>
                    </div>
                  )}

                  {selectedNode.meta?.storage_key && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ color: "var(--text-muted)" }}>Storage Key / Digest</span>
                      <p
                        style={{
                          margin: 0,
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          color: "var(--text-subtle)",
                          wordBreak: "break-all",
                          background: "var(--surface)",
                          padding: "6px 8px",
                          borderRadius: 4,
                          border: "1px solid var(--border)",
                        }}
                      >
                        {selectedNode.meta.storage_key}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Blast Radius / Impact Analysis */}
              <div
                style={{
                  borderRadius: 8,
                  border: "1px solid rgba(99, 91, 255, 0.2)",
                  background: "rgba(99, 91, 255, 0.04)",
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--brand)" }}>
                  <Sparkles size={14} />
                  <span>Impact & Blast Radius Analysis</span>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  {selectedNode.type === "source" && "Root upstream dependency. Replacing this source cascades to all 4 downstream agents, 3 pipeline versions, and revokes active Data Passports."}
                  {selectedNode.type === "agent" && "Autonomous worker. Modifications to agent prompt or execution temperature update the audit ledger and log reason trace."}
                  {selectedNode.type === "version" && `Snapshot v${selectedNode.meta?.number ?? 0}. Rollbacks to this version update the active pointer with zero data loss on future revisions.`}
                  {selectedNode.type === "artifact" && "Terminal leaf node. Consumed by external downstream systems; changes trigger webhook notifications and invalidate cache."}
                </p>
              </div>

              {/* Deep Link to Related Tab */}
              <div>
                {selectedNode.type === "artifact" && selectedNode.id === "art_passport" && (
                  <Link
                    href={`/datasets/${datasetId}/trust`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      width: "100%",
                      padding: "8px 14px",
                      borderRadius: 6,
                      background: "var(--brand)",
                      color: "#ffffff",
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: "none",
                      boxShadow: "0 1px 3px rgba(99, 91, 255, 0.3)",
                    }}
                  >
                    <span>View Data Passport</span>
                    <ExternalLink size={13} />
                  </Link>
                )}
                {selectedNode.type === "artifact" && selectedNode.id === "art_forecast" && (
                  <Link
                    href={`/datasets/${datasetId}/forecast`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      width: "100%",
                      padding: "8px 14px",
                      borderRadius: 6,
                      background: "var(--brand)",
                      color: "#ffffff",
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: "none",
                      boxShadow: "0 1px 3px rgba(99, 91, 255, 0.3)",
                    }}
                  >
                    <span>Open Forecast Models</span>
                    <ExternalLink size={13} />
                  </Link>
                )}
                {selectedNode.type === "artifact" && selectedNode.id === "art_strategy" && (
                  <Link
                    href={`/datasets/${datasetId}/strategy`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      width: "100%",
                      padding: "8px 14px",
                      borderRadius: 6,
                      background: "var(--brand)",
                      color: "#ffffff",
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: "none",
                      boxShadow: "0 1px 3px rgba(99, 91, 255, 0.3)",
                    }}
                  >
                    <span>Open Commercial Strategy</span>
                    <ExternalLink size={13} />
                  </Link>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", fontSize: 12, color: "var(--text-muted)" }}>
              Select a node in the graph to view properties.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
