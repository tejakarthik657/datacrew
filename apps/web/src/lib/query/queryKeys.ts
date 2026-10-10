/** TanStack Query key factories — always include datasetId + version to prevent stale views */

export const queryKeys = {
  // Auth
  me: () => ["me"] as const,

  // Datasets
  datasets: () => ["datasets"] as const,
  dataset: (id: string) => ["dataset", id] as const,
  datasetVersioned: (id: string, version: number) =>
    ["dataset", id, version] as const,

  // Plans
  plan: (datasetId: string) => ["plan", datasetId] as const,
  planPreview: (planId: string, stepId: string) =>
    ["plan-preview", planId, stepId] as const,

  // Diff
  diff: (datasetId: string, version: number) =>
    ["diff", datasetId, version] as const,

  // Rows / Data
  rows: (datasetId: string, page: number, version: number) =>
    ["rows", datasetId, page, version] as const,

  // Risks
  risks: (datasetId: string, version: number) =>
    ["risks", datasetId, version] as const,

  // Jobs
  job: (jobId: string) => ["job", jobId] as const,

  // Privacy / Trust
  privacyDashboard: () => ["privacy-dashboard"] as const,
  ledger: (datasetId: string) => ["ledger", datasetId] as const,
  passport: (publicId: string) => ["passport", publicId] as const,

  // Strategy
  strategy: (datasetId: string, version: number) =>
    ["strategy", datasetId, version] as const,

  // Crew
  crewRun: (runId: string) => ["crew-run", runId] as const,

  // Versions
  versions: (datasetId: string) => ["versions", datasetId] as const,
} as const;
