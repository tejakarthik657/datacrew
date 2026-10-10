/**
 * Polls GET /jobs/{id} with exponential backoff until status is 'done' | 'failed'.
 * Calls onProgress with 0..1 progress value.
 */

import { get } from "./client";

export interface JobResult {
  id: string;
  status: "pending" | "running" | "done" | "failed";
  progress?: number; // 0..1
  result?: unknown;
  error?: { message: string; detail?: string };
}

interface PollOptions {
  onProgress?: (progress: number, job: JobResult) => void;
  signal?: AbortSignal;
  /** Initial delay ms (doubles each retry, capped at maxDelay) */
  initialDelay?: number;
  maxDelay?: number;
}

export async function pollJob(
  jobId: string,
  options: PollOptions = {},
): Promise<JobResult> {
  const {
    onProgress,
    signal,
    initialDelay = 400,
    maxDelay = 3000,
  } = options;

  let delay = initialDelay;

  for (;;) {
    if (signal?.aborted) {
      throw new DOMException("Job polling aborted", "AbortError");
    }

    const job = await get<JobResult>(`/jobs/${jobId}`, { signal });

    if (onProgress && typeof job.progress === "number") {
      onProgress(job.progress, job);
    }

    if (job.status === "done") return job;

    if (job.status === "failed") {
      throw new Error(
        job.error?.message ?? "Job failed without an error message",
      );
    }

    // Jitter: add up to 200ms random to avoid thundering herd
    const jitter = Math.random() * 200;
    await sleep(delay + jitter, signal);

    // Exponential backoff capped at maxDelay
    delay = Math.min(delay * 1.5, maxDelay);
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}
