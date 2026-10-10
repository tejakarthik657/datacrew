/**
 * API Error shape matching the FastAPI error envelope:
 * { code, message, hint, request_id }
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly hint: string | undefined,
    public readonly requestId: string | undefined,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type FetchOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Pass AbortSignal for cancellation */
  signal?: AbortSignal;
  /** Return raw Response instead of parsed JSON */
  raw?: boolean;
};

/**
 * Typed fetch wrapper that calls /api/proxy/* (the BFF).
 * Browser code never calls the FastAPI directly.
 */
export async function apiFetch<T = unknown>(
  path: string,
  opts: FetchOptions = {},
): Promise<T> {
  const url = `/api/proxy${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = { ...opts.headers };

  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) {
    body = opts.body;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body,
    signal: opts.signal,
    credentials: "same-origin",
  });

  if (opts.raw) return res as unknown as T;

  const requestId = res.headers.get("x-request-id") ?? undefined;

  if (!res.ok) {
    let errBody: { code?: string; message?: string; hint?: string } = {};
    try {
      errBody = await res.json();
    } catch {
      // ignore parse errors
    }
    throw new ApiError(
      errBody.code ?? "UNKNOWN",
      errBody.message ?? res.statusText,
      errBody.hint,
      requestId,
      res.status,
    );
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

/** Convenience wrappers */
export const get = <T>(path: string, opts?: Omit<FetchOptions, "method">) =>
  apiFetch<T>(path, { ...opts, method: "GET" });

export const post = <T>(
  path: string,
  body?: unknown,
  opts?: Omit<FetchOptions, "method" | "body">,
) => apiFetch<T>(path, { ...opts, method: "POST", body });

export const patch = <T>(
  path: string,
  body?: unknown,
  opts?: Omit<FetchOptions, "method" | "body">,
) => apiFetch<T>(path, { ...opts, method: "PATCH", body });

export const del = <T>(path: string, opts?: Omit<FetchOptions, "method">) =>
  apiFetch<T>(path, { ...opts, method: "DELETE" });
